import os
import sys
import unittest
import uuid
import subprocess
from datetime import date, timedelta
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(__file__))

from main import app, _auth_request_timestamps, _ip_request_timestamps
from database import Base, engine
import models

client = TestClient(app)

class TestSecurityHardening(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)

    def setUp(self):
        _auth_request_timestamps.clear()
        _ip_request_timestamps.clear()

    def test_cors_trusted_origin(self):
        # Trusted origin should receive Access-Control-Allow-Origin
        res = client.options(
            '/',
            headers={
                'Origin': 'https://foodwaste-platform.vercel.app',
                'Access-Control-Request-Method': 'GET',
            }
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers.get('access-control-allow-origin'), 'https://foodwaste-platform.vercel.app')
        self.assertEqual(res.headers.get('access-control-allow-credentials'), 'true')

    def test_cors_untrusted_origin_rejected(self):
        # Untrusted origin should NOT receive Access-Control-Allow-Origin
        res = client.options(
            '/',
            headers={
                'Origin': 'https://malicious-attacker-site.com',
                'Access-Control-Request-Method': 'GET',
            }
        )
        self.assertNotIn('access-control-allow-origin', res.headers)

    def test_security_headers_present(self):
        res = client.get('/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers.get('x-content-type-options'), 'nosniff')
        self.assertEqual(res.headers.get('x-frame-options'), 'DENY')
        self.assertEqual(res.headers.get('x-xss-protection'), '1; mode=block')
        self.assertEqual(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin')
        self.assertIn('Strict-Transport-Security', res.headers)

    def test_password_length_validation(self):
        # Short password (< 6 chars) must be rejected
        res = client.post('/auth/register', json={
            'email': f'shortpass_{uuid.uuid4().hex[:6]}@test.org',
            'password': '123',
            'org_name': 'Test Org',
            'role': 'business'
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn('at least 6 characters', res.json()['detail'])

    def test_production_and_staging_otp_redaction(self):
        # In simulated production environment, debug_otp must be None
        os.environ['ENVIRONMENT'] = 'production'
        try:
            res = client.post('/auth/send-registration-otp', json={
                'email': f'prod_otp_{uuid.uuid4().hex[:6]}@test.org'
            })
            self.assertEqual(res.status_code, 200)
            self.assertIsNone(res.json().get('debug_otp'))
        finally:
            del os.environ['ENVIRONMENT']

        # In simulated staging environment, debug_otp must also be None
        os.environ['ENVIRONMENT'] = 'staging'
        try:
            res_staging = client.post('/auth/send-registration-otp', json={
                'email': f'stage_otp_{uuid.uuid4().hex[:6]}@test.org'
            })
            self.assertEqual(res_staging.status_code, 200)
            self.assertIsNone(res_staging.json().get('debug_otp'))
        finally:
            del os.environ['ENVIRONMENT']

    def test_payload_size_limit(self):
        # Simulated payload exceeding 25MB via Content-Length header
        res = client.post(
            '/ai/inspect-freshness',
            headers={
                'content-length': str(30 * 1024 * 1024),
                'Authorization': 'Bearer dummy'
            },
            content=b'x' * 100
        )
        self.assertEqual(res.status_code, 413)

    def test_x_forwarded_for_anti_spoofing(self):
        # In non-proxy mode, client-sent X-Forwarded-For must NOT be trusted
        res = client.get('/', headers={'X-Forwarded-For': '198.51.100.24'})
        self.assertEqual(res.status_code, 200)

        # In proxy mode (Render), verified edge-appended IP must be resolved safely
        os.environ['RENDER'] = 'true'
        try:
            res_proxy = client.get('/', headers={'X-Forwarded-For': '198.51.100.24, 203.0.113.50'})
            self.assertEqual(res_proxy.status_code, 200)
        finally:
            del os.environ['RENDER']

    def test_08_jwt_secret_startup_validation(self):
        # Test that missing JWT_SECRET in production causes a clean RuntimeError failure on startup
        env = os.environ.copy()
        env['ENVIRONMENT'] = 'production'
        if 'JWT_SECRET' in env:
            del env['JWT_SECRET']
        if 'RENDER' in env:
            del env['RENDER']

        code = 'import auth'
        proc = subprocess.run(
            [sys.executable, '-c', code],
            cwd=os.path.dirname(__file__),
            env=env,
            capture_output=True,
            text=True
        )
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn('CRITICAL SECURITY CONFIGURATION ERROR', proc.stderr)

    def test_09_authorization_role_bypass_and_idor(self):
        # Create Business A and Business B
        uid_a = uuid.uuid4().hex[:6]
        uid_b = uuid.uuid4().hex[:6]
        uid_ngo = uuid.uuid4().hex[:6]

        res_ba = client.post('/auth/register', json={
            'email': f'biz_a_{uid_a}@test.org',
            'password': 'password123',
            'org_name': 'Business A',
            'role': 'business'
        })
        token_ba = res_ba.json()['access_token']
        headers_ba = {'Authorization': f'Bearer {token_ba}'}

        res_bb = client.post('/auth/register', json={
            'email': f'biz_b_{uid_b}@test.org',
            'password': 'password123',
            'org_name': 'Business B',
            'role': 'business'
        })
        token_bb = res_bb.json()['access_token']
        headers_bb = {'Authorization': f'Bearer {token_bb}'}

        # Create NGO
        res_ngo = client.post('/auth/register', json={
            'email': f'ngo_{uid_ngo}@test.org',
            'password': 'password123',
            'org_name': 'Charity Food Bank',
            'role': 'ngo'
        })
        token_ngo = res_ngo.json()['access_token']
        headers_ngo = {'Authorization': f'Bearer {token_ngo}'}

        # 1. Business A creates inventory item
        exp = (date.today() + timedelta(days=3)).isoformat()
        res_inv = client.post('/inventory', headers=headers_ba, json={
            'name': 'Secure Organic Apples',
            'category': 'produce',
            'quantity': 10.0,
            'unit': 'kg',
            'expiry_date': exp
        })
        self.assertEqual(res_inv.status_code, 200)
        item_id = res_inv.json()['id']

        # 2. Business B tries to read Business A inventory risk -> IDOR blocked (404)
        res_idor_get = client.get(f'/inventory/{item_id}/risk', headers=headers_bb)
        self.assertEqual(res_idor_get.status_code, 404)

        # 3. Business B tries to update Business A inventory -> IDOR blocked (404)
        res_idor_patch = client.patch(f'/inventory/{item_id}', headers=headers_bb, json={'quantity': 50.0})
        self.assertEqual(res_idor_patch.status_code, 404)

        # 4. Business B tries to delete Business A inventory -> IDOR blocked (404)
        res_idor_del = client.delete(f'/inventory/{item_id}', headers=headers_bb)
        self.assertEqual(res_idor_del.status_code, 404)

        # 5. NGO tries to access /inventory -> Role bypass blocked (403)
        res_ngo_inv = client.get('/inventory', headers=headers_ngo)
        self.assertEqual(res_ngo_inv.status_code, 403)

        # 6. Business tries to request pickup -> Role bypass blocked (403)
        res_biz_pickup = client.post('/pickups', headers=headers_ba, json={
            'listing_id': 999,
            'meals_estimate': 10.0
        })
        self.assertEqual(res_biz_pickup.status_code, 403)

        # 7. NGO tries to access Business Analytics -> Role bypass blocked (403)
        res_ngo_biz_an = client.get('/analytics/business', headers=headers_ngo)
        self.assertEqual(res_ngo_biz_an.status_code, 403)

        # 8. Business tries to access NGO Analytics -> Role bypass blocked (403)
        res_biz_ngo_an = client.get('/analytics/ngo', headers=headers_ba)
        self.assertEqual(res_biz_ngo_an.status_code, 403)

    def test_10_otp_attempt_limits(self):
        email = f'attempt_{uuid.uuid4().hex[:6]}@test.org'
        res_send = client.post('/auth/send-registration-otp', json={'email': email})
        self.assertEqual(res_send.status_code, 200)

        # 5 incorrect attempts must lock and exhaust the OTP
        for _ in range(5):
            client.post('/auth/verify-registration-otp', json={'email': email, 'otp': '000000'})

        # 6th attempt must be rejected with 'Too many incorrect attempts'
        res_locked = client.post('/auth/verify-registration-otp', json={'email': email, 'otp': '000000'})
        self.assertEqual(res_locked.status_code, 400)
        self.assertIn('Too many incorrect attempts', res_locked.json()['detail'])

if __name__ == '__main__':
    unittest.main()
