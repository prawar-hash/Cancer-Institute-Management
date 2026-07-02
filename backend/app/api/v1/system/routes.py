from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import datetime

from app.core import permissions
from app.db.session import get_db
from app.models.user import User
from app.models.audit import AuditLog
from app.api.v1.auth.dependencies import require_permission

router = APIRouter(prefix="/api/v1/system", tags=["System Administration"])

# 1. Users List Management (Super Admin only)
@router.get("/users")
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.SYSTEM_SETTINGS))
):
    """Lists registered system users, statuses, and roles."""
    result = await db.execute(select(User).where(User.deleted_at.is_(None)))
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "role": u.role,
            "status": u.status,
            "created_at": u.created_at
        } for u in users
    ]

@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: int,
    status_in: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.SYSTEM_SETTINGS))
):
    """Enables activating or deactivating user accounts."""
    new_status = status_in.get("status")
    if new_status not in ["active", "inactive"]:
        raise HTTPException(status_code=400, detail="Invalid status option")
        
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.status = new_status
    await db.commit()
    return {"id": user.id, "status": user.status}

# 2. Audit Trail Timeline (Super Admin only)
@router.get("/audit-logs")
async def list_audit_logs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.SYSTEM_SETTINGS))
):
    """Fetches all system audit logs for compliance tracking."""
    result = await db.execute(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(100))
    logs = result.scalars().all()
    return [
        {
            "id": l.id,
            "user_id": l.user_id,
            "action": l.action,
            "target_table": l.target_table,
            "target_id": l.target_id,
            "details": l.details,
            "created_at": l.created_at
        } for l in logs
    ]

# 3. System Metrics (Super Admin only)
@router.get("/metrics")
async def get_system_metrics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.SYSTEM_SETTINGS))
):
    """Returns database sizes, connections, and system statuses."""
    # Count totals for users, patients, logs
    users_count = await db.scalar(select(func.count(User.id)).where(User.deleted_at.is_(None))) or 0
    logs_count = await db.scalar(select(func.count(AuditLog.id))) or 0

    return {
        "db_connection": "healthy",
        "active_users": users_count,
        "total_audit_records": logs_count,
        "db_size_kb": 1284.0,  # Mock DB storage metric
        "uptime_seconds": 86400, # Mock uptime stats
    }
