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
    def test_unit_schema_user_create_valid_data_is_accepted(self):
        user = UserCreate(
            email="anna.nowak@example.com",
            name="Anna",
            surname="Nowak",
            phone_number="123456789",
            password="Secure123!",
        )

        self.assertEqual(user.email, "anna.nowak@example.com")
        self.assertEqual(user.password, "Secure123!")

    def test_unit_schema_user_create_invalid_email_is_rejected(self):
        with self.assertRaises(ValidationError):
            UserCreate(
                email="not-an-email",
                name="Anna",
                surname="Nowak",
                phone_number="123456789",
                password="Secure123!",
            )

    def test_unit_schema_user_create_short_password_is_rejected(self):
        with self.assertRaises(ValidationError):
            UserCreate(
                email="anna.nowak@example.com",
                name="Anna",
                surname="Nowak",
                phone_number="123456789",
                password="short",
            )

    def test_unit_schema_user_create_weak_password_is_rejected(self):
        with self.assertRaises(ValidationError):
            UserCreate(
                email="anna.nowak@example.com",
                name="Anna",
                surname="Nowak",
                phone_number="123456789",
                password="passwordonly",
            )

    def test_unit_schema_user_create_unknown_fields_are_rejected(self):
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
    def test_unit_schema_resource_create_defaults_are_applied(self):
        resource = ResourceCreate(name="Desk A1", type="desk")

        self.assertEqual(resource.capacity, 1)
        self.assertEqual(resource.location, "Floor 1")

    def test_unit_schema_resource_create_unknown_type_is_rejected(self):
        with self.assertRaises(ValidationError):
            ResourceCreate(name="Desk A1", type="parking")

    def test_unit_schema_resource_create_non_positive_capacity_is_rejected(self):
        with self.assertRaises(ValidationError):
            ResourceCreate(name="Desk A1", type="desk", capacity=0)


class ReservationSchemaUnitTests(TestCase):
    def setUp(self):
        self.start_time = datetime(2099, 1, 5, 9)
        self.end_time = datetime(2099, 1, 5, 11)

    def test_unit_schema_reservation_create_chronological_times_are_accepted(self):
        reservation = ReservationCreate(
            resource_id=1,
            start_time=self.start_time,
            end_time=self.end_time,
        )

        self.assertEqual(reservation.resource_id, 1)

    def test_unit_schema_reservation_create_equal_times_are_rejected(self):
        with self.assertRaises(ValidationError):
            ReservationCreate(
                resource_id=1,
                start_time=self.start_time,
                end_time=self.start_time,
            )

    def test_unit_schema_reservation_create_non_positive_resource_id_is_rejected(self):
        with self.assertRaises(ValidationError):
            ReservationCreate(
                resource_id=0,
                start_time=self.start_time,
                end_time=self.end_time,
            )

    def test_unit_schema_recurring_reservation_unique_weekdays_are_accepted(self):
        reservation = RecurringReservationCreate(
            resource_id=1,
            start_time=self.start_time,
            end_time=self.end_time,
            weekdays=[0, 2, 4],
            repeat_until=date(2099, 1, 31),
        )

        self.assertEqual(reservation.weekdays, [0, 2, 4])

    def test_unit_schema_recurring_reservation_invalid_weekday_is_rejected(self):
        with self.assertRaises(ValidationError):
            RecurringReservationCreate(
                resource_id=1,
                start_time=self.start_time,
                end_time=self.end_time,
                weekdays=[7],
                repeat_until=date(2099, 1, 31),
            )

    def test_unit_schema_recurring_reservation_duplicate_weekdays_are_rejected(self):
        with self.assertRaises(ValidationError):
            RecurringReservationCreate(
                resource_id=1,
                start_time=self.start_time,
                end_time=self.end_time,
                weekdays=[0, 0],
                repeat_until=date(2099, 1, 31),
            )

    def test_unit_schema_recurring_reservation_past_repeat_until_date_is_rejected(self):
        with self.assertRaises(ValidationError):
            RecurringReservationCreate(
                resource_id=1,
                start_time=self.start_time,
                end_time=self.end_time,
                weekdays=[0],
                repeat_until=date(2099, 1, 4),
            )

    def test_unit_schema_reservation_update_partial_data_is_accepted(self):
        update = ReservationUpdate(start_time=self.start_time)

        self.assertEqual(update.start_time, self.start_time)
        self.assertIsNone(update.end_time)

    def test_unit_schema_reservation_update_reversed_times_are_rejected(self):
        with self.assertRaises(ValidationError):
            ReservationUpdate(
                start_time=self.end_time,
                end_time=self.start_time,
            )
