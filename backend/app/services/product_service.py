from fastapi import HTTPException, status, UploadFile
from app.core.database import supabase_admin
from app.models.product import ProductCreate, ProductUpdate, ProductStatusUpdate
import uuid


def list_products(
    lat: float,
    lng: float,
    radius_km: float = 3,
    category_id: int | None = None,
    product_status: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> list[dict]:
    result = supabase_admin.rpc(
        "get_products_nearby",
        {
            "p_lat": lat,
            "p_lng": lng,
            "p_radius_km": radius_km,
            "p_category_id": category_id,
            "p_status": product_status,
            "p_limit": limit,
            "p_offset": offset,
        },
    ).execute()
    return result.data or []


def search_products(
    keyword: str,
    lat: float | None = None,
    lng: float | None = None,
    radius_km: float | None = None,
    limit: int = 20,
    offset: int = 0,
) -> list[dict]:
    result = supabase_admin.rpc(
        "search_products",
        {
            "p_keyword": keyword,
            "p_lat": lat,
            "p_lng": lng,
            "p_radius_km": radius_km,
            "p_limit": limit,
            "p_offset": offset,
        },
    ).execute()
    return result.data or []


def get_product(product_id: str, viewer_id: str | None = None) -> dict:
    result = (
        supabase_admin.table("products")
        .select(
            "*, "
            "product_images(id, image_url, display_order), "
            "profiles!products_seller_id_fkey(nickname, avatar_url, manner_temp)"
        )
        .eq("id", product_id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="상품을 찾을 수 없습니다")

    # 조회수 증가 (비동기 무시해도 되는 부작용)
    supabase_admin.rpc("increment_view_count", {"p_product_id": product_id}).execute()

    product = result.data
    seller = product.pop("profiles", {}) or {}
    product["seller_nickname"] = seller.get("nickname")
    product["seller_avatar"] = seller.get("avatar_url")
    product["seller_manner_temp"] = seller.get("manner_temp")
    product["images"] = sorted(
        product.pop("product_images", []) or [],
        key=lambda x: x.get("display_order", 0),
    )

    # 로그인 사용자의 찜 여부
    product["is_liked"] = False
    if viewer_id:
        like = (
            supabase_admin.table("likes")
            .select("id")
            .eq("user_id", viewer_id)
            .eq("product_id", product_id)
            .maybe_single()
            .execute()
        )
        product["is_liked"] = bool(like.data)

    return product


def create_product(
    seller_id: str,
    data: ProductCreate,
    image_files: list[UploadFile] | None = None,
) -> dict:
    # 상품 기본 정보 저장
    product_id = str(uuid.uuid4())
    insert_data = {
        "id": product_id,
        "seller_id": seller_id,
        "title": data.title,
        "description": data.description,
        "price": data.price,
        "category_id": data.category_id,
        "is_negotiable": data.is_negotiable,
        "location_name": data.location_name,
    }
    result = supabase_admin.table("products").insert(insert_data).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="상품 등록에 실패했습니다")

    # 위치 정보는 RPC로 별도 업데이트 (GEOGRAPHY 타입)
    supabase_admin.rpc(
        "set_product_location",
        {
            "p_product_id": product_id,
            "p_lat": data.lat,
            "p_lng": data.lng,
            "p_location_name": data.location_name,
        },
    ).execute()

    # 이미지 업로드 (Supabase Storage → URL 저장)
    if image_files:
        _upload_images(product_id, image_files)

    return get_product(product_id, seller_id)


def update_product(product_id: str, seller_id: str, data: ProductUpdate) -> dict:
    _assert_owner(product_id, seller_id)

    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="수정할 항목이 없습니다")

    supabase_admin.table("products").update(update_data).eq("id", product_id).execute()
    return get_product(product_id, seller_id)


def change_status(product_id: str, seller_id: str, data: ProductStatusUpdate) -> dict:
    _assert_owner(product_id, seller_id)
    supabase_admin.table("products").update({"status": data.status}).eq("id", product_id).execute()
    return get_product(product_id, seller_id)


def delete_product(product_id: str, seller_id: str) -> None:
    _assert_owner(product_id, seller_id)
    supabase_admin.table("products").delete().eq("id", product_id).execute()


def toggle_like(user_id: str, product_id: str) -> dict:
    # 상품 존재 여부 확인
    exists = (
        supabase_admin.table("products")
        .select("id")
        .eq("id", product_id)
        .maybe_single()
        .execute()
    )
    if not exists.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="상품을 찾을 수 없습니다")

    result = supabase_admin.rpc(
        "toggle_like",
        {"p_user_id": user_id, "p_product_id": product_id},
    ).execute()
    liked = result.data[0]["liked"] if result.data else False
    return {"liked": liked}


# ── 내부 헬퍼 ───────────────────────────────────────────────

def _assert_owner(product_id: str, seller_id: str) -> None:
    result = (
        supabase_admin.table("products")
        .select("seller_id")
        .eq("id", product_id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="상품을 찾을 수 없습니다")
    if result.data["seller_id"] != seller_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="권한이 없습니다")


def _upload_images(product_id: str, files: list[UploadFile]) -> None:
    for order, file in enumerate(files[:10]):  # 최대 10장
        ext = (file.filename or "image").rsplit(".", 1)[-1].lower()
        path = f"{product_id}/{order}.{ext}"
        content = file.file.read()

        upload_result = (
            supabase_admin.storage.from_("product-images").upload(
                path, content, {"content-type": file.content_type or "image/jpeg"}
            )
        )
        public_url = supabase_admin.storage.from_("product-images").get_public_url(path)

        supabase_admin.table("product_images").insert(
            {"product_id": product_id, "image_url": public_url, "display_order": order}
        ).execute()
