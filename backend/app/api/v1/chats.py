from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from typing import Optional
from app.core.security import get_current_user, verify_token
from app.models.chat import ChatRoomCreate, ChatMessageCreate, ChatRoomResponse, ChatMessageResponse
from app.services import chat_service
from app.websocket.manager import manager

router = APIRouter()


@router.get("", response_model=list[ChatRoomResponse])
def list_rooms(payload: dict = Depends(get_current_user)):
    """내 채팅방 목록 조회."""
    return chat_service.list_rooms(payload["sub"])


@router.post("", response_model=ChatRoomResponse)
def create_or_get_room(body: ChatRoomCreate, payload: dict = Depends(get_current_user)):
    """채팅방 생성 or 기존 방 반환. 상품당 구매자별 1개 방만 허용."""
    return chat_service.get_or_create_room(payload["sub"], body)


@router.get("/{room_id}", response_model=ChatRoomResponse)
def get_room(room_id: str, payload: dict = Depends(get_current_user)):
    """채팅방 정보 조회."""
    return chat_service.get_room(room_id, payload["sub"])


@router.get("/{room_id}/messages", response_model=list[ChatMessageResponse])
def get_messages(
    room_id: str,
    limit: int = Query(50, le=100),
    before: Optional[str] = Query(None, description="이 timestamp 이전 메시지 조회 (무한스크롤)"),
    payload: dict = Depends(get_current_user),
):
    """메시지 목록 조회 (오래된순, 무한스크롤)."""
    return chat_service.get_messages(room_id, payload["sub"], limit, before)


@router.patch("/{room_id}/read")
def mark_read(room_id: str, payload: dict = Depends(get_current_user)):
    """채팅방 읽음 처리."""
    chat_service.mark_read(room_id, payload["sub"])
    return {"message": "읽음 처리되었습니다"}


@router.websocket("/{room_id}/ws")
async def websocket_chat(room_id: str, websocket: WebSocket, token: str = Query(...)):
    """
    실시간 채팅 WebSocket.
    연결: ws://host/api/v1/chats/{room_id}/ws?token=<JWT>
    클라이언트 → 서버: {"content": "...", "message_type": "text"}
    서버 → 모든 참여자: 저장된 메시지 JSON 브로드캐스트
    """
    payload = verify_token(token)
    if not payload:
        await websocket.close(code=4001)
        return

    user_id = payload["sub"]
    await manager.connect(room_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            msg_data = ChatMessageCreate(**data)
            saved = chat_service.save_message(room_id, user_id, msg_data)
            await manager.broadcast(room_id, saved)
    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)
