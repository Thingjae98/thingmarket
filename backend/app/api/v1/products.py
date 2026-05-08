from fastapi import APIRouter, Depends, Query, UploadFile, File, status
from typing import Optional
from app.core.security import get_current_user
from app.models.product import (
    ProductCreate, ProductUpdate, ProductStatusUpdate,
    ProductDetail, ProductListItem,
)
from app.models.common import MessageResponse
from app.services import product_service

router = APIRouter()


@router.get("", response_model=list[ProductListItem])
def list_products(
    lat: float = Query(..., description="위도"),
    lng: float = Query(..., description="경도"),
    radius: float = Query(3, description="검색 반경 km (1/3/5)"),
    category_id: Optional[int] = Query(None),
    product_status: Optional[str] = Query(None, alias="status"),
    limit: int = Query(20, le=50),
    offset: int = Query(0, ge=0),
):
    """위치 기반 근처 상품 목록 조회. PostGIS ST_DWithin 사용."""
    return product_service.list_products(lat, lng, radius, category_id, product_status, limit, offset)


@router.get("/search", response_model=list[ProductListItem])
def search_products(
    keyword: str = Query(..., min_length=1),
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    radius: Optional[float] = Query(None),
    limit: int = Query(20, le=50),
    offset: int = Query(0, ge=0),
):
    """키워드로 상품 검색. 위치 파라미터 제공 시 반경 필터 추가."""
    return product_service.search_products(keyword, lat, lng, radius, limit, offset)


@router.post("", response_model=ProductDetail, status_code=status.HTTP_201_CREATED)
def create_product(
    title: str,
    price: int,
    location_name: str,
    lat: float,
    lng: float,
    description: Optional[str] = None,
    category_id: Optional[int] = None,
    is_negotiable: bool = True,
    images: list[UploadFile] = File(default=[]),
    payload: dict = Depends(get_current_user),
):
    """상품 등록. 이미지는 multipart/form-data로 최대 10장 업로드."""
    data = ProductCreate(
        title=title,
        description=description,
        price=price,
        category_id=category_id,
        is_negotiable=is_negotiable,
        location_name=location_name,
        lat=lat,
        lng=lng,
    )
    return product_service.create_product(payload["sub"], data, images or None)


@router.get("/{product_id}", response_model=ProductDetail)
def get_product(
    product_id: str,
    payload: Optional[dict] = Depends(lambda: None),
):
    """상품 상세 조회. 조회 시 view_count 자동 증가."""
    return product_service.get_product(product_id)


@router.patch("/{product_id}", response_model=ProductDetail)
def update_product(
    product_id: str,
    body: ProductUpdate,
    payload: dict = Depends(get_current_user),
):
    """내 상품 정보 수정."""
    return product_service.update_product(product_id, payload["sub"], body)


@router.patch("/{product_id}/status", response_model=ProductDetail)
def change_status(
    product_id: str,
    body: ProductStatusUpdate,
    payload: dict = Depends(get_current_user),
):
    """거래 상태 변경: selling → reserved → sold"""
    return product_service.change_status(product_id, payload["sub"], body)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: str,
    payload: dict = Depends(get_current_user),
):
    """내 상품 삭제."""
    product_service.delete_product(product_id, payload["sub"])


@router.post("/{product_id}/like")
def toggle_like(
    product_id: str,
    payload: dict = Depends(get_current_user),
):
    """관심상품 등록/해제 토글."""
    return product_service.toggle_like(payload["sub"], product_id)
