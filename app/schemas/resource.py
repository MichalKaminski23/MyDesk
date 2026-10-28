from pydantic import BaseModel, Field
from typing import Optional


class ResourceBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    type: str = Field(..., pattern="^(desk|room)$")
    capacity: int = Field(default=1, ge=1)
    location: Optional[str] = "Piętro 1"


class ResourceCreate(ResourceBase):
    pass


class ResourceOut(ResourceBase):
    id: int

    class Config:
        from_attributes = True
