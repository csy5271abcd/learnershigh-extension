# Suyeon Feature Specs

> 위치: `docs/specs/suyeon/`  
> 목적: 최수연 담당 LearnersHigh Extension 기능의 **Domain, Feature Behavior, 진행 상태**를 관리한다.  
> 이 폴더는 사람 이름으로 Source Code를 나누기 위한 폴더가 아니다. 담당자별 요구사항과 책임 경계를 문서화하기 위한 공간이다.

---

## 1. 담당 범위

Suyeon 담당 주요 영역:

```text
Mentor Hub
Mentor Surface
School & Admissions
Admin Student Management
Parent Progress
```

코드는 사람 이름이 아니라 Feature / Domain 기준으로 둔다.

예:

```text
frontend/student/src/features/mentor-hub/
frontend/student/src/features/school-admissions/
frontend/admin/src/features/student-management/
frontend/admin/src/features/parent-progress/

backend/.../mentor/
backend/.../school/
backend/.../studentmanagement/
backend/.../parentprogress/
```

다음과 같은 구조는 만들지 않는다.

```text
frontend/**/suyeon/
backend/**/suyeon/
backend/**/ext/
```

---

## 2. 이 폴더의 문서

```text
docs/specs/suyeon/
├─ README.md
├─ domain.md
├─ progress.md
└─ features/
   ├─ mentor-hub.md
   ├─ school-admissions.md
   ├─ student-management.md
   └─ parent-progress.md
```

### `domain.md`

Suyeon 담당 기능이 공유하는:

```text
Entity
Relationship
State
State Transition
Cross-Surface propagation
Invariant
Derived State
Open Decision
```

을 정의한다.

화면마다 같은 Entity를 다시 정의하지 않는다.

### `features/*.md`

각 기능의:

```text
User Goal
Surface
Screen
Interaction
Acceptance
Cross-Surface Effect
Guardrail
```

을 정의한다.

### `progress.md`

실제 작업 상태만 기록한다.

```text
Current
In Progress
Next
Done
Blocked
Verification
```

Requirement Source가 아니다.

---

## 3. 읽는 순서

Suyeon 기능 작업 전:

```text
1. /CLAUDE.md
2. /docs/SOURCE_OF_TRUTH.md
3. /docs/OWNERSHIP.md
4. 이 README
5. domain.md
6. 관련 features/*.md
7. /docs/api/api-contract.md
```

UI 작업이면 추가:

```text
/docs/design/tds-web-guidelines.md
관련 references/claude-design-mockup/
```

기존 LearnersHigh 연동 작업이면 추가:

```text
/docs/architecture/integration-boundary.md
/docs/product/existing-runners-high-analysis.md
관련 references/existing-runners-high/screens/
```

---

## 4. Feature Map

### Mentor Hub

문서:

```text
features/mentor-hub.md
```

범위:

```text
Student Mentor Hub Home
Mentor Profile
Plan
Routine
Story
Q&A
Record
Case
Mentor My Content
Mentor Q&A Inbox
Mentor Profile Management
```

---

### School & Admissions

문서:

```text
features/school-admissions.md
```

범위:

```text
Task
Topic
Evidence
Version
AI Analysis
Feedback
Revision
Final Artifact
Growth Activity
Reflection
Archive
Connection
Interview Preparation
```

여기서 `Interview`는 **면접 준비 기능**을 의미한다.

Admissions Counseling은 Suyeon 범위가 아니다.

---

### Student Management

문서:

```text
features/student-management.md
```

범위:

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

문서:

```text
features/parent-progress.md
```

범위:

```text
Monthly Aggregation
AI Draft
Admin Review
Validation
Preview
PDF / Image
Delivery
```

별도 Parent App/Web을 만들지 않는다.

---

## 5. Counseling Boundary

상담 관련 기능 전체는 Wangyu 담당이다.

Suyeon 문서와 코드에서 다음을 정의하거나 구현하지 않는다.

```text
Counseling Entity
Counseling API
Counseling DB
Counseling CRM
Student Counseling
Parent Counseling
Joint Counseling
Counseling Brief
Counseling Follow-up
Admissions Counseling
Counseling-derived Parent Report section
Counseling-derived Today Board action
Counseling-derived Operations KPI
```

현재 Suyeon Parent Progress는 상담 데이터에 의존하지 않는다.

향후 상담 데이터 연계가 필요해지면:

```text
Scope / Ownership 변경 확인
→ Shared Contract 합의
→ Wangyu-owned 구현
→ Suyeon Consumer 연결
```

순서로 진행한다.

---

## 6. Shared Feedback Queue

Suyeon 범위에서 사용하는 Feedback Queue는 학습/Task/Activity 검토를 위한 Shared Queue다.

상담 Queue가 아니다.

금지:

```text
특정 Staff 자동 Routing
과목 기준 자동 Routing
상담 CRM Queue와 임의 통합
```

---

## 7. Existing LearnersHigh

기존 기능을 신규 Feature 안에서 중복 구현하지 않는다.

예:

```text
Plan
Library
Study Time
Existing Performance Task
```

필요 시 Integration Boundary를 통해 연결한다.

실제 Existing API / DB / Auth가 확인되지 않은 상태에서 구조를 추측하지 않는다.

---

## 8. API

Frontend와 Backend는:

```text
/docs/api/api-contract.md
```

를 공통 Contract로 사용한다.

Feature Spec이 API Endpoint 자체를 중복 소유하지 않는다.

새 API가 필요하면:

```text
Feature Requirement
→ Domain 확인
→ api-contract.md
→ Backend
→ Frontend
→ Test
```

순서로 진행한다.

---

## 9. Design

신규 UI:

```text
Feature Spec
+
Claude Design Mockup
+
TDS Web Guidelines
```

를 기준으로 한다.

기존 LearnersHigh 화면은 기존 Context / IA / Navigation / Interaction 참고용이다.

---

## 10. Open Decisions

`domain.md` 또는 `api-contract.md`의 Open Decision을
Feature 구현 편의를 위해 임의로 닫지 않는다.

결정이 필요하면:

```text
영향 범위 확인
→ 관련 문서 수정
→ 필요 시 ADR
→ 구현
```

으로 진행한다.

---

## 11. 완료 기준

Suyeon Feature는 화면이 보인다는 이유만으로 완료가 아니다.

최소 확인:

```text
Requirement
Domain State
API Contract
Interaction
Cross-Surface State
Loading
Empty
Error
Privacy
Permission
Test
```

검증 상태는 `progress.md`에 기록한다.

---

## 12. 핵심 원칙

```text
Spec은 기능을 정의한다.
Domain은 상태와 불변식을 정의한다.
API Contract는 Front/Back 연결을 정의한다.
Progress는 실제 진행 상태를 기록한다.

같은 내용을 여러 문서가 동시에 Source of Truth로 소유하지 않는다.
```
