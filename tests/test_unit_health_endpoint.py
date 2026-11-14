from unittest import TestCase

from fastapi.testclient import TestClient

from app.main import app


class HealthEndpointUnitTest(TestCase):
    def test_endpoint_health_get_returns_ok(self):
        client = TestClient(app)
        try:
            response = client.get("/health")
        finally:
            client.close()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})
