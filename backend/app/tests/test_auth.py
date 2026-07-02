import pytest
from fastapi import status
from app.main import app
from app.db.session import get_db
from app.core import security
from app.models.user import User

# Create a mock user for login testing
MOCK_USER = User(
    id=1,
    email="test@fake-institute.org",
    hashed_password=security.hash_password("SecurePw123!"),
    role="admin",
    status="active"
)

@pytest.mark.asyncio
async def test_auth_login_success(client) -> None:
    """Verifies that login with valid credentials returns a JWT and sets refresh cookie."""
    async def override_get_db():
        class MockSession:
            async def execute(self, query):
                class MockResult:
                    def scalar_one_or_none(self):
                        return MOCK_USER
                return MockResult()
            async def close(self): pass
        yield MockSession()

    app.dependency_overrides[get_db] = override_get_db

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "test@fake-institute.org", "password": "SecurePw123!"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "refresh_token" in response.cookies


@pytest.mark.asyncio
async def test_auth_login_invalid_password(client) -> None:
    """Verifies that login with invalid password yields HTTP 400."""
    async def override_get_db():
        class MockSession:
            async def execute(self, query):
                class MockResult:
                    def scalar_one_or_none(self):
                        return MOCK_USER
                return MockResult()
            async def close(self): pass
        yield MockSession()

    app.dependency_overrides[get_db] = override_get_db

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "test@fake-institute.org", "password": "WrongPassword!"}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Incorrect email or password"


@pytest.mark.asyncio
async def test_auth_refresh_tokens(client) -> None:
    """Verifies refresh token rotation (RTR) and access token issuance."""
    # Generate mock refresh token
    refresh_token = security.create_refresh_token(subject=1)
    
    async def override_get_db():
        class MockSession:
            async def execute(self, query):
                class MockResult:
                    def scalar_one_or_none(self):
                        return MOCK_USER
                return MockResult()
            async def close(self): pass
        yield MockSession()

    app.dependency_overrides[get_db] = override_get_db
    client.cookies.set("refresh_token", refresh_token)

    response = await client.post("/api/v1/auth/refresh")
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in response.cookies


@pytest.mark.asyncio
async def test_auth_logout_clears_cookie(client) -> None:
    """Verifies logout endpoint deletes the refresh token cookie."""
    client.cookies.set("refresh_token", "dummy_token")
    
    response = await client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    # Cookie should be deleted (max_age/expires set to past, or value cleared)
    assert client.cookies.get("refresh_token") is None
