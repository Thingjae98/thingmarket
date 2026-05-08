from fastapi import APIRouter, HTTPException, status, Depends
from app.core.database import supabase
from app.core.security import get_current_user
from app.models.user import RegisterRequest, LoginRequest, RefreshRequest, AuthResponse
from app.models.common import MessageResponse

router = APIRouter()


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest):
    """이메일로 회원가입한다. 가입 즉시 로그인 상태가 된다."""
    try:
        res = supabase.auth.sign_up({
            "email": body.email,
            "password": body.password,
            "options": {"data": {"nickname": body.nickname}},
        })
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="회원가입에 실패했습니다")

    if res.user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="이미 사용 중인 이메일입니다")

    # 이메일 인증 미사용 시 session이 바로 발급된다
    if res.session is None:
        return {"message": "가입 확인 이메일을 발송했습니다. 이메일을 확인해 주세요."}

    return AuthResponse(
        access_token=res.session.access_token,
        refresh_token=res.session.refresh_token,
        user_id=str(res.user.id),
    )


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest):
    """이메일/비밀번호로 로그인한다."""
    try:
        res = supabase.auth.sign_in_with_password({
            "email": body.email,
            "password": body.password,
        })
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다",
        )

    return AuthResponse(
        access_token=res.session.access_token,
        refresh_token=res.session.refresh_token,
        user_id=str(res.user.id),
    )


@router.get("/social/{provider}")
def social_login_url(provider: str):
    """카카오·구글 소셜 로그인 URL을 반환한다. 프론트엔드가 이 URL로 리다이렉트한다."""
    if provider not in ("google", "kakao"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="지원하지 않는 로그인 방식입니다")

    res = supabase.auth.sign_in_with_oauth({
        "provider": provider,
        "options": {"redirect_to": "http://localhost:3000/auth/callback"},
    })
    return {"url": res.url}


@router.post("/refresh", response_model=AuthResponse)
def refresh_token(body: RefreshRequest):
    """리프레시 토큰으로 새 액세스 토큰을 발급받는다."""
    try:
        res = supabase.auth.refresh_session(body.refresh_token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰 갱신에 실패했습니다. 다시 로그인해 주세요",
        )

    return AuthResponse(
        access_token=res.session.access_token,
        refresh_token=res.session.refresh_token,
        user_id=str(res.user.id),
    )


@router.post("/logout", response_model=MessageResponse)
def logout(payload: dict = Depends(get_current_user)):
    """현재 세션을 로그아웃 처리한다."""
    try:
        supabase.auth.sign_out()
    except Exception:
        pass  # 이미 만료된 세션도 로그아웃 성공으로 처리
    return {"message": "로그아웃되었습니다"}
