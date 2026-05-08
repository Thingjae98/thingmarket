# ThingMarket (띵마켓) — 트러블슈팅 이력

이 파일은 개발 중 발생한 문제와 해결 과정을 기록합니다.
같은 문제를 두 번 겪지 않기 위한 생존 문서입니다.

---

## 기록 양식

```
### [ISSUE-번호] 제목
- **날짜**: YYYY-MM-DD
- **Phase**: Phase N
- **증상**: 무슨 일이 일어났는가
- **원인**: 왜 일어났는가
- **해결**: 어떻게 고쳤는가
- **교훈**: 다음에 어떻게 피할 것인가
```

---

## 이슈 목록

### [ISSUE-001] supabase-py 2.9.1이 새 키 형식 거부
- **날짜**: 2026-05-06
- **Phase**: Phase 1
- **증상**: `SupabaseException: Invalid API key` — 서버 기동 즉시 충돌
- **원인**: Supabase가 키 형식을 `eyJ...(JWT)` → `sb_publishable_*` / `sb_secret_*` 로 전환했는데, supabase-py 2.9.1은 JWT 형식만 검증 통과시킴
- **해결**: `supabase-py` 2.29.0으로 업그레이드 (`pip install "supabase>=2.15"`)
- **교훈**: 새 Supabase 프로젝트 생성 시 supabase-py 최신 버전 확인 필수

### [ISSUE-002] Supabase 신규 프로젝트의 JWT 서명 알고리즘이 HS256 → ECC P-256으로 변경
- **날짜**: 2026-05-06
- **Phase**: Phase 1
- **증상**: `security.py`가 `SUPABASE_JWT_SECRET`(HS256)으로 토큰 검증 시도 → 신규 토큰 검증 실패 예정
- **원인**: Supabase가 JWT 서명 키를 Legacy HS256 Shared Secret에서 ECC P-256(ES256)으로 전환
- **해결**: `SUPABASE_JWT_SECRET` 제거, JWKS 엔드포인트(`/auth/v1/.well-known/jwks.json`) 기반 검증으로 변경. kid 매칭 후 ES256/RS256/HS256 자동 선택
- **교훈**: 신규 Supabase 프로젝트는 JWT Signing Keys 탭에서 알고리즘 확인 후 security.py 설계

### [ISSUE-003] pydantic-settings에서 list[str] 환경변수 파싱 오류
- **날짜**: 2026-05-06
- **Phase**: Phase 1
- **증상**: `json.JSONDecodeError` — `ALLOWED_ORIGINS` 로딩 실패로 서버 기동 불가
- **원인**: `.env`에 `ALLOWED_ORIGINS=url1,url2` 형식으로 입력했으나, pydantic-settings v2는 `list[str]` 타입을 JSON 배열로 파싱 시도
- **해결**: `.env`에서 `ALLOWED_ORIGINS=["url1","url2"]` JSON 배열 형식으로 수정
- **교훈**: pydantic-settings v2에서 list/dict 타입 환경변수는 반드시 JSON 형식으로 작성
