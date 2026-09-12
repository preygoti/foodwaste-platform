import csv
import os
import datetime
import math
import statistics
from collections import defaultdict, Counter

def parse_date(date_str: str) -> datetime.date:
    if not date_str:
        return datetime.date.today()
    try:
        if '-' in date_str:
            parts = date_str.split('-')
            if len(parts[0]) == 4:
                return datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
            elif len(parts[-1]) == 2:
                return datetime.datetime.strptime(date_str, '%d-%m-%y').date()
            elif len(parts[-1]) == 4:
                return datetime.datetime.strptime(date_str, '%d-%m-%Y').date()
    except Exception:
        pass
    return datetime.date.today()

PRODUCT_BENCHMARK_COSTS = {
    'Bread Loaves': 2.50,
    'Chicken Breast': 8.50,
    'Cheese Blocks': 5.00,
    'Bananas': 1.20,
    'Lettuce': 1.80,
    'Yogurt Cups': 1.50,
    'Orange Juice': 3.50,
    'Milk': 42.0,
    'Apples': 35.0,
    'Eggs': 7.0,
    'Verified Rice': 80.0,
    'Verified Wheat': 60.0,
}

CATEGORY_BENCHMARK_COSTS = {
    'Bakery': 2.50,
    'Dairy': 4.00,
    'Meat': 8.50,
    'Poultry': 6.00,
    'Vegetables': 2.00,
    'Fruits': 2.50,
    'Beverages': 3.50,
    'Grains': 5.00,
}

def get_effective_cost(product_name: str = '', category: str = '', direct_cost: float = 0.0) -> float:
    try:
        val = float(direct_cost or 0)
        if val > 0:
            return val
    except (ValueError, TypeError):
        pass
    if product_name in PRODUCT_BENCHMARK_COSTS:
        return PRODUCT_BENCHMARK_COSTS[product_name]
    if category in CATEGORY_BENCHMARK_COSTS:
        return CATEGORY_BENCHMARK_COSTS[category]
    return 2.50

class DemandForecaster:
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.daily_metrics = []
        self.sales = []
        self._load_data()

    def _load_data(self):
        daily_path = os.path.join(self.data_dir, 'daily_product_metrics.csv')
        sales_path = os.path.join(self.data_dir, 'sales.csv')

        if os.path.exists(daily_path):
            with open(daily_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    self.daily_metrics.append(row)
        
        if os.path.exists(sales_path):
            with open(sales_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    self.sales.append(row)

    def forecast(self, product_name: str = None, days_ahead: int = 7) -> dict:
        products = set([row['product_name'] for row in self.daily_metrics])
        if product_name:
            if product_name not in products:
                return {}
            products = {product_name}
            
        results = {}
        for p_name in products:
            p_data = [row for row in self.daily_metrics if row['product_name'] == p_name]
            p_data.sort(key=lambda x: parse_date(x['date']))
            
            if not p_data:
                continue
                
            category = p_data[0].get('category', 'Unknown')
            unit = p_data[0].get('unit', 'Unknown')
            
            weekend_sales = []
            weekday_sales = []
            for row in p_data:
                try:
                    qty = float(row.get('sales_quantity') or 0)
                except ValueError:
                    qty = 0
                is_weekend = str(row.get('is_weekend', '')).lower() == 'true'
                if is_weekend:
                    weekend_sales.append(qty)
                else:
                    weekday_sales.append(qty)
            
            avg_weekend = statistics.mean(weekend_sales) if weekend_sales else 0
            avg_weekday = statistics.mean(weekday_sales) if weekday_sales else 0
            weekend_multiplier = (avg_weekend / avg_weekday) if avg_weekday > 0 else 1.0
            
            alpha = 0.3
            ema = 0
            for i, row in enumerate(p_data):
                try:
                    qty = float(row.get('sales_quantity') or 0)
                except ValueError:
                    qty = 0
                if i == 0:
                    ema = qty
                else:
                    ema = alpha * qty + (1 - alpha) * ema
            
            avg_daily_demand = ema
            
            last_date_str = p_data[-1]['date']
            last_date = parse_date(last_date_str)
            
            forecast_list = []
            for i in range(1, days_ahead + 1):
                f_date = last_date + datetime.timedelta(days=i)
                f_is_weekend = f_date.weekday() >= 5
                pred_qty = avg_daily_demand
                if f_is_weekend:
                    pred_qty *= weekend_multiplier
                forecast_list.append({
                    'date': f_date.strftime('%Y-%m-%d'),
                    'predicted_qty': round(pred_qty, 2),
                    'confidence': 0.8
                })
            
            recent_data = p_data[-14:] if len(p_data) >= 14 else p_data
            if len(recent_data) > 1:
                recent_vals = []
                older_vals = []
                for r in recent_data:
                    try: recent_vals.append(float(r.get('sales_quantity') or 0))
                    except ValueError: recent_vals.append(0)
                for r in p_data[:-14]:
                    try: older_vals.append(float(r.get('sales_quantity') or 0))
                    except ValueError: older_vals.append(0)
                    
                recent_avg = statistics.mean(recent_vals) if recent_vals else 0
                older_avg = statistics.mean(older_vals) if older_vals else recent_avg
                
                if recent_avg > older_avg * 1.05:
                    trend = 'up'
                elif recent_avg < older_avg * 0.95:
                    trend = 'down'
                else:
                    trend = 'stable'
            else:
                trend = 'stable'
                
            results[p_name] = {
                'product_name': p_name,
                'category': category,
                'unit': unit,
                'daily_forecast': forecast_list,
                'avg_daily_demand': round(avg_daily_demand, 2),
                'trend': trend,
                'weekend_multiplier': round(weekend_multiplier, 2)
            }
            
        if product_name and product_name in results:
            return results[product_name]
        return results

class WastePredictor:
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.waste_events = []
        self.daily_metrics = []
        self._load_data()

    def _load_data(self):
        waste_path = os.path.join(self.data_dir, 'waste_events.csv')
        daily_path = os.path.join(self.data_dir, 'daily_product_metrics.csv')

        if os.path.exists(waste_path):
            with open(waste_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    self.waste_events.append(row)
        
        if os.path.exists(daily_path):
            with open(daily_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    self.daily_metrics.append(row)
                    
    def predict(self, product_name: str = None) -> dict:
        products = set([row['product_name'] for row in self.daily_metrics])
        
        product_id_map = {}
        for row in self.daily_metrics:
            product_id_map[row.get('product_id')] = row.get('product_name')
            
        if product_name:
            if product_name not in products:
                return {}
            products = {product_name}
            
        category_weights = {
            'Dairy': 0.9, 'Meat': 0.95, 'Poultry': 0.95, 'Vegetables': 0.85, 
            'Fruits': 0.8, 'Bakery': 0.75, 'Beverages': 0.4, 'Grains': 0.3
        }
            
        results = {}
        for p_name in products:
            p_data = [row for row in self.daily_metrics if row['product_name'] == p_name]
            p_data.sort(key=lambda x: parse_date(x['date']))
            if not p_data:
                continue
                
            category = p_data[0].get('category', 'Unknown')
            product_id = p_data[0].get('product_id')
            
            p_waste = [row for row in self.waste_events if product_id_map.get(row.get('product_id')) == p_name or row.get('product_id') == product_id]
            
            total_waste = 0
            for r in p_waste:
                try: total_waste += float(r.get('quantity_wasted') or 0)
                except ValueError: pass
                
            total_stock = 0
            for r in p_data:
                try: total_stock += float(r.get('opening_stock') or 0)
                except ValueError: pass
            
            waste_freq = min(len(p_waste) / 30.0, 1.0)
            waste_stock_ratio = (total_waste / total_stock) if total_stock > 0 else 0
            
            last_record = p_data[-1]
            try:
                days_to_expiry = float(last_record.get('days_to_expiry') or 10)
            except ValueError:
                days_to_expiry = 10
            expiry_urgency = max(0.0, (10 - days_to_expiry) / 10.0)
            
            cat_weight = category_weights.get(category, 0.5)
            
            norm_stock_ratio = min(waste_stock_ratio * 10, 1.0)
            risk_score = (waste_freq * 0.4) + (norm_stock_ratio * 0.3) + (expiry_urgency * 0.2) + (cat_weight * 0.1)
            risk_score = min(risk_score * 100, 100)
            
            reasons = Counter([r.get('waste_reason') for r in p_waste if r.get('waste_reason')])
            primary_reason = reasons.most_common(1)[0][0] if reasons else 'Unknown'
            
            if p_waste:
                p_waste.sort(key=lambda x: parse_date(x.get('waste_date', '')))
                last_waste_date = parse_date(p_waste[-1].get('waste_date', ''))
                current_date = parse_date(last_record.get('date'))
                days_since_last = (current_date - last_waste_date).days
                if days_since_last < 0: days_since_last = 0
            else:
                days_since_last = -1
                
            avg_waste_qty = total_waste / len(p_waste) if p_waste else 0
            try:
                closing_stock = float(last_record.get('closing_stock') or 0)
            except ValueError:
                closing_stock = 0
            predicted_waste = min(closing_stock, avg_waste_qty * (risk_score/100))
            
            try:
                rec_cost = float(last_record.get('unit_cost') or 0)
            except (ValueError, TypeError):
                rec_cost = 0.0
            effective_cost = get_effective_cost(p_name, category, rec_cost)
            financial_loss = predicted_waste * effective_cost
            
            if risk_score > 80: action = 'donate_now'
            elif risk_score > 60: action = 'discount'
            elif risk_score > 30: action = 'monitor'
            else: action = 'safe'
                
            results[p_name] = {
                'product_name': p_name,
                'category': category,
                'waste_risk_score': round(risk_score, 2),
                'waste_probability_pct': round(risk_score, 2),
                'predicted_waste_qty': round(predicted_waste, 2),
                'primary_waste_reason': primary_reason,
                'recommended_action': action,
                'days_since_last_waste': days_since_last,
                'historical_waste_total': round(total_waste, 2),
                'financial_loss_estimate': round(financial_loss, 2)
            }
            
        if product_name and product_name in results:
            return results[product_name]
        return results

def get_demand_forecast(data_dir: str, product_name: str = None, days_ahead: int = 7) -> dict:
    forecaster = DemandForecaster(data_dir)
    raw = forecaster.forecast(product_name, days_ahead)
    # If single product was requested, raw is a single dict
    if product_name and isinstance(raw, dict) and 'product_name' in raw:
        forecasts = [raw]
    elif isinstance(raw, dict):
        forecasts = list(raw.values())
    else:
        forecasts = []
    return {
        "days_ahead": days_ahead,
        "forecasts": forecasts,
    }


def get_waste_predictions(data_dir: str, product_name: str = None) -> dict:
    predictor = WastePredictor(data_dir)
    raw = predictor.predict(product_name)
    if product_name and isinstance(raw, dict) and 'product_name' in raw:
        predictions = [raw]
    elif isinstance(raw, dict):
        predictions = list(raw.values())
    else:
        predictions = []
    high_risk = sum(1 for p in predictions if p.get('waste_risk_score', 0) > 70)
    total_loss = sum(p.get('financial_loss_estimate', 0) for p in predictions)
    return {
        "predictions": predictions,
        "high_risk_count": high_risk,
        "total_predicted_loss": round(total_loss, 2),
    }


def get_financial_overview(data_dir: str) -> dict:
    daily_path = os.path.join(data_dir, 'daily_product_metrics.csv')
    sales_path = os.path.join(data_dir, 'sales.csv')
    purchases_path = os.path.join(data_dir, 'purchases.csv')
    waste_path = os.path.join(data_dir, 'waste_events.csv')

    total_revenue = 0.0
    total_purchase_cost = 0.0
    total_waste_loss = 0.0
    cat_data = defaultdict(lambda: {"revenue": 0.0, "cost": 0.0, "waste_loss": 0.0})

    # Revenue from sales.csv (quantity_sold * unit_price)
    product_categories = {}
    if os.path.exists(daily_path):
        with open(daily_path, 'r', encoding='utf-8') as f:
            for row in csv.DictReader(f):
                product_categories[row.get('product_id', '')] = row.get('category', 'Unknown')

    if os.path.exists(sales_path):
        with open(sales_path, 'r', encoding='utf-8') as f:
            for row in csv.DictReader(f):
                try:
                    qty = float(row.get('quantity_sold') or 0)
                    price = float(row.get('unit_price') or 0)
                except ValueError:
                    continue
                rev = qty * price
                total_revenue += rev
                cat = product_categories.get(row.get('product_id', ''), 'Unknown')
                cat_data[cat]["revenue"] += rev

    # Cost from purchases.csv (quantity_received * unit_cost)
    if os.path.exists(purchases_path):
        with open(purchases_path, 'r', encoding='utf-8') as f:
            for row in csv.DictReader(f):
                try:
                    qty = float(row.get('quantity_received') or 0)
                    cost = float(row.get('unit_cost') or 0)
                except ValueError:
                    continue
                c = qty * cost
                total_purchase_cost += c
                cat = product_categories.get(row.get('product_id', ''), 'Unknown')
                cat_data[cat]["cost"] += c

    # Waste loss from waste_events.csv (quantity_wasted * unit_cost)
    if os.path.exists(waste_path):
        with open(waste_path, 'r', encoding='utf-8') as f:
            for row in csv.DictReader(f):
                try:
                    qty = float(row.get('quantity_wasted') or 0)
                    cost = float(row.get('unit_cost') or 0)
                except ValueError:
                    continue
                w = qty * cost
                total_waste_loss += w
                cat = product_categories.get(row.get('product_id', ''), 'Unknown')
                cat_data[cat]["waste_loss"] += w

    gross_margin = total_revenue - total_purchase_cost - total_waste_loss
    gross_margin_pct = (gross_margin / total_revenue * 100) if total_revenue > 0 else 0.0

    by_category = []
    for cat, vals in sorted(cat_data.items()):
        margin = vals["revenue"] - vals["cost"] - vals["waste_loss"]
        by_category.append({
            "category": cat,
            "revenue": round(vals["revenue"], 2),
            "cost": round(vals["cost"], 2),
            "waste_loss": round(vals["waste_loss"], 2),
            "margin": round(margin, 2),
        })

    return {
        "total_revenue": round(total_revenue, 2),
        "total_purchase_cost": round(total_purchase_cost, 2),
        "total_waste_loss": round(total_waste_loss, 2),
        "gross_margin": round(gross_margin, 2),
        "gross_margin_pct": round(gross_margin_pct, 1),
        "by_category": by_category,
    }


def get_sales_trends(data_dir: str, granularity: str = 'daily') -> dict:
    sales_path = os.path.join(data_dir, 'sales.csv')
    period_data = defaultdict(lambda: {"total_quantity": 0.0, "total_revenue": 0.0, "categories": defaultdict(float)})
    total_revenue = 0.0
    total_quantity = 0.0
    product_sales = defaultdict(float)

    # Build product_id -> category map from daily metrics
    daily_path = os.path.join(data_dir, 'daily_product_metrics.csv')
    pid_to_cat = {}
    pid_to_name = {}
    if os.path.exists(daily_path):
        with open(daily_path, 'r', encoding='utf-8') as f:
            for row in csv.DictReader(f):
                pid_to_cat[row.get('product_id', '')] = row.get('category', 'Unknown')
                pid_to_name[row.get('product_id', '')] = row.get('product_name', 'Unknown')

    if os.path.exists(sales_path):
        with open(sales_path, 'r', encoding='utf-8') as f:
            for row in csv.DictReader(f):
                d = parse_date(row.get('date', ''))
                try:
                    qty = float(row.get('quantity_sold') or 0)
                    price = float(row.get('unit_price') or 0)
                except ValueError:
                    continue
                rev = qty * price
                total_revenue += rev
                total_quantity += qty

                pid = row.get('product_id', '')
                pname = pid_to_name.get(pid, 'Unknown')
                product_sales[pname] += rev
                cat = pid_to_cat.get(pid, 'Unknown')

                if granularity == 'weekly':
                    key = f"{d.isocalendar()[0]}-W{d.isocalendar()[1]:02d}"
                elif granularity == 'monthly':
                    key = d.strftime('%Y-%m')
                else:
                    key = d.strftime('%Y-%m-%d')

                period_data[key]["total_quantity"] += qty
                period_data[key]["total_revenue"] += rev
                period_data[key]["categories"][cat] += rev

    trends = []
    for period in sorted(period_data.keys()):
        pd_item = period_data[period]
        trends.append({
            "period": period,
            "total_quantity": round(pd_item["total_quantity"], 2),
            "total_revenue": round(pd_item["total_revenue"], 2),
            "categories": {k: round(v, 2) for k, v in pd_item["categories"].items()},
        })

    top_product = max(product_sales, key=product_sales.get) if product_sales else None

    return {
        "granularity": granularity,
        "trends": trends,
        "total_revenue": round(total_revenue, 2),
        "total_quantity": round(total_quantity, 2),
        "top_product": top_product,
    }


def get_waste_analysis(data_dir: str) -> dict:
    waste_path = os.path.join(data_dir, 'waste_events.csv')
    daily_path = os.path.join(data_dir, 'daily_product_metrics.csv')

    # Map product_id to product_name/category
    pid_to_name = {}
    pid_to_cat = {}
    pid_to_unit = {}
    if os.path.exists(daily_path):
        with open(daily_path, 'r', encoding='utf-8') as f:
            for row in csv.DictReader(f):
                pid_to_name[row.get('product_id', '')] = row.get('product_name', 'Unknown')
                pid_to_cat[row.get('product_id', '')] = row.get('category', 'Unknown')
                pid_to_unit[row.get('product_id', '')] = row.get('unit', 'kg')

    reason_agg = defaultdict(lambda: {"quantity": 0.0, "financial_loss": 0.0})
    product_agg = defaultdict(lambda: {"total_wasted": 0.0, "financial_loss": 0.0, "reasons": Counter()})
    daily_agg = defaultdict(lambda: {"quantity": 0.0, "loss": 0.0})
    total_waste_quantity = 0.0
    total_financial_loss = 0.0

    if os.path.exists(waste_path):
        with open(waste_path, 'r', encoding='utf-8') as f:
            for row in csv.DictReader(f):
                try:
                    qty = float(row.get('quantity_wasted') or 0)
                    cost = float(row.get('unit_cost') or 0)
                except ValueError:
                    continue
                pid = row.get('product_id', '')
                pname = pid_to_name.get(pid, pid[:8])
                cat = pid_to_cat.get(pid, 'Unknown')
                effective_cost = get_effective_cost(pname, cat, cost)
                loss = qty * effective_cost
                reason = row.get('waste_reason', 'Unknown')
                d = parse_date(row.get('waste_date', '')).strftime('%Y-%m-%d')

                total_waste_quantity += qty
                total_financial_loss += loss
                reason_agg[reason]["quantity"] += qty
                reason_agg[reason]["financial_loss"] += loss
                product_agg[pname]["total_wasted"] += qty
                product_agg[pname]["financial_loss"] += loss
                product_agg[pname]["reasons"][reason] += 1
                daily_agg[d]["quantity"] += qty
                daily_agg[d]["loss"] += loss

    by_reason = []
    for reason, vals in sorted(reason_agg.items()):
        pct = (vals["quantity"] / total_waste_quantity * 100) if total_waste_quantity > 0 else 0
        by_reason.append({
            "reason": reason,
            "quantity": round(vals["quantity"], 2),
            "financial_loss": round(vals["financial_loss"], 2),
            "percentage": round(pct, 1),
        })

    by_product = []
    for pname, vals in sorted(product_agg.items(), key=lambda x: -x[1]["total_wasted"]):
        primary = vals["reasons"].most_common(1)[0][0] if vals["reasons"] else "Unknown"
        pid_match = [k for k, v in pid_to_name.items() if v == pname]
        cat = pid_to_cat.get(pid_match[0], 'Unknown') if pid_match else 'Unknown'
        unit = pid_to_unit.get(pid_match[0], 'kg') if pid_match else 'kg'
        by_product.append({
            "product_name": pname,
            "category": cat,
            "total_wasted": round(vals["total_wasted"], 2),
            "unit": unit,
            "financial_loss": round(vals["financial_loss"], 2),
            "primary_reason": primary,
        })

    daily_trends = [{"date": d, "quantity": round(v["quantity"], 2), "loss": round(v["loss"], 2)}
                    for d, v in sorted(daily_agg.items())]

    return {
        "total_waste_quantity": round(total_waste_quantity, 2),
        "total_financial_loss": round(total_financial_loss, 2),
        "by_reason": by_reason,
        "by_product": by_product,
        "daily_trends": daily_trends,
    }


def get_purchase_summary(data_dir: str) -> dict:
    purch_path = os.path.join(data_dir, 'purchases.csv')
    supplier_agg = defaultdict(lambda: {"total_quantity": 0.0, "total_cost": 0.0, "order_count": 0})
    monthly_agg = defaultdict(lambda: {"quantity": 0.0, "cost": 0.0})
    total_quantity = 0.0
    total_cost = 0.0
    total_orders = 0

    if os.path.exists(purch_path):
        with open(purch_path, 'r', encoding='utf-8') as f:
            for row in csv.DictReader(f):
                try:
                    qty = float(row.get('quantity_received') or 0)
                    cost = float(row.get('unit_cost') or 0)
                except ValueError:
                    continue
                total_orders += 1
                amount = qty * cost
                total_quantity += qty
                total_cost += amount
                sup = row.get('supplier', 'Unknown')
                supplier_agg[sup]["total_quantity"] += qty
                supplier_agg[sup]["total_cost"] += amount
                supplier_agg[sup]["order_count"] += 1
                month = parse_date(row.get('purchase_date', '')).strftime('%Y-%m')
                monthly_agg[month]["quantity"] += qty
                monthly_agg[month]["cost"] += amount

    by_supplier = [{"supplier": s, "total_quantity": round(v["total_quantity"], 2),
                    "total_cost": round(v["total_cost"], 2), "order_count": v["order_count"]}
                   for s, v in sorted(supplier_agg.items(), key=lambda x: -x[1]["total_cost"])]

    monthly_trends = [{"month": m, "quantity": round(v["quantity"], 2), "cost": round(v["cost"], 2)}
                      for m, v in sorted(monthly_agg.items())]

    return {
        "total_quantity": round(total_quantity, 2),
        "total_cost": round(total_cost, 2),
        "total_orders": total_orders,
        "by_supplier": by_supplier,
        "monthly_trends": monthly_trends,
    }


def get_product_performance(data_dir: str) -> list:
    daily_path = os.path.join(data_dir, 'daily_product_metrics.csv')
    waste_path = os.path.join(data_dir, 'waste_events.csv')
    sales_path = os.path.join(data_dir, 'sales.csv')

    products = defaultdict(lambda: {
        "category": "Unknown", "unit": "kg", "total_sales_qty": 0.0, "total_revenue": 0.0,
        "total_waste_qty": 0.0, "days": 0, "product_id": "",
    })

    # Read daily metrics for product info and waste quantities
    if os.path.exists(daily_path):
        with open(daily_path, 'r', encoding='utf-8') as f:
            for row in csv.DictReader(f):
                pname = row.get('product_name', '')
                if not pname:
                    continue
                try:
                    sq = float(row.get('sales_quantity') or 0)
                    wq = float(row.get('waste_quantity') or 0)
                except ValueError:
                    continue
                products[pname]["category"] = row.get('category', 'Unknown')
                products[pname]["unit"] = row.get('unit', 'kg')
                products[pname]["product_id"] = row.get('product_id', '')
                products[pname]["total_sales_qty"] += sq
                products[pname]["total_waste_qty"] += wq
                products[pname]["days"] += 1

    # Read actual sales for revenue
    pid_to_name = {v["product_id"]: k for k, v in products.items() if v["product_id"]}
    if os.path.exists(sales_path):
        with open(sales_path, 'r', encoding='utf-8') as f:
            for row in csv.DictReader(f):
                pid = row.get('product_id', '')
                pname = pid_to_name.get(pid)
                if not pname:
                    continue
                try:
                    qty = float(row.get('quantity_sold') or 0)
                    price = float(row.get('unit_price') or 0)
                except ValueError:
                    continue
                products[pname]["total_revenue"] += qty * price

    result = []
    for pname, v in sorted(products.items()):
        total_throughput = v["total_sales_qty"] + v["total_waste_qty"]
        waste_rate = (v["total_waste_qty"] / total_throughput * 100) if total_throughput > 0 else 0
        avg_daily = v["total_sales_qty"] / v["days"] if v["days"] > 0 else 0
        # Profitability = revenue relative to waste. Higher score = better.
        prof_score = min(100, max(0, (1 - waste_rate / 100) * 100))

        if waste_rate > 15:
            risk = "high"
        elif waste_rate > 5:
            risk = "medium"
        else:
            risk = "low"

        result.append({
            "product_name": pname,
            "category": v["category"],
            "unit": v["unit"],
            "total_sales_qty": round(v["total_sales_qty"], 2),
            "total_revenue": round(v["total_revenue"], 2),
            "total_waste_qty": round(v["total_waste_qty"], 2),
            "waste_rate_pct": round(waste_rate, 2),
            "avg_daily_sales": round(avg_daily, 2),
            "profitability_score": round(prof_score, 2),
            "risk_level": risk,
        })

    return result


def get_inventory_health(data_dir: str) -> dict:
    daily_path = os.path.join(data_dir, 'daily_product_metrics.csv')
    latest = {}
    all_sales = defaultdict(list)

    if os.path.exists(daily_path):
        with open(daily_path, 'r', encoding='utf-8') as f:
            for row in csv.DictReader(f):
                pname = row.get('product_name')
                if not pname:
                    continue
                d = parse_date(row.get('date'))
                try:
                    stock = float(row.get('closing_stock') or 0)
                    dte = float(row.get('days_to_expiry') or 10)
                    sq = float(row.get('sales_quantity') or 0)
                    cost = float(row.get('unit_cost') or 0)
                except ValueError:
                    continue

                all_sales[pname].append(sq)

                if pname not in latest or d > latest[pname]['_date']:
                    latest[pname] = {
                        '_date': d,
                        'category': row.get('category', 'Unknown'),
                        'unit': row.get('unit', 'kg'),
                        'current_stock': stock,
                        'avg_days_to_expiry': dte,
                        'unit_cost': cost,
                    }

    products = []
    total_stock_value = 0.0
    stockout_risk_count = 0
    reorder_alert_count = 0

    for pname, info in sorted(latest.items()):
        info.pop('_date')
        avg_demand = statistics.mean(all_sales[pname]) if all_sales[pname] else 0
        days_remaining = (info['current_stock'] / avg_demand) if avg_demand > 0 else 999
        stockout = info['current_stock'] < avg_demand * 3  # Less than 3 days of stock
        reorder = info['current_stock'] < avg_demand * 5   # Less than 5 days of stock
        stock_val = info['current_stock'] * info.pop('unit_cost', 0)
        total_stock_value += stock_val

        if stockout:
            stockout_risk_count += 1
        if reorder:
            reorder_alert_count += 1

        products.append({
            "product_name": pname,
            "category": info['category'],
            "unit": info['unit'],
            "current_stock": round(info['current_stock'], 2),
            "avg_days_to_expiry": round(info['avg_days_to_expiry'], 1),
            "stockout_risk": stockout,
            "reorder_alert": reorder,
            "avg_daily_demand": round(avg_demand, 2),
            "days_of_stock_remaining": round(days_remaining, 1),
        })

    return {
        "products": products,
        "total_stock_value": round(total_stock_value, 2),
        "stockout_risk_count": stockout_risk_count,
        "reorder_alert_count": reorder_alert_count,
    }

