from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.user_model import User
from app.models.resource_model import Resource
from app.models.reservation_model import Reservation
from app.security import get_password_hash
from app.config import settings


def seed_data():
    db: Session = SessionLocal()
    try:
        admin_user = None
        employee_user = None
        if settings.SEED_ADMIN_EMAIL and settings.SEED_ADMIN_PASSWORD:
            admin_user = db.query(User).filter(User.email == settings.SEED_ADMIN_EMAIL).first()
            if not admin_user:
                admin_user = User(
                    email=settings.SEED_ADMIN_EMAIL,
                    hashed_password=get_password_hash(settings.SEED_ADMIN_PASSWORD),
                    name="Administrator",
                    surname="Systemu",
                    phone_number=settings.SEED_ADMIN_PHONE,
                    role="admin",
                    is_active=True,
                )
                db.add(admin_user)
        if settings.SEED_EMPLOYEE_EMAIL and settings.SEED_EMPLOYEE_PASSWORD:
            employee_user = db.query(User).filter(User.email == settings.SEED_EMPLOYEE_EMAIL).first()
            if not employee_user:
                employee_user = User(
                    email=settings.SEED_EMPLOYEE_EMAIL,
                    hashed_password=get_password_hash(settings.SEED_EMPLOYEE_PASSWORD),
                    name="Jan",
                    surname="Kowalski",
                    phone_number=settings.SEED_EMPLOYEE_PHONE,
                    role="employee",
                    is_active=True,
                )
                db.add(employee_user)
        db.commit()

        desks_and_rooms = db.query(Resource).all()
        if not desks_and_rooms:
            desks_and_rooms = [
                Resource(
                    name="Biurko A1",
                    type="desk",
                    capacity=1,
                    location="Strefa cicha - Piętro 1",
                ),
                Resource(
                    name="Biurko A2",
                    type="desk",
                    capacity=1,
                    location="Strefa cicha - Piętro 1",
                ),
                Resource(
                    name="Biurko B1 (Open Space)",
                    type="desk",
                    capacity=1,
                    location="Open Space - Piętro 1",
                ),
                Resource(
                    name="Biurko B2 (Open Space)",
                    type="desk",
                    capacity=1,
                    location="Open Space - Piętro 1",
                ),
                Resource(
                    name="Sala konferencyjna „Spodek”",
                    type="room",
                    capacity=6,
                    location="Lewe skrzydło - Piętro 1",
                ),
                Resource(
                    name="Sala konferencyjna „NOSPR”",
                    type="room",
                    capacity=14,
                    location="Centrum - Piętro 2",
                ),
            ]
            db.add_all(desks_and_rooms)
            db.commit()

        for item in desks_and_rooms:
            db.refresh(item)

        tomorrow_start = (datetime.now() + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
        tomorrow_end = tomorrow_start.replace(hour=17, minute=0)

        if employee_user:
            db.refresh(employee_user)
            sample_reservation = Reservation(
                user_id=employee_user.id,
                resource_id=desks_and_rooms[0].id,
                start_time=tomorrow_start,
                end_time=tomorrow_end,
                status="active",
            )
            db.add(sample_reservation)
            db.commit()

    finally:
        db.close()


if __name__ == "__main__":
    seed_data()
