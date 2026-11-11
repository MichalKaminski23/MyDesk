from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user_model import User
from app.schemas.user_schema import PasswordChange, UserOut
from app.security import get_current_user, require_admin
from app.services.user_service import change_password, list_users, set_user_active_status

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/me", response_model=UserOut, status_code=status.HTTP_200_OK)
def get_my_profile(
    current_user: User = Depends(get_current_user),
):
    return current_user


@router.patch("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_my_password(
    password_data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    change_password(
        db,
        current_user,
        password_data.current_password,
        password_data.new_password,
    )


@router.get("", response_model=list[UserOut], status_code=status.HTTP_200_OK)
def get_users(
    search: str | None = Query(default=None, min_length=1, max_length=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return list_users(db, search)


@router.patch("/{user_id}/deactivate", response_model=UserOut)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return set_user_active_status(db, user_id, False)


@router.patch("/{user_id}/activate", response_model=UserOut)
def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return set_user_active_status(db, user_id, True)
