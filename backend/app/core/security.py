import datetime
from typing import Any

from jose import JWTError, jwt
from passlib.hash import argon2

from app.core.config import settings


# ==========================
# Password Functions
# ==========================

def hash_password(password: str) -> str:
    """Hash a plain password using Argon2."""
    return argon2.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against an Argon2 hash."""
    try:
        return argon2.verify(plain_password, hashed_password)
    except Exception as e:
        print("\n========== PASSWORD VERIFY ERROR ==========")
        print("Error:", e)
        print("Plain Password:", repr(plain_password))
        print("Stored Hash:", hashed_password)
        print("===========================================\n")
        return False


# ==========================
# JWT Functions
# ==========================

def create_access_token(
    subject: str | Any,
    expires_delta: datetime.timedelta | None = None,
) -> str:
    if expires_delta:
        expire = datetime.datetime.now(datetime.timezone.utc) + expires_delta
    else:
        expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    payload = {
        "sub": str(subject),
        "type": "access",
        "exp": expire,
    }

    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def create_refresh_token(
    subject: str | Any,
    expires_delta: datetime.timedelta | None = None,
) -> str:
    if expires_delta:
        expire = datetime.datetime.now(datetime.timezone.utc) + expires_delta
    else:
        expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )

    payload = {
        "sub": str(subject),
        "type": "refresh",
        "exp": expire,
    }

    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def decode_token(token: str) -> dict[str, Any]:
    """Decode JWT token."""
    return jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM],
    )


# =====================================================
# TEMPORARY DEBUG FUNCTION
# Remove after debugging
# =====================================================

def debug_hash():
    """
    Debug function to verify Argon2 is working correctly.
    """

    password = "Admin@123"

    print("\n================ HASH TEST ================\n")

    hashed = hash_password(password)

    print("Password        :", password)
    print("Generated Hash  :", hashed)
    print("Verify Correct  :", verify_password(password, hashed))
    print("Verify Wrong    :", verify_password("Admin@1234", hashed))

    print("\n===========================================\n")