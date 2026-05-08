from fastapi import APIRouter, Depends, Query
from typing import Optional
from app.core.security import require_admin
from app.core.database import supabase_admin

router = APIRouter()


@router.get("/stats")
def get_stats(payload: dict = Depends(require_admin)):
    """대시보드 통계: 전체 사용자 수, 상품 수, 거래 수, 신고 수."""
    users = supabase_admin.table("profiles").select("id", count="exact").execute()
    products = supabase_admin.table("products").select("id", count="exact").execute()
    transactions = supabase_admin.table("virtual_transactions").select("id", count="exact").execute()
    reports = supabase_admin.table("reports").select("id", count="exact").eq("status", "pending").execute()

    return {
        "total_users": users.count,
        "total_products": products.count,
        "total_transactions": transactions.count,
        "pending_reports": reports.count,
    }


@router.get("/users")
def list_users(
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    keyword: Optional[str] = Query(None),
    payload: dict = Depends(require_admin),
):
    """사용자 목록 조회 (닉네임 검색 포함)."""
    query = supabase_admin.table("profiles").select("*").order("created_at", desc=True)
    if keyword:
        query = query.ilike("nickname", f"%{keyword}%")
    result = query.range(offset, offset + limit - 1).execute()
    return result.data or []


@router.patch("/users/{user_id}/ban")
def ban_user(user_id: str, payload: dict = Depends(require_admin)):
    """사용자 정지/해제 토글."""
    user = supabase_admin.table("profiles").select("is_banned").eq("id", user_id).maybe_single().execute()
    if not user.data:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다")

    new_state = not user.data["is_banned"]
    supabase_admin.table("profiles").update({"is_banned": new_state}).eq("id", user_id).execute()
    return {"is_banned": new_state}


@router.get("/products")
def list_products_admin(
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    payload: dict = Depends(require_admin),
):
    """상품 전체 목록 (어드민용)."""
    result = (
        supabase_admin.table("products")
        .select("id, title, price, status, seller_id, created_at, profiles!products_seller_id_fkey(nickname)")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return result.data or []


@router.delete("/products/{product_id}")
def delete_product_admin(product_id: str, payload: dict = Depends(require_admin)):
    """어드민이 상품 강제 삭제."""
    supabase_admin.table("products").delete().eq("id", product_id).execute()
    return {"message": "삭제되었습니다"}


@router.get("/reports")
def list_reports(
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    payload: dict = Depends(require_admin),
):
    """신고 목록 조회."""
    query = supabase_admin.table("reports").select("*").order("created_at", desc=True)
    if status_filter:
        query = query.eq("status", status_filter)
    result = query.range(offset, offset + limit - 1).execute()
    return result.data or []


@router.get("/chats")
def list_chats_admin(
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    payload: dict = Depends(require_admin),
):
    """채팅방 전체 목록 (어드민용)."""
    result = (
        supabase_admin.table("chat_rooms")
        .select(
            "id, product_id, buyer_id, seller_id, last_message, last_message_at, created_at,"
            "products(title),"
            "buyer:profiles!chat_rooms_buyer_id_fkey(nickname),"
            "seller:profiles!chat_rooms_seller_id_fkey(nickname)"
        )
        .order("last_message_at", desc=True, nulls_first=False)
        .range(offset, offset + limit - 1)
        .execute()
    )
    rooms = []
    for r in result.data or []:
        product = r.pop("products", {}) or {}
        buyer = r.pop("buyer", {}) or {}
        seller = r.pop("seller", {}) or {}
        r["product_title"] = product.get("title")
        r["buyer_nickname"] = buyer.get("nickname")
        r["seller_nickname"] = seller.get("nickname")
        rooms.append(r)
    return rooms


@router.get("/chats/{room_id}/messages")
def get_chat_messages_admin(
    room_id: str,
    limit: int = Query(50, le=200),
    payload: dict = Depends(require_admin),
):
    """특정 채팅방의 메시지 조회 (어드민용)."""
    result = (
        supabase_admin.table("chat_messages")
        .select("*, profiles!chat_messages_sender_id_fkey(nickname)")
        .eq("room_id", room_id)
        .order("created_at", desc=False)
        .limit(limit)
        .execute()
    )
    messages = []
    for m in result.data or []:
        sender = m.pop("profiles", {}) or {}
        m["sender_nickname"] = sender.get("nickname")
        messages.append(m)
    return messages


@router.patch("/reports/{report_id}")
def update_report(
    report_id: str,
    body: dict,
    payload: dict = Depends(require_admin),
):
    """신고 상태 변경 + 어드민 메모."""
    update_data = {}
    if "status" in body:
        update_data["status"] = body["status"]
    if "admin_note" in body:
        update_data["admin_note"] = body["admin_note"]

    result = supabase_admin.table("reports").update(update_data).eq("id", report_id).execute()
    return result.data[0] if result.data else {}
