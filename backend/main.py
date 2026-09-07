import os
import secrets
import hashlib
from datetime import date, datetime, timedelta
from typing import List, Optional

import time
from collections import defaultdict
from fastapi import FastAPI, Depends, HTTPException, status, Request, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, text
from sqlalchemy.orm import Session, joinedload

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
from vision_engine import run_food_vision_classifier

Base.metadata.create_all(bind=engine)

# Safe automatic schema upgrade for verification_code column on PostgreSQL and SQLite
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE listings ADD COLUMN verification_code VARCHAR"))
        conn.commit()
except Exception:
    pass

app = FastAPI(title="AI-Powered Food Waste Management Platform API")

# ------------------------------------------------------------
# In-Memory Anti-Brute-Force & Rate Limiting Storage
# ------------------------------------------------------------
_ip_request_timestamps = defaultdict(list)
_auth_request_timestamps = defaultdict(list)

MAX_GLOBAL_PER_MINUTE = 300
MAX_AUTH_PER_MINUTE = 30
MAX_REQUEST_BODY_BYTES = 25 * 1024 * 1024  # 25MB max body size

@app.middleware("http")
async def security_and_rate_limit_middleware(request: Request, call_next):
    # 1. Payload Size DoS Protection
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_REQUEST_BODY_BYTES:
        return JSONResponse(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            content={"detail": "Payload too large. Maximum allowed request size is 25MB."}
        )

    # 2. Rate Limiting (Free In-Memory Sliding Window)
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    one_min_ago = now - 60.0

    path = request.url.path
    if path.startswith("/auth/"):
        auth_times = _auth_request_timestamps[client_ip]
        _auth_request_timestamps[client_ip] = [t for t in auth_times if t > one_min_ago]
        if len(_auth_request_timestamps[client_ip]) >= MAX_AUTH_PER_MINUTE:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Too many authentication requests. Please wait a minute before retrying."},
                headers={"Retry-After": "60"}
            )
        _auth_request_timestamps[client_ip].append(now)

    global_times = _ip_request_timestamps[client_ip]
    _ip_request_timestamps[client_ip] = [t for t in global_times if t > one_min_ago]
    if len(_ip_request_timestamps[client_ip]) >= MAX_GLOBAL_PER_MINUTE:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "Rate limit exceeded. Please slow down your requests."},
            headers={"Retry-After": "60"}
        )
    _ip_request_timestamps[client_ip].append(now)

    # 3. Process the actual request
    response = await call_next(request)

    # 4. Inject OWASP Enterprise Security Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=*, geolocation=*, microphone=()"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r".*",
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
@app.post("/auth/send-registration-otp", response_model=schemas.SendRegistrationOtpResponse)
def send_registration_otp(payload: schemas.SendRegistrationOtpRequest, db: Session = Depends(get_db)):
    norm_email = str(payload.email).strip().lower()
    
    # Check if email is already registered
    existing = db.query(models.User).filter(func.lower(models.User.email) == norm_email).first()
    if existing:
        raise HTTPException(400, "An account with this email address already exists. Please sign in.")

    # Invalidate previous unused registration OTPs for this email
    db.query(models.RegistrationOTP).filter(
        func.lower(models.RegistrationOTP.email) == norm_email,
        models.RegistrationOTP.is_used == False
    ).update({"is_used": True})

    # Generate secure 6-digit numeric OTP
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    hashed = hashlib.sha256((norm_email + otp_code + SECRET_KEY).encode()).hexdigest()
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    record = models.RegistrationOTP(
        email=norm_email,
        hashed_otp=hashed,
        expires_at=expires_at,
        is_used=False,
        attempts=0,
    )
    db.add(record)
    db.commit()

    # Dispatch email
    success, err_msg = send_otp_email(norm_email, otp_code, purpose="registration")
    
    has_live_email_api = bool(
        os.environ.get("BREVO_API_KEY") or
        os.environ.get("RESEND_API_KEY") or
        os.environ.get("SENDGRID_API_KEY")
    )

    if not success:
        logger.warning(f"[Registration-Auth] Email dispatch to {norm_email} had warning: {err_msg}")

    debug_otp = None if (success and has_live_email_api) else otp_code

    message = (
        "Verification code sent to your email address (Valid for 10 minutes)"
        if (success and has_live_email_api)
        else "Verification code generated (Valid for 10 minutes)"
    )

    return schemas.SendRegistrationOtpResponse(
        message=message,
        email=norm_email,
        debug_otp=debug_otp,
    )


@app.post("/auth/verify-registration-otp", response_model=schemas.GenericResponse)
def verify_registration_otp(payload: schemas.VerifyRegistrationOtpRequest, db: Session = Depends(get_db)):
    norm_email = str(payload.email).strip().lower()
    otp_code = payload.otp.strip()

    record = db.query(models.RegistrationOTP).filter(
        func.lower(models.RegistrationOTP.email) == norm_email,
        models.RegistrationOTP.is_used == False
    ).order_by(models.RegistrationOTP.created_at.desc()).first()

    if not record:
        raise HTTPException(400, "No active verification code found for this email. Please request a verification code.")

    if record.attempts >= 5:
        record.is_used = True
        db.commit()
        raise HTTPException(400, "Too many incorrect attempts. Please request a new verification code.")

    if datetime.utcnow() > record.expires_at:
        record.is_used = True
        db.commit()
        raise HTTPException(400, "Verification code has expired. Please request a new code.")

    expected_hash = hashlib.sha256((norm_email + otp_code + SECRET_KEY).encode()).hexdigest()
    if record.hashed_otp != expected_hash:
        record.attempts += 1
        db.commit()
        raise HTTPException(400, "Invalid 6-digit verification code. Please check and try again.")

    return schemas.GenericResponse(status="ok", message="Email verified successfully! You can now complete registration.")


@app.post("/auth/register", response_model=schemas.Token)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    if payload.role not in ("business", "ngo"):
        raise HTTPException(400, "role must be 'business' or 'ngo'")
    
    norm_email = str(payload.email).strip().lower()
    existing = db.query(models.User).filter(func.lower(models.User.email) == norm_email).first()
    if existing:
        raise HTTPException(400, "Email already registered")

    # If OTP is provided, verify it
    if payload.otp:
        otp_code = payload.otp.strip()
        record = db.query(models.RegistrationOTP).filter(
            func.lower(models.RegistrationOTP.email) == norm_email,
            models.RegistrationOTP.is_used == False
        ).order_by(models.RegistrationOTP.created_at.desc()).first()

        if not record or datetime.utcnow() > record.expires_at:
            raise HTTPException(400, "Invalid or expired email verification code. Please verify your email.")

        expected_hash = hashlib.sha256((norm_email + otp_code + SECRET_KEY).encode()).hexdigest()
        if record.hashed_otp != expected_hash:
            record.attempts += 1
            db.commit()
            raise HTTPException(400, "Invalid verification code.")
        
        record.is_used = True

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

    # Attempt email dispatch via configured providers
    success, err_msg = send_otp_email(norm_email, otp_code)
    
    # Check if a live HTTPS email API is active
    has_live_email_api = bool(
        os.environ.get("BREVO_API_KEY") or
        os.environ.get("RESEND_API_KEY") or
        os.environ.get("SENDGRID_API_KEY")
    )

    if not success:
        logger.warning(f"[Auth] Email dispatch to {norm_email} had warning: {err_msg}")

    # If live HTTPS email API successfully delivered the mail, no on-screen code is needed;
    # otherwise, provide the code on-screen so users on Render/local are never locked out.
    debug_otp = None if (success and has_live_email_api) else otp_code

    message = (
        "Verification code sent to your email address (Valid for 10 minutes)"
        if (success and has_live_email_api)
        else "Verification code generated (Valid for 10 minutes)"
    )

    return schemas.ForgotPasswordResponse(
        message=message,
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


@app.delete("/inventory/expired/clear")
def clear_all_expired_inventory(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("business")),
):
    expired_items = db.query(models.InventoryItem).filter(
        models.InventoryItem.business_id == user.id,
        models.InventoryItem.expiry_date <= date.today()
    ).all()
    
    expired_ids = [i.id for i in expired_items]
    if expired_ids:
        db.query(models.Listing).filter(models.Listing.inventory_item_id.in_(expired_ids)).update(
            {models.Listing.inventory_item_id: None}, synchronize_session=False
        )
        for item in expired_items:
            db.delete(item)
        db.commit()
    return {"ok": True, "deleted": len(expired_ids)}


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
    
    # Safely unlink any listings referencing this inventory item before deleting
    db.query(models.Listing).filter(models.Listing.inventory_item_id == item_id).update(
        {models.Listing.inventory_item_id: None}, synchronize_session=False
    )
    
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
            business_id=user.id,
            name=str(payload.name).strip(),
            category=str(payload.category or "general").strip().lower(),
            quantity=float(payload.quantity),
            unit=str(payload.unit or "kg").strip(),
            purchase_date=payload.purchase_date or date.today(),
            expiry_date=payload.expiry_date,
            storage_location=str(payload.storage_location or "").strip(),
            avg_daily_usage=float(payload.avg_daily_usage or 1.0),
        )
        db.add(item)
        created.append(item)
    db.commit()
    return {"created": len(created), "ok": True}


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
def generate_unique_verification_code(db: Session) -> str:
    """Generate a unique, fixed 6-digit verification PIN for a surplus food listing."""
    for _ in range(100):
        code = str(secrets.randbelow(900000) + 100000)
        existing = db.query(models.Listing).filter(models.Listing.verification_code == code).first()
        if not existing:
            return code
    return str(secrets.randbelow(900000) + 100000)


def _listing_out(listing: models.Listing, db: Session) -> schemas.ListingOut:
    business = db.query(models.User).filter(models.User.id == listing.business_id).first()
    if not listing.verification_code:
        listing.verification_code = generate_unique_verification_code(db)
        try:
            db.commit()
            db.refresh(listing)
        except Exception:
            db.rollback()
    return schemas.ListingOut(
        id=listing.id, business_id=listing.business_id,
        business_name=business.org_name if business else None,
        title=listing.title, category=listing.category, quantity=listing.quantity,
        unit=listing.unit, expiry_date=listing.expiry_date, pickup_location=listing.pickup_location,
        pickup_window_start=listing.pickup_window_start, pickup_window_end=listing.pickup_window_end,
        status=listing.status.value, notes=listing.notes,
        verification_code=listing.verification_code,
        created_at=listing.created_at,
    )


@app.post("/listings", response_model=schemas.ListingOut)
def create_listing(
    payload: schemas.ListingCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("business")),
):
    # Food safety check: Expired items cannot be donated
    if payload.expiry_date < date.today():
        raise HTTPException(
            status_code=400,
            detail="Cannot list expired food items as surplus donation for NGOs. Expired goods must be logged for safe disposal.",
        )

    if payload.inventory_item_id:
        inv_item = db.query(models.InventoryItem).filter(
            models.InventoryItem.id == payload.inventory_item_id,
            models.InventoryItem.business_id == user.id,
        ).first()
        if inv_item and inv_item.expiry_date < date.today():
            raise HTTPException(
                status_code=400,
                detail="Cannot list an expired inventory item into the surplus marketplace.",
            )
        if inv_item:
            remaining_qty = inv_item.quantity - payload.quantity
            if remaining_qty <= 0:
                # Entire item transferred to Surplus Marketplace - remove from inventory ledger
                db.delete(inv_item)
                payload.inventory_item_id = None
            else:
                inv_item.quantity = round(remaining_qty, 2)

    v_code = generate_unique_verification_code(db)
    listing = models.Listing(
        business_id=user.id, inventory_item_id=payload.inventory_item_id,
        title=payload.title, category=payload.category, quantity=payload.quantity,
        unit=payload.unit, expiry_date=payload.expiry_date, pickup_location=payload.pickup_location,
        pickup_window_start=payload.pickup_window_start, pickup_window_end=payload.pickup_window_end,
        notes=payload.notes or "",
        verification_code=v_code,
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
    """NGOs browse available listings (AI-matching: sorted by soonest expiry = highest urgency). Expired items are strictly excluded."""
    q = db.query(models.Listing)
    if status_filter:
        q = q.filter(models.Listing.status == status_filter)
    
    # Food safety: Never show expired food listings to NGOs
    q = q.filter(models.Listing.expiry_date >= date.today())

    # If the user is an NGO, exclude listings they have already requested (active pending or confirmed or completed)
    if user.role == models.UserRole.ngo:
        requested_ids_subquery = db.query(models.Pickup.listing_id).filter(
            models.Pickup.ngo_id == user.id,
            models.Pickup.status.in_([models.PickupStatus.pending, models.PickupStatus.confirmed, models.PickupStatus.picked_up])
        ).scalar_subquery()
        q = q.filter(~models.Listing.id.in_(requested_ids_subquery))

    listings = q.order_by(models.Listing.expiry_date.asc()).all()
    return [_listing_out(l, db) for l in listings]


@app.get("/listings/mine", response_model=List[schemas.ListingOut])
def my_listings(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("business")),
):
    listings = db.query(models.Listing).filter(models.Listing.business_id == user.id).all()
    return [_listing_out(l, db) for l in listings]


@app.get("/listings/{listing_id}/pickups", response_model=List[schemas.PickupOut])
def listing_pickups(
    listing_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(404, "Listing not found")
    
    if user.role == models.UserRole.business and listing.business_id != user.id:
        raise HTTPException(403, "Not authorized to view pickups for another business's listing")

    pickups = db.query(models.Pickup).filter(models.Pickup.listing_id == listing_id).order_by(models.Pickup.id.desc()).all()
    return [_pickup_out(p, db) for p in pickups]


# ---- Pickup / matching ----
def _pickup_out(pickup: models.Pickup, db: Session) -> schemas.PickupOut:
    ngo = db.query(models.User).filter(models.User.id == pickup.ngo_id).first()
    listing = db.query(models.Listing).filter(models.Listing.id == pickup.listing_id).first()
    if listing and not listing.verification_code:
        listing.verification_code = generate_unique_verification_code(db)
        try:
            db.commit()
            db.refresh(listing)
        except Exception:
            db.rollback()
    return schemas.PickupOut(
        id=pickup.id,
        listing_id=pickup.listing_id,
        listing_title=listing.title if listing else None,
        listing_category=listing.category if listing else None,
        listing_quantity=listing.quantity if listing else None,
        listing_unit=listing.unit if listing else None,
        pickup_location=listing.pickup_location if listing else None,
        verification_code=listing.verification_code if listing else None,
        ngo_id=pickup.ngo_id,
        ngo_name=ngo.org_name if ngo else None,
        status=pickup.status.value,
        scheduled_time=pickup.scheduled_time,
        meals_estimate=pickup.meals_estimate,
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
        raise HTTPException(400, "This surplus listing has already been accepted and assigned to another organization.")
    if listing.expiry_date < date.today():
        raise HTTPException(400, "Cannot claim an expired listing. This food donation has expired.")

    # Prevent duplicate active requests from the same NGO
    existing = db.query(models.Pickup).filter(
        models.Pickup.listing_id == payload.listing_id,
        models.Pickup.ngo_id == user.id,
        models.Pickup.status.in_([models.PickupStatus.pending, models.PickupStatus.confirmed]),
    ).first()
    if existing:
        raise HTTPException(400, "You already have an active request for this surplus listing.")

    pickup = models.Pickup(
        listing_id=payload.listing_id, ngo_id=user.id,
        scheduled_time=payload.scheduled_time, meals_estimate=payload.meals_estimate or 0.0,
        status=models.PickupStatus.pending,
    )
    # Surplus item remains available for other NGOs to request until the donor confirms/accepts one!
    listing.status = models.ListingStatus.available
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

        # 1. DONOR ACCEPTS THIS NGO'S REQUEST:
        if payload.status == "confirmed" and listing:
            # Mark listing matched (hidden from browse marketplace for all other NGOs!)
            listing.status = models.ListingStatus.matched

            # Automatically reject/cancel all other competing pending requests for this listing
            other_pending = db.query(models.Pickup).filter(
                models.Pickup.listing_id == pickup.listing_id,
                models.Pickup.id != pickup.id,
                models.Pickup.status == models.PickupStatus.pending,
            ).all()
            for op in other_pending:
                op.status = models.PickupStatus.cancelled

        # 2. PICKUP COMPLETED:
        elif payload.status == "picked_up" and listing:
            listing.status = models.ListingStatus.completed

        # 3. REQUEST REJECTED / CANCELLED:
        elif payload.status == "cancelled" and listing:
            # Check if any confirmed pickup remains; if not, return listing to available for other NGOs
            has_other_confirmed = db.query(models.Pickup).filter(
                models.Pickup.listing_id == pickup.listing_id,
                models.Pickup.id != pickup.id,
                models.Pickup.status == models.PickupStatus.confirmed,
            ).first()
            if not has_other_confirmed:
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


CO2E_PER_KG_FOOD_WASTE = 2.5  # kg CO2-equivalent avoided per kg food redistributed
MEALS_PER_KG = 2.5  # rough conversion used by several food-rescue orgs


@app.post("/pickups/verify-code", response_model=schemas.QrHandshakeResponse)
def verify_pickup_by_code(
    payload: schemas.QrPinVerificationRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("business")),
):
    """
    Food business verifies and completes a surplus food handoff using the unique fixed 6-digit code from the NGO driver's QR pass.
    Strictly checks that the entered 6-digit code matches an active surplus listing. Rejects invalid codes.
    """
    raw_code = str(payload.code).strip()
    digits = "".join(ch for ch in raw_code if ch.isdigit())

    pickup = None
    listing = None

    # 1. Search by 6-digit verification code across all listings of this business
    if len(digits) >= 6:
        target_code = digits[:6]
        listing = db.query(models.Listing).filter(
            models.Listing.business_id == user.id,
            models.Listing.verification_code == target_code,
        ).first()
        if listing:
            # Find active confirmed or pending pickup for this listing
            pickup = db.query(models.Pickup).filter(
                models.Pickup.listing_id == listing.id,
                models.Pickup.status.in_([models.PickupStatus.confirmed, models.PickupStatus.pending]),
            ).first()

    # 2. Check by pickup_id if passed
    if not pickup and payload.pickup_id:
        actual_id = payload.pickup_id - 5000 if payload.pickup_id > 5000 else payload.pickup_id
        candidate = db.query(models.Pickup).filter(models.Pickup.id == actual_id).first()
        if candidate:
            c_listing = db.query(models.Listing).filter(models.Listing.id == candidate.listing_id).first()
            if c_listing and c_listing.business_id == user.id:
                if c_listing.verification_code and digits and digits != c_listing.verification_code:
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid 6-digit verification code. The entered code does not match this surplus item.",
                    )
                pickup = candidate
                listing = c_listing

    if not listing or not pickup:
        if listing:
            completed_p = db.query(models.Pickup).filter(
                models.Pickup.listing_id == listing.id,
                models.Pickup.status == models.PickupStatus.picked_up,
            ).first()
            if completed_p:
                raise HTTPException(
                    status_code=400,
                    detail="This surplus donation has already been verified and completed!",
                )
        raise HTTPException(
            status_code=400,
            detail="Invalid 6-digit verification code! The entered code does not match any active surplus items. Please check the driver's QR pass.",
        )

    # Update pickup & listing status
    pickup.status = models.PickupStatus.picked_up
    listing.status = models.ListingStatus.completed
    db.commit()

    ngo = db.query(models.User).filter(models.User.id == pickup.ngo_id).first()
    ngo_name = ngo.org_name if ngo else "Community Partner"

    qty = listing.quantity
    co2_saved = round(qty * CO2E_PER_KG_FOOD_WASTE, 1)
    meals = round(qty * MEALS_PER_KG, 1)

    return schemas.QrHandshakeResponse(
        status="verified",
        message="Food rescue handoff confirmed & verified via unique 6-digit code!",
        pickup_id=pickup.id,
        listing_title=listing.title,
        ngo_name=ngo_name,
        quantity=qty,
        unit=listing.unit,
        verified_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
        co2_saved_kg=co2_saved,
        meals_provided=meals,
        verification_code=listing.verification_code,
    )


@app.post("/pickups/{pickup_id}/verify-handshake", response_model=schemas.QrHandshakeResponse)
def verify_pickup_handshake(
    pickup_id: int,
    payload: schemas.QrHandshakeRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("business")),
):
    """
    Food business scans NGO driver's QR code to verify and atomically complete the surplus food handoff.
    """
    actual_id = pickup_id
    pickup = db.query(models.Pickup).filter(models.Pickup.id == actual_id).first()
    if not pickup and actual_id > 5000:
        actual_id = actual_id - 5000
        pickup = db.query(models.Pickup).filter(models.Pickup.id == actual_id).first()

    if not pickup:
        raise HTTPException(404, f"Pickup reservation #{pickup_id} not found")

    listing = db.query(models.Listing).filter(models.Listing.id == pickup.listing_id).first()
    if not listing:
        raise HTTPException(404, "Associated listing not found")

    if listing.business_id != user.id:
        raise HTTPException(403, "You can only verify pickups for your own business listings")

    # If code/token provided, strictly verify that it matches listing.verification_code
    provided_code = payload.code or payload.verification_code or payload.handshake_token
    if provided_code:
        digits = "".join(ch for ch in str(provided_code) if ch.isdigit())
        if listing.verification_code and digits and len(digits) >= 6:
            if digits[:6] != listing.verification_code:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid 6-digit verification code. The code does not match this surplus listing.",
                )

    # Update pickup & listing status
    pickup.status = models.PickupStatus.picked_up
    listing.status = models.ListingStatus.completed
    db.commit()

    ngo = db.query(models.User).filter(models.User.id == pickup.ngo_id).first()
    ngo_name = ngo.org_name if ngo else "Community Partner"
    
    qty = listing.quantity
    co2_saved = round(qty * CO2E_PER_KG_FOOD_WASTE, 1)
    meals = round(qty * MEALS_PER_KG, 1)

    return schemas.QrHandshakeResponse(
        status="verified",
        message="Food rescue handoff confirmed & verified via secure QR handshake!",
        pickup_id=pickup.id,
        listing_title=listing.title,
        ngo_name=ngo_name,
        quantity=qty,
        unit=listing.unit,
        verified_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
        co2_saved_kg=co2_saved,
        meals_provided=meals,
        verification_code=listing.verification_code,
    )


# ============================================================
# AI VISION FRESHNESS & SPOILAGE QUALITY INSPECTOR
# ============================================================
@app.post("/ai/inspect-freshness", response_model=schemas.FreshnessInspectionResponse)
def inspect_food_freshness(
    payload: schemas.FreshnessInspectionRequest,
    user: models.User = Depends(get_current_user),
):
    """
    AI Vision Food Freshness & Spoilage Inspector:
    Analyzes live camera frames or uploaded photos with Gemini Multimodal Vision API
    or advanced multi-spectral computer vision to detect food type, predict shelf-life,
    and grade commercial food quality.
    """
    result = run_food_vision_classifier(payload.image_base64, payload.item_hint)
    return schemas.FreshnessInspectionResponse(**result)


# ============================================================
# ANALYTICS DASHBOARDS
# ============================================================
CO2E_PER_KG_FOOD_WASTE = 2.5  # kg CO2-equivalent avoided per kg food redistributed
MEALS_PER_KG = 2.5  # rough conversion used by several food-rescue orgs
FOOD_VALUATION_PER_KG = 2.20  # USD / ₹180 average commercial fair market value per kg
TAX_DEDUCTION_RATE = 0.50     # 50% CSR / Section 80G tax write-off benefit
LANDFILL_AVOIDANCE_PER_KG = 0.15 # Disposal fee avoidance savings per kg


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

    food_val = round(qty_donated * FOOD_VALUATION_PER_KG, 2)
    tax_relief = round(food_val * TAX_DEDUCTION_RATE, 2)
    landfill_saved = round(qty_donated * LANDFILL_AVOIDANCE_PER_KG, 2)
    total_fin = round(tax_relief + landfill_saved, 2)

    return schemas.BusinessAnalytics(
        total_inventory_items=len(items),
        high_risk_items=high_risk,
        total_listings=len(listings),
        completed_donations=len(completed),
        quantity_donated=round(qty_donated, 1),
        co2e_saved_kg=round(qty_donated * CO2E_PER_KG_FOOD_WASTE, 1),
        meals_redistributed=round(qty_donated * MEALS_PER_KG, 1),
        estimated_food_value=food_val,
        tax_deduction_benefit=tax_relief,
        landfill_fees_saved=landfill_saved,
        total_financial_impact=total_fin,
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

    # 2. Pickups & Food Rescued (with eager load)
    all_pickups = db.query(models.Pickup).options(
        joinedload(models.Pickup.listing).joinedload(models.Listing.business),
        joinedload(models.Pickup.ngo)
    ).all()
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

    # 4. Category Breakdown & Top Donors (Eager loaded in 1 query)
    categories = ["Cooked Meals", "Bread & Bakery", "Fruits & Veg", "Dairy", "Grains", "Packaged"]
    cat_map = {c: 0.0 for c in categories}
    donor_map = {}

    all_listings = db.query(models.Listing).options(joinedload(models.Listing.business)).all()
    for l in all_listings:
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

        b_name = l.business.org_name if l.business else "Food Donor"
        donor_map[b_name] = donor_map.get(b_name, 0.0) + (l.quantity or 0.0)

    category_breakdown = [
        schemas.CategoryRescueStat(category=c, quantity_kg=round(cat_map[c], 1))
        for c in categories
    ]

    top_donors = [
        schemas.TopDonorStat(donor_name=name, quantity_kg=round(qty, 1))
        for name, qty in sorted(donor_map.items(), key=lambda x: x[1], reverse=True)[:5]
    ]

    # 5. Recent Rescue Operations
    recent_ops = []
    recent_pickups = all_pickups[:10]
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

