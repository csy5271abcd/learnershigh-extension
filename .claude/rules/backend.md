---
paths:
  - "backend/**"
---

# Backend Rules

이 규칙은 `backend/**` 작업에 적용한다.

## 1. 구조

Spring Boot Backend는 사람 이름이 아니라 Domain 기준으로 구성한다.

```text
mentor/
school/
studentmanagement/
parentprogress/
<other-domain>/
common/
```

금지:

```text
ext/
suyeon/
wangyu/
```

## 2. Layer Responsibility

필요에 따라:

```text
api/
application/
domain/
infrastructure/
```

로 분리한다.

### API

```text
HTTP Request/Response
Validation
Auth Context
DTO Mapping
Application 호출
```

### Application

```text
Use Case
Transaction
Domain 조합
Cross-Domain orchestration
```

### Domain

```text
Entity
Value
State
Invariant
Business Rule
```

### Infrastructure

```text
Repository 구현
Existing LearnersHigh Adapter
File Storage Adapter
External Provider Adapter
```

## 3. Controller Rule

Controller에 다음을 직접 넣지 않는다.

```text
Stage Transition
Feedback Rule
Parent Validation
Recommendation Rule
DB-specific Business Logic
```

Controller는 얇게 유지한다.

## 4. Contract-first

API 구현 전:

```text
docs/api/api-contract.md
```

를 확인한다.

Request/Response DTO를 Contract와 다르게 임의 설계하지 않는다.

Breaking Change가 필요하면 Contract부터 수정한다.

## 5. Domain State

State Transition은:

```text
docs/specs/<owner>/domain.md
```

를 따른다.

미정 Enum / Open Decision을 코드에서 먼저 확정하지 않는다.

## 6. Existing LearnersHigh Integration

기존 시스템 연결은 Adapter / Contract를 통해 처리한다.

권장 개념:

```text
ExistingLearnersHigh
→ Adapter
→ Extension-facing Contract
```

금지:

```text
Controller에서 기존 Table 직접 조회
여러 Domain에서 같은 기존 Table 직접 조회
기존 DTO를 Extension Domain 전체에 노출
```

## 7. Direct DB Access

기존 LearnersHigh DB 직접 접근은 마지막 선택지다.

필요하면:

```text
Adapter 내부
Read 목적 최소화
Schema 의존 최소화
Mapping 명시
```

를 따른다.

기존 Table 직접 INSERT/UPDATE는 임의 사용하지 않는다.

## 8. Anti-Corruption Layer

기존 Naming / Status / DTO를 Extension Domain에 그대로 퍼뜨리지 않는다.

예:

```text
Existing "DOING"
→ Mapper
→ Extension Domain State
```

의미가 다르면 억지 1:1 Mapping을 만들지 않는다.

## 9. Shared Entity

Surface별로 Domain Entity를 복제하지 않는다.

예:

```text
Student Task
Admin Task
Parent Report Task
```

를 별도 Domain Class로 만들지 않는다.

필요한 것은 DTO / Projection으로 분리한다.

## 10. Cross-Domain Access

다른 Domain의 Repository를 직접 끌어다 쓰는 구조를 피한다.

필요하면:

```text
Application Orchestrator
Query Interface
Published Contract
```

를 사용한다.

순환 의존을 만들지 않는다.

## 11. Derived Data

다음과 같은 값은 가능한 한 Source Entity에서 계산한다.

```text
Feedback Pending
Deadline Risk
Parent Report 미발송
48h Queue
```

별도 Counter Table/Field를 추가하기 전에
동기화 필요성과 이유를 검토한다.

## 12. Transaction

한 Use Case에서 함께 성공해야 하는 변경은
Application Layer Transaction으로 묶는 것을 검토한다.

예:

```text
Feedback 전달
→ Feedback 상태
→ Student-visible 결과

Parent Report Send
→ sentAt
→ Artifact shared
```

## 13. Validation

Validation을 구분한다.

```text
Request shape validation
→ API Layer

Business validation
→ Domain/Application
```

Frontend에서만 막고 Backend 검증을 생략하지 않는다.

## 14. Error

공통 Error 형식은 `api-contract.md`를 따른다.

Integration Error를 Empty로 숨기지 않는다.

잘못된 State Transition은 적절한 Conflict Error로 처리한다.

## 15. Permission

Actor:

```text
STUDENT
ADMIN
MENTOR
```

Surface별 최소 권한을 적용한다.

Mentor API에서 Student PII를 반환하지 않는다.

## 16. AI

AI 결과는:

```text
Analysis
Suggestion
Draft
Candidate
```

로 취급한다.

자동으로 최종 공개 / 승인 State로 전이시키지 않는다.

## 17. Counseling Boundary

Suyeon Domain에서 상담 관련 Entity / Service / Repository / Endpoint를 만들지 않는다.

필요 시 Wangyu Domain의 Published Contract를 소비한다.

## 18. File

Domain은 Storage Provider 세부 구현보다:

```text
fileRef
fileName
metadata
visibility
```

같은 Contract에 의존한다.

특정 Storage SDK를 Domain에 직접 노출하지 않는다.

## 19. Idempotency

중복 요청 위험이 큰 Command는 검토한다.

```text
Version Submit
Mentor Plan Apply
Parent Report Generate
Parent Report Send
Question Answer
```

실제 정책은 `api-contract.md`와 일치시킨다.

## 20. Logging

Integration Error를 구분 가능한 형태로 기록한다.

PII / 민감정보를 로그에 남기지 않는다.

## 21. Test

최소:

```text
Domain State Transition
Application Use Case
Repository/Integration Mapping
API Contract
Error Mapping
Permission
```

핵심 Cross-Surface Use Case는 Integration/E2E와 연결한다.

## 22. 금지

```text
Controller Business Logic
API Contract 우회
미정 Enum 임의 확정
기존 DB 구조 전역 노출
Surface별 Domain Entity 복제
다른 Domain Repository 직접 결합
Counseling 구현
PII 과다 반환
Error를 Empty로 숨김
```
