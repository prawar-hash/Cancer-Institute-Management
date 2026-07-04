# AGENTS.md — Cancer Institute Platform

## Stack
Frontend: React 19 + Vite, React Router DOM, Redux Toolkit + Redux Persist, Axios,
React Hook Form + Zod, TanStack Table, TanStack Query, Framer Motion, Recharts,
date-fns, Tailwind CSS + shadcn/ui (MUI only for isolated complex widgets, e.g. rich date
pickers), React Hot Toast, lucide-react + react-icons.

Backend: FastAPI on Python 3.13, SQLAlchemy 2.x (async), Alembic, Pydantic v2,
JWT + OAuth2 (fastapi-users or a thin custom layer — pick one and be consistent),
Passlib (argon2), Celery + Redis for background jobs, async endpoints throughout.

DB: MySQL 8, 3NF where sensible, explicit FKs + indexes, soft delete
(`deleted_at` nullable), audit table for who-changed-what.

AI/ML: Python service layer using OpenCV/Pillow/NumPy/Pandas/scikit-learn as needed,
TensorFlow/PyTorch + Transformers for any model inference, LangChain to orchestrate
Google Gemini API calls, OCR pipeline for scanned reports.

Storage: Google Cloud Storage, signed URLs, per-patient folder prefixes.

## Folder structure (do not deviate without updating this file)
/backend
  /app
    /api/v1/{module}/routes.py, schemas.py, service.py, dependencies.py
    /core (config, security, celery_app)
    /db (session, base, migrations via alembic/)
    /models (SQLAlchemy models, one file per domain: patient.py, user.py, report.py, ...)
    /services (business logic, kept out of routes)
    /ai (ocr.py, summarizer.py, chatbot.py, classifiers.py)
    /storage (cloudinery_client.py)
    /tests
/frontend
  /src
    /app (store, router, providers)
    /features/{module} (components, hooks, api slice, types — feature-based, not type-based)
    /components/ui (shadcn primitives)
    /components/shared (reusable app-wide components)
    /layouts
    /hooks
    /lib (axios instance, query client, utils)
    /constants
    /styles
/docs (README, API docs, ER diagram, diagrams as Mermaid .md files)

## Conventions
- API routes versioned under /api/v1.
- All list endpoints accept: q (search), filters (typed per-resource), sort, page, page_size.
- Frontend feature folders own their own Redux slice or React Query hooks — no god-store.
- Role checks live in a single `permissions.ts` (frontend) and `permissions.py` (backend)
  source of truth — never scatter role string comparisons across components.

## Verification loop (run after every module)
Backend: `pytest -q`, `ruff check .`, `mypy app`
Frontend: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`
