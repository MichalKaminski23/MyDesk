import os


os.environ.update(
    {
        "DATABASE_URL": "sqlite://",
        "SECRET_KEY": "mydesk-test-key",
        "ALGORITHM": "HS256",
        "ACCESS_TOKEN_EXPIRE_MINUTES": "30",
        "ALLOWED_ORIGINS": "http://localhost",
    }
)
