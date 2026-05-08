from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class WalletResponse(BaseModel):
    id: str
    user_id: str
    balance: int


class ChargeRequest(BaseModel):
    amount: int


class PurchaseRequest(BaseModel):
    product_id: str


class TransactionResponse(BaseModel):
    id: str
    product_id: str
    buyer_id: str
    seller_id: str
    amount: int
    status: str
    created_at: datetime
    updated_at: datetime
