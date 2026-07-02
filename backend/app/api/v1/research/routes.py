from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from pydantic import BaseModel
import datetime

from app.core import permissions
from app.db.session import get_db
from app.models.user import User
from app.models.patient import Patient
from app.models.clinical import Treatment, Diagnosis, CancerStage
from app.models.research import ResearchDataset, ResearchDatasetAccess
from app.api.v1.auth.dependencies import require_permission
from app.services.audit import log_action

router = APIRouter(prefix="/api/v1/research", tags=["Research & Cohorts"])

class AccessRequestCreate(BaseModel):
    dataset_id: int

class ApprovalUpdate(BaseModel):
    status: str  # approved, denied

# 1. List Research Studies
@router.get("/datasets")
async def list_datasets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_PII_READ))
):
    """Lists oncology research dataset definitions."""
    result = await db.execute(select(ResearchDataset))
    return list(result.scalars().all())

# 2. Submit Data-Access Request (Student only / shared)
@router.post("/requests", status_code=status.HTTP_201_CREATED)
async def create_access_request(
    req: AccessRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_PII_READ))
):
    """Submits a new dataset access approval workflow entry."""
    # Check if dataset exists
    ds_res = await db.execute(select(ResearchDataset).where(ResearchDataset.id == req.dataset_id))
    if not ds_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Research dataset not found")

    # Check if request already exists
    exist_res = await db.execute(
        select(ResearchDatasetAccess).where(
            ResearchDatasetAccess.dataset_id == req.dataset_id,
            ResearchDatasetAccess.user_id == current_user.id
        )
    )
    if exist_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Access request already exists for this dataset")

    access_req = ResearchDatasetAccess(
        dataset_id=req.dataset_id,
        user_id=current_user.id,
        status="pending"
    )
    db.add(access_req)
    await db.commit()
    await db.refresh(access_req)

    await log_action(
        db=db, user_id=current_user.id, action="SUBMIT_RESEARCH_ACCESS",
        target_id=access_req.id, target_table="research_dataset_access",
        details={"dataset_id": req.dataset_id}
    )
    return access_req

# 3. List Data-Access Requests (Role-scoped)
@router.get("/requests")
async def list_access_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_PII_READ))
):
    """Lists workflow requests. Students list their own; admins audit all requests."""
    if current_user.role == "student":
        result = await db.execute(
            select(ResearchDatasetAccess).where(ResearchDatasetAccess.user_id == current_user.id)
        )
    else:
        result = await db.execute(select(ResearchDatasetAccess))
    return list(result.scalars().all())

# 4. Approve/Deny Access Request (Admin only)
@router.put("/requests/{request_id}/approve")
async def approve_access_request(
    request_id: int,
    body: ApprovalUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_MANAGE))
):
    """Reviews and updates access status (approved or denied) by an administrator."""
    if body.status not in ["approved", "denied"]:
        raise HTTPException(status_code=400, detail="Invalid approval status")

    result = await db.execute(select(ResearchDatasetAccess).where(ResearchDatasetAccess.id == request_id))
    access_req = result.scalar_one_or_none()
    if not access_req:
        raise HTTPException(status_code=404, detail="Access request not found")

    access_req.status = body.status
    access_req.approved_by = current_user.id
    await db.commit()

    await log_action(
        db=db, user_id=current_user.id, action="REVIEW_RESEARCH_ACCESS",
        target_id=access_req.id, target_table="research_dataset_access",
        details={"status": body.status, "student_id": access_req.user_id}
    )
    return access_req

# 5. Cohort Registry Explorer (Anonymization Validation)
@router.get("/cohort")
async def explore_cohort(
    gender: str | None = None,
    stage: str | None = None,
    treatment_type: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_PII_READ))
):
    """
    Cohort browser filtering patients.
    Strips and masks PII details for student roles to enforce data compliance boundaries.
    """
    query = select(Patient)
    
    # Filter by gender
    if gender:
        query = query.where(Patient.gender == gender)

    # Filter by treatment type
    if treatment_type:
        query = query.join(Treatment).where(Treatment.type == treatment_type)

    # Filter by cancer stage (joining cancer stage records)
    if stage:
        query = query.join(Diagnosis).join(CancerStage).where(CancerStage.group_stage == stage)

    result = await db.execute(query.distinct())
    patients = result.scalars().all()

    # Apply data masking for student roles
    if current_user.role == "student":
        return [
            {
                "id": p.id,
                "first_name": "Anonymized",
                "last_name": f"Patient_{p.id}",
                "mrn": "MRN-XXXXX",
                "birth_date": str(p.birth_date),
                "gender": p.gender,
                "status": p.status,
                "contacts": []  # Strip emergency contacts
            } for p in patients
        ]

    # Full data for admins
    return [
        {
            "id": p.id,
            "first_name": p.first_name,
            "last_name": p.last_name,
            "mrn": p.mrn,
            "birth_date": str(p.birth_date),
            "gender": p.gender,
            "status": p.status,
            "contacts": []
        } for p in patients
    ]
