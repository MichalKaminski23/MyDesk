from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)
    surname: str = Field(..., min_length=2, max_length=100)
    phone_number: str = Field(..., min_length=3, max_length=30)


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)
    model_config = ConfigDict(extra="forbid")


class UserOut(UserBase):
    id: int
    role: Literal["employee", "admin"]
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
