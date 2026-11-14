from datetime import datetime

from sqlalchemy.exc import IntegrityError

from tests.database import SQLiteTestCase

from app.models import Reservation, Resource, User


class DatabaseConstraintIntegrationTests(SQLiteTestCase):
    def setUp(self):
        super().setUp()
        self.db = self.session()
        self.addCleanup(self.db.close)
        self.user_data = {
            "email": "employee@example.com",
            "hashed_password": "unused-test-hash",
            "name": "Anna",
            "surname": "Nowak",
            "phone_number": "123456789",
        }
        self.user = User(**self.user_data)
        self.desk = Resource(name="Desk A1", type="desk", capacity=1)
        self.db.add_all([self.user, self.desk])
        self.db.commit()

    def assert_rejected(self, record, constraint):
        self.db.add(record)
        with self.assertRaisesRegex(IntegrityError, constraint):
            self.db.flush()
        self.db.rollback()

    def test_integration_database_user_email_duplicate_and_missing_values_are_rejected(self):
        self.assert_rejected(User(**self.user_data), r"UNIQUE constraint failed: users\.email")
        self.assert_rejected(
            User(**{**self.user_data, "email": None}),
            r"NOT NULL constraint failed: users\.email",
        )

    def test_integration_database_resource_duplicate_name_is_rejected(self):
        self.assert_rejected(
            Resource(name=self.desk.name, type="room", capacity=4),
            r"UNIQUE constraint failed: resources\.name",
        )

    def test_integration_database_resource_non_positive_capacity_is_rejected(self):
        self.assert_rejected(
            Resource(name="Room B1", type="room", capacity=0),
            "ck_resource_capacity",
        )

    def test_integration_database_reservation_invalid_time_order_is_rejected(self):
        start = datetime(2099, 1, 5, 9)
        self.assert_rejected(
            Reservation(user_id=self.user.id, resource_id=self.desk.id, start_time=start, end_time=start),
            "ck_reservation_time_order",
        )
