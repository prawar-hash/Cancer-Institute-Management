# System Architecture — Cancer Institute Platform

This document describes the high-level architecture, system components, and key request lifecycles of the Cancer Institute Management & AI Research Platform.

---

## 1. System Context Diagram

The following diagram shows the boundary of the platform and how different user roles and external services interact with it.

```mermaid
graph TD
    classDef actor fill:#e1f5fe,stroke:#0288d1,stroke-width:2px;
    classDef system fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    classDef external fill:#fff3e0,stroke:#ef6c00,stroke-width:2px;

    Admin["Clinical Admin / Clinician"]:::actor
    Researcher["Student / Researcher"]:::actor
    SuperAdmin["System Super Admin"]:::actor

    Platform["Cancer Institute Platform (Monorepo)"]:::system

    GCS["Google Cloud Storage (File Server)"]:::external
    Gemini["Google Gemini API (AI inference)"]:::external

    Admin -->|"Uploads reports, manages patient files"| Platform
    Researcher -->|"Queries anonymized research datasets"| Platform
    SuperAdmin -->|"Configures settings, manages users"| Platform

    Platform -->|"Stores clinical documents securely"| GCS
    Platform -->|"Processes reports & generates summaries"| Gemini
```

---

## 2. Component Diagram

The platform utilizes a monorepo structure separating the React 19 Frontend and the FastAPI Backend, with Celery processing long-running workloads asynchronously via Redis.

```mermaid
graph TB
    classDef fe fill:#e0f7fa,stroke:#0097a7,stroke-width:2px;
    classDef be fill:#ede7f6,stroke:#5e35b1,stroke-width:2px;
    classDef db fill:#eceff1,stroke:#455a64,stroke-width:2px;
    classDef queue fill:#fffde7,stroke:#fbc02d,stroke-width:2px;

    subgraph Frontend ["React 19 Frontend (Vite)"]
        UI["UI Components (shadcn/ui + Tailwind)"]:::fe
        Query["TanStack Query (Data Fetching)"]:::fe
        Redux["Redux Toolkit (State & Auth)"]:::fe
        AxiosClient["Axios (HTTP Client)"]:::fe

        UI --> Query
        UI --> Redux
        Query --> AxiosClient
    end

    subgraph Backend ["FastAPI Backend (Python 3.13)"]
        API["FastAPI App (API routes /api/v1)"]:::be
        Sec["Security & Permissions Layer"]:::be
        Service["Services (Business Logic)"]:::be
        ORM["SQLAlchemy 2.x (Async ORM)"]:::be
        GCSClient["GCS Client (Storage Wrapper)"]:::be

        API --> Sec
        API --> Service
        Service --> ORM
        Service --> GCSClient
    end

    subgraph DataStore ["Data & File Storage"]
        MySQL[("MySQL 8 (Transactional DB)")]:::db
        GCSStore["Google Cloud Storage (Buckets)"]:::db
    end

    subgraph QueueSystem ["Asynchronous Task Pipeline"]
        RedisBroker["Redis (Task Broker)"]:::queue
        CeleryWorker["Celery Worker (AI Inference & OCR)"]:::queue
        OCR["OCR Pipeline (Tesseract + OpenCV)"]:::queue
        AIService["AI Service Layer (LangChain + Gemini)"]:::queue
    end

    %% Communications
    AxiosClient -->|"HTTPS REST API"| API
    ORM -->|"SQL (aiomysql)"| MySQL
    GCSClient -->|"Signed URLs & Uploads"| GCSStore
    Service -->|"Enqueue Background Jobs"| RedisBroker
    RedisBroker -->|"Dequeue Tasks"| CeleryWorker
    CeleryWorker --> OCR
    CeleryWorker --> AIService
    CeleryWorker -->|"Write summaries/audit"| ORM
    AIService -->|"Generates Summaries"| GeminiAPI["Google Gemini API"]:::db
    CeleryWorker -->|"Download files to process"| GCSStore
```

---

## 3. Request Lifecycle: Medical Report Upload & AI Processing

The sequence diagram below details the end-to-end lifecycle when a clinical administrator uploads a medical report. The API returns an immediate `202 Accepted` status, while the OCR extraction and AI clinical summarization run in the background.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin Client
    participant API as FastAPI Backend
    participant GCS as Google Cloud Storage
    participant DB as MySQL Database
    participant Redis as Redis Queue
    participant Worker as Celery Worker
    participant Gemini as Gemini API

    Admin->>API: POST /api/v1/reports/upload (file, patient_id)
    Note over API: Server-side validation:<br/>Validate size, extension & MIME type
    API->>GCS: Upload report binary (scoped to patient_id folder)
    GCS-->>API: Confirm upload & return GCS object URI
    API->>DB: Insert Report record (status="PENDING", gcs_uri)
    DB-->>API: Return report_id
    API->>Redis: Enqueue processing job (report_id, patient_id)
    API-->>Admin: HTTP 202 Accepted (report_id, status="PENDING")
    
    Note over Worker: Background worker retrieves job
    Worker->>Redis: Fetch next task
    Redis-->>Worker: Processing task details (report_id)
    Worker->>DB: Fetch Report metadata (gcs_uri)
    DB-->>Worker: Report details
    Worker->>GCS: Download report file binary
    GCS-->>Worker: File binary
    
    Note over Worker: Execute OCR Pipeline<br/>(Extract raw text from PDF/Images)
    
    Worker->>Gemini: Request summary & clinical entities (extracted text)
    Gemini-->>Worker: Return JSON summary & extracted data
    
    Worker->>DB: Update Report record (status="COMPLETED", summary, text)
    Worker->>DB: Insert Audit Log (user_id, action="PROCESS_REPORT", target_id=report_id)
    DB-->>Worker: Confirm writes
    
    Note over Worker, Admin: Client polls endpoint or receives WebSocket update
```
