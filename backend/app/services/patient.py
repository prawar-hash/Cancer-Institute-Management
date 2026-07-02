import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, desc, asc
from sqlalchemy.orm import selectinload

from app.models.patient import Patient
from app.models.clinical import Diagnosis, CancerStage, Treatment

async def get_patients_list(
    db: AsyncSession,
    q: str | None = None,
    gender: str | None = None,
    status: str | None = None,
    cancer_type: str | None = None,
    stage: str | None = None,
    treatment_type: str | None = None,
    doctor_id: int | None = None,
    age_min: int | None = None,
    age_max: int | None = None,
    diag_date_start: datetime.date | None = None,
    diag_date_end: datetime.date | None = None,
    sort_by: str = "last_name",
    sort_order: str = "asc",
    page: int = 1,
    page_size: int = 20
) -> tuple[list[Patient], int]:
    """
    Assembles a complex SQLAlchemy query to filter, search, sort, and paginate Patient records.
    Returns (patients_list, total_records_count).
    """
    # 1. Base Query
    query = select(Patient).where(Patient.deleted_at.is_(None))
    count_query = select(func.count(Patient.id)).where(Patient.deleted_at.is_(None))

    # Track joins to prevent duplicate joins in query building
    joined_diagnosis = False
    joined_treatment = False

    # 2. Text Search (Name / MRN)
    if q:
        search_filter = or_(
            Patient.first_name.ilike(f"%{q}%"),
            Patient.last_name.ilike(f"%{q}%"),
            Patient.mrn.ilike(f"%{q}%")
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    # 3. Simple Filters
    if gender:
        query = query.where(Patient.gender == gender)
        count_query = count_query.where(Patient.gender == gender)
    if status:
        query = query.where(Patient.status == status)
        count_query = count_query.where(Patient.status == status)

    # 4. Age Range Filter
    today = datetime.date.today()
    if age_min is not None:
        max_birth_date = today - datetime.timedelta(days=age_min * 365.25)
        query = query.where(Patient.birth_date <= max_birth_date)
        count_query = count_query.where(Patient.birth_date <= max_birth_date)
    if age_max is not None:
        min_birth_date = today - datetime.timedelta(days=(age_max + 1) * 365.25)
        query = query.where(Patient.birth_date >= min_birth_date)
        count_query = count_query.where(Patient.birth_date >= min_birth_date)

    # 5. Cancer Type & Diagnosis Date Range Filters (Requires Diagnosis Join)
    if cancer_type or diag_date_start or diag_date_end or stage:
        query = query.join(Diagnosis, Diagnosis.patient_id == Patient.id, isouter=True)
        count_query = count_query.join(Diagnosis, Diagnosis.patient_id == Patient.id, isouter=True)
        joined_diagnosis = True

        if cancer_type:
            query = query.where(Diagnosis.primary_site.ilike(f"%{cancer_type}%"))
            count_query = count_query.where(Diagnosis.primary_site.ilike(f"%{cancer_type}%"))
        if diag_date_start:
            query = query.where(Diagnosis.diagnosis_date >= diag_date_start)
            count_query = count_query.where(Diagnosis.diagnosis_date >= diag_date_start)
        if diag_date_end:
            query = query.where(Diagnosis.diagnosis_date <= diag_date_end)
            count_query = count_query.where(Diagnosis.diagnosis_date <= diag_date_end)

    # 6. Cancer Stage Filter (Requires Staging Join via Diagnosis)
    if stage:
        if not joined_diagnosis:
            query = query.join(Diagnosis, Diagnosis.patient_id == Patient.id, isouter=True)
            count_query = count_query.join(Diagnosis, Diagnosis.patient_id == Patient.id, isouter=True)
        query = query.join(CancerStage, CancerStage.id == Diagnosis.staging_id, isouter=True)
        count_query = count_query.join(CancerStage, CancerStage.id == Diagnosis.staging_id, isouter=True)
        
        query = query.where(CancerStage.group_stage == stage)
        count_query = count_query.where(CancerStage.group_stage == stage)

    # 7. Treatment & Doctor Filters (Requires Treatment Join)
    if treatment_type or doctor_id:
        query = query.join(Treatment, Treatment.patient_id == Patient.id, isouter=True)
        count_query = count_query.join(Treatment, Treatment.patient_id == Patient.id, isouter=True)
        
        if treatment_type:
            query = query.where(Treatment.type == treatment_type)
            count_query = count_query.where(Treatment.type == treatment_type)
        if doctor_id:
            query = query.where(Treatment.doctor_id == doctor_id)
            count_query = count_query.where(Treatment.doctor_id == doctor_id)

    # 8. Fetch total count
    count_result = await db.execute(count_query)
    total_count = count_result.scalar() or 0

    # 9. Sorting
    sort_attr = getattr(Patient, sort_by, Patient.last_name)
    if sort_order == "desc":
        query = query.order_by(desc(sort_attr))
    else:
        query = query.order_by(asc(sort_attr))

    # 10. Pagination and Preloading contacts
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).options(selectinload(Patient.contacts))
    
    result = await db.execute(query)
    patients = list(result.scalars().unique())
    
    return patients, total_count
