from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ResourceBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    type: Literal["desk", "room"]
    capacity: int = Field(default=1, ge=1)
    location: str = Field(default="Floor 1", min_length=1, max_length=100)


class ResourceCreate(ResourceBase):
    pass


class ResourceOut(ResourceBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
