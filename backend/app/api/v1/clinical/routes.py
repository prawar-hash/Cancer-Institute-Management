from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core import permissions
from app.db.session import get_db
from app.models.clinical import Diagnosis, CancerStage, Treatment, Prescription, Appointment, FollowUp, MedicalHistory, DoctorNotes
from app.models.user import User
from app.api.v1.auth.dependencies import require_permission, get_current_user
from app.services.audit import log_action

from app.api.v1.clinical.schemas import (
    DiagnosisCreate, DiagnosisRead,
    CancerStageCreate, CancerStageRead,
    TreatmentCreate, TreatmentRead,
    PrescriptionCreate, PrescriptionRead,
    AppointmentCreate, AppointmentRead,
    FollowUpCreate, FollowUpRead,
    MedicalHistoryCreate, MedicalHistoryRead,
    DoctorNoteCreate, DoctorNoteRead
)

router = APIRouter(prefix="/api/v1/patients", tags=["Clinical Records"])

# 1. Medical History
@router.get("/{patient_id}/history", response_model=MedicalHistoryRead)
async def get_history(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_PII_READ))
):
    result = await db.execute(select(MedicalHistory).where(MedicalHistory.patient_id == patient_id))
    history = result.scalar_one_or_none()
    if not history:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="History not found")
    return history

@router.put("/{patient_id}/history", response_model=MedicalHistoryRead)
async def update_history(
    patient_id: int,
    history_in: MedicalHistoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_MANAGE))
):
    result = await db.execute(select(MedicalHistory).where(MedicalHistory.patient_id == patient_id))
    history = result.scalar_one_or_none()
    if not history:
        history = MedicalHistory(patient_id=patient_id)
        db.add(history)
    
    history.conditions = history_in.conditions
    history.surgeries = history_in.surgeries
    history.family_history = history_in.family_history
    history.allergies = history_in.allergies
    
    await db.commit()
    await db.refresh(history)
    
    await log_action(
        db=db, user_id=current_user.id, action="UPDATE_HISTORY",
        target_id=history.id, target_table="medical_history",
        details={"patient_id": patient_id}
    )
    return history


# 2. Diagnoses & Stages
@router.post("/{patient_id}/diagnoses", response_model=DiagnosisRead, status_code=status.HTTP_201_CREATED)
async def create_diagnosis(
    patient_id: int,
    diag_in: DiagnosisCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_MANAGE))
):
    diagnosis = Diagnosis(
        patient_id=patient_id,
        primary_site=diag_in.primary_site,
        histology=diag_in.histology,
        diagnosis_date=diag_in.diagnosis_date,
        staging_id=diag_in.staging_id
    )
    db.add(diagnosis)
    await db.commit()
    await db.refresh(diagnosis)

    await log_action(
        db=db, user_id=current_user.id, action="CREATE_DIAGNOSIS",
        target_id=diagnosis.id, target_table="diagnoses",
        details={"patient_id": patient_id, "site": diagnosis.primary_site}
    )
    return diagnosis

@router.get("/{patient_id}/diagnoses", response_model=list[DiagnosisRead])
async def list_diagnoses(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_PII_READ))
):
    result = await db.execute(select(Diagnosis).where(Diagnosis.patient_id == patient_id))
    return list(result.scalars().all())


# Cancer Stages Manager
stage_router = APIRouter(prefix="/api/v1/stages", tags=["Clinical Stages"])

@stage_router.post("", response_model=CancerStageRead, status_code=status.HTTP_201_CREATED)
async def create_stage(
    stage_in: CancerStageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_MANAGE))
):
    stage = CancerStage(
        system=stage_in.system,
        t_stage=stage_in.t_stage,
        n_stage=stage_in.n_stage,
        m_stage=stage_in.m_stage,
        group_stage=stage_in.group_stage,
        staged_by=current_user.id
    )
    db.add(stage)
    await db.commit()
    await db.refresh(stage)
    return stage


# 3. Treatments
@router.post("/{patient_id}/treatments", response_model=TreatmentRead, status_code=status.HTTP_201_CREATED)
async def create_treatment(
    patient_id: int,
    treatment_in: TreatmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_MANAGE))
):
    treatment = Treatment(
        patient_id=patient_id,
        type=treatment_in.type,
        status=treatment_in.status,
        start_date=treatment_in.start_date,
        end_date=treatment_in.end_date,
        doctor_id=treatment_in.doctor_id,
        details=treatment_in.details
    )
    db.add(treatment)
    await db.commit()
    await db.refresh(treatment)

    await log_action(
        db=db, user_id=current_user.id, action="CREATE_TREATMENT",
        target_id=treatment.id, target_table="treatments",
        details={"patient_id": patient_id, "type": treatment.type}
    )
    return treatment

@router.get("/{patient_id}/treatments", response_model=list[TreatmentRead])
async def list_treatments(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_PII_READ))
):
    result = await db.execute(select(Treatment).where(Treatment.patient_id == patient_id))
    return list(result.scalars().all())


# 4. Prescriptions
@router.post("/{patient_id}/prescriptions", response_model=PrescriptionRead, status_code=status.HTTP_201_CREATED)
async def create_prescription(
    patient_id: int,
    rx_in: PrescriptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_MANAGE))
):
    rx = Prescription(
        patient_id=patient_id,
        doctor_id=current_user.id,
        medication=rx_in.medication,
        dosage=rx_in.dosage,
        frequency=rx_in.frequency,
        start_date=rx_in.start_date,
        end_date=rx_in.end_date,
        status="active"
    )
    db.add(rx)
    await db.commit()
    await db.refresh(rx)

    await log_action(
        db=db, user_id=current_user.id, action="CREATE_PRESCRIPTION",
        target_id=rx.id, target_table="prescriptions",
        details={"patient_id": patient_id, "medication": rx.medication}
    )
    return rx

@router.get("/{patient_id}/prescriptions", response_model=list[PrescriptionRead])
async def list_prescriptions(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_PII_READ))
):
    result = await db.execute(select(Prescription).where(Prescription.patient_id == patient_id))
    return list(result.scalars().all())


# 5. Appointments & Follow Ups
@router.post("/{patient_id}/appointments", response_model=AppointmentRead, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    patient_id: int,
    apt_in: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_MANAGE))
):
    apt = Appointment(
        patient_id=patient_id,
        doctor_id=apt_in.doctor_id,
        appointment_date=apt_in.appointment_date,
        reason=apt_in.reason,
        status="scheduled"
    )
    db.add(apt)
    await db.commit()
    await db.refresh(apt)

    await log_action(
        db=db, user_id=current_user.id, action="CREATE_APPOINTMENT",
        target_id=apt.id, target_table="appointments",
        details={"patient_id": patient_id, "date": str(apt.appointment_date)}
    )
    return apt

@router.get("/{patient_id}/appointments", response_model=list[AppointmentRead])
async def list_appointments(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_PII_READ))
):
    result = await db.execute(select(Appointment).where(Appointment.patient_id == patient_id))
    return list(result.scalars().all())

@router.post("/{patient_id}/follow-ups", response_model=FollowUpRead, status_code=status.HTTP_201_CREATED)
async def create_followup(
    patient_id: int,
    fu_in: FollowUpCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_MANAGE))
):
    fu = FollowUp(
        patient_id=patient_id,
        doctor_id=fu_in.doctor_id,
        schedule_date=fu_in.schedule_date,
        notes=fu_in.notes,
        status="pending"
    )
    db.add(fu)
    await db.commit()
    await db.refresh(fu)

    await log_action(
        db=db, user_id=current_user.id, action="CREATE_FOLLOW_UP",
        target_id=fu.id, target_table="follow_ups",
        details={"patient_id": patient_id, "date": str(fu.schedule_date)}
    )
    return fu

@router.get("/{patient_id}/follow-ups", response_model=list[FollowUpRead])
async def list_followups(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_PII_READ))
):
    result = await db.execute(select(FollowUp).where(FollowUp.patient_id == patient_id))
    return list(result.scalars().all())


# 6. Doctor Notes
@router.post("/{patient_id}/notes", response_model=DoctorNoteRead, status_code=status.HTTP_201_CREATED)
async def create_doctor_note(
    patient_id: int,
    note_in: DoctorNoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_MANAGE))
):
    note = DoctorNotes(
        patient_id=patient_id,
        doctor_id=current_user.id,
        note_text=note_in.note_text,
        note_type=note_in.note_type
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)

    await log_action(
        db=db, user_id=current_user.id, action="CREATE_DOCTOR_NOTE",
        target_id=note.id, target_table="doctor_notes",
        details={"patient_id": patient_id, "type": note.note_type}
    )
    return note

@router.get("/{patient_id}/notes", response_model=list[DoctorNoteRead])
async def list_doctor_notes(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_PII_READ))
):
    result = await db.execute(select(DoctorNotes).where(DoctorNotes.patient_id == patient_id))
    return list(result.scalars().all())
