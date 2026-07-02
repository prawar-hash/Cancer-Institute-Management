import datetime
from pydantic import BaseModel, Field, model_validator
from typing import Any

class MedicalHistoryCreate(BaseModel):
    conditions: list[str] | None = None
    surgeries: list[str] | None = None
    family_history: dict[str, Any] | None = None
    allergies: list[str] | None = None

class MedicalHistoryRead(BaseModel):
    id: int
    patient_id: int
    conditions: list[str] | None = None
    surgeries: list[str] | None = None
    family_history: dict[str, Any] | None = None
    allergies: list[str] | None = None

    class Config:
        from_attributes = True

class CancerStageCreate(BaseModel):
    system: str = Field(..., max_length=50)
    t_stage: str | None = Field(None, max_length=10)
    n_stage: str | None = Field(None, max_length=10)
    m_stage: str | None = Field(None, max_length=10)
    group_stage: str = Field(..., max_length=10)

class CancerStageRead(BaseModel):
    id: int
    system: str
    t_stage: str | None
    n_stage: str | None
    m_stage: str | None
    group_stage: str
    staged_by: int

    class Config:
        from_attributes = True

class DiagnosisCreate(BaseModel):
    primary_site: str = Field(..., max_length=255)
    histology: str = Field(..., max_length=255)
    diagnosis_date: datetime.date
    staging_id: int | None = None

class DiagnosisRead(BaseModel):
    id: int
    patient_id: int
    primary_site: str
    histology: str
    diagnosis_date: datetime.date
    staging_id: int | None

    class Config:
        from_attributes = True

class TreatmentCreate(BaseModel):
    type: str = Field(..., max_length=50)  # surgery, chemo, radiation, immunotherapy, targeted
    status: str = Field(default="scheduled", max_length=50)
    start_date: datetime.date
    end_date: datetime.date | None = None
    doctor_id: int
    details: dict[str, Any] | None = None

    @model_validator(mode="before")
    @classmethod
    def enforce_no_dose_monitoring(cls, data: Any) -> Any:
        """
        Enforces the project constraint that NO radiation dose tracking or monitoring
        parameters can be defined in the treatment details metadata.
        """
        if isinstance(data, dict):
            t_type = data.get("type", "").lower()
            details = data.get("details")
            if t_type == "radiation" and isinstance(details, dict):
                # Restrict keys that imply radiation tracking or dose calculations
                banned_keys = {
                    "dose", "dose_gy", "cumulative_dose", "gy_delivered", 
                    "fractionation", "dose_tracking", "dose_monitoring"
                }
                found_banned = banned_keys.intersection(k.lower() for k in details.keys())
                if found_banned:
                    raise ValueError(
                        f"Radiation dose tracking or monitoring fields are explicitly out of scope: {found_banned}"
                    )
        return data

class TreatmentRead(BaseModel):
    id: int
    patient_id: int
    type: str
    status: str
    start_date: datetime.date
    end_date: datetime.date | None
    doctor_id: int
    details: dict[str, Any] | None

    class Config:
        from_attributes = True

class PrescriptionCreate(BaseModel):
    medication: str = Field(..., max_length=255)
    dosage: str = Field(..., max_length=100)
    frequency: str = Field(..., max_length=100)
    start_date: datetime.date
    end_date: datetime.date

class PrescriptionRead(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    medication: str
    dosage: str
    frequency: str
    start_date: datetime.date
    end_date: datetime.date
    status: str

    class Config:
        from_attributes = True

class AppointmentCreate(BaseModel):
    doctor_id: int
    appointment_date: datetime.datetime
    reason: str = Field(..., max_length=500)

class AppointmentRead(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    appointment_date: datetime.datetime
    reason: str
    status: str

    class Config:
        from_attributes = True

class FollowUpCreate(BaseModel):
    doctor_id: int
    schedule_date: datetime.datetime
    notes: str | None = None

class FollowUpRead(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    schedule_date: datetime.datetime
    status: str
    notes: str | None

    class Config:
        from_attributes = True


class DoctorNoteCreate(BaseModel):
    note_text: str
    note_type: str = Field(default="clinical", max_length=50)


class DoctorNoteRead(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    note_text: str
    note_type: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True
