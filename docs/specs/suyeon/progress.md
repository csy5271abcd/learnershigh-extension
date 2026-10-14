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
Current Phase: Feature Implementation 시작 (branch: feat/student-mentor-hub-home)
Implementation Phase: Scaffold merged (main 2c1ac41), Student Mentor Hub Home UI IMPLEMENTED (Fixture 기반, API 미연결)
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

Harness 문서 정비 후 **Frontend / Backend Scaffold 구축 단계**에 들어왔다. Feature 코드는 아직 없다.

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
→ React + TypeScript / npm / Node.js 22
├─ Student
├─ Admin
├─ Mentor
└─ Shared

Backend
→ Domain-oriented Spring Boot
→ Domain 내부 Layered MVC (ADR-0005 Accepted)

Database
→ MySQL + Migration + Seed

Existing LearnersHigh
→ Integration Boundary를 통해 연결
```

상태:

```text
Architecture 문서화: 완료본 생성
실제 Repository 구조 적용: Scaffold IMPLEMENTED (chore/project-scaffold, 미커밋)
Backend/Frontend Scaffold 검증: 로컬 PASS (scripts/verify.ps1 -Strict), GitHub Actions 미실행
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

ADR-0005
Backend Domain-packaged Layered MVC (Accepted)
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
IMPLEMENTED (main 98bf2f8)
```

목표:

```text
Claude Code 작업 기준 완성
Ownership / Architecture / API / Design 기준 완성
Verification Harness 준비
```

---

## Phase 0-S — Project Scaffold

상태:

```text
IMPLEMENTED (로컬 검증 PASS, GitHub Actions 결과 미확인)
```

범위:

```text
frontend/ : npm workspaces + student / admin / mentor Vite App Shell
backend/  : Spring Boot + Gradle Wrapper + ArchitectureTest (ArchUnit)
```

Feature Business Logic / Entity / API Endpoint / DB Schema는 포함하지 않는다.

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
Integration Client
```

---

## Phase 2 — School Core Flow

상태:

```text
IN_PROGRESS
School Home / Tasks 목록: IMPLEMENTED (Fixture UI, 2026-10-12, feat/student-school-home 64c55b5)
Student Task Detail (7 Tab): IMPLEMENTED (Fixture UI, 2026-10-12, feat/student-school-task-detail b807fcb)
Student Task Create (Modal Wizard): IMPLEMENTED (Fixture UI, 2026-10-12, feat/student-school-task-create 7d28a17)
Student Topic Submission: IMPLEMENTED (Fixture UI, 2026-10-12, feat/student-school-topic-submission bcec572)
Student Evidence (Task 과정 자료 Vault + School Evidence): IMPLEMENTED (Fixture UI, 2026-10-12, feat/student-school-evidence 1f4bb59)
Student Version Submit + AI 사전 점검 Result / Retry: IMPLEMENTED (Fixture UI, 2026-10-12, feat/student-school-version-ai dd98b36)
Student Feedback (피드백 Tab · 반영함 · 다음 할 일): IMPLEMENTED (Fixture UI, 2026-10-12, feat/student-school-feedback b58f93c)
Student Revision (수정본 V2 / V3 · 7단계 Loop · 수정 기록): IMPLEMENTED (Fixture UI, 2026-10-12, feat/student-school-revision 22f81c0)
Student Final Submission / Final Artifact / Parent Share Consent / Archive Projection: IMPLEMENTED (Fixture UI, 2026-10-12, feat/student-school-final-submission c1990e6)
School Archive (Archive-00, Task source): IMPLEMENTED (Fixture UI, 2026-10-12, feat/student-school-archive d5ef416)
School Activities (List · Create · Detail · Draft Edit · Evidence · Submit): IMPLEMENTED (Fixture UI, 2026-10-12, feat/student-school-activities 5f6a5e1)
Activity Mock Data (Canonical 12): IMPLEMENTED (Fixture, 2026-10-12, feat/student-school-activity-reflection d113e06)
Activity Reflection: IMPLEMENTED (Fixture UI, 2026-10-12, feat/student-school-activity-reflection d113e06)
Activity Feedback Request / Display: IMPLEMENTED (Fixture UI, 2026-10-12, feat/student-school-activity-reflection d113e06)
Growth Archive Connection: IMPLEMENTED (Fixture UI, 2026-10-12, feat/student-school-activity-reflection d113e06)
Admin Activity Feedback: NOT_STARTED
Cross-subject Connection: BOUNDARY_IMPLEMENTED (Fixture / 읽기 모델만, 2026-10-12, feat/student-school-interview, 미커밋) — Admin Connection Review NOT_STARTED
Interview Bridge (Student): IMPLEMENTED (Fixture UI, 2026-10-12, feat/student-school-interview, 미커밋)
Admin Interview Management: NOT_STARTED
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
IN_PROGRESS
- Student Mentor Hub Home: IMPLEMENTED (Fixture UI, 2026-10-10, feat/student-mentor-hub-home 80ea540)
  - API 연결 / Case·Content Detail 연결 / Frontend 자동 Test: NOT_STARTED
- Student Mentor Profile: IMPLEMENTED (Fixture UI, 2026-10-10, feat/student-mentor-profile 4b31225)
  - Home ↔ Profile Route, Back 후 Tab / Scroll 복원 브라우저 확인
  - API 연결 / Follow·질문하기·Content 열기 대상 화면 / Frontend 자동 Test: NOT_STARTED
- Student Mentor List: IMPLEMENTED (Fixture UI, 2026-10-10, feat/student-mentor-list e5b2b4d)
  - "멘토" Tab → List, Search / 전형 / 학과 Filter, List → Profile → Back 시 Filter / Scroll 복원 브라우저 확인
  - API 연결 / Pagination UI / Frontend 자동 Test: NOT_STARTED
- Student Mentor Plan Detail: IMPLEMENTED (Fixture UI, 2026-10-10, feat/student-mentor-plan 65a1a4e)
  - Main "Plan" Tab 목록 → Detail, Home / Profile Plan Content → Detail, 1~4주차 Tab, Back 시 이전 화면 / Scroll / 선택 주차 복원 브라우저 확인
  - API 연결 / Frontend 자동 Test: NOT_STARTED
- Student Mentor Plan Apply: IMPLEMENTED (Fixture UI, 2026-10-11, feat/student-mentor-plan-apply b21be2d)
  - 시작일 → 항목 선택 → 교재 연결 → 충돌 확인·수정 → 추가 Modal Route, 실패 → 다시 시도, 닫기 / Back 복귀 브라우저 확인
  - 실제 Student Plan Write / Existing Plan · Library 연동 / API 연결 / Frontend 자동 Test: NOT_STARTED
- Student Mentor Routine: IMPLEMENTED (Fixture UI, 2026-10-11, feat/student-mentor-routine f20ee24)
  - Main "Routine" Tab 목록 → Detail(Timeline / Habit), Home / Profile Routine → Detail, 전체 적용 / 습관만 적용 Modal(충돌 · 해결 · 실패 → 다시 시도) 브라우저 확인
  - 실제 Existing Plan / Schedule Write / API 연결 / Frontend 자동 Test: NOT_STARTED
- Student Mentor Story Feed / Detail: IMPLEMENTED (Fixture UI, 2026-10-11, feat/student-mentor-story dfa9b0b)
  - Main "Story" Tab Feed + 주제 Filter(?topic=), Feed → Detail → Back 시 주제 / Scroll 복원, Home / Profile Story → Detail, 저장 / 취소(Feed · Detail 동기화) 브라우저 확인
  - 저장 API / API 연결 / Frontend 자동 Test: NOT_STARTED (관련 질문은 Student Q&A 질문 작성으로 연결됨)
- Student Q&A: IMPLEMENTED (Fixture UI, 2026-10-11, feat/student-mentor-qna 2ebaf44)
  - Main "Q&A" Tab(모든 질문 / 내 질문 / Category), Detail(답변 대기 / 답변 완료 / 답변 지연), 질문 작성(Profile 질문하기 / Story 관련 질문), 재배정 Action 브라우저 확인
  - 실제 Question API / Mentor 답변 연동(Mentor Q&A Inbox) / 재배정 Domain 확정(OD-02) / Frontend 자동 Test: NOT_STARTED
- Student Mentor Record List / Detail: IMPLEMENTED (Fixture UI, 2026-10-11, feat/student-mentor-record 689028d)
  - Main "Record" Tab 목록(검색 / 학년 / 영역, URL 유지), Detail(검수 표시 · 기록 · 연결 활동 · 관련 콘텐츠), Home / Profile / Q&A → Record 브라우저 확인
  - 실제 Record API / PII 검수 Backend / Admin Review / Frontend 자동 Test: NOT_STARTED
- Student Mentor Activity Case List / Detail: IMPLEMENTED (Fixture UI, 2026-10-11, feat/student-mentor-case 83b1504)
  - Main "Case" Tab 목록(24개, 검색 URL 유지), Detail(기본정보 · 과정 자료 · Case별 단계 · Reflection · 후속 활동 · 관련 콘텐츠), 단계 URL(?stage=) 유지, Home Admin 추천 / Mixed · Profile · Record · Q&A → Case 브라우저 확인
  - 내 Task에 참고 연결: Dialog만 구현, 저장 없음 (Student 연결 API Contract Gap, Task.relatedMentorCaseIds 변경 없음)
  - 과정 자료 / 결과물 미리보기 + 원본 다운로드: role과 무관하게 preview가 있으면 미리보기(Slide / 문서 Page / 표), original이 있으면 다운로드. 항생제 Case 과정 자료 4개(XLSX / HWP / PDF / HWP) + 최종본 PPTX 모두 미리보기 + 다운로드 (원본은 개발 검증용 Sample), Record에는 연결하지 않음
  - 실제 Case API / PII 검수 Backend / File Storage · File API / Task 참고 연결 저장 / Frontend 자동 Test: NOT_STARTED
- Student Mentor Hub 8 Tab 통합: IMPLEMENTED (feat/student-mentor-case → feat/student-mentor-hub-home fast-forward, 83b1504, main 미병합)
- Student School Home / Tasks 목록: IMPLEMENTED (Fixture UI, 2026-10-12, feat/student-school-home 64c55b5)
  - Row → Task Detail 연결 (feat/student-school-task-detail)
- Student Task Detail: IMPLEMENTED (Fixture UI, 2026-10-12, feat/student-school-task-detail b807fcb)
  - 실제 Task / Evidence / Version / Feedback / Revision API, Topic Submission, Evidence Vault, AI Result · Retry, 파일 업로드 · 미리보기, Frontend 자동 Test: NOT_STARTED
- Student Task Create (Tasks 위 4단계 Modal Wizard): IMPLEMENTED (Fixture UI, 2026-10-12, feat/student-school-task-create 7d28a17)
  - 실제 POST /api/student/tasks / File Storage(안내문 파일) / 기존 Performance Task 연결(OD-07) / Frontend 자동 Test: NOT_STARTED
- Student Topic Submission (Task Detail 위 Modal): IMPLEMENTED (Fixture UI, 2026-10-12, feat/student-school-topic-submission bcec572)
  - 실제 PUT /api/student/tasks/{taskId}/topic / Admin Topic Review / topicApprovalStatus Enum(OD-03) / Frontend 자동 Test: NOT_STARTED
- Student Evidence (Task Detail 과정 자료 Tab + /school/evidence): IMPLEMENTED (Fixture UI, 2026-10-12, feat/student-school-evidence 1f4bb59)
  - 실제 GET / POST / DELETE /api/student/tasks/{taskId}/evidence / File Storage(OD-09) / stageTag Enum / Frontend 자동 Test: NOT_STARTED
- Student Version Submit + AI 사전 점검 Result / Retry (Task Detail 위 Modal + 지금 할 일 / 피드백 / 수정 기록 Tab): IMPLEMENTED (Fixture UI, 2026-10-12, feat/student-school-version-ai dd98b36)
  - 실제 Version API / AI Analysis / Shared Feedback Queue · Admin Review / File Storage / Frontend 자동 Test: NOT_STARTED
- Student Feedback (Task Detail 피드백 Tab, 선생님 Primary · AI Secondary · 반영함): IMPLEMENTED (Fixture UI, 2026-10-12, feat/student-school-feedback b58f93c)
  - 실제 GET …/feedback / 반영 저장 Endpoint / Admin Feedback Review · Queue / Frontend 자동 Test: NOT_STARTED
- Student Revision (지금 할 일 수정본 제출 · 7단계 Revision Loop · 수정 기록 Tab): IMPLEMENTED (Fixture UI, 2026-10-12, feat/student-school-revision 22f81c0)
  - 실제 Version / Revision History API / Diff Schema / Admin Re-review / Frontend 자동 Test: NOT_STARTED
- Student Final Submission (최종 제출 확인 · 8단계 · 최종 결과물 · 학부모 공유 동의 · Archive Projection): IMPLEMENTED (Fixture UI, 2026-10-12, feat/student-school-final-submission c1990e6)
  - 실제 최종 제출 API(Contract 없음) / GET · PUT final-artifact / Admin Report 첨부 / Frontend 자동 Test: NOT_STARTED
- School Archive (/school/archive, Task + Growth source): IMPLEMENTED (Fixture UI, 2026-10-12, feat/student-school-archive d5ef416 + Growth 연결 feat/student-school-activity-reflection 미커밋)
  - 실제 GET /api/student/archive / Archive Persistence(API-OD-05) / Frontend 자동 Test: NOT_STARTED
- School Activities (/school/activities, /school/activities/:activityId): IMPLEMENTED (Fixture UI, 2026-10-12, feat/student-school-activities 5f6a5e1)
- Activity Reflection · Feedback Request / Display · Archive Command · Growth Archive 연결: IMPLEMENTED (Fixture UI, 2026-10-12, feat/student-school-activity-reflection d113e06)
  - 실제 Activity API(§17-1 ~ 17-4) / Admin Activity Feedback / Frontend 자동 Test: NOT_STARTED
- Cross-subject Connection: BOUNDARY_IMPLEMENTED (Canonical Fixture + 확정 Connection 읽기만, feat/student-school-interview, 미커밋)
  - Admin Connection Review / 실제 AI 후보 생성 / Connection API: NOT_STARTED
- Interview Bridge (/school/interview, /school/interview/:questionId): IMPLEMENTED (Fixture UI, 2026-10-12, feat/student-school-interview, 미커밋)
  - 실제 Interview API(§19) / Admin Interview Management(AI Draft · 추가 · 편집 · 삭제 · Publish) / Frontend 자동 Test: NOT_STARTED
- Mentor Surface (My Content · Content Detail / Edit · Create · Preview · Review Pending · Q&A Inbox / Detail / Answer · Profile / Edit): IMPLEMENTED (Fixture Adapter, 2026-10-14, feat/mentor-surface)
  - Browser Flow 19개 PASS (Headless Chrome)
  - 실제 /api/mentor/** Backend / 인증(OD-10) / Record·Case Review State(OD-05) / Student Q&A 실제 반영 / Frontend 자동 Test: NOT_STARTED
- 그 외 화면: NOT_STARTED
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

Scaffold 기준 로컬 검증 결과다. (2026-10-09, chore/project-scaffold)

현재 Verification 상태:

```text
Frontend typecheck: PASS (student / admin / mentor)
Frontend lint: PASS (oxlint --deny-warnings)
Frontend test: N/A (Test Framework 미선택)
Frontend build: PASS (student / admin / mentor)

Backend compile: PASS (gradlew classes)
Backend test: PASS (ArchUnit 21 tests, DB / Docker 불필요)
Backend integrationTest: PASS (ApplicationContextTest 1, Testcontainers mysql:8.4 + Flyway, ADR-0006)
Local MySQL (docker compose up -d): PASS (mysql 8.4.11 healthy)
Backend runtime: NOT_RUN (DB_URL / DB_USERNAME / DB_PASSWORD 미설정 시 DataSource 생성 실패 확인)

DB migration: Flyway 적용 확인 (Migration 파일 0개, pending 0)
E2E: NOT_RUN

Markdown link validation: PASS (2026-10-09 Harness 작업)
GitHub Actions CI: NOT_RUN (Push 전)
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

## 2026-10-09 — Architecture / Harness 문서 정합성

### Done

- ADR-0005 Proposed → Accepted, 참조 문서 Status 표기 통일
- PR Template Backend 체크 항목을 Layered MVC 용어로 변경
- 확정 기술(React / TypeScript / npm / Node.js 22, Spring Boot / MySQL)과 미확정 항목 구분 반영
- `docs/specs/wangyu/` 미생성 상태를 SOURCE_OF_TRUTH / OWNERSHIP / overview에 명시

### Verification

```text
scripts/verify.ps1 (non-strict): PASS
  - Harness file / directory convention / settings.local tracking: PASS
  - Frontend / Backend: Scaffold 없음으로 SKIP
Markdown link validation: NOT_RUN
```

## 2026-10-09 — Harness 잔여 정합성 (npm-only / Integration Naming)

### Done

- `scripts/verify-frontend.ps1`, `.github/workflows/ci.yml`: npm only, pnpm / yarn / bun Lockfile 실패 처리, CI Node.js major 22
- `integration-boundary.md`: `ExistingXxxClient` / `RealExistingXxxClient` / `MockExistingXxxClient` Naming, 위치 `common/integration/learnershigh/` 고정
- File Storage / Delivery / AI Interface Package 위치는 미확정으로 명시

### Verification

```text
scripts/verify.ps1 (non-strict): PASS (Frontend / Backend Scaffold 없음으로 SKIP)
verify-frontend.ps1 npm-only 시나리오 11개 (scratch fixture): 기대대로 동작
Markdown link validation: PASS (Markdown Link 14개, broken 0)
Inline code path 점검: reward-dashboard.png 1건 누락 (보고만, 미수정)
```

## 2026-10-09 — Docker MySQL / Flyway / Testcontainers (ADR-0006, Proposed)

### Done

- `docker-compose.yml`(mysql:8.4), `.env.example`
- Backend: Flyway(`database/migrations/` → `classpath:db/migration`), Testcontainers MySQL, `integrationTest` Gradle Task(`@Tag("integration")`)
- `ApplicationContextTest`: 실제 MySQL에서 Context + Flyway 검증
- `scripts/verify-backend.ps1`: Docker가 있으면 integrationTest 실행, `-Strict`에서 Docker 없으면 실패
- CI Backend Job: `windows-latest` → `ubuntu-latest`
- 문서: ADR-0006, ARCHITECTURE / CLAUDE / AGENTS / README / overview / backend · database rule

### Verification

```text
./gradlew clean build integrationTest: PASS (test 21, integrationTest 1)
docker compose config / up: PASS (mysql 8.4.11 healthy)
scripts/verify-backend.ps1: NOT_RUN (작업 환경에 pwsh 없음)
GitHub Actions: NOT_RUN (Push 전)
```

### Not Decided

- Seed 적용 방식, E2E 도구, 시연 / 배포 환경

## 2026-10-09 — Project Scaffold (branch: chore/project-scaffold)

### Done

- Frontend: npm workspaces(`frontend/package.json`, `package-lock.json` 1개) + student / admin / mentor Vite App Shell
  - React 19.3.0, TypeScript 6.0.3, Vite 8.3.4, oxlint 1.87.0, Node.js 22 (`engines ^22.12.0`)
- Backend: Spring Boot 4.1.1, Java 21 toolchain, Gradle 9.7.1 Wrapper (Kotlin DSL), base package `com.learnershigh.extension`
  - Dependency: webmvc / validation / data-jpa / mysql-connector-j
  - Test: Spring Boot Test Starter(JUnit Jupiter / AssertJ / Mockito / MockMvc) + ArchUnit 1.5.1 (ADR-0005 / ADR-0002 의존 규칙)
- `scripts/verify-backend.ps1`, CI: Gradle Wrapper only, Maven 산출물 실패 처리, CI Java 21
- 문서: 확정 기술 / 남은 Open Decision 반영
- `reward-dashboard.png`는 main 98bf2f8에서 추가되어 이전 누락 보고는 해소됨

### Not Started

- Feature Business Logic / Entity / API Endpoint / DB Schema / Migration
- `frontend/shared/`, `database/`, `e2e/` (실제로 필요해질 때 생성)
- `common/error` GlobalExceptionHandler (500 Error Code / Validation reason 어휘가 Contract에 없음)

### Verification

```text
node --version: v22.22.2 / npm --version: 10.9.7
npm install → npm ci 재현: PASS
npm run typecheck / lint / build (3 Surface): PASS
dev server 3개 (5173 / 5174 / 5175) 응답 확인: PASS
backend gradlew.bat --version: Gradle 9.7.1 (Launcher JVM 17), toolchain JDK 21
backend gradlew.bat classes / clean test / build: PASS (tests 21, failures 0)
backend bootJar 실행: DB 환경 변수 미설정으로 DataSource 생성 실패 (예상 동작, 가짜 Credential 미사용)
scripts/verify.ps1 -Strict: PASS
git diff --check: PASS
GitHub Actions: NOT_RUN
```

## 2026-10-10 — Student Mentor Hub Home (branch: feat/student-mentor-hub-home)

### Status

```text
Student Mentor Hub Home: IMPLEMENTED (Fixture 기반 UI, 미커밋)
VERIFIED 아님: API 미연결, Frontend 자동 Test Framework 미선택
```

### Done

- `frontend/student/src/features/mentor-hub/`: 추천 Home (Main Tab, 추천 Mentor 3, 다른 Mentor 6, Admin 추천 Case, Mixed Recommendation)
- Loading(Skeleton) / Empty(Section별) / Error(다시 시도) 상태, `?fixture=loading|empty|error` (개발 모드)
- `frontend/student/src/index.css`: Student Surface Token (Light / Dark)
- 신규 Dependency 없음 (CSS Modules)

### Not Started

- Mentor List / Profile / Plan / Routine / Story / Q&A / Record / Case 화면, Router, API 연결
- Mockup의 검색창, 도움돼요 / 저장 수치 (Feature Spec / Domain 정의 없음)

### Verification

```text
student typecheck / lint / build: PASS, admin / mentor build: PASS
scripts/verify-frontend.ps1 -Strict: PASS
Headless Chrome (CDP) 1920 / 1280 / 768 / 390 / 320: 가로 Overflow 없음, Dark Theme 확인
Keyboard: Tab Focus 순서, Tab Arrow / Home / End, focus-visible, Console Error 없음
Frontend automated component test: NOT_RUN (Framework not yet selected)
```

## 2026-10-10 — Student Mentor Profile (branch: feat/student-mentor-profile)

### Status

```text
Student Mentor Profile: IMPLEMENTED (Fixture 기반 UI, 미커밋)
VERIFIED 아님: API 미연결, Frontend 자동 Test Framework 미선택
```

### Done

- Router 결정: react-router 7.18.4 (Data Router + ScrollRestoration), Student App에만 추가
- 개발 Route: `/mentor`, `/mentor/mentors/:mentorId` (기존 LearnersHigh URL 아님)
- Profile: 인증 / 대학·학과 / 전형 / 고교 Context / 성적 Summary / 대표 경험 / Content Tab, Follow(Local State), 질문하기·Content 열기(Action Boundary)
- Home ↔ Profile 이동, Back 후 Main Tab(?tab=) / Scroll 복원, Profile Content Tab(?content=) 유지
- Mentor Identity / Profile Image는 Home Fixture 객체 재사용

### Not Started

- Mentor List, Plan / Routine / Story / Q&A / Record / Case Detail, 질문 작성, Follow API

### Verification

```text
student typecheck / lint / build: PASS, admin / mentor build: PASS
scripts/verify.ps1 -Strict: PASS
Headless Chrome (CDP): Home → Profile → Back Scroll / Tab 복원, Follow, Content Tab, Not Found / Error / Loading 확인
1920 / 1280 / 768 / 390 / 320: 가로 Overflow 없음
Frontend automated component test: NOT_RUN (Framework not yet selected)
```

## 2026-10-10 — Student Mentor List (branch: feat/student-mentor-list)

### Status

```text
Student Mentor List: IMPLEMENTED (Fixture 기반 UI, e5b2b4d)
VERIFIED 아님: API 미연결, Frontend 자동 Test Framework 미선택
```

### Done

- Route `/mentor/mentors` (Profile `/mentor/mentors/:mentorId`의 상위), Home "멘토" Tab 연결
- Search(query) / 전형(admissionType) / 학과(major) Filter, URL Search Params로 새로고침 · Back · Profile 왕복 후 유지
- Canonical Mentor Fixture를 `mentors.fixture.ts`로 분리 (Home / List / Profile 공유), Mentor 9명 추가 (총 20명)
- Main Tab manual activation (화살표 = Focus, Enter / Space = 화면 이동) + 이동 후 Focus 복원

### Not Started

- Pagination UI (Data Boundary는 page / size 지원), Plan / Routine / Story / Q&A / Record / Case 화면

### Verification

```text
student typecheck / lint / build: PASS, admin / mentor build: PASS
scripts/verify.ps1 -Strict: PASS, git diff --check: PASS
Headless Chrome (CDP): Flow A~H, List → Profile → Back Filter / Scroll 복원, Home / Profile 회귀 확인
1920 / 1280 / 768 / 390 / 320: 가로 Overflow 없음
Frontend automated component test: NOT_RUN (Framework not yet selected)
```

---

## 2026-10-10 — Student Mentor Plan Detail (branch: feat/student-mentor-plan)

### Status

```text
Student Mentor Plan Detail: IMPLEMENTED (Fixture 기반 UI, 65a1a4e)
VERIFIED 아님: API 미연결, Frontend 자동 Test Framework 미선택
```

### Done

- Route `/mentor/plans` (Main "Plan" Tab, Plan-00) / `/mentor/plans/:contentId` (Plan Detail, Plan-01)
- Home Mixed Content · 추천 Mentor 관련 Content · Profile Content의 Plan → 해당 contentId Detail
- 1~N주차 Tab(URL `?week=`), 요일 / 할 일 / 과목 / Memo, Loading / Error / Not Found / 주차 Empty
- 작성 Mentor는 Canonical Mentor 참조, Plan Item에 고정 itemId (Apply의 selectedItemIds 대상)
- "내 계획에 적용" CTA: Apply Flow 진입 Callback Boundary만 준비 (연결 전 안내 문구)

### Not Started

- 저장 수 표시, Routine / Story / Q&A / Record / Case 화면

### Verification

```text
student typecheck / lint / build: PASS, admin / mentor build: PASS
scripts/verify.ps1 -Strict: PASS, git diff --check: PASS
Headless Chrome (CDP): Plan Flow A~H, Home / Mentor List / Profile 회귀 확인
1920 / 1280 / 768 / 390 / 320: 가로 Overflow 없음
Frontend automated component test: NOT_RUN (Framework not yet selected)
```

---

## 2026-10-11 — Student Mentor Plan Apply (branch: feat/student-mentor-plan-apply)

### Status

```text
Student Mentor Plan Apply: IMPLEMENTED (Fixture 기반 UI, b21be2d)
VERIFIED 아님: 실제 Student Plan Write / Existing Plan · Library API 미연결, Frontend 자동 Test Framework 미선택
```

### Done

- Route `/mentor/plans/:contentId/apply?week=&step=` (Plan Detail 하위 Route, Native dialog Modal)
- 시작일(startDate) → 항목 선택(selectedItemIds, 기존 itemId) → 교재 연결(libraryMappings, 선택 사항) → 충돌 확인·수정(옮기기 / 이번 항목 빼기) → 추가
- 기존 일정 / Library / Preview / Apply 결과는 Frontend Fixture (기존 LearnersHigh Schema 아님), 실패 → 다시 시도, 중복 클릭 방지
- 출처(Mentor Plan) / Snapshot 안내 표시, 닫기 · ESC · 브라우저 Back으로 Plan Detail 복귀

### Not Started

- 실제 Student WeeklyPlan Write, Existing Plan / Library Integration (OD-08), Backend / DB

### Verification

```text
student typecheck / lint / build: PASS, admin / mentor build: PASS
scripts/verify.ps1 -Strict: PASS, git diff --check: PASS
Headless Chrome (CDP): Apply Flow A~K, Plan / Home / Mentor List / Profile 회귀 확인
1920 / 1280 / 768 / 390 / 320: Modal 화면 안, Footer 항상 표시, 가로 Overflow 없음
Frontend automated component test: NOT_RUN (Framework not yet selected)
```

---

## 2026-10-11 — Student Mentor Routine (branch: feat/student-mentor-routine)

### Status

```text
Student Mentor Routine: IMPLEMENTED (Fixture 기반 UI, f20ee24)
VERIFIED 아님: 실제 Existing Plan / Schedule Write · API 미연결, Frontend 자동 Test Framework 미선택
```

### Done

- Route `/mentor/routines` (Routine-00), `/mentor/routines/:contentId` (Routine-01), `/mentor/routines/:contentId/apply?mode=all|habits` (Routine-02 Modal)
- Routine Detail: Timeline(시간 · 할 일 · 기존 일정 겹침 안내) + Habit 선택(URL `?habits=`, Profile 왕복 / 취소 / 새로고침 후 유지)
- 전체 적용 = Timeline 전체, 습관만 적용 = selectedHabitIds (사용자 확인: Routine-02 Mockup 기준)
- 충돌 해결: 겹치는 요일만 빼기(기본) / 그래도 추가 (Routine-02 Mockup), 실패 → 다시 시도, 중복 클릭 방지
- Canonical Mentor 이수빈(21번째) 추가, Routine 6개, 기존 일정 Fixture를 Plan Apply와 공유
- Plan / Routine 공통: 적용 Modal Shell(ApplyDialog), 목록 화면(MentorContentListPage), Detail 불러오기 Hook(useContentDetail)

### Not Started

- 실제 Existing Plan / Schedule Write, Routine Apply Contract 상세(충돌 / 해결 / 결과 Shape), Story / Q&A / Record / Case

### Verification

```text
student typecheck / lint / build: PASS, admin / mentor build: PASS
scripts/verify.ps1 -Strict: PASS, git diff --check: PASS
Headless Chrome (CDP): Routine Flow A~J, Plan Apply / Plan / Home / Mentor List / Profile 회귀 확인
1920 / 1280 / 768 / 390 / 320: Routine 목록 · Detail · 적용 Modal 가로 Overflow 없음, Footer 항상 표시
Frontend automated component test: NOT_RUN (Framework not yet selected)
```

---

## 2026-10-11 — Student Mentor Story (branch: feat/student-mentor-story)

### Status

```text
Student Mentor Story Feed / Detail: IMPLEMENTED (Fixture 기반 UI, dfa9b0b)
VERIFIED 아님: 저장 API / Q&A 미연결, Frontend 자동 Test Framework 미선택
```

### Done

- Route `/mentor/stories?topic=` (Story-00 Feed + Feature Spec 주제 Filter), `/mentor/stories/:contentId` (Story-01 / 02 Detail)
- Story 10개 (Story-00 8개 + 기존 한지수 Profile Story 2개, 기존 contentId 유지), Canonical Mentor 송지후(22번째) 추가
- 저장 / 저장 취소: Session 안 Frontend 상태(새로고침 시 초기화), Feed · Detail 동기화, 저장 수는 Mockup 표시용 Fixture 값 ±1
- 관련 질문: RelatedQuestionContext(mentorId / sourceContentId / sourceTitle / contextType) Boundary만 준비, Q&A 화면 미연결 안내
- Main Tab(UnderlineTabs): 좁은 화면에서 선택 Tab이 잘리지 않게 보이는 위치로 Scroll

### Not Started

- 저장 API(PUT .../saved), Student Q&A 작성, Story 사진 Asset, Record / Case

### Verification

```text
student typecheck / lint / build: PASS, admin / mentor build: PASS
scripts/verify.ps1 -Strict: PASS, git diff --check: PASS
Headless Chrome (CDP): Story Flow A~K, Home / Mentor List / Profile / Plan / Plan Apply / Routine 회귀 확인
1920 / 1280 / 768 / 390 / 320: Feed · Detail 가로 Overflow 없음
Frontend automated component test: NOT_RUN (Framework not yet selected)
```

---

## 2026-10-11 — Student Q&A (branch: feat/student-mentor-qna)

### Status

```text
Student Q&A: IMPLEMENTED (Fixture 기반 UI, 2ebaf44)
VERIFIED 아님: Question API / Mentor 답변 미연결, 재배정 Domain 미확정(OD-02), Frontend 자동 Test Framework 미선택
```

### Done

- Route `/mentor/questions?view=mine&category=` (StudentQ&A-00), `/mentor/questions/:questionId` (StudentQ&A-01), `/mentor/questions/new?mentorId=&sourceContentId=` (질문 작성, Mockup 없음)
- 상태는 pending / answered / overdue만 사용. reassign은 "다른 Mentor에게 재배정 요청" Action으로만 구현(Student가 Mentor를 고르지 않음, Fixture가 다음 Mentor를 돌려줌 = 정책 아님, 상태 값 유지), REASSIGNED 상태 없음
- 질문 작성: Mentor Profile 질문하기(Mentor 미리 선택), Story 관련 질문(Story Context 표시, Submit Request에는 넣지 않음), 제출 → 새 질문 Detail(답변 대기)
- 도움돼요 Toggle(Session 상태, Story 저장과 같은 Store 사용), 관련 콘텐츠 Plan / Routine / Story Detail 연결 (Record / Case는 연결 안 함)
- Home Q&A 항목 → 질문 Detail (항목 id = 질문 id)

### Not Started

- 실제 Question API, Mentor Q&A Inbox / 답변 작성, 재배정 Endpoint / 재배정 후 상태, Record / Case

### Verification

```text
student typecheck / lint / build: PASS, admin / mentor build: PASS
scripts/verify.ps1 -Strict: PASS, git diff --check: PASS
Headless Chrome (CDP): Q&A Flow A~L, Home / Mentor List / Profile / Plan / Plan Apply / Routine / Story 회귀 확인
1920 / 1280 / 768 / 390 / 320: 목록 · Detail · 질문 작성 가로 Overflow 없음
Frontend automated component test: NOT_RUN (Framework not yet selected)
```

---

## 2026-10-11 — Student Mentor Record (branch: feat/student-mentor-record)

### Status

```text
Student Mentor Record List / Detail: IMPLEMENTED (Fixture 기반 UI, 689028d)
VERIFIED 아님: Record API / PII 검수 Backend 미연결, 검수 상태 미확정(OD-05), Frontend 자동 Test Framework 미선택
```

### Done

- Route `/mentor/records?query=&grade=&area=`, `/mentor/records/:contentId` (Record 전용 Mockup 없음: Mentor Hub / Story Visual 기준)
- Record 7개: Record A~F는 기준 Source(UI Renewal / Expansion 통합본 6-4) 문장 · 학년 · 영역 · Related 그대로 + 기존 Home Record(문장 가상), Canonical Mentor 조아라(23번째, Source 5-5: 국민대 시각디자인학과 · 학생부종합) 추가
- Detail 순서: Mentor → 개인정보 제거 · 검수 완료 → 학년·학기 → 영역 → 과목·활동 → 기록 → 연결 활동 → 관련 콘텐츠 → Mentor 한마디 (복사 / 원본 / 내 기록 만들기 없음)
- 관련 콘텐츠: Story / Plan / Routine / Record 연결 (Case는 다음 Branch에서 Case Detail로 연결). Home / Profile / Q&A → Record 연결
- Student Q&A 재배정: Student의 Mentor 선택 Select 제거 → "다른 Mentor에게 재배정 요청" Action (Q&A commit 2ebaf44에 포함)

### Not Started

- 실제 Record API, PII Detection / Admin Review, 원본 생활기록부, Activity Case Detail(다음 Branch), Record 저장

### Verification

```text
student typecheck / lint / build: PASS, admin / mentor build: PASS
scripts/verify.ps1 -Strict: PASS, git diff --check: PASS
Headless Chrome (CDP): Record Flow A~M, Privacy 문자열 / 복사 · 다운로드 Control 없음 확인, Home / List / Profile / Plan / Plan Apply / Routine / Story / Q&A 회귀 확인
1920 / 1280 / 768 / 390 / 320: Record 목록 · Detail 가로 Overflow 없음
Frontend automated component test: NOT_RUN (Framework not yet selected)
```

---

## 2026-10-11 — Student Mentor Activity Case (branch: feat/student-mentor-case)

### Status

```text
Student Mentor Activity Case List / Detail: IMPLEMENTED (Fixture 기반 UI, 83b1504)
VERIFIED 아님: Case API / PII 검수 Backend 미연결, 검수 상태 미확정(OD-05), Task 참고 연결 API 없음, Frontend 자동 Test Framework 미선택
```

### Done

- Route `/mentor/cases?query=`, `/mentor/cases/:contentId?stage=` (ActivityCase-00 ~ 11 Mockup), Main Tab "Case" 연결, `/mentor?tab=case` → `/mentor/cases`
- Canonical Case 24개: 기준 Source 5-6 Activity Case Pool의 제목 / Mentor / 과목 / 주요 활동 그대로, 기존 Case id 01~03 재사용. 항생제 Case 단계 문구는 Mockup 그대로, 나머지 단계 설명은 가상
- 단계는 Case마다 활동 성격에 맞게 다름 (설문 / 토론 / 디자인 / 데이터 등). Feedback / Revision은 항생제 Case에만 있음 (V1 → Feedback → V2 강제 없음)
- 과정 자료: 미리보기(preview: slides / document / table) / 원본 다운로드(original)를 자료마다 따로 판단 (최종본 전용 조건 없음). 항생제 Case의 자료조사 XLSX(표) · V1 HWP(문서) · V1 피드백 PDF(문서) · V2 HWP(문서) · 최종본 PPTX(Slide) 모두 미리보기 + 원본 다운로드 (같은 ActivityCase-09 Dialog, 미리보기 내용 = 원본 파일 내용). 원본은 `frontend/student/assets/activity-case/antibiotic-natural-selection/`의 개발 검증용 Sample (작성자 등 개인 Metadata 제거). 다른 23개 Case는 original이 없어 "자료 정보만 볼 수 있어요"
- Record 원본 생활기록부는 계속 미리보기 / 다운로드 없음 (Activity Case 다운로드와 분리)
- Admin 추천은 Home 추천 기록에서 가져와 표시하고, Student의 Task 참고 연결과 합치지 않음
- Canonical Mentor 서예원(24번째, Source 5-5: 이화여대 음악교육과 · 학생부종합) 추가, 사진 없음(이름 첫 글자)
- Source 기준 Case 제목 수정: 항생제 내성과 자연선택 탐구 포스터 / 가공음료의 당류 함량 비교와 하루 섭취량 분석
- Profile Case Tab: Mentor마다 Case 1개 연결 (Source 5-6 Mentor 기준)

### Not Started

- 실제 Case API, PII Detection / Admin Review, File Storage Provider / File API(다운로드 URL 교체), 다른 23개 Case 과정 자료 원본, Task 참고 연결 저장(Task.relatedMentorCaseIds), Case 저장

### Open

- Canonical 24 Mentor의 고교 Context / Tag가 Source 5-5와 22명 다름 (기존 Mockup 기준 값 유지, 기준 확인 필요)

### Verification

```text
student typecheck / lint / build: PASS, admin / mentor build: PASS
scripts/verify.ps1 -Strict: PASS, git diff --check: PASS
Headless Chrome (CDP): Case Flow A~M (Tab / 검색 / 목록 Scroll 복원 / 단계 이동 · URL · Focus / 단계 + Scroll 복원 / Profile · Home · Record · Q&A → Case / Task Dialog / 상태 / 24개 Case 전 단계 Privacy)
문서 미리보기 Flow A~J: 실제 다운로드 파일 이름 · 38,339 byte, PowerPoint에서 2 Slide로 열림, 다운로드 후 Dialog 유지, 닫기 / ESC 후 Stage · Scroll · Focus 복원, Record 다운로드 / 미리보기 없음
과정 자료 다운로드 Flow A~G: 5개 원본 모두 실제 다운로드 (파일 이름 · byte가 Asset과 동일), 단계 / Scroll 유지, Card 다운로드가 미리보기를 열지 않음, Keyboard Enter 다운로드, 각 원본을 Hancom / Excel / PowerPoint에서 열어 확인
과정 자료 미리보기 Flow A~G: 자료조사(표) / V1(문서) / 피드백 PDF(문서) / V2(문서) / 최종본(Slide) 미리보기 + Header 다운로드, 닫기 · ESC 후 Stage · Scroll · Focus 복원, A → B 전환 시 이전 내용 없음, 1920~320 겹침 · 가로 Overflow 없음
회귀: Plan / Plan Apply / Routine / Story / Q&A / Record / Home · List · Profile
1920 / 1280 / 768 / 390 / 320: Case 목록 · Detail 문서 가로 Overflow 없음
Frontend automated component test: NOT_RUN (Framework not yet selected)
```

---

## 2026-10-12 — Student School Home / Tasks (branch: feat/student-school-home)

### Status

```text
Mentor Stack 통합: feat/student-mentor-case(83b1504) → feat/student-mentor-hub-home fast-forward (main 미병합)
Student School Home / Tasks 목록: IMPLEMENTED (Fixture 기반 UI, 64c55b5)
VERIFIED 아님: Task API 미연결, currentStage Enum 미확정, Frontend 자동 Test Framework 미선택
```

### Done

- Route `/school` → `/school/tasks?filter=` (Tasks-00 Mockup). Global Navigation "School Activity" Active, 기존 "수행평가" Entry도 `/school/tasks`로 연결 (Extension App 내부 Route만, 기존 LearnersHigh URL 추측 없음)
- School 내부 Navigation: Tasks / Activities / Evidence / Archive. Tasks만 연결, 나머지는 비활성(준비 중, 가짜 Page 없음). Interview는 고3에게만 보이고 현재 Student(고2)에게는 숨김
- Task 9개: Tasks-00의 제목 · 제출물 · 단계 · 상태 분포. 로그인 Student는 Canonical Student 최하은(고2) 한 명 (Mockup의 윤지민 대신, 사용자 확인 2026-10-12)
  - 항생제 포스터 Task = Mentor Hub 진행 중 Task(`fixture-task-01`, 같은 제목), 과목 생명과학Ⅰ
  - 고1 과목을 고2 과목으로 조정(사용자 확인): 통합과학 → 생명과학Ⅰ, 통합사회 → 한국지리, 과학탐구실험 → 화학Ⅰ
  - 기준일 snapshotDate 2026-10-06 (Mockup D-day와 일치), D-day는 snapshotDate 기준 계산
- Stage(1~8, 8칸 진행 + "n/8 · 단계 상태" Text)와 주의 표시(Review 지연 / Deadline Passed / Hold)를 분리. Mockup의 "Review 48h 초과"는 운영시간 숫자 없이 "Review 지연"으로 표시
- Filter Chip 전체 / 내 차례 / 기다리는 중 / 주의 필요 (숫자는 같은 Task 목록에서 계산, URL 유지). 검색은 Mockup에 없어 만들지 않음
- 지금 할 일: 내 차례 Task만 상태 열에 다음 할 일 한 줄 (Detail Overview에서 Primary로 다룰 예정)
- 수행평가 등록 CTA: 비활성 + "등록 화면 준비 중" (Task Create 미구현, 가짜 Form 없음). Task Row는 Detail 화면이 없어 이동하지 않음 (Mockup의 › 없음), `schoolTaskPath` Route Boundary만 준비
- Loading / Empty(Task 없음) / Filter Empty / Error + 다시 시도
- 주의 Badge용 `--lh-color-warning(-subtle)` Token 추가 (Light / Dark)

### Not Started

- Task API 연결, Task Create, Task Detail(7 Tab), Topic, Evidence Vault, Version · AI Analysis / Retry, Feedback, Revision History, Growth Activity, Reflection, Archive, Interview, Backend / DB

### Open / Contract Gap

- `GET /api/student/tasks`에 제출물 요약 / 단계 상태 문구 / 차례 / 주의 표시(Student용) / snapshotDate 없음 → Frontend View Model로만 둠 (api-contract 미수정)
- 주의 표시의 Student 문구("Review 지연")와 차례(내 차례 / 기다리는 중) 판단 기준 미확정
- Filter Empty는 현재 Fixture 분포(모든 Filter 1개 이상)로 Browser 재현 불가 (코드 경로만 존재)

### Verification

```text
student typecheck / lint / build, admin / mentor build, verify-frontend, verify -Strict, git diff --check: 아래 완료 보고 참고
Headless Chrome (CDP): School Flow A~H 25항목 PASS (Global Nav · 내부 Nav · Task 9 · Filter / URL · 직접 URL · /school Redirect · 수행평가 Entry · School ↔ Mentor Active · Back Filter/Scroll 복원 · Loading / Empty / Error · Keyboard Focus 순서)
1920 / 1280 / 768 / 390 / 320 가로 Overflow 없음, Dark mode 확인
Mentor 회귀: 8 Tab · Home · List · Profile · Plan Apply · Routine Apply · Story · Q&A · Record · Case (Preview / Download 5개 byte 동일)
Frontend automated component test: NOT_RUN (Framework not yet selected)
```

---

## 2026-10-12 — Student Task Detail (branch: feat/student-school-task-detail)

### Status

```text
Student Task Detail (7 Tab): IMPLEMENTED (Fixture 기반 UI, b807fcb)
VERIFIED 아님: Task Detail / Evidence / Version / Feedback / Revision API 미연결, Diff Schema · Topic Approval Enum(OD-03) · File Storage(OD-09) 미확정, Frontend 자동 Test Framework 미선택
```

### Done

- Route `/school/tasks/:taskId?tab=&from=&to=` (TasksDetail-01 ~ 07). 9개 Task Row(›) 모두 각자 taskId Detail로 이동. Global Navigation "School Activity" Active 유지, School 내부 Navigation Tasks Active 유지
- 상세 자료 범위(사용자 확인 2026-10-12): Speech(`fixture-task-02`)는 Mockup 내용, 항생제(`fixture-task-01`)는 확인된 사실만(4단계 · Mentor Case = Home 추천 relation · 피드백 / Version 없음), 나머지 7개는 목록 정보 + "상세 자료 준비 중"
- Header(상태 Badge · 제목 · 제출물 · 과목 · 마감 D-day), 8단계 Stepper(좁은 화면 가로 Scroll + 현재 단계로 이동), Overview "지금 할 일" Card(단계 · 상태 · 다음 Action · Primary CTA), 다른 6 Tab은 한 줄 Compact Status
- 운영시간 숫자 미노출: Mockup "Review 48h 초과 / 검토를 기다린 지 62시간" → "Review 지연 / 검토가 조금 지연되고 있어요."
- Mentor Case: Canonical Activity Case를 contentId로 참조(최대 3, "선생님 추천" 먼저, Student 화면에 "Admin 추천" 문구 없음), "과정 자세히 보기" → 기존 Case Detail → Back 시 Mentor Case Tab / Scroll 복원
- 수정 기록: 존재하는 V1 / V2만(Mockup의 "V3 예정" 행은 실제 Version이 아니라 제외), Version Pair URL 유지, 삭제 / 수정 / 추가 Label + del / ins
- 피드백: 선생님 피드백 Primary, AI 사전 점검 Secondary(참고용 안내, 반영 여부 읽기 전용). Mockup의 "반영 체크 → Revision 단계 갱신"은 Stage 전이라 미구현
- 아직 없는 화면 Action(초안 제출 · 녹음 올리기 · 참고 자료 / 과정 자료 추가 · 안내문 보기)은 비활성 + 이유 표시, 가짜 성공 없음. 과정 자료 행의 미리보기 / 삭제 Icon, 참고 자료 삭제는 넣지 않음
- Review waiting / delay state uses text-only presentation: 선생님 검토 · AI 분석을 기다리는 Task(turn = waiting, 보류 아님, 8단계 이전 · Frontend 파생 값)는 Header 상태를 Badge 대신 Text(예: V2 검토 대기 · 검토가 조금 지연되고 있어요.)로, 지금 할 일 Card / Compact Status / 피드백 검토 상자도 Text만 사용. Spinner · Badge · Animation 없음 (Data Loading Skeleton은 유지). Deadline Passed / Hold / 완료 Badge는 기존 유지

### Open / Contract Gap

- Task Detail Contract에 평가 기준 / 안내문 / 참고 자료 / 과정 자료 Category / 지금 할 일 문구 / 피드백 반영 여부 / Revision Diff Shape 없음 → Frontend View Model (api-contract 미수정)
- Student Mentor Case Detail의 Admin 추천 Badge 문구("Admin 추천", Mentor Hub)와 Task Detail의 "선생님 추천" 문구 통일 여부
- TaskDetailTabs는 Mentor UnderlineTabs와 같은 Pattern의 School 전용 Component (두 Feature 공통 Tab 승격은 별도 검토)

### Verification

```text
아래 완료 보고 참고 (typecheck / lint / build / verify -Strict / Browser Flow A~M)
Frontend automated component test: NOT_RUN (Framework not yet selected)
```

---

## 2026-10-12 — Student Task Create (branch: feat/student-school-task-create)

### Status

```text
Student Task Create (Tasks 위 4단계 Modal Wizard): IMPLEMENTED (Fixture 기반 UI, 7d28a17)
VERIFIED 아님: POST /api/student/tasks / File Storage 미연결, 생성 Task는 화면 Session 메모리 저장(새로고침 시 사라짐), Frontend 자동 Test Framework 미선택
```

### Done

- 처음 만든 Full Page(`/school/tasks/new`)를 TaskRegister-01 ~ 05 Mockup 기준 Modal Wizard로 교체 (Full Page / Route 삭제)
- Tasks 화면 위 Modal(`?create=1`, 열 때 History 추가 → Browser Back으로 닫힘, 새로고침 시 빈 Form). 뒤의 목록 / Filter / Scroll 유지. Global Navigation "School Activity" / 내부 Tasks Active 유지
- 4단계 안내문 → 기본 정보 → 평가 기준 → 확인. 상단 4칸 선 + Label(완료 / 현재 / 남은 단계, 이동 버튼 아님), 단계별 검사, 이전 시 입력 유지
- 안내문: 파일 올리기(Native file input, 기존 LearnersHigh 허용 확장자, 용량 제한 없음) / 직접 입력. 파일 준비 진행률은 FileReader progress의 loaded / total 실제 값(서버 Upload 진행률 아님, 인위적 지연 없음), reading / ready / error 상태, 교체 · 빼기
- 기본 정보: 과제 제목 · 과목(Fixture 고2 과목 Radio Chip) · 형태(Mockup 후보 8개) · 지금 어디까지 했나요(맥락 정보만, Stage 전이 없음) · 마감일(date input). 제목 · 과목 · 마감 필수
- 평가 기준: 기준 · 배점 Row 추가 / 삭제, 합계 실시간(100점 강제 없음), 제출물
- 확인: Form 값 Summary, 등록하기 → Fixture 저장소(`fixture-created-task-00n`) → Modal 닫힘 → 목록 맨 위 · Filter 숫자 재계산 · 새 Task로 Focus. 새 Task는 1단계 · 다음 할 일 주제 선정
- 작성 중 취소 / 닫기 / ESC / Browser Back → 나가기 확인, Backdrop 클릭으로 닫히지 않음, 새로고침 → beforeunload. 중복 등록 방지, 실패 시 확인 단계 · 입력 유지

### Open / Contract Gap

- Stage 1 / 2: Interaction은 생성 직후 주제 단계(1→2), api-contract §9-2는 Stage 1 → Stage 1 유지
- "지금 어디까지 했나요?": Mockup 안내 "이미 끝난 단계는 완료로 표시"의 Stage 전이 규칙이 Domain / Contract에 없음 → 맥락 정보로만 보관, 안내 문구는 전이를 약속하지 않게 변경
- 기존 LearnersHigh 수행평가 작성과 Extension Task Create의 관계 / 중복 생성 방지(OD-07)
- POST Request에 안내문 파일 / 형태 / 진행 정도 / 평가 기준 / 제출물 없음 → Frontend Create Draft로만 둠 (api-contract 미수정)

### Verification

```text
아래 완료 보고 참고 (typecheck / lint / build / verify -Strict / Browser Flow A~M · P1~P5)
Frontend automated component test: NOT_RUN (Framework not yet selected)
```

---

## 2026-10-12 — Student Topic Submission (branch: feat/student-school-topic-submission)

### Status

```text
Student Topic Submission: IMPLEMENTED (Fixture 기반 UI, bcec572)
VERIFIED 아님: PUT /api/student/tasks/{taskId}/topic · Admin Topic Review 미연결, topicApprovalStatus Enum 미확정(OD-03), 메모리 Fixture(새로고침 시 초기화), Frontend 자동 Test Framework 미선택
```

### Done

- 전용 Mockup 없음 (School&Admissions 18장 확인, ActivitiesDetail-01/02는 Growth Activity 상세) → TaskRegister Modal / TasksDetail-01 기준
- Task Detail "주제 선정하기" / "주제 수정하기" → Task Detail 위 Modal(`?topic=1`, Browser Back으로 닫힘). Modal 위쪽에 Task 제목 · 과목 · 단계 · 마감 Context
- 주제는 학생이 직접 입력 (AI 제안 없음). 공백 금지만 검사, 최대 길이 규칙 없음
- 제출 → 주제 저장 · Stage 2 주제 선정 · 검토 기다림(Text only, Spinner / Badge 없음). 제출만으로 Stage 3 이동 없음. 제출 직후 바뀐 지금 할 일로 Focus / Scroll
- 주제 상태는 Feature 내부 화면 값(not-submitted / in-review / direction-requested / confirmed), Contract Enum 확정 안 함
- 방향 요청(반려 아님): 선생님 방향 안내 Text + 처음 주제를 채운 수정 Modal → 다시 제출. 확인: Stage 3 자료 조사 · 다음 할 일 자료 추가(Evidence Branch에서 실제 자료 추가로 연결)
- 방향 요청 / 확인은 Admin Action이라 Student 화면에 버튼 없음. 개발 중 `?fixtureTopicReview=direction-requested | confirmed`로만 결과 재현
- Task Create의 Fixture 저장소를 확장(등록 Task + Seed Task Session 변경, revision), 목록 · Detail · 주제 Modal이 같은 taskId 값을 읽음. Seed 하천 Task(2/8 주제 검토 대기)에 주제 검토 상태 연결
- 수정 중 취소 / 닫기 / ESC / Back → 나가기 확인(Task Create와 같은 Dialog), 중복 제출 방지, 실패 시 입력 유지 + 다시 제출
- Overview 주제 표시를 상태별 Text로 변경(기존 "주제 확정" pill 제거)

### Open / Contract Gap

- 검토 중 주제 수정 가능 여부: Source에 규칙 없음 → 검토 중에는 수정 진입을 두지 않음(정책 미정)
- topicApprovalStatus Enum(OD-03), 방향 요청 안내 문구의 Contract 필드 없음 (Frontend View Model)
- Fixture는 메모리 저장이라 새로고침하면 등록 Task는 사라지고 Seed Task는 Seed 상태로 돌아감

### Verification

```text
아래 완료 보고 참고 (typecheck / lint / build / verify -Strict / Browser Flow A~J)
Frontend automated component test: NOT_RUN (Framework not yet selected)
```

---

## 2026-10-12 — Student Evidence (branch: feat/student-school-evidence)

### Status

```text
Student Evidence (Task 과정 자료 Vault + School Evidence 목록): IMPLEMENTED (Fixture 기반 UI, 1f4bb59)
VERIFIED 아님: GET / POST / DELETE /api/student/tasks/{taskId}/evidence 미연결, File Storage(OD-09) 미정, stageTag Enum 미확정(Contract 예시는 RESEARCH뿐), 메모리 Fixture(새로고침 시 Seed로 초기화), Frontend 자동 Test Framework 미선택
```

### Done

- School 내부 Navigation Evidence 활성 → `/school/evidence` (Evidence-00 기준: Task별 묶음 · 개수 · 자료 추가 / 파일 · 형식 · 단계 · 날짜 · 상태 · 미리보기 · 삭제). Mockup에 검색 / Filter 없음 → 만들지 않음
- Task Detail 7 Tab 유지. 과정 자료 Tab = 그 Task의 Evidence Vault (8번째 Tab 없음). 자료 조사 단계 지금 할 일 "자료 추가" → 실제 추가 Dialog
- Canonical Evidence 하나(evidenceId · taskId · fileName · fileRef · stageTag · createdAt + Frontend용 mimeType · sizeBytes · file)를 과정 자료 Tab · School Evidence가 함께 읽음. 기존 Task Detail `processMaterials` Fixture는 제거하고 Seed Evidence로 옮김(중복 없음). Version(수정 기록)과 분리
- 파일 추가: 실제 file input + Task Create의 FileReader 진행률 Hook 재사용(loaded / total, 가로 막대 + %, "자료를 준비하고 있어요", Spinner / 인위적 지연 / 서버 Upload 표현 없음). 형식 · 크기 제한은 Source 근거가 없어 두지 않음
- 단계 Tag(계획서 / 조사 자료 / 초안 / 최종본 / 발표 자료, TasksDetail-04 · Evidence-00 표시값): 현재 단계에 맞는 값을 제안만 하고 바꿀 수 있음. Task currentStage를 바꾸지 않음
- 미리보기: 이번 Session에 고른 이미지(Object URL, 닫으면 revoke) / PDF(브라우저 내장 Viewer) / CSV(표) / TXT·PY 등(Text). DOCX · HWP · ZIP 등은 "미리보기를 지원하지 않는 파일이에요". Seed 자료는 원본 파일이 없어 "원본 파일이 아직 준비되지 않아 미리볼 수 없어요". Download 없음(근거 없음)
- 삭제: 확인 Dialog → 같은 저장소에서 제거 → 두 화면 모두 반영. 실패 시 파일 유지 + 그 줄에 이유
- 추가 실패 시 파일 / 단계 유지 + 다시 추가, 중복 클릭 방지
- Evidence ≥ 1 → 자료 조사 단계에서 "자료 N개 · 자료 조사 완료 조건을 채웠어요" Text만. Stage 4 자동 전이 없음, 삭제로 0개가 되어도 Stage 역전 없음
- 자료 정보가 Fixture에 없는 Task(예: 항생제 · 하천)는 "과정 자료 정보가 아직 준비되지 않았어요"(Empty와 구분), 자료 추가 비활성 + 이유
- 같은 Task를 다시 불러올 때 보던 화면 유지(Detail / Evidence 목록 Hook), 닫은 뒤 Focus 복원

### Open / Contract Gap

- School Evidence 전체 목록 Endpoint 없음 → Task 목록 + Task별 Evidence 조회를 묶는 방식(N+1 가능)
- stageTag 전체 Enum 미확정(Contract 예시 RESEARCH뿐), Preview용 파일 URL / mimeType / size Contract 필드 없음, 허용 형식 · 최대 크기 규칙 없음, File Storage(OD-09)
- Evidence-00의 하천 묶음(2개)은 파일 이름이 보이지 않고, 제동거리의 "dd"는 임시 이름이라 Seed에 넣지 않음
- Speech의 speech_v1 / v2 docx는 Mockup(Evidence-00 / TasksDetail-04)에 Evidence로 표시되어 Evidence Seed로 둠. Version Entity(수정 기록)와는 별개
- 자료 조사 Stage 완료 후 전이 규칙, 삭제 시 역전 정책 미정

### Verification

```text
아래 완료 보고 참고 (typecheck / lint / build / verify -Strict / Browser Flow A~M)
Frontend automated component test: NOT_RUN (Framework not yet selected)
```

---

## 2026-10-12 — Student Version Submit + AI 사전 점검 (branch: feat/student-school-version-ai)

### Status

```text
Student Version Submit + AI 사전 점검 Result / Retry: IMPLEMENTED (Fixture 기반 UI, dd98b36)
VERIFIED 아님: POST / GET /api/student/tasks/{taskId}/versions · …/ai-analysis/retry 미연결, 실제 AI 분석 · File Storage(OD-09) · Shared Feedback Queue / Admin Review 미연결, aiAnalysisStatus 전체 Enum 미확정, 메모리 Fixture(새로고침 시 Seed로 초기화), Frontend 자동 Test Framework 미선택
```

### Done

- Version / AI 전용 Mockup 없음 (School&Admissions 18장, Version · Upload · Analysis · Retry 이름 없음) → TasksDetail-01 / 05 / 07 + Task Create · Evidence Dialog 체계 기준
- Canonical Version 저장소(versionId · taskId · versionNumber · fileName · fileRef · submittedAt · aiAnalysisStatus · retryAllowed · inFeedbackQueue). 기존 Task Detail `versions`를 옮겨 Speech V1 / V2도 같은 저장소에서 읽음. Evidence와 다른 Entity
- 항생제 Task(4단계) "초안 V1 제출" → Task Detail 위 Modal(`?version=submit`, Browser Back으로 닫힘, 파일 선택 후 나가기 확인). Task 제목 · 과목 · 단계 · V 번호 표시, 실제 file input + FileReader 진행률(서버 Upload 표현 없음)
- 번호는 latest + 1 (V1 / V2 / V3 같은 흐름, 이전 Version 유지). 제출 즉시 AI 사전 점검 processing, Task 4 → 5단계(AI 사전 점검)
- 분석 중: Text + 정적인 Skeleton만 (Spinner · 진행률 · Badge 없음). 다른 Tab / 과거 Version 읽기 가능
- 성공: AI 사전 점검 결과(확인 포인트, 점수 · 등급 없음) + 공용 검토 대기열 진입 표시 + 피드백 Tab에 선생님 피드백 "V1 검토가 진행 중이에요"(내용 없음). 5단계 완료 → 6단계 선생님 피드백 · "V1 검토 대기" (분석 중 / 실패 / 다시 시도는 5단계). Python Seed도 6/8 V1 검토 대기로 정리
- 실패: Error Text + 다시 시도(같은 Version, 새 Version 없음). 다시 시도 불가 / 이미 분석 중 / 버전 없음은 학생용 문장, 기술 코드 노출 없음
- 수정 기록 Tab: Version 줄에 파일 · AI 사전 점검 상태 Text + 미리보기(이미지 · PDF · CSV · Text, DOCX 등은 미지원 안내)
- 결과(성공 / 실패)는 서버 처리 결과라 Student 화면 버튼 없음. 개발 중 `?fixtureAiResult=success | failed | failed-final`로만 재현

### Open / Contract Gap

- aiAnalysisStatus 전체 Enum(Contract는 PROCESSING / SUCCESS, Failed 이름 미정), retry 가능 여부 필드 없음, Version Detail의 AI Summary Schema 없음, Shared Feedback Queue 진입 상태 필드 없음
- Version note / 분량 요약은 Contract 필드 없음(Seed만), Version 파일 URL / mimeType / size 필드 없음
- Speech docx는 Evidence Seed와 Version Seed에 같은 파일 이름으로 있으나 서로 다른 Entity로 둠
- V2 / V3는 Revision(7단계) 진입 Flow가 없어 이번에는 화면에서 열리지 않음 (번호 계산 / 제출 흐름은 공용)

### Verification

```text
아래 완료 보고 참고 (typecheck / lint / build / verify -Strict / Browser Flow A~M)
Frontend automated component test: NOT_RUN (Framework not yet selected)
```

---

## 2026-10-12 — Student Feedback (branch: feat/student-school-feedback)

### Status

```text
Student Feedback (Task Detail 피드백 Tab · 반영함 · 다음 할 일): IMPLEMENTED (Fixture 기반 UI, b58f93c)
VERIFIED 아님: GET /api/student/tasks/{taskId}/feedback 미연결, 반영 저장 Endpoint 없음(Contract Gap), Admin Feedback Review / Shared Feedback Queue 미연결, 메모리 Fixture(새로고침 시 Seed로 초기화), Frontend 자동 Test Framework 미선택
```

### Done

- Version + AI 보정 후 Commit(dd98b36): AI 성공 → 5단계 완료 → 6단계 선생님 피드백(공용 검토 대기열), 분석 중 / 실패 / 다시 시도는 5단계. Python Seed 6/8 V1 검토 대기로 정리
- Canonical Feedback 저장소(schoolFeedback.fixture): Speech 피드백을 Detail Fixture에서 옮김, AI 사전 점검은 Version Fixture 결과를 그대로 읽음(복사 없음). 선생님 / AI 피드백 모두 versionId로 Version에 연결
- 피드백 Tab(TasksDetail-05): 선생님 피드백 Primary(Version별 카드, 위 · 큰 제목, 다음 할 일), AI 사전 점검 Secondary(아래, 참고용 안내, n/m 반영)
- 선생님 검토 대기: "V1 검토가 진행 중이에요 · 선생님 검토를 기다리고 있어요" Text만 (가짜 피드백 없음, Spinner / Badge 없음)
- 선생님 피드백 전달은 Admin Review 결과라 Student 버튼 없음. 개발 중 `?fixtureTeacherFeedback=delivered`로만 재현 (Contract §13-1 예시 문장 사용)
- 반영함: 항목마다 Checkbox(켜고 끌 수 있음, 학생 본인 표시). 최근 Version 피드백만 바꿀 수 있고 지난 Version은 읽기 전용 Text. 저장 후 화면 갱신, 저장 중 중복 요청 없음, 실패 시 표시 유지 + 그 항목 이유
- 필수: 전달된 선생님 피드백 = 필수, AI 사전 점검 = 선택(View Model). 필수 n/m을 실제 값으로 계산
- 다음 할 일: 일부 반영 → "선생님 피드백을 확인하고 수정할 내용을 반영해주세요"(수정본 V2 제출 비활성 + 이유), 모두 반영 → "수정본 V2를 준비해주세요"(수정본 제출 화면 준비 중). Stage 6 유지, Tasks 목록도 같은 값
- 바로가기: AI 사전 점검 보기 / 수정 기록 "피드백 보기" → `?tab=feedback&versionId=` → 그 Version 피드백 제목으로 Focus · Scroll. 없는 Version은 그 영역 안내
- 피드백만 불러오지 못하면 피드백 Tab 안 오류 + 다시 시도 (Task 전체 오류와 구분)

### Open / Contract Gap

- 반영 저장 Endpoint 없음, reflected / required 필드 없음, 선생님 피드백 항목 단위 Schema 부족(현재 feedbackId = 항목)
- 필수 반영 완료 → 7단계(Revision) 전이 시점: 수정본 V2 제출 Flow와 함께 정함 (지금은 6단계 유지)
- TasksDetail-05 안내문의 "반영한 항목을 체크하면 Revision 단계가 함께 갱신돼요"는 다음 할 일 갱신까지만 반영
- AI 사전 점검 항목의 반영 표시가 필수 판단에 쓰이는지 미정 (지금은 선택)

### Verification

```text
아래 완료 보고 참고 (typecheck / lint / build / verify -Strict / Browser Flow A~J)
Frontend automated component test: NOT_RUN (Framework not yet selected)
```

---

## 2026-10-12 — Student Revision (branch: feat/student-school-revision)

### Status

```text
Student Revision (수정본 V2 / V3 · 7단계 Revision Loop · 수정 기록): IMPLEMENTED (Fixture 기반 UI, 22f81c0)
VERIFIED 아님: Version / Revision History API 미연결, Diff Schema 미확정, Admin Re-review / Shared Feedback Queue 미연결, 실제 AI 분석 / File Storage 없음, 메모리 Fixture(새로고침 시 Seed로 초기화), Frontend 자동 Test Framework 미선택
```

### Done

- 수정본 제출: 최근 Version의 필수 선생님 피드백을 모두 "반영함"으로 표시하면 지금 할 일의 "수정본 V2 제출"이 활성 (체크만으로는 6단계 유지)
- 기존 Version 제출 흐름(?version=submit · VersionSubmitDialog · schoolVersion.fixture)을 그대로 씀. 번호는 latest + 1, 이전 Version 유지
- 6 → 7단계: 실제로 수정본(V2)을 제출하는 순간. 그 뒤 AI 사전 점검 중 / 실패 / 다시 시도 / 재검토 대기 / 피드백 전달 / V3 준비 / V3 제출 모두 7단계 유지 (5단계로 되돌리지 않음)
- 재검토 결과(Fixture): `?fixtureTeacherFeedback=delivered`(수정본이 더 필요) / `final-ready`(추가 수정 없음). Contract에 revisionRequired가 없어 Feature 내부 reviewDecisions로 둠
- 최종 제출 준비: "최종 제출을 준비해주세요" + "최종 제출"(화면 준비 중, 비활성). Stage 8 전이 없음
- 수정 기록 Tab: V1 / V2 / V3 줄(파일 · AI 사전 점검 상태 · 미리보기), 비교 Version 선택(이전 → 이후만, 기본 직전 → 최신, ?from=&to= 유지)
- Speech V1 → V2 Diff는 기존 Fixture 그대로(Before / After, del / ins, 삭제 · 수정 · 추가 개수 계산). 학생이 올린 파일은 Diff를 만들지 않고 "비교 정보가 아직 준비되지 않았어요"
- 반영한 피드백 연결: Diff Fixture의 관계, 없으면 바로 앞 Version의 "반영함" 표시된 필수 선생님 피드백. "피드백 보기"는 History에 남겨 Back으로 같은 Pair / Scroll 복원
- Version 1개면 "비교할 수정본이 아직 없어요"

### Open / Contract Gap

- 수정본 제출은 Contract §12-1 Version POST를 그대로 쓴다고 가정 (Revision 전용 Endpoint 없음)
- 추가 수정 필요 여부(revisionRequired / needsAnotherRevision) 필드 없음, 최종 제출 준비 상태 필드 없음
- Stage 7 내부 세부 상태(AI 사전 점검 중 / 재검토 대기 / 수정 준비 / 최종 제출 준비)는 stageStatus Text로만 표현 (Enum 미확정)
- Diff Schema 미확정 (Speech만 Fixture), V4 이상 허용 여부 규칙 없음 (Fixture는 V3 뒤 최종 제출 준비로 둠)
- reflected / required 필드 · 반영 저장 Endpoint 없음 (Feedback Branch와 같음)

### Verification

```text
아래 완료 보고 참고 (typecheck / lint / build / verify -Strict / Browser Flow A~M)
Frontend automated component test: NOT_RUN (Framework not yet selected)
```

---

## 2026-10-12 — Student Final Submission (branch: feat/student-school-final-submission)

### Status

```text
Student Final Submission / Final Artifact / Parent Share Consent / Archive Projection: IMPLEMENTED (Fixture 기반 UI, c1990e6)
School Archive Full Page: Archive Branch에서 구현
VERIFIED 아님: 최종 제출 Endpoint 없음(Contract Gap), GET / PUT final-artifact 미연결, Archive 저장 방식 미확정(API-OD-05), Admin Report 첨부 미연결, 메모리 Fixture(새로고침 시 Seed로 초기화), Frontend 자동 Test Framework 미선택
```

### Done

- Final 관련 Mockup 없음 (School&Admissions 18장: Final / Submit / Artifact 없음, Archive-00은 다음 Branch 목록 화면) → TasksDetail-01 지금 할 일 + 기존 확인 Dialog 체계
- 최종 제출 준비(선생님 재검토 결과 = 추가 수정 없음)일 때만 "최종 제출" 활성. 준비 ≠ 8단계
- 최종 제출 확인 Dialog: 최종본(최근 Version · 파일), 완료 후 수정본 불가 / 기록 유지 안내, 취소 Focus. 새 파일 업로드 없음 (Version picker 없음)
- 실제 최종 제출 성공 때만 7(또는 6)단계 → 8단계 "최종 제출 완료", 차례 = 완료(done, 내 차례 / 기다리는 중 Filter에 들지 않음)
- TaskFinalArtifact(artifactId · taskId · type · fileRef · parentShareStatus + Frontend sourceVersionId / fileName / createdAt): 최종본 Version의 fileRef를 참조하는 별도 Entity, Task당 하나 (중복 제출에도 하나)
- 완료 Overview: "수행평가를 완료했어요" · 최종 결과물 · Archive 보관 대상 안내 · 최종 결과물 보기(미리보기, Download 없음). 수정본 / 다시 시도 / 반영 표시 / 자료 추가 · 삭제는 닫음, Version · 피드백 · 수정 기록 · 과정 자료는 그대로
- 학부모 공유 동의 Switch(최종 결과물만): not_shared ↔ consented. 동의 = Parent Report 첨부 후보일 뿐 바로 전송 / 첨부 없음. 초안 · 수정 기록 · AI 사전 점검 · 선생님 피드백은 공유 대상 아님. attached / shared는 Student가 바꾸지 않음
- Archive Projection(source = task): 완료(8단계) Task에서 계산 (최종 결과물 유무와 무관, TaskFinalArtifact는 선택). 별도 Archive 기록 없음, sourceId 하나당 하나
- 최종 결과물이 없는 완료 Task(Seed 영어 독서 에세이): Archive 대상, Overview에 "최종 결과물 파일 정보가 없어요" (미리보기 / 공유 없음, 가짜 결과물 없음)
- 실패: 최종 제출 실패 → 7단계 · 결과물 없음 · 창 유지 + 다시 시도, 공유 저장 실패 → 원래 상태 + 이유, 최종 결과물만 불러오지 못함 → 그 영역 오류 + 다시 시도

### Open / Contract Gap

- 최종 제출 Command Endpoint 없음 (Feature 내부 finalize Fixture)
- Final Artifact 생성 주체 / 시점, sourceVersionId 필드 없음
- 완료 Task의 피드백 반영 표시 / 과정 자료 추가 · 삭제 허용 여부 규칙 없음 → Frontend 임시 정책으로 읽기 전용 (Domain Rule 아님)
- Archive Persistence(API-OD-05) 미확정 → Projection으로 계산
- attached / shared 이후 Student 동의 해제 정책 미정 → Switch 비활성
- 6 → 8: 선생님 검토 결과가 명시적으로 "추가 수정 없음"일 때만 최종 제출 준비 → 실제 최종 제출로 8단계 (V1만 있다는 이유로 자동 전이 없음). Stage 7 = 수정이 필요할 때의 반복 구간이라는 해석은 Frontend Fixture 정책이며 Domain Rule로 확정하지 않음

### Verification

```text
아래 완료 보고 참고 (typecheck / lint / build / verify -Strict / Browser Flow A~M)
Frontend automated component test: NOT_RUN (Framework not yet selected)
```

---

## 2026-10-12 — School Archive (branch: feat/student-school-archive)

### Status

```text
School Archive (Archive-00, Task source): IMPLEMENTED (Fixture 기반 UI, d5ef416)
Growth source: PENDING (not connected) — Growth Activity 저장소가 없어 빈 목록, Archive 전용 Growth 데이터 만들지 않음
VERIFIED 아님: GET /api/student/archive 미연결, Archive Persistence 미확정(API-OD-05), Frontend 자동 Test Framework 미선택
```

### Done

- Final Submission 보정 후 Commit(c1990e6): Archive 대상 = 완료(8단계) Task (TaskFinalArtifact 유무 무관). 결과물 없는 완료 Task(Seed 영어 독서 에세이)도 Archive 대상, Detail에는 "최종 결과물 파일 정보가 없어요"(미리보기 / 공유 없음)
- `/school/archive` Route, 내부 Nav Archive 활성(Activities는 계속 비활성). Global Nav School Activity
- Archive Projection(Read Model ArchiveItemView): 완료 Task + Growth(빈 목록)를 한 번에 계산, sourceId로 원본 참조 (원본 내용 복사 없음, Task 하나에 하나)
- 카드(Archive-00): 시기(학기) · 활동 이름 · 출처 Badge(수행평가) · 결과 · Reflection(Task는 없음 → Mockup 문장) · 과목 · Evidence 수(자료 정보가 없는 Task는 숫자 생략)
- 검색(활동 이름 · 과목 · Reflection) / 출처 Filter(전체 · 수행평가 · 성장 활동): ?query= / ?source= 유지, 카드 → Task Detail → Back으로 검색 · 출처 · Scroll 복원
- 전체 Empty / 조건 Empty / Loading Skeleton / Error + 다시 시도 구분
- Task Detail 돌아가기 버튼의 읽기 문구를 들어온 목록에 맞춤 (Archive로 돌아가기 / Evidence로 돌아가기 / Tasks 목록으로 돌아가기)

### Open / Contract Gap

- Archive Persistence(별도 저장 vs Projection) 미확정 → Projection
- Growth Activity Archive 연결 대기 (growthArchiveItems = [])
- Mockup의 유형 Chip(발표 / 포스터 / 영상 / 보고서) · 성적 · NEW: 원본에 해당 데이터가 없어 만들지 않음 → 출처 Filter(Contract source)로 대신
- Archive 정렬 규칙 없음 → 마감일이 늦은 순(완료 시각이 Seed에 없음)
- 시기 표시: Contract 예시(2026년 2학기)를 따름 (Mockup은 월 단위)
- Archive item에 Final Artifact 유무 / 공유 상태 필드 없음 → Task Detail에서 원본으로 확인
- 완료 Task 읽기 전용 / Stage 6 → 8 / Stage 7 해석은 Final Submission과 같은 Frontend 임시 정책

### Verification

```text
아래 완료 보고 참고 (typecheck / lint / build / verify -Strict / Browser Flow A~M)
Frontend automated component test: NOT_RUN (Framework not yet selected)
```

---

## 2026-10-12 — School Activities (branch: feat/student-school-activities)

### Status

```text
School Activities: IMPLEMENTED (Fixture 기반 UI, 5f6a5e1) — List / Create / Detail / Draft Edit / Activity Evidence / Submit
Activity Reflection / Feedback / Growth Archive Connection: 다음 구간(feat/student-school-activity-reflection) 참고
VERIFIED 아님: /api/student/activities 미연결, Activity Type / Status / visibility Enum 미확정, 메모리 Fixture(새로고침 시 Seed로 초기화), Frontend 자동 Test Framework 미선택
```

### Done

- Archive 보정 후 Commit(d5ef416): Task Detail 돌아가기 버튼의 읽기 문구를 들어온 목록에 맞춤
- Growth Activity: Task와 다른 Entity(model/activity, fixtures/schoolActivity). Activity 과정 자료도 Task Evidence와 다른 저장소
- Seed: Activities-00 / ActivitiesDetail-01·02 중 로그인 학생(최하은)의 "생명과학 탐구동아리" 하나 (Mockup 내용: 기록 · 자료 3개 · Reflection 6/7 · 선생님 피드백). 다른 학생 카드는 넣지 않음
- `/school/activities`: 나의 활동 기록 · 활동 기록 추가 · 요약(전체 활동 / Feedback 대기 / 이번 학기 기록, 원본에서 계산) · 검색(활동명 · 기관 · 태그) · 유형 Chip(Mockup 7개 + 전체) · 카드. ?query= / ?type= 유지
- 활동 기록 추가: 목록 위 Modal(?create=1). 기본 정보(활동명 · 유형 · 기관 · 기간 · 역할), 필수 = 활동명 · 유형 · 시작일, 종료일 ≥ 시작일(지난 날짜 허용). 입력 중 나가기 확인. 만들면 작성 중(Draft) → Detail
- `/school/activities/:activityId`: 기본 정보 · 활동 과정 단계 · 학생 서술(참여 이유 · 주요 과정 · 내가 실제로 한 일 · 결과 · 후속 활동 · 태그) · 오른쪽 Evidence 열 · Reflection · 선생님 피드백
- 작성 중: 기록 수정(실패 시 입력 유지) · 자료 추가(실제 진행률) / 미리보기 / 삭제(단계 Tag 없음) · 기록 제출(확인 → 제출 완료, 피드백 대기로 자동 전환 없음, 자료 0개여도 제출 가능)
- 제출 후: 기록 · 자료 읽기 전용(Frontend 임시 정책), 다음 할 일 "Reflection 작성"(준비 중). Reflection / 피드백은 가짜 내용 없이 상태 문장
- Archive: Draft / Submitted 활동은 Archive에 넣지 않음 (Archived만, growth source 계속 빈 목록)

### Open / Contract Gap

- Activity Type Enum(Contract 예시 SCHOOL_PROJECT 등) 미확정 → Frontend key + 화면 이름
- Activity Status Enum 미확정 (draft / submitted / feedback-waiting / feedback-delivered / reflected / archived Feature 값)
- 제출 후 수정 가능 Field / 자료 수정 정책 미정 → 읽기 전용 (Frontend 임시 정책)
- visibility Enum: PRIVATE만 확인 → 기본값 PRIVATE, 공개 범위 UI 없음
- Activity 필수 항목 규칙 없음 → 활동명 · 유형 · 시작일만 필수 (화면 규칙)
- Activity Evidence 설명 / 유형 Metadata Schema 없음 (Mockup의 파일 설명 줄은 넣지 않음)
- Mockup의 부제 · 팀 인원(개인 / 팀) · 학생 이름 · 학년 표시는 Contract 필드가 없어 넣지 않음
- 이번 학기 / Archive 저장 시점 규칙은 화면 계산 (학기 Contract 없음)

### Verification

```text
아래 완료 보고 참고 (typecheck / lint / build / verify -Strict / Browser Flow A~O)
Frontend automated component test: NOT_RUN (Framework not yet selected)
```

---

## 2026-10-12 — Activity Reflection / Feedback / Growth Archive (branch: feat/student-school-activity-reflection)

### Status

```text
Activities: IMPLEMENTED (5f6a5e1)
Activity Mock Data (Canonical 12): IMPLEMENTED (Fixture, d113e06)
Activity Reflection: IMPLEMENTED (Fixture 기반 UI, d113e06)
Activity Feedback Request / Display: IMPLEMENTED (Fixture 기반 UI, d113e06)
Growth Archive Connection: IMPLEMENTED (Fixture 기반 UI, d113e06)
Admin Activity Feedback: NOT_STARTED
Cross-subject Connection: NOT_STARTED
Interview: NOT_STARTED
VERIFIED 아님: /api/student/activities/{id}/feedback-request · feedback · reflection · archive 미연결, Enum 미확정, 메모리 Fixture, Frontend 자동 Test Framework 미선택
```

### Done

- Canonical Activity 12개(로그인 학생 최하은): 기존 A01(fixture-activity-biology-club) id · 내용 유지 + A02~A12 신규 deterministic id. 유형 8종 · 상태 6종이 모두 있음 (작성 중 2 · 제출 2 · 피드백 대기 2 · 피드백 도착 2 · 보완 완료 2 · Archive 저장 2). Seed 과정 자료 22개(파일 이름만, 원본 없음 → 미리보기 "원본 파일이 아직 준비되지 않아" 안내)
- Reflection(ActivitiesDetail-02 7문항, §17-3 Field): 학생이 직접 입력 · 원문 그대로 저장(AI 작성 / 교정 없음). 최소 1항목 필요. 저장 중 / 실패 시 입력 유지 / 나가기 확인(useBlocker + TaskLeaveDialog). 작성 중 활동은 "먼저 활동 기록을 제출해주세요."
- 상태 전이(Fixture): 제출 → (Reflection 저장) → 보완 완료, 제출 → (피드백 요청, 선택) → 피드백 대기, 피드백 대기 중 Reflection 저장은 상태 유지, 피드백 도착 → (Reflection 보완 저장) → 보완 완료, 보완 완료 → (확인 Dialog) → Archive 저장. 중복 클릭은 한 번만 반영
- 피드백 대기: Text 안내만 (Spinner / Badge / 대기 시간 / 담당자 없음). 피드백 도착: 4항목(§17-2 strength · needsDetail · question · nextSuggestion) + 작성 정보
- 개발용 `?fixtureActivityFeedback=delivered`(DEV 전용): 피드백 대기 활동에 표시용 피드백을 붙여 피드백 도착으로 바꾸고 주소에서 제거 (Admin 결과 재현, 담당 배정 아님)
- Growth Archive: Archive 항목을 Activity 저장소의 archived 활동에서 계산 (별도 Archive 데이터 없음). 학기 · 유형 이름 · 결과(비면 숨김) · 배운 점 원문 · Evidence 수. Task와 날짜(마감일 / 활동 종료일) 늦은 순으로 합침. Archive Loader key에 Activity revision 포함
- Growth 카드 → Activity Detail(돌아가기 "Archive로 돌아가기") → Back 시 Archive 검색 · 출처 · Scroll 복원. 학기 계산은 model/period.ts 공통 헬퍼

### Open / Contract Gap

- Reflection 필수 항목 규칙 없음 → 최소 1항목 (화면 규칙)
- 기록 Field(참여 이유 · 역할 · 한 일 · 후속 활동)와 Reflection Field(participationReason · role · whatIDid · followUpActivity) 의미 중복
- Reflected 전이 조건 미정 (Reflection 저장 시점? 피드백 반영 필요 여부?) → 제출 / 피드백 도착에서 저장 시 보완 완료 (Fixture 규칙)
- 피드백 대기 중 Reflection 저장 허용 여부 / 그때의 상태 미정 → 저장 허용 · 상태 유지
- Archived 이후 수정 정책 미정 → 읽기 전용
- 피드백 작성자 Metadata(이름 · 역할 · 전달 시각) Contract 없음 → Fixture 표시 정보
- Archive reflectionSummary 출처 미정 → 학생이 쓴 learning 원문 (AI 요약 없음)
- Activity Type / Status / visibility Enum 미확정 (Frontend key)

### Verification

```text
아래 완료 보고 참고 (typecheck / lint / build / verify -Strict / Browser Flow)
Frontend automated component test: NOT_RUN (Framework not yet selected)
```

---

## 2026-10-12 — Cross-subject Connection Boundary / Interview Bridge (branch: feat/student-school-interview)

### Status

```text
Activity Reflection: IMPLEMENTED (d113e06)
Growth Archive Connection: IMPLEMENTED (d113e06)
Cross-subject Connection: BOUNDARY_IMPLEMENTED (Fixture / 읽기 모델만, 미커밋)
Admin Connection Review: NOT_STARTED
Interview Bridge (Student Published Question · Answer · Practice State · Grade Eligibility): IMPLEMENTED (Fixture 기반 UI, 미커밋)
Admin Interview Management: NOT_STARTED
VERIFIED 아님: Connection API 없음, Interview API(§19) 미연결, Enum 미확정, 메모리 Fixture, Frontend 자동 Test Framework 미선택
```

### Done

- Connection Canonical Fixture(fixtures/schoolConnection): connectionId · sourceRefs(Archive source 규칙 task / growth + sourceId) · reason · reviewState(candidate / confirmed / rejected, Fixture 의미 값)
  - Archive 항목 3개(완료 Task fixture-task-08 · 성장 활동 A11 · A12)로 가능한 짝 3개: 확정 1(A11 ↔ A12) · 후보 1(A11 ↔ Task 08) · 거절 1(A12 ↔ Task 08). 가짜 Archive 항목 없음
  - 상태를 바꾸는 함수 없음 (Student / AI 확정 불가, Admin Review 화면 없음). Interview는 confirmedConnection()만 사용
- 학년 Context: Canonical 최하은 고2 유지. DEV 전용 `?fixtureStudentGrade=3`(Eligibility만 고3 재현, 메모리, 새로고침 시 해제 · `=2`로 해제). Production 조작 UI 없음
  - 고2: School 내부 Nav에 Interview 없음, `/school/interview`(및 질문 URL) 직접 접근 시 "Interview는 고3 학생에게 열려요." 안내 (질문을 읽지 않음, Redirect 없음)
- Interview Fixture(fixtures/schoolInterview): 질문 7개(공개 5 · 비공개 2), id fixture-interview-question-001 ~ 007. 관련 활동은 Archive 저장한 실제 A11 / A12 id만. Q05는 확정 Connection 001 근거(관련 활동 A11 + A12)
  - Student 읽기 모델: 고3 + 공개 + (Connection 근거면 확정) 질문만 반환. 비공개 질문은 목록 / 직접 URL 모두 Not Found
- `/school/interview`: 면접 질문 목록(질문 · 관련 활동 이름 · 연습 상태 · 답변 여부) + 요약(공개 질문 / 연습 중 / 답변 작성, 원본에서 계산)
- `/school/interview/:questionId`: 질문 · 관련 활동 카드(유형 · 기간 · 이름, Canonical Activity 참조) → Activity Detail(돌아가기 "면접 질문") → Back 시 질문 · Scroll 복원
  - 답변: 학생 직접 입력, 명시적 "답변 저장"(자동 저장 / 자동 답변 없음), 저장 중 / 실패 시 입력 유지 / 연속 클릭 1회 / 나가기 확인
  - 연습 상태: NOT_STARTED ↔ PRACTICING (연습 시작 / 연습 전으로 되돌리기), 실패 시 이전 상태 유지, 연속 클릭 1회. 답변과 서로 독립
- Loading(Skeleton) / 목록 오류 / 질문 오류 / 공개 질문 없음 / 관련 활동 없음(개발용 related-missing) / 질문 Not Found 구분

### Notes — Student School UI refinement (같은 Branch, 미커밋, 새 Feature 아님)

- School density refinement: School 공통 Container max-width 1680px, School 범위 Token(제목 / 간격 한 단계) 축소. 본문 14px · 44px Touch target 유지. transform / zoom 미사용
- School 1차 Navigation(Tasks / Activities / Evidence / Archive, 고3은 기존 Interview 유지)은 목록 / 허브 화면에서만 렌더링. Task / Activity / 면접 질문 상세에서는 School 제목 · 1차 Navigation을 그리지 않음 (SchoolLayout level="detail")
- School Header 설명 · Activities 설명 문구 변경
- Task Detail Scroll 시 8단계 Stepper가 Sticky School Navigation 위에 겹쳐 그려지던 문제 수정 (Stepper isolation + 상세에서 Sticky Navigation 제거). Activity Detail 오른쪽 자료 열 Sticky top을 Global Navigation 아래로
- School primary nav = Tasks / Activities / Evidence / Archive (학년과 관계없이 4개). Interview는 1차 Tab이 아니라 Archive 상단의 고3 전용 "면접 준비" 진입점(grade-gated entry)으로 들어간다. 고2는 진입점 없음, 직접 URL은 기존 비대상 안내 유지
- 면접 질문 목록은 1차 Navigation 없는 보조 화면 (돌아가기 "‹ Archive")
- 상세 돌아가기 문구(보이는 글자 + 읽기 문구)를 실제 출발 화면에 맞춤: Task Detail ‹ Tasks / ‹ Evidence / ‹ Archive (직접 URL은 Tasks), Activity Detail ‹ 나의 활동 기록 / ‹ Archive / ‹ 면접 질문, 면접 질문 상세 ‹ 면접 질문
- School density / sticky refinement complete

### Open / Contract Gap

- Connection: Student용 API 없음, 상태 Enum 미확정(OD-04 / API-OD-04), sourceRef Schema 없음
- Interview 공개 상태 Schema 부족 → Fixture published: boolean
- practiceStatus 전체 Enum 미확정 → Contract 예시의 NOT_STARTED / PRACTICING만
- 완료 Task를 relatedActivityIds로 표현할 방법 없음 → Task는 Interview 관련 활동에 넣지 않음
- Interview 대상 학년 판단 필드 위치 미정 (Student Context? 응답?)
- Question Detail 응답 Shape 없음, GET 목록에 answer 없음 → Fixture answer 필드

### Verification

```text
아래 완료 보고 참고 (typecheck / lint / build / verify -Strict / Browser Flow A~O)
Frontend automated component test: NOT_RUN (Framework not yet selected)
```

## 2026-10-14 — Mentor Surface (branch: feat/mentor-surface)

### Status

```text
Mentor Surface: IMPLEMENTED (Fixture Adapter 기반 Frontend, frontend/mentor/**)
VERIFIED 아님: Backend / 실제 /api/mentor/** 미연결, 인증(OD-10) 없음, Frontend 자동 Test Framework 미선택
```

### Done

- Router: react-router 7.18.4를 Mentor App에도 추가 (Student App과 같은 버전, ScrollRestoration)
- Data Boundary: `src/api/mentorApi.ts`(MentorApi Interface, /api/mentor/** Endpoint 1:1) + Fixture Adapter(상태 전이 / 내 Content만 / 409·400 검증)
- My Content: Type / Status Filter, 제목·태그 검색(URL 유지), 조회 · 저장 · Apply(Plan / Routine만), 초안 / 공개됨 / 검수 대기 구분
- Content Detail: Type별 View 분리(Plan 주차 표 / Routine Habit / Story 문단 / Record 기록 문장 / Case 단계), 공개 / 검수 요청 Dialog
- Content Edit: Type별 Editor, 편집 ↔ 미리보기, 수정 Draft(sessionStorage) 보존, 검수 중 · 공개된 Record / Case 수정 차단(사유 표시)
- Create Post: 유형 → 태그 → 본문 → 공개 범위 → 미리보기 → Submit, 단계 URL(?step=), Draft(sessionStorage) 보존, 유형별 본문 보관
- Record / Case: Submit = 검수 요청(status DRAFT 유지 + UI-only `review.publishRequestSubmitted`), Review Pending 화면
- Q&A Inbox / Question Detail / Answer: pending · overdue · answered Filter(URL 유지), 익명 Context(grade / interestField, 빈 값 방어), 관련 Content(Published만) 검색 · 연결, 답변 Draft 보존, 중복 제출 방지
- Profile / Profile Edit: 한지수(fixture-mentor-01) 공개 Profile, Published Content 목록, 공개 Field(고교 Context / 대표 경험 / 태그)만 수정
- Loading(Skeleton) / Empty(작성 없음 · Q&A 없음 · Filter · 검색) / Error → 다시 시도 / Not Found, `?fixture=loading|empty|error|submit-error` (개발 모드)

### Open / Contract Gap

- Record / Case Review State(OD-05 / API-OD-06): Persisted Enum 없이 UI-only 표시. 검수 중 / 공개 후 수정 정책 미정 → 수정 차단
- Mentor Content 응답 Field(metrics / updatedAt / review / Type별 body)와 Mentor 전용 Error Code 미정의
- 일반 Content Publish 즉시 공개 여부: mentor-hub.md §5 "Record / Case만 검수 후 공개" 해석으로 Plan / Routine / Story는 즉시 공개
- Visibility: Contract 예시 `PUBLIC`만 사용, 다른 공개 범위 미정
- My Content 검색: Contract에 Query 없음 → 받아 온 목록 안에서 검색
- Profile 수정 가능 Field 목록 미정, Q&A Category 전체 Enum 미정, reassign(OD-02) 미구현
- Student Q&A 반영: Fixture는 Surface별 Memory라 Mentor 답변이 Student 화면에 실제로 반영되는지는 Backend 연결 후 확인 필요
- TEMPORARY FIXTURE DUPLICATION: Mentor / Published Content / Q&A 일부 값을 Student Fixture에서 옮겨 적음 (Shared Seed 전까지)

### Verification

```text
mentor typecheck / lint / build: PASS
scripts/verify-frontend.ps1: PASS (student / admin / mentor)
Headless Chrome (CDP) Browser Flow 19개: PASS
  Type / Status Filter, Detail 왕복 Filter · 검색 · Scroll 복원, Type별 Detail, Create Draft 보존(메뉴 이동 · Preview · 새로고침),
  Story 공개, Record 검수 요청(즉시 공개 아님), Case 검수 요청, 공개 Record 수정 차단, Q&A Filter, 답변 + 관련 Content 연결,
  Privacy(응답 Key / DOM), Profile 표시 · 수정, Empty 4종, Error → Retry 5곳 / Loading / Not Found / Submit 실패 유지,
  main · h1 1개, Keyboard(Skip Link · Focus), 1440 / 1024 / 768 / 390 / 320 가로 Overflow 없음, Dark Theme
Frontend automated component test: NOT_RUN (Framework not yet selected)
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
