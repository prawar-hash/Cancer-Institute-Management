import io
import os
import secrets
import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core import permissions
from app.db.session import get_db
from app.models.document import Report, MedicalImage, Document, ShareToken
from app.models.user import User
from app.models.patient import Patient
from app.models.clinical import Treatment, Diagnosis
from app.api.v1.auth.dependencies import require_permission, get_current_user
from app.services.audit import log_action
from app.services.upload_service import validate_file_security, run_virus_scan
from app.storage.gcs_client import gcs_client
from app.services.pdf import generate_patient_clinical_summary_html

from app.api.v1.reports.schemas import (
    ReportCreate, ReportRead,
    MedicalImageCreate, MedicalImageRead,
    DocumentCreate, DocumentRead
)

router = APIRouter(prefix="/api/v1/patients", tags=["Medical Reports & Uploads"])

@router.post("/{patient_id}/upload-file", response_model=ReportRead | MedicalImageRead, status_code=status.HTTP_201_CREATED)
async def upload_patient_file(
    patient_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_MANAGE))
):
    """
    Validates, scans, and uploads clinical files (PDF, PNG, JPEG, JPG, DCM) to Google Cloud Storage.
    Saves metadata in database and logs transaction in Audit logs.
    """
    # 1. Read file to extract metadata (size, content type)
    file_bytes = await file.read()
    file_size = len(file_bytes)
    
    # 2. Run security and formatting checks
    category = validate_file_security(file.filename, file.content_type, file_size)
    
    # 3. Perform virus scan
    if not run_virus_scan(file_bytes):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File failed the antivirus security scan"
        )
        
    # 4. Upload file stream to GCS
    destination_path = gcs_client.get_scoped_path(patient_id, category, file.filename)
    file_io = io.BytesIO(file_bytes)
    
    gcs_uri = gcs_client.upload_file_object(file_io, destination_path, file.content_type)
    
    # 5. Insert Database record based on file classification
    if category == "reports":
        # PDFs are classified as Reports
        report = Report(
            patient_id=patient_id,
            uploader_id=current_user.id,
            type="pathology",  # Default type, can be updated later
            gcs_uri=gcs_uri,
            status="pending"
        )
        db.add(report)
        await db.commit()
        await db.refresh(report)
        
        await log_action(
            db=db, user_id=current_user.id, action="UPLOAD_REPORT",
            target_id=report.id, target_table="reports",
            details={"mrn_folder": patient_id, "gcs_uri": gcs_uri}
        )
        return report
    else:
        # Images (PNG, JPEG) and DICOM files (.dcm) are classified as Medical Images
        _, ext = os.path.splitext(file.filename.lower())
        image_type = "PNG" if ext == ".png" else "JPEG"
        metadata = {}
        
        if ext == ".dcm":
            image_type = "DICOM_placeholder"
            metadata = {"image_processing": "unsupported format (DICOM placeholder)"}
        else:
            metadata = {"dimensions": "unknown", "format": file.content_type}
            
        img = MedicalImage(
            patient_id=patient_id,
            report_id=None,
            image_type=image_type,
            gcs_uri=gcs_uri,
            metadata=metadata
        )
        db.add(img)
        await db.commit()
        await db.refresh(img)
        
        await log_action(
            db=db, user_id=current_user.id, action="UPLOAD_IMAGE",
            target_id=img.id, target_table="medical_images",
            details={"mrn_folder": patient_id, "gcs_uri": gcs_uri}
        )
        return img

# 1. Reports
@router.post("/{patient_id}/reports", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
async def create_report(
    patient_id: int,
    report_in: ReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_MANAGE))
):
    report = Report(
        patient_id=patient_id,
        uploader_id=current_user.id,
        type=report_in.type,
        gcs_uri=report_in.gcs_uri,
        status="pending"
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    await log_action(
        db=db, user_id=current_user.id, action="CREATE_REPORT",
        target_id=report.id, target_table="reports",
        details={"patient_id": patient_id, "type": report.type}
    )
    return report

@router.get("/{patient_id}/reports", response_model=list[ReportRead])
async def list_reports(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_PII_READ))
):
    result = await db.execute(select(Report).where(Report.patient_id == patient_id))
    return list(result.scalars().all())


# 2. Medical Images
@router.post("/{patient_id}/images", response_model=MedicalImageRead, status_code=status.HTTP_201_CREATED)
async def create_image(
    patient_id: int,
    img_in: MedicalImageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_MANAGE))
):
    img = MedicalImage(
        patient_id=patient_id,
        report_id=img_in.report_id,
        image_type=img_in.image_type,
        gcs_uri=img_in.gcs_uri,
        metadata=img_in.metadata
    )
    db.add(img)
    await db.commit()
    await db.refresh(img)

    await log_action(
        db=db, user_id=current_user.id, action="CREATE_IMAGE",
        target_id=img.id, target_table="medical_images",
        details={"patient_id": patient_id, "image_type": img.image_type}
    )
    return img

@router.get("/{patient_id}/images", response_model=list[MedicalImageRead])
async def list_images(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_PII_READ))
):
    result = await db.execute(select(MedicalImage).where(MedicalImage.patient_id == patient_id))
    return list(result.scalars().all())


# 3. Documents
@router.post("/{patient_id}/documents", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def create_document(
    patient_id: int,
    doc_in: DocumentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_MANAGE))
):
    doc = Document(
        patient_id=patient_id,
        doc_type=doc_in.doc_type,
        gcs_uri=doc_in.gcs_uri
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    await log_action(
        db=db, user_id=current_user.id, action="CREATE_DOCUMENT",
        target_id=doc.id, target_table="documents",
        details={"patient_id": patient_id, "type": doc.doc_type}
    )
    return doc

@router.get("/{patient_id}/documents", response_model=list[DocumentRead])
async def list_documents(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_PII_READ))
):
    result = await db.execute(select(Document).where(Document.patient_id == patient_id))
    return list(result.scalars().all())


# 4. Patient Clinical Summary Generator & Share Link
@router.post("/{patient_id}/pdf")
async def generate_patient_pdf(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_PII_READ))
):
    """
    Assembles diagnostics and treatments, returning a print-friendly clinical summary HTML.
    """
    pat_res = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = pat_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    tx_res = await db.execute(select(Treatment).where(Treatment.patient_id == patient_id))
    treatments = tx_res.scalars().all()
    tx_list = [
        {"type": t.type, "status": t.status, "start_date": str(t.start_date), "end_date": str(t.end_date) if t.end_date else None}
        for t in treatments
    ]

    diag_res = await db.execute(select(Diagnosis).where(Diagnosis.patient_id == patient_id))
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

    html_report = generate_patient_clinical_summary_html(patient_context)
    return Response(content=html_report, media_type="text/html")


@router.post("/{patient_id}/share")
async def create_secure_share_link(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.PATIENT_MANAGE))
):
    """
    Generates a secure, time-limited signed token and registers a 24h ShareToken record.
    """
    pat_res = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = pat_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    # Generate cryptographically secure token
    secure_token = secrets.token_urlsafe(32)
    expiry = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24)

    share_record = ShareToken(
        patient_id=patient_id,
        token=secure_token,
        expires_at=expiry,
        clicks=0
    )
    db.add(share_record)
    await db.commit()

    # Log audit trail
    await log_action(
        db=db, user_id=current_user.id, action="CREATE_SHARE_LINK",
        target_id=patient_id, target_table="patients",
        details={"expiry": str(expiry)}
    )

    # Return URL format
    share_url = f"/api/v1/share/{secure_token}"
    return {
        "share_url": share_url,
        "expires_at": expiry
    }
