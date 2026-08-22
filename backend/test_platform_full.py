import sys
import os
import unittest
from datetime import date, timedelta
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(__file__))

from main import app
from database import Base, engine, SessionLocal
import models

client = TestClient(app)

class TestFoodWastePlatform(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create all tables in test database
        Base.metadata.create_all(bind=engine)

    def test_01_health_check(self):
        res = client.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "ok")

    def test_02_register_and_login(self):
        import uuid
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

        # Login Business
        res_login = client.post("/auth/login", data={
            "username": biz_email,
            "password": "password123"
        })
        self.assertEqual(res_login.status_code, 200)
        self.assertIn("access_token", res_login.json())

        # Save tokens for subsequent tests
        TestFoodWastePlatform.biz_token = biz_token
        TestFoodWastePlatform.ngo_token = ngo_token

    def test_03_inventory_crud_and_risk(self):
        headers = {"Authorization": f"Bearer {self.biz_token}"}
        
        # Add a high-risk item expiring in 2 days
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

        # List inventory
        res_list = client.get("/inventory", headers=headers)
        self.assertEqual(res_list.status_code, 200)
        self.assertGreaterEqual(len(res_list.json()), 1)

    def test_04_bulk_csv_upload(self):
        headers = {"Authorization": f"Bearer {self.biz_token}"}
        
        # Test bulk upload rows (simulating CSV parser output)
        bulk_rows = [
            {
                "name": "Sourdough Loaves",
                "category": "bakery",
                "quantity": 15.0,
                "unit": "loaves",
                "expiry_date": (date.today() + timedelta(days=3)).isoformat(),
                "avg_daily_usage": 3.0,
                "storage_location": "Rack 1"
            },
            {
                "name": "Canned Crushed Tomatoes",
                "category": "canned",
                "quantity": 50.0,
                "unit": "cans",
                "expiry_date": (date.today() + timedelta(days=200)).isoformat(),
                "avg_daily_usage": 1.0,
                "storage_location": "Pantry B"
            }
        ]
        
        res = client.post("/inventory/bulk-csv", headers=headers, json=bulk_rows)
        self.assertEqual(res.status_code, 200, res.text)
        self.assertEqual(res.json()["created"], 2)

        # Verify items were saved and risk scores computed
        res_items = client.get("/inventory", headers=headers)
        names = [i["name"] for i in res_items.json()]
        self.assertIn("Sourdough Loaves", names)
        self.assertIn("Canned Crushed Tomatoes", names)

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

    def test_06_analytics(self):
        biz_headers = {"Authorization": f"Bearer {self.biz_token}"}
        ngo_headers = {"Authorization": f"Bearer {self.ngo_token}"}

        # Check Business Analytics
        res_biz_an = client.get("/analytics/business", headers=biz_headers)
        self.assertEqual(res_biz_an.status_code, 200)
        biz_data = res_biz_an.json()
        self.assertGreaterEqual(biz_data["total_inventory_items"], 3)
        self.assertGreaterEqual(biz_data["completed_donations"], 1)
        self.assertGreaterEqual(biz_data["co2e_saved_kg"], 0.0)

        # Check NGO Analytics
        res_ngo_an = client.get("/analytics/ngo", headers=ngo_headers)
        self.assertEqual(res_ngo_an.status_code, 200)
        ngo_data = res_ngo_an.json()
        self.assertGreaterEqual(ngo_data["completed_pickups"], 1)
        self.assertGreaterEqual(ngo_data["meals_received"], 35.0)

if __name__ == "__main__":
    unittest.main()
