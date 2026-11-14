from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user_model import User
from app.schemas.user_schema import UserCreate, Token, UserOut
from app.security import login_rate_limiter, require_admin
from app.services.auth_service import (
    login_user,
    register_employee,
)

router = APIRouter(prefix="/api/auth", tags=["Authorization"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return register_employee(db, user_in)


@router.post("/login", response_model=Token, status_code=status.HTTP_200_OK)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    client_host = request.client.host if request.client else "unknown"
    account = form_data.username.strip().lower()
    login_rate_limiter.check(client_host, account)
    try:
        token = login_user(db, form_data.username, form_data.password)
    except HTTPException as exc:
        if exc.status_code == status.HTTP_401_UNAUTHORIZED:
            login_rate_limiter.record_failure(client_host, account)
        raise
    login_rate_limiter.reset(client_host, account)
    return token
