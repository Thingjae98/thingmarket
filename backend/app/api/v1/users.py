from fastapi import APIRouter, Depends, status
from app.core.security import get_current_user
from app.models.user import ProfileUpdate, LocationUpdate, ProfileResponse
from app.models.product import ProductListItem
from app.models.common import MessageResponse
from app.services import user_service

router = APIRouter()


@router.get("/me", response_model=ProfileResponse)
def get_my_profile(payload: dict = Depends(get_current_user)):
    """내 프로필을 조회한다."""
    return user_service.get_profile(payload["sub"])


@router.patch("/me", response_model=ProfileResponse)
def update_my_profile(body: ProfileUpdate, payload: dict = Depends(get_current_user)):
    """닉네임, 소개글, 프로필 이미지, 검색 반경을 수정한다."""
    return user_service.update_profile(payload["sub"], body)


@router.patch("/me/location", response_model=MessageResponse, status_code=status.HTTP_200_OK)
def update_my_location(body: LocationUpdate, payload: dict = Depends(get_current_user)):
    """GPS 좌표로 내 위치를 업데이트한다. PostGIS GEOGRAPHY 타입으로 저장된다."""
    user_service.update_location(payload["sub"], body)
    return {"message": "위치가 업데이트되었습니다"}


@router.get("/me/likes", response_model=list[ProductListItem])
def get_my_likes(payload: dict = Depends(get_current_user)):
    """내가 찜한 상품 목록을 조회한다."""
    return user_service.get_liked_products(payload["sub"])


@router.get("/{user_id}", response_model=ProfileResponse)
def get_user_profile(user_id: str):
    """타인의 공개 프로필을 조회한다."""
    return user_service.get_profile(user_id)


@router.get("/{user_id}/products", response_model=list[ProductListItem])
def get_user_products(user_id: str):
    """특정 사용자의 판매 상품 목록을 조회한다."""
    return user_service.get_user_products(user_id)
