from datetime import datetime, timedelta

from fastapi.testclient import TestClient

from tests.database import SQLiteTestCase

from app.database import get_db
from app.main import app
from app.models import Reservation, Resource, User
from app.security import create_access_token, get_password_hash


class ReservationsAPIIntegrationTests(SQLiteTestCase):
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
        self.user = user
        self.desk = desk
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

        def override_get_db():
            with self.session() as db:
                yield db

        self.addCleanup(setattr, app, "dependency_overrides", app.dependency_overrides)
        app.dependency_overrides = {**app.dependency_overrides, get_db: override_get_db}
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def test_integration_security_list_reservations_without_authentication_returns_401(self):
        response = self.client.get("/api/reservations")
        self.assertEqual(response.status_code, 401, response.text)
        self.assertEqual(response.headers["WWW-Authenticate"], "Bearer")

    def test_integration_api_create_reservation_invalid_time_range_returns_422(self):
        slot = {**self.slot, "end_time": self.slot["start_time"]}
        response = self.client.post("/api/reservations", json=slot, headers=self.auth)
        self.assertEqual(response.status_code, 422, response.text)
        self.assertEqual(self.client.get("/api/reservations", headers=self.auth).json(), [])

    def test_integration_api_reservation_lifecycle_updates_conflict_and_availability(self):
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

    def test_integration_api_started_reservation_cannot_be_updated(self):
        now = datetime.now()
        with self.session() as db:
            reservation = Reservation(
                user_id=self.user.id,
                resource_id=self.desk.id,
                start_time=now - timedelta(hours=1),
                end_time=now + timedelta(hours=1),
                status="active",
            )
            db.add(reservation)
            db.commit()
            reservation_id = reservation.id

        response = self.client.put(
            f"/api/reservations/{reservation_id}",
            json={"start_time": "2099-01-05T10:00:00"},
            headers=self.auth,
        )

        self.assertEqual(response.status_code, 409, response.text)

    def test_login_token_can_create_and_list_reservations(self):
        password = "Pracownik123!"
        with self.session() as db:
            db.get(User, self.user.id).hashed_password = get_password_hash(password)
            db.commit()

        login = self.client.post("/api/auth/login", data={
            "username": self.user.email,
            "password": password,
        })
        self.assertEqual(login.status_code, 200, login.text)
        self.assertEqual(login.json()["token_type"], "bearer")
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

        created = self.client.post("/api/reservations", json=self.slot, headers=headers)
        self.assertEqual(created.status_code, 201, created.text)
        listed = self.client.get("/api/reservations", headers=headers)
        self.assertEqual(listed.status_code, 200, listed.text)
        self.assertEqual([item["id"] for item in listed.json()], [created.json()["id"]])
        with self.session() as db:
            stored = db.get(Reservation, created.json()["id"])
            self.assertEqual(stored.user_id, self.user.id)
            self.assertEqual(stored.resource_id, self.desk.id)

    def test_adjacent_reservations_do_not_conflict(self):
        first = self.client.post("/api/reservations", json=self.slot, headers=self.auth)
        self.assertEqual(first.status_code, 201, first.text)
        next_slot = {
            **self.slot,
            "start_time": self.slot["end_time"],
            "end_time": "2099-01-05T12:00:00",
        }
        available = self.client.get("/api/resources/availability", params={
            "start_time": next_slot["start_time"],
            "end_time": next_slot["end_time"],
        })
        self.assertEqual(available.status_code, 200, available.text)
        self.assertEqual([item["id"] for item in available.json()], [self.desk.id])
        second = self.client.post("/api/reservations", json=next_slot, headers=self.auth)
        self.assertEqual(second.status_code, 201, second.text)
        with self.session() as db:
            self.assertEqual(db.query(Reservation).count(), 2)

    def test_moving_reservation_updates_both_resources_availability(self):
        with self.session() as db:
            other = Resource(name="Desk A2", type="desk", capacity=1)
            db.add(other)
            db.commit()
            other_id = other.id

        created = self.client.post("/api/reservations", json=self.slot, headers=self.auth)
        self.assertEqual(created.status_code, 201, created.text)
        reservation_id = created.json()["id"]
        updated = self.client.put(
            f"/api/reservations/{reservation_id}",
            json={"resource_id": other_id},
            headers=self.auth,
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual(updated.json()["resource"]["id"], other_id)
        available = self.client.get("/api/resources/availability", params={
            "start_time": self.slot["start_time"],
            "end_time": self.slot["end_time"],
        })
        self.assertEqual(available.status_code, 200, available.text)
        self.assertEqual([item["id"] for item in available.json()], [self.desk.id])
        with self.session() as db:
            self.assertEqual(db.get(Reservation, reservation_id).resource_id, other_id)

    def test_conflicting_update_preserves_original_reservation(self):
        first = self.client.post("/api/reservations", json=self.slot, headers=self.auth)
        self.assertEqual(first.status_code, 201, first.text)
        later_slot = {
            **self.slot,
            "start_time": "2099-01-05T12:00:00",
            "end_time": "2099-01-05T14:00:00",
        }
        second = self.client.post("/api/reservations", json=later_slot, headers=self.auth)
        self.assertEqual(second.status_code, 201, second.text)
        updated = self.client.put(
            f"/api/reservations/{second.json()['id']}",
            json={"start_time": "2099-01-05T10:00:00"},
            headers=self.auth,
        )
        self.assertEqual(updated.status_code, 409, updated.text)
        with self.session() as db:
            stored = db.get(Reservation, second.json()["id"])
            self.assertEqual(stored.start_time, datetime.fromisoformat(later_slot["start_time"]))
            self.assertEqual(stored.end_time, datetime.fromisoformat(later_slot["end_time"]))
            self.assertEqual(db.query(Reservation).count(), 2)

    def test_recurring_reservations_include_last_matching_day(self):
        weekday = datetime.fromisoformat(self.slot["start_time"]).weekday()
        response = self.client.post("/api/reservations/recurring", headers=self.auth, json={
            **self.slot,
            "weekdays": [weekday],
            "repeat_until": "2099-01-19",
        })
        self.assertEqual(response.status_code, 201, response.text)
        expected = [datetime(2099, 1, day, 9) for day in (5, 12, 19)]
        self.assertEqual(
            sorted(datetime.fromisoformat(item["start_time"]) for item in response.json()),
            expected,
        )
        for item in response.json():
            with self.subTest(reservation=item["id"]):
                start = datetime.fromisoformat(item["start_time"])
                end = datetime.fromisoformat(item["end_time"])
                self.assertEqual(end - start, timedelta(hours=2))
                available = self.client.get("/api/resources/availability", params={
                    "start_time": item["start_time"], "end_time": item["end_time"],
                })
                self.assertEqual(available.status_code, 200, available.text)
                self.assertEqual(available.json(), [])
        with self.session() as db:
            self.assertEqual(
                [item.start_time for item in db.query(Reservation).order_by(Reservation.start_time)],
                expected,
            )

    def test_recurring_conflict_does_not_save_partial_series(self):
        existing = self.client.post("/api/reservations", headers=self.auth, json={
            **self.slot,
            "start_time": "2099-01-12T09:00:00",
            "end_time": "2099-01-12T11:00:00",
        })
        self.assertEqual(existing.status_code, 201, existing.text)
        response = self.client.post("/api/reservations/recurring", headers=self.auth, json={
            **self.slot,
            "weekdays": [datetime.fromisoformat(self.slot["start_time"]).weekday()],
            "repeat_until": "2099-01-19",
        })
        self.assertEqual(response.status_code, 409, response.text)
        with self.session() as db:
            self.assertEqual([item.id for item in db.query(Reservation)], [existing.json()["id"]])
        retry = self.client.post("/api/reservations", json=self.slot, headers=self.auth)
        self.assertEqual(retry.status_code, 201, retry.text)
