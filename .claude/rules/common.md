# Common Rules

이 규칙은 `learnershigh-extension` 프로젝트의 모든 작업에 적용한다.

## 1. 작업 전 필수 확인

작업 시작 전에 최소한 다음을 확인한다.

```text
CLAUDE.md
docs/SOURCE_OF_TRUTH.md
docs/OWNERSHIP.md
관련 Feature Spec
관련 domain.md
관련 api-contract.md 구간
```

필요한 문서가 없거나 서로 충돌하면 추측해서 구현하지 않는다.

## 2. Project Scope

이 프로젝트는 기존 LearnersHigh 전체를 다시 만드는 프로젝트가 아니다.

기존 기능이 필요하면 먼저 재사용 / 연결을 검토한다.

금지:

```text
기존 Study Timer 재구현
기존 Plan 재구현
기존 Library 재구현
기존 Learning History 재구현
기존 Report / Statistics 재구현
기존 수행평가를 별도 시스템으로 중복 구현
```

기존 LearnersHigh와의 연결은:

```text
docs/architecture/integration-boundary.md
```

를 따른다.

## 3. Ownership

코드 폴더는 사람 이름이 아니라 Feature / Domain 기준으로 구성한다.

금지:

```text
suyeon/
wankyu/
ext/
```

담당자는 파일 작성자나 폴더 위치를 보고 추측하지 않는다.

반드시:

```text
docs/OWNERSHIP.md
```

를 확인한다.

다른 담당자 영역의 기능을 임의로 수정하지 않는다.

## 4. Counseling Boundary

상담 관련 기능 전체는 Wankyu 담당이다.

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
Counseling-derived Today Board Action
Counseling-derived Operations KPI
```

필요한 경우 Integration Boundary 또는 Shared Contract만 정의한다.

## 5. Source of Truth

Concern별 기준:

```text
Feature Behavior
→ docs/specs/<owner>/features/*.md

Entity / State
→ docs/specs/<owner>/domain.md

API Request / Response
→ docs/api/api-contract.md

Architecture
→ docs/architecture/

Visual Principle
→ docs/design/tds-web-guidelines.md

New Layout
→ references/claude-design-mockup/

Existing LearnersHigh Context
→ docs/product/existing-runners-high-analysis.md
→ references/existing-runners-high/screens/

Architecture Decision
→ docs/adr/
```

코드가 문서와 다르다고 해서 코드를 자동으로 정답으로 간주하지 않는다.

## 6. Do Not Guess

다음은 임의로 확정하지 않는다.

```text
미정 Enum
미정 Status
미정 API
기존 LearnersHigh DB Table / Column
기존 Authentication 방식
기존 PK Type
미정 Storage Provider
미정 External Provider
```

Open Decision은 `domain.md`, `api-contract.md`, ADR에서 먼저 해결한다.

## 7. Shared Entity

같은 실체는 Surface마다 같은 Identity와 Business State를 사용한다.

금지:

```text
화면마다 별도 Student 생성
화면마다 별도 Task 생성
화면마다 별도 Mentor 생성
Dashboard용 임시 Counter를 Source of Truth로 사용
```

View Model은 달라도 Domain Identity는 같아야 한다.

## 8. Cross-Surface State

Student / Admin / Mentor 중 한 Surface에서 상태가 변하면
관련 다른 Surface의 다음 값도 일관되게 갱신되어야 한다.

```text
Counter
Badge
Status
Queue
List
Next Action
```

상태 변경의 부수 효과를 화면 코드에 흩어놓지 않는다.

## 9. API Contract

새 API를 만들기 전에:

```text
Feature Requirement
→ Domain Responsibility
→ 기존 API 재사용 가능 여부
→ api-contract.md
→ Backend
→ Frontend
→ Test
```

순서로 진행한다.

Frontend와 Backend가 각자 JSON Shape을 만들지 않는다.

## 10. Reference Files

다음은 기본 Read-only다.

```text
references/**
docs/source/**
```

명시적 요청 없이:

```text
삭제
이름 변경
이동
원본 수정
```

하지 않는다.

## 11. AI Guardrail

AI는 다음 역할까지만 수행한다.

```text
Analysis
Suggestion
Draft
Candidate
```

AI가 Student 원문이나 Reflection을 대신 작성하지 않는다.

최종 판단 / 공개가 필요한 곳에서는 Human Review를 유지한다.

## 12. Privacy

Mentor에게 다음을 노출하지 않는다.

```text
Student 실명
학교
기관
상세 학습관리 데이터
불필요한 PII
```

Parent Report에는 다음을 포함하지 않는다.

```text
Raw AI
Internal Feedback 원문
미확정 School Record를 확정 정보처럼 표현한 내용
Student 미동의 Artifact
```

## 13. Error / Empty 구분

연동 실패를 빈 데이터로 처리하지 않는다.

예:

```text
Existing Plan API 실패
≠
Plan이 없음
```

사용자가 Empty와 Error를 구분할 수 있어야 한다.

## 14. 변경 범위 최소화

요청받은 Feature를 구현하기 위해
관련 없는 파일을 함께 정리하거나 대규모 Refactor하지 않는다.

필요한 최소 변경을 우선한다.

별도 Refactor가 필요하면 이유와 영향 범위를 먼저 보고한다.

## 15. 완료 보고

완료라고 말하기 전에 실제 검증을 실행한다.

완료 보고에는 최소한 다음을 포함한다.

```text
구현 기능
변경 파일
API / DB 변경
다른 Surface / 담당자 영향
검증 명령과 결과
남은 Blocker / Open Decision
```

검증하지 않은 내용을 `정상 동작`, `완료`, `문제 없음`이라고 단정하지 않는다.
