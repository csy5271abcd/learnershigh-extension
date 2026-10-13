# ADR-0007: Playwright E2E with Mock Existing Data

- Status: Proposed
- Date: 2026-10-13

## Context

`.claude/rules/testing.md` §8은 핵심 Cross-Surface Flow를 E2E로 검증하라고 하지만 E2E 도구와 실행 방식이 미확정이었다(ADR-0006 "Not Decided Here").
학생 케어(신호 → 사유 → 약속 → 재점검 → 종결)는 날짜가 지나야 다음 단계가 열리므로 기준일을 통제할 수 있어야 한다.
Existing LearnersHigh 실제 API도 아직 없다.

## Decision

### 1. 도구: Playwright (`@playwright/test`, Chromium)

```text
e2e/
├─ package.json          # npm only, e2e/package-lock.json
├─ playwright.config.ts
└─ tests/*.spec.ts
```

`frontend/` npm workspace와 분리한다. Browser 의존성이 Frontend Build에 섞이지 않게 한다.

### 2. 실행 구성

```text
MySQL (docker compose / CI service)
→ Backend bootJar, Spring Profile "e2e"
→ Admin vite preview (/api → Backend proxy)
→ Playwright
```

`e2e` Profile:

- Existing LearnersHigh는 Mock Client(시나리오 데이터)를 쓴다.
- 기준일은 조정 가능한 `Clock`(기본 2026-09-30)이다.
- E2E 전용 Endpoint `PUT /api/test/clock`, `POST /api/test/reset`을 등록한다. 다른 Profile에서는 Bean 자체가 없다.

### 3. CI

`.github/workflows/ci.yml`에 `e2e` Job(`ubuntu-latest`, `services: mysql:8.4`)을 추가한다.
Backend / Frontend Job이 통과한 뒤 실행한다.

## Consequences

- E2E가 실제 Backend + DB + 화면을 함께 검증한다.
- Mock 시나리오 데이터가 Existing 실제 데이터와 다를 수 있다. 실제 Client가 생기면 Contract Test를 따로 둔다.
- CI 시간이 늘어난다(Browser 설치 포함).

## Alternatives Considered

- Cypress: 다중 탭 / 네트워크 제어가 약하고 Docker 이미지가 무겁다.
- Frontend Mock(MSW)만으로 E2E: Backend 상태 전이와 DB를 검증하지 못한다.

## Related Documents

```text
docs/adr/0006-docker-mysql-flyway-testcontainers.md
docs/specs/wangyu/features/student-care.md
.claude/rules/testing.md
```
