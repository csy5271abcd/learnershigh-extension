# LearnersHigh Extension — Suyeon Progress

> 위치: `docs/specs/suyeon/progress.md`  
> 목적: 최수연 담당 LearnersHigh Extension 작업의 **현재 진행 상태, 다음 작업, 완료 항목, Blocker, 검증 상태**를 기록한다.  
> 이 문서는 요구사항 Source of Truth가 아니다. 기능 요구사항은 Feature Spec, Entity/State는 `domain.md`, API는 `api-contract.md`를 따른다.

---

# 1. Progress 문서 사용 원칙

이 문서는 다음을 기록한다.

```text
- 지금 무엇을 하고 있는가
- 무엇이 끝났는가
- 다음에 무엇을 할 것인가
- 무엇 때문에 막혀 있는가
- 어떤 검증을 실행했는가
```

이 문서에 맞추기 위해 Spec을 바꾸지 않는다.

```text
Feature Spec / Domain / API Contract
→ 요구사항과 설계의 기준

progress.md
→ 실제 작업 상태 기록
```

---

# 2. Status 정의

| Status | 의미 |
|---|---|
| `NOT_STARTED` | 아직 작업하지 않음 |
| `DRAFTED` | 문서/코드 초안은 있으나 실제 Repository 반영 또는 검증 전 |
| `IN_PROGRESS` | 현재 작업 중 |
| `IMPLEMENTED` | 구현 또는 문서 반영 완료, 전체 검증 전 |
| `VERIFIED` | 관련 검증까지 완료 |
| `BLOCKED` | 외부 결정/정보/환경 문제로 진행 불가 |
| `DEFERRED` | 현재 우선순위에서 제외 |

중요:

```text
"작성본 생성"
≠
"Repository에 실제 반영"
≠
"검증 완료"
```

세 상태를 구분한다.

---

# 3. Current Snapshot

```text
Date: 2026-10-09
Owner: Suyeon
Project: learnershigh-extension
Current Phase: Harness / Architecture / Specification Foundation
Implementation Phase: 아직 본격 시작 전
```

현재 핵심 목표:

```text
Claude Code가 문서를 먼저 읽고
기존 LearnersHigh를 중복 구현하지 않으며
Suyeon/Wangyu Ownership을 침범하지 않고
Feature / Domain / API 기준으로 구현할 수 있는
개발 Harness를 완성한다.
```

---

# 4. Current

현재 우선순위:

```text
1. Harness 문서 완성
2. 공통 Convention 확정
3. Repository 운영 파일 구성
4. Verification Script 구성
5. Open Decision 정리
6. 실제 Feature 구현 시작
```

현재 상태는 **기능 코드 구현보다 문서·계약·규칙 정비 단계**다.

---

# 5. Documentation / Harness Progress

## 5-1. 작성 완료본

다음 문서는 작성본이 생성되었다.

| 문서 | 상태 | 비고 |
|---|---|---|
| `docs/SOURCE_OF_TRUTH.md` | `DRAFTED` | Concern별 Source of Truth 정의 |
| `docs/OWNERSHIP.md` | `DRAFTED` | Suyeon/Wangyu/Shared 경계 정의 |
| `docs/architecture/overview.md` | `DRAFTED` | 전체 Architecture 개요 |
| `docs/architecture/integration-boundary.md` | `DRAFTED` | 기존 LearnersHigh ↔ Extension 경계 |
| `docs/specs/suyeon/domain.md` | `DRAFTED` | Suyeon Entity/State/Cross-Surface 규칙 |
| `docs/specs/suyeon/features/mentor-hub.md` | `DRAFTED` | Mentor Hub + Mentor Surface |
| `docs/specs/suyeon/features/school-admissions.md` | `DRAFTED` | 수행평가/Growth/Archive/Interview |
| `docs/specs/suyeon/features/student-management.md` | `DRAFTED` | Feedback/Today Board/Student360/Operations |
| `docs/specs/suyeon/features/parent-progress.md` | `DRAFTED` | Parent Report 생성/검증/전달 |
| `docs/api/api-contract.md` | `DRAFTED` | Student/Admin/Mentor API 초기 Contract |
| `docs/design/tds-web-guidelines.md` | `DRAFTED` | TDS Mobile → Responsive Web 기준 |
| `docs/adr/README.md` | `DRAFTED` | ADR 운영 규칙 |
| `docs/adr/0001-separate-student-admin-mentor-surfaces.md` | `DRAFTED` | 3 Surface 분리 |
| `docs/adr/0002-existing-learnershigh-integration-boundary.md` | `DRAFTED` | 기존 서비스 재구현 금지 / Integration |
| `docs/adr/0003-shared-feedback-queue.md` | `DRAFTED` | 공용 Feedback Queue |
| `docs/adr/0004-parent-report-without-parent-app.md` | `DRAFTED` | 별도 Parent App 없이 Report 전달 |
| `CLAUDE.md` | `DRAFTED` | Claude Code 최상위 작업 지도 |
| `.claude/rules/common.md` | `DRAFTED` | 전역 공통 규칙 |
| `.claude/rules/frontend-student.md` | `DRAFTED` | Student Frontend 규칙 |
| `.claude/rules/frontend-admin.md` | `DRAFTED` | Admin Frontend 규칙 |
| `.claude/rules/frontend-mentor.md` | `DRAFTED` | Mentor Frontend 규칙 |
| `.claude/rules/backend.md` | `DRAFTED` | Spring Boot Backend 규칙 |
| `.claude/rules/database.md` | `DRAFTED` | MySQL / Migration / Seed 규칙 |
| `.claude/rules/testing.md` | `DRAFTED` | 완료 기준 / 테스트 규칙 |

`DRAFTED`로 두는 이유:

```text
현재 작성본은 생성되어 있으나
C:\learnershigh-extension Repository에 실제 반영되었는지,
상호 링크가 모두 유효한지,
실제 코드 구조와 맞는지
아직 이 문서 기준으로 검증하지 않았기 때문이다.
```

Repository에 실제 복사하고 링크/경로를 확인한 뒤
`IMPLEMENTED` 또는 `VERIFIED`로 올린다.

---

# 6. 기존 통합 Spec 분할 상태

기존:

```text
learnershigh-suyeon-feature-spec.md
```

분할 대상:

```text
docs/specs/suyeon/domain.md

docs/specs/suyeon/features/
├─ mentor-hub.md
├─ school-admissions.md
├─ student-management.md
└─ parent-progress.md
```

상태:

```text
분할 작성본 생성: 완료
Repository 실제 반영 확인: 미확인
원본 archive 이동: 미실행
상호 링크 검증: 미실행
```

원본 통합 Spec은 분할본이 Repository에 정상 반영되고
누락 검토가 끝난 이후:

```text
docs/source/archive/
```

로 이동한다.

원본과 분할본을 동시에 authoritative 문서로 유지하지 않는다.

---

# 7. Architecture Progress

## 7-1. 확정 방향

현재 Architecture 기본 방향:

```text
Frontend
├─ Student
├─ Admin
├─ Mentor
└─ Shared

Backend
→ Domain-oriented Spring Boot

Database
→ MySQL + Migration + Seed

Existing LearnersHigh
→ Integration Boundary를 통해 연결
```

상태:

```text
Architecture 문서화: 완료본 생성
실제 Repository 구조 적용: 미확인
Backend/Frontend Scaffold 검증: 미실행
```

---

# 8. Ownership Progress

현재 확정된 Suyeon 범위:

```text
Mentor Hub
Mentor Surface
School & Admissions
Admin Student Management
Parent Progress
```

Wangyu 범위:

```text
상담 관련 전체 기능
+ Wangyu 담당 기타 확장 기능
```

Suyeon 금지 범위:

```text
Counseling Entity
Counseling API
Counseling DB
Counseling CRM
Student / Parent / Joint Counseling
Counseling Brief / Follow-up
Admissions Counseling
Counseling-derived Parent Report
Counseling-derived Today Board / Operations
```

상태:

```text
Ownership 문서화: 완료본 생성
CODEOWNERS 반영: 미실행
실제 팀 확인: 필요
```

---

# 9. API Contract Progress

초기 Contract에서 정리된 주요 영역:

```text
Student
├─ Task
├─ Topic
├─ Evidence
├─ Version / AI
├─ Feedback / Revision
├─ Final Artifact
├─ Growth Activity
├─ Archive
├─ Interview
├─ Mentor Hub
├─ Mentor Plan / Routine Apply
└─ Mentor Q&A

Mentor
├─ Content
├─ Q&A Inbox
└─ Profile

Admin
├─ Feedback Dashboard / Queue / Review
├─ Topic Review
├─ Activity Feedback
├─ Mentor Case Recommendation
├─ Today Board
├─ Student 360
├─ TestResult
├─ SchoolRecordSnapshot
├─ Connection
├─ Interview Management
├─ Operations
└─ Parent Report
```

상태:

```text
초기 Contract 작성: 완료본 생성
Backend Controller 구현: NOT_STARTED
Frontend API Client 구현: NOT_STARTED
Contract Test: NOT_STARTED
```

주의:

일부 Endpoint와 Enum은 초기 Contract 수준이며
Open Decision 해결 후 고정해야 한다.

---

# 10. Design Progress

정리된 기준:

```text
TDS Mobile
→ 디자인 원칙 / Component / State / Accessibility

Claude Design Mockup
→ 신규 화면 Layout

Existing LearnersHigh
→ 기존 Navigation / IA / Context
```

상태:

```text
TDS Web Guidelines 작성: 완료본 생성
공통 Theme Token 구현: NOT_STARTED
Shared UI 구현: NOT_STARTED
Responsive QA: NOT_STARTED
```

---

# 11. ADR Progress

현재 초기 ADR:

```text
ADR-0001
Student / Admin / Mentor Surface 분리

ADR-0002
Existing LearnersHigh Integration Boundary

ADR-0003
Shared Feedback Queue

ADR-0004
Parent App 없이 Parent Report 전달
```

상태:

```text
ADR 작성본 생성: 완료
Repository 반영 검증: 미확인
추가 ADR 필요성 검토: 진행 예정
```

---

# 12. Open Decisions

다음 항목은 아직 최종 확정하지 않는다.

## OD-01 ParentReport Status

현재 문서에:

```text
Draft
Reviewing
Ready
Sent
```

와:

```text
generated
```

가 동시에 존재한다.

결정 필요:

```text
generated를 Main Status로 볼 것인지
exportFileRef / generatedAt로 분리할 것인지
```

---

## OD-02 Mentor Q&A reassign

현재 Flow:

```text
pending
→ overdue
→ reassign
```

결정 필요:

```text
reassign = Command/Action
또는
reassign = Durable Status
```

---

## OD-03 Topic Approval Status

현재 동작:

```text
Approve
방향 요청
```

정확한 Enum Naming 미확정.

---

## OD-04 Connection Status

현재 동작:

```text
AI Candidate
Admin Confirm
Admin Reject
```

정확한 State Model 미확정.

---

## OD-05 Mentor Record / Case Review State

현재 Flow:

```text
PII Detection
→ Admin Review
→ Published
```

중간 Review State의 정확한 모델 미확정.

---

## OD-06 Archive Persistence

결정 필요:

```text
A. Task / Activity의 Archived State를 Query
B. 별도 Archive Projection / Persistence
```

---

## OD-07 Existing Performance Task Mapping

확인 필요:

```text
기존 Task PK
Extension Mapping 방식
Write Owner
Extension Process 저장 위치
```

---

## OD-08 Mentor Plan Source Metadata

요구:

```text
source = mentorPlanId
Snapshot 유지
```

기존 LearnersHigh Plan에 어떤 방식으로 저장할지 미확정.

---

## OD-09 File Storage

미확정:

```text
Evidence Storage
Version Upload
TaskFinalArtifact
ParentReport Export
fileRef 형식
```

---

## OD-10 Authentication

미확정:

```text
기존 Student/Auth 재사용 방식
Admin Auth 재사용 방식
Mentor Auth 방식
```

---

# 13. Next — Harness Completion

다음 작업 우선순위:

## P0-1. Shared Conventions

작성:

```text
docs/architecture/shared-conventions.md
```

포함 예정:

```text
ID
Date/Time
Timezone
Naming
Enum
Pagination
Sort
Error
FileRef
Snapshot
Status 표현
```

---

## P0-2. Repository Settings

작성 / 확인:

```text
.claude/settings.json
.claude/settings.local.json.example 또는 local 정책
.gitignore
README.md
```

주의:

```text
.claude/settings.local.json
```

은 개인 환경용이며 Git에 포함하지 않는다.

---

## P0-3. Verification Scripts

작성:

```text
scripts/verify.ps1
scripts/verify-frontend.ps1
scripts/verify-backend.ps1
```

실제 프로젝트의 package/build 명령을 확인한 뒤 작성한다.

명령을 추측하지 않는다.

---

## P0-4. GitHub Harness

작성:

```text
.github/CODEOWNERS
.github/pull_request_template.md
.github/workflows/ci.yml
```

CI는 실제 Frontend/Backend Scaffold가 확인된 뒤 구성한다.

---

# 14. Next — Repository Verification

문서 파일을 실제 Repository에 반영한 뒤 다음을 확인한다.

```text
[ ] 모든 경로가 실제로 존재하는가?
[ ] Markdown 내부 Link가 유효한가?
[ ] Feature Spec이 누락 없이 분할되었는가?
[ ] 상담 내용이 Suyeon Spec에 들어가 있지 않은가?
[ ] 동일 내용을 여러 authoritative 문서가 중복 소유하지 않는가?
[ ] archive 원본이 authoritative로 오해되지 않는가?
[ ] CLAUDE.md와 .claude/rules가 서로 충돌하지 않는가?
```

---

# 15. Next — Implementation Foundation

Harness 검증 후 실제 구현 시작 전:

```text
1. Frontend 실제 Scaffold 확인
2. Backend 실제 Scaffold 확인
3. Existing LearnersHigh Integration 가능 범위 확인
4. Shared Seed 전략 확정
5. 핵심 Open Decision 정리
6. API Contract 1차 고정
```

---

# 16. Implementation Priority

현재 Feature Spec 기준 우선 구현 화면:

```text
1. Feedback Dashboard
2. Feedback Review
3. Today Board
4. Student 360
5. Operations Dashboard
6. Student Task Detail
7. Revision Before/After
8. Mentor Hub Home
9. Mentor Activity Case
10. Interview Bridge
11. Parent Monthly Report
12. Mentor My Content / Q&A Inbox
```

단, 화면부터 독립적으로 만들지 않는다.

구현 순서:

```text
Shared Entity
→ Fixture / Seed
→ State Transition
→ API Contract
→ Backend Logic
→ Frontend State
→ Screen
→ Interaction
→ Loading / Empty / Error
→ Test
→ Visual Polish
```

---

# 17. Phase Plan

## Phase 0 — Harness / Docs

상태:

```text
IN_PROGRESS
```

목표:

```text
Claude Code 작업 기준 완성
Ownership / Architecture / API / Design 기준 완성
Verification Harness 준비
```

---

## Phase 1 — Shared Foundation

상태:

```text
NOT_STARTED
```

예정:

```text
Shared Entity / Type
Canonical Seed
API Client
Theme
Common UI
Backend Common
Integration Port
```

---

## Phase 2 — School Core Flow

상태:

```text
NOT_STARTED
```

핵심 Flow:

```text
Task
→ Version
→ AI Analysis
→ Feedback
→ Revision
→ Final
→ Archive
```

---

## Phase 3 — Admin Management

상태:

```text
NOT_STARTED
```

예정:

```text
Feedback Dashboard
Feedback Review
Today Board
Student 360
Operations
```

---

## Phase 4 — Mentor Hub / Mentor Surface

상태:

```text
NOT_STARTED
```

예정:

```text
Mentor Home
Profile
Plan / Routine
Story
Record / Case
Q&A
Mentor Content Management
```

---

## Phase 5 — Growth / Interview

상태:

```text
NOT_STARTED
```

예정:

```text
Growth Activity
Activity Feedback
Archive
Connection
Interview Bridge
```

---

## Phase 6 — Parent Progress

상태:

```text
NOT_STARTED
```

예정:

```text
Monthly Aggregation
AI Draft
Admin Review
Validation
Preview
PDF/Image
Delivery
```

---

## Phase 7 — Existing LearnersHigh Integration

상태:

```text
NOT_STARTED
```

실제 구조 확인 후:

```text
Student Identity
Organization / Branch
Auth Context
Plan
Library
Study Time
Existing Performance Task
Report / Statistics
```

순으로 Risk를 줄여가며 연결한다.

---

# 18. Blocked

현재 명확한 외부 Blocker라기보다
**구현 전에 확인해야 하는 미확정 사항**이 존재한다.

```text
- 기존 LearnersHigh 실제 API
- 기존 DB Schema
- 기존 Authentication 방식
- Existing Performance Task Mapping
- Existing Plan Write 방식
- File Storage 방식
- Kakao Delivery 실제 Provider/Contract
```

이 정보가 필요한 Feature에 도달하면
추측 구현하지 않고 `BLOCKED`로 표시한다.

---

# 19. Verification

현재 문서 작성 단계에서 실제 코드 검증은 아직 수행하지 않았다.

현재 Verification 상태:

```text
Frontend typecheck: NOT_RUN
Frontend lint: NOT_RUN
Frontend test: NOT_RUN
Frontend build: NOT_RUN

Backend compile: NOT_RUN
Backend test: NOT_RUN

DB migration: NOT_RUN
E2E: NOT_RUN

Markdown link validation: NOT_RUN
Repository path validation: NOT_RUN
```

이 상태에서 기능 구현을 `VERIFIED`로 표시하지 않는다.

---

# 20. Done

현재 `Done`으로 볼 수 있는 것은 **작성본 생성 작업**이다.

```text
- Source of Truth 초안 작성
- Ownership 초안 작성
- Architecture Overview 초안 작성
- Integration Boundary 초안 작성
- Suyeon Domain 초안 작성
- 통합 Feature Spec 4개로 분할
- API Contract 초안 작성
- TDS Web Guidelines 초안 작성
- ADR 4개 + ADR README 작성
- CLAUDE.md 작성
- .claude/rules 7개 작성
- progress.md 작성
```

하지만 Repository 반영 및 검증이 끝나기 전까지
위 항목의 운영 상태는 `DRAFTED`로 유지한다.

---

# 21. Repository 반영 후 상태 갱신 규칙

파일을 실제 Repository에 복사한 뒤:

```text
DRAFTED
→ IMPLEMENTED
```

다음까지 확인하면:

```text
Path
Link
Reference
Ownership
문서 충돌
```

```text
IMPLEMENTED
→ VERIFIED
```

로 변경한다.

---

# 22. Update Format

진행 상황 업데이트 시 아래 형식을 사용한다.

```md
## YYYY-MM-DD

### Current
- ...

### Done
- ...

### Next
- ...

### Blocked
- ...

### Verification
- command: result
```

큰 작업이 끝날 때마다 이 문서 전체 구조를 새로 쓰지 않고
관련 상태와 최근 기록만 업데이트한다.

---

# 23. Recent Log

## 2026-10-09

### Current

- LearnersHigh Extension Harness / 문서 구조 정리
- Suyeon Feature Spec 분할
- Architecture / Domain / API / TDS / ADR 기준 정립

### Done

- `SOURCE_OF_TRUTH.md` 작성본 생성
- `OWNERSHIP.md` 작성본 생성
- `architecture/overview.md` 작성본 생성
- `architecture/integration-boundary.md` 작성본 생성
- `specs/suyeon/domain.md` 작성본 생성
- Feature Spec 4개 작성본 생성
- `api/api-contract.md` 작성본 생성
- `design/tds-web-guidelines.md` 작성본 생성
- ADR 4개 + README 작성본 생성
- `CLAUDE.md` 작성본 생성
- `.claude/rules/` 7개 작성본 생성
- `progress.md` 작성본 생성

### Next

```text
1. docs/architecture/shared-conventions.md
2. .claude/settings.json
3. .gitignore
4. README.md
5. scripts/verify*.ps1
6. .github/CODEOWNERS
7. PR Template
8. CI
9. Repository 전체 문서 경로/링크 검증
```

### Blocked

```text
현재 즉시 문서 작업을 막는 Blocker 없음.
실제 Integration 구현 시 기존 LearnersHigh 구조 확인 필요.
```

### Verification

```text
작성본 생성만 완료.
실제 Repository / Build / Test 검증은 아직 실행하지 않음.
```

---

# 24. 핵심 요약

현재 단계:

```text
Harness / Specification Foundation
```

완료된 방향:

```text
Scope
Ownership
Architecture
Integration Boundary
Suyeon Domain
4 Feature Specs
API Contract
TDS Web Rules
ADR
CLAUDE.md
Claude Rules
```

다음 목표:

```text
Shared Conventions
→ Repository Harness
→ Verification Scripts
→ GitHub Workflow
→ Open Decision 정리
→ Shared Foundation 구현
```

가장 중요한 진행 관리 원칙:

```text
문서 작성본이 있다고 구현 완료로 표시하지 않는다.
코드가 있다고 검증 완료로 표시하지 않는다.
검증하지 않은 상태를 Done으로 과장하지 않는다.

Progress는 실제 상태를 기록하고,
Requirement는 Source of Truth 문서를 따른다.
```
