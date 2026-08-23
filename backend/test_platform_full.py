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

        # 1. Business lists surplus item
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

if __name__ == "__main__":
    unittest.main()
