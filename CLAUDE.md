# LearnersHigh Extension — Claude Code Guide

> Claude Code가 항상 먼저 확인하는 최상위 작업 규칙이다.  
> 이 파일은 상세 Spec을 반복하지 않고, **무엇을 읽고 어떤 기준으로 작업할지**만 정의한다.

## 1. Project Scope

`learnershigh-extension`은 기존 LearnersHigh 전체를 다시 만드는 프로젝트가 아니다.

기존 기능은 가능한 한 유지하고 연결한다.

```text
Existing LearnersHigh
        │
        ▼
Integration Boundary
        │
        ├─ Mentor Hub
        ├─ School & Admissions
        ├─ Student Management
        ├─ Parent Progress
        └─ Team Member Features
```

다음과 같은 기존 기능을 편의를 위해 중복 구현하지 않는다.

```text
Study Timer
Plan
Library
Learning History
Report
Statistics
Existing Performance Task
Admin Student / Branch Management
Study Room
```

## 2. Read Before Coding

모든 작업 시작 전:

```text
1. docs/SOURCE_OF_TRUTH.md
2. docs/OWNERSHIP.md
3. 관련 Feature Spec
4. 관련 docs/specs/<owner>/domain.md
5. docs/api/api-contract.md의 관련 구간
```

기존 LearnersHigh 연결 작업:

```text
+ docs/architecture/integration-boundary.md
+ docs/product/existing-runners-high-analysis.md
+ 관련 references/existing-runners-high/screens/
```

신규 UI 작업:

```text
+ docs/design/tds-web-guidelines.md
+ 관련 references/claude-design-mockup/
```

Architecture 변경:

```text
+ docs/architecture/overview.md
+ docs/architecture/shared-conventions.md
+ 관련 docs/adr/
```

## 3. Source of Truth

```text
기능 동작 / User Flow
→ docs/specs/<owner>/features/*.md

Entity / Relationship / State
→ docs/specs/<owner>/domain.md

Frontend ↔ Backend Contract
→ docs/api/api-contract.md

Architecture
→ docs/architecture/

신규 Visual 원칙
→ docs/design/tds-web-guidelines.md

신규 Layout
→ references/claude-design-mockup/

기존 LearnersHigh Context / IA / Interaction
→ docs/product/existing-runners-high-analysis.md
→ references/existing-runners-high/screens/

담당자 경계
→ docs/OWNERSHIP.md

중요한 결정과 이유
→ docs/adr/
```

충돌이 해결되지 않으면 추측하지 말고 작업을 중단한 뒤 보고한다.

## 4. Ownership

Source Code는 사람 이름이 아니라 Feature / Domain 기준으로 구성한다.

금지:

```text
frontend/**/suyeon/
frontend/**/wangyu/
backend/**/suyeon/
backend/**/wangyu/
backend/**/ext/
```

담당자는 반드시 `docs/OWNERSHIP.md`로 판단한다.

다른 담당자의 Feature를 명시적 합의 없이 수정하지 않는다.

## 5. Suyeon Scope

```text
Mentor Hub
Mentor Surface
School & Admissions
Admin Student Management
Parent Progress
```

관련 문서:

```text
docs/specs/suyeon/domain.md
docs/specs/suyeon/features/mentor-hub.md
docs/specs/suyeon/features/school-admissions.md
docs/specs/suyeon/features/student-management.md
docs/specs/suyeon/features/parent-progress.md
```

## 6. Counseling Boundary

상담 관련 기능 전체는 Wangyu 담당이다.

Suyeon 영역에서 다음을 만들지 않는다.

```text
Counseling Entity / API / DB
Counseling CRM
Student / Parent / Joint Counseling
Counseling Brief / Follow-up
Admissions Counseling
Counseling Privacy
Counseling-derived Parent Report Section
Counseling-derived Today Board Action / Operations KPI
```

필요한 경우 Integration Boundary 또는 Shared Contract만 정의하고 실제 구현은 Wangyu 영역에 둔다.

## 7. Existing LearnersHigh

기존 기능이 필요하면 먼저 재사용 가능성을 확인한다.

```text
Plan 필요
→ Existing Plan 연결

Library 필요
→ Existing Library 참조

Study Time 필요
→ Existing Study Data 사용

기존 수행평가 존재
→ 중복 Task 생성 금지
```

기존 API / DB / 인증 구조를 확인하기 전에 Endpoint, Table, Column, PK Type을 추측하지 않는다.

## 8. Frontend

```text
frontend/
├─ student/
├─ admin/
├─ mentor/
└─ shared/
```

Feature-first 구조를 사용한다.

`frontend/shared/`에는 **실제로 여러 Feature/Surface가 공통 사용하는 코드만** 둔다.

한 Feature에서만 사용하는 Component를 미리 Shared로 올리지 않는다.

## 9. Backend

Spring Boot Backend는 Domain 기준으로 구성한다.

```text
mentor/
school/
studentmanagement/
parentprogress/
<other-domain>/
common/
```

각 Domain 내부는 Layered MVC를 사용한다. (ADR-0005, 상세: `docs/architecture/overview.md` §6)

```text
controller/
service/
entity/
repository/
dto/
exception/
```

Interface는 Existing LearnersHigh / File Storage / Delivery / AI 같은 외부 경계에만 둔다.

Controller에 Business Rule을 직접 구현하지 않는다.

## 10. Shared Entity

같은 실체는 Surface마다 같은 Identity와 Business State를 사용한다.

```text
Task
├─ Student View
├─ Admin View
└─ Parent Report View
```

화면마다 별도 Task / Student / Mentor Mock Entity를 만들지 않는다.

Dashboard Counter도 가능한 한 실제 Shared Entity에서 계산한다.

## 11. API Contract

Frontend와 Backend가 각자 JSON Shape을 만들지 않는다.

변경 순서:

```text
Feature / Domain 확인
→ api-contract.md 수정
→ Backend 구현
→ Frontend 구현
→ Test
```

새 Endpoint를 코드에 먼저 만들지 않는다.

## 12. Design

신규 화면은:

```text
Feature Spec
+ Claude Design Mockup
+ TDS Web Guidelines
```

를 기준으로 한다.

기존 LearnersHigh 화면은 Navigation / Context / IA / Existing Interaction 참고용이다.

기존 Visual Style 또는 TDS Mobile 화면을 그대로 복사하지 않는다.

## 13. References

다음 경로는 기본 Read-only다.

```text
references/**
docs/source/**
```

명시적 요청 없이 삭제, Rename, 이동, 원본 수정하지 않는다.

## 14. Privacy / AI

AI 역할:

```text
Analysis
Suggestion
Draft
Candidate
```

AI/Admin이 Student 원문이나 Reflection을 대신 작성하지 않는다.

Mentor에게 다음을 노출하지 않는다.

```text
Student 실명
학교
기관
상세 학습관리 데이터
불필요한 PII
```

Record / Case는:

```text
PII Detection
→ Admin Review
→ Published
```

를 따른다.

Parent Report에는 Raw AI, 내부 Feedback 원문, 미확정 기록을 확정 정보처럼 표현한 내용, Student 미동의 Artifact를 포함하지 않는다.

## 15. Do Not Guess

다음은 임의로 확정하지 않는다.

```text
Spec / Mockup 충돌
Domain / API 충돌
Ownership 불명확
Reference 누락
미확정 Enum / State
기존 LearnersHigh API / DB / Auth
```

절차:

```text
충돌 확인
→ 영향 범위 정리
→ 최소 변경안 제시
→ 사용자 확인
→ 확인 후 구현
```

## 16. Open Decisions

`domain.md` 또는 `api-contract.md`의 Open Decision은 Claude가 임의로 닫지 않는다.

예:

```text
ParentReport Status
Q&A reassign 의미
Topic Approval Enum
Connection Status
Archive Persistence
Mentor Record / Case Review State
Existing LearnersHigh 실제 API
Authentication 방식
```

## 17. ADR

Accepted ADR과 충돌하는 구조를 임의로 구현하지 않는다.

```text
ADR-0001 Student / Admin / Mentor Surface 분리
ADR-0002 Existing LearnersHigh Integration Boundary
ADR-0003 Shared Feedback Queue
ADR-0004 Parent App 없이 Parent Report 전달
ADR-0005 Backend Layered MVC (Proposed)
```

중요한 방향 변경은 새 ADR로 Supersede한다.

## 18. Implementation Workflow

```text
Requirement
→ Ownership
→ Domain
→ Existing 기능 중복 확인
→ API Contract
→ Backend
→ Frontend State/API
→ Screen
→ Interaction
→ Loading / Empty / Error
→ Cross-Surface 확인
→ Test
→ Visual Polish
```

화면별 독립 Mock부터 만든 뒤 나중에 데이터를 억지로 연결하지 않는다.

## 19. Verification

공통 Script가 준비된 이후 완료 보고 전 실행한다.

```powershell
scripts/verify.ps1
```

필요 시:

```powershell
scripts/verify-frontend.ps1
scripts/verify-backend.ps1
```

Test / Build / Typecheck / Lint가 실패하면 완료라고 보고하지 않는다.

## 20. Completion Report

완료 보고에는 최소한 다음을 포함한다.

```text
- 구현한 기능
- 변경 파일
- API / DB 변경 여부
- 다른 Surface / 담당자 영향
- 실행한 검증
- 남은 Blocker / Open Decision
```

검증하지 않은 내용을 `정상 동작`, `완료`, `문제 없음`이라고 단정하지 않는다.

## 21. Progress

작업 상태:

```text
docs/specs/<owner>/progress.md
```

Progress는 Requirement Source가 아니다.

Spec을 Progress에 맞추지 않고, Progress를 실제 구현 상태에 맞춘다.

## 22. Prohibited Actions

```text
- 기존 LearnersHigh 전체 재구현
- 기존 기능 중복 구현
- 다른 담당자 Feature 임의 수정
- Counseling 기능을 Suyeon 영역에 구현
- Surface별 동일 Entity 복제
- API Contract 없이 JSON Shape 생성
- Mockup만 보고 Business Logic 생성
- 기존 API / DB 구조 추측
- Open Decision 임의 확정
- Reference 원본 임의 수정
- Dashboard KPI를 임의 Mock Counter로 관리
- 테스트 실패 상태에서 완료 보고
```

## 23. Core Principle

```text
Read before coding.
Reuse before rebuilding.
Contract before implementation.
One entity, many views.
Respect ownership.
Do not guess.
Verify before completion.
```
