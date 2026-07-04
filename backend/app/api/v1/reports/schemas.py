from pydantic import BaseModel, Field
from typing import Any

class ReportCreate(BaseModel):
    type: str = Field(..., max_length=50)  # pathology, radiology, lab
    file_url: str = Field(..., max_length=500)

class ReportRead(BaseModel):
    id: int
    patient_id: int
    uploader_id: int
    type: str
    file_url: str
    raw_text: str | None = None
    status: str

    class Config:
        from_attributes = True

class MedicalImageCreate(BaseModel):
    report_id: int | None = None
    image_type: str = Field(..., max_length=50)  # DICOM_placeholder, PNG, JPEG
    file_url: str = Field(..., max_length=500)
    metadata: dict[str, Any] | None = None

class MedicalImageRead(BaseModel):
    id: int
    patient_id: int
    report_id: int | None
    image_type: str
    file_url: str
    metadata: dict[str, Any] | None

    class Config:
        from_attributes = True

class DocumentCreate(BaseModel):
    doc_type: str = Field(..., max_length=50)  # consent, referral, id_proof
    file_url: str = Field(..., max_length=500)

class DocumentRead(BaseModel):
    id: int
    patient_id: int
    doc_type: str
    file_url: str

    class Config:
        from_attributes = True
