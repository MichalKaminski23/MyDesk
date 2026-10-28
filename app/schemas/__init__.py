# schemas definiują strukturę danych używaną w żądaniach i odpowiedziach API, zapewniając walidację i serializację danych.
from app.schemas.resource import ResourceCreate, ResourceOut

__all__ = [
    "ResourceCreate",
    "ResourceOut",
]
