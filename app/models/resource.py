from sqlalchemy import CheckConstraint, Column, Integer, String
from app.database import Base


class Resource(Base):
    __tablename__ = "resources"
    __table_args__ = (
        CheckConstraint("type IN ('desk', 'room')", name="ck_resource_type"),
        CheckConstraint("capacity >= 1", name="ck_resource_capacity"),
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    type = Column(String, nullable=False)  # "desk" lub "room"
    capacity = Column(Integer, default=1)
    location = Column(String, default="Piętro 1")
