import pytest
import datetime
from fastapi import status
from app.main import app
from app.db.session import get_db
from app.core import security
from app.models.user import User
from app.models.patient import Patient
from app.models.clinical import Treatment
from app.models.audit import AuditLog

# Mock Attending Doctor
MOCK_DOCTOR = User(id=10, email="doctor@fake.org", role="admin", status="active")

# Mock patients list
MOCK_PATIENTS = [
    Patient(id=1, mrn="MRN-001", first_name="Alice", last_name="Brown", birth_date=datetime.date(1985, 3, 10), gender="F", status="active", contacts=[]),
    Patient(id=2, mrn="MRN-002", first_name="Charlie", last_name="Green", birth_date=datetime.date(1960, 7, 22), gender="M", status="active", contacts=[]),
]

@pytest.mark.asyncio
async def test_patients_list_filters_compilation(client) -> None:
    """Verifies that the patient list endpoint parses filtering arguments and returns data."""
    token = security.create_access_token(subject=MOCK_DOCTOR.id)
    
    async def override_get_db():
        class MockSession:
            async def execute(self, query):
                class MockResult:
                    def scalar(self):
                        return 2
                    def scalars(self):
                        class MockUnique:
                            def unique(self):
                                return MOCK_PATIENTS
                        return MockUnique()
                return MockResult()
            async def close(self): pass
        yield MockSession()

    app.dependency_overrides[get_db] = override_get_db

    headers = {"Authorization": f"Bearer {token}"}
    # Query with extensive filters
    params = {
        "q": "Alice",
        "gender": "F",
        "status": "active",
        "age_min": 30,
        "age_max": 50,
        "sort_by": "last_name",
        "sort_order": "asc",
        "page": 1,
        "page_size": 10
    }
    response = await client.get("/api/v1/patients", params=params, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["patients"]) == 2
    assert data["patients"][0]["first_name"] == "Alice"


@pytest.mark.asyncio
async def test_create_patient_writes_audit_log(client) -> None:
    """Verifies that creating a patient inserts a CREATE_PATIENT action into the audit logs."""
    token = security.create_access_token(subject=MOCK_DOCTOR.id)
    
    audit_logs_written = []
    
    async def override_get_db():
        class MockSession:
            def add(self, obj):
                if isinstance(obj, Patient):
                    obj.id = 55
                elif isinstance(obj, AuditLog):
                    audit_logs_written.append(obj)
            async def commit(self): pass
            async def refresh(self, obj): pass
            async def execute(self, query):
                class MockResult:
                    def scalar_one_or_none(self):
                        # Mock check that MRN doesn't already exist (return None)
                        # Mock check that user exists (return MOCK_DOCTOR)
                        query_str = str(query)
                        if "users" in query_str:
                            return MOCK_DOCTOR
                        return None
                return MockResult()
            async def close(self): pass
        yield MockSession()

    app.dependency_overrides[get_db] = override_get_db

    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "mrn": "MRN-99901",
        "first_name": "Test",
        "last_name": "Subject",
        "birth_date": "1990-01-01",
        "gender": "F",
        "status": "active"
    }
    response = await client.post("/api/v1/patients", json=payload, headers=headers)
    assert response.status_code == 201
    
    # Audit log should be written
    assert len(audit_logs_written) == 1
    assert audit_logs_written[0].action == "CREATE_PATIENT"
    assert audit_logs_written[0].target_table == "patients"


@pytest.mark.asyncio
async def test_treatment_validation_blocks_radiation_dose_monitoring(client) -> None:
    """Verifies that creating a radiation treatment fails if dose monitoring fields are provided."""
    token = security.create_access_token(subject=MOCK_DOCTOR.id)
    
    async def override_get_db():
        class MockSession:
            async def execute(self, query):
                class MockResult:
                    def scalar_one_or_none(self):
                        return MOCK_DOCTOR
                return MockResult()
            async def close(self): pass
        yield MockSession()

    app.dependency_overrides[get_db] = override_get_db

    headers = {"Authorization": f"Bearer {token}"}
    # Attempt payload containing forbidden dose tracking parameters
    payload = {
        "type": "radiation",
        "status": "scheduled",
        "start_date": "2025-06-01",
        "doctor_id": MOCK_DOCTOR.id,
        "details": {
            "modality": "EBRT",
            "dose_gy": 50.4,  # Banned: dose details tracking
            "cumulative_dose": "planned_50Gy"  # Banned: calculations tracking
        }
    }
    
    response = await client.post("/api/v1/patients/1/treatments", json=payload, headers=headers)
    assert response.status_code == 422  # Unprocessable Entity (Pydantic validation failure)
    errors = response.json()["detail"]
    assert any("Radiation dose tracking or monitoring fields are explicitly out of scope" in err["msg"] for err in errors)
