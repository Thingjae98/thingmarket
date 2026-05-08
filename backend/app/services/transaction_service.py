from fastapi import HTTPException, status
from app.core.database import supabase_admin
from app.models.transaction import ChargeRequest, PurchaseRequest
import uuid


def get_wallet(user_id: str) -> dict:
    result = (
        supabase_admin.table("virtual_wallets")
        .select("*")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="지갑을 찾을 수 없습니다")
    return result.data


def charge_wallet(user_id: str, data: ChargeRequest) -> dict:
    if data.amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="충전 금액은 1원 이상이어야 합니다")

    wallet = get_wallet(user_id)
    new_balance = wallet["balance"] + data.amount

    result = (
        supabase_admin.table("virtual_wallets")
        .update({"balance": new_balance})
        .eq("user_id", user_id)
        .execute()
    )
    return result.data[0]


def purchase(buyer_id: str, data: PurchaseRequest) -> dict:
    """
    에스크로 구매 요청.
    구매자 잔액 차감 → 거래 레코드 생성(pending → escrowed)
    판매자가 확정하면 escrowed → completed + 판매자 잔액 증가
    """
    # 상품 조회
    product = (
        supabase_admin.table("products")
        .select("id, seller_id, price, status")
        .eq("id", data.product_id)
        .maybe_single()
        .execute()
    )
    if not product.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="상품을 찾을 수 없습니다")
    if product.data["status"] != "selling":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="판매중인 상품만 구매할 수 있습니다")
    if product.data["seller_id"] == buyer_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="본인 상품은 구매할 수 없습니다")

    amount = product.data["price"]
    seller_id = product.data["seller_id"]

    # 구매자 잔액 확인
    buyer_wallet = get_wallet(buyer_id)
    if buyer_wallet["balance"] < amount:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="잔액이 부족합니다")

    # 잔액 차감 (에스크로: 즉시 판매자에게 보내지 않고 pending 상태로 보관)
    supabase_admin.table("virtual_wallets").update(
        {"balance": buyer_wallet["balance"] - amount}
    ).eq("user_id", buyer_id).execute()

    # 거래 생성
    tx_id = str(uuid.uuid4())
    result = supabase_admin.table("virtual_transactions").insert({
        "id": tx_id,
        "product_id": data.product_id,
        "buyer_id": buyer_id,
        "seller_id": seller_id,
        "amount": amount,
        "status": "escrowed",
    }).execute()

    # 상품 상태 → reserved
    supabase_admin.table("products").update({"status": "reserved"}).eq(
        "id", data.product_id
    ).execute()

    return result.data[0]


def confirm_transaction(tx_id: str, seller_id: str) -> dict:
    """판매자가 거래를 확정한다. escrowed → completed + 판매자 잔액 증가."""
    tx = _get_tx(tx_id)
    if tx["seller_id"] != seller_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="권한이 없습니다")
    if tx["status"] != "escrowed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="에스크로 상태인 거래만 확정할 수 있습니다")

    # 판매자 잔액 증가
    seller_wallet = get_wallet(seller_id)
    supabase_admin.table("virtual_wallets").update(
        {"balance": seller_wallet["balance"] + tx["amount"]}
    ).eq("user_id", seller_id).execute()

    # 거래 완료 + 상품 sold
    result = supabase_admin.table("virtual_transactions").update(
        {"status": "completed"}
    ).eq("id", tx_id).execute()

    supabase_admin.table("products").update({"status": "sold"}).eq(
        "id", tx["product_id"]
    ).execute()

    return result.data[0]


def cancel_transaction(tx_id: str, user_id: str) -> dict:
    """거래를 취소한다. escrowed → cancelled + 구매자 환불."""
    tx = _get_tx(tx_id)
    if user_id not in (tx["buyer_id"], tx["seller_id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="권한이 없습니다")
    if tx["status"] != "escrowed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="에스크로 상태인 거래만 취소할 수 있습니다")

    # 구매자 환불
    buyer_wallet = get_wallet(tx["buyer_id"])
    supabase_admin.table("virtual_wallets").update(
        {"balance": buyer_wallet["balance"] + tx["amount"]}
    ).eq("user_id", tx["buyer_id"]).execute()

    result = supabase_admin.table("virtual_transactions").update(
        {"status": "cancelled"}
    ).eq("id", tx_id).execute()

    # 상품 상태 복구
    supabase_admin.table("products").update({"status": "selling"}).eq(
        "id", tx["product_id"]
    ).execute()

    return result.data[0]


def _get_tx(tx_id: str) -> dict:
    result = (
        supabase_admin.table("virtual_transactions")
        .select("*")
        .eq("id", tx_id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="거래를 찾을 수 없습니다")
    return result.data
