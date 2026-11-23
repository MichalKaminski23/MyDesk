from fastapi.testclient import TestClient
from unittest.mock import patch
from tempfile import TemporaryDirectory
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from tests.database_support import SQLiteTestCase
from app.database import Base, get_db
from app.main import app
from app.models import User, Resource
from app.security import LoginRateLimiter, create_access_token, get_password_hash


class SecurityAPITestCase(SQLiteTestCase):
    password = "Secure123!"
    file_database = False

    def setUp(self):
        super().setUp()
        if self.file_database:
            directory = TemporaryDirectory(prefix="mydesk-security-")
            self.addCleanup(directory.cleanup)
            path = (Path(directory.name) / "test.db").as_posix()
            self.engine = create_engine(f"sqlite:///{path}", connect_args={"check_same_thread": False})
            self.addCleanup(self.engine.dispose)
            Base.metadata.create_all(self.engine)
            self.session = sessionmaker(bind=self.engine)
        with self.session() as db:
            password_hash = get_password_hash(self.password)
            users = [
                User(email=f"{name}@example.com", hashed_password=password_hash,
                     name=name, surname="Testowy", phone_number="123456789", role=role)
                for name, role in (("anna", "employee"), ("bartek", "employee"), ("admin", "admin"))
            ]
            desk = Resource(name="Desk A1", type="desk", capacity=1)
            db.add_all([*users, desk])
            db.commit()
            self.user_ids = [user.id for user in users]
            self.headers = [
                {"Authorization": f"Bearer {create_access_token({'sub': user.email})}"}
                for user in users
            ]
            self.slot = {"resource_id": desk.id, "start_time": "2099-01-05T09:00:00",
                         "end_time": "2099-01-05T11:00:00"}

        def override_get_db():
            with self.session() as db:
                yield db

        self.addCleanup(setattr, app, "dependency_overrides", app.dependency_overrides)
        app.dependency_overrides = {**app.dependency_overrides, get_db: override_get_db}
        limiter_patch = patch("app.routers.auth_router.login_rate_limiter", LoginRateLimiter())
        limiter_patch.start()
        self.addCleanup(limiter_patch.stop)
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def login(self, username="anna@example.com", password=None):
        return self.client.post("/api/auth/login", data={
            "username": username, "password": self.password if password is None else password,
        })
