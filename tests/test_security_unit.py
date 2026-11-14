from datetime import datetime, timedelta, timezone
from unittest import TestCase

from fastapi import HTTPException
from jose import jwt

from app.config import settings
from app.models.user_model import User
from app.security import (
    create_access_token,
    get_password_hash,
    require_admin,
    verify_password,
)


class PasswordSecurityUnitTests(TestCase):
    def test_password_hash_can_be_verified(self):
        password = "Secure123!"

        password_hash = get_password_hash(password)

        self.assertNotEqual(password_hash, password)
        self.assertTrue(verify_password(password, password_hash))

    def test_password_hash_rejects_different_password(self):
        password_hash = get_password_hash("Secure123!")

        self.assertFalse(verify_password("WrongPassword!", password_hash))


class TokenSecurityUnitTests(TestCase):
    def test_access_token_contains_subject_and_role(self):
        token = create_access_token({"sub": "employee@example.com", "role": "employee"})

        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

        self.assertEqual(payload["sub"], "employee@example.com")
        self.assertEqual(payload["role"], "employee")
        self.assertIn("exp", payload)

    def test_access_token_uses_requested_expiration(self):
        token = create_access_token(
            {"sub": "employee@example.com"},
            expires_delta=timedelta(minutes=10),
        )
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)

        self.assertGreater(expires_at, datetime.now(timezone.utc) + timedelta(minutes=9))
        self.assertLess(expires_at, datetime.now(timezone.utc) + timedelta(minutes=11))


class AuthorizationSecurityUnitTests(TestCase):
    def test_require_admin_returns_admin_user(self):
        admin = User(role="admin")

        self.assertIs(require_admin(admin), admin)

    def test_require_admin_rejects_employee(self):
        employee = User(role="employee")

        with self.assertRaises(HTTPException) as context:
            require_admin(employee)

        self.assertEqual(context.exception.status_code, 403)
