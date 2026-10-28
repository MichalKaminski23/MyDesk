from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.reservation import ReservationCreate, ReservationUpdate, ReservationOut
from app.security import get_current_user
from app.services.reservation_service import (
    cancel_reservation as cancel_reservation_service,
    create_reservation as create_reservation_service,
    list_user_reservations,
    update_reservation as update_reservation_service,
)

router = APIRouter(prefix="/api/reservations", tags=["Reservations"])


@router.get("", response_model=list[ReservationOut], status_code=status.HTTP_200_OK)
def get_my_reservations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_user_reservations(db, current_user.id)


@router.post("", response_model=ReservationOut, status_code=status.HTTP_201_CREATED)
def create_reservation(
    reservation_in: ReservationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_reservation_service(
        db,
        current_user,
        reservation_in.resource_id,
        reservation_in.start_time,
        reservation_in.end_time,
    )


@router.put("/{reservation_id}", response_model=ReservationOut, status_code=status.HTTP_200_OK)
def update_reservation(
    reservation_id: int,
    update_data: ReservationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_reservation_service(
        db,
        reservation_id,
        current_user,
        update_data.resource_id,
        update_data.start_time,
        update_data.end_time,
    )


@router.delete("/{reservation_id}", status_code=status.HTTP_200_OK)
def cancel_reservation(
    reservation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return cancel_reservation_service(db, reservation_id, current_user)
