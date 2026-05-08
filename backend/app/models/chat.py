from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ChatRoomCreate(BaseModel):
    product_id: str


class ChatMessageCreate(BaseModel):
    content: str
    message_type: str = "text"


class ChatMessageResponse(BaseModel):
    id: str
    room_id: str
    sender_id: str
    content: str
    message_type: str
    is_read: bool
    created_at: datetime
    sender_nickname: Optional[str] = None


class ChatRoomResponse(BaseModel):
    id: str
    product_id: str
    buyer_id: str
    seller_id: str
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    buyer_unread: int
    seller_unread: int
    product_title: Optional[str] = None
    product_thumbnail: Optional[str] = None
    other_nickname: Optional[str] = None
