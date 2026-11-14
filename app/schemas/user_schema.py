from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


def validate_password_strength(password: str) -> str:
    requirements = (
        len(password) >= 8,
        any(character.islower() for character in password),
        any(character.isupper() for character in password),
        any(character.isdigit() for character in password),
        any(not character.isalnum() for character in password),
    )
    if not all(requirements):
        raise ValueError(
            "Password must contain at least 8 characters, including lowercase, "
            "uppercase, digit and special character."
        )
    return password


class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)
    surname: str = Field(..., min_length=2, max_length=100)
    phone_number: str = Field(..., min_length=3, max_length=30)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)

    @field_validator("password")
    @classmethod
    def password_must_be_strong(cls, value: str) -> str:
        return validate_password_strength(value)

    model_config = ConfigDict(extra="forbid")


class UserOut(UserBase):
    id: int
    role: Literal["employee", "admin"]
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class PasswordChange(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=100)
    new_password: str = Field(..., min_length=8, max_length=100)

    @field_validator("new_password")
    @classmethod
    def new_password_must_be_strong(cls, value: str) -> str:
        return validate_password_strength(value)


class Token(BaseModel):
    access_token: str
    token_type: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
