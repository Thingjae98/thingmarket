from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


class ProductCreate(BaseModel):
    title: str
    description: Optional[str] = None
    price: int
    category_id: Optional[int] = None
    is_negotiable: bool = True
    location_name: str
    lat: float
    lng: float

    @field_validator("price")
    @classmethod
    def price_non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("가격은 0원 이상이어야 합니다")
        return v

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("제목을 입력해 주세요")
        return v.strip()


class ProductUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[int] = None
    category_id: Optional[int] = None
    is_negotiable: Optional[bool] = None


class ProductStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def status_valid(cls, v: str) -> str:
        if v not in ("selling", "reserved", "sold"):
            raise ValueError("올바르지 않은 거래 상태입니다")
        return v


class ProductImageResponse(BaseModel):
    id: str
    image_url: str
    display_order: int


class ProductListItem(BaseModel):
    id: str
    seller_id: str
    title: str
    price: int
    status: str
    location_name: Optional[str]
    view_count: int
    like_count: int
    is_negotiable: bool
    created_at: datetime
    thumbnail_url: Optional[str] = None
    seller_nickname: Optional[str] = None
    distance_km: Optional[float] = None


class ProductDetail(BaseModel):
    id: str
    seller_id: str
    title: str
    description: Optional[str]
    price: int
    category_id: Optional[int]
    status: str
    location_name: Optional[str]
    view_count: int
    like_count: int
    is_negotiable: bool
    created_at: datetime
    updated_at: datetime
    images: list[ProductImageResponse] = []
    seller_nickname: Optional[str] = None
    seller_avatar: Optional[str] = None
    seller_manner_temp: Optional[float] = None
    is_liked: bool = False
