from fastapi import APIRouter
from app.api.v1 import auth, users, products, chats, transactions, reports, admin

api_router = APIRouter()

api_router.include_router(auth.router,         prefix="/auth",         tags=["인증"])
api_router.include_router(users.router,        prefix="/users",        tags=["사용자"])
api_router.include_router(products.router,     prefix="/products",     tags=["상품"])
api_router.include_router(chats.router,        prefix="/chats",        tags=["채팅"])
api_router.include_router(transactions.router, prefix="/transactions",  tags=["거래"])
api_router.include_router(reports.router,      prefix="/reports",      tags=["신고"])
api_router.include_router(admin.router,        prefix="/admin",        tags=["어드민"])
