from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.user_model import User
from app.security import get_password_hash, verify_password


def list_users(db: Session, search: str | None = None) -> list[User]:
    query = db.query(User)
    if search:
        pattern = f"%{search.strip()}%"
        filters = [
            User.email.ilike(pattern),
            User.name.ilike(pattern),
            User.surname.ilike(pattern),
        ]
        if search.strip().isdigit():
            filters.append(User.id == int(search.strip()))
        query = query.filter(or_(*filters))
    return query.order_by(User.id).all()


def set_user_active_status(db: Session, user_id: int, is_active: bool) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    if user.role == "admin" and not is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="An administrator cannot be deactivated.",
        )
    user.is_active = is_active
    db.commit()
    db.refresh(user)
    return user


def change_password(
    db: Session,
    user: User,
    current_password: str,
    new_password: str,
) -> None:
    if not verify_password(current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    user.hashed_password = get_password_hash(new_password)
    db.commit()
