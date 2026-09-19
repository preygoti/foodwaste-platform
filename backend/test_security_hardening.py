import os
import sys
import unittest
import uuid
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(__file__))

from main import app
from database import Base, engine
import models

client = TestClient(app)

class TestSecurityHardening(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)

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

    def test_production_otp_redaction(self):
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

if __name__ == '__main__':
    unittest.main()
