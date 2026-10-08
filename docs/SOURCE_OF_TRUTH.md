# LearnersHigh Extension — Source of Truth

> 이 문서는 `learnershigh-extension` 프로젝트에서 **어떤 자료를 어떤 상황에서 최종 기준으로 사용할지** 정의한다.  
> Claude Code와 모든 개발자는 구현 전에 이 문서를 먼저 확인한다.  
> 목적은 Spec, Mockup, 기존 LearnersHigh 화면, API 문서, 코드가 서로 다를 때 **임의 해석과 중복 구현을 방지하는 것**이다.

---

# 1. 적용 범위

프로젝트 루트:

```text
C:\learnershigh-extension
```

이 프로젝트는 기존 LearnersHigh 전체를 새로 만드는 프로젝트가 아니다.

기존 LearnersHigh의 다음 자산은 가능한 한 유지하고 연결한다.

- Student / Admin 기존 Navigation Context
- 순공 측정
- 학습계획
- Library
- 학습 이력
- Report
- Statistics
- 기존 수행평가 데이터
- 관리자 지점 / 학생 관리
- Study Room 운영 데이터

신규 확장 기능은 기존 데이터와 기능 위에 연결한다.

주요 확장 영역:

```text
Mentor Hub
School & Admissions
Student Management
Parent Progress
+ 팀원 담당 확장 기능
```

신규 확장 기능은 Student / Admin / Mentor Surface에서 사용될 수 있으며,
서로 다른 화면이 동일한 Entity와 State를 공유할 수 있다.

---

# 2. 가장 중요한 원칙

## 2-1. 추측해서 구현하지 않는다

다음 상황에서는 Claude Code가 임의로 결정해서 구현하지 않는다.

- 두 문서의 요구사항이 서로 다름
- Feature Spec과 Mockup의 동작이 다름
- API Contract와 Frontend 사용 방식이 다름
- Domain State와 화면 Status가 다름
- 기존 LearnersHigh 기능이 실제로 존재하는지 불명확함
- 담당자 경계가 불명확함
- 필요한 Reference 파일이 존재하지 않음
- 이미지와 문서만으로 Interaction을 확정할 수 없음

이 경우:

```text
1. 충돌한 자료를 확인한다.
2. 어떤 항목이 충돌하는지 구체적으로 정리한다.
3. Source of Truth 규칙으로 해결 가능한지 판단한다.
4. 해결할 수 없으면 구현을 중단한다.
5. 사용자에게 충돌 내용을 보고하고 확인받는다.
```

---

## 2-2. 없는 기능이나 데이터를 임의로 만들지 않는다

문서에 없는 다음 요소를 편의를 위해 추가하지 않는다.

- Entity
- API
- DB Column
- Status
- Role
- Permission
- Navigation
- 자동화된 Workflow
- 관리자 권한
- AI 기능
- 사용자 데이터
- Mock 숫자
- 새로운 비즈니스 규칙

필요성이 발견되면 먼저 변경 필요성을 보고한다.

---

## 2-3. 기존 LearnersHigh를 중복 구현하지 않는다

기존 LearnersHigh에 이미 존재하는 기능이 확장 기능에서 필요하더라도,
편의를 위해 같은 기능을 다시 구현하지 않는다.

예:

```text
기존 Plan이 필요함
→ 신규 Plan 시스템 생성 금지
→ Integration Boundary를 통해 기존 Plan과 연결

기존 Library가 필요함
→ 신규 Library 생성 금지
→ 기존 Library Identifier / Adapter 사용

기존 Study Time이 필요함
→ 신규 Study Timer 구현 금지
→ 기존 Study Data 연결
```

기존 기능 연결 방식은 다음 문서를 따른다.

```text
docs/architecture/integration-boundary.md
```

---

# 3. Source of Truth 지도

각 정보 유형마다 최종 기준 문서가 다르다.

| 판단 대상 | 최종 기준 |
|---|---|
| 기능 요구사항 / 사용자 행동 | `docs/specs/<owner>/features/*.md` |
| Entity / 관계 / State Transition | `docs/specs/<owner>/domain.md` |
| Frontend ↔ Backend Request / Response | `docs/api/api-contract.md` |
| 시스템 구조 | `docs/architecture/overview.md` |
| 기존 LearnersHigh와의 연결 경계 | `docs/architecture/integration-boundary.md` |
| 프로젝트 공통 Naming / Data Convention | `docs/architecture/shared-conventions.md` |
| 신규 UI Design 원칙 | `docs/design/tds-web-guidelines.md` |
| 신규 화면의 구체적 Visual Layout | `references/claude-design-mockup/` |
| 기존 LearnersHigh 기능 / IA / Interaction | `docs/product/existing-runners-high-analysis.md` |
| 기존 LearnersHigh 실제 화면 | `references/existing-runners-high/screens/` |
| 담당자 / 수정 권한 / 공동 소유 영역 | `docs/OWNERSHIP.md` |
| 중요한 Architecture / Product Decision | `docs/adr/` |
| 현재 구현 진행 상태 | `docs/specs/<owner>/progress.md` |
| 실제 구현 결과 | Source Code + Test 결과 |

---

# 4. Concern별 우선순위

하나의 전역 우선순위를 모든 문제에 적용하지 않는다.

**무엇에 대한 충돌인지 먼저 판단한 뒤 해당 Concern의 Source of Truth를 사용한다.**

---

## 4-1. 기능 / Interaction

기능이 어떻게 동작해야 하는지 판단할 때:

```text
1. Feature Spec
2. Domain
3. API Contract
4. ADR
5. Architecture
6. Mockup
7. 기존 LearnersHigh Reference
```

예:

```text
Mockup에는 버튼이 있지만
Feature Spec에 Action이 정의되어 있지 않음

→ 버튼만 보고 새로운 동작을 만들지 않는다.
→ Feature Spec을 우선한다.
→ 필요한 경우 확인 요청.
```

---

## 4-2. Entity / State / 데이터 전파

다음 사항은 `domain.md`를 최우선으로 한다.

- Entity
- Entity Relationship
- State
- State Transition
- Cross-Surface State
- Derived Status
- Data Propagation
- Canonical Fixture / Seed 기준

우선순위:

```text
1. domain.md
2. Feature Spec
3. api-contract.md
4. ADR
5. 구현 코드
```

코드가 Domain 문서와 다르다고 해서 코드 상태를 자동으로 정답으로 간주하지 않는다.

---

## 4-3. API

다음 사항은 `api-contract.md`가 최종 기준이다.

- HTTP Method
- Endpoint
- Path Parameter
- Query Parameter
- Request Body
- Response Body
- Error Code
- Status Code
- 인증 / 권한에 필요한 API 수준 규칙
- API 호출에 따른 State Change

우선순위:

```text
1. docs/api/api-contract.md
2. domain.md
3. Feature Spec
4. Backend 구현
5. Frontend 구현
```

Frontend와 Backend가 서로 다른 JSON Shape을 독립적으로 만들지 않는다.

API 변경이 필요하면:

```text
api-contract.md
→ 관련 domain/spec 검토
→ Backend
→ Frontend
→ Test
```

순서로 반영한다.

---

## 4-4. 신규 화면 Visual / Layout

신규 확장 화면의 구체적인 화면 구성은 Claude Design Mockup을 우선 참고한다.

```text
references/claude-design-mockup/
```

현재 주요 Reference:

```text
references/claude-design-mockup/
├─ MentorHub/
├─ School&Admissions/
└─ AdminStudentManagement/
```

Mockup에서 확인할 항목:

- Layout
- Section 순서
- Card / Table 배치
- 정보 밀도
- 주요 CTA 위치
- Tab 구조
- Desktop / Tablet 화면 구성
- Detail 화면의 시각적 관계

단, Mockup은 **비즈니스 로직의 Source of Truth가 아니다.**

Mockup에 보이는 텍스트나 버튼 때문에:

- 새로운 Entity
- 새로운 Status
- 새로운 API
- 새로운 Permission
- 새로운 Workflow

를 임의로 생성하지 않는다.

---

# 5. TDS와 신규 UI

신규 확장 UI의 디자인 원칙은 다음 문서를 따른다.

```text
docs/design/tds-web-guidelines.md
```

여기에는:

- TDS 공식 URL
- Color
- Typography
- Component hierarchy
- State
- Feedback
- Overlay
- Accessibility
- Mobile → Desktop / Tablet Web 재해석 규칙

을 정의한다.

TDS Mobile 화면을 그대로 복사하지 않는다.

```text
TDS
→ Design Principle / Component Behavior 참고

Claude Design Mockup
→ LearnersHigh 신규 화면의 구체적인 Layout 참고

Feature Spec
→ 실제 기능 / Interaction 기준
```

---

# 6. 기존 LearnersHigh Reference 사용 규칙

기존 LearnersHigh 관련 자료:

```text
docs/product/existing-runners-high-analysis.md

references/existing-runners-high/
├─ source/
└─ screens/
   ├─ student/
   └─ admin/
```

기존 화면은 다음을 이해하는 데 사용한다.

- 기존 Navigation
- Sidebar / Header Context
- 기존 기능 위치
- 기존 화면 간 이동
- 정보 밀도
- List → Detail 구조
- 학생 / 관리자 Context
- 기존 데이터 표시 방식
- 기존 Feature와 신규 Feature의 연결 지점

기존 화면은 다음 용도로 사용하지 않는다.

- 신규 확장 화면의 Color 복제
- 기존 Font Style 복제
- 기존 Button Style 복제
- 기존 Card Style 복제
- 오래된 Visual Pattern을 신규 UI에 그대로 사용

정리하면:

```text
기존 LearnersHigh
→ Context / IA / Existing Interaction

TDS + Claude Design Mockup
→ 신규 Extension Visual
```

---

# 7. Feature Spec

각 담당자의 실제 기능 구현 기준은 다음 위치에 둔다.

```text
docs/specs/
├─ suyeon/
│  └─ features/
└─ wangyu/
   └─ features/
```

수연 담당 Feature Spec:

```text
docs/specs/suyeon/features/
├─ mentor-hub.md
├─ school-admissions.md
├─ student-management.md
└─ parent-progress.md
```

Feature Spec에는 해당 기능의:

- Goal
- User
- Entry
- Screen
- State
- Interaction
- Data
- Cross-Surface Effect
- Loading
- Empty
- Error
- Permission
- Privacy
- Back Context
- Acceptance Criteria
- Visual Reference

를 정의한다.

Feature를 구현할 때는 관련 Feature Spec을 반드시 먼저 읽는다.

---

# 8. Domain 문서

각 담당자는 자신의 기능 영역에서 사용하는 Domain을 다음 위치에 정의한다.

```text
docs/specs/suyeon/domain.md
docs/specs/wangyu/domain.md
```

공통 Entity를 변경하거나 두 담당자의 Domain이 연결되는 경우 한 사람의 판단으로 수정하지 않는다.

예:

```text
Student
Task
Version
Feedback
Evidence
Activity
TestResult
SchoolRecordSnapshot
ParentReport
```

처럼 여러 Surface 또는 여러 Feature가 사용하는 Entity는 변경 전 영향 범위를 확인한다.

공통 Entity 변경이 필요하면:

```text
1. OWNERSHIP 확인
2. 두 Domain에 미치는 영향 확인
3. api-contract 영향 확인
4. DB 영향 확인
5. 필요한 경우 ADR 작성
6. 합의 후 구현
```

---

# 9. Ownership

담당자 및 수정 경계의 최종 기준은:

```text
docs/OWNERSHIP.md
```

이다.

Claude Code는 담당 기능을 파일명이나 Git 작성자 이름으로 추측하지 않는다.

금지:

```text
"이 파일이 suyeon 폴더 근처에 있으니 수연 담당일 것이다."
"이 Controller를 완규가 만들었으니 완규 Domain일 것이다."
```

반드시 `OWNERSHIP.md`를 확인한다.

다른 담당자 소유 기능을 수정해야 할 것 같으면 즉시 수정하지 말고 영향 범위를 보고한다.

---

# 10. ADR

이미 합의된 중요한 결정을 다시 설계하지 않도록 Architecture Decision Record를 사용한다.

위치:

```text
docs/adr/
```

예:

```text
0001-separate-student-admin-mentor-surfaces.md
0002-existing-learnershigh-integration-boundary.md
0003-shared-feedback-queue.md
0004-parent-report-without-parent-app.md
```

ADR은 다음 상황에서 작성한다.

- 두 가지 이상의 Architecture 선택지가 있었음
- 나중에 다시 논쟁될 가능성이 높음
- 여러 Feature에 영향을 줌
- 기존 Spec과 다른 방향으로 가기로 결정함
- API / DB 구조에 장기 영향을 줌
- Integration 전략을 결정함

사소한 UI 수정마다 ADR을 만들지 않는다.

Accepted ADR과 충돌하는 구현은 임의로 진행하지 않는다.

ADR을 변경해야 한다면 기존 ADR을 조용히 수정하기보다 새로운 ADR 또는 명시적인 Superseded 기록을 사용한다.

---

# 11. API Contract

Frontend와 Backend 사이의 계약은 다음 문서 하나를 기준으로 한다.

```text
docs/api/api-contract.md
```

Endpoint를 구현하기 전 다음 항목이 정의되어 있어야 한다.

- Method
- Path
- Actor / Permission
- Request
- Response
- Error
- State Change

예:

```text
POST /api/student/tasks/{taskId}/versions
```

Frontend에서 먼저 임의 Response Shape을 만들거나,
Backend에서 Frontend와 협의 없이 Response 구조를 변경하지 않는다.

---

# 12. Reference 파일은 Read-only로 취급한다

다음 경로는 기본적으로 구현 결과물이 아니라 Reference다.

```text
references/**
docs/source/**
```

Claude Code는 명시적인 요청 없이 다음 작업을 하지 않는다.

- 이미지 삭제
- 이미지 Rename
- 원본 PDF 수정
- Reference 위치 이동
- Source Archive 수정
- Mockup 내용 재작성

Reference에 오류가 의심되면 수정하기 전에 보고한다.

---

# 13. Source Archive

초기 기획 문서나 통합 전 원본 문서는:

```text
docs/source/archive/
```

에 보관할 수 있다.

이 폴더의 문서는 역사적 근거 또는 원문 확인용이다.

**현재 구현의 직접 Source of Truth로 사용하지 않는다.**

예를 들어 기존의 큰 통합 Spec이 Feature별 문서로 분리된 뒤에는:

```text
docs/source/archive/learnershigh-suyeon-feature-spec.md
```

처럼 보관할 수 있다.

분할이 완료된 이후 실제 구현 기준은:

```text
docs/specs/suyeon/domain.md
docs/specs/suyeon/features/*.md
```

이다.

---

# 14. Progress 문서

현재 개발 상태는 다음 문서에 기록한다.

```text
docs/specs/suyeon/progress.md
docs/specs/wangyu/progress.md
```

Progress는 Requirement Source가 아니다.

Progress의 목적:

- Current
- In Progress
- Next
- Done
- Blocked
- Verification
- Last Updated

를 기록하는 것이다.

`progress.md`에 기능이 `Done`이라고 적혀 있어도 실제 Test가 실패하면 완료로 간주하지 않는다.

---

# 15. Source Code와 문서의 관계

Source Code는 실제 실행 상태를 보여주지만,
요구사항을 결정하는 최상위 Source of Truth는 아니다.

예:

```text
Feature Spec = A
현재 Code = B
```

이면:

```text
"코드가 이미 B이므로 B가 정답"
```

으로 판단하지 않는다.

먼저 다음을 확인한다.

```text
1. Feature Spec이 최신인가?
2. ADR에서 변경된 결정이 있는가?
3. API Contract가 변경되었는가?
4. 구현 중 미반영 상태인가?
```

문서가 명확하고 코드만 잘못된 경우 코드를 수정한다.

문서 자체가 충돌하면 먼저 문서를 정리한 뒤 코드를 수정한다.

---

# 16. 테스트와 완료 판단

기능 완료 여부는 화면이 보이는지만으로 판단하지 않는다.

완료 기준:

```text
Requirement
+ Domain
+ API Contract
+ Interaction
+ Cross-Surface State
+ Loading / Empty / Error
+ Back Context
+ Permission / Privacy
+ Test
```

공통 검증 Script가 준비된 이후에는:

```text
scripts/verify.ps1
```

을 완료 보고 전에 실행한다.

검증 실패가 남아 있으면 `완료`라고 보고하지 않는다.

---

# 17. Claude Code 작업 전 읽기 순서

모든 작업에서 전체 문서를 무조건 읽지 않는다.

작업과 관련된 문서만 필요한 순서로 읽는다.

## 공통 시작

```text
1. CLAUDE.md
2. docs/SOURCE_OF_TRUTH.md
3. docs/OWNERSHIP.md
```

## Feature 구현

```text
4. 관련 docs/specs/<owner>/domain.md
5. 관련 docs/specs/<owner>/features/<feature>.md
6. docs/api/api-contract.md의 관련 API
7. docs/design/tds-web-guidelines.md
8. 관련 Claude Design Mockup
```

## 기존 LearnersHigh와 연결하는 작업

추가로:

```text
9. docs/architecture/integration-boundary.md
10. docs/product/existing-runners-high-analysis.md
11. 관련 references/existing-runners-high/screens/
```

## Architecture 변경

추가로:

```text
12. docs/architecture/overview.md
13. docs/architecture/shared-conventions.md
14. 관련 docs/adr/
```

---

# 18. 충돌 해결 절차

두 Source가 충돌하면 아래 Template으로 정리한다.

```text
[CONFLICT]

작업:
<현재 구현하려는 기능>

Source A:
<파일 경로 / 항목>

Source B:
<파일 경로 / 항목>

충돌 내용:
<무엇이 서로 다른지>

Source of Truth 판단:
<어떤 Concern인지>
<어떤 문서가 우선인지>

영향 범위:
Frontend:
Backend:
Database:
API:
Other Surface:

제안:
<최소 변경안>

상태:
WAITING FOR CONFIRMATION
```

Source of Truth 규칙만으로 명확히 해결할 수 있다면 해당 기준을 따른다.

해결할 수 없다면 사용자 확인 전 구현을 진행하지 않는다.

---

# 19. 변경 시 함께 확인해야 하는 문서

하나의 변경이 다른 문서에도 영향을 줄 수 있다.

## Feature 변경

확인:

```text
feature spec
domain.md
api-contract.md
progress.md
test
```

## Entity / State 변경

확인:

```text
domain.md
feature spec
api-contract.md
database
seed
frontend types
backend domain
test
```

## API 변경

확인:

```text
api-contract.md
frontend api client
backend controller/dto
test
```

## Visual 변경

확인:

```text
feature spec
tds-web-guidelines.md
Claude Design Mockup
responsive behavior
```

## Existing Integration 변경

확인:

```text
integration-boundary.md
existing-runners-high-analysis.md
관련 existing screenshots
api-contract.md
ADR
```

---

# 20. 금지 사항

Claude Code는 명시적인 승인 없이 다음 행동을 하지 않는다.

```text
- 기존 LearnersHigh 전체 재구현
- 기존 기능을 신규 확장 기능 안에 중복 구현
- 다른 담당자 Feature 임의 수정
- Shared Entity 임의 변경
- API Contract 없이 새로운 API Shape 작성
- Mockup만 보고 새로운 Business Logic 생성
- 이미지에 없는 상태를 디자인 편의를 위해 임의 생성
- Reference / Source 원본 수정
- 테스트 실패 상태에서 완료 보고
- 임시 Mock Counter를 실제 Domain 값처럼 사용
- 한 화면만 맞추기 위해 Cross-Surface State를 깨뜨리는 수정
- 서로 다른 Entity를 화면마다 별도 Mock으로 생성
```

---

# 21. 문서 작성 원칙

모든 Harness 문서는 다음 원칙을 따른다.

### Single Responsibility

한 문서는 한 종류의 결정만 책임진다.

예:

```text
Feature behavior
→ Feature Spec

Entity / State
→ domain.md

API
→ api-contract.md

Architecture decision
→ ADR
```

### Link, Don't Duplicate

같은 내용을 여러 문서에 복사하지 않는다.

예:

```text
Feature Spec에 전체 TDS URL 복사 X
→ tds-web-guidelines.md 링크

Feature Spec에 API Response 전체 중복 X
→ api-contract.md 링크
```

### Current Docs over Archive

```text
docs/specs/**
docs/architecture/**
docs/api/**
docs/design/**
docs/adr/**
```

가 현재 기준이다.

```text
docs/source/archive/**
```

는 현재 기준이 아니다.

### Repository-relative Path

문서 안에서 프로젝트 내부 파일을 참조할 때는 가능한 한 Repository 상대경로를 사용한다.

좋은 예:

```text
references/claude-design-mockup/MentorHub/
docs/specs/suyeon/features/mentor-hub.md
```

피해야 할 예:

```text
C:\learnershigh-extension\references\...
```

Windows 절대경로는 위치 설명이 반드시 필요한 경우에만 병기한다.

---

# 22. 핵심 요약

Claude Code가 판단할 때 가장 먼저 기억해야 할 기준:

```text
무엇을 만들까?
→ Feature Spec

데이터가 어떻게 움직일까?
→ domain.md

Frontend와 Backend가 어떻게 통신할까?
→ api-contract.md

전체 시스템은 어떻게 나뉘나?
→ architecture/

기존 LearnersHigh와 어떻게 연결할까?
→ integration-boundary.md

누가 수정할 수 있나?
→ OWNERSHIP.md

신규 화면을 어떻게 보이게 할까?
→ Claude Design Mockup + tds-web-guidelines.md

기존 화면은 어떻게 동작했나?
→ existing-runners-high-analysis.md + existing screenshots

왜 이렇게 결정했나?
→ ADR

무엇까지 구현됐나?
→ progress.md + 실제 Test
```

충돌이 해결되지 않으면:

```text
추측하지 않는다.
임의 구현하지 않는다.
먼저 보고하고 확인받는다.
```
