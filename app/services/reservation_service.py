from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.models.reservation import Reservation
from app.models.resource import Resource
from app.models.user import User


def list_user_reservations(db: Session, user_id: int) -> list[Reservation]:
    return db.query(Reservation).filter(Reservation.user_id == user_id).all()


def _get_resource(db: Session, resource_id: int) -> Resource:
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if resource is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found.",
        )
    return resource


def _find_conflict(
    db: Session,
    resource_id: int,
    start_time: datetime,
    end_time: datetime,
    excluded_reservation_id: int | None = None,
) -> Reservation | None:
    query = db.query(Reservation).filter(
        Reservation.resource_id == resource_id,
        Reservation.status == "active",
        and_(
            Reservation.start_time < end_time,
            Reservation.end_time > start_time,
        ),
    )
    if excluded_reservation_id is not None:
        query = query.filter(Reservation.id != excluded_reservation_id)
    return query.first()


def create_reservation(
    db: Session,
    current_user: User,
    resource_id: int,
    start_time: datetime,
    end_time: datetime,
) -> Reservation:
    _get_resource(db, resource_id)
    if _find_conflict(db, resource_id, start_time, end_time):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Resource is already booked in this time slot.",
        )

    reservation = Reservation(
        user_id=current_user.id,
        resource_id=resource_id,
        start_time=start_time,
        end_time=end_time,
        status="active",
    )
    db.add(reservation)
    db.commit()
    db.refresh(reservation)
    return reservation


def update_reservation(
    db: Session,
    reservation_id: int,
    current_user: User,
    resource_id: int | None,
    start_time: datetime | None,
    end_time: datetime | None,
) -> Reservation:
    reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if reservation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found.",
        )
    if reservation.status != "active":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot edit a cancelled reservation.",
        )
    if reservation.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to edit someone else's reservation.",
        )

    new_resource_id = resource_id if resource_id is not None else reservation.resource_id
    new_start_time = start_time if start_time is not None else reservation.start_time
    new_end_time = end_time if end_time is not None else reservation.end_time

    _get_resource(db, new_resource_id)
    if new_end_time <= new_start_time:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="End time must be later than start time.",
        )
    if _find_conflict(
        db,
        new_resource_id,
        new_start_time,
        new_end_time,
        excluded_reservation_id=reservation.id,
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Resource is already booked in this time slot.",
        )

    reservation.resource_id = new_resource_id
    reservation.start_time = new_start_time
    reservation.end_time = new_end_time
    db.commit()
    db.refresh(reservation)
    return reservation


def cancel_reservation(
    db: Session,
    reservation_id: int,
    current_user: User,
) -> dict[str, str]:
    reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if reservation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found.",
        )
    if reservation.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to cancel someone else's reservation.",
        )

    reservation.status = "cancelled"
    db.commit()
    return {"message": "Reservation has been successfully cancelled."}
