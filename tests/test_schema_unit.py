from datetime import date, datetime
from unittest import TestCase

from pydantic import ValidationError

from app.schemas.reservation_schema import (
    RecurringReservationCreate,
    ReservationCreate,
    ReservationUpdate,
)
from app.schemas.resource_schema import ResourceCreate
from app.schemas.user_schema import UserCreate


class UserSchemaUnitTests(TestCase):
    def test_user_create_accepts_valid_data(self):
        user = UserCreate(
            email="anna.nowak@example.com",
            name="Anna",
            surname="Nowak",
            phone_number="123456789",
            password="Secure123!",
        )

        self.assertEqual(user.email, "anna.nowak@example.com")
        self.assertEqual(user.password, "Secure123!")

    def test_user_create_rejects_invalid_email(self):
        with self.assertRaises(ValidationError):
            UserCreate(
                email="not-an-email",
                name="Anna",
                surname="Nowak",
                phone_number="123456789",
                password="Secure123!",
            )

    def test_user_create_rejects_short_password(self):
        with self.assertRaises(ValidationError):
            UserCreate(
                email="anna.nowak@example.com",
                name="Anna",
                surname="Nowak",
                phone_number="123456789",
                password="short",
            )

    def test_user_create_rejects_unknown_fields(self):
        with self.assertRaises(ValidationError):
            UserCreate(
                email="anna.nowak@example.com",
                name="Anna",
                surname="Nowak",
                phone_number="123456789",
                password="Secure123!",
                role="admin",
            )


class ResourceSchemaUnitTests(TestCase):
    def test_resource_create_uses_default_location_and_capacity(self):
        resource = ResourceCreate(name="Desk A1", type="desk")

        self.assertEqual(resource.capacity, 1)
        self.assertEqual(resource.location, "Floor 1")

    def test_resource_create_rejects_unknown_resource_type(self):
        with self.assertRaises(ValidationError):
            ResourceCreate(name="Desk A1", type="parking")

    def test_resource_create_rejects_non_positive_capacity(self):
        with self.assertRaises(ValidationError):
            ResourceCreate(name="Desk A1", type="desk", capacity=0)


class ReservationSchemaUnitTests(TestCase):
    def setUp(self):
        self.start_time = datetime(2099, 1, 5, 9)
        self.end_time = datetime(2099, 1, 5, 11)

    def test_reservation_create_accepts_chronological_times(self):
        reservation = ReservationCreate(
            resource_id=1,
            start_time=self.start_time,
            end_time=self.end_time,
        )

        self.assertEqual(reservation.resource_id, 1)

    def test_reservation_create_rejects_end_time_equal_to_start_time(self):
        with self.assertRaises(ValidationError):
            ReservationCreate(
                resource_id=1,
                start_time=self.start_time,
                end_time=self.start_time,
            )

    def test_reservation_create_rejects_non_positive_resource_id(self):
        with self.assertRaises(ValidationError):
            ReservationCreate(
                resource_id=0,
                start_time=self.start_time,
                end_time=self.end_time,
            )

    def test_recurring_reservation_accepts_unique_weekdays(self):
        reservation = RecurringReservationCreate(
            resource_id=1,
            start_time=self.start_time,
            end_time=self.end_time,
            weekdays=[0, 2, 4],
            repeat_until=date(2099, 1, 31),
        )

        self.assertEqual(reservation.weekdays, [0, 2, 4])

    def test_recurring_reservation_rejects_invalid_weekday(self):
        with self.assertRaises(ValidationError):
            RecurringReservationCreate(
                resource_id=1,
                start_time=self.start_time,
                end_time=self.end_time,
                weekdays=[7],
                repeat_until=date(2099, 1, 31),
            )

    def test_recurring_reservation_rejects_duplicate_weekdays(self):
        with self.assertRaises(ValidationError):
            RecurringReservationCreate(
                resource_id=1,
                start_time=self.start_time,
                end_time=self.end_time,
                weekdays=[0, 0],
                repeat_until=date(2099, 1, 31),
            )

    def test_recurring_reservation_rejects_past_repeat_until_date(self):
        with self.assertRaises(ValidationError):
            RecurringReservationCreate(
                resource_id=1,
                start_time=self.start_time,
                end_time=self.end_time,
                weekdays=[0],
                repeat_until=date(2099, 1, 4),
            )

    def test_reservation_update_accepts_partial_data(self):
        update = ReservationUpdate(start_time=self.start_time)

        self.assertEqual(update.start_time, self.start_time)
        self.assertIsNone(update.end_time)

    def test_reservation_update_rejects_reversed_times(self):
        with self.assertRaises(ValidationError):
            ReservationUpdate(
                start_time=self.end_time,
                end_time=self.start_time,
            )
