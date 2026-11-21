from app.models import Reservation
from tests.security_support import SecurityAPITestCase


class AuthenticationSecurityTests(SecurityAPITestCase):
    def test_sec01_requests_without_token_are_rejected_without_writes(self):
        self.assertEqual(self.client.get("/api/users/me").status_code, 401)
        response = self.client.post("/api/reservations", json=self.slot)
        self.assertEqual(response.status_code, 401, response.text)
        with self.session() as db:
            self.assertEqual(db.query(Reservation).count(), 0)

    def test_sec02_wrong_password_and_unknown_email_have_same_error(self):
        self.assertEqual(self.login().status_code, 200)
        wrong = self.login(password="Wrong123!")
        unknown = self.login(username="unknown@example.com")
        self.assertEqual(wrong.status_code, 401, wrong.text)
        self.assertEqual(unknown.status_code, 401, unknown.text)
        self.assertEqual(wrong.json(), unknown.json())

    def test_sec03_sixth_login_attempt_is_rate_limited(self):
        for attempt in range(5):
            with self.subTest(attempt=attempt + 1):
                response = self.login(password="Wrong123!")
                self.assertEqual(response.status_code, 401, response.text)
        response = self.login(password="Wrong123!")
        self.assertEqual(response.status_code, 429, response.text)
        self.assertEqual(response.headers["Retry-After"], "60")
