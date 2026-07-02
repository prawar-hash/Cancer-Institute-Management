from typing import Callable
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core import security
from app.core import permissions
from app.db.session import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Decodes the JWT access token and yields the current active authenticated user.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = security.decode_token(token)
        user_id_str: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")
        if user_id_str is None or token_type != "access":
            raise credentials_exception
        user_id = int(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception

    # Query DB
    result = await db.execute(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Inactive user account"
        )
    return user

def require_permission(action: str) -> Callable:
    """
    Dependency factory validating that the current user has permission to execute an action.
    """
    async def permission_dependency(current_user: User = Depends(get_current_user)) -> User:
        if not permissions.has_permission(current_user.role, action):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to perform this action"
            )
        return current_user
    return permission_dependency
