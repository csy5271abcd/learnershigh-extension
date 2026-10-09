# ARCHITECTURE.md — LearnersHigh Extension

> 처음 이 Repository를 여는 사람(또는 Agent)을 위한 **구조 지도**다.  
> 상세 기준은 [`docs/architecture/overview.md`](docs/architecture/overview.md)이며, 이 문서와 다르면 `overview.md`가 우선한다.  
> 이 문서는 "어디에 무엇이 있고, 무엇이 무엇에 의존하는가"만 다룬다.

## 1. Bird's-eye View

```text
┌───────────────────────────────────────────────────────────────┐
│ Frontend (React + TypeScript, npm, Node.js 22)                 │
│  student/   admin/   mentor/        ── Surface App              │
│        └──────┬──────┘                                          │
│            shared/  (ui / theme / api / types / utils)          │
└───────────────┬───────────────────────────────────────────────┘
                │  HTTP / JSON  —  docs/api/api-contract.md
┌───────────────▼───────────────────────────────────────────────┐
│ Backend (Spring Boot)                                          │
│  mentor/  school/  studentmanagement/  parentprogress/         │
│  <wangyu-domain>/ (counseling 등)        common/               │
│   각 Domain: controller → service → entity / repository (MVC)  │
└───────┬──────────────────────────────────────────┬────────────┘
        │                                          │
┌───────▼────────┐                     ┌───────────▼────────────┐
│ MySQL          │                     │ Existing LearnersHigh   │
│ database/      │                     │ (Plan, Library, Study   │
│  migrations/   │                     │  Data, 수행평가 …)        │
│  seed/         │                     │ Adapter / ACL로만 접근   │
└────────────────┘                     └────────────────────────┘
```

핵심 아이디어 세 가지:

1. **Existing First** — 기존 LearnersHigh 기능은 재구현하지 않고 Adapter로 연결한다. ([ADR-0002](docs/adr/0002-existing-learnershigh-integration-boundary.md))
2. **Surface 분리, Entity 공유** — Student / Admin / Mentor는 별도 App이지만 같은 Domain Entity를 본다. ([ADR-0001](docs/adr/0001-separate-student-admin-mentor-surfaces.md))
3. **Contract First** — Frontend와 Backend는 `api-contract.md`로만 만난다.

기술 선택:

| 영역 | 확정 | 미확정 (임의 선택 금지) |
|---|---|---|
| Frontend | React 19.3.0, TypeScript 6.0.3, Vite 8.3.4, oxlint (Lint), npm workspaces, Node.js 22 | 상태관리 / Router / Data Fetching / UI / CSS / Form Library, Test Framework, Node.js exact Version |
| Backend | Java 21, Spring Boot 4.1.1, Gradle 9.7.1 Wrapper (Kotlin DSL), Domain-packaged Layered MVC (ADR-0005), JUnit Jupiter + Spring Boot Test + ArchUnit | Migration Tool, Integration Test DB 실행 방식 |
| Database / API | MySQL, REST-style JSON | — |
| Infrastructure | — | Authentication, File Storage, AI / Delivery Provider, Existing LearnersHigh 실제 API / DB / Auth |

## 2. Code Map

> `frontend/`(student / admin / mentor App Shell)와 `backend/`(Spring Boot App + Architecture Test)는 Scaffold만 있고 Feature는 아직 없다. `frontend/shared/`, `database/`, `e2e/`는 실제로 필요해질 때 만든다. 아래는 목표 구조다.
>
> Frontend는 `frontend/package.json`의 npm workspaces(`student`, `admin`, `mentor`)와 `frontend/package-lock.json` 하나로 관리한다. Backend base package는 `com.learnershigh.extension`이다.

### `frontend/<surface>/src/features/<feature>/`

Surface별 기능 코드. 사람 이름이 아니라 Feature 이름으로 나눈다.

| Surface | Feature 예 | 담당 |
|---|---|---|
| student | `mentor-hub/`, `school-admissions/` | Suyeon |
| admin | `feedback/`, `student-management/`, `parent-progress/`, `mentor-management/` | Suyeon |
| mentor | `content/`, `qna/`, `profile/` | Suyeon |
| student / admin | `counseling/` 등 | Wangyu |

### `frontend/shared/`

**두 개 이상 Surface / Feature가 실제로 쓰는 코드만** 둔다. 승격 기준은 `overview.md` §4-4.

### `backend/src/main/java/.../<domain>/`

Domain 패키지 안의 Layered MVC ([ADR-0005](docs/adr/0005-domain-packaged-layered-mvc-backend.md), Accepted). 상세 규칙: [`overview.md` §6](docs/architecture/overview.md).

| 하위 패키지 | 책임 | 의존 가능 대상 |
|---|---|---|
| `controller/` | `@Valid`, 인증 Context, Service 호출 | `service`, `dto` |
| `service/` | `XxxService`(변경, Transaction) / `XxxQueryService`(조회·집계), Entity → Response 변환 | `entity`, `repository`, 다른 Domain 공개 Service, `common/integration` |
| `entity/` | JPA Entity, Enum, 상태 전이 메서드, Invariant | 같은 Domain `entity` |
| `repository/` | Spring Data Repository (자기 Domain Entity만) | `entity` |
| `dto/` | `api-contract.md` 기준 Request / Response, `from(entity)` | `entity` |
| `exception/` | `XxxErrorCode` | `common/error` |

`common/`은 `error/`(ErrorCode, BusinessException, GlobalExceptionHandler), `auth/`, `integration/learnershigh/`(`ExistingXxxClient` Interface + `RealExistingXxxClient` / `MockExistingXxxClient`)만 둔다.
Interface는 외부 경계(Existing / File Storage / Delivery / AI)에만 만든다. File Storage / Delivery / AI Interface의 Package 위치는 아직 확정하지 않았다.

### `database/`

`migrations/`(Schema 변경은 반드시 Migration), `seed/`(Surface 간 동일 Identity를 쓰는 공통 Fixture). Shared 영역이다.

### `docs/`

| 경로 | 무엇의 기준인가 |
|---|---|
| `docs/SOURCE_OF_TRUTH.md` | 문서 간 우선순위 |
| `docs/OWNERSHIP.md` | 담당자 경계 |
| `docs/specs/<owner>/features/` | 기능 동작 / User Flow |
| `docs/specs/<owner>/domain.md` | Entity / Relationship / State |
| `docs/api/api-contract.md` | Frontend ↔ Backend Contract |
| `docs/architecture/` | 구조 (`overview`, `integration-boundary`, `shared-conventions`) |
| `docs/design/tds-web-guidelines.md` | 신규 Visual 원칙 |
| `docs/adr/` | 결정과 이유 |

### `references/`, `docs/source/`

Read-only 원본 (기존 화면 캡처, Claude Design Mockup, 원본 PDF). 수정하지 않는다.

### `scripts/`, `.github/`, `.claude/`

검증 스크립트(PowerShell), CI, CODEOWNERS / PR Template, Claude Code 규칙.

## 3. Architectural Invariants

코드가 커져도 깨지면 안 되는 규칙이다. 가능한 것은 자동 검증으로 옮긴다.

| Invariant | 현재 검증 |
|---|---|
| `frontend/**`, `backend/**`에 `suyeon/`, `wangyu/`, `ext/` 폴더 없음 | `scripts/verify.ps1` |
| Controller에 Business Rule 없음 | Code Review |
| `entity/`는 `controller` / `service` / `dto` / `repository`에 의존하지 않음, Controller는 Repository / Entity를 직접 사용하지 않음, `XxxServiceImpl` 금지 | ArchUnit (`backend/src/test/.../architecture/ArchitectureTest`) |
| 다른 Domain의 Repository / Entity 직접 참조 금지 | ArchUnit (동일) |
| `ExistingXxxClient` / `Real` / `Mock` 구현은 `common/integration/learnershigh/`에만 있고 Domain은 구현체를 직접 쓰지 않음 | ArchUnit (동일) |
| 기존 LearnersHigh Table / DTO는 `common/integration/learnershigh/` 밖으로 나오지 않음 | Code Review (실제 Client 구현 시 자동화 검토) |
| Surface별 Entity 복제 금지 (`StudentTask`, `AdminTask` 같은 Domain Class 금지) | Code Review |
| Mentor 응답에 Student PII 없음 | Privacy Test (`.claude/rules/testing.md` §11) |
| 상담 기능은 Wangyu Domain에만 존재 | CODEOWNERS + Code Review |

## 4. Cross-cutting Concerns

| Concern | 기준 문서 |
|---|---|
| Naming / ID / Date / Enum / Error / Pagination | `docs/architecture/shared-conventions.md` |
| 기존 시스템 연결 | `docs/architecture/integration-boundary.md` |
| Authentication / Authorization | `overview.md` §15 — **Open Decision** |
| Privacy | `overview.md` §16, `CLAUDE.md` §14 |
| AI | `overview.md` §17 — Analysis / Suggestion / Draft / Candidate까지만 |
| File / Evidence | `overview.md` §18 — Storage Provider는 **Open Decision** |
| Loading / Empty / Error | `overview.md` §19 — Integration Error ≠ Empty |

## 5. Engineering Approach (Proposed)

> **Status: Proposed.** 아래 Engineering Practice(Tactical DDD Lite, Domain 우선 TDD, 유지보수성 항목)는 Accepted Architecture인 ADR-0005와 **별개의 제안**이다. 팀 합의 후 별도 ADR로 확정하며, 확정 전에는 강제 규칙으로 취급하지 않는다.
>
> 단, 아래 항목 중 ADR-0005에 이미 포함된 것(Entity 안의 상태 전이 / Invariant, Domain / Persistence Model 비분리, `common/integration` 경유 Existing 접근)은 이 섹션의 Status와 무관하게 ADR-0005 기준으로 적용된다.

### DDD — "Tactical DDD Lite"

이미 문서가 Bounded Context(`mentor`, `school`, `studentmanagement`, `parentprogress`, counseling), Ubiquitous Language(`domain.md`), Anti-Corruption Layer(Existing Adapter)를 전제하고 있다. 여기에 맞춰 다음만 적용한다.

- **적용**: Bounded Context = Backend 최상위 Domain 패키지. 상태 전이가 있는 Entity(Task, Version, Feedback, Activity, MentorContent, ParentReport)는 전이 메서드와 Invariant를 Entity 안에 둔다 (Rich Domain Model). 기존 시스템 연결은 `common/integration` ACL로만.
- **선택**: Aggregate 경계, Value Object는 `domain.md`에서 경계가 확정된 것부터 점진 도입.
- **비적용**: Domain / Persistence Model 분리(ADR-0005), Event Sourcing, CQRS 별도 저장소, Domain Event Bus, 물리적 Multi-module 분리. 현재 팀 규모(2인)와 단계에 비해 비용이 크다. 필요해지면 ADR로 도입한다.

### TDD — "Domain 우선 TDD"

| 영역 | 방식 |
|---|---|
| Domain State Transition / Invariant / Validation | **Test First** (정상 + 잘못된 전이 모두). 문서의 State 표가 곧 Test Case 목록이다. |
| Service Use Case | Test First 권장 (External Boundary는 Mock 구현으로) |
| API / Contract | Contract Test로 `api-contract.md`와 DTO 일치 검증 |
| Repository / Migration | Integration Test (실제 MySQL 권장) |
| Frontend 화면 | Test After — 상태(Loading / Empty / Error / Disabled) 분기와 핵심 Interaction 위주 |
| Cross-Surface Flow | 소수의 E2E (`.claude/rules/testing.md` §8) |

### 유지보수성

- 의존 방향을 Architecture Test로 고정 — Backend Scaffold에서 ArchUnit으로 도입했다 (§3).
- Clock / ID Generator 주입으로 시간 의존 Test 제거 (`testing.md` §14).
- `shared/`, `common/` 조기 승격 금지 — 중복 2회까지는 허용하고 3회째에 추출을 검토한다.
