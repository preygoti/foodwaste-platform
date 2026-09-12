import enum
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Float, Date, DateTime, ForeignKey, Enum, Text, Boolean
)
from sqlalchemy.orm import relationship
from database import Base


class UserRole(str, enum.Enum):
    business = "business"
    ngo = "ngo"


class ListingStatus(str, enum.Enum):
    available = "available"
    matched = "matched"
    completed = "completed"
    expired = "expired"


class PickupStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    picked_up = "picked_up"
    cancelled = "cancelled"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    org_name = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    address = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    inventory_items = relationship("InventoryItem", back_populates="business", cascade="all, delete-orphan")
    listings = relationship("Listing", back_populates="business", cascade="all, delete-orphan")
    pickups = relationship("Pickup", back_populates="ngo", cascade="all, delete-orphan")


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    category = Column(String, default="general")  # produce, dairy, bakery, prepared, canned, frozen, grains, packaged
    quantity = Column(Float, nullable=False)
    unit = Column(String, default="kg")
    purchase_date = Column(Date, default=date.today)
    expiry_date = Column(Date, nullable=False)
    storage_location = Column(String, default="")
    avg_daily_usage = Column(Float, default=1.0)  # used by the risk engine as a demand proxy
    created_at = Column(DateTime, default=datetime.utcnow)

    business = relationship("User", back_populates="inventory_items")


class Listing(Base):
    __tablename__ = "listings"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    inventory_item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=True)
    title = Column(String, nullable=False)
    category = Column(String, default="general")
    quantity = Column(Float, nullable=False)
    unit = Column(String, default="kg")
    expiry_date = Column(Date, nullable=False)
    pickup_location = Column(String, nullable=False)
    pickup_window_start = Column(DateTime, nullable=True)
    pickup_window_end = Column(DateTime, nullable=True)
    status = Column(Enum(ListingStatus), default=ListingStatus.available)
    notes = Column(Text, default="")
    verification_code = Column(String, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    business = relationship("User", back_populates="listings")
    pickups = relationship("Pickup", back_populates="listing", cascade="all, delete-orphan")


class Pickup(Base):
    __tablename__ = "pickups"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id"), nullable=False)
    ngo_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(PickupStatus), default=PickupStatus.pending)
    scheduled_time = Column(DateTime, nullable=True)
    meals_estimate = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    listing = relationship("Listing", back_populates="pickups")
    ngo = relationship("User", back_populates="pickups")


class PasswordResetOTP(Base):
    __tablename__ = "password_reset_otps"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    hashed_otp = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class RegistrationOTP(Base):
    __tablename__ = "registration_otps"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    hashed_otp = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


# ---------- Analytics Data Tables ----------

class DailyProductMetric(Base):
    __tablename__ = "daily_product_metrics"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    organization_id = Column(String, nullable=False)
    product_id = Column(String, nullable=False)
    location_id = Column(String, default="")
    product_name = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False)
    unit = Column(String, default="kg")
    opening_stock = Column(Float, default=0.0)
    purchase_quantity = Column(Float, default=0.0)
    sales_quantity = Column(Float, default=0.0)
    waste_quantity = Column(Float, default=0.0)
    donation_quantity = Column(Float, default=0.0)
    closing_stock = Column(Float, default=0.0)
    stockout_flag = Column(Boolean, default=False)
    days_to_expiry = Column(Integer, default=0)
    unit_cost = Column(Float, default=0.0)
    promotion_flag = Column(Boolean, default=False)
    is_weekend = Column(Boolean, default=False)
    is_holiday = Column(Boolean, default=False)


class SaleRecord(Base):
    __tablename__ = "sale_records"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(String, unique=True, nullable=False)
    date = Column(Date, nullable=False)
    organization_id = Column(String, nullable=False)
    product_id = Column(String, nullable=False)
    location_id = Column(String, default="")
    quantity_sold = Column(Float, nullable=False)
    unit = Column(String, default="kg")
    unit_price = Column(Float, default=0.0)
    promotion_flag = Column(Boolean, default=False)


class WasteEventRecord(Base):
    __tablename__ = "waste_events"

    id = Column(Integer, primary_key=True, index=True)
    waste_id = Column(String, unique=True, nullable=False)
    waste_date = Column(Date, nullable=False)
    organization_id = Column(String, nullable=False)
    product_id = Column(String, nullable=False)
    batch_id = Column(String, default="")
    location_id = Column(String, default="")
    quantity_wasted = Column(Float, nullable=False)
    unit = Column(String, default="kg")
    waste_reason = Column(String, nullable=False)  # SPOILED or EXPIRED
    unit_cost = Column(Float, default=0.0)


class PurchaseRecord(Base):
    __tablename__ = "purchase_records"

    id = Column(Integer, primary_key=True, index=True)
    purchase_id = Column(String, unique=True, nullable=False)
    purchase_date = Column(Date, nullable=False)
    received_date = Column(Date, nullable=True)
    organization_id = Column(String, nullable=False)
    product_id = Column(String, nullable=False)
    batch_id = Column(String, default="")
    quantity_received = Column(Float, nullable=False)
    unit_cost = Column(Float, default=0.0)
    supplier = Column(String, default="Unknown")
