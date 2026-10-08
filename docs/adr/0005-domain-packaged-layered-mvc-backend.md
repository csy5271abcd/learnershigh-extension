# ADR-0005: Use Domain-packaged Layered MVC for the Backend

- Status: Proposed
- Date: 2026-10-08

## Context

초기 Architecture 문서(`docs/architecture/overview.md`)는 각 Backend Domain을
`api / application / domain / infrastructure` 4개 Layer와 Port / Adapter 의존 역전 구조
(Hexagonal에 가까운 구조)로 설명했다.

현재 상황:

```text
- 개발 인원: 2명 (Suyeon / Wangyu)
- Domain당 Use Case 수가 많지 않다.
- Backend Scaffold가 아직 없다.
- 외부 의존 중 실제로 교체 가능성이 큰 것은
  Existing LearnersHigh 연동 / File Storage / Delivery Provider 정도다.
```

모든 Domain에 Port / Adapter를 두면:

```text
- Interface + 구현 + Mapper로 파일 수가 크게 늘어난다.
- Domain Model과 JPA Entity 분리 비용이 생긴다.
- 얻는 이점(교체 가능성)은 대부분 Domain에서 실제로 필요하지 않다.
```

반면 다음은 단순화해도 유지해야 한다.

```text
- ADR-0002: Existing LearnersHigh는 명시적 Boundary 뒤에서만 접근
- One Entity, Many Views: Surface별 Entity 복제 금지
- Controller에 Business Rule 금지
- 상태 전이 규칙의 단일 위치
```

---

## Decision

Backend는 **Domain 패키지 안의 Layered MVC**로 구성한다.

```text
backend/src/main/java/.../
├─ school/
│  ├─ controller/     # HTTP, Request Validation, DTO 변환
│  ├─ service/        # Use Case, Transaction
│  ├─ domain/         # JPA Entity + Enum + 상태 전이 메서드
│  ├─ repository/     # Spring Data Repository
│  └─ dto/            # Request / Response (api-contract.md 기준)
├─ mentor/
├─ studentmanagement/
├─ parentprogress/
├─ <other-domain>/
└─ common/
   ├─ error/
   ├─ auth/
   └─ integration/
      └─ learnershigh/  # Existing LearnersHigh Client Interface + 구현
```

의존 방향:

```text
controller → service → domain / repository
service    → common/integration (Interface)
```

규칙:

1. **JPA Entity가 곧 Domain Model이다.** 별도 Domain 객체 / Mapper를 만들지 않는다.
2. **상태 전이와 Invariant는 Entity 메서드에 둔다.** (`task.submitVersion(...)`, `report.markSent(...)`) Service에 상태 if문을 흩어놓지 않는다.
3. **Controller는 얇게 유지한다.** Validation, DTO 변환, Service 호출만 한다.
4. **Interface는 교체 가능성이 실제로 있는 외부 경계에만 둔다.**
   ```text
   Existing LearnersHigh (Plan / Library / Study / Task / Student)
   File Storage
   External Delivery (Kakao 등)
   AI Provider
   ```
   이 경계는 `Real` / `Mock` 구현을 가질 수 있다. 그 외 Service / Repository에는 Interface를 만들지 않는다.
5. **다른 Domain의 Repository를 직접 쓰지 않는다.** 필요하면 해당 Domain의 공개 Service(Query) 메서드를 호출한다. 순환 의존을 만들지 않는다.
6. **Entity를 API Response로 직접 반환하지 않는다.** 항상 `dto/`를 거친다.

---

## Consequences

장점:

```text
- 파일 / 패키지 수 감소, Spring 관례와 일치
- 신규 참여자 / Agent가 바로 이해 가능
- Domain 규칙은 Entity 메서드 단위 Unit Test로 검증 가능
```

제약:

```text
- Domain Entity가 JPA에 의존한다. (허용)
- Service가 커지면 Use Case 단위 클래스로 분리할 수 있으나 Layer는 늘리지 않는다.
- Domain 간 경계는 패키지 규칙과 Review로 지킨다. (ArchUnit 도입 시 자동화)
```

영향 받는 문서:

```text
docs/architecture/overview.md §5, §6, §21
.claude/rules/backend.md §2, §10, §21
.claude/rules/database.md (paths)
docs/OWNERSHIP.md §11
CLAUDE.md §9
README.md §12
ARCHITECTURE.md
```

---

## Alternatives Considered

### Hexagonal (Ports & Adapters) 전체 적용

Domain마다 Inbound / Outbound Port, Domain Model과 Persistence Model 분리.

선택하지 않은 이유: 현재 인원과 Domain 크기에 비해 구조 비용이 크고,
교체 가능성이 필요한 곳은 외부 경계 몇 개뿐이다.

### Domain 구분 없는 전통적 MVC (`controller/`, `service/`, `repository/` 최상위)

선택하지 않은 이유: Ownership(`docs/OWNERSHIP.md`)과 CODEOWNERS가 Domain 경로 기준이며,
Domain 간 숨은 결합이 생기기 쉽다.

---

## Implementation Constraints

```text
- Controller Business Logic 금지 (기존과 동일)
- Existing LearnersHigh 접근은 common/integration/learnershigh/ Interface 경유만 허용
- Entity 상태 필드를 Service에서 setter로 직접 바꾸지 않는다 (전이 메서드 사용)
- 다른 Domain Repository 직접 주입 금지
- Entity를 Response로 직접 노출 금지
- 사람 이름 패키지 금지 (기존과 동일)
```

이 ADR이 Accepted 되기 전까지 Backend Scaffold를 만들지 않는다.

---

## Related Documents

```text
docs/architecture/overview.md
docs/architecture/integration-boundary.md
.claude/rules/backend.md
.claude/rules/testing.md
docs/adr/0002-existing-learnershigh-integration-boundary.md
```
