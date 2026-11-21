from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, CheckConstraint, event
from sqlalchemy.orm import relationship
from app.database import Base


class Reservation(Base):
    __tablename__ = "reservations"
    __table_args__ = (
        CheckConstraint("status IN ('active', 'cancelled')", name="ck_reservation_status"),
        CheckConstraint("end_time > start_time", name="ck_reservation_time_order"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    resource_id = Column(Integer, ForeignKey("resources.id", ondelete="CASCADE"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    status = Column(String(9), default="active", nullable=False)

    user = relationship("User", back_populates="reservations")
    resource = relationship("Resource")


@event.listens_for(Base.metadata, "after_create")
def ensure_sqlite_reservation_constraints(metadata, connection, **kwargs):
    """Protect writes atomically, including when create_all sees existing tables."""
    if connection.dialect.name != "sqlite":
        return

    for operation in ("INSERT", "UPDATE"):
        exclude_self = "AND existing.id != NEW.id" if operation == "UPDATE" else ""
        connection.exec_driver_sql(f"""
            CREATE TRIGGER IF NOT EXISTS reservations_no_overlap_{operation.lower()}
            BEFORE {operation} ON reservations
            WHEN NEW.status = 'active' AND EXISTS (
                SELECT 1 FROM reservations AS existing
                WHERE existing.resource_id = NEW.resource_id
                  AND existing.status = 'active'
                  AND existing.start_time < NEW.end_time
                  AND existing.end_time > NEW.start_time
                  {exclude_self}
            )
            BEGIN
                SELECT RAISE(ABORT, 'Resource is already booked in this time slot.');
            END
        """)
