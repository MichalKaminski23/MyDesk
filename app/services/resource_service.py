from sqlalchemy.orm import Session

from app.models.resource import Resource
from app.schemas.resource import ResourceCreate


def list_resources(db: Session) -> list[Resource]:
    return db.query(Resource).all()


def create_resource(db: Session, resource_in: ResourceCreate) -> Resource:
    resource = Resource(**resource_in.model_dump())
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return resource
