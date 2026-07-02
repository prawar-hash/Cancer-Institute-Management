import datetime
from typing import Any
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import DateTime, func

class Base(DeclarativeBase):
    """
    Base database model establishing shared columns:
    - primary key id
    - created_at, updated_at timestamps
    - deleted_at timestamp for soft delete
    """
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now()
    )
    deleted_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), 
        nullable=True
    )

    def soft_delete(self) -> None:
        """Flags the record as soft-deleted by setting the deleted_at timestamp."""
        self.deleted_at = datetime.datetime.now(datetime.timezone.utc)
