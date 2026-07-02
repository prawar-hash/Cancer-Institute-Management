import pytest
from unittest.mock import patch, MagicMock
from fastapi import status
from app.main import app
from app.db.session import get_db
from app.core import security
from app.models.user import User
from app.models.document import Report, MedicalImage

# Mock Doctor User
MOCK_DOCTOR = User(id=10, email="doctor@fake-institute.org", role="admin", status="active")

@pytest.mark.asyncio
@patch("app.api.v1.reports.routes.gcs_client")
async def test_upload_valid_pdf_report(mock_gcs, client) -> None:
    """Verifies that uploading a valid PDF document succeeds and saves a Report metadata record."""
    # Mock GCS upload return value
    mock_gcs.get_scoped_path.return_value = "patients/1/reports/blood_test.pdf"
    mock_gcs.upload_file_object.return_value = "gs://fake-bucket/patients/1/reports/blood_test.pdf"
    
    token = security.create_access_token(subject=MOCK_DOCTOR.id)
    
    async def override_get_db():
        class MockSession:
            def add(self, obj):
                if isinstance(obj, Report):
                    obj.id = 100
            async def commit(self): pass
            async def refresh(self, obj): pass
            async def execute(self, query):
                class MockResult:
                    def scalar_one_or_none(self):
                        return MOCK_DOCTOR
                return MockResult()
            async def close(self): pass
        yield MockSession()

    app.dependency_overrides[get_db] = override_get_db
    
    headers = {"Authorization": f"Bearer {token}"}
    files = {"file": ("blood_test.pdf", b"Dummy PDF file content", "application/pdf")}
    
    response = await client.post("/api/v1/patients/1/upload-file", files=files, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pending"
    assert data["type"] == "pathology"
    assert "gcs_uri" in data
    assert "blood_test.pdf" in data["gcs_uri"]


@pytest.mark.asyncio
@patch("app.api.v1.reports.routes.gcs_client")
async def test_upload_valid_dicom_image(mock_gcs, client) -> None:
    """Verifies that uploading a DICOM file saves a MedicalImage with unsupported format flags."""
    mock_gcs.get_scoped_path.return_value = "patients/1/images/scan.dcm"
    mock_gcs.upload_file_object.return_value = "gs://fake-bucket/patients/1/images/scan.dcm"
    
    token = security.create_access_token(subject=MOCK_DOCTOR.id)
    
    async def override_get_db():
        class MockSession:
            def add(self, obj):
                if isinstance(obj, MedicalImage):
                    obj.id = 200
            async def commit(self): pass
            async def refresh(self, obj): pass
            async def execute(self, query):
                class MockResult:
                    def scalar_one_or_none(self):
                        return MOCK_DOCTOR
                return MockResult()
            async def close(self): pass
        yield MockSession()

    app.dependency_overrides[get_db] = override_get_db
    
    headers = {"Authorization": f"Bearer {token}"}
    files = {"file": ("scan.dcm", b"DICOM fake binary header...", "application/dicom")}
    
    response = await client.post("/api/v1/patients/1/upload-file", files=files, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["image_type"] == "DICOM_placeholder"
    assert data["metadata"]["image_processing"] == "unsupported format (DICOM placeholder)"


@pytest.mark.asyncio
async def test_upload_invalid_extension(client) -> None:
    """Verifies that uploading an executable file gets blocked by server-side validation."""
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
    files = {"file": ("malicious.exe", b"binary payload", "application/octet-stream")}
    
    response = await client.post("/api/v1/patients/1/upload-file", files=files, headers=headers)
    assert response.status_code == 400
    assert "not supported" in response.json()["detail"]


@pytest.mark.asyncio
async def test_upload_size_limit_check(client) -> None:
    """Verifies that uploading files exceeding 10MB limit triggers HTTP 400."""
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
    # Create large fake binary (11 Megabytes)
    large_payload = b"x" * (11 * 1024 * 1024)
    files = {"file": ("large_report.pdf", large_payload, "application/pdf")}
    
    response = await client.post("/api/v1/patients/1/upload-file", files=files, headers=headers)
    assert response.status_code == 400
    assert "exceeds maximum allowed size" in response.json()["detail"]


@pytest.mark.asyncio
async def test_upload_mismatched_mime_type(client) -> None:
    """Verifies that mismatched extension and MIME content-types are rejected."""
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
    # Upload PDF extension with HTML MIME type
    files = {"file": ("report.pdf", b"<html></html>", "text/html")}
    
    response = await client.post("/api/v1/patients/1/upload-file", files=files, headers=headers)
    assert response.status_code == 400
    assert "does not match file extension" in response.json()["detail"]
