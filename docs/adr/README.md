# LearnersHigh Extension — Architecture Decision Records

> 위치: `docs/adr/README.md`  
> 목적: LearnersHigh Extension에서 **장기적으로 영향을 주는 중요한 기술·구조·제품 결정을 왜 그렇게 결정했는지** 기록한다.  
> Claude Code와 모든 개발자는 Architecture 또는 Shared 구조를 변경하기 전에 관련 ADR을 확인한다.

---

# 1. ADR이 필요한 이유

Feature Spec은 **무엇을 만들지** 설명하고,
`domain.md`는 **Entity / State가 어떻게 동작하는지** 설명하며,
`api-contract.md`는 **Frontend ↔ Backend가 어떻게 통신하는지** 설명한다.

ADR은 그와 다르게 다음을 기록한다.

```text
왜 이 구조를 선택했는가?
다른 선택지는 무엇이었는가?
이 결정으로 어떤 제약이 생기는가?
나중에 변경하려면 무엇을 확인해야 하는가?
```

즉 ADR은 Claude Code가 이미 합의된 중요한 구조를
작업 편의를 이유로 다시 설계하지 못하도록 하는 기록이다.

---

# 2. ADR 작성 대상

다음과 같은 결정은 ADR 대상이다.

```text
- Student / Admin / Mentor Surface 구조 변경
- 기존 LearnersHigh Integration 전략 변경
- Shared Entity의 주요 책임 변경
- Frontend App 분리 방식 변경
- Backend Domain Boundary 변경
- 공통 Feedback Queue 전략 변경
- Parent Report 전달 방식 변경
- 인증 Architecture 변경
- 핵심 DB 구조 변경
- 여러 Feature에 동시에 영향을 주는 장기적 결정
```

---

# 3. ADR을 만들지 않는 경우

다음은 일반적으로 ADR까지 만들지 않는다.

```text
- Button Label 수정
- Spacing 수정
- 단일 화면의 작은 UI 배치 변경
- Component 내부 Refactoring
- Local 변수명 변경
- 단순 Bug Fix
- Feature-local 구현 세부사항
```

이러한 내용은 Feature Spec, Pull Request, Commit, Code에서 관리한다.

---

# 4. Status

ADR Status는 다음 중 하나를 사용한다.

```text
Proposed
Accepted
Superseded
Deprecated
Rejected
```

### Proposed

검토 중이며 아직 최종 Architecture 기준이 아니다.

### Accepted

현재 프로젝트가 따라야 하는 결정이다.

### Superseded

새 ADR로 대체되었다.

예:

```text
ADR-0002
Status: Superseded by ADR-0010
```

### Deprecated

더 이상 신규 구현에 적용하지 않지만
과거 구조 이해를 위해 기록을 유지한다.

### Rejected

논의했지만 채택하지 않은 결정이다.

---

# 5. ADR 번호

번호는 순차 증가한다.

```text
0001
0002
0003
...
```

한 번 사용한 번호를 다시 사용하지 않는다.

ADR을 삭제해서 번호를 당기지 않는다.

---

# 6. 파일명

형식:

```text
NNNN-short-decision-title.md
```

예:

```text
0001-separate-student-admin-mentor-surfaces.md
0002-existing-learnershigh-integration-boundary.md
0003-shared-feedback-queue.md
0004-parent-report-without-parent-app.md
0005-domain-packaged-layered-mvc-backend.md
```

---

# 7. ADR Template

```md
# ADR-000X: Decision Title

- Status: Proposed
- Date: YYYY-MM-DD

## Context

왜 이 결정이 필요한가?

## Decision

무엇을 결정했는가?

## Consequences

이 결정으로 생기는 장점, 제약, 구현 영향은 무엇인가?

## Alternatives Considered

검토했지만 선택하지 않은 방식은 무엇인가?

## Implementation Constraints

Claude Code와 개발자가 반드시 지켜야 하는 규칙은 무엇인가?

## Related Documents

관련 Spec / Architecture / API 문서
```

---

# 8. 변경 규칙

Accepted ADR의 결정이 마음에 들지 않는다는 이유로
기존 ADR 본문을 조용히 바꾸지 않는다.

중요한 방향 변경이면:

```text
1. 새로운 ADR 작성
2. 새 ADR에서 기존 ADR을 Supersede
3. 기존 ADR Status를 Superseded로 변경
4. 관련 Architecture / Spec / API 업데이트
5. 구현 변경
```

순서로 진행한다.

오탈자, 링크 수정, 의미가 바뀌지 않는 설명 보완은
기존 ADR에서 직접 수정할 수 있다.

---

# 9. Source of Truth와의 관계

ADR은 모든 문서보다 무조건 높은 우선순위를 갖지 않는다.

Concern별 기준은:

```text
docs/SOURCE_OF_TRUTH.md
```

를 따른다.

ADR의 역할은:

```text
"왜 이 방향으로 가기로 했는가"
```

를 고정하는 것이다.

Feature Requirement 자체가 바뀌면
관련 ADR을 함께 검토한다.

---

# 10. Ownership

ADR은 개인 소유 문서가 아니라 공통 Architecture 문서다.

위치:

```text
docs/adr/
```

Shared 영역이므로
두 개발자에게 영향을 주는 ADR 변경은 함께 확인한다.

---

# 11. Claude Code 규칙

Claude Code는:

```text
- 관련 Accepted ADR을 작업 전에 확인한다.
- Accepted ADR과 충돌하는 구조를 임의로 구현하지 않는다.
- ADR을 우회하기 위해 별도의 임시 Architecture를 만들지 않는다.
- ADR 변경이 필요한 경우 먼저 충돌과 영향 범위를 보고한다.
```

---

# 12. 현재 ADR

| ADR | Decision | Status |
|---|---|---|
| ADR-0001 | Student / Admin / Mentor Surface 분리 | Accepted |
| ADR-0002 | 기존 LearnersHigh 재구현 대신 Integration Boundary 사용 | Accepted |
| ADR-0003 | Feedback을 Shared Queue로 운영 | Accepted |
| ADR-0004 | 별도 Parent App 없이 Admin Parent Report 전달 | Accepted |
| ADR-0005 | Backend를 Domain 패키지 안의 Layered MVC로 구성 | Accepted |

---

# 13. 핵심 원칙

```text
ADR은 "규칙을 많이 만드는 문서"가 아니다.

나중에 다시 논쟁될 가능성이 높고,
여러 Feature에 영향을 주며,
Architecture를 바꾸는 비용이 큰 결정만 기록한다.
```
