from fastapi import HTTPException, status
from app.core.database import supabase_admin
from app.models.user import ProfileUpdate, LocationUpdate


def get_profile(user_id: str) -> dict:
    result = supabase_admin.table("profiles").select("*").eq("id", user_id).maybe_single().execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다")
    return result.data


def update_profile(user_id: str, data: ProfileUpdate) -> dict:
    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="수정할 항목이 없습니다")

    # 닉네임 중복 확인
    if "nickname" in update_data:
        dup = (
            supabase_admin.table("profiles")
            .select("id")
            .eq("nickname", update_data["nickname"])
            .neq("id", user_id)
            .maybe_single()
            .execute()
        )
        if dup.data:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 사용 중인 닉네임입니다")

    result = (
        supabase_admin.table("profiles")
        .update(update_data)
        .eq("id", user_id)
        .execute()
    )
    return result.data[0]


def update_location(user_id: str, data: LocationUpdate) -> None:
    supabase_admin.rpc(
        "update_user_location",
        {
            "p_user_id": user_id,
            "p_lat": data.lat,
            "p_lng": data.lng,
            "p_location_name": data.location_name,
        },
    ).execute()


def get_liked_products(user_id: str) -> list[dict]:
    result = (
        supabase_admin.table("likes")
        .select(
            "products("
            "id, seller_id, title, price, status, location_name,"
            "view_count, like_count, is_negotiable, created_at,"
            "product_images(image_url, display_order),"
            "profiles!products_seller_id_fkey(nickname)"
            ")"
        )
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    items = []
    for row in result.data or []:
        p = row.get("products")
        if not p:
            continue
        imgs = sorted(p.pop("product_images", []) or [], key=lambda x: x.get("display_order", 0))
        seller = p.pop("profiles", {}) or {}
        p["thumbnail_url"] = imgs[0]["image_url"] if imgs else None
        p["seller_nickname"] = seller.get("nickname")
        p["distance_km"] = None
        items.append(p)
    return items


def get_user_products(user_id: str) -> list[dict]:
    result = (
        supabase_admin.table("products")
        .select(
            "id, seller_id, title, price, status, location_name,"
            "view_count, like_count, is_negotiable, created_at,"
            "product_images(image_url, display_order),"
            "profiles!products_seller_id_fkey(nickname)"
        )
        .eq("seller_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    items = []
    for p in result.data or []:
        imgs = sorted(p.pop("product_images", []) or [], key=lambda x: x.get("display_order", 0))
        seller = p.pop("profiles", {}) or {}
        p["thumbnail_url"] = imgs[0]["image_url"] if imgs else None
        p["seller_nickname"] = seller.get("nickname")
        p["distance_km"] = None
        items.append(p)
    return items
