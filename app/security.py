from datetime import datetime, timedelta, timezone
from collections import deque
from threading import Lock
from time import monotonic
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.user_model import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


class LoginRateLimiter:
    def __init__(self, max_attempts: int = 5, window_seconds: int = 60):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._attempts: dict[tuple[str, str], deque[float]] = {}
        self._lock = Lock()

    def _active_attempts(self, key: tuple[str, str], now: float) -> deque[float]:
        attempts = self._attempts.setdefault(key, deque())
        while attempts and now - attempts[0] >= self.window_seconds:
            attempts.popleft()
        return attempts

    def check(self, client_host: str, account: str) -> None:
        now = monotonic()
        keys = (("ip", client_host), ("account", account.strip().lower()))
        with self._lock:
            if any(len(self._active_attempts(key, now)) >= self.max_attempts for key in keys):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many login attempts. Try again later.",
                    headers={"Retry-After": str(self.window_seconds)},
                )

    def record_failure(self, client_host: str, account: str) -> None:
        now = monotonic()
        keys = (("ip", client_host), ("account", account.strip().lower()))
        with self._lock:
            for key in keys:
                self._active_attempts(key, now).append(now)

    def reset(self, client_host: str, account: str) -> None:
        keys = (("ip", client_host), ("account", account.strip().lower()))
        with self._lock:
            for key in keys:
                self._attempts.pop(key, None)


login_rate_limiter = LoginRateLimiter()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission. Administrator role is required.",
        )
    return current_user
