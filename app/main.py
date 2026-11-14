from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine, ensure_postgresql_reservation_constraints
from app.config import settings
import app.models
from app.routers import auth_router, reservations_router, resources_router, user_router
from app.seed import seed_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_postgresql_reservation_constraints()
    seed_data()
    yield


app = FastAPI(
    title="MyDesk API",
    description="Desk and rooms reservation system.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    return {"status": "ok"}


app.include_router(auth_router.router)
app.include_router(resources_router.router)
app.include_router(reservations_router.router)
app.include_router(user_router.router)
