from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr


# ---------- Auth ----------
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    org_name: str
    role: str  # "business" | "ngo"
    address: Optional[str] = ""


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    org_name: str
    role: str
    address: str

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Inventory ----------
class InventoryCreate(BaseModel):
    name: str
    category: str = "general"
    quantity: float
    unit: str = "kg"
    purchase_date: Optional[date] = None
    expiry_date: date
    storage_location: Optional[str] = ""
    avg_daily_usage: Optional[float] = 1.0


class InventoryUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    expiry_date: Optional[date] = None
    storage_location: Optional[str] = None
    avg_daily_usage: Optional[float] = None


class InventoryOut(BaseModel):
    id: int
    name: str
    category: str
    quantity: float
    unit: str
    purchase_date: date
    expiry_date: date
    storage_location: str
    avg_daily_usage: float
    days_to_expiry: int
    risk_score: float
    risk_level: str
    reorder_recommendation: float

    class Config:
        from_attributes = True


# ---------- Listings ----------
class ListingCreate(BaseModel):
    inventory_item_id: Optional[int] = None
    title: str
    category: str = "general"
    quantity: float
    unit: str = "kg"
    expiry_date: date
    pickup_location: str
    pickup_window_start: Optional[datetime] = None
    pickup_window_end: Optional[datetime] = None
    notes: Optional[str] = ""


class ListingOut(BaseModel):
    id: int
    business_id: int
    business_name: Optional[str] = None
    title: str
    category: str
    quantity: float
    unit: str
    expiry_date: date
    pickup_location: str
    pickup_window_start: Optional[datetime]
    pickup_window_end: Optional[datetime]
    status: str
    notes: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Pickups ----------
class PickupCreate(BaseModel):
    listing_id: int
    scheduled_time: Optional[datetime] = None
    meals_estimate: Optional[float] = 0.0


class PickupUpdate(BaseModel):
    status: Optional[str] = None
    scheduled_time: Optional[datetime] = None
    meals_estimate: Optional[float] = None


class PickupOut(BaseModel):
    id: int
    listing_id: int
    ngo_id: int
    ngo_name: Optional[str] = None
    status: str
    scheduled_time: Optional[datetime]
    meals_estimate: float
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Analytics ----------
class BusinessAnalytics(BaseModel):
    total_inventory_items: int
    high_risk_items: int
    total_listings: int
    completed_donations: int
    quantity_donated: float
    co2e_saved_kg: float
    meals_redistributed: float


class NgoAnalytics(BaseModel):
    total_pickups: int
    completed_pickups: int
    meals_received: float
    active_listings_nearby: int
