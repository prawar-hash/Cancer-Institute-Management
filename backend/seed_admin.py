import asyncio

from sqlalchemy import select

from app.db.session import async_session
from app.models.user import User
from app.core.security import hash_password


async def create_admin():
    async with async_session() as db:
        result = await db.execute(
            select(User).where(User.email == "superadmin@fake-institute.org")
        )
        existing = result.scalar_one_or_none()

        if existing:
            print("✅ Super Admin already exists.")
            return

        admin = User(
            email="superadmin@fake-institute.org",
            hashed_password=hash_password("Admin@123"),
            role="super_admin",
            status="active",
        )

        db.add(admin)
        await db.commit()

        print("✅ Super Admin created successfully!")
        print("Email    : superadmin@fake-institute.org")
        print("Password : Admin@123")


asyncio.run(create_admin())