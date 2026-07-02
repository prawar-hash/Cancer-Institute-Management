from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import datetime

from app.db.session import get_db
from app.models.document import ShareToken
from app.models.patient import Patient
from app.models.clinical import Treatment, Diagnosis
from app.services.pdf import generate_patient_clinical_summary_html

router = APIRouter(prefix="/api/v1/share", tags=["Secure Public Sharing"])

@router.get("/{token}")
async def view_shared_clinical_report(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Exposes a secure public clinical view by validating tokenized links.
    """
    # Find token
    result = await db.execute(select(ShareToken).where(ShareToken.token == token))
    share = result.scalar_one_or_none()
    if not share:
        raise HTTPException(status_code=404, detail="Secure sharing link not found or invalid")

    # Check expiration (UTC aware comparison)
    now = datetime.datetime.now(datetime.timezone.utc)
    if share.expires_at < now:
        raise HTTPException(status_code=403, detail="Secure sharing link has expired (24-hour limit exceeded)")

    # Increment click stats
    share.clicks += 1
    db.add(share)
    await db.commit()

    # Load Patient clinical metrics
    pat_res = await db.execute(select(Patient).where(Patient.id == share.patient_id))
    patient = pat_res.scalar_one_or_none()
    if not patient:
         raise HTTPException(status_code=404, detail="Patient profile not found")

    # Compile treatments
    tx_res = await db.execute(select(Treatment).where(Treatment.patient_id == patient.id))
    treatments = tx_res.scalars().all()
    tx_list = [
        {"type": t.type, "status": t.status, "start_date": str(t.start_date), "end_date": str(t.end_date) if t.end_date else None}
        for t in treatments
    ]

    # Compile diagnoses
    diag_res = await db.execute(select(Diagnosis).where(Diagnosis.patient_id == patient.id))
    diagnoses = diag_res.scalars().all()
    diag_list = [
        {"primary_site": d.primary_site, "histology": d.histology, "diagnosis_date": str(d.diagnosis_date)}
        for d in diagnoses
    ]

    patient_context = {
        "first_name": patient.first_name,
        "last_name": patient.last_name,
        "gender": patient.gender,
        "birth_date": str(patient.birth_date),
        "status": patient.status,
        "mrn": patient.mrn,
        "treatments": tx_list,
        "diagnoses": diag_list
    }

    # Output clinical summary
    html_report = generate_patient_clinical_summary_html(patient_context)
    return Response(content=html_report, media_type="text/html")
