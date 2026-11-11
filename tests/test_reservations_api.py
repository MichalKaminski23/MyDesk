from fastapi.testclient import TestClient

from tests.database import SQLiteTestCase

from app.database import get_db
from app.main import app
from app.models import Resource, User
from app.security import create_access_token


class ReservationsAPITests(SQLiteTestCase):
    def setUp(self):
        super().setUp()
        user = User(
            email="employee@example.com",
            hashed_password="unused-test-hash",
            name="Anna",
            surname="Nowak",
            phone_number="123456789",
        )
        desk = Resource(name="Desk A1", type="desk", capacity=1)
        with self.session() as db:
            db.add_all([user, desk])
            db.commit()
            self.slot = {
                "resource_id": desk.id,
                "start_time": "2099-01-05T09:00:00",
                "end_time": "2099-01-05T11:00:00",
            }
            token = create_access_token({"sub": user.email})
        self.auth = {"Authorization": f"Bearer {token}"}

        def test_db():
            with self.session() as db:
                yield db

        self.addCleanup(setattr, app, "dependency_overrides", app.dependency_overrides)
        app.dependency_overrides = {**app.dependency_overrides, get_db: test_db}
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def test_reservations_require_authentication(self):
        response = self.client.get("/api/reservations")
        self.assertEqual(response.status_code, 401, response.text)
        self.assertEqual(response.headers["WWW-Authenticate"], "Bearer")

    def test_invalid_time_range_is_rejected(self):
        slot = {**self.slot, "end_time": self.slot["start_time"]}
        response = self.client.post("/api/reservations", json=slot, headers=self.auth)
        self.assertEqual(response.status_code, 422, response.text)
        self.assertEqual(self.client.get("/api/reservations", headers=self.auth).json(), [])

    def test_reservation_blocks_availability_until_cancelled(self):
        created = self.client.post("/api/reservations", json=self.slot, headers=self.auth)
        self.assertEqual(created.status_code, 201, created.text)
        reservation_id = created.json()["id"]

        conflict = self.client.post("/api/reservations", json=self.slot, headers=self.auth)
        self.assertEqual(conflict.status_code, 409, conflict.text)

        params = {"start_time": self.slot["start_time"], "end_time": self.slot["end_time"]}
        available = self.client.get("/api/resources/availability", params=params)
        self.assertEqual(available.status_code, 200, available.text)
        self.assertEqual(available.json(), [])

        updated = self.client.put(
            f"/api/reservations/{reservation_id}",
            json={"start_time": "2099-01-05T10:00:00"},
            headers=self.auth,
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual(updated.json()["start_time"], "2099-01-05T10:00:00")

        cancelled = self.client.delete(f"/api/reservations/{reservation_id}", headers=self.auth)
        self.assertEqual(cancelled.status_code, 200, cancelled.text)
        available = self.client.get("/api/resources/availability", params=params)
        self.assertEqual(available.status_code, 200, available.text)
        self.assertEqual([resource["id"] for resource in available.json()], [self.slot["resource_id"]])
