# ThingMarket (띵마켓) — Claude 프로젝트 컨텍스트

이 파일은 Claude Code가 자동으로 읽는 프로젝트 컨텍스트입니다.
`git clone` 후에도 이 파일을 통해 작업이 그대로 이어집니다.
변경사항·결정사항이 생기면 즉시 이 파일을 갱신합니다.

---

## 0. AI 행동 원칙 (모든 작업에 적용)

> 이 섹션은 불필요한 실수를 줄이기 위한 작업 가이드라인입니다.
> 빠른 작업보다 **정확성과 신중함**을 우선합니다.

### 0-1. 코딩 전 생각하기
- 가정은 명시적으로 밝힌다. 불확실하면 먼저 질문한다.
- 해석이 여러 가지면 조용히 선택하지 않고 제시한다.
- 더 단순한 방법이 있으면 말한다. 필요하면 반론한다.
- 뭔가 불명확하면 멈춰서 이름을 짚고 질문한다.

### 0-2. 단순함 우선
- 요청한 것만 구현한다. 추측성 기능 추가 금지.
- 단일 용도 코드에 추상화 금지.
- "유연성"·"확장성"은 요청이 있을 때만.
- 불가능한 시나리오에 대한 오류 처리 금지.
- 200줄로 짤 수 있는 걸 50줄로 짤 수 있다면 다시 쓴다.
- **체크**: "시니어 개발자가 이걸 보고 과하다고 할까?" → Yes면 단순화.

### 0-3. 외과적 수정
- 요청한 부분만 수정한다. 인접 코드·주석·포매팅 "개선" 금지.
- 기존 스타일이 마음에 안 들어도 맞춘다.
- 내 수정으로 생긴 사용하지 않는 코드(import 등)는 제거한다.
- 기존 데드코드는 언급만 하고 삭제하지 않는다.
- **테스트**: 변경된 모든 줄이 사용자 요청으로 직접 추적 가능해야 한다.

### 0-4. 목표 기반 실행
다단계 작업은 계획을 먼저 제시하고 각 단계마다 검증 기준을 명시한다.

```
1. [단계] → 검증: [확인 방법]
2. [단계] → 검증: [확인 방법]
3. [단계] → 검증: [확인 방법]
```

- 성공 기준이 불명확하면 구현 전에 확인한다.
- "작동하게 만들기" 같은 약한 기준은 지속적인 재확인이 필요하다.

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 서비스명 | **ThingMarket (띵마켓)** |
| 목적 | 위치 기반 동네 중고거래 플랫폼 (포트폴리오) |
| 모델 | 당근마켓 유사 서비스 |
| 대상 플랫폼 | 사용자 웹(Next.js) + 사용자 앱(React Native) + 어드민 웹(Next.js) |

---

## 2. 기술 스택

| 영역 | 선택 | 이유 |
|------|------|------|
| 백엔드 | FastAPI (Python) | 비동기 지원, 자동 Swagger 문서화 |
| DB / Auth / Storage | Supabase (PostgreSQL + PostGIS) | Auth·Storage 통합, Realtime 지원 |
| 사용자 웹 | Next.js (App Router) | SSR, SEO, Vercel 배포 용이 |
| 어드민 웹 | Next.js (App Router, 별도 프로젝트) | 역할 분리 |
| 모바일 앱 | React Native (Expo) | 웹 로직 재사용 가능 |
| 위치 기반 쿼리 | PostGIS (`ST_DWithin`) | 반경 내 상품 필터링 |
| 실시간 채팅 | FastAPI WebSocket + Supabase DB | 면접 어필용 직접 구현 |
| 가상 결제 | Mock Escrow (포인트) | PG 불필요, 에스크로 로직 시연 |
| 인증 | Supabase Auth (카카오·구글·이메일) | 소셜 로그인 통합 |

---

## 3. 페르소나 & 역할

| 페르소나 | 플랫폼 | 주요 기능 |
|----------|--------|-----------|
| 구매자 | 웹 + 앱 | 상품 탐색·검색, 채팅, 가상결제 |
| 판매자 | 웹 + 앱 | 상품 등록·관리, 거래 상태 변경 |
| 관리자 | 어드민 웹 | 사용자·상품·신고 관리, 통계 |

---

## 4. DB 스키마 (Supabase PostgreSQL + PostGIS)

### 핵심 테이블

```sql
-- 사용자 프로필 (auth.users 확장)
profiles: id, nickname, avatar_url, bio, manner_temp(36.5),
          location(GEOGRAPHY Point), location_name, search_radius(1|3|5),
          role('user'|'admin'), is_banned, created_at

-- 카테고리
categories: id, name, icon, parent_id(self-ref)

-- 상품 게시글
products: id, seller_id→profiles, title, description, price, category_id,
          status('selling'|'reserved'|'sold'),
          location(GEOGRAPHY Point), location_name,
          view_count, like_count, is_negotiable, created_at, updated_at

-- 상품 이미지
product_images: id, product_id→products, image_url, display_order

-- 관심상품
likes: id, user_id→profiles, product_id→products, created_at

-- 채팅방
chat_rooms: id, product_id→products, buyer_id→profiles, seller_id→profiles,
            last_message, last_message_at, buyer_unread, seller_unread

-- 채팅 메시지
chat_messages: id, room_id→chat_rooms, sender_id→profiles,
               content, message_type('text'|'image'|'system'),
               is_read(false), created_at

-- 거래 후기
reviews: id, product_id, reviewer_id→profiles, reviewee_id→profiles,
         rating(1~5), content, created_at

-- 신고
reports: id, reporter_id→profiles, target_type('product'|'user'|'chat'),
         target_id, reason,
         status('pending'|'reviewed'|'resolved'|'dismissed'),
         admin_note, created_at

-- 가상 지갑
virtual_wallets: id, user_id UNIQUE→profiles, balance(0)

-- 가상 거래 (에스크로)
virtual_transactions: id, product_id→products, buyer_id, seller_id, amount,
                      status('pending'|'escrowed'|'completed'|'cancelled'|'refunded'),
                      created_at, updated_at

-- 알림
notifications: id, user_id→profiles,
               type('chat'|'like'|'review'|'transaction'|'system'),
               title, body, is_read(false), data JSONB, created_at
```

---

## 5. API 엔드포인트 (FastAPI `/api/v1`)

| 그룹 | 주요 엔드포인트 |
|------|----------------|
| `/auth` | register, login, social/{provider}, logout, refresh |
| `/users` | me (GET/PATCH), me/location, /{id}, /{id}/products, /{id}/reviews |
| `/products` | 목록(위치필터), 등록, 검색, 상세, 수정, 삭제, 상태변경, 좋아요 |
| `/chats` | 목록, 생성, 상세, 읽음처리, **WS `/ws/{room_id}`** |
| `/wallet` | 잔액조회, 충전(Mock) |
| `/transactions` | 구매요청, 거래확정, 거래취소 |
| `/reports` | 신고접수 |
| `/admin` | 대시보드통계, 사용자관리, 상품관리, 신고처리 |

---

## 6. 디렉토리 구조

```
thingmarket/
├── backend/                    # FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   └── security.py
│   │   ├── api/v1/
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── products.py
│   │   │   ├── chats.py
│   │   │   ├── transactions.py
│   │   │   ├── reports.py
│   │   │   └── admin.py
│   │   ├── models/
│   │   ├── services/
│   │   └── websocket/
│   ├── requirements.txt
│   └── .env.example
├── web/                        # Next.js 사용자 웹
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (main)/
│   │   │   ├── page.tsx
│   │   │   ├── products/
│   │   │   ├── chat/
│   │   │   ├── likes/
│   │   │   └── profile/
│   │   └── layout.tsx
│   └── ...
├── admin/                      # Next.js 어드민 (별도)
│   ├── app/
│   │   ├── dashboard/
│   │   ├── users/
│   │   ├── products/
│   │   └── reports/
│   └── ...
├── mobile/                     # React Native Expo (Phase 4)
├── claude.md                   ← 이 파일
└── trouble_shooting.md
```

---

## 7. 개발 로드맵

| Phase | 내용 | 상태 |
|-------|------|------|
| **Phase 1** | Supabase 설정 + DB 마이그레이션 + FastAPI 기반 + 인증 API | ✅ 완료 |
| **Phase 2** | 상품 CRUD + 위치 기반 필터링 API + Storage 버킷 | ✅ 완료 |
| **Phase 3** | Next.js 웹 — 인증 + 홈 + 상품 상세/등록 + 프로필 + 찜목록 | ✅ 완료 |
| **Phase 4** | WebSocket 채팅 (FastAPI + Next.js 채팅 UI) | ✅ 완료 |
| **Phase 5** | 가상결제·에스크로 (wallet 충전 + 에스크로 상태머신) | ✅ 완료 |
| **Phase 6** | 어드민 대시보드 (Next.js 별도 — 통계/사용자/신고 관리) | ✅ 완료 |
| **Phase 7** | React Native 모바일 앱 | ✅ 완료 |

---

## 8. 진행 로그

| 날짜 | 내용 |
|------|------|
| 2026-05-06 | 프로젝트 기획 확정 (서비스명: ThingMarket 띵마켓) |
| 2026-05-06 | 아키텍처 설계 완료 — DB 스키마·API 엔드포인트·디렉토리 구조 승인 |
| 2026-05-06 | Phase 1 완료 — backend/ 골격, SQL 마이그레이션, 인증·유저 API 구현 |
| 2026-05-07 | Phase 2 완료 — 002_product_functions.sql 실행, product-images Storage 버킷 생성, 상품 API 전체 |
| 2026-05-07 | Phase 3 완료 — Next.js web/ 프로젝트: 로그인·회원가입·소셜콜백·홈·상품상세·상품등록·프로필·찜목록 |
| 2026-05-07 | Phase 4 완료 — FastAPI WebSocket 채팅 (ConnectionManager + chat_service), Next.js 채팅 목록·채팅방 UI |
| 2026-05-07 | Phase 5 완료 — 가상 지갑 충전(Mock), 에스크로 상태머신(escrowed→completed/cancelled) |
| 2026-05-07 | Phase 6 완료 — admin/ Next.js 별도 프로젝트: 대시보드 통계, 사용자 정지관리, 신고 처리 |
| 2026-05-07 | Phase 7 완료 — React Native Expo 모바일 앱: 인증(로그인/회원가입), 홈(위치기반), 상품상세/등록, 채팅목록/채팅방, 관심목록, 프로필 |

---

## 9. 언어 규칙

- **UI/UX 텍스트, 페이지 내용, 에러 메시지**: 모두 **한국어**
- **응답·문서·주석**: 모두 **한국어**
- **코드 식별자** (변수명·함수명·클래스명): 영어 (관례 유지)

---

## 10. 면접 어필 포인트

- PostGIS `ST_DWithin`으로 위치 기반 쿼리 직접 구현
- FastAPI WebSocket으로 채팅 메시지 브로커 + 읽음 처리(Ack) 구현
- 에스크로 상태 머신 (pending → escrowed → completed/cancelled/refunded)
- 어드민 전용 Next.js — 역할 기반 접근 제어(RBAC), 통계 시각화
- Supabase RLS(Row Level Security)로 데이터 접근 제어
- React Native Expo — expo-router 파일 기반 라우팅, expo-location GPS, expo-image-picker, AsyncStorage 세션 유지

---

## 11. 프리뷰 서버 실행 방법

| 서비스 | 실행 명령 | URL |
|--------|-----------|-----|
| Backend (FastAPI) | `cd backend && .venv\Scripts\uvicorn app.main:app --reload --port 8000` | http://localhost:8000/docs |
| Web (Next.js) | `cd web && npm run dev` | http://localhost:3000 |
| Admin (Next.js) | `cd admin && npm run dev -- --port 3001` | http://localhost:3001 |
| Mobile (Expo) | `cd mobile && npx expo start --web` | http://localhost:8081 |
