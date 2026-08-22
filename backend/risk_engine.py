"""
AI-Based Waste Prediction Engine
--------------------------------
This module scores each inventory item's waste risk and recommends reorder
quantities, combining:
  - days-to-expiry (urgency)
  - current stock level vs. average daily usage (a demand-forecast proxy)

This heuristic model is intentionally dependency-light so the platform runs
out of the box. It mirrors the same inputs/outputs the project doc's
Prophet/LSTM demand-forecasting module would produce (a risk score 0-100 and
a reorder quantity), so it can be swapped later for a trained time-series
model without changing any API contract below.

To upgrade to real ML (per the original spec):
  1. Log daily sales/usage per item into a `usage_history` table.
  2. Train a Prophet or LSTM model per product category on that history.
  3. Replace `predicted_days_of_stock()` below with the model's forecast.
Everything else (risk formula, reorder formula, API) stays the same.
"""
from datetime import date


def days_to_expiry(expiry_date: date, today: date = None) -> int:
    today = today or date.today()
    return (expiry_date - today).days


def predicted_days_of_stock(quantity: float, avg_daily_usage: float) -> float:
    """Demand-forecast proxy: how many days current stock will last."""
    if avg_daily_usage <= 0:
        avg_daily_usage = 0.1
    return quantity / avg_daily_usage


def compute_risk_score(quantity: float, avg_daily_usage: float, expiry_date: date) -> float:
    """
    Returns a 0-100 waste risk score.
    High risk = item will expire before it's likely to be used up, and soon.
    """
    dte = days_to_expiry(expiry_date)
    stock_days = predicted_days_of_stock(quantity, avg_daily_usage)

    if dte <= 0:
        return 100.0

    # Overstock ratio: how much longer the stock will last vs. time left before expiry.
    overstock_ratio = stock_days / dte if dte > 0 else 10

    # Urgency component: closer expiry => higher base risk (decays over 14 days)
    urgency = max(0.0, 1 - (dte / 14)) * 60

    # Overstock component: if predicted stock-days exceed days-to-expiry, risk climbs
    overstock_component = min(1.0, max(0.0, overstock_ratio - 1)) * 40

    score = urgency + overstock_component
    return round(min(100.0, max(0.0, score)), 1)


def risk_level(score: float) -> str:
    if score >= 70:
        return "high"
    if score >= 40:
        return "medium"
    return "low"


def reorder_recommendation(quantity: float, avg_daily_usage: float, expiry_date: date) -> float:
    """
    Suggests an optimal purchase quantity: enough to cover ~7 days of demand
    beyond current expiry-safe stock, without adding to waste risk.
    """
    dte = days_to_expiry(expiry_date)
    stock_days = predicted_days_of_stock(quantity, avg_daily_usage)
    target_days = 7
    if stock_days >= dte:
        # Already overstocked relative to shelf life — don't reorder.
        return 0.0
    needed_days = max(0.0, target_days - stock_days)
    return round(needed_days * avg_daily_usage, 1)
