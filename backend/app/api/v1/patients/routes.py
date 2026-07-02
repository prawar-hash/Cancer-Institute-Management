import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core import permissions
from app.db.session import get_db
from app.models.patient import Patient
from app.models.user import User
from app.api.v1.patients.schemas import PatientRead, PatientCreate, PatientListResponse
from app.api.v1.auth.dependencies import get_current_user, require_permission
from app.services.patient import get_patients_list
from app.services.audit import log_action

router = APIRouter(prefix="/api/v1/patients", tags=["Patients"])

@router.get("", response_model=PatientListResponse)
async def list_patients(
    db: AsyncSession = Depends(get_db),
    q: str | None = Query(None, description="Search query matching name/MRN"),
    gender: str | None = Query(None, description="Filter by gender (M/F/O)"),
    status: str | None = Query(None, description="Filter by patient status"),
    cancer_type: str | None = Query(None, description="Filter by diagnosis primary site"),
    stage: str | None = Query(None, description="Filter by cancer group stage (I-IV)"),
    treatment_type: str | None = Query(None, description="Filter by treatment modality"),
    doctor_id: int | None = Query(None, description="Filter by attending doctor ID"),
    age_min: int | None = Query(None, description="Filter by minimum age"),
    age_max: int | None = Query(None, description="Filter by maximum age"),
    diag_date_start: datetime.date | None = Query(None, description="Diagnosis date start range"),
    diag_date_end: datetime.date | None = Query(None, description="Diagnosis date end range"),
    sort_by: str = Query("last_name", description="Field to sort by (first_name, last_name, mrn, birth_date)"),
    sort_order: str = Query("asc", description="Sorting direction (asc/desc)"),
    page: int = Query(1, ge=1, description="Page index"),
    page_size: int = Query(20, ge=1, le=100, description="Page size limit"),
    current_user: User = Depends(require_permission(permissions.PATIENT_READ))
):
    """
    Lists patient records with support for advanced filtering, text searches,
    sorting, and pagination. Overwrites PII fields automatically for students.
    """
    patients, total = await get_patients_list(
        db=db,
        q=q,
        gender=gender,
        status=status,
        cancer_type=cancer_type,
        stage=stage,
        treatment_type=treatment_type,
        doctor_id=doctor_id,
        age_min=age_min,
        age_max=age_max,
        diag_date_start=diag_date_start,
        diag_date_end=diag_date_end,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size
    )

    # Anonymize each item returned based on requesting role
    serialized_patients = [
        PatientRead.from_orm_with_role(patient, current_user.role) 
        for patient in patients
    ]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "patients": serialized_patients
    }

@router.post("", response_model=PatientRead, status_code=status.HTTP_201_CREATED)
async def create_patient(
    patient_in: PatientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_MANAGE))
):
    """
    Registers a new patient in the institute.
    Restricted to Admins / Super Admins. Logs write in Audit logs.
    """
    # Check uniqueness of MRN
    result = await db.execute(select(Patient).where(Patient.mrn == patient_in.mrn))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A patient with this MRN already exists"
        )

    patient = Patient(
        mrn=patient_in.mrn,
        first_name=patient_in.first_name,
        last_name=patient_in.last_name,
        birth_date=patient_in.birth_date,
        gender=patient_in.gender,
        status=patient_in.status
    )
    db.add(patient)
    await db.commit()
    await db.refresh(patient)

    # Write audit log
    await log_action(
        db=db,
        user_id=current_user.id,
        action="CREATE_PATIENT",
        target_id=patient.id,
        target_table="patients",
        details={"mrn": patient.mrn, "last_name": patient.last_name}
    )

    return PatientRead.from_orm_with_role(patient, current_user.role)

@router.get("/{patient_id}", response_model=PatientRead)
async def get_patient(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_READ))
):
    """
    Retrieves patient details by ID.
    Access is open to admins (full PII) and students (PII anonymized).
    """
    result = await db.execute(
        select(Patient)
        .where(Patient.id == patient_id, Patient.deleted_at.is_(None))
        .options(selectinload(Patient.contacts))
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    return PatientRead.from_orm_with_role(patient, current_user.role)
