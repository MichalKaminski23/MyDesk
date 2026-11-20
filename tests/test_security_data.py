from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest.mock import patch

from app.models import Reservation, User
from app.security import verify_password
from app.services import reservation_service
from tests.security_support import SecurityAPITestCase


class DataSecurityTests(SecurityAPITestCase):
    def test_sec07_api_hides_passwords_and_database_stores_bcrypt(self):
        profile = self.client.get("/api/users/me", headers=self.headers[0])
        users = self.client.get("/api/users", headers=self.headers[2])
        self.assertEqual(profile.status_code, 200, profile.text)
        self.assertEqual(users.status_code, 200, users.text)
        for record in [profile.json(), *users.json()]:
            self.assertNotIn("password", record)
            self.assertNotIn("hashed_password", record)
            self.assertNotIn(self.password, str(record))
        # Exercise account creation rather than only inspecting fixture hashes.
        response = self.client.post("/api/auth/register", headers=self.headers[2], json={
            "email": "new@example.com", "password": self.password,
            "name": "Nowy", "surname": "Testowy", "phone_number": "123456789",
        })
        self.assertEqual(response.status_code, 201, response.text)
        self.assertNotIn("hashed_password", response.json())
        with self.session() as db:
            stored = db.query(User).filter_by(email="new@example.com").one().hashed_password
            self.assertNotEqual(stored, self.password)
            self.assertTrue(stored.startswith(("$2a$", "$2b$", "$2y$")))
            self.assertTrue(verify_password(self.password, stored))

    def test_sec08_search_does_not_execute_sql_injection(self):
        normal = self.client.get("/api/users", headers=self.headers[2], params={"search": "anna"})
        self.assertEqual(normal.status_code, 200, normal.text)
        self.assertEqual([u["email"] for u in normal.json()], ["anna@example.com"])
        response = self.client.get("/api/users", headers=self.headers[2],
                                   params={"search": "' OR 1=1 --"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json(), [])
        with self.session() as db:
            self.assertEqual(db.query(User).count(), 3)


class ConcurrentReservationSecurityTests(SecurityAPITestCase):
    # Separate connections are required: StaticPool's single connection cannot model this race.
    file_database = True

    def test_sec09_concurrent_requests_create_only_one_active_reservation(self):
        barrier = Barrier(2, timeout=10)
        find_conflict = reservation_service._find_conflict

        def synchronized_conflict_check(*args, **kwargs):
            result = find_conflict(*args, **kwargs)
            # Both actual database reads complete before either request can write.
            barrier.wait()
            return result

        def reserve(headers):
            return self.client.post("/api/reservations", headers=headers, json=self.slot)

        with patch.object(reservation_service, "_find_conflict", side_effect=synchronized_conflict_check):
            with ThreadPoolExecutor(max_workers=2) as executor:
                responses = list(executor.map(reserve, self.headers[:2]))

        with self.session() as db:
            count = db.query(Reservation).filter_by(status="active").count()
        self.assertEqual(
            (sorted(response.status_code for response in responses), count),
            ([201, 409], 1),
            f"Concurrent responses: {[response.text for response in responses]}",
        )
