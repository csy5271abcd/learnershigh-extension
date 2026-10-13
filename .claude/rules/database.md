---
paths:
  - "database/**"
  - "backend/**/repository/**"
  - "backend/**/common/integration/**"
---

# Database Rules

이 규칙은 Database Schema, Migration, Seed 및 관련 Persistence 작업에 적용한다.

## 1. Database

기본 DB는 MySQL이다.

변경 이력 (Flyway, ADR-0006):

```text
database/migrations/V<yyyyMMddHHmm>__<description>.sql
```

로컬 MySQL은 `docker compose up -d`(`mysql:8.4`)를 사용한다. 파일 규칙: `database/migrations/README.md`

개발 / 발표용 공통 데이터:

```text
database/seed/
```

## 2. Migration-first

Schema를 수동으로만 변경하고 Migration을 남기지 않는다.

Schema 변경:

```text
Domain 변경 확인
→ Migration 작성
→ Backend Mapping
→ Seed/Test 수정
```

순서로 진행한다.

## 3. Shared 영역

Database는 Shared 영역이다.

다음 변경은 영향 범위를 먼저 확인한다.

```text
Table 추가/삭제
Column 추가/삭제
PK/FK 변경
Enum 저장 방식 변경
Index 변경
Unique Constraint 변경
```

다른 담당자 Feature에 영향을 주면 `docs/OWNERSHIP.md` 절차를 따른다.

## 4. Existing LearnersHigh

기존 LearnersHigh Table / Column 이름을 추측해서 Migration하지 않는다.

기존 DB에 직접 변경이 필요한 경우:

```text
integration-boundary.md
실제 기존 Schema 확인
영향 분석
합의
```

후 진행한다.

## 5. Identity

같은 Business Entity를 화면별로 다른 Table로 복제하지 않는다.

예:

```text
student_task
admin_task
report_task
```

처럼 같은 Task 의미의 중복 Table을 만들지 않는다.

## 6. Existing Mapping

기존 Entity와 Extension Entity Mapping이 필요하면
중복 방지 규칙을 둔다.

예:

```text
existingTaskId
existingStudentId
```

실제 필드명과 타입은 기존 시스템 확인 후 확정한다.

## 7. Status

`domain.md`에서 확정되지 않은 Status를 DB Enum/Column 값으로 먼저 고정하지 않는다.

특히 Open Decision:

```text
ParentReport generated
Q&A reassign
Topic Approval
Connection Status
Mentor Review State
Archive Persistence
```

## 8. Snapshot

실시간 데이터와 Snapshot을 구분한다.

예:

```text
ParentReport
SchoolRecordSnapshot
Mentor Plan Apply Snapshot
```

Snapshot은 원본 변경으로 자동 덮어쓰지 않는 요구가 있는지 확인한다.

## 9. Derived Counter

가능하면 다음을 별도 영구 Counter로 저장하지 않는다.

```text
Feedback Pending
Deadline Risk Count
Parent Report 미발송
Queue 48h Count
```

필요 시 Materialized/Stored Derived Data를 사용해야 하는 이유와
동기화 전략을 문서화한다.

## 10. Nullability

UI Mockup을 보고 임의로 NOT NULL을 지정하지 않는다.

필수 여부는:

```text
Feature Spec
Domain Invariant
```

를 기준으로 판단한다.

## 11. Foreign Key

관계가 명확한 Entity는 FK를 검토한다.

단, 기존 LearnersHigh 외부 ID와의 연결은
실제 통합 방식에 맞춰 결정한다.

## 12. Index

다음 Query Pattern을 근거로 Index를 검토한다.

```text
studentId
status
deadline
createdAt
updatedAt
month
organization/branch scope
```

근거 없이 모든 Column에 Index를 추가하지 않는다.

## 13. File

파일 Binary를 DB에 저장할지 임의로 결정하지 않는다.

기본 Domain은:

```text
fileRef
metadata
```

를 사용하며 실제 Storage 방식은 Infrastructure 결정으로 둔다.

## 14. Seed

Seed는 여러 Surface에서 동일 Entity를 재사용한다.

예:

```text
Student S001
├─ Task
├─ Activity
├─ TestResult
├─ Mentor Usage
└─ ParentReport
```

Student/Admin 화면마다 다른 학생 데이터를 만들지 않는다.

## 15. Seed 시간 일관성

Snapshot 시점이 다르면 날짜를 구분한다.

서로 다른 시점의 데이터를 같은 현재 상태처럼 섞지 않는다.

집계 기간도 구분한다.

```text
Today Board Plan
= 최근 7일

Parent Report Plan
= 해당 월
```

## 16. Evidence Seed

실제 제출물처럼 자연스러운 파일명을 사용한다.

좋은 예:

```text
AI_교육기사_3건_요약.pdf
speech_v2_548words.docx
제동거리_탐구보고서_최종.pdf
```

## 17. Migration 충돌

두 개발자가 병렬로 Migration을 만들 경우 번호/버전 충돌을 방지한다.

Version은 작성 시각(UTC, `yyyyMMddHHmm`)을 사용한다. 개인별 번호 범위를 두지 않는다.

이미 main에 들어간 Migration 파일은 수정하지 않는다. 변경은 새 Migration으로 추가한다.

## 18. Destructive Change

다음은 특별히 주의한다.

```text
DROP TABLE
DROP COLUMN
Column Type 축소
PK 변경
대량 데이터 재작성
```

데이터 손실 가능성이 있으면 먼저 보고한다.

## 19. Rollback / Safety

가능한 경우 Migration은 실패 시 원인을 추적할 수 있게 작성한다.

운영 데이터가 존재한다고 가정해야 하는 변경은
Backfill / Default / 단계적 Migration을 검토한다.

## 20. Counseling Boundary

Suyeon 작업에서 상담 Table / Column / Seed를 만들지 않는다.

상담 데이터는 Wangyu-owned Domain이 소유한다.

## 21. Verification

DB 변경 후 최소 확인:

```text
Migration 적용 (./gradlew integrationTest)
Application 시작
Repository Mapping
Seed 적용
관련 Test
```

## 22. 금지

```text
기존 Schema 추측
Shared Table 임의 삭제/rename
미정 Status DB 고정
화면별 중복 Entity Table
Dashboard Counter Source Table 남발
상담 Table 생성
0-byte placeholder migration
검증 없이 완료 보고
```
