from sqlalchemy import Boolean, CheckConstraint, Column, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("role IN ('employee', 'admin')", name="ck_user_role"),)

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(320), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    surname = Column(String(100), nullable=False)
    phone_number = Column(String(30), nullable=False)
    role = Column(String, default="employee", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    reservations = relationship("Reservation", back_populates="user", cascade="all, delete-orphan")
