"""
Fast High-Performance Database Migration Tool: Transfer full database to Neon
"""
import argparse
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import models
from database import Base, get_database_url


def migrate_data(source_url: str, target_url: str):
    print("\n" + "=" * 60)
    print(">> FOODWASTE PLATFORM - FAST DATABASE MIGRATION TOOL")
    print("=" * 60)
    
    if source_url.startswith("postgres://"):
        source_url = source_url.replace("postgres://", "postgresql://", 1)
    if target_url.startswith("postgres://"):
        target_url = target_url.replace("postgres://", "postgresql://", 1)

    print(f">> SOURCE: {source_url.split('@')[-1] if '@' in source_url else source_url}")
    print(f">> TARGET: {target_url.split('@')[-1] if '@' in target_url else target_url}\n")

    src_connect_args = {"check_same_thread": False} if source_url.startswith("sqlite") else {}
    src_engine = create_engine(source_url, connect_args=src_connect_args)
    SrcSession = sessionmaker(bind=src_engine)
    src_db = SrcSession()

    tgt_engine = create_engine(target_url, pool_pre_ping=True)
    print(">> Initializing schema on target...")
    Base.metadata.create_all(bind=tgt_engine)
    TgtSession = sessionmaker(bind=tgt_engine)
    tgt_db = TgtSession()

    total_records = 0

    try:
        # 1. Users
        print(">> Fetching Users from source...")
        src_users = src_db.query(models.User).all()
        existing_u_ids = set(r[0] for r in tgt_db.query(models.User.id).all())
        new_users = [
            models.User(
                id=u.id,
                email=u.email,
                hashed_password=u.hashed_password,
                org_name=u.org_name,
                role=u.role,
                address=u.address,
                created_at=u.created_at,
            )
            for u in src_users if u.id not in existing_u_ids
        ]
        if new_users:
            tgt_db.add_all(new_users)
            tgt_db.commit()
        print(f">> [OK] Migrated {len(new_users)} users (Total: {len(src_users)})")
        total_records += len(new_users)

        # 2. Inventory Items
        print(">> Fetching Inventory Items...")
        src_items = src_db.query(models.InventoryItem).all()
        existing_item_ids = set(r[0] for r in tgt_db.query(models.InventoryItem.id).all())
        new_items = [
            models.InventoryItem(
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
            for item in src_items if item.id not in existing_item_ids
        ]
        if new_items:
            tgt_db.add_all(new_items)
            tgt_db.commit()
        print(f">> [OK] Migrated {len(new_items)} inventory items (Total: {len(src_items)})")
        total_records += len(new_items)

        # 3. Listings
        print(">> Fetching Surplus Listings...")
        src_listings = src_db.query(models.Listing).all()
        existing_l_ids = set(r[0] for r in tgt_db.query(models.Listing.id).all())
        new_listings = [
            models.Listing(
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
            for l in src_listings if l.id not in existing_l_ids
        ]
        if new_listings:
            tgt_db.add_all(new_listings)
            tgt_db.commit()
        print(f">> [OK] Migrated {len(new_listings)} listings (Total: {len(src_listings)})")
        total_records += len(new_listings)

        # 4. Pickups
        print(">> Fetching Pickups...")
        src_pickups = src_db.query(models.Pickup).all()
        existing_p_ids = set(r[0] for r in tgt_db.query(models.Pickup.id).all())
        new_pickups = [
            models.Pickup(
                id=p.id,
                listing_id=p.listing_id,
                ngo_id=p.ngo_id,
                status=p.status,
                scheduled_time=p.scheduled_time,
                meals_estimate=p.meals_estimate,
                created_at=p.created_at,
            )
            for p in src_pickups if p.id not in existing_p_ids
        ]
        if new_pickups:
            tgt_db.add_all(new_pickups)
            tgt_db.commit()
        print(f">> [OK] Migrated {len(new_pickups)} pickups (Total: {len(src_pickups)})")
        total_records += len(new_pickups)

        # 5. Fix PostgreSQL Auto-Increment Sequences
        if not target_url.startswith("sqlite"):
            print(">> Syncing PostgreSQL auto-increment sequences...")
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
                    except Exception:
                        pass
            print(">> [OK] Sequences synchronized successfully.")

        print("\n" + "=" * 60)
        print(f">> SUCCESS! DATABASE MIGRATION COMPLETE ({total_records} records transferred)")
        print("=" * 60 + "\n")

    except Exception as e:
        tgt_db.rollback()
        print(f"\n>> [ERROR] Migration failed: {e}")
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
