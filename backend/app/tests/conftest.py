import pytest
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.session import get_db

# Override database dependency with a mock session for unit tests
async def override_get_db() -> AsyncGenerator:
    class MockSession:
        async def execute(self, query):
            # Return dummy result for SELECT 1 query
            class MockResult:
                def all(self):
                    return [(1,)]
            return MockResult()
        
        async def close(self) -> None:
            pass
            
    yield MockSession()

# Apply the override
app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session")
def event_loop():
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """
    Yields an HTTPX AsyncClient for FastAPI endpoint testing.
    """
    async with AsyncClient(
        transport=ASGITransport(app=app), 
        base_url="http://testserver"
    ) as ac:
        yield ac
