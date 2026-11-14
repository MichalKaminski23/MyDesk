from unittest import TestCase

from fastapi.testclient import TestClient

from app.main import app


class HealthEndpointTests(TestCase):
    def test_health_endpoint_returns_ok(self):
        with TestClient(app) as client:
            response = client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})
