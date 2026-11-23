from datetime import datetime

from app.models import Reservation, Resource, User
from tests.security_support import SecurityAPITestCase


class AuthorizationSecurityTests(SecurityAPITestCase):
    def test_security_authorization_employee_cannot_list_users_or_create_resources(self):
        self.assertEqual(self.client.get("/api/users", headers=self.headers[2]).status_code, 200)
        response = self.client.get("/api/users", headers=self.headers[0])
        self.assertEqual(response.status_code, 403, response.text)
        response = self.client.post("/api/resources", headers=self.headers[0],
                                    json={"name": "Forbidden desk", "type": "desk", "capacity": 1})
        self.assertEqual(response.status_code, 403, response.text)
        with self.session() as db:
            self.assertEqual(db.query(Resource).count(), 1)

    def test_security_authorization_employee_cannot_modify_or_cancel_another_users_reservation(self):
        created = self.client.post("/api/reservations", json=self.slot, headers=self.headers[1])
        self.assertEqual(created.status_code, 201, created.text)
        reservation_id = created.json()["id"]
        url = f"/api/reservations/{reservation_id}"
        response = self.client.put(url, headers=self.headers[0],
                                   json={"start_time": "2099-01-05T10:00:00"})
        self.assertEqual(response.status_code, 403, response.text)
        response = self.client.delete(url, headers=self.headers[0])
        self.assertEqual(response.status_code, 403, response.text)
        with self.session() as db:
            reservation = db.get(Reservation, reservation_id)
            self.assertEqual(reservation.user_id, self.user_ids[1])
            self.assertEqual(reservation.start_time, datetime(2099, 1, 5, 9))
            self.assertEqual(reservation.status, "active")

    def test_security_authorization_deactivated_account_cannot_use_existing_token(self):
        headers = self.headers[0]
        self.assertEqual(self.client.get("/api/users/me", headers=headers).status_code, 200)
        response = self.client.patch(f"/api/users/{self.user_ids[0]}/deactivate",
                                     headers=self.headers[2])
        self.assertEqual(response.status_code, 200, response.text)
        with self.session() as db:
            self.assertFalse(db.get(User, self.user_ids[0]).is_active)
        self.assertEqual(self.client.get("/api/users/me", headers=headers).status_code, 401)
