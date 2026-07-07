from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.core import security
from app.core import permissions
from app.db.session import get_db
from app.models.user import User
from app.api.v1.auth.schemas import UserCreate, UserLogin, UserRead, Token, OAuthLoginRequest
from app.api.v1.auth.dependencies import require_permission, get_current_user

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.USER_MANAGE))
):
    """
    Registers a new system user. Restricted to Super Admin.
    """
    # Check if email exists
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists"
        )
    
    # Hash password and create user
    hashed_password = security.hash_password(user_in.password)
    db_user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        role=user_in.role,
        status="active"
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

@router.post("/login", response_model=Token)
async def login(
    response: Response,
    user_in: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticates email and password. Returns access token in body,
    and sets refresh token in secure HttpOnly cookie.
    """
    result = await db.execute(select(User).where(User.email == user_in.email, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()
    
    print("Entered Email:", user_in.email)
    print("User Found:", user is not None)

    if user:
       print("DB Email:", user.email)
       print("Status:", user.status)
       print("Password Match:", security.verify_password(user_in.password, user.hashed_password))

    if not user or not security.verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is deactivated"
        )
    
    # Create tokens
    access_token = security.create_access_token(subject=user.id)
    refresh_token = security.create_refresh_token(subject=user.id)
    
    # Set refresh token cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,  # In production, set to True
        samesite="strict",
        max_age=7 * 24 * 60 * 60,  # 7 days
    )
    
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.post("/refresh", response_model=Token)
async def refresh_token(
    response: Response,
    refresh_token: str | None = Cookie(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Exchanges a valid refresh token cookie for a new access token and rotates the refresh token.
    """
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing"
        )
    try:
        payload = security.decode_token(refresh_token)
        user_id_str: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")
        if user_id_str is None or token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        user_id = int(user_id_str)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    result = await db.execute(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()
    if not user or user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account inactive or missing"
        )
    
    # Rotate tokens
    new_access_token = security.create_access_token(subject=user.id)
    new_refresh_token = security.create_refresh_token(subject=user.id)
    
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=7 * 24 * 60 * 60,
    )
    
    return {"access_token": new_access_token, "token_type": "bearer", "user": user}

@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(response: Response):
    """
    Logs out the user by clearing the refresh token cookie.
    """
    response.delete_cookie(key="refresh_token")
    return {"detail": "Successfully logged out"}

@router.post("/oauth/google", response_model=Token)
async def oauth_google(oauth_in: OAuthLoginRequest, db: AsyncSession = Depends(get_db)):
    """
    OAuth2 Google login stub. Verifies code and logs user in.
    """
    # Stub: mock successful login for a fake email/user
    result = await db.execute(select(User).where(User.email == "google_user@fake-institute.org"))
    user = result.scalar_one_or_none()
    if not user:
        # Create a mock Google user
        hashed_pw = security.hash_password("OauthGoogle123!")
        user = User(
            email="google_user@fake-institute.org",
            hashed_password=hashed_pw,
            role="student",
            status="active"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    
    access_token = security.create_access_token(subject=user.id)
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.post("/oauth/facebook", response_model=Token)
async def oauth_facebook(oauth_in: OAuthLoginRequest, db: AsyncSession = Depends(get_db)):
    """
    OAuth2 Facebook login stub.
    """
    result = await db.execute(select(User).where(User.email == "facebook_user@fake-institute.org"))
    user = result.scalar_one_or_none()
    if not user:
        hashed_pw = security.hash_password("OauthFacebook123!")
        user = User(
            email="facebook_user@fake-institute.org",
            hashed_password=hashed_pw,
            role="student",
            status="active"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    
    access_token = security.create_access_token(subject=user.id)
    return {"access_token": access_token, "token_type": "bearer", "user": user}
@router.delete("/users/{user_id}", status_code=200)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(permissions.USER_MANAGE))
):
    """
    Delete a user (only SuperAdmin or users with USER_MANAGE permission)
    """
    result = await db.execute(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent self delete (optional safety)
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete yourself")

    # Soft delete (recommended)
    user.deleted_at = datetime.utcnow()

    await db.commit()

    return {"message": "User deleted successfully"}