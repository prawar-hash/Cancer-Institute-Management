from pydantic import BaseModel, EmailStr, Field

class UserCreate(BaseModel):
    """Schema for creating a new user (restricted to SuperAdmin)."""
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: str = Field(default="student")  # super_admin, admin, student

class UserLogin(BaseModel):
    """Schema for email/password login."""
    email: EmailStr
    password: str

class UserRead(BaseModel):
    """Schema representing user data returned in responses."""
    id: int
    email: EmailStr
    role: str
    status: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    """Schema representing access tokens returned upon login."""
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class OAuthLoginRequest(BaseModel):
    """Schema for OAuth login callbacks."""
    code: str
    provider: str  # google, facebook
