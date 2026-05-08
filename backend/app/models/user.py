from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    nickname: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("비밀번호는 6자 이상이어야 합니다")
        return v

    @field_validator("nickname")
    @classmethod
    def nickname_min_length(cls, v: str) -> str:
        if len(v.strip()) < 2:
            raise ValueError("닉네임은 2자 이상이어야 합니다")
        return v.strip()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    user_id: str


class ProfileUpdate(BaseModel):
    nickname: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    search_radius: Optional[int] = None

    @field_validator("search_radius")
    @classmethod
    def radius_allowed(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v not in (1, 3, 5):
            raise ValueError("반경은 1, 3, 5 km 중 하나여야 합니다")
        return v


class LocationUpdate(BaseModel):
    lat: float
    lng: float
    location_name: str


class ProfileResponse(BaseModel):
    id: str
    nickname: str
    bio: Optional[str]
    avatar_url: Optional[str]
    manner_temp: float
    location_name: Optional[str]
    search_radius: int
    created_at: datetime
