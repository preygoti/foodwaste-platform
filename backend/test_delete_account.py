import sys
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
import models
from auth import get_password_hash

client = TestClient(app)

def test_delete_account_flow():
    print("\n--- Testing Delete Account Flow ---")
    db = SessionLocal()

    # 1. Clean up any existing test user
    test_email = "test_del_user@test.org"
    existing = db.query(models.User).filter(models.User.email == test_email).first()
    if existing:
        db.delete(existing)
        db.commit()

    # 2. Create test user directly
    user = models.User(
        email=test_email,
        hashed_password=get_password_hash("Secret123!"),
        org_name="Test Deletion Bakery",
        role="business",
        address="123 Test Street",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    saved_user_id = user.id

    # 3. Add an inventory item and listing
    inv = models.InventoryItem(
        business_id=saved_user_id,
        name="Fresh Bread",
        category="bakery",
        quantity=10.0,
        unit="loaves",
        expiry_date=models.date.today(),
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)

    listing = models.Listing(
        business_id=saved_user_id,
        inventory_item_id=inv.id,
        title="Surplus Bread",
        category="bakery",
        quantity=5.0,
        unit="loaves",
        expiry_date=models.date.today(),
        pickup_location="Backdoor",
    )
    db.add(listing)
    db.commit()
    db.close()

    # 4. Login to obtain access token
    login_res = client.post(
        "/auth/login",
        data={"username": test_email, "password": "Secret123!"}
    )
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 5. Try deleting account with WRONG password -> Expect 400
    fail_res = client.request(
        "DELETE",
        "/auth/account",
        headers=headers,
        json={"password": "WrongPassword!"}
    )
    assert fail_res.status_code == 400, f"Expected 400 on wrong password, got {fail_res.status_code}"
    print("[PASS] Successfully rejected deletion with incorrect password")

    # 6. Delete account with CORRECT password -> Expect 200
    success_res = client.request(
        "DELETE",
        "/auth/account",
        headers=headers,
        json={"password": "Secret123!"}
    )
    assert success_res.status_code == 200, f"Expected 200, got {success_res.status_code}: {success_res.text}"
    print("[PASS] Successfully deleted business account with correct password")

    # 7. Verify database cleanup
    db = SessionLocal()
    check_user = db.query(models.User).filter(models.User.email == test_email).first()
    assert check_user is None, "User still exists in database!"
    check_inv = db.query(models.InventoryItem).filter(models.InventoryItem.business_id == saved_user_id).all()
    assert len(check_inv) == 0, "Inventory items not deleted!"
    check_listings = db.query(models.Listing).filter(models.Listing.business_id == saved_user_id).all()
    assert len(check_listings) == 0, "Listings not deleted!"
    db.close()
    print("[PASS] Verified complete cascade database cleanup of user, inventory, and listings")

    # 8. Verify previous token is now rejected on /auth/me
    me_res = client.get("/auth/me", headers=headers)
    assert me_res.status_code == 401, f"Expected 401 for deleted user token, got {me_res.status_code}"
    print("[PASS] Verified deleted user token is immediately invalidated (401)")

    # 9. Test deleting an NGO account
    print("\n--- Testing NGO Account Deletion ---")
    ngo_email = "test_ngo_del@ngo.org"
    db = SessionLocal()
    ngo_user = models.User(
        email=ngo_email,
        hashed_password=get_password_hash("NgoPass123!"),
        org_name="Community Food Bank",
        role="ngo",
        address="789 Aid Avenue",
    )
    db.add(ngo_user)
    db.commit()
    db.refresh(ngo_user)
    saved_ngo_id = ngo_user.id
    db.close()

    ngo_login = client.post(
        "/auth/login",
        data={"username": ngo_email, "password": "NgoPass123!"}
    )
    assert ngo_login.status_code == 200
    ngo_token = ngo_login.json()["access_token"]
    ngo_headers = {"Authorization": f"Bearer {ngo_token}"}

    del_ngo_res = client.request(
        "DELETE",
        "/auth/account",
        headers=ngo_headers,
        json={"password": "NgoPass123!"}
    )
    assert del_ngo_res.status_code == 200
    print("[PASS] Successfully deleted NGO account with correct password")

    db = SessionLocal()
    check_ngo = db.query(models.User).filter(models.User.email == ngo_email).first()
    assert check_ngo is None, "NGO user still exists!"
    db.close()
    print("[PASS] Verified NGO user record completely removed from database")

    print("\nALL DELETE ACCOUNT TESTS PASSED SUCCESSFULLY!\n")

if __name__ == "__main__":
    test_delete_account_flow()
