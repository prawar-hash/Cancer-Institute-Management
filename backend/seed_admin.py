import asyncio
from sqlalchemy import select

from app.db.session import async_session
from app.models.user import User
from app.core.security import hash_password


async def reset_admin():
    async with async_session() as db:
        result = await db.execute(
            select(User).where(
                User.email == "superadmin@fake-institute.org"
            )
        )

        admin = result.scalar_one_or_none()

        if not admin:
            print("❌ Super Admin not found.")
            return

        admin.hashed_password = hash_password("Admin@123")
        admin.status = "active"

        await db.commit()

        print("✅ Super Admin password reset successfully!")
        print("Email    : superadmin@fake-institute.org")
        print("Password : Admin@123")


if __name__ == "__main__":
    asyncio.run(reset_admin())