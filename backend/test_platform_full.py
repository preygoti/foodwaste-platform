import sys
import os
import unittest
import uuid
from datetime import date, timedelta
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(__file__))

from main import app
from database import Base, engine, SessionLocal
import models
from auth import create_access_token

client = TestClient(app)

class TestFoodWastePlatform(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)

    def test_01_health_check(self):
        res = client.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "ok")

    def test_02_register_and_login_with_jwt_binding(self):
        uid = str(uuid.uuid4())[:8]
        biz_email = f"biz_{uid}@test.org"
        ngo_email = f"ngo_{uid}@test.org"

        # Register Business
        res_b = client.post("/auth/register", json={
            "email": biz_email,
            "password": "password123",
            "org_name": "Fresh Market & Bakery",
            "role": "business",
            "address": "100 Green St"
        })
        self.assertEqual(res_b.status_code, 200, res_b.text)
        biz_data = res_b.json()
        self.assertIn("access_token", biz_data)
        self.assertEqual(biz_data["user"]["role"], "business")
        biz_token = biz_data["access_token"]

        # Register NGO
        res_n = client.post("/auth/register", json={
            "email": ngo_email,
            "password": "password123",
            "org_name": "City Food Rescue",
            "role": "ngo",
            "address": "200 Community Ave"
        })
        self.assertEqual(res_n.status_code, 200, res_n.text)
        ngo_data = res_n.json()
        self.assertEqual(ngo_data["user"]["role"], "ngo")
        ngo_token = ngo_data["access_token"]

        # Verify /auth/me returns correct user for Business token
        res_me_b = client.get("/auth/me", headers={"Authorization": f"Bearer {biz_token}"})
        self.assertEqual(res_me_b.status_code, 200)
        self.assertEqual(res_me_b.json()["email"], biz_email)
        self.assertEqual(res_me_b.json()["role"], "business")

        # Verify /auth/me returns correct user for NGO token
        res_me_n = client.get("/auth/me", headers={"Authorization": f"Bearer {ngo_token}"})
        self.assertEqual(res_me_n.status_code, 200)
        self.assertEqual(res_me_n.json()["email"], ngo_email)
        self.assertEqual(res_me_n.json()["role"], "ngo")

        TestFoodWastePlatform.biz_token = biz_token
        TestFoodWastePlatform.ngo_token = ngo_token
        TestFoodWastePlatform.biz_email = biz_email
        TestFoodWastePlatform.ngo_email = ngo_email

    def test_03_inventory_crud_and_risk(self):
        headers = {"Authorization": f"Bearer {self.biz_token}"}
        
        near_expiry = (date.today() + timedelta(days=2)).isoformat()
        res = client.post("/inventory", headers=headers, json={
            "name": "Fresh Organic Milk",
            "category": "dairy",
            "quantity": 25.0,
            "unit": "liter",
            "expiry_date": near_expiry,
            "avg_daily_usage": 2.0,
            "storage_location": "Refrigerator A"
        })
        self.assertEqual(res.status_code, 200, res.text)
        item = res.json()
        self.assertEqual(item["name"], "Fresh Organic Milk")
        self.assertGreater(item["risk_score"], 60)
        self.assertEqual(item["risk_level"], "high")
        TestFoodWastePlatform.sample_item_id = item["id"]

    def test_04_multi_user_data_isolation(self):
        # Create a SECOND business
        uid2 = str(uuid.uuid4())[:8]
        biz2_email = f"biz2_{uid2}@test.org"
        res_b2 = client.post("/auth/register", json={
            "email": biz2_email,
            "password": "password123",
            "org_name": "Second Bakery",
            "role": "business",
            "address": "500 Bread St"
        })
        biz2_token = res_b2.json()["access_token"]
        headers_b2 = {"Authorization": f"Bearer {biz2_token}"}

        # Add item to Business 2
        res_item2 = client.post("/inventory", headers=headers_b2, json={
            "name": "Artisan Sourdough B2",
            "category": "bakery",
            "quantity": 10.0,
            "unit": "loaves",
            "expiry_date": (date.today() + timedelta(days=3)).isoformat(),
            "avg_daily_usage": 2.0
        })
        self.assertEqual(res_item2.status_code, 200)

        # 1. Business 1 lists inventory -> should NOT see Business 2's item
        headers_b1 = {"Authorization": f"Bearer {self.biz_token}"}
        res_list_b1 = client.get("/inventory", headers=headers_b1)
        names_b1 = [i["name"] for i in res_list_b1.json()]
        self.assertIn("Fresh Organic Milk", names_b1)
        self.assertNotIn("Artisan Sourdough B2", names_b1)

        # 2. Business 2 lists inventory -> should NOT see Business 1's item
        res_list_b2 = client.get("/inventory", headers=headers_b2)
        names_b2 = [i["name"] for i in res_list_b2.json()]
        self.assertIn("Artisan Sourdough B2", names_b2)
        self.assertNotIn("Fresh Organic Milk", names_b2)

        # 3. NGO attempts to access /inventory -> MUST return 403 Forbidden
        headers_ngo = {"Authorization": f"Bearer {self.ngo_token}"}
        res_ngo_inv = client.get("/inventory", headers=headers_ngo)
        self.assertEqual(res_ngo_inv.status_code, 403)
        self.assertIn("requires a business account", res_ngo_inv.json()["detail"])

        # 4. NGO attempts to create inventory -> MUST return 403 Forbidden
        res_ngo_post = client.post("/inventory", headers=headers_ngo, json={
            "name": "Unauthorized Item",
            "category": "produce",
            "quantity": 5.0,
            "unit": "kg",
            "expiry_date": (date.today() + timedelta(days=5)).isoformat()
        })
        self.assertEqual(res_ngo_post.status_code, 403)

    def test_05_listing_marketplace_and_pickup_flow(self):
        biz_headers = {"Authorization": f"Bearer {self.biz_token}"}
        ngo_headers = {"Authorization": f"Bearer {self.ngo_token}"}

        # 1. Business attempts to list an expired item -> MUST return 400 Bad Request
        res_expired_listing = client.post("/listings", headers=biz_headers, json={
            "title": "Expired Yoghurt",
            "category": "dairy",
            "quantity": 10.0,
            "unit": "kg",
            "expiry_date": (date.today() - timedelta(days=2)).isoformat(),
            "pickup_location": "Storefront"
        })
        self.assertEqual(res_expired_listing.status_code, 400)

        # 2. Business lists valid surplus item
        res_listing = client.post("/listings", headers=biz_headers, json={
            "inventory_item_id": self.sample_item_id,
            "title": "Fresh Organic Milk Surplus",
            "category": "dairy",
            "quantity": 15.0,
            "unit": "liter",
            "expiry_date": (date.today() + timedelta(days=2)).isoformat(),
            "pickup_location": "100 Green St, Storefront"
        })
        self.assertEqual(res_listing.status_code, 200, res_listing.text)
        listing = res_listing.json()
        listing_id = listing["id"]
        self.assertEqual(listing["status"], "available")

        # 2. NGO browses available listings
        res_browse = client.get("/listings", headers=ngo_headers)
        self.assertEqual(res_browse.status_code, 200)
        listing_ids = [l["id"] for l in res_browse.json()]
        self.assertIn(listing_id, listing_ids)

        # 3. NGO requests pickup
        res_pickup = client.post("/pickups", headers=ngo_headers, json={
            "listing_id": listing_id,
            "meals_estimate": 35.0,
            "scheduled_time": (date.today() + timedelta(days=1)).isoformat() + "T10:00:00"
        })
        self.assertEqual(res_pickup.status_code, 200, res_pickup.text)
        pickup = res_pickup.json()
        pickup_id = pickup["id"]
        self.assertEqual(pickup["status"], "pending")

        # 4. Business confirms pickup
        res_confirm = client.patch(f"/pickups/{pickup_id}", headers=biz_headers, json={
            "status": "confirmed"
        })
        self.assertEqual(res_confirm.status_code, 200)
        self.assertEqual(res_confirm.json()["status"], "confirmed")

        # 5. NGO completes pickup
        res_done = client.patch(f"/pickups/{pickup_id}", headers=ngo_headers, json={
            "status": "picked_up"
        })
        self.assertEqual(res_done.status_code, 200)
        self.assertEqual(res_done.json()["status"], "picked_up")

    def test_06_analytics_isolation(self):
        biz_headers = {"Authorization": f"Bearer {self.biz_token}"}
        ngo_headers = {"Authorization": f"Bearer {self.ngo_token}"}

        # Check Business Analytics
        res_biz_an = client.get("/analytics/business", headers=biz_headers)
        self.assertEqual(res_biz_an.status_code, 200)
        biz_data = res_biz_an.json()
        self.assertGreaterEqual(biz_data["total_inventory_items"], 1)
        self.assertGreaterEqual(biz_data["completed_donations"], 1)

        # Check NGO Analytics
        res_ngo_an = client.get("/analytics/ngo", headers=ngo_headers)
        self.assertEqual(res_ngo_an.status_code, 200)
        ngo_data = res_ngo_an.json()
        self.assertGreaterEqual(ngo_data["completed_pickups"], 1)
        self.assertGreaterEqual(ngo_data["meals_received"], 35.0)

        # Check that NGO cannot access /analytics/business
        res_ngo_biz_an = client.get("/analytics/business", headers=ngo_headers)
        self.assertEqual(res_ngo_biz_an.status_code, 403)

        # Check that Business cannot access /analytics/ngo
        res_biz_ngo_an = client.get("/analytics/ngo", headers=biz_headers)
        self.assertEqual(res_biz_ngo_an.status_code, 403)

    def test_07_token_security_and_mismatch(self):
        # Forge a token with an invalid/mismatched email
        invalid_token = create_access_token({"sub": "1", "email": "wrong_email@test.org", "role": "business"})
        res_inv = client.get("/auth/me", headers={"Authorization": f"Bearer {invalid_token}"})
        # Should reject because email does not match user id 1 in db
        self.assertEqual(res_inv.status_code, 401)

    def test_08_database_configuration_and_url_normalization(self):
        from database import get_database_url, create_db_engine
        import os

        # 1. Test fallback when DATABASE_URL is unset
        old_env = os.environ.get("DATABASE_URL")
        try:
            if "DATABASE_URL" in os.environ:
                del os.environ["DATABASE_URL"]
            self.assertEqual(get_database_url(), "sqlite:///./foodwaste.db")
            
            # Test engine creation for SQLite
            sqlite_engine = create_db_engine("sqlite:///./foodwaste.db")
            self.assertEqual(sqlite_engine.dialect.name, "sqlite")

            # 2. Test legacy postgres:// normalization
            os.environ["DATABASE_URL"] = "postgres://sample_user:sample_pass@sample_host.render.com:5432/sample_db"
            normalized = get_database_url()
            self.assertTrue(normalized.startswith("postgresql://"))
            self.assertIn("sample_user:sample_pass@sample_host.render.com:5432/sample_db", normalized)

            # 3. Test modern postgresql:// retention
            os.environ["DATABASE_URL"] = "postgresql://user:pass@host:5432/db"
            self.assertEqual(get_database_url(), "postgresql://user:pass@host:5432/db")

        finally:
            if old_env is not None:
                os.environ["DATABASE_URL"] = old_env
            elif "DATABASE_URL" in os.environ:
                del os.environ["DATABASE_URL"]

    def test_09_forgot_password_otp_and_reset_flow(self):
        # 1. Request OTP for the registered business email
        res_forgot = client.post("/auth/forgot-password", json={"email": self.biz_email})
        self.assertEqual(res_forgot.status_code, 200)
        forgot_data = res_forgot.json()
        self.assertIn("message", forgot_data)
        self.assertEqual(forgot_data["email"], self.biz_email)
        otp_code = forgot_data.get("debug_otp")
        self.assertIsNotNone(otp_code)
        self.assertEqual(len(otp_code), 6)

        # 2. Test invalid OTP rejection
        res_invalid_otp = client.post("/auth/verify-otp", json={"email": self.biz_email, "otp": "000000"})
        self.assertEqual(res_invalid_otp.status_code, 400)

        # 3. Test valid OTP verification
        res_valid_otp = client.post("/auth/verify-otp", json={"email": self.biz_email, "otp": otp_code})
        self.assertEqual(res_valid_otp.status_code, 200)
        self.assertEqual(res_valid_otp.json()["status"], "ok")

        # 4. Reset password
        new_pass = "brandNewPassword456"
        res_reset = client.post("/auth/reset-password", json={
            "email": self.biz_email,
            "otp": otp_code,
            "new_password": new_pass
        })
        self.assertEqual(res_reset.status_code, 200)
        self.assertEqual(res_reset.json()["status"], "ok")

        # 5. Verify old password no longer works
        res_old_login = client.post("/auth/login", data={"username": self.biz_email, "password": "password123"})
        self.assertEqual(res_old_login.status_code, 401)

        # 6. Verify new password works
        res_new_login = client.post("/auth/login", data={"username": self.biz_email, "password": new_pass})
        self.assertEqual(res_new_login.status_code, 200)
        self.assertIn("access_token", res_new_login.json())

        # 7. Verify OTP cannot be reused
        res_reuse = client.post("/auth/reset-password", json={
            "email": self.biz_email,
            "otp": otp_code,
            "new_password": "anotherPassword"
        })
        self.assertEqual(res_reuse.status_code, 400)

    def test_11_multi_ngo_bidding_and_auto_rejection(self):
        biz_headers = {"Authorization": f"Bearer {self.biz_token}"}

        # 1. Register NGO 1 and NGO 2
        uid_ngo1 = uuid.uuid4().hex[:8]
        res_ngo1 = client.post("/auth/register", json={
            "email": f"ngo1_{uid_ngo1}@test.org",
            "password": "password123",
            "org_name": "Hope Food Bank 1",
            "role": "ngo",
            "address": "101 Charity Ave"
        })
        ngo1_token = res_ngo1.json()["access_token"]
        ngo1_headers = {"Authorization": f"Bearer {ngo1_token}"}

        uid_ngo2 = uuid.uuid4().hex[:8]
        res_ngo2 = client.post("/auth/register", json={
            "email": f"ngo2_{uid_ngo2}@test.org",
            "password": "password123",
            "org_name": "Meals For All 2",
            "role": "ngo",
            "address": "202 Shelter Rd"
        })
        ngo2_token = res_ngo2.json()["access_token"]
        ngo2_headers = {"Authorization": f"Bearer {ngo2_token}"}

        # 2. Business creates a new surplus listing
        res_listing = client.post("/listings", headers=biz_headers, json={
            "title": "Fresh Apples Box",
            "category": "produce",
            "quantity": 25.0,
            "unit": "kg",
            "expiry_date": (date.today() + timedelta(days=3)).isoformat(),
            "pickup_location": "Storefront Loading Dock"
        })
        self.assertEqual(res_listing.status_code, 200)
        listing_id = res_listing.json()["id"]

        # 3. NGO 1 requests pickup -> Listing MUST still remain available for others, but hidden from NGO 1
        res_p1 = client.post("/pickups", headers=ngo1_headers, json={
            "listing_id": listing_id,
            "meals_estimate": 50.0,
            "scheduled_time": (date.today() + timedelta(days=1)).isoformat() + "T14:00:00"
        })
        self.assertEqual(res_p1.status_code, 200)
        p1_id = res_p1.json()["id"]

        # 3b. NGO 1 browses available listings -> MUST NOT see it (it's in NGO 1's My Pickups!)
        res_browse_ngo1 = client.get("/listings", headers=ngo1_headers)
        ngo1_available_ids = [l["id"] for l in res_browse_ngo1.json()]
        self.assertNotIn(listing_id, ngo1_available_ids)

        # 4. NGO 2 browses available listings -> Must STILL see the listing!
        res_browse = client.get("/listings", headers=ngo2_headers)
        available_ids = [l["id"] for l in res_browse.json()]
        self.assertIn(listing_id, available_ids)

        # 5. NGO 2 also requests pickup for the same surplus listing
        res_p2 = client.post("/pickups", headers=ngo2_headers, json={
            "listing_id": listing_id,
            "meals_estimate": 45.0,
            "scheduled_time": (date.today() + timedelta(days=1)).isoformat() + "T15:00:00"
        })
        self.assertEqual(res_p2.status_code, 200)
        p2_id = res_p2.json()["id"]

        # 6. Business views requests and decides to ACCEPT NGO 2
        res_confirm = client.patch(f"/pickups/{p2_id}", headers=biz_headers, json={
            "status": "confirmed"
        })
        self.assertEqual(res_confirm.status_code, 200)
        self.assertEqual(res_confirm.json()["status"], "confirmed")

        # 7. Listing status MUST now be "matched" (hidden from general browse marketplace)
        res_browse_after = client.get("/listings", headers=ngo1_headers)
        available_ids_after = [l["id"] for l in res_browse_after.json()]
        self.assertNotIn(listing_id, available_ids_after)

        # 8. NGO 1's competing request MUST be automatically CANCELLED / REJECTED
        res_ngo1_pickups = client.get("/pickups/mine", headers=ngo1_headers)
        p1_record = next(p for p in res_ngo1_pickups.json() if p["id"] == p1_id)
        self.assertEqual(p1_record["status"], "cancelled")

        # 9. NGO 2's request MUST remain CONFIRMED
        res_ngo2_pickups = client.get("/pickups/mine", headers=ngo2_headers)
        p2_record = next(p for p in res_ngo2_pickups.json() if p["id"] == p2_id)
        self.assertEqual(p2_record["status"], "confirmed")

    def test_12_registration_email_otp_flow(self):
        new_email = f"verified_{uuid.uuid4().hex[:8]}@test.org"

        # 1. Request registration OTP for new email
        res_send = client.post("/auth/send-registration-otp", json={"email": new_email})
        self.assertEqual(res_send.status_code, 200)
        send_data = res_send.json()
        self.assertIn("message", send_data)
        self.assertEqual(send_data["email"], new_email)
        otp_code = send_data.get("debug_otp")
        self.assertIsNotNone(otp_code)
        self.assertEqual(len(otp_code), 6)

        # 2. Test invalid OTP verification rejection
        res_bad_otp = client.post("/auth/verify-registration-otp", json={"email": new_email, "otp": "999999"})
        self.assertEqual(res_bad_otp.status_code, 400)

        # 3. Test valid OTP verification
        res_good_otp = client.post("/auth/verify-registration-otp", json={"email": new_email, "otp": otp_code})
        self.assertEqual(res_good_otp.status_code, 200)
        self.assertEqual(res_good_otp.json()["status"], "ok")

        # 4. Register account with verified OTP
        res_reg = client.post("/auth/register", json={
            "email": new_email,
            "password": "strongPassword123",
            "org_name": "Verified Food Rescue",
            "role": "ngo",
            "address": "777 Rescue Lane",
            "otp": otp_code
        })
        self.assertEqual(res_reg.status_code, 200)
        token_data = res_reg.json()
        self.assertIn("access_token", token_data)
        self.assertEqual(token_data["user"]["email"], new_email)

        # 5. Verify cannot send registration OTP for already registered email
        res_duplicate = client.post("/auth/send-registration-otp", json={"email": new_email})
        self.assertEqual(res_duplicate.status_code, 400)
        self.assertIn("already exists", res_duplicate.json()["detail"])

    def test_13_surplus_unique_6_digit_code_and_verification(self):
        biz_headers = {"Authorization": f"Bearer {self.biz_token}"}
        ngo_headers = {"Authorization": f"Bearer {self.ngo_token}"}

        # 1. Business lists a surplus item -> MUST generate a unique fixed 6-digit verification_code
        res_listing = client.post("/listings", headers=biz_headers, json={
            "title": "Fresh Baked Croissants",
            "category": "bakery",
            "quantity": 12.0,
            "unit": "packs",
            "expiry_date": (date.today() + timedelta(days=2)).isoformat(),
            "pickup_location": "789 Bakery St"
        })
        self.assertEqual(res_listing.status_code, 200)
        listing = res_listing.json()
        code = listing.get("verification_code")
        self.assertIsNotNone(code)
        self.assertEqual(len(code), 6)
        self.assertTrue(code.isdigit())

        # 2. NGO requests pickup -> receives the verification_code
        res_p = client.post("/pickups", headers=ngo_headers, json={
            "listing_id": listing["id"],
            "meals_estimate": 30.0,
            "scheduled_time": (date.today() + timedelta(days=1)).isoformat() + "T11:00:00"
        })
        self.assertEqual(res_p.status_code, 200)
        pickup = res_p.json()
        self.assertEqual(pickup["verification_code"], code)

        # 3. Confirm pickup
        res_conf = client.patch(f"/pickups/{pickup['id']}", headers=biz_headers, json={"status": "confirmed"})
        self.assertEqual(res_conf.status_code, 200)

        # 4. Attempt to verify using WRONG 6-digit code -> MUST be rejected (400)
        wrong_code = "000000" if code != "000000" else "111111"
        res_bad_verify = client.post("/pickups/verify-code", headers=biz_headers, json={
            "code": wrong_code
        })
        self.assertEqual(res_bad_verify.status_code, 400)
        self.assertIn("Invalid", res_bad_verify.json()["detail"])

        # 5. Verify using the CORRECT 6-digit code -> MUST succeed (200)
        res_good_verify = client.post("/pickups/verify-code", headers=biz_headers, json={
            "code": code
        })
        self.assertEqual(res_good_verify.status_code, 200)
        verify_data = res_good_verify.json()
        self.assertEqual(verify_data["status"], "verified")
        self.assertEqual(verify_data["verification_code"], code)
        self.assertEqual(verify_data["pickup_id"], pickup["id"])

        # 6. Verify cannot re-verify already completed donation
        res_re_verify = client.post("/pickups/verify-code", headers=biz_headers, json={
            "code": code
        })
        self.assertEqual(res_re_verify.status_code, 400)


if __name__ == "__main__":
    unittest.main()

