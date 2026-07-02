import datetime
from typing import Any
from jose import jwt, JWTError
from passlib.hash import argon2
from app.core.config import settings

def hash_password(password: str) -> str:
    """Hashes a plain text password using Argon2."""
    return argon2.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain text password against a stored Argon2 hash."""
    try:
        return argon2.verify(plain_password, hashed_password)
    except Exception:
        return False

def create_access_token(subject: str | Any, expires_delta: datetime.timedelta | None = None) -> str:
    """Generates a short-lived JWT access token for authentication."""
    if expires_delta:
        expire = datetime.datetime.now(datetime.timezone.utc) + expires_delta
    else:
        expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject), "type": "access"}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(subject: str | Any, expires_delta: datetime.timedelta | None = None) -> str:
    """Generates a long-lived JWT refresh token."""
    if expires_delta:
        expire = datetime.datetime.now(datetime.timezone.utc) + expires_delta
    else:
        expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> dict[str, Any]:
    """Decodes and validates a JWT token. Raises JWTError if invalid."""
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    return payload
