# ADR-0001: Separate Student, Admin, and Mentor Surfaces

- Status: Accepted
- Date: 2026-10-09

## Context

LearnersHigh Extension에는 서로 다른 목적과 권한을 가진 세 Actor가 존재한다.

```text
Student
Admin
Mentor
```

Student는 본인의 학습·학교활동·Mentor 콘텐츠를 사용한다.

Admin은 학생 상태, 수행평가 검토, 성장활동, Parent Report,
운영 병목 등을 관리한다.

Mentor는 자신의 경험 콘텐츠를 등록하고
학생의 익명 질문에 답변한다.

특히 Mentor는 Student 관리자가 아니며
학생의 실명, 학교, 기관, 상세 관리정보를 볼 수 없어야 한다.

세 Actor는 일부 Shared Entity를 사용하지만,
Navigation, 정보 밀도, 주요 Action, 권한 범위가 서로 다르다.

따라서 하나의 화면 구조 안에서 Role별 조건문만 늘리는 방식은
UI 복잡도와 권한 노출 위험을 높인다.

---

## Decision

Frontend를 다음 세 Surface로 분리한다.

```text
frontend/
├─ student/
├─ admin/
└─ mentor/
```

각 Surface는 자신의:

```text
Routing
Page
Feature
Layout
Surface-specific State
Surface-specific API usage
```

를 가진다.

공통 사용 코드만:

```text
frontend/shared/
```

에 둔다.

Backend는 Surface별로 Business Domain을 복제하지 않는다.

예:

```text
/api/student/...
/api/admin/...
/api/mentor/...
```

처럼 Actor별 API Entry가 존재할 수 있지만,
같은 `Task`, `Student`, `MentorContent`를
서로 다른 Domain Entity로 복제하지 않는다.

---

## Consequences

### Positive

```text
- Actor별 Navigation과 화면 목적이 명확해진다.
- Mentor Privacy Boundary를 명확하게 유지할 수 있다.
- Admin의 고밀도 Desktop UI와 Student/Mentor UI를 독립적으로 최적화할 수 있다.
- 권한별 API Response를 최소화하기 쉬워진다.
- 두 개발자가 Feature 단위로 병렬 작업하기 쉬워진다.
```

### Cost / Constraint

```text
- Surface별 Router / Layout 관리가 필요하다.
- 동일 UI가 반복될 가능성이 있어 Shared 승격 기준이 필요하다.
- Cross-Surface State를 화면별 별도 Mock으로 만들면 데이터가 쉽게 어긋난다.
```

따라서 Shared Entity Identity는
`docs/specs/<owner>/domain.md`를 기준으로 유지한다.

---

## Alternatives Considered

### Alternative A — 하나의 React App에서 모든 Role을 조건부 Rendering

```text
/one-app
→ role === STUDENT
→ role === ADMIN
→ role === MENTOR
```

선택하지 않은 이유:

```text
- Layout과 정보 밀도가 크게 다르다.
- Mentor Privacy Boundary가 UI 조건문에 의존하게 될 수 있다.
- Role-specific Navigation이 복잡해진다.
```

### Alternative B — Surface마다 완전히 독립된 Domain/API

선택하지 않은 이유:

```text
- 같은 Task / Student / Mentor 데이터를 중복 모델링하게 된다.
- Cross-Surface State가 쉽게 불일치한다.
```

---

## Implementation Constraints

Claude Code와 개발자는 다음을 지킨다.

```text
1. Student/Admin/Mentor 화면을 한 Feature 폴더에 무분별하게 혼합하지 않는다.

2. 사람 이름(suyeon/wankyu) 기준 Frontend 폴더를 만들지 않는다.

3. 같은 Business Entity를 Surface별로 복제하지 않는다.

4. Mentor API Response에 Student 실명, 학교, 기관, 상세 관리정보를 포함하지 않는다.

5. 실제 공통 Component/Type/API Client만 frontend/shared에 둔다.

6. Surface 구조 자체를 통합하거나 새 Surface를 추가하려면 새 ADR을 검토한다.
```

---

## Related Documents

```text
docs/SOURCE_OF_TRUTH.md
docs/OWNERSHIP.md
docs/architecture/overview.md
docs/specs/suyeon/domain.md
docs/api/api-contract.md
docs/design/tds-web-guidelines.md
```
