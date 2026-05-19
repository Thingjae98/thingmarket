import time
import httpx
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings

bearer_scheme = HTTPBearer()
bearer_scheme_optional = HTTPBearer(auto_error=False)

# JWKS 인메모리 캐시 (1시간 TTL)
# Supabase가 ECC P-256 키로 전환되어 HS256 시크릿 대신 JWKS 공개키로 검증한다.
_jwks_cache: dict | None = None
_jwks_fetched_at: float = 0.0
_JWKS_TTL = 3600


def _get_jwks() -> dict:
    global _jwks_cache, _jwks_fetched_at
    if _jwks_cache is None or time.time() - _jwks_fetched_at > _JWKS_TTL:
        resp = httpx.get(settings.SUPABASE_JWKS_URL, timeout=5)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        _jwks_fetched_at = time.time()
    return _jwks_cache


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    Bearer 토큰을 Supabase JWKS 공개키로 검증하고 페이로드를 반환한다.
    ES256(ECC P-256) 및 하위 호환 HS256 모두 지원한다.
    """
    token = credentials.credentials
    try:
        jwks = _get_jwks()
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        # kid가 일치하는 키 선택, 없으면 첫 번째 키 사용
        signing_key = next(
            (k for k in jwks.get("keys", []) if k.get("kid") == kid),
            jwks["keys"][0] if jwks.get("keys") else None,
        )
        if signing_key is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="유효하지 않은 토큰입니다",
            )

        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["ES256", "RS256", "HS256"],
            options={"verify_aud": False},
        )
        if not payload.get("sub"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="유효하지 않은 토큰입니다",
            )
        return payload

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 토큰입니다",
        )


def verify_token(token: str) -> dict | None:
    """WebSocket 등 Depends를 쓸 수 없는 곳에서 토큰을 직접 검증한다."""
    try:
        jwks = _get_jwks()
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        signing_key = next(
            (k for k in jwks.get("keys", []) if k.get("kid") == kid),
            jwks["keys"][0] if jwks.get("keys") else None,
        )
        if signing_key is None:
            return None
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["ES256", "RS256", "HS256"],
            options={"verify_aud": False},
        )
        return payload if payload.get("sub") else None
    except Exception:
        return None


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme_optional),
) -> dict | None:
    """토큰이 없으면 None, 있으면 페이로드 반환. 비로그인 허용 엔드포인트에 사용."""
    if credentials is None:
        return None
    return verify_token(credentials.credentials)


def require_admin(payload: dict = Depends(get_current_user)) -> dict:
    """role이 admin인 사용자만 통과시킨다.
    app_metadata는 서버 전용(서비스 롤만 수정 가능)이므로
    user_metadata 대신 app_metadata에서 role을 읽어야 한다."""
    role = (payload.get("app_metadata") or {}).get("role")
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자 권한이 필요합니다",
        )
    return payload
