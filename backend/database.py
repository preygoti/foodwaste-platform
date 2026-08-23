import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


def get_database_url() -> str:
    """
    Retrieves and normalizes the database connection URL.
    - If DATABASE_URL environment variable is set and non-empty:
        - Normalizes legacy 'postgres://' URI schemes (Render/Heroku standard) to 'postgresql://' for SQLAlchemy.
        - Returns the normalized PostgreSQL URL.
    - Otherwise falls back to local SQLite ('sqlite:///./foodwaste.db').
    """
    raw_url = os.getenv("DATABASE_URL", "").strip()
    if not raw_url:
        return "sqlite:///./foodwaste.db"

    # Render provisions Postgres URLs with legacy postgres:// scheme, normalize to postgresql://
    if raw_url.startswith("postgres://"):
        return raw_url.replace("postgres://", "postgresql://", 1)

    return raw_url


def create_db_engine(database_url: str):
    """
    Creates an appropriate SQLAlchemy engine based on the database driver:
    - SQLite: passes connect_args={'check_same_thread': False}
    - PostgreSQL: configures pool_pre_ping=True and pool_recycle for robust connection recovery.
    """
    if database_url.startswith("sqlite"):
        return create_engine(database_url, connect_args={"check_same_thread": False})

    return create_engine(
        database_url,
        pool_pre_ping=True,  # Automatically tests and reconnects dropped connections
        pool_recycle=300,    # Recycles connections every 5 minutes to avoid idle timeouts
    )


DATABASE_URL = get_database_url()
engine = create_db_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
