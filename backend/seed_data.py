import os
import csv
from datetime import datetime
from database import engine, SessionLocal, Base
from models import DailyProductMetric, SaleRecord, WasteEventRecord, PurchaseRecord

def parse_date_ddmmyy(date_str):
    if not date_str:
        return None
    return datetime.strptime(date_str, '%d-%m-%y').date()

def parse_date_yyyymmdd(date_str):
    if not date_str:
        return None
    return datetime.strptime(date_str, '%Y-%m-%d').date()

def parse_boolean(bool_str):
    if not bool_str:
        return False
    return bool_str.strip().lower() == 'true'

def parse_float(val):
    if not val:
        return 0.0
    try:
        return float(val)
    except ValueError:
        return 0.0

def parse_int(val):
    if not val:
        return 0
    try:
        return int(float(val))
    except ValueError:
        return 0

def seed_all(db_session=None):
    Base.metadata.create_all(bind=engine)
    
    db = db_session if db_session else SessionLocal()
    
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    
    try:
        # Seed DailyProductMetric
        metrics_file = os.path.join(data_dir, 'daily_product_metrics.csv')
        if os.path.exists(metrics_file):
            if db.query(DailyProductMetric).first() is None:
                print(f"Seeding DailyProductMetric from {metrics_file}...")
                metrics = []
                with open(metrics_file, mode='r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        metrics.append(DailyProductMetric(
                            date=parse_date_ddmmyy(row.get('date')),
                            organization_id=row.get('organization_id'),
                            product_id=row.get('product_id'),
                            location_id=row.get('location_id', ''),
                            product_name=row.get('product_name'),
                            category=row.get('category'),
                            unit=row.get('unit', 'kg'),
                            opening_stock=parse_float(row.get('opening_stock')),
                            purchase_quantity=parse_float(row.get('purchase_quantity')),
                            sales_quantity=parse_float(row.get('sales_quantity')),
                            waste_quantity=parse_float(row.get('waste_quantity')),
                            donation_quantity=parse_float(row.get('donation_quantity')),
                            closing_stock=parse_float(row.get('closing_stock')),
                            stockout_flag=parse_boolean(row.get('stockout_flag')),
                            days_to_expiry=parse_int(row.get('days_to_expiry')),
                            unit_cost=parse_float(row.get('unit_cost')),
                            promotion_flag=parse_boolean(row.get('promotion_flag')),
                            is_weekend=parse_boolean(row.get('is_weekend')),
                            is_holiday=parse_boolean(row.get('is_holiday'))
                        ))
                db.bulk_save_objects(metrics)
                db.commit()
                print(f"Successfully seeded {len(metrics)} DailyProductMetric records.")
            else:
                print("DailyProductMetric table already has data. Skipping.")
        else:
            print(f"File not found: {metrics_file}")
            
        # Seed SaleRecord
        sales_file = os.path.join(data_dir, 'sales.csv')
        if os.path.exists(sales_file):
            if db.query(SaleRecord).first() is None:
                print(f"Seeding SaleRecord from {sales_file}...")
                sales = []
                with open(sales_file, mode='r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        sales.append(SaleRecord(
                            sale_id=row.get('sale_id'),
                            date=parse_date_yyyymmdd(row.get('date')),
                            organization_id=row.get('organization_id'),
                            product_id=row.get('product_id'),
                            location_id=row.get('location_id', ''),
                            quantity_sold=parse_float(row.get('quantity_sold')),
                            unit=row.get('unit', 'kg'),
                            unit_price=parse_float(row.get('unit_price')),
                            promotion_flag=parse_boolean(row.get('promotion_flag'))
                        ))
                db.bulk_save_objects(sales)
                db.commit()
                print(f"Successfully seeded {len(sales)} SaleRecord records.")
            else:
                print("SaleRecord table already has data. Skipping.")
        else:
            print(f"File not found: {sales_file}")
            
        # Seed WasteEventRecord
        waste_file = os.path.join(data_dir, 'waste_events.csv')
        if os.path.exists(waste_file):
            if db.query(WasteEventRecord).first() is None:
                print(f"Seeding WasteEventRecord from {waste_file}...")
                wastes = []
                with open(waste_file, mode='r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        wastes.append(WasteEventRecord(
                            waste_id=row.get('waste_id'),
                            waste_date=parse_date_yyyymmdd(row.get('waste_date')),
                            organization_id=row.get('organization_id'),
                            product_id=row.get('product_id'),
                            batch_id=row.get('batch_id', ''),
                            location_id=row.get('location_id', ''),
                            quantity_wasted=parse_float(row.get('quantity_wasted')),
                            unit=row.get('unit', 'kg'),
                            waste_reason=row.get('waste_reason'),
                            unit_cost=parse_float(row.get('unit_cost'))
                        ))
                db.bulk_save_objects(wastes)
                db.commit()
                print(f"Successfully seeded {len(wastes)} WasteEventRecord records.")
            else:
                print("WasteEventRecord table already has data. Skipping.")
        else:
            print(f"File not found: {waste_file}")
            
        # Seed PurchaseRecord
        purchases_file = os.path.join(data_dir, 'purchases.csv')
        if os.path.exists(purchases_file):
            if db.query(PurchaseRecord).first() is None:
                print(f"Seeding PurchaseRecord from {purchases_file}...")
                purchases = []
                with open(purchases_file, mode='r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        purchases.append(PurchaseRecord(
                            purchase_id=row.get('purchase_id'),
                            purchase_date=parse_date_yyyymmdd(row.get('purchase_date')),
                            received_date=parse_date_yyyymmdd(row.get('received_date')),
                            organization_id=row.get('organization_id'),
                            product_id=row.get('product_id'),
                            batch_id=row.get('batch_id', ''),
                            quantity_received=parse_float(row.get('quantity_received')),
                            unit_cost=parse_float(row.get('unit_cost')),
                            supplier=row.get('supplier', 'Unknown')
                        ))
                db.bulk_save_objects(purchases)
                db.commit()
                print(f"Successfully seeded {len(purchases)} PurchaseRecord records.")
            else:
                print("PurchaseRecord table already has data. Skipping.")
        else:
            print(f"File not found: {purchases_file}")
            
    except Exception as e:
        print(f"An error occurred during seeding: {e}")
        db.rollback()
    finally:
        if not db_session:
            db.close()

if __name__ == '__main__':
    seed_all()
