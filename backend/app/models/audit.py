from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, ForeignKey, JSON, Integer
from .base import Base

class AuditLog(Base):
    """
    HIPAA-compliant system audit logging model tracking patient PII accesses,
    record alterations, and administrative activities.
    """
    __tablename__ = "audit_log"

    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(255), nullable=False)  # login, view_patient, update_treatment
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    target_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_table: Mapped[str | None] = mapped_column(String(100), nullable=True)
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # Key-values representing changed attributes
