import datetime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, ForeignKey, Text, JSON, DateTime, func
from .base import Base

class ResearchDataset(Base):
    """
    Oncology dataset cohorts created for research studies.
    Stores filtering query criteria inside a JSON column.
    """
    __tablename__ = "research_datasets"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    criteria: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # Query filter definitions for cohorts
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)  # draft, active, archived


class ResearchDatasetAccess(Base):
    """
    Access approval workflow tracking student research permissions.
    """
    __tablename__ = "research_dataset_access"

    dataset_id: Mapped[int] = mapped_column(ForeignKey("research_datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)  # pending, approved, denied, revoked
    requested_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now()
    )
    approved_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
