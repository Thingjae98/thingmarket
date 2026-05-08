from fastapi import HTTPException, status
from app.core.database import supabase_admin
from app.models.chat import ChatRoomCreate, ChatMessageCreate
import uuid


def get_or_create_room(buyer_id: str, data: ChatRoomCreate) -> dict:
    # 상품 존재 + 판매자 확인
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

    # 기존 채팅방 조회
    existing = (
        supabase_admin.table("chat_rooms")
        .select("*")
        .eq("product_id", data.product_id)
        .eq("buyer_id", buyer_id)
        .maybe_single()
        .execute()
    )
    if existing.data:
        return _enrich_room(existing.data, buyer_id)

    # 신규 생성
    room_id = str(uuid.uuid4())
    result = supabase_admin.table("chat_rooms").insert({
        "id": room_id,
        "product_id": data.product_id,
        "buyer_id": buyer_id,
        "seller_id": seller_id,
    }).execute()

    return _enrich_room(result.data[0], buyer_id)


def list_rooms(user_id: str) -> list[dict]:
    result = (
        supabase_admin.table("chat_rooms")
        .select("*")
        .or_(f"buyer_id.eq.{user_id},seller_id.eq.{user_id}")
        .order("last_message_at", desc=True)
        .execute()
    )
    return [_enrich_room(r, user_id) for r in result.data or []]


def get_room(room_id: str, user_id: str) -> dict:
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
    return _enrich_room(room.data, user_id)


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
    if room["buyer_id"] == user_id:
        supabase_admin.table("chat_rooms").update({"buyer_unread": 0}).eq("id", room_id).execute()
    else:
        supabase_admin.table("chat_rooms").update({"seller_unread": 0}).eq("id", room_id).execute()


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

    # last_message + unread 카운트 업데이트
    is_buyer = room["buyer_id"] == sender_id
    supabase_admin.table("chat_rooms").update({
        "last_message": data.content,
        "last_message_at": msg["created_at"],
        "buyer_unread" if not is_buyer else "seller_unread":
            (room["buyer_unread"] if not is_buyer else room["seller_unread"]) + 1,
    }).eq("id", room_id).execute()

    # 보낸 사람 닉네임 조회
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


def _enrich_room(room: dict, viewer_id: str) -> dict:
    product = (
        supabase_admin.table("products")
        .select("title, product_images(image_url, display_order)")
        .eq("id", room["product_id"])
        .maybe_single()
        .execute()
    )
    if product.data:
        room["product_title"] = product.data["title"]
        imgs = sorted(product.data.get("product_images", []) or [], key=lambda x: x.get("display_order", 0))
        room["product_thumbnail"] = imgs[0]["image_url"] if imgs else None
    else:
        room["product_title"] = None
        room["product_thumbnail"] = None

    other_id = room["seller_id"] if room["buyer_id"] == viewer_id else room["buyer_id"]
    other = (
        supabase_admin.table("profiles")
        .select("nickname")
        .eq("id", other_id)
        .maybe_single()
        .execute()
    )
    room["other_nickname"] = other.data["nickname"] if other.data else None
    return room
