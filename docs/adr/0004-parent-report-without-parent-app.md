# ADR-0004: Deliver Parent Progress Without a Separate Parent App

- Status: Accepted
- Date: 2026-10-09

## Context

Parent Progress의 목적은 학부모가 새로운 LearnersHigh Parent Surface를 직접 사용하는 것이 아니라,
Admin이 학생의 검토된 월간 상태를 Report로 구성해 전달하는 것이다.

Parent Progress에서 사용하는 주요 데이터:

```text
Study Time
Plan Execution
TestResult
Task / Final Result
TaskFinalArtifact
SchoolRecordSnapshot
Growth Activity
Mentor Application
```

Report는 실시간 Raw Data Dashboard가 아니라
검토된 월간 Snapshot이다.

또한 Parent Report에는 다음 Privacy / Validation 요구가 있다.

```text
- AI Raw와 내부 Feedback 원문을 공개하지 않는다.
- candidate SchoolRecord를 confirmed처럼 표현하지 않는다.
- Student가 동의하지 않은 Final Artifact를 첨부하지 않는다.
```

따라서 별도 Parent Login / Navigation / App을 만드는 것보다
Admin Review를 거친 Report Delivery가 현재 요구사항에 더 적합하다.

---

## Decision

현재 LearnersHigh Extension에서는
**별도 Parent App / Web Surface를 만들지 않는다.**

흐름:

```text
Shared Student Data
        │
        ▼
Monthly Aggregation
        │
        ▼
AI Draft
        │
        ▼
Admin Review
        │
        ▼
Artifact Consent Check
        │
        ▼
Validation
        │
        ▼
Preview
        │
        ▼
PDF / Image Generate
        │
        ▼
Kakao Delivery
```

Parent는 현재 Architecture에서
Report를 전달받는 수신자로 취급한다.

Parent Account / Parent Navigation / Parent Dashboard는
현재 범위에 포함하지 않는다.

---

## Consequences

### Positive

```text
- 신규 Parent 인증 / 계정 / Navigation 시스템을 만들 필요가 없다.
- Admin Review를 거쳐 검증된 정보만 전달할 수 있다.
- 월간 Snapshot으로 정보의 시점을 고정할 수 있다.
- Student Artifact 동의와 SchoolRecord 검증을 발송 전에 통제할 수 있다.
```

### Cost / Constraint

```text
- Parent는 실시간 Dashboard를 직접 탐색할 수 없다.
- Report 생성 / Preview / Export / Delivery 흐름이 필요하다.
- 전달 상태를 외부 Delivery Provider와 연동할 가능성이 있다.
- Report Snapshot과 현재 실시간 상태가 다를 수 있으므로 시점을 명확히 해야 한다.
```

---

## Alternatives Considered

### Alternative A — Parent 전용 Web/App 구축

선택하지 않은 이유:

```text
- 현재 요구사항 범위를 넘어선다.
- Parent 인증 / Account / Permission / Navigation이 새로 필요하다.
- Raw 운영 데이터를 어디까지 공개할지 별도 Privacy Model이 필요하다.
```

### Alternative B — Admin Dashboard 화면을 그대로 Parent에게 공유

선택하지 않은 이유:

```text
- 내부 Admin 정보가 포함될 수 있다.
- AI Raw / 내부 Feedback / candidate 기록을 그대로 노출할 위험이 있다.
- Parent용 정보 우선순위와 맞지 않는다.
```

---

## Implementation Constraints

```text
1. 별도 Parent App / Web / Login / Navigation을 임의로 추가하지 않는다.

2. ParentReport는 실시간 Raw Data가 아니라 월간 Snapshot을 사용한다.

3. AI는 Draft까지만 만들고 Admin 확인 후 공개한다.

4. AI Raw와 내부 Feedback 원문을 Parent Output에 포함하지 않는다.

5. SchoolRecordSnapshot의 candidate를 confirmed처럼 표현하지 않는다.

6. Student 미동의 TaskFinalArtifact를 첨부하지 않는다.

7. Artifact Share는 Student 동의를 기준으로 한다.

8. Report 발송 전 Validation을 통과해야 한다.

9. PDF/Image 출력은 Print-friendly Light Theme을 사용한다.

10. Parent Surface가 필요해지는 경우 이 ADR을 새 ADR로 재검토한다.
```

---

## Related Documents

```text
docs/specs/suyeon/domain.md
docs/specs/suyeon/features/parent-progress.md
docs/api/api-contract.md
docs/design/tds-web-guidelines.md
docs/architecture/overview.md
```
