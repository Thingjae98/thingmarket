from fastapi import HTTPException, status
from app.core.database import supabase_admin
from app.models.chat import ChatRoomCreate, ChatMessageCreate
import uuid

# 채팅방 조회 시 공통으로 사용하는 SELECT 절.
# 단일 JOIN 쿼리로 product·buyer·seller 정보를 한 번에 가져온다.
_ROOM_SELECT = (
    "*, "
    "products(title, product_images(image_url, display_order)), "
    "buyer:profiles!chat_rooms_buyer_id_fkey(nickname), "
    "seller:profiles!chat_rooms_seller_id_fkey(nickname)"
)


def get_or_create_room(buyer_id: str, data: ChatRoomCreate) -> dict:
    product = (
        supabase_admin.table("products")
        .select("id, seller_id, title")
        .eq("id", data.product_id)
        .maybe_single()
        .execute()
    )
    if not product.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="상품을 찾을 수 없습니다")

    seller_id = product.data["seller_id"]
    if seller_id == buyer_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="본인 상품에는 채팅할 수 없습니다")

    existing = (
        supabase_admin.table("chat_rooms")
        .select(_ROOM_SELECT)
        .eq("product_id", data.product_id)
        .eq("buyer_id", buyer_id)
        .maybe_single()
        .execute()
    )
    if existing.data:
        return _flatten_room(existing.data, buyer_id)

    room_id = str(uuid.uuid4())
    supabase_admin.table("chat_rooms").insert({
        "id": room_id,
        "product_id": data.product_id,
        "buyer_id": buyer_id,
        "seller_id": seller_id,
    }).execute()

    result = (
        supabase_admin.table("chat_rooms")
        .select(_ROOM_SELECT)
        .eq("id", room_id)
        .maybe_single()
        .execute()
    )
    return _flatten_room(result.data, buyer_id)


def list_rooms(user_id: str) -> list[dict]:
    result = (
        supabase_admin.table("chat_rooms")
        .select(_ROOM_SELECT)
        .or_(f"buyer_id.eq.{user_id},seller_id.eq.{user_id}")
        .order("last_message_at", desc=True)
        .execute()
    )
    return [_flatten_room(r, user_id) for r in result.data or []]


def get_room(room_id: str, user_id: str) -> dict:
    result = (
        supabase_admin.table("chat_rooms")
        .select(_ROOM_SELECT)
        .eq("id", room_id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="채팅방을 찾을 수 없습니다")
    if user_id not in (result.data["buyer_id"], result.data["seller_id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="권한이 없습니다")
    return _flatten_room(result.data, user_id)


def get_messages(room_id: str, user_id: str, limit: int = 50, before: str | None = None) -> list[dict]:
    _assert_member(room_id, user_id)

    query = (
        supabase_admin.table("chat_messages")
        .select("*, profiles!chat_messages_sender_id_fkey(nickname)")
        .eq("room_id", room_id)
        .order("created_at", desc=True)
        .limit(limit)
    )
    if before:
        query = query.lt("created_at", before)

    result = query.execute()
    messages = []
    for m in reversed(result.data or []):
        sender = m.pop("profiles", {}) or {}
        m["sender_nickname"] = sender.get("nickname")
        messages.append(m)
    return messages


def mark_read(room_id: str, user_id: str) -> None:
    room = _assert_member(room_id, user_id)
    field = "buyer_unread" if room["buyer_id"] == user_id else "seller_unread"
    supabase_admin.table("chat_rooms").update({field: 0}).eq("id", room_id).execute()


def save_message(room_id: str, sender_id: str, data: ChatMessageCreate) -> dict:
    room = _assert_member(room_id, sender_id)

    msg_id = str(uuid.uuid4())
    result = supabase_admin.table("chat_messages").insert({
        "id": msg_id,
        "room_id": room_id,
        "sender_id": sender_id,
        "content": data.content,
        "message_type": data.message_type,
    }).execute()

    msg = result.data[0]

    is_buyer = room["buyer_id"] == sender_id
    counter_field = "seller_unread" if is_buyer else "buyer_unread"
    current_count = room["seller_unread"] if is_buyer else room["buyer_unread"]
    supabase_admin.table("chat_rooms").update({
        "last_message": data.content,
        "last_message_at": msg["created_at"],
        counter_field: current_count + 1,
    }).eq("id", room_id).execute()

    profile = (
        supabase_admin.table("profiles")
        .select("nickname")
        .eq("id", sender_id)
        .maybe_single()
        .execute()
    )
    msg["sender_nickname"] = profile.data["nickname"] if profile.data else None
    return msg


# ── 내부 헬퍼 ───────────────────────────────────────────────

def _assert_member(room_id: str, user_id: str) -> dict:
    room = (
        supabase_admin.table("chat_rooms")
        .select("*")
        .eq("id", room_id)
        .maybe_single()
        .execute()
    )
    if not room.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="채팅방을 찾을 수 없습니다")
    if user_id not in (room.data["buyer_id"], room.data["seller_id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="권한이 없습니다")
    return room.data


def _flatten_room(room: dict, viewer_id: str) -> dict:
    """JOIN으로 가져온 중첩 데이터를 평탄화한다. DB 호출 없음."""
    product = room.pop("products", {}) or {}
    buyer_info = room.pop("buyer", {}) or {}
    seller_info = room.pop("seller", {}) or {}

    room["product_title"] = product.get("title")
    imgs = sorted(product.get("product_images", []) or [], key=lambda x: x.get("display_order", 0))
    room["product_thumbnail"] = imgs[0]["image_url"] if imgs else None

    other_info = seller_info if room["buyer_id"] == viewer_id else buyer_info
    room["other_nickname"] = other_info.get("nickname")
    return room
