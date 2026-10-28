from datetime import datetime
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
