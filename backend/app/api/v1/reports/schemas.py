from pydantic import BaseModel, Field
from typing import Any

class ReportCreate(BaseModel):
    type: str = Field(..., max_length=50)  # pathology, radiology, lab
    gcs_uri: str = Field(..., max_length=500)

class ReportRead(BaseModel):
    id: int
    patient_id: int
    uploader_id: int
    type: str
    gcs_uri: str
    raw_text: str | None = None
    status: str

    class Config:
        from_attributes = True

class MedicalImageCreate(BaseModel):
    report_id: int | None = None
    image_type: str = Field(..., max_length=50)  # DICOM_placeholder, PNG, JPEG
    gcs_uri: str = Field(..., max_length=500)
    metadata: dict[str, Any] | None = None

class MedicalImageRead(BaseModel):
    id: int
    patient_id: int
    report_id: int | None
    image_type: str
    gcs_uri: str
    metadata: dict[str, Any] | None

    class Config:
        from_attributes = True

class DocumentCreate(BaseModel):
    doc_type: str = Field(..., max_length=50)  # consent, referral, id_proof
    gcs_uri: str = Field(..., max_length=500)

class DocumentRead(BaseModel):
    id: int
    patient_id: int
    doc_type: str
    gcs_uri: str

    class Config:
        from_attributes = True
