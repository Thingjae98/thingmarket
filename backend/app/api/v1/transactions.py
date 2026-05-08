from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.models.transaction import (
    WalletResponse, ChargeRequest, PurchaseRequest, TransactionResponse
)
from app.services import transaction_service

router = APIRouter()


@router.get("/wallet", response_model=WalletResponse)
def get_wallet(payload: dict = Depends(get_current_user)):
    """내 가상 지갑 잔액 조회."""
    return transaction_service.get_wallet(payload["sub"])


@router.post("/wallet/charge", response_model=WalletResponse)
def charge_wallet(body: ChargeRequest, payload: dict = Depends(get_current_user)):
    """가상 포인트 충전 (Mock — 실제 PG 없음)."""
    return transaction_service.charge_wallet(payload["sub"], body)


@router.post("/purchase", response_model=TransactionResponse)
def purchase(body: PurchaseRequest, payload: dict = Depends(get_current_user)):
    """
    구매 요청. 잔액 차감 후 에스크로(escrowed) 상태로 거래 생성.
    판매자가 /confirm 호출 시 completed → 판매자 잔액 증가.
    """
    return transaction_service.purchase(payload["sub"], body)


@router.post("/{tx_id}/confirm", response_model=TransactionResponse)
def confirm(tx_id: str, payload: dict = Depends(get_current_user)):
    """판매자가 거래를 확정한다. escrowed → completed."""
    return transaction_service.confirm_transaction(tx_id, payload["sub"])


@router.post("/{tx_id}/cancel", response_model=TransactionResponse)
def cancel(tx_id: str, payload: dict = Depends(get_current_user)):
    """거래를 취소하고 구매자에게 환불한다. escrowed → cancelled."""
    return transaction_service.cancel_transaction(tx_id, payload["sub"])
