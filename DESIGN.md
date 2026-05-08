# 띵마켓 (ThingMarket) — Design System

> **분석 출처**: getdesign.md Fintech & Crypto 카테고리
>
> **채택 레퍼런스**: Binance (골드 팔레트 + 다크 캔버스) × Mastercard (따뜻한 크림 라이트모드)
>
> **목표**: 당근마켓 수준의 세련된 UX + 금 거래의 프리미엄·신뢰감 + 이커머스의 명확한 CTA

---

## 1. 디자인 방향 결정 근거

| 요구사항 | 선택한 레퍼런스 | 이유 |
|----------|----------------|------|
| 금 거래 → 프리미엄·신뢰 색감 | **Binance Yellow** `#D4A017` | 크립토/금 공통 골드 계열, 낮은 채도로 저속함 제거 |
| 라이트모드 배경 → 따뜻한 고급감 | **Mastercard Cream** `#FAF7F0` | 차가운 흰색 대신 따뜻한 아이보리, 프리미엄 페이퍼 느낌 |
| 다크모드 배경 → 신뢰·깊이 | **Binance Canvas** `#0B0E11` | 금융 플랫폼 특유의 딥 네이비-블랙, 골드와 최고 대비 |
| 타이포 → 절제된 세련됨 | **Stripe weight-300 원칙** | 두꺼운 폰트 지양, 여백으로 고급감 표현 |
| 이커머스 신뢰도 | 명확한 Status 배지, 프리미엄 카드 radius | Coinbase의 institutional feel 차용 |

### 기존 오렌지 → 골드 전환 이유
- 오렌지(`#f97316`)는 당근마켓·패스트푸드 연상 → **충동구매 플랫폼** 이미지
- 금 거래 플랫폼은 **신중한 거래·고액 자산** → 골드(`#C9920C`)로 신뢰·프리미엄 전달
- 다크모드에서 골드(`#D4A017`)는 배경 대비 4.5:1 이상 → 접근성 충족

---

## 2. Color Palette

### Light Mode
| 토큰 | 값 | 용도 |
|------|-----|------|
| `--bg-page` | `#FAF7F0` | 전체 배경 (따뜻한 크림) |
| `--bg-card` | `#FFFFFF` | 카드·헤더 배경 |
| `--bg-input` | `#FFFFFF` | 입력 필드 배경 |
| `--bd-input` | `#E8DDD0` | 테두리 (따뜻한 베이지) |
| `--tx-primary` | `#1A1208` | 본문 텍스트 (따뜻한 블랙) |
| `--tx-secondary` | `#6B5F4A` | 보조 텍스트 |
| `--accent` | `#C9920C` | 주요 버튼·링크·강조 (프리미엄 골드) |
| `--accent-hover` | `#A87B0A` | hover 상태 |
| `--accent-fg` | `#FFFFFF` | 골드 버튼 위 텍스트 |
| `--accent-soft` | `#FDF3DB` | 뱃지·태그 배경 |

### Dark Mode
| 토큰 | 값 | 용도 |
|------|-----|------|
| `--bg-page` | `#0B0E11` | Binance Canvas |
| `--bg-card` | `#1E2329` | Binance Card Surface |
| `--bg-input` | `#2B3139` | Binance Elevated |
| `--bd-input` | `#363C47` | 테두리 |
| `--tx-primary` | `#EAECEF` | 본문 |
| `--tx-secondary` | `#848E9C` | 보조 |
| `--accent` | `#D4A017` | 골드 (다크 대비 강화) |
| `--accent-hover` | `#E5B420` | hover |
| `--accent-fg` | `#1A1208` | 골드 버튼 위 텍스트 |
| `--accent-soft` | `#2A2410` | 뱃지 배경 (다크) |

### Semantic Colors
| 용도 | 라이트 | 다크 |
|------|--------|------|
| 판매중 (Success) | `#15803d` | `#22c55e` |
| 예약중 (Warning) | `#C9920C` | `#D4A017` |
| 거래완료 (Muted) | `#6B5F4A` | `#848E9C` |
| 에러 | `#b91c1c` | `#f87171` |

---

## 3. Typography

**Font Stack**: `'Pretendard', 'Apple SD Gothic Neo', -apple-system, BlinkMacSystemFont, sans-serif`

> Pretendard는 한국어 최적화 + 웨이트 300~700 지원. Stripe의 경량 타이포 철학과 일치.

| 토큰 | Size | Weight | 용도 |
|------|------|--------|------|
| `display` | 28px | 700 | 페이지 타이틀 |
| `title-lg` | 20px | 600 | 섹션 제목 |
| `title-md` | 16px | 600 | 카드 제목 |
| `body-md` | 14px | 400 | 본문 |
| `body-sm` | 13px | 400 | 보조 본문 |
| `caption` | 12px | 500 | 라벨·태그 |
| `price` | 18px | 700 | 가격 (모노스페이스) |

---

## 4. Spacing & Radius

### Spacing (8px base)
`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64px`

### Border Radius
| 토큰 | 값 | 용도 |
|------|-----|------|
| `--r-sm` | `8px` | 입력 필드, 소형 버튼 |
| `--r-md` | `12px` | 카드, 드롭다운 |
| `--r-lg` | `16px` | 모달, 바텀시트 |
| `--r-pill` | `9999px` | 필 버튼, 배지 |

---

## 5. 컴포넌트 스펙

### Primary Button
```
background: var(--accent)
color: var(--accent-fg)
padding: 10px 20px
border-radius: var(--r-pill)
font-weight: 600
font-size: 14px
```

### Card
```
background: var(--bg-card)
border: 1px solid var(--bd-input)
border-radius: var(--r-md)
padding: 16px
box-shadow: 0 1px 3px rgba(0,0,0,0.06)
```

### Price Badge (신뢰 요소)
```
font-weight: 700
font-variant-numeric: tabular-nums
color: var(--tx-primary)
```

### Trust Badge ("인증 판매자", "안전거래")
```
background: var(--accent-soft)
color: var(--accent)
border-radius: var(--r-pill)
padding: 2px 8px
font-size: 12px
font-weight: 500
```

---

## 6. 신뢰도 UI 요소 (이커머스 관점)

금 거래 플랫폼의 신뢰도는 색상만큼 **정보 구조**에서도 나옵니다:

1. **매너온도 배지** → 판매자 신뢰 점수 시각화
2. **거래 상태 칩** (판매중 / 예약중 / 거래완료) → 명확한 상태
3. **에스크로 결제 표시** → "가상 안전결제" 뱃지
4. **위치 기반 표시** → 실제 근거리 거래 강조
5. **이미지 슬라이더 + 도트 인디케이터** → 상품 신뢰도

---

## 7. 배포 vs PDF — 채용 담당자용 설계

### ✅ 결론: **배포** 압도적 우위

| 기준 | 배포 | PDF |
|------|------|-----|
| 인터랙션 | ✅ 실제 동작 확인 | ❌ 스크린샷만 |
| 기술 증명 | ✅ 라이브 서버, DB, WebSocket | ❌ 코드만 |
| 차별화 | ✅ URL 하나로 즉시 전달 | ⚠️ 파일 열기 귀찮음 |
| 유지보수 | ⚠️ 서버 유지 필요 | ✅ 파일만 있으면 됨 |

### 추천 배포 스택 (무료)

```
웹 (Next.js)    → Vercel          무료, GitHub 연동 자동 배포
어드민 (Next.js) → Vercel          별도 프로젝트로 배포
백엔드 (FastAPI) → Render.com      무료 tier (750h/월), 슬립 후 콜드스타트
DB/Auth         → Supabase         이미 클라우드 ✅
```

### 배포 순서
1. `web/` → Vercel에 import → 환경변수 설정
2. `admin/` → Vercel에 import (별도 서브도메인)
3. `backend/` → Render에 배포 (`uvicorn app.main:app --host 0.0.0.0 --port $PORT`)
4. Render URL을 `web/.env.production`의 `NEXT_PUBLIC_API_URL`에 반영

### PDF가 필요한 경우
- 이력서에 QR코드로 배포 URL을 담아 제공
- PDF 자체보다 **GitHub 링크 + 라이브 URL** 조합이 가장 강력

---

*이 파일은 test 브랜치의 디자인 리뉴얼 방향을 기술합니다.*
*main 브랜치 병합 전 검토 후 반영.*
