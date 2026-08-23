from datetime import date, datetime, timedelta
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

import models
import schemas
from database import engine, get_db, Base
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, require_role,
)
from risk_engine import (
    days_to_expiry, compute_risk_score, risk_level, reorder_recommendation,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI-Powered Food Waste Management Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok", "service": "food-waste-platform-api"}


# ============================================================
# AUTH
# ============================================================
@app.post("/auth/register", response_model=schemas.Token)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    if payload.role not in ("business", "ngo"):
        raise HTTPException(400, "role must be 'business' or 'ngo'")
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(400, "Email already registered")

    user = models.User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        org_name=payload.org_name,
        role=payload.role,
        address=payload.address or "",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    token = create_access_token({"sub": str(user.id), "email": user.email, "role": role_val})
    return schemas.Token(access_token=token, user=schemas.UserOut.model_validate(_user_out(user)))


@app.post("/auth/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(401, "Incorrect email or password")
    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    token = create_access_token({"sub": str(user.id), "email": user.email, "role": role_val})
    return schemas.Token(access_token=token, user=schemas.UserOut.model_validate(_user_out(user)))


@app.get("/auth/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return schemas.UserOut.model_validate(_user_out(current_user))


def _user_out(user: models.User):
    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    return {
        "id": user.id, "email": user.email, "org_name": user.org_name,
        "role": role_val, "address": user.address,
    }


# ============================================================
# INVENTORY MANAGEMENT & EXPIRY TRACKING  (Weeks 1-2)
# ============================================================
def _inventory_out(item: models.InventoryItem) -> schemas.InventoryOut:
    dte = days_to_expiry(item.expiry_date)
    score = compute_risk_score(item.quantity, item.avg_daily_usage, item.expiry_date)
    return schemas.InventoryOut(
        id=item.id, name=item.name, category=item.category, quantity=item.quantity,
        unit=item.unit, purchase_date=item.purchase_date, expiry_date=item.expiry_date,
        storage_location=item.storage_location, avg_daily_usage=item.avg_daily_usage,
        days_to_expiry=dte, risk_score=score, risk_level=risk_level(score),
        reorder_recommendation=reorder_recommendation(item.quantity, item.avg_daily_usage, item.expiry_date),
    )


@app.post("/inventory", response_model=schemas.InventoryOut)
def create_inventory_item(
    payload: schemas.InventoryCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("business")),
):
    item = models.InventoryItem(
        business_id=user.id,
        name=payload.name,
        category=payload.category,
        quantity=payload.quantity,
        unit=payload.unit,
        purchase_date=payload.purchase_date or date.today(),
        expiry_date=payload.expiry_date,
        storage_location=payload.storage_location or "",
        avg_daily_usage=payload.avg_daily_usage or 1.0,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _inventory_out(item)


@app.get("/inventory", response_model=List[schemas.InventoryOut])
def list_inventory(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("business")),
):
    items = db.query(models.InventoryItem).filter(models.InventoryItem.business_id == user.id).all()
    return [_inventory_out(i) for i in items]


@app.patch("/inventory/{item_id}", response_model=schemas.InventoryOut)
def update_inventory_item(
    item_id: int,
    payload: schemas.InventoryUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("business")),
):
    item = db.query(models.InventoryItem).filter(
        models.InventoryItem.id == item_id, models.InventoryItem.business_id == user.id
    ).first()
    if not item:
        raise HTTPException(404, "Item not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return _inventory_out(item)


@app.delete("/inventory/{item_id}")
def delete_inventory_item(
    item_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("business")),
):
    item = db.query(models.InventoryItem).filter(
        models.InventoryItem.id == item_id, models.InventoryItem.business_id == user.id
    ).first()
    if not item:
        raise HTTPException(404, "Item not found")
    db.delete(item)
    db.commit()
    return {"ok": True}


@app.post("/inventory/bulk-csv")
def bulk_upload_csv(
    rows: List[schemas.InventoryCreate],
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("business")),
):
    """Accepts pre-parsed CSV rows (frontend parses the .csv, posts JSON rows here)."""
    created = []
    for payload in rows:
        item = models.InventoryItem(
            business_id=user.id, name=payload.name, category=payload.category,
            quantity=payload.quantity, unit=payload.unit,
            purchase_date=payload.purchase_date or date.today(),
            expiry_date=payload.expiry_date, storage_location=payload.storage_location or "",
            avg_daily_usage=payload.avg_daily_usage or 1.0,
        )
        db.add(item)
        created.append(item)
    db.commit()
    return {"created": len(created)}


# ============================================================
# AI-BASED WASTE PREDICTION ENGINE  (Weeks 3-4)
# ============================================================
@app.get("/inventory/{item_id}/risk", response_model=schemas.InventoryOut)
def get_item_risk(
    item_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("business")),
):
    item = db.query(models.InventoryItem).filter(
        models.InventoryItem.id == item_id, models.InventoryItem.business_id == user.id
    ).first()
    if not item:
        raise HTTPException(404, "Item not found")
    return _inventory_out(item)


@app.get("/inventory/at-risk", response_model=List[schemas.InventoryOut])
def get_at_risk_items(
    threshold: float = 40.0,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("business")),
):
    items = db.query(models.InventoryItem).filter(models.InventoryItem.business_id == user.id).all()
    scored = [_inventory_out(i) for i in items]
    return [s for s in scored if s.risk_score >= threshold]


# ============================================================
# REDISTRIBUTION MARKETPLACE  (Weeks 5-6)
# ============================================================
def _listing_out(listing: models.Listing, db: Session) -> schemas.ListingOut:
    business = db.query(models.User).filter(models.User.id == listing.business_id).first()
    return schemas.ListingOut(
        id=listing.id, business_id=listing.business_id,
        business_name=business.org_name if business else None,
        title=listing.title, category=listing.category, quantity=listing.quantity,
        unit=listing.unit, expiry_date=listing.expiry_date, pickup_location=listing.pickup_location,
        pickup_window_start=listing.pickup_window_start, pickup_window_end=listing.pickup_window_end,
        status=listing.status.value, notes=listing.notes, created_at=listing.created_at,
    )


@app.post("/listings", response_model=schemas.ListingOut)
def create_listing(
    payload: schemas.ListingCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("business")),
):
    listing = models.Listing(
        business_id=user.id, inventory_item_id=payload.inventory_item_id,
        title=payload.title, category=payload.category, quantity=payload.quantity,
        unit=payload.unit, expiry_date=payload.expiry_date, pickup_location=payload.pickup_location,
        pickup_window_start=payload.pickup_window_start, pickup_window_end=payload.pickup_window_end,
        notes=payload.notes or "",
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return _listing_out(listing, db)


@app.get("/listings", response_model=List[schemas.ListingOut])
def browse_listings(
    status_filter: Optional[str] = "available",
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """NGOs browse available listings (AI-matching: sorted by soonest expiry = highest urgency)."""
    q = db.query(models.Listing)
    if status_filter:
        q = q.filter(models.Listing.status == status_filter)
    listings = q.order_by(models.Listing.expiry_date.asc()).all()
    return [_listing_out(l, db) for l in listings]


@app.get("/listings/mine", response_model=List[schemas.ListingOut])
def my_listings(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("business")),
):
    listings = db.query(models.Listing).filter(models.Listing.business_id == user.id).all()
    return [_listing_out(l, db) for l in listings]


# ---- Pickup / matching ----
def _pickup_out(pickup: models.Pickup, db: Session) -> schemas.PickupOut:
    ngo = db.query(models.User).filter(models.User.id == pickup.ngo_id).first()
    return schemas.PickupOut(
        id=pickup.id, listing_id=pickup.listing_id, ngo_id=pickup.ngo_id,
        ngo_name=ngo.org_name if ngo else None, status=pickup.status.value,
        scheduled_time=pickup.scheduled_time, meals_estimate=pickup.meals_estimate,
        created_at=pickup.created_at,
    )


@app.post("/pickups", response_model=schemas.PickupOut)
def request_pickup(
    payload: schemas.PickupCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("ngo")),
):
    listing = db.query(models.Listing).filter(models.Listing.id == payload.listing_id).first()
    if not listing:
        raise HTTPException(404, "Listing not found")
    if listing.status != models.ListingStatus.available:
        raise HTTPException(400, "Listing is no longer available")

    pickup = models.Pickup(
        listing_id=payload.listing_id, ngo_id=user.id,
        scheduled_time=payload.scheduled_time, meals_estimate=payload.meals_estimate or 0.0,
        status=models.PickupStatus.pending,
    )
    listing.status = models.ListingStatus.matched
    db.add(pickup)
    db.commit()
    db.refresh(pickup)
    return _pickup_out(pickup, db)


@app.patch("/pickups/{pickup_id}", response_model=schemas.PickupOut)
def update_pickup(
    pickup_id: int,
    payload: schemas.PickupUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    pickup = db.query(models.Pickup).filter(models.Pickup.id == pickup_id).first()
    if not pickup:
        raise HTTPException(404, "Pickup not found")
    listing = db.query(models.Listing).filter(models.Listing.id == pickup.listing_id).first()

    # only the business that owns the listing or the NGO that requested it may update
    if user.id not in (pickup.ngo_id, listing.business_id if listing else None):
        raise HTTPException(403, "Not authorized")

    if payload.status:
        pickup.status = payload.status
        if payload.status == "picked_up" and listing:
            listing.status = models.ListingStatus.completed
        if payload.status == "cancelled" and listing:
            listing.status = models.ListingStatus.available
    if payload.scheduled_time:
        pickup.scheduled_time = payload.scheduled_time
    if payload.meals_estimate is not None:
        pickup.meals_estimate = payload.meals_estimate

    db.commit()
    db.refresh(pickup)
    return _pickup_out(pickup, db)


@app.get("/pickups/mine", response_model=List[schemas.PickupOut])
def my_pickups(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("ngo")),
):
    pickups = db.query(models.Pickup).filter(models.Pickup.ngo_id == user.id).all()
    return [_pickup_out(p, db) for p in pickups]


@app.get("/listings/{listing_id}/pickups", response_model=List[schemas.PickupOut])
def listing_pickups(
    listing_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("business")),
):
    listing = db.query(models.Listing).filter(
        models.Listing.id == listing_id, models.Listing.business_id == user.id
    ).first()
    if not listing:
        raise HTTPException(404, "Listing not found")
    pickups = db.query(models.Pickup).filter(models.Pickup.listing_id == listing_id).all()
    return [_pickup_out(p, db) for p in pickups]


# ============================================================
# ANALYTICS DASHBOARDS
# ============================================================
CO2E_PER_KG_FOOD_WASTE = 2.5  # kg CO2-equivalent avoided per kg food redistributed (typical estimate)
MEALS_PER_KG = 2.5  # rough conversion used by several food-rescue orgs


@app.get("/analytics/business", response_model=schemas.BusinessAnalytics)
def business_analytics(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("business")),
):
    items = db.query(models.InventoryItem).filter(models.InventoryItem.business_id == user.id).all()
    high_risk = sum(
        1 for i in items
        if compute_risk_score(i.quantity, i.avg_daily_usage, i.expiry_date) >= 70
    )
    listings = db.query(models.Listing).filter(models.Listing.business_id == user.id).all()
    completed = [l for l in listings if l.status == models.ListingStatus.completed]
    qty_donated = sum(l.quantity for l in completed)

    return schemas.BusinessAnalytics(
        total_inventory_items=len(items),
        high_risk_items=high_risk,
        total_listings=len(listings),
        completed_donations=len(completed),
        quantity_donated=round(qty_donated, 1),
        co2e_saved_kg=round(qty_donated * CO2E_PER_KG_FOOD_WASTE, 1),
        meals_redistributed=round(qty_donated * MEALS_PER_KG, 1),
    )


@app.get("/analytics/ngo", response_model=schemas.NgoAnalytics)
def ngo_analytics(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("ngo")),
):
    pickups = db.query(models.Pickup).filter(models.Pickup.ngo_id == user.id).all()
    completed = [p for p in pickups if p.status == models.PickupStatus.picked_up]
    meals = sum(p.meals_estimate for p in completed)
    active_nearby = db.query(models.Listing).filter(models.Listing.status == models.ListingStatus.available).count()

    return schemas.NgoAnalytics(
        total_pickups=len(pickups),
        completed_pickups=len(completed),
        meals_received=round(meals, 1),
        active_listings_nearby=active_nearby,
    )
