from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def ensure_postgresql_reservation_constraints() -> None:
    if not settings.DATABASE_URL.startswith("postgresql"):
        return

    constraint_name = "ex_reservations_no_active_overlap"
    with engine.begin() as connection:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS btree_gist"))
        connection.execute(text(f"""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_constraint
                        WHERE conname = '{constraint_name}'
                    ) THEN
                        ALTER TABLE reservations
                        ADD CONSTRAINT {constraint_name}
                        EXCLUDE USING gist (
                            resource_id WITH =,
                            tsrange(start_time, end_time, '[)') WITH &&
                        )
                        WHERE (status = 'active');
                    END IF;
                END $$;
                """))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
