import pytest

@pytest.mark.asyncio
async def test_health_check_endpoint(client) -> None:
    """
    Test case verifying that GET /api/v1/health returns success status and database status online.
    """
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    
    data = response.json()
    assert data["status"] == "online"
    assert data["database"] == "online"
    assert "project" in data
