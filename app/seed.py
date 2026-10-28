from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.resource import Resource


def seed_data():
    db: Session = SessionLocal()
    try:
        if db.query(Resource).first():
            return

        desks_and_rooms = [
            Resource(
                name="Biurko A1",
                type="desk",
                capacity=1,
                location="Strefa Cicha - Piętro 1",
            ),
            Resource(
                name="Biurko A2",
                type="desk",
                capacity=1,
                location="Strefa Cicha - Piętro 1",
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
                name="Sala Spotkań 'Warszawa'",
                type="room",
                capacity=6,
                location="Skrzydło Północne - Piętro 1",
            ),
            Resource(
                name="Sala Konferencyjna 'Kraków'",
                type="room",
                capacity=14,
                location="Centrum - Piętro 2",
            ),
        ]
        db.add_all(desks_and_rooms)
        db.commit()

        for item in desks_and_rooms:
            db.refresh(item)

    finally:
        db.close()


if __name__ == "__main__":
    seed_data()
