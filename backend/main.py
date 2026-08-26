import os
import secrets
import hashlib
from datetime import date, datetime, timedelta
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
import schemas
from database import engine, get_db, Base
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, require_role, SECRET_KEY,
)
from risk_engine import (
    days_to_expiry, compute_risk_score, risk_level, reorder_recommendation,
)
from email_service import send_otp_email

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI-Powered Food Waste Management Platform API")

FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://foodwaste-platform.vercel.app")
ALLOWED_ORIGINS = [
    "https://foodwaste-platform.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]
if FRONTEND_URL and FRONTEND_URL not in ALLOWED_ORIGINS:
    ALLOWED_ORIGINS.append(FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
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
    
    norm_email = str(payload.email).strip().lower()
    existing = db.query(models.User).filter(func.lower(models.User.email) == norm_email).first()
    if existing:
        raise HTTPException(400, "Email already registered")

    user = models.User(
        email=norm_email,
        hashed_password=get_password_hash(payload.password),
        org_name=payload.org_name.strip(),
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
    norm_username = (form_data.username or "").strip().lower()
    user = db.query(models.User).filter(func.lower(models.User.email) == norm_username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(401, "Incorrect email or password")
    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    token = create_access_token({"sub": str(user.id), "email": user.email, "role": role_val})
    return schemas.Token(access_token=token, user=schemas.UserOut.model_validate(_user_out(user)))


@app.get("/auth/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return schemas.UserOut.model_validate(_user_out(current_user))


@app.post("/auth/forgot-password", response_model=schemas.ForgotPasswordResponse)
def forgot_password(payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    norm_email = str(payload.email).strip().lower()
    user = db.query(models.User).filter(func.lower(models.User.email) == norm_email).first()
    if not user:
        raise HTTPException(404, "No registered account found with this email address")

    # Invalidate previous unused OTPs
    db.query(models.PasswordResetOTP).filter(
        func.lower(models.PasswordResetOTP.email) == norm_email,
        models.PasswordResetOTP.is_used == False
    ).update({"is_used": True})

    # Generate secure 6-digit numeric OTP
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    hashed = hashlib.sha256((norm_email + otp_code + SECRET_KEY).encode()).hexdigest()
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    record = models.PasswordResetOTP(
        email=norm_email,
        hashed_otp=hashed,
        expires_at=expires_at,
        is_used=False,
        attempts=0,
    )
    db.add(record)
    db.commit()

    # Send email via SMTP (or logged)
    send_otp_email(norm_email, otp_code)

    # In dev/testing when SMTP is not configured, provide debug_otp
    smtp_host = os.environ.get("SMTP_HOST", "").strip()
    debug_otp = otp_code if not smtp_host else None

    return schemas.ForgotPasswordResponse(
        message="Verification code sent to your email address (Valid for 10 minutes)",
        email=norm_email,
        debug_otp=debug_otp,
    )


@app.post("/auth/verify-otp", response_model=schemas.GenericResponse)
def verify_otp(payload: schemas.VerifyOtpRequest, db: Session = Depends(get_db)):
    norm_email = str(payload.email).strip().lower()
    otp_code = payload.otp.strip()

    record = db.query(models.PasswordResetOTP).filter(
        func.lower(models.PasswordResetOTP.email) == norm_email,
        models.PasswordResetOTP.is_used == False
    ).order_by(models.PasswordResetOTP.created_at.desc()).first()

    if not record:
        raise HTTPException(400, "No active verification code found. Please request a new code.")

    if record.attempts >= 5:
        record.is_used = True
        db.commit()
        raise HTTPException(400, "Too many incorrect attempts. Please request a new code.")

    if datetime.utcnow() > record.expires_at:
        record.is_used = True
        db.commit()
        raise HTTPException(400, "Verification code has expired. Please request a new code.")

    expected_hash = hashlib.sha256((norm_email + otp_code + SECRET_KEY).encode()).hexdigest()
    if record.hashed_otp != expected_hash:
        record.attempts += 1
        db.commit()
        raise HTTPException(400, "Invalid verification code. Please check and try again.")

    return schemas.GenericResponse(status="ok", message="Verification code confirmed.")


@app.post("/auth/reset-password", response_model=schemas.GenericResponse)
def reset_password(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    norm_email = str(payload.email).strip().lower()
    otp_code = payload.otp.strip()

    if len(payload.new_password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters long")

    record = db.query(models.PasswordResetOTP).filter(
        func.lower(models.PasswordResetOTP.email) == norm_email,
        models.PasswordResetOTP.is_used == False
    ).order_by(models.PasswordResetOTP.created_at.desc()).first()

    if not record or datetime.utcnow() > record.expires_at:
        raise HTTPException(400, "Invalid or expired verification code.")

    expected_hash = hashlib.sha256((norm_email + otp_code + SECRET_KEY).encode()).hexdigest()
    if record.hashed_otp != expected_hash:
        record.attempts += 1
        db.commit()
        raise HTTPException(400, "Invalid verification code.")

    user = db.query(models.User).filter(func.lower(models.User.email) == norm_email).first()
    if not user:
        raise HTTPException(404, "User account not found.")

    user.hashed_password = get_password_hash(payload.new_password)
    record.is_used = True
    db.commit()

    return schemas.GenericResponse(status="ok", message="Password reset successfully. You can now sign in.")


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


@app.get("/analytics/dashboard", response_model=schemas.FoodRescueDashboardOut)
def food_rescue_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # 1. Active Listings
    listings_active = db.query(models.Listing).filter(models.Listing.status == models.ListingStatus.available).count()

    # 2. Pickups & Food Rescued
    all_pickups = db.query(models.Pickup).all()
    completed_pickups = [p for p in all_pickups if p.status == models.PickupStatus.picked_up]

    total_rescued_kg = sum(
        (p.listing.quantity if p.listing and p.listing.quantity else (p.meals_estimate / MEALS_PER_KG if p.meals_estimate else 0.0))
        for p in completed_pickups
    )
    if total_rescued_kg == 0.0:
        completed_listings = db.query(models.Listing).filter(models.Listing.status == models.ListingStatus.completed).all()
        total_rescued_kg = sum(l.quantity for l in completed_listings)

    co2_prevented_kg = round(total_rescued_kg * CO2E_PER_KG_FOOD_WASTE, 1)

    # 3. Active NGOs
    active_ngos_count = len(set(p.ngo_id for p in all_pickups))
    if active_ngos_count == 0:
        active_ngos_count = db.query(models.User).filter(models.User.role == models.UserRole.ngo).count()

    # 4. Category Breakdown (Last 30 Days / All Time)
    categories = ["Cooked Meals", "Bread & Bakery", "Fruits & Veg", "Dairy", "Grains", "Packaged"]
    cat_map = {c: 0.0 for c in categories}

    for l in db.query(models.Listing).all():
        cat_lower = (l.category or "general").lower()
        if "bakery" in cat_lower or "bread" in cat_lower:
            cat_map["Bread & Bakery"] += l.quantity
        elif "produce" in cat_lower or "fruit" in cat_lower or "veg" in cat_lower:
            cat_map["Fruits & Veg"] += l.quantity
        elif "dairy" in cat_lower or "milk" in cat_lower or "cheese" in cat_lower:
            cat_map["Dairy"] += l.quantity
        elif "grain" in cat_lower or "cereal" in cat_lower or "rice" in cat_lower:
            cat_map["Grains"] += l.quantity
        elif "cooked" in cat_lower or "prepared" in cat_lower:
            cat_map["Cooked Meals"] += l.quantity
        else:
            cat_map["Packaged"] += l.quantity

    category_breakdown = [
        schemas.CategoryRescueStat(category=c, quantity_kg=round(cat_map[c], 1))
        for c in categories
    ]

    # 5. Top Donor Partners
    donor_map = {}
    for l in db.query(models.Listing).all():
        b_name = l.business.org_name if l.business else "Food Donor"
        donor_map[b_name] = donor_map.get(b_name, 0.0) + (l.quantity or 0.0)

    top_donors = [
        schemas.TopDonorStat(donor_name=name, quantity_kg=round(qty, 1))
        for name, qty in sorted(donor_map.items(), key=lambda x: x[1], reverse=True)[:5]
    ]

    # 6. Recent Rescue Operations
    recent_ops = []
    recent_pickups = db.query(models.Pickup).order_by(models.Pickup.created_at.desc()).limit(10).all()
    for p in recent_pickups:
        listing = p.listing
        donor_name = listing.business.org_name if listing and listing.business else "Food Business Partner"
        food_title = listing.title if listing else "Surplus Food"
        qty = listing.quantity if listing else 0.0
        unit = listing.unit if listing else "kg"
        ngo_name = p.ngo.org_name if p.ngo else "Community Relief"
        listing_code = f"LST-{4800 + (p.listing_id or 1)}"

        status_display = "Pending"
        if p.status == models.PickupStatus.picked_up:
            status_display = "Picked Up"
        elif p.status == models.PickupStatus.confirmed:
            status_display = "Confirmed"
        elif p.status == models.PickupStatus.cancelled:
            status_display = "Cancelled"

        recent_ops.append(schemas.RescueOperationItem(
            id=p.id,
            listing_code=listing_code,
            donor=donor_name,
            food_type=food_title,
            quantity=qty,
            unit=unit,
            ngo_assigned=ngo_name,
            status=status_display,
            scheduled_time=p.scheduled_time,
        ))

    return schemas.FoodRescueDashboardOut(
        listings_active=listings_active,
        food_rescued_kg=round(total_rescued_kg, 1),
        co2_prevented_kg=co2_prevented_kg,
        ngos_active=active_ngos_count,
        category_breakdown=category_breakdown,
        top_donors=top_donors,
        recent_rescue_operations=recent_ops,
    )
