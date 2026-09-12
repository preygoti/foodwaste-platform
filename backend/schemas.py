from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr


# ---------- Auth ----------
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    org_name: str
    role: str  # "business" | "ngo"
    address: Optional[str] = ""
    otp: Optional[str] = None


class SendRegistrationOtpRequest(BaseModel):
    email: EmailStr


class SendRegistrationOtpResponse(BaseModel):
    message: str
    email: EmailStr
    debug_otp: Optional[str] = None


class VerifyRegistrationOtpRequest(BaseModel):
    email: EmailStr
    otp: str


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


# ---------- Password Reset & OTP ----------
class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str


class ForgotPasswordResponse(BaseModel):
    message: str
    email: EmailStr
    debug_otp: Optional[str] = None


class GenericResponse(BaseModel):
    status: str
    message: str


# ---------- Inventory ----------
class InventoryCreate(BaseModel):
    name: str
    category: Optional[str] = "general"
    quantity: float
    unit: Optional[str] = "kg"
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
    verification_code: Optional[str] = None
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
    listing_title: Optional[str] = None
    listing_category: Optional[str] = None
    listing_quantity: Optional[float] = None
    listing_unit: Optional[str] = None
    pickup_location: Optional[str] = None
    verification_code: Optional[str] = None
    ngo_id: int
    ngo_name: Optional[str] = None
    status: str
    scheduled_time: Optional[datetime]
    meals_estimate: float
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Analytics & Food Rescue Dashboard ----------
class BusinessAnalytics(BaseModel):
    total_inventory_items: int
    high_risk_items: int
    total_listings: int
    completed_donations: int
    quantity_donated: float
    co2e_saved_kg: float
    meals_redistributed: float
    estimated_food_value: float = 0.0
    tax_deduction_benefit: float = 0.0
    landfill_fees_saved: float = 0.0
    total_financial_impact: float = 0.0


class NgoAnalytics(BaseModel):
    total_pickups: int
    completed_pickups: int
    meals_received: float
    active_listings_nearby: int


class CategoryRescueStat(BaseModel):
    category: str
    quantity_kg: float


class TopDonorStat(BaseModel):
    donor_name: str
    quantity_kg: float


class RescueOperationItem(BaseModel):
    id: int
    listing_code: str
    donor: str
    food_type: str
    quantity: float
    unit: str
    ngo_assigned: str
    status: str
    scheduled_time: Optional[datetime] = None


class FoodRescueDashboardOut(BaseModel):
    listings_active: int
    food_rescued_kg: float
    co2_prevented_kg: float
    ngos_active: int
    category_breakdown: List[CategoryRescueStat]
    top_donors: List[TopDonorStat]
    recent_rescue_operations: List[RescueOperationItem]


# ---------- AI Freshness Quality Inspector ----------
class FreshnessInspectionRequest(BaseModel):
    image_base64: Optional[str] = None
    item_hint: Optional[str] = None


class FreshnessInspectionResponse(BaseModel):
    detected_name: str
    detected_category: str
    freshness_score: float
    freshness_grade: str
    estimated_days_to_expiry: int
    estimated_expiry_date: str
    suggested_storage: str
    estimated_quantity: float
    unit: str
    confidence: float
    quality_notes: str
    storage_pro_tip: Optional[str] = None
    spoilage_risk: Optional[str] = None
    nutritional_profile: Optional[str] = None
    dietary_flags: Optional[List[str]] = None
    zero_waste_recipe: Optional[str] = None
    carbon_impact_saved: Optional[str] = None
    alternatives: Optional[List[Dict[str, Any]]] = None


# ---------- QR Code Handshake Verification ----------
class QrHandshakeRequest(BaseModel):
    pickup_id: Optional[int] = None
    handshake_token: Optional[str] = None
    code: Optional[str] = None
    verification_code: Optional[str] = None


class QrPinVerificationRequest(BaseModel):
    code: str
    pickup_id: Optional[int] = None


class QrHandshakeResponse(BaseModel):
    status: str
    message: str
    pickup_id: int
    listing_title: str
    ngo_name: str
    quantity: float
    unit: str
    verified_at: str
    co2_saved_kg: float
    meals_provided: float
    verification_code: Optional[str] = None


# ---------- Data Analytics Dashboard ----------

class SalesTrendPoint(BaseModel):
    period: str
    total_quantity: float
    total_revenue: float
    categories: Optional[Dict[str, float]] = None

class SalesTrendsResponse(BaseModel):
    granularity: str
    trends: List[SalesTrendPoint]
    total_revenue: float
    total_quantity: float
    top_product: Optional[str] = None

class WasteByReason(BaseModel):
    reason: str
    quantity: float
    financial_loss: float
    percentage: float

class WasteByProduct(BaseModel):
    product_name: str
    category: str
    total_wasted: float
    unit: str
    financial_loss: float
    primary_reason: str

class WasteAnalysisResponse(BaseModel):
    total_waste_quantity: float
    total_financial_loss: float
    by_reason: List[WasteByReason]
    by_product: List[WasteByProduct]
    daily_trends: List[Dict[str, Any]]

class SupplierStat(BaseModel):
    supplier: str
    total_quantity: float
    total_cost: float
    order_count: int

class PurchaseSummaryResponse(BaseModel):
    total_quantity: float
    total_cost: float
    total_orders: int
    by_supplier: List[SupplierStat]
    monthly_trends: List[Dict[str, Any]]

class ProductPerformanceItem(BaseModel):
    product_name: str
    category: str
    unit: str
    total_sales_qty: float
    total_revenue: float
    total_waste_qty: float
    waste_rate_pct: float
    avg_daily_sales: float
    profitability_score: float
    risk_level: str

class FinancialOverviewResponse(BaseModel):
    total_revenue: float
    total_purchase_cost: float
    total_waste_loss: float
    gross_margin: float
    gross_margin_pct: float
    by_category: List[Dict[str, Any]]

class DemandForecastItem(BaseModel):
    date: str
    predicted_qty: float
    confidence: float

class ProductForecast(BaseModel):
    product_name: str
    category: str
    unit: str
    avg_daily_demand: float
    trend: str
    weekend_multiplier: float
    daily_forecast: List[DemandForecastItem]

class DemandForecastResponse(BaseModel):
    days_ahead: int
    forecasts: List[ProductForecast]

class WastePredictionItem(BaseModel):
    product_name: str
    category: str
    waste_risk_score: float
    waste_probability_pct: float
    predicted_waste_qty: float
    primary_waste_reason: str
    recommended_action: str
    days_since_last_waste: int
    historical_waste_total: float
    financial_loss_estimate: float

class WastePredictionResponse(BaseModel):
    predictions: List[WastePredictionItem]
    high_risk_count: int
    total_predicted_loss: float

class InventoryHealthItem(BaseModel):
    product_name: str
    category: str
    unit: str
    current_stock: float
    avg_days_to_expiry: float
    stockout_risk: bool
    reorder_alert: bool
    avg_daily_demand: float
    days_of_stock_remaining: float

class InventoryHealthResponse(BaseModel):
    products: List[InventoryHealthItem]
    total_stock_value: float
    stockout_risk_count: int
    reorder_alert_count: int


