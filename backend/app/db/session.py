from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings

print("USING DB:", settings.DATABASE_URL)
# Create asynchronous engine for MySQL connection
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,  # Set to True for SQL queries logging in development
    pool_pre_ping=True
)

# Async session factory
async_session = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency yielding async database session handlers.
    Ensures rollback on exceptions and finalizes sessions cleanly.
    """
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
            
