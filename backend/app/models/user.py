from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String
from .base import Base

class User(Base):
    """
    User database model representing clinical staff, system admins, and student researchers.
    """
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="student", nullable=False)  # super_admin, admin, student
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)  # active, deactivated
