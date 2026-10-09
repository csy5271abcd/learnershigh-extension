---
paths:
  - "backend/**"
---

# Backend Rules

이 규칙은 `backend/**` 작업에 적용한다.

## 1. 구조

Spring Boot Backend는 사람 이름이 아니라 Domain 기준으로 구성한다.

Build는 `backend/gradlew(.bat)`(Gradle Wrapper, Kotlin DSL)만 사용한다. Maven 파일을 만들지 않는다.
Base package `com.learnershigh.extension` 아래에 Domain 패키지를 둔다.

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

상세 기준: `docs/architecture/overview.md` §6 (ADR-0005)

```text
<domain>/                      # mentor, school, studentmanagement, parentprogress ...
├─ controller/                 # HTTP 입출력
├─ service/                    # XxxService(변경) / XxxQueryService(조회)
├─ entity/                     # JPA Entity + Enum + 상태 전이 메서드
├─ repository/                 # Spring Data JPA Repository
├─ dto/                        # Request / Response (api-contract.md 기준)
└─ exception/                  # 이 Domain의 ErrorCode enum

common/
├─ error/                      # ErrorCode, BusinessException, GlobalExceptionHandler
├─ auth/                       # 인증 Context
└─ integration/learnershigh/   # ExistingXxxClient (interface) + Real / Mock 구현
```

요약:

```text
controller  : @Valid, 인증 Context, Service 호출. Entity / Repository 사용 금지
service     : XxxService(@Transactional) / XxxQueryService(@Transactional(readOnly = true))
              Entity → XxxResponse.from(entity) 변환은 Service에서
entity      : 상태 전이 메서드 + Invariant. setter로 상태 변경 금지
repository  : 자기 Domain Entity만
dto         : record Request / Response
exception   : XxxErrorCode enum implements common.error.ErrorCode
```

Interface는 `common/integration` 등 외부 경계에만 둔다. `XxxServiceImpl` 금지.

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
조회 : 상대 Domain XxxQueryService public 메서드
변경 : 상대 Domain XxxService public 메서드 (Entity 주고받기 금지)
```

를 사용한다. 상세: `overview.md` §6-4.

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
Service의 Transaction으로 묶는 것을 검토한다.

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
→ controller

Business validation
→ Entity / Service
```

Frontend에서만 막고 Backend 검증을 생략하지 않는다.

## 14. Error

공통 Error 형식은 `api-contract.md`를 따른다.

예외는 `BusinessException(XxxErrorCode)`로 던지고 `common/error/GlobalExceptionHandler`가 변환한다. 상세: `overview.md` §6-5.

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
Entity State Transition (Unit)
Service Use Case
Repository/Integration Mapping
API Contract
Error Mapping
Permission
```

핵심 Cross-Surface Use Case는 Integration/E2E와 연결한다.

Test Stack은 JUnit Jupiter + Spring Boot Test Starter(BOM 관리 Version)다.
Layer / Domain 의존 규칙은 `ArchitectureTest`(ArchUnit)가 검증한다. 규칙을 통과시키려고 Rule을 완화하지 않는다.
일반 Unit Test는 DB / Docker 없이 실행되어야 한다. (`./gradlew build`)
MySQL이 필요한 Test는 `@Tag("integration")` + `@Import(MySqlContainerConfig.class)`(Testcontainers)로 작성하고 `./gradlew integrationTest`로 실행한다. (ADR-0006)
H2 등 In-memory DB로 MySQL을 대체하지 않는다.

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
