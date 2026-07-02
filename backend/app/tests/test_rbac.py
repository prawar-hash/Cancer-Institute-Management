import pytest
import datetime
from fastapi import status
from app.main import app
from app.db.session import get_db
from app.core import security
from app.models.user import User
from app.models.patient import Patient, PatientContact

# Mock Users
SUPER_ADMIN = User(id=1, email="super@fake.org", hashed_password="pw", role="super_admin", status="active")
ADMIN = User(id=2, email="admin@fake.org", hashed_password="pw", role="admin", status="active")
STUDENT = User(id=3, email="student@fake.org", hashed_password="pw", role="student", status="active")

# Mock Patient
MOCK_PATIENT = Patient(
    id=10,
    mrn="MRN-99887",
    first_name="John",
    last_name="Smith",
    birth_date=datetime.date(1980, 5, 20),
    gender="M",
    status="active",
    contacts=[
        PatientContact(id=22, patient_id=10, contact_name="Jane Smith", relationship_type="Spouse", phone="555-0011")
    ]
)

@pytest.mark.asyncio
async def test_admin_receives_full_pii(client) -> None:
    """Verifies that admins retrieve complete, unmasked patient demographics and contacts."""
    token = security.create_access_token(subject=ADMIN.id)
    
    async def override_get_db():
        class MockSession:
            async def execute(self, query):
                class MockResult:
                    def scalar_one_or_none(self):
                        # Query matches user or patient select
                        query_str = str(query)
                        if "users" in query_str:
                            return ADMIN
                        elif "patients" in query_str:
                            return MOCK_PATIENT
                        return None
                return MockResult()
            async def close(self): pass
        yield MockSession()

    app.dependency_overrides[get_db] = override_get_db

    headers = {"Authorization": f"Bearer {token}"}
    response = await client.get("/api/v1/patients/10", headers=headers)
    assert response.status_code == 200
    
    data = response.json()
    assert data["first_name"] == "John"
    assert data["last_name"] == "Smith"
    assert data["mrn"] == "MRN-99887"
    assert len(data["contacts"]) == 1
    assert data["contacts"][0]["contact_name"] == "Jane Smith"


@pytest.mark.asyncio
async def test_student_receives_anonymized_patient(client) -> None:
    """Verifies that students receive masked patient data with empty contacts list."""
    token = security.create_access_token(subject=STUDENT.id)
    
    async def override_get_db():
        class MockSession:
            async def execute(self, query):
                class MockResult:
                    def scalar_one_or_none(self):
                        query_str = str(query)
                        if "users" in query_str:
                            return STUDENT
                        elif "patients" in query_str:
                            return MOCK_PATIENT
                        return None
                return MockResult()
            async def close(self): pass
        yield MockSession()

    app.dependency_overrides[get_db] = override_get_db

    headers = {"Authorization": f"Bearer {token}"}
    response = await client.get("/api/v1/patients/10", headers=headers)
    assert response.status_code == 200
    
    data = response.json()
    assert data["first_name"] == "Anonymized"
    assert data["last_name"] == "Patient_10"
    assert data["mrn"] == "MRN-XXXXX"
    # Contacts list should be completely stripped/omitted
    assert len(data["contacts"]) == 0


@pytest.mark.asyncio
async def test_admin_cannot_access_user_registration(client) -> None:
    """Verifies that admins receive HTTP 403 Forbidden when trying to access user management."""
    token = security.create_access_token(subject=ADMIN.id)
    
    async def override_get_db():
        class MockSession:
            async def execute(self, query):
                class MockResult:
                    def scalar_one_or_none(self):
                        return ADMIN
                return MockResult()
            async def close(self): pass
        yield MockSession()

    app.dependency_overrides[get_db] = override_get_db

    headers = {"Authorization": f"Bearer {token}"}
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": "newadmin@fake.org", "password": "SecurePassword123!", "role": "admin"},
        headers=headers
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized to perform this action"


@pytest.mark.asyncio
async def test_super_admin_can_register_user(client) -> None:
    """Verifies that super admin can successfully register new users."""
    token = security.create_access_token(subject=SUPER_ADMIN.id)
    
    async def override_get_db():
        class MockSession:
            def add(self, obj): pass
            async def commit(self): pass
            async def refresh(self, obj):
                obj.id = 99
            async def execute(self, query):
                class MockResult:
                    def scalar_one_or_none(self):
                        # On user query (get current user), return SUPER_ADMIN
                        # On email check query, return None (email is unique)
                        query_str = str(query)
                        if "users.id ==" in query_str:
                            return SUPER_ADMIN
                        return None
                return MockResult()
            async def close(self): pass
        yield MockSession()

    app.dependency_overrides[get_db] = override_get_db

    headers = {"Authorization": f"Bearer {token}"}
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": "newadmin@fake.org", "password": "SecurePassword123!", "role": "admin"},
        headers=headers
    )
    assert response.status_code == 201
    assert response.json()["email"] == "newadmin@fake.org"
