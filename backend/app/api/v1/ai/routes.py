from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core import permissions
from app.db.session import get_db
from app.models.user import User
from app.models.patient import Patient
from app.models.document import Report, AiSummary
from app.models.clinical import Treatment, Diagnosis
from app.api.v1.auth.dependencies import require_permission
from app.services.audit import log_action
from app.services.ai import (
    extract_report_text,
    generate_report_summary,
    generate_chat_response
)

router = APIRouter(prefix="/api/v1/ai", tags=["AI Clinical Assistant"])

class ChatRequest(BaseModel):
    patient_id: int
    message: str

# 1. Summarize Report Endpoint
@router.post("/summarize/{report_id}")
async def summarize_patient_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_PII_READ))
):
    """
    Simulates OCR extraction and generates a clinical summary using Gemini/heuristics.
    Saves results to the database under reports and ai_summaries tables.
    """
    # Load report
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Clinical report not found")

    # Simulate OCR Extraction
    if not report.raw_text:
        extracted_text = extract_report_text(report.type, report.file_url)
        report.raw_text = extracted_text
        report.status = "completed"
        db.add(report)

    # Generate Clinical Summary
    summary_text = generate_report_summary(report.raw_text or "")

    # Save or update summary
    sum_result = await db.execute(select(AiSummary).where(AiSummary.report_id == report.id))
    ai_sum = sum_result.scalar_one_or_none()
    if ai_sum:
        ai_sum.summary_text = summary_text
    else:
        ai_sum = AiSummary(
            patient_id=report.patient_id,
            report_id=report.id,
            summary_text=summary_text,
            key_findings={"status": "processed"}
        )
    db.add(ai_sum)
    await db.commit()
    await db.refresh(ai_sum)

    # Log audit entry
    await log_action(
        db=db, user_id=current_user.id, action="SUMMARIZE_REPORT",
        target_id=report.id, target_table="reports",
        details={"patient_id": report.patient_id}
    )

    return {
        "report_id": report.id,
        "summary": ai_sum.summary_text
    }

# 2. Scoped Clinical Chatbot Endpoint
@router.post("/chat")
async def chat_assistant(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_PII_READ))
):
    """
    Provides context-aware oncologist assistant chat by gathering patient data.
    """
    # Fetch Patient
    pat_res = await db.execute(select(Patient).where(Patient.id == req.patient_id))
    patient = pat_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    # Compile treatments context
    tx_res = await db.execute(select(Treatment).where(Treatment.patient_id == patient.id))
    treatments = tx_res.scalars().all()
    tx_list = [
        {"type": t.type, "status": t.status, "start_date": str(t.start_date)}
        for t in treatments
    ]

    # Compile diagnosis context
    diag_res = await db.execute(select(Diagnosis).where(Diagnosis.patient_id == patient.id))
    diagnoses = diag_res.scalars().all()
    diag_list = [
        {"primary_site": d.primary_site, "histology": d.histology, "diagnosis_date": str(d.diagnosis_date)}
        for d in diagnoses
    ]

    # Compile context object
    patient_context = {
        "first_name": patient.first_name,
        "last_name": patient.last_name,
        "gender": patient.gender,
        "birth_date": str(patient.birth_date),
        "status": patient.status,
        "treatments": tx_list,
        "diagnoses": diag_list
    }

    # Generate chatbot response
    answer = generate_chat_response(req.message, patient_context)

    # Log audit trail
    await log_action(
        db=db, user_id=current_user.id, action="AI_CHATBOT_QUERY",
        target_id=patient.id, target_table="patients",
        details={"query_preview": req.message[:50]}
    )

    return {"response": answer}
