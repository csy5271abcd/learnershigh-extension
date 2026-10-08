# ADR-0003: Use a Shared Feedback Queue

- Status: Accepted
- Date: 2026-10-09

## Context

School & Admissions와 Admin Student Management에서는
여러 종류의 검토 업무가 발생한다.

예:

```text
Task / Version Feedback
Topic Review
Growth Activity Feedback
```

기획 기준에서 Task Feedback과 Activity Feedback은
공용 Queue 원칙으로 처리한다.

또한 다음 Routing은 사용하지 않는다.

```text
- 특정 Staff 자동 Routing
- 과목 기준 자동 Routing
```

Admin의 목적은 특정 담당자에게 자동 배정된 개인 Inbox를 운영하는 것이 아니라,
현재 처리해야 할 검토 업무를 하나의 운영 관점에서 파악하고 처리하는 것이다.

---

## Decision

Feedback 업무는 **Shared Feedback Queue**를 사용한다.

개념:

```text
Task Feedback
        │
        ├─────────────┐
                      ▼
Activity Feedback → Shared Feedback Queue
                      │
                      ▼
                  Admin Review
```

Admin은 Queue를 다음과 같은 조건으로 조회 / 필터링할 수 있다.

```text
Type
Grade
Stage
Deadline
Waiting Time
Status
```

Feedback KPI는 별도의 수동 Counter가 아니라
실제 Shared Entity 상태에서 계산한다.

예:

```text
Feedback Pending
Queue 평균 첫 검토시간
48h 초과 Queue
```

---

## Consequences

### Positive

```text
- Task와 Activity 검토 업무를 하나의 운영 흐름에서 볼 수 있다.
- 특정 Staff가 부재해도 Queue 자체가 멈추지 않는다.
- Admin Dashboard KPI와 Queue 상태를 동일 데이터에서 계산할 수 있다.
- Feature별 별도 Inbox를 만드는 중복을 줄인다.
```

### Cost / Constraint

```text
- Queue Item이 어떤 원본 Entity에서 왔는지 Type/Reference가 명확해야 한다.
- Task Feedback과 Activity Feedback의 Detail View는 서로 다를 수 있다.
- Queue KPI와 실제 Entity 상태가 일치하도록 Derived 계산이 필요하다.
```

---

## Alternatives Considered

### Alternative A — Staff별 개인 Queue

선택하지 않은 이유:

```text
- 특정 Staff 자동 Routing을 요구하게 된다.
- 운영 상태가 사람 기준으로 분산될 수 있다.
```

### Alternative B — 과목별 자동 Routing

선택하지 않은 이유:

```text
- 현재 프로젝트 요구사항에 없는 배정 규칙이다.
- 과목별 담당 체계를 추가 Domain Rule로 만들어야 한다.
```

### Alternative C — Task Queue와 Activity Queue 완전 분리

선택하지 않은 이유:

```text
- Admin의 오늘 검토 업무가 여러 화면에 분산된다.
- KPI와 병목 파악이 중복된다.
```

---

## Implementation Constraints

```text
1. 특정 Staff에게 Feedback을 자동 배정하는 Rule을 추가하지 않는다.

2. Subject 기반 자동 Routing을 추가하지 않는다.

3. Queue Counter를 독립적인 Mock Number로 저장하지 않는다.

4. Queue Item은 원본 Task/Version 또는 Activity/ActivityFeedback을 추적할 수 있어야 한다.

5. Admin Review 결과는 Student Surface의 Feedback 상태에 반영되어야 한다.

6. Queue 상태 변경이 Today Board / Operations KPI에 영향을 주는 경우 Shared Entity에서 재계산한다.

7. 향후 Assignment 기능이 필요해져도 이 ADR을 조용히 우회하지 않고 새로운 결정으로 검토한다.
```

---

## Related Documents

```text
docs/specs/suyeon/domain.md
docs/specs/suyeon/features/school-admissions.md
docs/specs/suyeon/features/student-management.md
docs/api/api-contract.md
docs/architecture/overview.md
```
