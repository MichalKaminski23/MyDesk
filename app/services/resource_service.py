from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.reservation import Reservation
from app.models.resource import Resource
from app.schemas.resource import ResourceCreate


def list_resources(db: Session) -> list[Resource]:
    return db.query(Resource).all()


def list_available_resources(
    db: Session,
    start_time: datetime,
    end_time: datetime,
) -> list[Resource]:
    if end_time <= start_time:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="End time must be later than start time.",
        )

    reserved_resource_ids = select(Reservation.resource_id).where(
        Reservation.status == "active",
        Reservation.start_time < end_time,
        Reservation.end_time > start_time,
    )
    return db.query(Resource).filter(~Resource.id.in_(reserved_resource_ids)).all()


def create_resource(db: Session, resource_in: ResourceCreate) -> Resource:
    resource = Resource(**resource_in.model_dump())
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return resource
