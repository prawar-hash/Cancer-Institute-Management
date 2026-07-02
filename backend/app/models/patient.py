import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Date, ForeignKey
from .base import Base

class Patient(Base):
    """
    Patient demographic and clinical status record.
    """
    __tablename__ = "patients"

    mrn: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    birth_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    gender: Mapped[str] = mapped_column(String(10), nullable=False)  # M, F, O
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)  # active, inactive, deceased

    # Relationships
    contacts: Mapped[list["PatientContact"]] = relationship(
        "PatientContact", 
        back_populates="patient", 
        cascade="all, delete-orphan"
    )

class PatientContact(Base):
    """
    Contact details for patient's guardian, emergency contact, or next of kin.
    """
    __tablename__ = "patient_contacts"

    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    contact_name: Mapped[str] = mapped_column(String(255), nullable=False)
    relationship_type: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=True)
    email: Mapped[str] = mapped_column(String(255), nullable=True)
    address: Mapped[str] = mapped_column(String(500), nullable=True)

    # Relationships
    patient: Mapped["Patient"] = relationship("Patient", back_populates="contacts")