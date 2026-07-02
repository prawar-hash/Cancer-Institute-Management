from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditLog

async def log_action(
    db: AsyncSession,
    user_id: int,
    action: str,
    target_id: int | None = None,
    target_table: str | None = None,
    details: dict | None = None
) -> None:
    """
    HIPAA-compliant audit logger. Creates and writes an event trace to the database.
    """
    audit = AuditLog(
        user_id=user_id,
        action=action,
        target_id=target_id,
        target_table=target_table,
        details=details
    )
    db.add(audit)
    await db.commit()
