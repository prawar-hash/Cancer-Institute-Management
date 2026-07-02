import datetime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, ForeignKey, Text, JSON, DateTime
from .base import Base

class Report(Base):
    """
    Uploaded clinical reports (pathology, lab, radiology) pending OCR processing.
    """
    __tablename__ = "reports"

    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    uploader_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # pathology, radiology, lab
    gcs_uri: Mapped[str] = mapped_column(String(500), nullable=False)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)  # Raw extracted OCR text
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)  # pending, processing, completed, failed


class MedicalImage(Base):
    """
    Oncology scans or medical images.
    If image format is DICOM, stores GCS link alongside image metadata.
    """
    __tablename__ = "medical_images"

    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    report_id: Mapped[int | None] = mapped_column(ForeignKey("reports.id", ondelete="SET NULL"), nullable=True)
    image_type: Mapped[str] = mapped_column(String(50), nullable=False)  # DICOM_placeholder, PNG, JPEG
    gcs_uri: Mapped[str] = mapped_column(String(500), nullable=False)
    file_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # DICOM header mappings, dimensions, tags


class Document(Base):
    """
    General files associated with a patient, e.g., signed consent forms or patient referrals.
    """
    __tablename__ = "documents"

    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    doc_type: Mapped[str] = mapped_column(String(50), nullable=False)  # consent, referral, id_proof
    gcs_uri: Mapped[str] = mapped_column(String(500), nullable=False)


class AiSummary(Base):
    """
    AI summaries generated for a specific medical report.
    """
    __tablename__ = "ai_summaries"

    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    report_id: Mapped[int] = mapped_column(ForeignKey("reports.id", ondelete="CASCADE"), unique=True, nullable=False)
    summary_text: Mapped[str] = mapped_column(Text, nullable=False)
    key_findings: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)  # JSON structures containing key findings


class ShareToken(Base):
    """
    HIPAA-compliant secure tokenized sharing links.
    """
    __tablename__ = "share_tokens"

    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    token: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    clicks: Mapped[int] = mapped_column(default=0, nullable=False)
