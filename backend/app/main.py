from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.v1.router import api_router
from app.core.config import settings

app = FastAPI(
    title="ThingMarket API",
    description="띵마켓 — 위치 기반 동네 중고거래 플랫폼",
    version="0.1.0",
)


# CORS 미들웨어 안쪽에서 예외를 잡아 JSONResponse로 변환한다.
# 이렇게 해야 500 에러에도 CORS 헤더가 포함된다.
@app.middleware("http")
async def catch_unhandled_exceptions(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={"detail": "내부 서버 오류가 발생했습니다"},
        )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["헬스체크"])
def health_check():
    return {"status": "ok", "service": "ThingMarket API"}
