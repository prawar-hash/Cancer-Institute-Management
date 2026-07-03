from app import models   # ✅ THIS LINE IS CRITICAL
from app.models import (
    User,)
from app.db.session import engine
import asyncio
import datetime
import random
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from passlib.hash import argon2
from sqlalchemy import select


# Import models
from app.models import (
    Base,
    User,
    Patient,
    PatientContact,
    MedicalHistory,
    CancerStage,
    Diagnosis,
    Treatment,
    DoctorNotes,
    Prescription,
    Appointment,
    FollowUp,
    Report,
    MedicalImage,
    Document,
    AiSummary,
    ResearchDataset,
    ResearchDatasetAccess,
    AuditLog,
)

DATABASE_URL="mysql+aiomysql://KayasSQL:kayas7898@localhost:3306/cancer_institute"

# Password hashing
def hash_password(password: str) -> str:
    return argon2.hash(password)

async def seed_data() -> None:
    print("Starting database seeding...")
   # engine = create_async_engine(DATABASE_URL, echo=True)

    # 🔍 DEBUG START
    print("TABLES BEFORE CREATE:", Base.metadata.tables.keys())

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print("TABLES AFTER CREATE:", Base.metadata.tables.keys())
    # 🔍 DEBUG END

    async_session = async_sessionmaker(engine, expire_on_commit=False)

    async with async_session() as session:
        async with session.begin():
            # 1. Seed Users (SuperAdmin, Admin, Student)
            print("Seeding Users...")
            hashed_pw = hash_password("Admin@123!")
            super_admin = User(
                email="superadmin@fake-institute.org",
                hashed_password=hashed_pw,
                role="super_admin",
                status="active"
            )
            admin_doc = User(
                email="dr.smith@fake-institute.org",
                hashed_password=hashed_pw,
                role="admin",
                status="active"
            )
            student_researcher = User(
                email="student.lee@fake-institute.org",
                hashed_password=hashed_pw,
                role="student",
                status="active"
            )
            # session.add_all([super_admin, admin_doc, student_researcher])
            # await session.flush()  # Populates IDs

            existing = await session.execute(
                select(User).where(User.email == "superadmin@fake-institute.org")
            )
            if existing.scalar():
                print("Users already exist, skipping...")
            else:
                session.add_all([super_admin, admin_doc, student_researcher])
                await session.flush()

            # 2. Seed Patients
            print("Seeding Patients...")
            patients = [
                Patient(
                    mrn="MRN-00123",
                    first_name="Jane",
                    last_name="Doe",
                    birth_date=datetime.date(1975, 4, 12),
                    gender="F",
                    status="active"
                ),
                Patient(
                    mrn="MRN-00456",
                    first_name="John",
                    last_name="Smith",
                    birth_date=datetime.date(1962, 8, 24),
                    gender="M",
                    status="active"
                ),
                Patient(
                    mrn="MRN-00789",
                    first_name="Robert",
                    last_name="Johnson",
                    birth_date=datetime.date(1950, 12, 1),
                    gender="M",
                    status="inactive"
                )
            ]
            session.add_all(patients)
            await session.flush()

            # 3. Seed Patient Contacts
            print("Seeding Patient Contacts...")
            contacts = [
                PatientContact(
                    patient_id=patients[0].id,
                    contact_name="Richard Doe",
                    relationship_type="Spouse",
                    phone="555-0199",
                    email="richard.doe@fake-email.com",
                    address="123 Fake Lane, Springfield"
                ),
                PatientContact(
                    patient_id=patients[1].id,
                    contact_name="Mary Smith",
                    relationship_type="Daughter",
                    phone="555-0244",
                    email="mary.smith@fake-email.com",
                    address="456 Dummy Rd, Metropolis"
                )
            ]
            session.add_all(contacts)

            # 4. Seed Medical Histories
            print("Seeding Medical Histories...")
            histories = [
                MedicalHistory(
                    patient_id=patients[0].id,
                    conditions=["Hypertension", "Type 2 Diabetes"],
                    surgeries=["Appendectomy (1998)"],
                    family_history={"Maternal": "Breast Cancer at age 52"},
                    allergies=["Penicillin"]
                ),
                MedicalHistory(
                    patient_id=patients[1].id,
                    conditions=["Asthma"],
                    surgeries=[],
                    family_history={"Paternal": "Colorectal Cancer at age 65"},
                    allergies=["Sulfa Drugs"]
                )
            ]
            session.add_all(histories)

            # 5. Seed Cancer Stages & Diagnoses
            print("Seeding Cancer Stages & Diagnoses...")
            stages = [
                CancerStage(
                    system="TNM",
                    t_stage="T2",
                    n_stage="N1",
                    m_stage="M0",
                    group_stage="IIB",
                    staged_by=admin_doc.id
                ),
                CancerStage(
                    system="TNM",
                    t_stage="T3",
                    n_stage="N2",
                    m_stage="M0",
                    group_stage="IIIA",
                    staged_by=admin_doc.id
                )
            ]
            session.add_all(stages)
            await session.flush()

            diagnoses = [
                Diagnosis(
                    patient_id=patients[0].id,
                    primary_site="Breast (Left Upper Outer Quadrant)",
                    histology="Infiltrating Ductal Carcinoma",
                    diagnosis_date=datetime.date(2025, 1, 15),
                    staging_id=stages[0].id
                ),
                Diagnosis(
                    patient_id=patients[1].id,
                    primary_site="Colon (Ascending)",
                    histology="Adenocarcinoma",
                    diagnosis_date=datetime.date(2025, 2, 10),
                    staging_id=stages[1].id
                )
            ]
            session.add_all(diagnoses)

            # 6. Seed Treatments (Polymorphic Details, NO Radiation Dose Tracking Metrics!)
            print("Seeding Treatments...")
            treatments = [
                Treatment(
                    patient_id=patients[0].id,
                    type="surgery",
                    status="completed",
                    start_date=datetime.date(2025, 2, 5),
                    end_date=datetime.date(2025, 2, 5),
                    doctor_id=admin_doc.id,
                    details={
                        "procedure": "Lumpectomy and Sentinel Lymph Node Biopsy",
                        "margin_status": "Negative",
                        "facility": "General Oncology Ward"
                    }
                ),
                Treatment(
                    patient_id=patients[0].id,
                    type="chemo",
                    status="ongoing",
                    start_date=datetime.date(2025, 3, 1),
                    end_date=datetime.date(2025, 8, 30),
                    doctor_id=admin_doc.id,
                    details={
                        "regimen": "ACT (Adriamycin + Cytoxan followed by Taxol)",
                        "current_cycle": 3,
                        "total_planned_cycles": 6,
                        "dose_modification": None
                    }
                ),
                # Radiation Treatment: NO cumulative dose trackers, calculations, or monitoring logs.
                Treatment(
                    patient_id=patients[1].id,
                    type="radiation",
                    status="scheduled",
                    start_date=datetime.date(2025, 6, 1),
                    end_date=datetime.date(2025, 7, 15),
                    doctor_id=admin_doc.id,
                    details={
                        "modality": "External Beam Radiation Therapy (EBRT)",
                        "target_site": "Pelvic Cavity",
                        "clinical_notes": "Post-operative adjuvant radiotherapy planned.",
                        "disclaimer": "Radiation details recorded for administrative purposes only."
                    }
                )
            ]
            session.add_all(treatments)

            # 7. Seed Doctor Notes & Prescriptions
            print("Seeding Doctor Notes & Prescriptions...")
            notes = [
                DoctorNotes(
                    patient_id=patients[0].id,
                    doctor_id=admin_doc.id,
                    note_text="Patient is recovering well post-surgery. Initiating chemotherapy cycle 3. Monitored blood counts are within range.",
                    note_type="clinical"
                )
            ]
            prescriptions = [
                Prescription(
                    patient_id=patients[0].id,
                    doctor_id=admin_doc.id,
                     medication="Ondansetron",
                    dosage="8mg",
                    frequency="Every 8 hours as needed for nausea",
                    start_date=datetime.date(2025, 3, 1),
                    end_date=datetime.date(2025, 3, 5),
                    status="active"
                )
            ]
            session.add_all(notes + prescriptions)

            # 8. Seed Appointments & Follow Ups
            print("Seeding Appointments & Follow Ups...")
            appointments = [
                Appointment(
                    patient_id=patients[0].id,
                    doctor_id=admin_doc.id,
                    appointment_date=datetime.datetime(2026, 7, 10, 10, 0, tzinfo=datetime.timezone.utc),
                    reason="Routine Chemo Cycle 4 Administration and Lab Check",
                    status="scheduled"
                )
            ]
            follow_ups = [
                FollowUp(
                    patient_id=patients[0].id,
                    doctor_id=admin_doc.id,
                    schedule_date=datetime.datetime(2026, 9, 15, 14, 0, tzinfo=datetime.timezone.utc),
                    status="pending",
                    notes="Post-chemotherapy follow-up scan coordination"
                )
            ]
            session.add_all(appointments + follow_ups)

            # 9. Seed Reports, Images, Documents, and AI Summaries
            print("Seeding Reports & AI Summaries...")
            report = Report(
                patient_id=patients[0].id,
                uploader_id=admin_doc.id,
                type="pathology",
                gcs_uri="gs://fake-bucket/patient_MRN-00123/pathology_report_01.pdf",
                raw_text="SPECIMEN: Left breast lumpectomy. DIAGNOSIS: Infiltrating ductal carcinoma. Nottingham grade 2. Tumor size: 1.8 cm. Margins uninvolved. 1 out of 3 sentinel lymph nodes positive.",
                status="completed"
            )
            session.add(report)
            await session.flush()

            ai_summary = AiSummary(
                patient_id=patients[0].id,
                report_id=report.id,
                summary_text="Left breast infiltrating ductal carcinoma, Nottingham grade 2. Tumor size 1.8 cm with negative surgical margins. 1/3 sentinel lymph nodes positive for metastasis.",
                key_findings=[
                    {"entity": "Tumor Type", "value": "Infiltrating Ductal Carcinoma"},
                    {"entity": "Tumor Size", "value": "1.8 cm"},
                    {"entity": "Margins", "value": "Negative"},
                    {"entity": "Lymph Nodes", "value": "1/3 positive"}
                ]
            )
            image = MedicalImage(
                patient_id=patients[0].id,
                report_id=report.id,
                image_type="PNG",
                gcs_uri="gs://fake-bucket/patient_MRN-00123/lymph_node_slice.png",
                metadata={"dimensions": "512x512", "slice_location": "axillary_level_1"}
            )
            session.add_all([ai_summary, image])

            # 10. Seed Research Datasets & Access Requests
            print("Seeding Research Datasets...")
            dataset = ResearchDataset(
                name="Breast Cancer Cohort 2025",
                description="Anonymized records of breast cancer patients diagnosed in 2025.",
                criteria={"primary_site": "Breast (Left Upper Outer Quadrant)", "diagnosis_year": 2025},
                created_by=super_admin.id,
                status="active"
            )
            session.add(dataset)
            await session.flush()

            access = ResearchDatasetAccess(
                dataset_id=dataset.id,
                user_id=student_researcher.id,
                status="approved",
                approved_by=super_admin.id
            )
            session.add(access)

            # 11. Seed Audit Logs
            print("Seeding Audit Logs...")
            audit = AuditLog(
                user_id=admin_doc.id,
                action="VIEW_PATIENT_RECORDS",
                ip_address="192.168.1.50",
                target_id=patients[0].id,
                target_table="patients",
                details={"fields_accessed": ["first_name", "last_name", "mrn", "medical_history"]}
            )
            session.add(audit)

    print("Database seeding completed successfully.")
    await engine.dispose() # ✅ ADD THIS LINE

if __name__ == "__main__":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed_data())
