from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.schemas.resource import ResourceOut


class ReservationBase(BaseModel):
    resource_id: int = Field(..., gt=0)
    start_time: datetime
    end_time: datetime

    @model_validator(mode="after")
    def validate_times(self):
        if self.end_time <= self.start_time:
            raise ValueError("Time of end must be later than time of start.")
        return self


class ReservationCreate(ReservationBase):
    pass


class RecurringReservationCreate(ReservationBase):
    weekdays: list[int] = Field(..., min_length=1, max_length=7)
    repeat_until: date

    @model_validator(mode="after")
    def validate_recurrence(self):
        if any(day < 0 or day > 6 for day in self.weekdays):
            raise ValueError("Weekdays must be between 0 (Monday) and 6 (Sunday).")
        if len(set(self.weekdays)) != len(self.weekdays):
            raise ValueError("Weekdays cannot repeat.")
        if self.repeat_until < self.start_time.date():
            raise ValueError("Repeat end date must not be before start date.")
        return self


class ReservationUpdate(BaseModel):
    resource_id: int | None = Field(default=None, gt=0)
    start_time: datetime | None = None
    end_time: datetime | None = None

    @model_validator(mode="after")
    def validate_update_times(self):
        if self.start_time is not None and self.end_time is not None and self.end_time <= self.start_time:
            raise ValueError("Time of end must be later than time of start.")
        return self


class ReservationOut(BaseModel):
    id: int
    user_id: int
    resource_id: int
    start_time: datetime
    end_time: datetime
    status: Literal["active", "cancelled"]
    resource: ResourceOut | None = None

    model_config = ConfigDict(from_attributes=True)
