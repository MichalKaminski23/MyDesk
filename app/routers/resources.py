from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.resource import ResourceCreate, ResourceOut
from app.services.resource_service import (
    create_resource as create_resource_service,
    list_resources as list_resources_service,
)

router = APIRouter(prefix="/api/resources", tags=["Zasoby"])


@router.get("", response_model=List[ResourceOut])
def list_resources(db: Session = Depends(get_db)):
    return list_resources_service(db)


@router.post("", response_model=ResourceOut, status_code=status.HTTP_201_CREATED)
def create_resource(
    resource_in: ResourceCreate,
    db: Session = Depends(get_db),
):
    return create_resource_service(db, resource_in)
