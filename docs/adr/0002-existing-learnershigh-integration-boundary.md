# ADR-0002: Integrate with Existing LearnersHigh Instead of Rebuilding It

- Status: Accepted
- Date: 2026-10-09

## Context

LearnersHigh에는 이미 다음과 같은 자산이 존재한다.

```text
순공 측정
학습계획
Library
학습 이력
Report
Statistics
기존 수행평가
관리자 지점 / 학생 관리
Study Room 운영 기능
```

Extension의 목적은 이 기존 서비스를 다시 만드는 것이 아니라
기존 데이터 위에 신규 기능을 연결하는 것이다.

주요 신규 영역:

```text
Mentor Hub
School & Admissions
Student Management
Parent Progress
```

기존 기능을 Extension 내부에 다시 구현하면:

```text
- 같은 Student / Plan / Task가 두 개의 Source of Truth를 가질 수 있다.
- 기존 LearnersHigh와 Extension 사이의 데이터가 어긋날 수 있다.
- 향후 실제 통합 비용이 증가한다.
```

---

## Decision

기존 LearnersHigh와 신규 Extension 사이에
명시적인 Integration Boundary를 둔다.

개념:

```text
Existing LearnersHigh
        │
        ▼
Integration Contract / Adapter
        │
        ▼
LearnersHigh Extension
```

Extension은 기존 기능을 가능한 한 재사용한다.

예:

```text
Study Time 필요
→ 신규 Timer 구현 금지
→ 기존 Study Data 연결

Plan 필요
→ 신규 Student Plan 시스템 구현 금지
→ 기존 Plan 연결

Library 필요
→ 신규 Library 구현 금지
→ 기존 Library Reference 사용

기존 수행평가 존재
→ 동일 Task를 별도 과제로 중복 생성하지 않음
→ Extension Process를 Mapping
```

실제 기존 API / DB / 인증 방식이 확인되기 전에는
Endpoint, Table, PK Type을 추측하지 않는다.

---

## Consequences

### Positive

```text
- 기존 데이터와 신규 기능 사이의 Source of Truth가 분리되지 않는다.
- 실제 LearnersHigh 통합 시 중복 기능 제거 작업이 줄어든다.
- Extension Domain이 기존 DB Schema에 직접 종속되는 것을 줄일 수 있다.
- Mock 개발과 실제 Integration을 Adapter 교체 방식으로 연결할 수 있다.
```

### Cost / Constraint

```text
- Integration Contract 설계가 필요하다.
- 기존 시스템 구조를 확인하기 전 일부 기능은 Mock Adapter가 필요하다.
- Existing API 장애와 Empty Data를 구분해야 한다.
- 기존 Plan 등에 Write가 필요한 경우 직접 DB 수정 대신 승인된 연결 방식이 필요하다.
```

---

## Alternatives Considered

### Alternative A — Extension에 필요한 기존 기능을 빠르게 복제

선택하지 않은 이유:

```text
- Student / Plan / Task 중복
- Data Drift
- 실제 통합 시 Migration 비용 증가
```

### Alternative B — 기존 DB Table을 모든 Domain에서 직접 조회

선택하지 않은 이유:

```text
- 기존 Schema가 Extension 전체에 퍼진다.
- 기존 시스템 변경 시 영향 범위가 커진다.
- Domain과 Infrastructure Boundary가 무너진다.
```

---

## Implementation Constraints

```text
1. 기존 LearnersHigh와 같은 의미의 기능을 편의상 중복 구현하지 않는다.

2. 기존 데이터 접근은 Integration Adapter / Contract를 우선한다.

3. Frontend가 기존 DB 또는 미확정 Existing API를 직접 호출하지 않는다.

4. Mock Adapter와 Real Adapter는 같은 Extension-facing Contract를 사용한다.

5. 기존 LearnersHigh API / Table / Column / 인증 방식은 실제 확인 전 추측하지 않는다.

6. Existing Integration 실패를 빈 데이터로 숨기지 않는다.

7. 기존 데이터에 Write가 필요하면 Integration Service/API를 우선하고 직접 INSERT/UPDATE를 임의 사용하지 않는다.

8. Integration 전략을 근본적으로 바꾸려면 새 ADR을 검토한다.
```

---

## Related Documents

```text
docs/SOURCE_OF_TRUTH.md
docs/architecture/overview.md
docs/architecture/integration-boundary.md
docs/specs/suyeon/domain.md
docs/api/api-contract.md
docs/product/existing-runners-high-analysis.md
references/existing-runners-high/
```
