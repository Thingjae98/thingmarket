from fastapi import WebSocket


class ConnectionManager:
    """
    채팅방별 WebSocket 연결을 관리한다.
    room_id → [WebSocket, ...] 형태로 메모리에 보관한다.
    서버 재시작 시 연결이 초기화되므로, 메시지 영속성은 Supabase DB가 담당한다.
    """

    def __init__(self):
        self.active: dict[str, list[WebSocket]] = {}

    async def connect(self, room_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active.setdefault(room_id, []).append(websocket)

    def disconnect(self, room_id: str, websocket: WebSocket) -> None:
        if room_id in self.active:
            self.active[room_id].remove(websocket)
            if not self.active[room_id]:
                del self.active[room_id]

    async def broadcast(self, room_id: str, message: dict) -> None:
        """같은 채팅방의 모든 연결에 메시지를 전송한다."""
        for ws in self.active.get(room_id, []):
            await ws.send_json(message)


manager = ConnectionManager()
