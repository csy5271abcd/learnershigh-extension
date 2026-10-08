## LearnersHigh Extension

기존 **LearnersHigh** 서비스 위에 신규 확장 기능을 추가하기 위한 개발 Repository다.

이 프로젝트의 목적은 기존 LearnersHigh를 새로 만드는 것이 아니라, 기존 기능과 데이터를 유지한 상태에서 다음 확장 영역을 연결하는 것이다.

```text
Existing LearnersHigh
        │
        ▼
Shared Data / Integration Boundary
        │
        ├─ Mentor Hub
        ├─ School & Admissions
        ├─ Student Management
        ├─ Parent Progress
        └─ Team Member Features
```

---

## 1. Project Goal

기존 LearnersHigh에는 이미 다음과 같은 기능이 존재한다.

```text
Study Timer / 순공 측정
Plan / 학습계획
Library
Learning History / 학습 이력
Report
Statistics
기존 수행평가
관리자 학생 / 지점 관리
Study Room 운영 기능
```

이 Repository에서는 위 기능을 편의를 위해 다시 구현하지 않는다.

신규 기능은 가능한 한 기존 데이터와 연결한다.

핵심 방향:

```text
기존 기능 재구현 X
기존 데이터 재사용 O
Shared Entity O
Surface 간 상태 연결 O
Feature / Domain 중심 구조 O
```

---

## 2. Main Extension Areas

현재 LearnersHigh Extension의 주요 확장 영역은 다음과 같다.

### Mentor Hub

학생이 Mentor의 경험과 콘텐츠를 탐색하고 활용하는 기능이다.

주요 범위:

```text
Mentor Recommendation
Mentor Profile
Plan
Routine
Story
Q&A
Record
Activity Case
Mentor My Content
Mentor Q&A Inbox
```

---

### School & Admissions

학생의 수행평가, 성장활동, Evidence, Reflection, Archive, Interview 준비 흐름을 관리한다.

주요 범위:

```text
Task 8-stage Workflow
Topic
Evidence
Version
AI Analysis
Feedback
Revision History
Growth Activity
Reflection
Archive
Connection
Interview Bridge
Final Artifact Share
```

---

### Admin Student Management

관리자가 학생 상태와 검토 업무를 관리한다.

주요 범위:

```text
Feedback Dashboard
Shared Feedback Queue
Feedback Review
Today Board
Student 360
TestResult
SchoolRecordSnapshot
Mentor Case Recommendation
Operations Dashboard
```

---

### Parent Progress

별도의 Parent App/Web을 만들지 않고,
Admin이 검토된 월간 Student Snapshot을 기반으로 Report를 생성하고 전달한다.

주요 흐름:

```text
Monthly Aggregation
→ AI Draft
→ Admin Review
→ Validation
→ Preview
→ PDF / Image
→ Delivery
```

---

## 3. Surfaces

Frontend는 다음 세 Surface를 기준으로 분리한다.

```text
Student
Admin
Mentor
```

### Student

학생 본인의 학습, 학교활동, Mentor 콘텐츠를 사용하는 화면이다.

주요 신규 Navigation:

```text
기존 Student Navigation
├─ 기존 기능
├─ Mentor
└─ School
```

---

### Admin

학생 상태와 운영 업무를 관리한다.

주요 확장 영역:

```text
Home
Student Management
School & Admissions
Feedback Queue
Activity Archive / Interview
Parent Progress
Mentor Hub
Operations
Admin Settings
```

---

### Mentor

Mentor 본인의 콘텐츠와 익명 Q&A를 관리한다.

```text
My Content
Q&A Inbox
Create
Profile
```

Mentor는 학생 관리자가 아니다.

Student의 실명, 학교, 기관, 상세 관리 데이터를 Mentor에게 노출하지 않는다.

---

## 4. Tech Stack

현재 프로젝트의 기본 기술 방향:

```text
Frontend
→ React

Backend
→ Spring Boot

Database
→ MySQL

API
→ REST-style JSON Contract

Design Reference
→ Toss Design System Mobile 원칙을 Web에 재해석
```

실제 package / build / runtime 설정은 Repository의 실제 Scaffold를 기준으로 확인한다.

README에 없는 실행 명령을 추측해서 사용하지 않는다.

---

## 5. Architecture Principles

### Existing First

기존 LearnersHigh에 이미 있는 기능은 신규 Extension에서 중복 구현하지 않는다.

예:

```text
Plan 필요
→ Existing Plan Integration

Library 필요
→ Existing Library Integration

Study Time 필요
→ Existing Study Data Integration

기존 수행평가 존재
→ 같은 Task를 별도 Extension Task로 중복 생성하지 않음
```

---

### One Entity, Many Views

같은 Business Entity는 Surface마다 따로 만들지 않는다.

```text
Task
├─ Student View
├─ Admin View
└─ Parent Report View
```

화면별 View Model은 달라도
Domain Identity와 Business State는 공유한다.

---

### Contract Before Code

Frontend와 Backend는 각자 JSON Shape을 만들지 않는다.

기본 순서:

```text
Requirement
→ Domain
→ API Contract
→ Backend
→ Frontend
→ Test
```

---

### Do Not Guess

다음은 문서나 실제 시스템 확인 없이 추측하지 않는다.

```text
Existing LearnersHigh API
Existing DB Schema
Authentication 방식
PK Type
미정 Enum
미정 Status
Storage Provider
External Delivery Provider
```

---

## 6. Repository Structure

목표 Repository 구조:

```text
learnershigh-extension
│
├─ AGENTS.md                    # 모든 AI Agent 공통 진입점
├─ ARCHITECTURE.md              # 구조 지도 (상세: docs/architecture/)
├─ CLAUDE.md
├─ README.md
├─ .gitignore
│
├─ .claude/
│  ├─ settings.json
│  ├─ settings.local.json        # local only / gitignore
│  └─ rules/
│     ├─ common.md
│     ├─ frontend-student.md
│     ├─ frontend-admin.md
│     ├─ frontend-mentor.md
│     ├─ backend.md
│     ├─ database.md
│     └─ testing.md
│
├─ docs/
│  ├─ SOURCE_OF_TRUTH.md
│  ├─ OWNERSHIP.md
│  │
│  ├─ product/
│  │  └─ existing-runners-high-analysis.md
│  │
│  ├─ architecture/
│  │  ├─ overview.md
│  │  ├─ integration-boundary.md
│  │  └─ shared-conventions.md
│  │
│  ├─ design/
│  │  └─ tds-web-guidelines.md
│  │
│  ├─ api/
│  │  └─ api-contract.md
│  │
│  ├─ specs/
│  │  ├─ suyeon/
│  │  │  ├─ README.md
│  │  │  ├─ domain.md
│  │  │  ├─ progress.md
│  │  │  └─ features/
│  │  │     ├─ mentor-hub.md
│  │  │     ├─ school-admissions.md
│  │  │     ├─ student-management.md
│  │  │     └─ parent-progress.md
│  │  │
│  │  └─ wangyu/
│  │     ├─ README.md
│  │     ├─ domain.md
│  │     ├─ progress.md
│  │     └─ features/
│  │
│  ├─ adr/
│  │  ├─ README.md
│  │  ├─ 0001-separate-student-admin-mentor-surfaces.md
│  │  ├─ 0002-existing-learnershigh-integration-boundary.md
│  │  ├─ 0003-shared-feedback-queue.md
│  │  └─ 0004-parent-report-without-parent-app.md
│  │
│  └─ source/
│     └─ archive/
│
├─ references/
│  ├─ existing-runners-high/
│  │  ├─ source/
│  │  └─ screens/
│  │     ├─ student/
│  │     └─ admin/
│  │
│  └─ claude-design-mockup/
│     ├─ MentorHub/
│     ├─ School&Admissions/
│     └─ AdminStudentManagement/
│
├─ frontend/
│  ├─ student/
│  │  └─ src/features/
│  │     ├─ mentor-hub/
│  │     └─ school-admissions/
│  │
│  ├─ admin/
│  │  └─ src/features/
│  │     ├─ feedback/
│  │     ├─ student-management/
│  │     └─ parent-progress/
│  │
│  ├─ mentor/
│  │  └─ src/features/
│  │     ├─ content/
│  │     ├─ qna/
│  │     └─ profile/
│  │
│  └─ shared/
│     ├─ ui/
│     ├─ theme/
│     ├─ api/
│     ├─ types/
│     └─ utils/
│
├─ backend/
│  └─ src/main/java/.../
│     ├─ mentor/
│     ├─ school/
│     ├─ studentmanagement/
│     ├─ parentprogress/
│     └─ common/
│
├─ database/
│  ├─ migrations/
│  └─ seed/
│
├─ e2e/
│
├─ scripts/
│  ├─ verify.ps1
│  ├─ verify-frontend.ps1
│  └─ verify-backend.ps1
│
└─ .github/
   ├─ CODEOWNERS
   ├─ pull_request_template.md
   └─ workflows/
      └─ ci.yml
```

일부 폴더/파일은 현재 Harness 구성 단계에서 아직 생성 전일 수 있다.

현재 상태는 `docs/specs/suyeon/progress.md`를 확인한다.

---

## 7. Documents to Read First

개발 전 최소 읽기 순서:

```text
1. CLAUDE.md
2. docs/SOURCE_OF_TRUTH.md
3. docs/OWNERSHIP.md
4. 관련 Feature Spec
5. 관련 domain.md
6. docs/api/api-contract.md
```

기존 LearnersHigh 연결 작업:

```text
+ docs/architecture/integration-boundary.md
+ docs/product/existing-runners-high-analysis.md
+ references/existing-runners-high/screens/
```

신규 UI 작업:

```text
+ docs/design/tds-web-guidelines.md
+ references/claude-design-mockup/
```

Architecture 변경:

```text
+ docs/architecture/overview.md
+ docs/architecture/shared-conventions.md
+ 관련 docs/adr/
```

---

## 8. Source of Truth

문서 간 역할을 분리한다.

| Concern | Source |
|---|---|
| Scope / Ownership | `CLAUDE.md`, `docs/OWNERSHIP.md` |
| Feature Behavior | `docs/specs/<owner>/features/*.md` |
| Entity / State | `docs/specs/<owner>/domain.md` |
| API | `docs/api/api-contract.md` |
| Architecture | `docs/architecture/` |
| Shared Naming / Date / Error | `docs/architecture/shared-conventions.md` |
| New Visual Principle | `docs/design/tds-web-guidelines.md` |
| New Layout | `references/claude-design-mockup/` |
| Existing Product Context | `docs/product/existing-runners-high-analysis.md` |
| Architecture Decision | `docs/adr/` |

충돌이 해결되지 않으면 구현하지 않고 먼저 보고한다.

---

## 9. Ownership

Source Code는 사람 이름이 아니라 Feature / Domain 기준으로 구성한다.

금지:

```text
frontend/**/suyeon/
frontend/**/wangyu/
backend/**/suyeon/
backend/**/wangyu/
backend/**/ext/
```

담당자 구분은:

```text
docs/OWNERSHIP.md
```

를 따른다.

---

## 10. Counseling Boundary

상담 관련 기능 전체는 Wangyu 담당 영역이다.

Suyeon 영역에서 다음을 구현하지 않는다.

```text
Counseling Entity
Counseling API
Counseling DB Table
Counseling CRM
Student Counseling
Parent Counseling
Joint Counseling
Counseling Brief
Counseling Follow-up
Admissions Counseling
Counseling-derived Parent Report
Counseling-derived Today Board / Operations
```

필요하면 Shared Contract 또는 Integration Boundary만 정의한다.

---

## 11. Frontend Rules

Frontend는 Surface + Feature 기준으로 관리한다.

```text
frontend/student/
frontend/admin/
frontend/mentor/
frontend/shared/
```

### Student

주요 Suyeon Feature:

```text
mentor-hub
school-admissions
```

### Admin

주요 Suyeon Feature:

```text
feedback
student-management
parent-progress
```

### Mentor

주요 영역:

```text
content
qna
profile
```

### Shared

다음 조건을 만족할 때만 Shared로 올린다.

```text
2개 이상 Feature / Surface에서 실제 사용
Feature-specific Business Logic 없음
API가 충분히 안정적
```

---

## 12. Backend Rules

Backend는 Domain 중심으로 구성한다.

예:

```text
mentor/
school/
studentmanagement/
parentprogress/
common/
```

각 Domain 내부는 Layered MVC를 사용한다. (ADR-0005)

```text
controller/
service/
domain/
repository/
dto/
```

기본 의존 방향:

```text
controller
↓
service ──► common/integration (External Boundary Interface)
↓
domain / repository
```

Controller에 Business Rule을 직접 넣지 않는다.

---

## 13. API Contract

공통 API 기준:

```text
docs/api/api-contract.md
```

Actor Namespace:

```text
/api/student/**
/api/admin/**
/api/mentor/**
```

공통 표현 기준:

```text
docs/architecture/shared-conventions.md
```

예:

```text
JSON
→ camelCase

ID
→ string

Date
→ YYYY-MM-DD

DateTime
→ ISO 8601

Month
→ YYYY-MM

Pagination
→ page=0&size=20
```

---

## 14. Design

신규 Extension UI는 다음 세 기준을 조합한다.

```text
Feature Spec
+
Claude Design Mockup
+
TDS Web Guidelines
```

기존 LearnersHigh 화면은:

```text
Navigation
Context
IA
Existing Interaction
```

참고용이다.

기존 Visual Style을 신규 화면에 그대로 복제하지 않는다.

---

## 15. TDS

신규 UI는 Toss Design System Mobile의:

```text
Color
Typography
Component hierarchy
State
Feedback
Overlay
Accessibility
```

원칙을 참고한다.

단, Mobile Layout을 그대로 복사하지 않는다.

예:

```text
Bottom Sheet
→ Modal / Right Drawer / Popover

Fixed Bottom CTA
→ Action Bar / Sticky Action / Toolbar

ListRow
→ List / Table / Master-Detail
```

상세 기준:

```text
docs/design/tds-web-guidelines.md
```

---

## 16. References

### Existing LearnersHigh

```text
docs/product/existing-runners-high-analysis.md
references/existing-runners-high/
```

목적:

```text
기존 Navigation
기존 Interaction
기존 정보 구조
Integration Context
```

---

### Claude Design Mockup

```text
references/claude-design-mockup/
```

목적:

```text
신규 화면 Layout
Section 배치
Information Density
CTA 위치
Tab / Detail 구조
```

Reference 파일은 기본 Read-only다.

---

## 17. Core Domain Flow

현재 주요 School Flow:

```text
Task
→ Version
→ AI Analysis
→ Feedback
→ Revision
→ Final
→ Archive
```

후속:

```text
Archive
→ Connection
→ Interview
```

Mentor:

```text
Mentor Content
→ Student Save / Apply / Q&A
```

Parent:

```text
Shared Student Data
→ ParentReport
→ Validation
→ PDF/Image
→ Delivery
```

---

## 18. Development Workflow

기본 구현 순서:

```text
1. Requirement 확인
2. Ownership 확인
3. Domain 확인
4. Existing 기능 중복 여부 확인
5. API Contract 확인 / 변경
6. Backend Logic
7. Frontend State / API
8. Screen
9. Interaction
10. Loading / Empty / Error
11. Cross-Surface 확인
12. Test
13. Visual Polish
```

화면 Mockup부터 독립적으로 만든 뒤
나중에 데이터를 억지로 연결하는 방식을 피한다.

---

## 19. Progress

담당자별 현재 작업 상태:

```text
docs/specs/<owner>/progress.md
```

Suyeon:

```text
docs/specs/suyeon/progress.md
```

Progress 문서는 Requirement Source가 아니다.

---

## 20. Current Project Status

현재 Repository는 **Harness / Architecture / Specification Foundation 단계**다.

현재까지 준비된 주요 문서:

```text
SOURCE_OF_TRUTH
OWNERSHIP
Architecture Overview
Integration Boundary
Shared Conventions
Suyeon Domain
4 Feature Specs
API Contract
TDS Web Guidelines
ADR
CLAUDE.md
.claude/rules
.claude/settings.json
.gitignore
```

본격적인 Feature 코드 구현은
문서와 Repository 구조 검증 이후 진행한다.

---

## 21. Open Decisions

현재 일부 항목은 의도적으로 미확정 상태다.

예:

```text
ParentReport Status
Q&A reassign 의미
Topic Approval Enum
Connection Status
Archive Persistence
Mentor Record / Case Review State
Existing LearnersHigh 실제 API
Existing Authentication
File Storage
```

Claude Code 또는 개발자가 구현 편의를 위해 임의로 확정하지 않는다.

---

## 22. Setup / Run

현재 이 README는 실행 명령을 임의로 적지 않는다.

이유:

```text
Frontend 실제 package manager
Frontend package scripts
Spring Boot build tool
Database local bootstrap
Existing LearnersHigh 연결 방식
```

을 실제 Repository Scaffold에서 확인해야 하기 때문이다.

Scaffold가 확정되면 이 섹션에 다음을 추가한다.

```text
Prerequisites
Environment setup
Frontend install/run
Backend run
MySQL setup
Migration
Seed
E2E
```

확정 전에는 일반적인 `npm`, `gradlew`, `mvn` 명령을 추측해서 Source of Truth로 만들지 않는다.

---

## 23. Verification

Verification Script 목표:

```text
scripts/verify.ps1
scripts/verify-frontend.ps1
scripts/verify-backend.ps1
```

Script가 준비된 이후 완료 보고 전:

```powershell
scripts/verify.ps1
```

를 실행한다.

관련 검증이 실패하면 완료라고 보고하지 않는다.

---

## 24. Testing Principle

기능 완료 기준은 화면 존재 여부가 아니다.

```text
Requirement
+ Shared Entity
+ Interaction
+ Cross-Surface State
+ Loading / Empty / Error
+ Permission / Privacy
+ Test
```

중요 E2E 후보:

```text
Student Version
→ AI
→ Admin Feedback
→ Student Revision

Student Q&A
→ Mentor Inbox
→ Mentor Answer
→ Student Q&A

Activity
→ Feedback
→ Reflection
→ Archive

Parent Report
→ Validation
→ Generate
→ Send
```

---

## 25. ADR

중요 Architecture Decision은 `docs/adr/`에 기록한다.

현재 핵심 ADR:

```text
ADR-0001
Separate Student / Admin / Mentor Surfaces

ADR-0002
Existing LearnersHigh Integration Boundary

ADR-0003
Shared Feedback Queue

ADR-0004
Parent Report Without Parent App
```

Accepted ADR을 변경하려면
기존 문서를 조용히 덮어쓰지 않고 새 ADR에서 Supersede한다.

---

## 26. Claude Code

Claude Code는 가장 먼저:

```text
CLAUDE.md
```

를 읽는다.

세부 규칙:

```text
.claude/rules/
```

Project-shared Settings:

```text
.claude/settings.json
```

개인 설정:

```text
.claude/settings.local.json
```

`settings.local.json`은 Git에 포함하지 않는다.

---

## 27. Git / Shared Change

다음은 Shared 변경이다.

```text
API Contract
Shared Entity
frontend/shared
backend/common
Database Schema
Architecture
ADR
```

Shared 변경 전 다른 Feature/담당자 영향 범위를 확인한다.

---

## 28. Branch / PR

Branch Naming, Commit Convention, Merge Strategy는
팀에서 확정된 기준이 Repository에 추가되면 이 README에 반영한다.

현재 임의 Convention을 Source of Truth로 만들지 않는다.

PR에서는 최소한 다음을 확인하는 방향으로 운영한다.

```text
Spec 준수
Ownership 침범 여부
API 변경
DB 변경
Shared 영향
테스트 결과
Open Decision
```

---

## 29. Security / Privacy

Git에 포함하지 않는다.

```text
.env
.env.local
secrets/
private keys
keystore
local credentials
```

Mentor Surface:

```text
Student 실명
학교
기관
상세 학습관리 데이터
```

노출 금지.

Parent Output:

```text
Raw AI
Internal Feedback 원문
미확정 Record의 확정 표현
미동의 Artifact
```

노출 금지.

---

## 30. Contribution Checklist

작업 시작 전:

```text
[ ] CLAUDE.md 확인
[ ] SOURCE_OF_TRUTH 확인
[ ] OWNERSHIP 확인
[ ] 관련 Feature Spec 확인
[ ] domain.md 확인
[ ] api-contract.md 확인
[ ] Existing 기능 중복 여부 확인
```

작업 완료 전:

```text
[ ] Loading / Empty / Error 확인
[ ] Cross-Surface 영향 확인
[ ] Privacy 확인
[ ] Open Decision 임의 확정 여부 확인
[ ] 관련 Test 실행
[ ] progress.md 갱신
```

---

## 31. Do Not

```text
기존 LearnersHigh 전체 재구현
기존 기능 중복 구현
다른 담당자 Feature 임의 수정
Suyeon 영역에 Counseling 구현
Surface별 동일 Entity 복제
API Contract 없이 JSON Shape 생성
Mockup만 보고 Business Logic 생성
기존 API / DB 구조 추측
Open Decision 임의 확정
Reference 원본 수정
검증 실패 상태에서 완료 보고
```

---

## 32. Core Principle

```text
Read before coding.
Reuse before rebuilding.
Contract before implementation.
One entity, many views.
Respect ownership.
Do not guess.
Verify before completion.
```

---

## 33. Quick Links

```text
Claude Guide
→ CLAUDE.md

Source of Truth
→ docs/SOURCE_OF_TRUTH.md

Ownership
→ docs/OWNERSHIP.md

Architecture
→ docs/architecture/overview.md

Existing Integration
→ docs/architecture/integration-boundary.md

Shared Conventions
→ docs/architecture/shared-conventions.md

API
→ docs/api/api-contract.md

Design
→ docs/design/tds-web-guidelines.md

Suyeon Domain
→ docs/specs/suyeon/domain.md

Suyeon Progress
→ docs/specs/suyeon/progress.md

ADR
→ docs/adr/README.md
```
