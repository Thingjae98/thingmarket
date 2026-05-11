# 띵마켓 면접 개념 정리

> 비전공자도 면접에서 막힘없이 설명할 수 있도록, 우리 코드와 직접 연결해서 설명합니다.
> 각 개념 옆에 "우리 코드 어디?" 를 달아놨습니다.

---

## 1. REST API란?

**한 줄 요약**: 주소(URL)와 동작(HTTP 메서드)으로 서버에 요청하는 약속

| HTTP 메서드 | 의미 | 우리 예시 |
|------------|------|-----------|
| GET | 조회 | `GET /api/v1/products` — 상품 목록 |
| POST | 생성 | `POST /api/v1/auth/register` — 회원가입 |
| PATCH | 일부 수정 | `PATCH /api/v1/users/me` — 프로필 수정 |
| DELETE | 삭제 | `DELETE /api/v1/products/{id}` — 상품 삭제 |

**HTTP 상태코드** (면접 단골):

| 코드 | 의미 | 우리가 쓰는 경우 |
|------|------|-----------------|
| 200 | 성공 | 조회, 수정 성공 |
| 201 | 생성 성공 | 상품 등록, 회원가입 |
| 204 | 성공 (응답 없음) | 삭제 성공 |
| 400 | 잘못된 요청 | 입력값 검증 실패 |
| 401 | 인증 필요 | 토큰 없음/만료 |
| 403 | 권한 없음 | 남의 상품 수정 시도 |
| 404 | 찾을 수 없음 | 없는 상품 ID 조회 |
| 409 | 충돌 | 중복 닉네임 |
| 500 | 서버 오류 | 예상 못한 에러 |

---

## 2. JWT (JSON Web Token) — 토큰 기반 인증

**왜 필요한가?** 서버가 매 요청마다 DB에서 로그인 상태를 확인하면 느립니다.
JWT는 "나는 user_id=xxx 입니다"라는 정보를 **암호화해서 클라이언트에게 줍니다**.
서버는 이 토큰만 검증하면 되니까 DB 조회가 불필요합니다.

**구조** (점(`.`)으로 3부분 구분):
```
헤더.페이로드.서명
eyJhbGciOiJFUzI1NiJ9  .  eyJzdWIiOiJ1c2VyLWlkIn0  .  서명값
    (알고리즘 정보)           (user_id, 만료시간 등)
```

**Access Token vs Refresh Token**:
- `Access Token`: 짧게 유효 (1시간). 매 API 요청에 포함. `Authorization: Bearer <토큰>`
- `Refresh Token`: 길게 유효 (2주). Access Token 만료 시 새 발급에만 사용

**우리 코드**: `backend/app/core/security.py` → `get_current_user()`

---

## 3. JWKS — 공개키 기반 JWT 검증

**왜 필요한가?** 예전엔 JWT를 "공유 비밀키(HS256)"로 서명했습니다.
Supabase가 최근 **비대칭 암호화(ECC P-256, ES256)** 로 전환했습니다.

**비대칭 암호화 원리**:
- Supabase: 개인키(private key)로 JWT **서명** → 절대 외부 공개 안 함
- 우리 서버: 공개키(public key)로 JWT **검증** → JWKS 엔드포인트에서 가져옴

**JWKS(JSON Web Key Set)**: 공개키 모음을 JSON으로 제공하는 URL
```
https://myhrvmjurwptyxuosccu.supabase.co/auth/v1/.well-known/jwks.json
```

**면접 포인트**: "HS256은 공유 비밀키라 서버가 타협되면 위험하지만,
ES256은 공개키로만 검증하므로 개인키 유출 위험이 없습니다."

**우리 코드**: `security.py` → `_get_jwks()`, 1시간 캐시로 매 요청마다 HTTP 호출 방지

---

## 4. PostGIS & ST_DWithin — 위치 기반 쿼리

**PostGIS란?** PostgreSQL에 지리 정보(위도·경도) 처리 기능을 추가한 확장 모듈

**GEOGRAPHY(Point, 4326)**:
- `4326` = WGS84 좌표계 (GPS가 쓰는 좌표계, 전 세계 표준)
- 카카오맵·구글맵이 쓰는 바로 그 좌표계

**ST_DWithin 쿼리** (핵심):
```sql
-- "이 위치(37.5, 126.9)에서 반경 3km 이내 상품 조회"
WHERE ST_DWithin(
    products.location,
    ST_SetSRID(ST_MakePoint(126.9, 37.5), 4326)::geography,
    3000  -- 미터 단위
)
```

**왜 인덱스가 필요한가?**
- 인덱스 없으면: 모든 상품 위치를 하나씩 계산 → O(n)
- GIST 인덱스 있으면: 공간 트리 탐색 → O(log n)

```sql
-- 우리 마이그레이션에 이미 추가됨
CREATE INDEX idx_products_location ON products USING GIST(location);
```

**우리 코드**: `002_product_functions.sql` → `get_products_nearby()` RPC

---

## 5. Pydantic — 데이터 검증

**역할**: 외부에서 들어오는 데이터(사용자 입력)가 올바른지 자동으로 검사

```python
class RegisterRequest(BaseModel):
    email: EmailStr      # 이메일 형식 자동 검증
    password: str
    nickname: str

    @field_validator("password")
    def password_min_length(cls, v):
        if len(v) < 6:
            raise ValueError("비밀번호는 6자 이상")  # → HTTP 422 자동 반환
        return v
```

**면접 포인트**: "DTO(Data Transfer Object) 역할을 합니다.
엔티티(DB 모델)를 직접 노출하지 않고 필요한 필드만 선택해서 반환하는 계층 분리 패턴입니다."

**우리 코드**: `backend/app/models/` 전체

---

## 6. 의존성 주입 (Dependency Injection)

**개념**: 함수가 필요한 것을 직접 만들지 않고, 외부에서 주입받는 패턴

```python
# "이 엔드포인트를 쓰려면 로그인이 필요하다"를 한 줄로 선언
@router.get("/me")
def get_my_profile(payload: dict = Depends(get_current_user)):
    # payload는 FastAPI가 자동으로 JWT 검증 후 주입해줌
    return user_service.get_profile(payload["sub"])
```

**왜 좋은가?**
- 인증 로직을 모든 엔드포인트에 복붙하지 않아도 됨
- 테스트 시 가짜 payload로 교체(Mock) 가능

**면접 포인트**: "Spring의 `@Autowired`, `@Service` 와 같은 개념입니다."

**우리 코드**: `backend/app/core/security.py` → `Depends(get_current_user)`

---

## 7. RLS (Row Level Security)

**개념**: DB 테이블 행(Row) 단위로 접근을 제어하는 PostgreSQL 기능

```sql
-- "채팅방은 참여자(buyer, seller)만 볼 수 있다"
CREATE POLICY "채팅방 조회" ON chat_rooms
    FOR SELECT USING (auth.uid() IN (buyer_id, seller_id));
```

**왜 필요한가?**
- 백엔드 코드 버그로 잘못된 데이터 노출되어도, DB 단에서 한 번 더 막음
- 클라이언트(supabase-js)가 DB에 직접 접근할 때 보안 보장

**우리 구조**: 백엔드는 service_role(RLS 우회) 사용 → 애플리케이션 레벨에서 권한 검사
클라이언트 직접 접근은 RLS로 방어

**우리 코드**: `001_initial_schema.sql` 하단 RLS 정책 섹션

---

## 8. 에스크로 (Escrow) — 가상 결제 흐름

**실제 에스크로란?** 구매자가 돈을 중간자(에스크로)에게 맡기고,
거래 완료 확인 후 판매자에게 지급하는 안전 결제 방식

**우리 구현 (상태 머신)**:
```
구매 요청
    ↓
pending (구매자가 포인트 차감, 에스크로에 보관)
    ↓
escrowed (판매자가 발송 확인)
    ↓
completed → 판매자 포인트 지급
    ↓ (또는)
cancelled → 구매자 포인트 환불
```

**면접 포인트**: "상태 머신(State Machine) 패턴으로 구현했습니다.
유효하지 않은 상태 전이(completed → pending 등)를 코드로 막습니다."

**우리 코드**: `virtual_transactions` 테이블, Phase 5에서 구현

---

## 9. WebSocket — 실시간 채팅

**HTTP vs WebSocket**:

| | HTTP | WebSocket |
|-|------|-----------|
| 연결 | 요청마다 새로 연결 | 한 번 연결 후 유지 |
| 방향 | 클라이언트 → 서버만 | 양방향 (서버도 먼저 보낼 수 있음) |
| 용도 | 일반 API | 채팅, 실시간 알림 |

**우리 구현**:
```python
# 서버가 메시지를 받으면 같은 방의 모든 연결에 브로드캐스트
manager.broadcast(room_id, {"type": "message", "content": "안녕하세요"})
```

**읽음 처리(Ack)**: 메시지 수신 시 `is_read=true` 업데이트 → 읽음 표시

**우리 코드**: `backend/app/websocket/manager.py`, Phase 4에서 완성

---

## 10. CORS (Cross-Origin Resource Sharing)

**문제 상황**: 브라우저는 보안상 다른 출처(도메인)의 API 호출을 기본 차단

```
프론트엔드: http://localhost:3000
백엔드API:  http://localhost:8000  ← 다른 포트 = 다른 출처 → 브라우저가 차단!
```

**해결**: 서버가 "이 출처는 허용한다"고 응답 헤더에 명시

```python
# main.py
app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # 허용할 출처
    allow_credentials=True,
)
```

**면접 포인트**: "CORS는 서버 문제가 아니라 **브라우저의 보안 정책**입니다.
Postman으로는 제한 없이 호출되는 이유가 여기 있습니다."

**우리 코드**: `backend/app/main.py`

---

## 11. DB 인덱스 (Index)

**비유**: 두꺼운 책의 목차(색인). 목차 없으면 전체를 읽어야 함.

```sql
-- 없으면: products 테이블 전체 스캔 → 느림
-- 있으면: 인덱스 트리 탐색 → 빠름
CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_products_location ON products USING GIST(location);  -- 공간 인덱스
```

**언제 필요한가?**: WHERE, JOIN, ORDER BY에 자주 쓰이는 컬럼

**단점**: 쓰기(INSERT/UPDATE) 시 인덱스도 갱신 → 쓰기가 약간 느려짐

---

## 12. DB 트리거 (Trigger)

**개념**: 특정 이벤트(INSERT/UPDATE/DELETE) 발생 시 자동 실행되는 함수

**우리 사용 예**:
```sql
-- 신규 가입 시 profiles + virtual_wallets 자동 생성
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- updated_at 자동 갱신
CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

**면접 포인트**: "애플리케이션 코드에서 매번 처리하면 누락 위험이 있습니다.
DB 트리거로 보장하면 어떤 경로로 데이터가 변경되어도 일관성이 유지됩니다."

---

## 13. N+1 문제

**상황**: 상품 목록 20개를 가져올 때 각 상품의 이미지를 따로 조회하면
→ 1(목록) + 20(이미지) = 21번 쿼리 실행

**해결**: JOIN으로 한 번에 가져오기

```python
# 나쁜 예 (N+1)
products = get_all_products()
for p in products:
    p.images = get_images(p.id)  # 상품마다 쿼리 1번씩

# 좋은 예 (JOIN)
products = supabase.table("products").select("*, product_images(*)").execute()
```

**우리 코드**: product_service.py에서 `select("*, product_images(*), profiles(*)")` 사용

---

## 14. 계층 아키텍처 (Layered Architecture)

```
요청 → Controller(Router) → Service → Repository(Supabase) → DB
```

| 계층 | 역할 | 우리 코드 |
|------|------|-----------|
| Router (Controller) | HTTP 요청/응답, 인증 확인 | `api/v1/*.py` |
| Service | 비즈니스 로직, 권한 검사 | `services/*.py` |
| DB 접근 | 실제 쿼리 실행 | `supabase_admin.table(...)` |

**왜 분리하는가?**
- 테스트할 때 Service만 독립적으로 테스트 가능
- DB를 바꿔도 Service 코드는 수정 불필요

---

## 15. 어드민 페이지 설계 (RBAC)

**RBAC (Role-Based Access Control)**: 역할 기반 접근 제어

```python
# profiles.role = 'admin' 인 사용자만 접근 가능
@router.get("/admin/dashboard")
def dashboard(payload: dict = Depends(require_admin)):
    ...
```

**어드민 페이지 차별화 포인트**:
- 일반 사용자 웹과 **완전히 분리된 Next.js 프로젝트**
- 통계 시각화 (일별 거래량, 신규 가입자, 신고 처리율)
- 신고된 게시물 원클릭 차단

---

## 17. WebSocket 연결 관리 — ConnectionManager 패턴

**핵심 개념**: 서버 메모리에 `room_id → [WebSocket, ...]` 딕셔너리를 유지한다.

```python
class ConnectionManager:
    def __init__(self):
        self.active: dict[str, list[WebSocket]] = {}

    async def connect(self, room_id, ws):
        await ws.accept()
        self.active.setdefault(room_id, []).append(ws)

    async def broadcast(self, room_id, message):
        for ws in self.active.get(room_id, []):
            await ws.send_json(message)
```

**주의점**: 서버가 재시작되면 연결이 모두 끊긴다. 그래서 메시지는 **Supabase DB에 영속 저장**하고, 클라이언트는 재연결 시 REST API로 이전 메시지를 다시 불러온다.

**면접 포인트**: "수평 확장(서버 여러 대)을 하려면 Redis Pub/Sub 같은 중앙 브로커가 필요합니다. 현재는 단일 서버 구조라 인메모리로 충분합니다."

---

## 18. 에스크로(Escrow) 상태 머신

**에스크로란?**: 구매자와 판매자 사이에 제3자(서비스)가 돈을 잠시 보관하는 방식. 거래가 완료돼야 판매자에게 돈이 간다.

```
구매자 잔액 차감 → [escrowed] → 판매자 확정 → [completed] → 판매자 잔액 증가
                              → 취소 요청   → [cancelled] → 구매자 환불
```

**우리 코드 어디?**: `transaction_service.py`의 `purchase()` → `confirm_transaction()` / `cancel_transaction()`

**왜 에스크로가 필요한가?**
- 판매자가 돈만 받고 물건을 안 주는 사기 방지
- 구매자가 물건을 받았다고 확정해야 최종 정산

**면접 포인트**: "상태 머신(State Machine)으로 설계하면 불가능한 상태 전이를 코드 레벨에서 막을 수 있습니다. escrowed 상태가 아니면 confirm/cancel을 호출해도 400 에러를 반환합니다."

---

## 19. Next.js App Router — Server vs Client 컴포넌트

| | Server Component | Client Component |
|---|---|---|
| 선언 | 기본값 | 파일 상단 `"use client"` |
| 실행 위치 | 서버에서만 | 브라우저에서 |
| useState/useEffect | ❌ 사용 불가 | ✅ 사용 가능 |
| 직접 DB 접근 | ✅ 가능 | ❌ 불가 |
| SEO | ✅ 유리 | 제한적 |

**우리 코드**: 홈 목록(위치/검색 상태 관리) → `"use client"`, 상품 상세 → `"use client"` (찜 토글 등 인터랙션 필요)

**면접 포인트**: "인터랙션이 없는 정적 콘텐츠는 Server Component로 두면 번들 크기가 줄고 초기 로딩이 빠릅니다."

---

## 20. Zustand — 전역 상태 관리

**왜 Redux 대신 Zustand?**: Redux는 보일러플레이트(action/reducer/store 분리)가 많습니다. Zustand는 30줄로 같은 기능을 구현합니다.

```typescript
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  clear: () => set({ session: null, user: null }),
}));
```

**우리 코드 어디?**: `web/src/store/auth.ts` — Supabase 세션을 전역으로 관리, 어떤 컴포넌트에서든 `useAuthStore()`로 접근

---

## 16. 면접 예상 질문 & 답변

**Q. JWT 토큰이 탈취되면 어떻게 막나요?**
A. "Access Token 유효기간을 짧게(1시간) 설정하고, Refresh Token은 HTTP-Only 쿠키로 저장해 JS 접근을 차단합니다. 추가로 Refresh Token Rotation 전략으로 사용된 리프레시 토큰은 즉시 무효화합니다."

**Q. 왜 ORM 대신 Supabase 클라이언트를 직접 쓰나요?**
A. "PostGIS의 공간 쿼리(ST_DWithin)와 Supabase RLS를 활용하기 위해 SQL 직접 제어가 필요했습니다. ORM으로 추상화하면 이런 DB 특화 기능을 쓰기 어렵고, 생성되는 쿼리를 파악하기 어려운 단점이 있습니다."

**Q. 실시간 채팅을 WebSocket으로 구현한 이유는요?**
A. "HTTP 폴링 방식은 클라이언트가 주기적으로 요청해야 해서 불필요한 트래픽이 발생합니다. WebSocket은 한 번 연결 후 서버가 능동적으로 메시지를 푸시할 수 있어 채팅에 적합합니다. Supabase Realtime을 쓸 수도 있었지만, FastAPI WebSocket으로 직접 메시지 브로커를 구현해서 읽음 처리(Ack)와 연결 관리 로직을 명확히 제어했습니다."

**Q. 위치 기반 검색 성능은 어떻게 보장하나요?**
A. "PostGIS의 GIST 공간 인덱스를 사용합니다. GIST는 R-Tree 구조로 공간 데이터를 계층적으로 분할해 전체 스캔 없이 O(log n)으로 반경 내 데이터를 조회합니다."

---

## 21. 배포 파이프라인 — Render + Vercel

**우리 구성**:

| 서비스 | 플랫폼 | 트리거 |
|--------|--------|--------|
| FastAPI 백엔드 | Render | GitHub main 브랜치 push → 자동 배포 |
| Next.js 사용자 웹 | Vercel | GitHub main 브랜치 push → 자동 배포 |
| Next.js 어드민 | Vercel | GitHub main 브랜치 push → 자동 배포 |

**Render 특징**:
- Python/FastAPI 서버 호스팅에 적합
- 무료 플랜은 15분 비활성 시 슬립 → 첫 요청 응답이 느릴 수 있음
- GitHub push가 감지되면 자동으로 새 Docker 컨테이너 빌드

**Vercel 특징**:
- Next.js 공식 호스팅사 (Vercel이 Next.js를 만든 회사)
- 한 GitHub 저장소에서 `web/`, `admin/` 두 프로젝트를 **Root Directory** 설정으로 분리 배포 가능
- 환경변수(NEXT_PUBLIC_*)는 **빌드 시점에 번들에 삽입**됨 (아래 항목 참조)

**면접 포인트**: "코드 push 한 번으로 백엔드·프론트·어드민이 모두 자동으로 배포되는 CI/CD 파이프라인을 구성했습니다."

---

## 22. NEXT_PUBLIC_* 환경변수 — 빌드 타임 vs 런타임

**핵심 차이**:

| | 서버 환경변수 | NEXT_PUBLIC_* |
|---|---|---|
| 노출 | 서버에서만 | 브라우저(클라이언트)에도 노출 |
| 적용 시점 | 런타임 (서버 시작 시) | **빌드 타임 (번들 생성 시)** |
| 변경 후 반영 | 서버 재시작 | **전체 재빌드 필요** |

**실제 발생한 문제**:
```
NEXT_PUBLIC_API_URL 을 Vercel에서 변경했는데도 배포 후 여전히 이전 URL로 요청이 감.
```

**원인**: Vercel이 환경변수를 변경해도 이전 빌드 캐시로 배포하면 변경 전 값이 번들에 이미 박혀있음.

**해결**: Vercel → 해당 배포 → **"Redeploy"** 클릭 시 **"Clear build cache"** 옵션 체크 후 재배포.

**확인법**:
```bash
# 실제 번들에 어떤 URL이 박혔는지 curl로 확인
curl https://thingmarket-web.vercel.app/_next/static/chunks/main.js | grep "onrender.com"
```

**면접 포인트**: "환경변수가 클라이언트 번들에 빌드 타임에 삽입된다는 것을 이해해야 배포 후 변경사항이 반영 안 될 때 원인을 찾을 수 있습니다."

**우리 코드**: `web/src/lib/api.ts`
```typescript
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
```

---

## 23. FastAPI multipart/form-data — Form vs Query 파라미터

**문제 상황**: 상품 등록 API에서 이미지(File)와 텍스트 필드를 함께 보낼 때 발생한 422 오류

**원인**:
```python
# 잘못된 코드 — FastAPI가 title을 쿼리 파라미터로 인식
@router.post("")
def create_product(
    title: str,               # ← Form이라고 명시 안 함
    images: list[UploadFile] = File(default=[]),
):
    ...
```

FastAPI 규칙: **`File()`이 하나라도 있으면 요청은 multipart/form-data로 처리됨**. 이 때 다른 필드에 `= Form(...)`을 명시하지 않으면 쿼리 파라미터로 해석해서 422 반환.

**수정된 코드**:
```python
from fastapi import Form, File, UploadFile

@router.post("")
def create_product(
    title: str = Form(...),           # ← Form 명시 필수
    price: int = Form(...),
    is_negotiable: bool = Form(True),
    description: Optional[str] = Form(None),
    images: list[UploadFile] = File(default=[]),
    payload: dict = Depends(get_current_user),
):
```

**면접 포인트**: "multipart/form-data는 파일과 텍스트 데이터를 함께 전송하는 인코딩 방식입니다. JSON body와 달리 각 필드를 명시적으로 Form 필드로 선언해야 합니다."

**우리 코드**: `backend/app/api/v1/products.py`

---

## 24. FastAPI 미들웨어 스택과 CORS 500 문제

**미들웨어 실행 순서** (바깥 → 안쪽):

```
ServerErrorMiddleware
    → CORSMiddleware
        → ExceptionMiddleware
            → Router (실제 엔드포인트)
```

**500 에러에서 CORS 헤더가 사라지는 이유**:

라우터에서 처리되지 않은 예외(unhandled exception)가 발생하면:

1. 예외가 ExceptionMiddleware까지 올라옴 → 처리 못하고 위로 전달
2. CORSMiddleware까지 올라옴 → 예외를 잡지 않고 위로 전달
3. ServerErrorMiddleware가 최종적으로 잡아서 500 응답 생성
4. 이 500 응답은 **CORSMiddleware를 거치지 않고** 바로 클라이언트로 전송
5. 결과: CORS 헤더 없는 500 → 브라우저가 `No 'Access-Control-Allow-Origin'` 에러 표시

**반면 HTTPException은 CORS 헤더가 붙는 이유**:

`raise HTTPException(status_code=500, ...)` → ExceptionMiddleware가 JSON 응답으로 변환 → CORSMiddleware가 CORS 헤더 추가 → 정상 전달

**해결책 1 — 서비스에서 예외를 HTTPException으로 변환** (근본 해결):
```python
# product_service.py
try:
    result = supabase_admin.table("products").insert(data).execute()
except Exception as exc:
    raise HTTPException(status_code=500, detail=f"상품 DB 저장 실패: {exc}")
```

**해결책 2 — 예외 캐처 미들웨어를 CORS 안쪽에 배치** (안전망):
```python
# main.py — 선언 순서가 중요!
@app.middleware("http")          # ← 먼저 선언 → CORSMiddleware 안쪽에 위치
async def catch_unhandled_exceptions(request, call_next):
    try:
        return await call_next(request)
    except Exception as exc:
        return JSONResponse(status_code=500, content={"detail": str(exc)})

app.add_middleware(CORSMiddleware, ...)  # ← 나중에 선언 → 바깥쪽에 위치
```

**미들웨어 순서 결정 원리**:
- `app.add_middleware(M)` 호출 시 → 내부 리스트 앞에 삽입(`insert(0, ...)`)
- 빌드 시 역순으로 감싸므로 **나중에 추가된 것이 바깥**에 위치
- 따라서 예외 캐처를 CORSMiddleware보다 먼저 선언하면 CORSMiddleware가 더 바깥에 → 예외 캐처의 응답도 CORS 헤더가 붙음

**면접 포인트**: "CORS 오류는 항상 서버 응답의 문제입니다. 서버가 500을 내도 CORS 헤더가 있어야 브라우저가 오류 내용을 읽을 수 있습니다. 미들웨어 실행 순서를 이해해야 이 문제를 해결할 수 있습니다."

**우리 코드**: `backend/app/main.py`, `backend/app/services/product_service.py`

---

## 25. 배포 환경 트러블슈팅 체크리스트

실제 배포하면서 마주친 문제들과 진단 방법:

| 증상 | 원인 | 해결 |
|------|------|------|
| `GET /products 404` | API URL에 `/api/v1` 접미사 누락 | Vercel 환경변수에 전체 경로 포함 |
| `POST /products 422` | multipart form에서 `Form(...)` 미선언 | 모든 비파일 파라미터에 `= Form(...)` 추가 |
| `POST /products 500` + CORS 헤더 없음 | supabase 예외가 unhandled → CORSMiddleware 우회 | 서비스 레이어 try-except + HTTPException 변환 |
| 환경변수 변경 후에도 구 URL로 요청 | Next.js 빌드 캐시에 구 값 박혀있음 | "Clear build cache" 후 재배포 |
| Render 첫 요청 30초 지연 | 무료 플랜 슬립 상태에서 콜드 스타트 | 무료 플랜 한계, 유료로 전환 or 핑 유지 서비스 |

**진단 도구**:
```bash
# 번들에 어떤 API URL이 박혔는지 확인
curl https://thingmarket-web.vercel.app/_next/static/chunks/*.js | grep "onrender.com"

# 백엔드 CORS 설정 확인 (OPTIONS preflight)
curl -X OPTIONS https://thingmarket-backend.onrender.com/api/v1/products \
  -H "Origin: https://thingmarket-web.vercel.app" -v

# 백엔드 헬스체크
curl https://thingmarket-backend.onrender.com/
```
