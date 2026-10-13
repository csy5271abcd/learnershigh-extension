# LearnersHigh Extension — Architecture Overview

> 이 문서는 `learnershigh-extension` 프로젝트의 **전체 시스템 구조와 주요 책임 경계**를 설명한다.  
> 세부 기능 동작은 Feature Spec, Entity/State는 각 담당자의 `domain.md`, API 형식은 `docs/api/api-contract.md`를 최종 기준으로 한다.  
> 이 문서는 구현 세부사항보다 **시스템을 어떤 단위로 나누고, 각 단위가 어떻게 연결되는지**를 설명하는 상위 Architecture 문서다.

---

# 1. Architecture Goal

LearnersHigh Extension의 목표는 기존 LearnersHigh를 새로 만드는 것이 아니라,
기존 학습관리 데이터와 화면 Context를 유지하면서 신규 확장 기능을 추가하는 것이다.

기존 LearnersHigh가 이미 제공하는 주요 기능:

```text
Study Timer
Plan
Library
Learning History
Report
Statistics
Performance Task
Admin Student / Branch Management
Study Room
```

신규 확장 영역:

```text
Mentor Hub
School & Admissions
Student Management
Parent Progress
+ Team Member Features
```

Architecture의 핵심 목표:

```text
1. 기존 LearnersHigh와 신규 Extension의 경계를 명확히 유지한다.
2. Student / Admin / Mentor가 같은 Entity를 일관되게 공유한다.
3. Frontend와 Backend의 계약을 명확하게 유지한다.
4. Feature별 독립성을 높여 두 명이 병렬 개발할 수 있게 한다.
5. 사람 이름이 아니라 Feature / Domain 기준으로 Source Code를 구성한다.
6. Shared 코드가 무분별하게 커지지 않도록 책임을 제한한다.
7. 기능 구현보다 먼저 State / API / Cross-Surface 영향 관계를 명확히 한다.
```

---

# 2. High-Level System

전체 구조:

```text
┌─────────────────────────────────────────────────────────────┐
│                     Existing LearnersHigh                   │
│                                                             │
│ Timer / Plan / Library / History / Report / Statistics      │
│ Existing Performance Task / Admin Data / Study Room         │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              │ Integration Boundary
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  LearnersHigh Extension                     │
│                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐       │
│  │   Student   │   │    Admin    │   │   Mentor    │       │
│  │ React App   │   │ React App   │   │ React App   │       │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘       │
│         │                 │                 │               │
│         └──────────┬──────┴──────────┬──────┘               │
│                    │ HTTP / JSON API │                      │
│                    ▼                 ▼                      │
│              ┌────────────────────────────┐                 │
│              │        Spring Boot         │                 │
│              │                            │                 │
│              │ Domain-oriented Modules    │                 │
│              └─────────────┬──────────────┘                 │
│                            │                                │
│                            ▼                                │
│                       ┌─────────┐                           │
│                       │  MySQL  │                           │
│                       └─────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

---

# 3. Main Surfaces

Extension은 세 개의 사용자 Surface를 가진다.

```text
Student
Admin
Mentor
```

각 Surface는 사용자 역할이 다르며,
동일한 Entity를 서로 다른 목적으로 사용할 수 있다.

---

## 3-1. Student Surface

학생이 직접 사용하는 Extension 화면.

대표 영역:

```text
Student
├─ Mentor Hub
└─ School & Admissions
```

주요 역할:

- Mentor 탐색
- Plan / Routine / Story / Case 활용
- Mentor Q&A
- 수행평가 진행
- Evidence 관리
- Version 제출
- Feedback 확인
- Revision
- Growth Activity 기록
- Reflection
- Archive
- Interview 준비

Frontend 위치:

```text
frontend/student/
```

Feature 예:

```text
frontend/student/src/features/
├─ mentor-hub/
├─ school-admissions/
└─ <other-feature>/
```

---

## 3-2. Admin Surface

기관 운영자가 학생의 학습 / 학교활동 / Feedback / Report 상태를 확인하는 Surface.

대표 영역:

```text
Admin
├─ Feedback
├─ Student Management
├─ Parent Progress
├─ Mentor Management
└─ Team Member Features
```

주요 역할:

- Feedback Queue 관리
- Student Task / Activity 검토
- Today Board
- Student 360
- TestResult 확인
- SchoolRecordSnapshot 확인
- Mentor Case 추천
- Parent Report 생성
- Operations 상태 확인

Frontend 위치:

```text
frontend/admin/
```

Feature 예:

```text
frontend/admin/src/features/
├─ feedback/
├─ student-management/
├─ parent-progress/
├─ mentor-management/
└─ <other-feature>/
```

---

## 3-3. Mentor Surface

Mentor가 자신의 경험 콘텐츠를 관리하고
학생의 익명 질문에 답변하는 Surface.

대표 영역:

```text
Mentor
├─ My Content
├─ Q&A Inbox
├─ Create
└─ Profile
```

주요 역할:

- Mentor Content 작성
- Draft / Published Content 관리
- 익명 질문 확인
- 답변 작성
- 관련 Content 연결
- Profile 관리

Frontend 위치:

```text
frontend/mentor/
```

예:

```text
frontend/mentor/src/features/
├─ content/
├─ qna/
└─ profile/
```

Mentor는 Student 관리자 역할을 가지지 않는다.

Student의 실명, 학교, 기관, 상세 관리 데이터 등
Mentor에게 허용되지 않은 정보를 Mentor Surface로 전달하지 않는다.

---

# 4. Frontend Architecture

Frontend는 Surface별 App과 공통 Shared Layer로 구성한다.

기술: React + TypeScript, Build Tool Vite, Package Manager npm(workspaces), Runtime Node.js 22. (Version: `README.md` §4)
각 Surface는 `frontend/<surface>/`의 독립 Vite App이며, `frontend/package.json` workspaces와 `frontend/package-lock.json` 하나로 관리한다.
상태관리 / Router / Data Fetching / UI Library, Test Framework는 아직 확정하지 않는다.

```text
frontend/
├─ student/
├─ admin/
├─ mentor/
└─ shared/
```

---

## 4-1. Surface App

각 Surface는 자신의:

- Routing
- Page
- Feature
- Surface-specific State
- Surface-specific API Usage
- Layout

을 가진다.

예:

```text
frontend/student/
└─ src/
   ├─ app/
   ├─ pages/
   ├─ features/
   └─ ...
```

구체적인 React 디렉터리 구조는 실제 프로젝트 초기 설정에 맞추되,
Feature 경계는 유지한다.

---

## 4-2. Feature-first Structure

실제 기능 코드는 사람 이름이 아니라 Feature 기준으로 구성한다.

좋은 예:

```text
features/mentor-hub/
features/school-admissions/
features/student-management/
features/parent-progress/
```

피해야 할 예:

```text
features/suyeon/
features/wangyu/
features/ext/
```

---

## 4-3. Shared Frontend

공통 코드는:

```text
frontend/shared/
├─ ui/
├─ theme/
├─ api/
├─ types/
└─ utils/
```

에 둔다.

역할:

### `ui/`

여러 Surface에서 실제로 재사용하는 기본 UI Component.

예:

```text
Button
Badge
Modal wrapper
Loading
Empty State
Error State
```

### `theme/`

공통 Design Token / Theme.

예:

```text
color
typography
spacing
radius
light/dark/system
```

### `api/`

공통 HTTP Client와 공통 API 처리.

예:

```text
request client
error normalization
auth-related request helper
```

구체적 Endpoint 호출은 Feature에 둘 수 있다.

### `types/`

여러 Surface가 공유하는 Type.

API Contract와 Domain 정의를 기준으로 유지한다.

### `utils/`

Feature에 종속되지 않는 작은 공통 Utility.

---

## 4-4. Shared 승격 기준

Feature 내부 코드를 너무 빨리 `shared`로 이동하지 않는다.

Shared로 이동하기 전:

```text
1. 실제로 두 개 이상 Feature / Surface에서 사용하는가?
2. Feature-specific Business Logic이 없는가?
3. 공개 Interface가 안정적인가?
```

를 확인한다.

단 한 화면에서만 사용하는 Component는 해당 Feature 내부에 둔다.

---

# 5. Backend Architecture

Backend는 Spring Boot + MySQL 기반의 REST-style JSON API이며,
사람 또는 화면이 아니라 **Business Domain 기준**으로 구성한다.
Java 21, Gradle Wrapper(Kotlin DSL)를 사용한다. Base package는 `com.learnershigh.extension`이다. (Version: `README.md` §4)
Migration은 Flyway(`database/migrations/`), MySQL Integration Test는 Testcontainers, 로컬 MySQL은 Docker Compose를 사용한다. (ADR-0006, Proposed)

예:

```text
backend/
└─ src/main/java/.../
   ├─ mentor/
   ├─ school/
   ├─ studentmanagement/
   ├─ parentprogress/
   ├─ <other-domain>/
   └─ common/
```

`ext`, `suyeon`, `wangyu`와 같은 패키지는 사용하지 않는다.

---

# 6. Backend Layer Guide

> 기준: [ADR-0005](../adr/0005-domain-packaged-layered-mvc-backend.md) — Domain 패키지 안의 Layered MVC (Status: Accepted)

## 6-1. 패키지 구조

```text
<domain>/                      # mentor, school, studentmanagement, parentprogress ...
├─ controller/                 # HTTP 입출력
├─ service/                    # XxxService(변경) / XxxQueryService(조회)
├─ entity/                     # JPA Entity + Enum + 상태 전이 메서드
├─ repository/                 # Spring Data JPA Repository
├─ dto/                        # Request / Response (api-contract.md 기준)
└─ exception/                  # 이 Domain의 ErrorCode enum

common/
├─ error/                      # ErrorCode, BusinessException, GlobalExceptionHandler
├─ auth/                       # 인증 Context
└─ integration/learnershigh/   # ExistingXxxClient (interface) + Real / Mock 구현
```

## 6-2. Layer별 책임

| Layer | 하는 일 | 하지 않는 일 | 호출 가능 대상 |
|---|---|---|---|
| `controller` | `@Valid`로 Request 형식 검증, 인증 Context 추출, Service 호출, HTTP Status 결정 | Business 판단, Repository 호출, Entity 사용 | 자기 Domain `service` |
| `service` (`XxxService`) | `@Transactional` Use Case. Entity 조회 → 전이 메서드 호출 → 저장. Entity → Response 변환 | HTTP 객체 의존, Entity 상태 필드 setter 직접 수정 | 자기 `repository`, 다른 Domain 공개 메서드(6-4), `common/integration` |
| `service` (`XxxQueryService`) | `@Transactional(readOnly = true)` 목록 / 상세 / 집계 / Dashboard Count | 상태 변경 | 자기 `repository`, 다른 Domain `QueryService` |
| `entity` | 필드, 연관관계, 상태 전이 메서드, Invariant 검증(위반 시 `BusinessException`) | DTO / Service / Repository 참조, Bean 주입 | 같은 Domain `entity` |
| `repository` | Spring Data JPA, 조회 쿼리, Projection | Business Rule | — |
| `dto` | `record` Request / Response, `XxxResponse.from(entity)` | Business Rule | 같은 Domain `entity` (`from()` 안에서만) |

호출 방향은 한 방향이다.

```text
controller → service → entity / repository
                └────→ common/integration (interface)
```

## 6-3. DTO 변환

```text
Controller : Request DTO를 받아 Service에 그대로 넘긴다. Response DTO를 받아 반환한다.
Service    : Request DTO → Entity 생성 / 변경, Entity → XxxResponse.from(entity)
Entity     : Service 밖으로 나가지 않는다. Controller와 다른 Domain은 Entity를 보지 않는다.
```

Response 이름은 Surface별로 나눌 수 있다. (`StudentTaskDetailResponse`, `AdminFeedbackQueueItemResponse`) Entity는 하나다.

## 6-4. 다른 Domain 호출

```text
조회 : 상대 Domain의 XxxQueryService public 메서드 (Response DTO 또는 ID 반환)
변경 : 상대 Domain의 XxxService public 메서드 (ID / Request DTO 인자, Entity 주고받기 금지)
금지 : 상대 Domain의 Repository / Entity 직접 사용
```

여러 Domain에 걸친 변경은 호출을 시작하는 쪽 Service의 한 Transaction 안에서 조합한다.
두 Domain이 서로 호출하게 되면(순환) 조합 로직을 별도 Service(예: `parentprogress/service/ParentReportAssembler`)로 올린다.

## 6-5. 예외 처리

```text
common/error/ErrorCode              interface: code(), status(), message()
common/error/BusinessException      ErrorCode를 담는 RuntimeException
common/error/GlobalExceptionHandler @RestControllerAdvice
<domain>/exception/XxxErrorCode     enum implements ErrorCode (예: TASK_NOT_FOUND)
```

| 상황 | Error Code 예 | HTTP |
|---|---|---|
| Request 형식 오류 (`@Valid` 실패) | `VALIDATION_ERROR` | 400 |
| 대상 없음 | `TASK_NOT_FOUND` | 404 |
| 잘못된 상태 전이 | `INVALID_STATE_TRANSITION` | 409 |
| Business Validation 실패 | `PARENT_REPORT_VALIDATION_FAILED` | 422 |
| Existing LearnersHigh 연동 실패 | `EXISTING_PLAN_UNAVAILABLE` | 502 / 503 |

`GlobalExceptionHandler`가 모든 예외를 `shared-conventions.md` §36 형식(`code`, `message`, `details`, `traceId`)으로 바꾼다.
Controller / Service에서 `try-catch`로 Error Response를 직접 만들지 않는다. 연동 실패를 빈 목록으로 바꾸지 않는다.

## 6-6. 조회 전용 / 집계

Dashboard Count, Today Board, Student 360처럼 조회만 하는 화면은 `XxxQueryService`가 담당한다.

```text
- Repository의 count / JPQL / Projection으로 Source Entity에서 계산한다.
- Counter Table / Field를 따로 두지 않는다. (§24 Derived Data)
- 여러 Domain 데이터가 필요하면 각 Domain QueryService를 호출해 조합한다.
- 결과는 Read Model DTO (shared-conventions §69)로 반환한다.
```

## 6-7. Interface를 두는 곳

Interface는 실제로 구현이 바뀌는 외부 경계에만 둔다.

```text
common/integration/learnershigh/ExistingXxxClient   (RealExistingXxxClient / MockExistingXxxClient, ADR-0002)
File Storage / External Delivery / AI Provider      (Interface Package 위치 미확정)
```

File Storage / External Delivery / AI Provider Interface의 Package 위치는
실제 Feature에서 필요해지는 시점에 문서로 먼저 정한 뒤 만든다.

Service, Repository 구현체에는 `XxxServiceImpl` 같은 Interface를 만들지 않는다.

---

# 7. Main Domains

현재 Extension Architecture의 주요 Domain은 다음과 같다.

```text
Mentor
School
Student Management
Parent Progress
Team Member Domains
Common
```

세부 Entity와 State의 최종 기준은 각 담당자의:

```text
docs/specs/<owner>/domain.md
```

이다.

---

## 7-1. Mentor Domain

주요 책임:

- MentorProfile
- MentorContent
- Plan
- Routine
- Story
- Q&A
- Record
- Activity Case
- Content Publication
- Student Content Application 연결

대표 흐름:

```text
Mentor Content
→ Student Browse
→ Save / Apply / Q&A
```

---

## 7-2. School Domain

주요 책임:

- Task
- Version
- Feedback 연결
- Evidence
- Growth Activity
- ActivityFeedback 연결
- Archive
- Connection
- InterviewQuestion

대표 흐름:

```text
Task
→ Version
→ AI Analysis
→ Feedback
→ Revision
→ Final
→ Archive
```

Growth Activity:

```text
Activity
→ Evidence
→ Reflection
→ Optional Feedback
→ Archive
```

---

## 7-3. Student Management Domain

Admin이 여러 Student Domain Data를 하나의 관리 Context에서 확인한다.

주요 책임:

- Feedback Queue View
- Today Board
- Student 360
- TestResult
- SchoolRecordSnapshot
- Operations-derived State

중요:

Dashboard KPI를 별도 독립 Counter로 저장하기보다
가능한 경우 Shared Entity에서 계산한다.

---

## 7-4. Parent Progress Domain

Admin이 검토된 Student Data를 월간 Snapshot으로 구성하고
Parent에게 전달할 Report를 만드는 Domain.

대표 흐름:

```text
Shared Student Data
→ Monthly Aggregation
→ AI Draft
→ Admin Review
→ Validation
→ PDF / Image
→ Delivery
```

Parent 전용 App/Web은 현재 Architecture에 포함하지 않는다.

---

# 8. Shared Data Model

Extension은 화면별로 서로 다른 Mock Entity를 생성하지 않는다.

예:

```text
Student Task Detail
Admin Feedback Review
Student 360
Parent Report
```

가 같은 Task를 보여준다면,
같은 `Task` Identity와 State를 기준으로 한다.

현재 주요 Shared Entity 후보:

```text
Organization
Staff
Student
Task
Version
Feedback
Evidence
Activity
ActivityFeedback
TestResult
SchoolRecordSnapshot
TaskFinalArtifact
MentorProfile
MentorContent
ParentReport
InterviewQuestion
Connection
```

정확한 Entity 정의와 관계는:

```text
docs/specs/suyeon/domain.md
docs/specs/wangyu/domain.md   # Wangyu Spec이 생성된 이후
```

를 따른다.

---

# 9. Cross-Surface State

하나의 Surface에서 상태가 변경되면
다른 Surface의 관련 View에도 같은 상태가 반영되어야 한다.

예:

```text
Admin Feedback 전달
        │
        ├─ Student Task Feedback 갱신
        ├─ Feedback Queue 갱신
        ├─ Today Board 상태 갱신 가능
        └─ Student 360 상태 갱신
```

또 다른 예:

```text
Student Mentor Plan 적용
        │
        ├─ Student Plan에 반영
        └─ Student 360 Mentor 영역에 반영
```

따라서 다음 값을 화면별로 따로 관리하지 않는다.

```text
Status
Counter
Badge
Queue
Next Action
Derived KPI
```

필요하면 Shared Entity에서 계산한다.

---

# 10. API Architecture

Frontend와 Backend는 HTTP / JSON 기반 API Contract를 통해 통신한다.

최종 계약 문서:

```text
docs/api/api-contract.md
```

API Contract가 정의해야 하는 항목:

```text
Method
Path
Actor / Permission
Request
Response
Error
State Change
```

---

## 10-1. API Namespace

Surface 기준 Endpoint Prefix를 사용할 수 있다.

예:

```text
/api/student/...
/api/admin/...
/api/mentor/...
```

하지만 Business Logic과 Entity를 Surface별로 복제하지 않는다.

예:

```text
/api/student/tasks/{taskId}
/api/admin/tasks/{taskId}
```

가 존재할 수 있어도,
둘이 서로 다른 `Task` Domain을 가지는 것은 아니다.

---

## 10-2. Contract-first Rule

새 API가 필요하면:

```text
Feature / Domain 확인
→ api-contract.md 정의
→ Backend 구현
→ Frontend 연결
→ Test
```

순서로 진행한다.

Frontend와 Backend가 각자 임의 JSON Shape을 만들지 않는다.

---

# 11. Database Architecture

Database는 MySQL을 사용한다.

위치:

```text
database/
├─ migrations/   # Flyway V<yyyyMMddHHmm>__<description>.sql (ADR-0006)
└─ seed/
```

로컬은 `docker-compose.yml`의 `mysql:8.4`, Integration Test는 Testcontainers의 같은 Image를 사용한다.

원칙:

```text
Schema Change
→ Migration으로 관리

개발 / 발표용 공통 데이터
→ Seed로 관리
```

Database는 Shared 영역이다.

한 Feature의 편의를 위해 공통 Table / Column을 임의로 변경하지 않는다.

Entity / State 정의:

```text
domain.md
```

API 전달 구조:

```text
api-contract.md
```

DB 구현:

```text
migration + backend entity / repository
```

의 역할을 구분한다.

---

# 12. Existing LearnersHigh Integration

기존 LearnersHigh는 Extension 내부에 복제하지 않는다.

개념 구조:

```text
Existing LearnersHigh
        │
        ▼
Integration Boundary
        │
        ▼
Extension Domain
```

기존 데이터가 필요한 경우 Adapter / Integration Contract를 사용한다.

예:

```text
Existing Study Time
        ↓
Student Management

Existing Plan
        ↓
Mentor Plan Apply / Student 360 / Parent Progress

Existing Library
        ↓
Mentor Plan Mapping

Existing Report Data
        ↓
Parent Progress
```

세부 Integration 규칙은:

```text
docs/architecture/integration-boundary.md
```

에서 정의한다.

---

# 13. Existing UI vs New UI

기존 LearnersHigh 화면과 신규 Extension 화면은 역할이 다르다.

기존 LearnersHigh Reference:

```text
docs/product/existing-runners-high-analysis.md
references/existing-runners-high/screens/
```

사용 목적:

- 기존 Navigation
- Existing Feature Context
- Sidebar / Header 구조
- 기존 Interaction
- 기존 데이터 표시 Context

신규 UI:

```text
docs/design/tds-web-guidelines.md
references/claude-design-mockup/
```

사용 목적:

- 신규 Layout
- Component hierarchy
- TDS-based Visual
- Responsive Web
- 신규 Interaction 표현

기존 Visual Style을 신규 화면에 그대로 복제하지 않는다.

---

# 14. Design Architecture

신규 UI는 TDS Mobile 원칙을 참고하되
Desktop / Tablet / Mobile Responsive Web으로 재해석한다.

Design Source:

```text
docs/design/tds-web-guidelines.md
```

Visual Reference:

```text
references/claude-design-mockup/
```

공통 Theme 구현:

```text
frontend/shared/theme/
```

지원 Theme:

```text
Light
Dark
System
```

Parent Report PDF / Image 등 출력물은
필요한 경우 별도의 Print-friendly Light Rendering을 사용할 수 있다.

---

# 15. Authentication / Authorization Boundary

이 문서는 특정 인증 기술을 확정하지 않는다.

현재 Architecture에서 확정하는 것은 **Surface와 데이터 접근 경계**다.

예:

```text
Student
→ 자신의 데이터 중심

Admin
→ 기관 내 관리 권한에 따른 학생 데이터

Mentor
→ 자신의 Content + 허용된 익명 질문 Context
```

구체적인:

- 인증 Provider
- Token 방식
- Session 방식
- 기존 LearnersHigh 인증 재사용 방식

은 Integration 설계가 확정되기 전 임의로 결정하지 않는다.

필요한 경우 별도 ADR 또는 Integration 문서에서 결정한다.

---

# 16. Privacy Boundary

Surface마다 공개할 수 있는 데이터가 다르다.

특히 Mentor Surface:

```text
금지 예:
Student 실명
학교
기관
상세 관리 데이터
불필요한 PII
```

Record / Activity Case 등 공개 콘텐츠는
필요한 개인정보 제거 / 검수 절차를 거쳐야 한다.

Parent Progress는:

```text
검토된 Snapshot
승인된 정보
Student가 공유를 허용한 Artifact
```

만 전달한다.

Raw AI 결과, 내부 관리 Note 등
외부 공개가 허용되지 않은 데이터를 그대로 전달하지 않는다.

세부 공개 규칙은 관련 Feature Spec을 따른다.

---

# 17. AI Boundary

AI는 독립적인 Source of Truth가 아니다.

AI 역할:

```text
Analysis
Suggestion
Draft
Candidate
```

최종 판단이 필요한 영역에서는
Student / Admin 등 실제 Actor의 확인이 필요하다.

예:

```text
AI Feedback
→ Staff Review
→ Student Feedback
```

또는:

```text
AI Parent Report Draft
→ Admin Review
→ Final Report
```

AI가 Student의 Reflection / 원문을 대신 작성하는 구조를 만들지 않는다.

---

# 18. File / Evidence Architecture

Evidence와 Artifact는 Domain Entity와 실제 파일 저장을 구분한다.

개념:

```text
Evidence Entity
        │
        └─ fileRef / metadata
                 │
                 ▼
          Storage Implementation
```

이 문서에서는 특정 Storage Provider를 확정하지 않는다.

Feature / Domain은:

```text
fileRef
fileName
type
metadata
visibility
```

등 필요한 Contract를 다루고,
실제 저장 기술은 Infrastructure 결정으로 분리한다.

---

# 19. Error / Loading / State Architecture

핵심 Feature는 Happy Path만 구현하지 않는다.

필요한 경우:

```text
Loading
Empty
Error
Retry
Disabled
Selected
Success
```

상태를 제공한다.

이 상태는 UI Component의 임시 Local State와
Business State를 구분한다.

예:

```text
Modal Open
→ UI State

Task Review Pending
→ Domain State
```

두 종류를 하나의 Status로 혼합하지 않는다.

---

# 20. Testing Architecture

테스트는 Layer별로 나눈다.

```text
Frontend Unit / Component
Backend Unit
Backend Integration
API Contract Verification
E2E
```

핵심 Cross-Surface Flow는 E2E 대상으로 우선 고려한다.

예:

```text
Student Version Upload
→ Admin Feedback Review
→ Student Feedback 확인
```

```text
Student Question
→ Mentor Answer
→ Student Q&A 반영
```

```text
Parent Report Generate
→ Validation
→ Output
```

공통 실행 Script:

```text
scripts/
├─ verify.ps1
├─ verify-frontend.ps1
└─ verify-backend.ps1
```

구체적인 테스트 규칙은:

```text
.claude/rules/testing.md
```

에서 정의한다.

---

# 21. Architecture Dependency Direction

기본 의존 방향 (ADR-0005, 상세: §6):

```text
controller
   ↓
service ──────────► common/integration (interface)
   ↓                        ▲
entity / repository         └── Real / Mock 구현
```

규칙:

```text
- controller는 repository를 직접 호출하지 않는다.
- entity는 controller / service / dto에 의존하지 않는다.
- 다른 Domain의 repository를 직접 주입하지 않는다.
- Existing LearnersHigh 접근은 common/integration Interface 경유만 허용한다.
```

---

# 22. Domain-to-Domain Communication

Domain 간 연결이 필요하다고 해서
서로의 내부 Repository를 직접 수정하거나 참조하지 않는다.

예:

```text
Parent Progress
needs
Task Result
TestResult
Activity
Mentor Application
```

이 경우:

```text
§6-4 다른 Domain 호출 규칙
```

를 사용한다.

Feature 간 숨겨진 DB 의존성을 만들지 않는다.

---

# 23. Avoid Circular Ownership

다음과 같은 구조를 피한다.

```text
school
→ studentmanagement 내부 Service 호출
→ parentprogress 내부 Repository 호출
→ school 내부 Repository 호출
```

대신:

```text
상대 Domain의 공개 XxxQueryService / XxxService 메서드
조합 전용 Service (예: parentprogress/service/ParentReportAssembler)
```

등 명시적인 경계를 사용한다. (§6-4)

---

# 24. Derived Data

다음과 같은 값은 가능하면 Source Entity에서 계산한다.

예:

```text
Feedback Pending Count
Deadline Risk Count
이번 주 완료 수
Parent Report 미발송 수
```

동일한 의미의 값을 여러 Table / Frontend State에 별도로 저장하지 않는다.

Derived 값이 DB에 저장되어야 하는 특별한 이유가 있다면
그 이유와 동기화 전략을 ADR 또는 Domain 문서에 남긴다.

---

# 25. Seed / Fixture Architecture

화면별로 서로 다른 Mock 인물을 만들지 않는다.

공통 Seed는 같은 ID를 기준으로 여러 Surface에서 재사용한다.

예:

```text
Student S001
├─ Task
├─ Activity
├─ TestResult
├─ Mentor Application
└─ ParentReport
```

Student UI와 Admin UI가 같은 Student를 보여준다면
같은 Entity / ID / 날짜 Context를 사용한다.

Seed:

```text
database/seed/
```

Feature-local Fixture는 테스트 용도로만 제한적으로 사용할 수 있다.

---

# 26. Time / Snapshot

서비스에는 다음과 같은 서로 다른 시간 기준이 존재할 수 있다.

예:

```text
Today
최근 7일
해당 월
Version 생성일
Feedback 전달일
Report Snapshot Date
```

서로 다른 기간의 지표를 같은 값처럼 취급하지 않는다.

Report처럼 과거 시점을 고정해야 하는 기능은
필요한 경우 Snapshot 개념을 사용한다.

---

# 27. Architecture Change Rule

다음 변경은 Architecture 영향이 큰 변경으로 본다.

```text
- 새로운 Surface 추가
- 기존 Surface 제거
- Shared Entity의 주요 책임 변경
- Domain Boundary 변경
- Frontend App 구조 변경
- Backend Module 구조 변경
- 기존 LearnersHigh Integration 방식 변경
- Parent 전달 방식 변경
- 공통 API Naming 정책 변경
- Database 핵심 구조 변경
```

이러한 변경은:

```text
1. SOURCE_OF_TRUTH 확인
2. OWNERSHIP 확인
3. 영향 문서 확인
4. ADR 필요 여부 판단
5. 합의
6. 구현
```

순서로 진행한다.

---

# 28. Repository Structure Summary

```text
learnershigh-extension/
│
├─ frontend/
│  ├─ student/                  # Student Surface
│  ├─ admin/                    # Admin Surface
│  ├─ mentor/                   # Mentor Surface
│  └─ shared/                   # 공통 UI/Theme/API/Type/Utility
│
├─ backend/
│  └─ src/main/java/.../
│     ├─ mentor/                # Mentor Domain
│     ├─ school/                # School & Admissions Domain
│     ├─ studentmanagement/     # Admin Student Management Domain
│     ├─ parentprogress/        # Parent Progress Domain
│     ├─ <other-domain>/        # 다른 담당 Feature Domain
│     └─ common/                # 최소 공통 Backend 요소
│
├─ database/
│  ├─ migrations/
│  └─ seed/
│
├─ docs/
│  ├─ architecture/
│  ├─ api/
│  ├─ design/
│  ├─ specs/
│  └─ adr/
│
├─ references/
│
├─ e2e/
│
└─ scripts/
```

---

# 29. Architecture Source References

Architecture 관련 문서 역할:

```text
docs/architecture/overview.md
→ 전체 시스템 구조

docs/architecture/integration-boundary.md
→ 기존 LearnersHigh ↔ Extension 연결

docs/architecture/shared-conventions.md
→ Naming / ID / Date / Status 등 공통 규약

docs/api/api-contract.md
→ Frontend ↔ Backend 통신 계약

docs/specs/<owner>/domain.md
→ Entity / State / Data Propagation

docs/specs/<owner>/features/*.md
→ 실제 Feature Behavior

docs/adr/
→ 중요한 설계 결정과 이유
```

---

# 30. Non-goals of This Document

이 문서는 다음을 직접 정의하지 않는다.

```text
- 각 화면의 모든 버튼 동작
- 모든 Entity Field
- 모든 API Request / Response
- DB Table 전체 Schema
- TDS Component 세부 디자인
- 각 Feature의 Acceptance Criteria
- 담당자 세부 작업 현황
```

각 내용은 해당 Source of Truth 문서를 사용한다.

---

# 31. Initial Architecture Decisions

현재 Architecture에서 기본 전제로 두는 내용:

```text
1. 기존 LearnersHigh 전체를 재구현하지 않는다.
2. Extension은 Student / Admin / Mentor Surface를 가진다.
3. Frontend는 Surface별로 분리한다.
4. Backend는 Domain 기준으로 구성한다. 각 Domain 내부는 Layered MVC를 사용한다. (ADR-0005)
5. 사람 이름 또는 ext 기준 패키지를 만들지 않는다.
6. MySQL Schema 변경은 Migration으로 관리한다.
7. Frontend ↔ Backend 계약은 api-contract.md를 따른다.
8. 여러 화면이 사용하는 데이터는 Shared Entity Identity를 유지한다.
9. Dashboard 값은 가능한 한 Shared Entity에서 계산한다.
10. 신규 Visual은 TDS + Claude Design Mockup을 기준으로 한다.
11. 기존 화면은 Existing Context / IA / Interaction Reference로 사용한다.
12. Architecture 수준의 중요한 변경은 ADR로 기록한다.
```

이 전제 중 변경이 필요한 항목은
조용히 문서만 수정하지 않고 ADR 대상인지 먼저 검토한다.

---

# 32. Architecture Checklist

새로운 Feature를 설계할 때 다음을 확인한다.

```text
[ ] 어떤 Surface가 사용하는가?
[ ] 기존 LearnersHigh 기능과 중복되지 않는가?
[ ] 어느 Domain이 책임지는가?
[ ] 새로운 Entity가 정말 필요한가?
[ ] Shared Entity를 재사용할 수 있는가?
[ ] 다른 Surface에 어떤 상태 변화가 전파되는가?
[ ] API Contract가 필요한가?
[ ] Database 변경이 필요한가?
[ ] 개인정보 공개 경계는 무엇인가?
[ ] Loading / Empty / Error 상태가 필요한가?
[ ] E2E로 검증해야 하는 Cross-Surface Flow인가?
[ ] Architecture Decision이 필요한 변경인가?
```

---

# 33. 핵심 요약

```text
Frontend
→ React + TypeScript / npm / Node.js 22
→ Student / Admin / Mentor Surface
→ Feature-first
→ Shared는 실제 공통 코드만

Backend
→ Spring Boot
→ Domain-oriented, Domain 내부 Layered MVC (ADR-0005)
→ mentor / school / studentmanagement / parentprogress / ...

Database
→ MySQL
→ Migration + Seed

API
→ docs/api/api-contract.md

Shared State
→ 같은 Entity / Identity 유지
→ Cross-Surface State 전파

Existing LearnersHigh
→ 재구현하지 않음
→ Integration Boundary를 통해 연결

Design
→ TDS Web Guidelines + Claude Design Mockup

Architecture 변경
→ 영향 확인
→ 필요 시 ADR
```

가장 중요한 원칙:

```text
화면마다 데이터를 따로 만들지 않는다.
사람마다 Architecture를 따로 만들지 않는다.
기존 LearnersHigh 기능을 다시 만들지 않는다.

Feature는 독립적으로 개발하되,
Entity / API / State는 시스템 전체에서 일관되게 유지한다.
```
