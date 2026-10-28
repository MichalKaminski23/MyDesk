from datetime import datetime

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.resource import ResourceCreate, ResourceOut
from app.security import require_admin
from app.services.resource_service import (
    create_resource as create_resource_service,
    list_available_resources as list_available_resources_service,
    list_resources as list_resources_service,
)

router = APIRouter(prefix="/api/resources", tags=["Resources"])


@router.get("", response_model=list[ResourceOut], status_code=status.HTTP_200_OK)
def list_resources(db: Session = Depends(get_db)):
    return list_resources_service(db)


@router.get("/availability", response_model=list[ResourceOut], status_code=status.HTTP_200_OK)
def list_available_resources(
    start_time: datetime,
    end_time: datetime,
    db: Session = Depends(get_db),
):
    return list_available_resources_service(db, start_time, end_time)


@router.post("", response_model=ResourceOut, status_code=status.HTTP_201_CREATED)
def create_resource(
    resource_in: ResourceCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return create_resource_service(db, resource_in)
