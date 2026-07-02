from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "cancer_institute_tasks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

# Optional Celery configuration overrides
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    # Auto-discover async jobs inside these packages
    imports=[
        "app.ai"
    ]
)
