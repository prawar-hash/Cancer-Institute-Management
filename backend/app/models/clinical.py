import datetime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Date, ForeignKey, Text, JSON, DateTime
from .base import Base

class MedicalHistory(Base):
    """
    Patient history details stored in structured JSON structures.
    """
    __tablename__ = "medical_history"

    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    conditions: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)  # List of current comorbidities
    surgeries: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)   # Past surgical procedures
    family_history: Mapped[dict | None] = mapped_column(JSON, nullable=True)      # Family history trees
    allergies: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)   # Allergies list


class CancerStage(Base):
    """
    Staging metrics (TNM/FIGO/AnnArbor) defined for oncology diagnoses.
    """
    __tablename__ = "cancer_stages"

    system: Mapped[str] = mapped_column(String(50), nullable=False)  # TNM, FIGO, AnnArbor
    t_stage: Mapped[str] = mapped_column(String(10), nullable=True)
    n_stage: Mapped[str] = mapped_column(String(10), nullable=True)
    m_stage: Mapped[str] = mapped_column(String(10), nullable=True)
    group_stage: Mapped[str] = mapped_column(String(10), nullable=False)  # I, II, III, IV, etc.
    staged_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)


class Diagnosis(Base):
    """
    Patient oncology diagnosis, linked to staging details.
    """
    __tablename__ = "diagnoses"

    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    primary_site: Mapped[str] = mapped_column(String(255), nullable=False)
    histology: Mapped[str] = mapped_column(String(255), nullable=False)
    diagnosis_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    staging_id: Mapped[int | None] = mapped_column(ForeignKey("cancer_stages.id", ondelete="SET NULL"), nullable=True)


class Treatment(Base):
    """
    Patient treatment record.
    Uses polymorphic Details column for sub-type regimens (Surgery, Chemo, Radiation, etc.).
    
    CRITICAL CONSTRAINT: NO radiation-dose-monitoring calculations or tracking metrics are stored.
    """
    __tablename__ = "treatments"

    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # surgery, chemo, radiation, immunotherapy, targeted
    status: Mapped[str] = mapped_column(String(50), default="scheduled", nullable=False)  # scheduled, ongoing, completed, suspended
    start_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    end_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # Regimen details (drugs, dates, surgery margins)


class DoctorNotes(Base):
    """
    Clinician logs, notes, or patient research observations.
    """
    __tablename__ = "doctor_notes"

    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    note_text: Mapped[str] = mapped_column(Text, nullable=False)
    note_type: Mapped[str] = mapped_column(String(50), default="clinical", nullable=False)  # clinical, surgical, research


class Prescription(Base):
    """
    Medication prescription details.
    """
    __tablename__ = "prescriptions"

    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    medication: Mapped[str] = mapped_column(String(255), nullable=False)
    dosage: Mapped[str] = mapped_column(String(100), nullable=False)
    frequency: Mapped[str] = mapped_column(String(100), nullable=False)
    start_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    end_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)  # active, completed, discontinued


class Appointment(Base):
    """
    Patient scheduling and visit reasons.
    """
    __tablename__ = "appointments"

    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    appointment_date: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reason: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="scheduled", nullable=False)  # scheduled, completed, cancelled, no_show


class FollowUp(Base):
    """
    Oncology monitoring, checkup dates, and follow-up schedules.
    """
    __tablename__ = "follow_ups"

    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    schedule_date: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)  # pending, completed, missed
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
