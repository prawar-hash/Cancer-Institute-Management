import datetime
from pydantic import BaseModel, Field

class PatientContactRead(BaseModel):
    """Schema for returning emergency contact data."""
    id: int
    patient_id: int
    contact_name: str
    relationship_type: str
    phone: str | None = None
    email: str | None = None
    address: str | None = None

    class Config:
        from_attributes = True

class PatientCreate(BaseModel):
    """Schema for registering a new patient record."""
    mrn: str = Field(..., max_length=100)
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    birth_date: datetime.date
    gender: str = Field(..., max_length=10)  # M, F, O
    status: str = Field(default="active", max_length=50)

class PatientRead(BaseModel):
    """
    Schema representing patient demographic responses.
    Implements role-based PII anonymization.
    """
    id: int
    mrn: str
    first_name: str
    last_name: str
    birth_date: datetime.date
    gender: str
    status: str
    contacts: list[PatientContactRead] = []

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_role(cls, obj, role: str) -> "PatientRead":
        """
        Custom serializer factory that automatically anonymizes PII data fields
        if the current user's role is 'student'.
        """
        # Convert ORM object to base pydantic schema
        data = cls.from_attributes(obj)
        
        if role == "student":
            # Mask identifying attributes
            data.first_name = "Anonymized"
            data.last_name = f"Patient_{obj.id}"
            data.mrn = "MRN-XXXXX"
            # Omit emergency contact information entirely
            data.contacts = []
            
        return data

class PatientListResponse(BaseModel):
    """Schema representing paginated patient responses."""
    total: int
    page: int
    page_size: int
    patients: list[PatientRead]
