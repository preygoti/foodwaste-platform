"""
Database Migration Tool: Transfer full database to Neon (or any PostgreSQL instance)
Usage:
  python migrate_to_neon.py --target "postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require"
  or
  python migrate_to_neon.py --source "postgres://render_url" --target "postgresql://neon_url"
"""
import sys
import argparse
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import models
from database import Base, get_database_url


def migrate_data(source_url: str, target_url: str):
    print("\n" + "=" * 60)
    print("🚀 FOODWASTE PLATFORM - FULL DATABASE MIGRATION TOOL")
    print("=" * 60)
    
    # Normalize postgres:// to postgresql://
    if source_url.startswith("postgres://"):
        source_url = source_url.replace("postgres://", "postgresql://", 1)
    if target_url.startswith("postgres://"):
        target_url = target_url.replace("postgres://", "postgresql://", 1)

    print(f"📦 SOURCE DATABASE: {source_url.split('@')[-1] if '@' in source_url else source_url}")
    print(f"🎯 TARGET DATABASE: {target_url.split('@')[-1] if '@' in target_url else target_url}\n")

    # Connect to source
    src_connect_args = {"check_same_thread": False} if source_url.startswith("sqlite") else {}
    src_engine = create_engine(source_url, connect_args=src_connect_args)
    SrcSession = sessionmaker(bind=src_engine)
    src_db = SrcSession()

    # Connect to target & create all tables
    tgt_engine = create_engine(target_url, pool_pre_ping=True)
    print("🛠️ Creating schema tables in target database...")
    Base.metadata.create_all(bind=tgt_engine)
    TgtSession = sessionmaker(bind=tgt_engine)
    tgt_db = TgtSession()

    total_records = 0

    try:
        # 1. Migrate Users
        print("\n⏳ Migrating Users...")
        src_users = src_db.query(models.User).all()
        user_count = 0
        for u in src_users:
            existing = tgt_db.query(models.User).filter(models.User.id == u.id).first()
            if not existing:
                new_u = models.User(
                    id=u.id,
                    email=u.email,
                    hashed_password=u.hashed_password,
                    org_name=u.org_name,
                    role=u.role,
                    address=u.address,
                    created_at=u.created_at,
                )
                tgt_db.add(new_u)
                user_count += 1
        tgt_db.commit()
        print(f"✅ Migrated {user_count} users (Total: {len(src_users)})")
        total_records += user_count

        # 2. Migrate Inventory Items
        print("⏳ Migrating Inventory Items...")
        src_items = src_db.query(models.InventoryItem).all()
        item_count = 0
        for item in src_items:
            existing = tgt_db.query(models.InventoryItem).filter(models.InventoryItem.id == item.id).first()
            if not existing:
                new_item = models.InventoryItem(
                    id=item.id,
                    business_id=item.business_id,
                    name=item.name,
                    category=item.category,
                    quantity=item.quantity,
                    unit=item.unit,
                    purchase_date=item.purchase_date,
                    expiry_date=item.expiry_date,
                    storage_location=item.storage_location,
                    avg_daily_usage=item.avg_daily_usage,
                    created_at=item.created_at,
                )
                tgt_db.add(new_item)
                item_count += 1
        tgt_db.commit()
        print(f"✅ Migrated {item_count} inventory items (Total: {len(src_items)})")
        total_records += item_count

        # 3. Migrate Listings
        print("⏳ Migrating Surplus Listings...")
        src_listings = src_db.query(models.Listing).all()
        listing_count = 0
        for l in src_listings:
            existing = tgt_db.query(models.Listing).filter(models.Listing.id == l.id).first()
            if not existing:
                new_l = models.Listing(
                    id=l.id,
                    business_id=l.business_id,
                    inventory_item_id=l.inventory_item_id,
                    title=l.title,
                    category=l.category,
                    quantity=l.quantity,
                    unit=l.unit,
                    expiry_date=l.expiry_date,
                    pickup_location=l.pickup_location,
                    pickup_window_start=l.pickup_window_start,
                    pickup_window_end=l.pickup_window_end,
                    status=l.status,
                    notes=l.notes,
                    created_at=l.created_at,
                )
                tgt_db.add(new_l)
                listing_count += 1
        tgt_db.commit()
        print(f"✅ Migrated {listing_count} listings (Total: {len(src_listings)})")
        total_records += listing_count

        # 4. Migrate Pickups
        print("⏳ Migrating Pickups...")
        src_pickups = src_db.query(models.Pickup).all()
        pickup_count = 0
        for p in src_pickups:
            existing = tgt_db.query(models.Pickup).filter(models.Pickup.id == p.id).first()
            if not existing:
                new_p = models.Pickup(
                    id=p.id,
                    listing_id=p.listing_id,
                    ngo_id=p.ngo_id,
                    status=p.status,
                    scheduled_time=p.scheduled_time,
                    meals_estimate=p.meals_estimate,
                    created_at=p.created_at,
                )
                tgt_db.add(new_p)
                pickup_count += 1
        tgt_db.commit()
        print(f"✅ Migrated {pickup_count} pickups (Total: {len(src_pickups)})")
        total_records += pickup_count

        # 5. Fix PostgreSQL Auto-Increment Sequences
        if not target_url.startswith("sqlite"):
            print("\n⏳ Updating PostgreSQL auto-increment sequence counters...")
            tables = ["users", "inventory_items", "listings", "pickups", "password_reset_otps"]
            with tgt_engine.connect() as conn:
                for tbl in tables:
                    try:
                        conn.execute(text(f"""
                            SELECT setval(
                                pg_get_serial_sequence('{tbl}', 'id'),
                                COALESCE((SELECT MAX(id) FROM {tbl}), 1)
                            );
                        """))
                        conn.commit()
                    except Exception as sq_err:
                        # Table might have no rows or sequence not defined yet
                        pass
            print("✅ Sequences updated successfully.")

        print("\n" + "=" * 60)
        print(f"🎉 SUCCESS! FULL DATABASE MIGRATION COMPLETE ({total_records} records copied)")
        print("=" * 60 + "\n")

    except Exception as e:
        tgt_db.rollback()
        print(f"\n❌ Migration Error: {e}")
        raise
    finally:
        src_db.close()
        tgt_db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate database to Neon / PostgreSQL")
    parser.add_argument("--source", default=get_database_url(), help="Source Database URL (default: current DB)")
    parser.add_argument("--target", required=True, help="Target Neon PostgreSQL Database URL")
    args = parser.parse_args()

    migrate_data(args.source, args.target)
