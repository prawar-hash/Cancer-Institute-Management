from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.config import settings
from app.db.session import get_db
from app.api.v1.auth.routes import router as auth_router
from app.api.v1.patients.routes import router as patients_router
from app.api.v1.clinical.routes import router as clinical_router, stage_router as clinical_stage_router
from app.api.v1.reports.routes import router as reports_router
from app.api.v1.system.routes import router as system_router
from app.api.v1.ai.routes import router as ai_router
from app.api.v1.share.routes import router as public_share_router
from app.api.v1.research.routes import router as research_router
from contextlib import asynccontextmanager
from app.db.session import engine
from app.models import Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# CORS Policy configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict this to frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(patients_router)
app.include_router(clinical_router)
app.include_router(clinical_stage_router)
app.include_router(reports_router)
app.include_router(system_router)
app.include_router(ai_router)
app.include_router(public_share_router)
app.include_router(research_router)

@app.get("/api/v1/health", tags=["System"])
async def health_check(db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    """
    Health check endpoint returning system statuses.
    Performs SELECT 1 check to verify database connectivity.
    """
    db_status = "online"
    try:
        # Perform light execution check
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"offline: {str(e)}"

    return {
        "status": "online",
        "database": db_status,
        "project": settings.PROJECT_NAME
    }
