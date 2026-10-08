# LearnersHigh Extension — Shared Conventions

> 위치: `docs/architecture/shared-conventions.md`  
> 목적: LearnersHigh Extension 전반에서 공통으로 사용하는 **Naming, ID, Date/Time, Enum, Status, Pagination, Error, File, Snapshot, Query, API 표현 규칙**을 정의한다.  
> 이 문서는 Feature별 Business Rule을 정의하지 않는다. 기능 동작은 Feature Spec, Entity/State 의미는 `domain.md`, HTTP Contract는 `api-contract.md`를 따른다.

---

# 1. 문서 역할

이 문서는 여러 Surface와 Domain에서 반복해서 필요한 공통 표현 방식을 통일한다.

적용 대상:

```text
frontend/student/**
frontend/admin/**
frontend/mentor/**
frontend/shared/**

backend/**
database/**
docs/api/**
docs/specs/**
```

목표:

```text
- 같은 개념을 서로 다른 이름으로 표현하지 않는다.
- Frontend / Backend / DB 사이에서 불필요한 변환을 줄인다.
- 날짜, 상태, ID, Error 의미를 Surface마다 다르게 해석하지 않는다.
- Mock / Seed / 실제 API가 같은 Convention을 사용한다.
```

---

# 2. Source of Truth 관계

Concern별 기준:

```text
Feature Behavior
→ docs/specs/<owner>/features/*.md

Entity / State Meaning
→ docs/specs/<owner>/domain.md

HTTP Method / Path / Request / Response
→ docs/api/api-contract.md

기존 LearnersHigh Integration
→ docs/architecture/integration-boundary.md

공통 표현 Convention
→ 이 문서
```

이 문서가 Feature별 의미를 새로 만들지 않는다.

예:

```text
Activity 상태가 무엇인지
→ domain.md

그 상태 문자열을 API에서 어떻게 표기하는지
→ 이 문서 + api-contract.md
```

---

# 3. Naming — 기본 원칙

코드와 문서는 의미가 드러나는 이름을 사용한다.

좋은 예:

```text
taskId
studentId
parentReportId
currentStage
submittedAt
updatedAt
```

피해야 할 예:

```text
id2
data1
flag
value
temp
etc
```

같은 개념에 여러 동의어를 만들지 않는다.

예:

```text
studentId
```

를 프로젝트 다른 곳에서:

```text
learnerId
memberId
userStudentId
```

로 바꾸지 않는다.

단, 기존 LearnersHigh가 다른 이름을 쓰는 경우 Integration Layer에서 매핑한다.

---

# 4. Frontend Naming

기본 기준:

```text
Component
→ PascalCase

Hook
→ useXxx

Function / Variable
→ camelCase

Boolean
→ is / has / can / should prefix

Type / Interface
→ PascalCase
```

예:

```text
TaskDetailPage
MentorProfileCard
useTaskDetail
isLoading
hasFeedback
canSend
ParentReportStatus
```

---

# 5. Backend Naming

Java 기본 관례를 따른다.

```text
Class / Record / Enum
→ PascalCase

Method / Field
→ camelCase

Constant
→ UPPER_SNAKE_CASE
```

예:

```text
TaskService
ParentReportController
findByStudentId()
submittedAt
MAX_RETRY_COUNT
```

---

# 6. Package Naming

Backend Package:

```text
lowercase
```

권장:

```text
mentor
school
studentmanagement
parentprogress
common
```

금지:

```text
suyeon
wankyu
ext
```

---

# 7. File Naming

Markdown:

```text
kebab-case.md
```

예:

```text
mentor-hub.md
school-admissions.md
api-contract.md
shared-conventions.md
```

React Component:

```text
PascalCase.tsx
```

예:

```text
MentorProfileCard.tsx
TaskStatusBadge.tsx
```

Hook:

```text
useTaskDetail.ts
useMentorRecommendations.ts
```

Utility:

```text
camelCase.ts
```

---

# 8. ID Convention

API와 Frontend에서는 ID를 기본적으로 문자열로 취급한다.

```ts
type Id = string;
```

예:

```json
{
  "taskId": "task_001",
  "studentId": "student_001"
}
```

Frontend가 ID를 숫자로 가정하지 않는다.

---

# 9. ID 생성

Extension 내부 신규 Entity ID 생성 방식은
실제 Persistence 설계에 맞춰 결정한다.

현재 이 문서에서 확정하지 않는 것:

```text
UUID
ULID
AUTO_INCREMENT
Snowflake
```

중요한 규칙:

```text
API 소비자는 내부 생성 방식을 알 필요가 없다.
```

---

# 10. Existing ID Mapping

기존 LearnersHigh ID와 Extension ID가 다를 경우:

```text
existingStudentId
existingTaskId
```

처럼 Mapping 의미를 명확히 한다.

실제 Type은 기존 시스템 확인 전 확정하지 않는다.

---

# 11. Date Convention

날짜만 필요한 값:

```text
YYYY-MM-DD
```

예:

```json
{
  "deadlineDate": "2026-10-20"
}
```

---

# 12. DateTime Convention

시간이 포함된 값은 ISO 8601을 사용한다.

예:

```json
{
  "submittedAt": "2026-10-09T14:30:00+09:00"
}
```

---

# 13. Timezone

기본 사용자/운영 Context는 한국 기준을 우선한다.

표현:

```text
Asia/Seoul
UTC+09:00
```

하지만 Backend 내부 저장 방식은 기술 구현에 따라:

```text
UTC 저장
또는
Offset-aware DateTime
```

중 하나를 사용할 수 있다.

중요:

```text
Frontend / Backend가 서로 다른 Timezone을 암묵적으로 가정하지 않는다.
```

---

# 14. Date Field Naming

날짜:

```text
xxxDate
```

예:

```text
deadlineDate
snapshotDate
```

시간 포함:

```text
xxxAt
```

예:

```text
createdAt
updatedAt
submittedAt
sentAt
generatedAt
```

기간:

```text
startDate
endDate
```

---

# 15. Relative Time

다음 표현은 UI Label이지 Domain 값이 아니다.

```text
D-3
3시간 전
어제
최근 7일
```

Domain/API에는 가능한 한 실제 날짜/시간을 전달하고
UI에서 상대 표현으로 변환한다.

---

# 16. Period Convention

월 단위:

```text
YYYY-MM
```

예:

```json
{
  "month": "2026-10"
}
```

학기/학년 등 학교 Context는
Feature/Domain에서 별도로 정의한다.

---

# 17. Enum — 기본 원칙

API Enum은 의미가 명확한 문자열을 사용한다.

권장:

```text
UPPER_SNAKE_CASE
```

예:

```text
DRAFT
SUBMITTED
ARCHIVED
PROCESSING
SUCCESS
FAILED
```

단, 기존 Domain/Feature Spec에서 소문자 값이 이미 의미 있게 사용되고 있다면
무조건 변경하지 않는다.

예:

```text
pending
answered
overdue
```

이 경우 최종 Enum 변경은 Domain/API Contract에서 함께 결정한다.

---

# 18. Enum 변경

Enum 이름 변경은 Breaking Change로 취급한다.

순서:

```text
domain.md
→ shared-conventions.md
→ api-contract.md
→ Backend
→ Frontend
→ Test
```

---

# 19. Unknown Enum

Frontend는 알 수 없는 Enum을 조용히 Default 상태로 치환하지 않는다.

개발/테스트 환경에서는 Unknown 값을 발견 가능하게 한다.

예:

```text
UNKNOWN_STATUS
```

를 임의로 Business State로 추가하는 대신
Contract 불일치로 처리한다.

---

# 20. Status vs Action

다음 둘을 구분한다.

```text
Status
→ 일정 시간 유지되는 상태

Action / Command
→ 상태를 바꾸기 위한 요청
```

예:

```text
answered
→ Status

answer
→ Action
```

현재 `reassign`처럼 의미가 미정인 값은
Status로 임의 확정하지 않는다.

---

# 21. UI State vs Domain State

UI State:

```text
selectedTab
isModalOpen
searchKeyword
scrollPosition
```

Domain State:

```text
activityStatus
parentShareStatus
currentStage
```

UI 상태를 API/DB Status로 만들지 않는다.

---

# 22. Boolean Naming

Boolean은 긍정형을 우선한다.

권장:

```text
isPublished
hasFeedback
canSend
isDeadlineRisk
```

피해야 할 예:

```text
notDisabled
isNotHidden
noFeedback
```

---

# 23. Null / Missing

`null`, 빈 문자열, 빈 배열의 의미를 구분한다.

```text
null
→ 값이 아직 없음 / 해당 없음

""
→ 입력 문자열이 비어 있음

[]
→ 목록은 존재하지만 항목이 없음
```

API에서 의미 없이 `null`과 `""`을 혼용하지 않는다.

---

# 24. Optional Field

Optional Field는 실제로 없는 것이 허용되는 값에만 사용한다.

UI 편의를 위해 모든 Field를 Optional로 만들지 않는다.

---

# 25. Empty Collection

Collection은 가능한 한:

```json
{
  "items": []
}
```

로 반환하고
`items: null`을 기본으로 사용하지 않는다.

---

# 26. Pagination

기본 Query:

```text
?page=0&size=20
```

Page는 0-based를 기본으로 한다.

Response:

```json
{
  "items": [],
  "page": {
    "number": 0,
    "size": 20,
    "totalElements": 0,
    "totalPages": 0
  }
}
```

---

# 27. Pagination 적용 기준

다음은 Pagination을 우선 고려한다.

```text
Task List
Activity List
Mentor Content
Feedback Queue
Parent Report List
Admin Student List
```

작은 고정 목록에는 불필요하게 Pagination을 붙이지 않는다.

---

# 28. Pagination Limit

최대 `size`는 실제 Backend 성능 기준으로 결정한다.

현재 임의로:

```text
100
500
1000
```

같은 값을 하드코딩하지 않는다.

---

# 29. Sorting

기본 표현:

```text
?sort=updatedAt,desc
```

복수 Sort:

```text
?sort=status,asc&sort=deadlineDate,asc
```

지원 여부는 각 Endpoint Contract에서 명시한다.

---

# 30. Search

일반 검색 Query 이름:

```text
query
```

예:

```text
?query=AI
```

Feature마다:

```text
keyword
search
q
```

를 제각각 사용하지 않는다.

---

# 31. Filter

Filter Field 이름은 Domain Field 의미에 맞춘다.

예:

```text
status
grade
type
month
subject
```

Filter 값은 가능한 한 API Enum과 동일 표현을 사용한다.

---

# 32. API Path Naming

Resource는 복수형을 기본으로 한다.

예:

```text
/tasks
/activities
/mentors
/parent-reports
```

Command가 필요한 경우 하위 Action Path를 사용할 수 있다.

예:

```text
/{id}/submit
/{id}/archive
/{id}/send
```

Command 이름은 동사를 사용한다.

---

# 33. Actor Namespace

API Surface:

```text
/api/student/**
/api/admin/**
/api/mentor/**
```

같은 Domain Entity라도 Actor별 Response가 달라질 수 있다.

하지만 Domain Entity 자체를 Surface별로 복제하지 않는다.

---

# 34. Request Naming

생성:

```text
CreateXxxRequest
```

수정:

```text
UpdateXxxRequest
```

Action:

```text
SubmitXxxRequest
SendXxxRequest
ReviewXxxRequest
```

Frontend Type도 가능한 한 같은 의미를 유지한다.

---

# 35. Response Naming

단일 Resource:

```text
XxxResponse
```

List Item:

```text
XxxListItemResponse
```

Detail:

```text
XxxDetailResponse
```

Projection 의미가 다르면 이름으로 드러낸다.

---

# 36. Error Format

공통 형식:

```json
{
  "code": "TASK_NOT_FOUND",
  "message": "Task를 찾을 수 없습니다.",
  "details": {},
  "traceId": "optional"
}
```

---

# 37. Error Code Naming

Error Code:

```text
UPPER_SNAKE_CASE
```

예:

```text
TASK_NOT_FOUND
INVALID_STATE_TRANSITION
PARENT_REPORT_VALIDATION_FAILED
EXISTING_PLAN_UNAVAILABLE
```

---

# 38. Error 의미

Error Code 하나는 가능한 한 하나의 의미만 가진다.

예:

```text
RESOURCE_NOT_FOUND
```

로 모든 Domain Error를 뭉개기보다
사용자/Frontend 분기가 필요하면 Domain-specific Code를 사용한다.

---

# 39. HTTP Status

기본:

```text
200 OK
201 Created
204 No Content

400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
500 Internal Server Error
502 / 503 Integration Failure
```

실제 Endpoint는 `api-contract.md`를 따른다.

---

# 40. Validation Error

형식:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "입력값을 확인해주세요.",
  "details": {
    "fields": [
      {
        "field": "title",
        "reason": "required"
      }
    ]
  }
}
```

---

# 41. Integration Error

기존 LearnersHigh 연동 실패:

```text
Empty
```

로 변환하지 않는다.

예:

```text
EXISTING_PLAN_UNAVAILABLE
EXISTING_STUDY_DATA_UNAVAILABLE
```

---

# 42. File Reference

Domain/API에서는 Storage Provider 세부 URL보다:

```text
fileRef
```

를 기본 식별자로 사용한다.

예:

```json
{
  "fileRef": "file_ref_001",
  "fileName": "AI_교육기사_3건_요약.pdf",
  "contentType": "application/pdf",
  "sizeBytes": 124000
}
```

---

# 43. File URL

Signed URL 또는 실제 Download URL이 필요하면
`fileRef`와 구분한다.

예:

```text
fileRef
downloadUrl
previewUrl
```

URL을 DB의 영구 Identity로 사용하지 않는다.

---

# 44. File Name

사용자에게 표시하는 파일명은 실제 제출물처럼 자연스럽게 유지한다.

예:

```text
제동거리_탐구보고서_최종.pdf
speech_v2_548words.docx
```

---

# 45. File Type

파일 유형은 가능한 한:

```text
contentType
```

으로 MIME Type을 사용한다.

Business Type이 필요하면 별도 Field로 둔다.

예:

```text
artifactType = PDF
contentType = application/pdf
```

---

# 46. Snapshot Convention

Snapshot은 특정 시점의 고정된 데이터다.

대표:

```text
SchoolRecordSnapshot
ParentReport
Mentor Plan Apply Snapshot
```

원본 데이터가 변경되었다고
과거 Snapshot을 자동 덮어쓰지 않는다.

---

# 47. snapshotDate

Snapshot의 기준 날짜가 필요한 경우:

```text
snapshotDate
```

를 사용한다.

예:

```json
{
  "snapshotDate": "2026-10-31"
}
```

---

# 48. Parent Report Period

Parent Report의 기준 기간은 월 단위다.

```text
month = YYYY-MM
```

실시간 Data와 Monthly Snapshot을 혼합하지 않는다.

---

# 49. Time Window

같은 지표라도 기간이 다르면 같은 값으로 취급하지 않는다.

예:

```text
Today Board Plan
= 최근 7일

Parent Report Plan
= 해당 월 전체
```

---

# 50. Percentage

비율을 API에서 표현할 때:

```text
0.0 ~ 1.0
```

또는:

```text
0 ~ 100
```

중 하나를 Endpoint별로 임의 혼용하지 않는다.

기본 권장:

```text
0.0 ~ 1.0
```

예:

```json
{
  "planExecutionRate": 0.58
}
```

UI에서:

```text
58%
```

로 표현한다.

---

# 51. Count

Count Field는 의미를 이름에 포함한다.

예:

```text
evidenceCount
feedbackPendingCount
completedTaskCount
```

단순:

```text
count
```

는 Context가 매우 명확한 경우만 사용한다.

---

# 52. Duration

시간 길이는 단위를 이름에 포함한다.

예:

```text
studyMinutes
waitingHours
durationSeconds
```

값만 보고 단위를 추측하게 하지 않는다.

---

# 53. Score / Grade

시험 데이터는 의미가 서로 다르다.

```text
score
grade
percentile
rank
```

를 임의로 하나의 숫자로 합치지 않는다.

없는 값은 생성하지 않는다.

---

# 54. Money

현재 Suyeon Feature의 핵심 Domain에는 금액 Convention이 없다.

추후 필요해지면:

```text
amount
currency
```

형태로 명시적으로 정의하고
Float 사용 여부를 별도 결정한다.

---

# 55. Text Content

사용자 작성 본문과 AI 생성 텍스트를 구분한다.

예:

```text
studentReflection
aiSuggestion
adminComment
```

AI Text를 Student Text Field에 직접 덮어쓰지 않는다.

---

# 56. Visibility

공개 범위를 표현할 경우
Business 의미가 명확한 Enum을 사용한다.

예:

```text
PRIVATE
PUBLIC
```

실제 허용 값은 Feature Spec / Domain에서 확정한다.

UI-only `hidden` 같은 표현으로 Business Visibility를 대신하지 않는다.

---

# 57. Consent

공유 동의는 단순 Boolean으로 충분한지
상태 이력이 필요한지 구분한다.

TaskFinalArtifact는 현재:

```text
not_shared
→ consented
→ attached
→ shared
```

흐름이 존재한다.

따라서 단일 Boolean만으로 전체 Lifecycle을 대체하지 않는다.

---

# 58. Created / Updated

신규 Extension Entity에는 필요한 경우:

```text
createdAt
updatedAt
```

을 사용한다.

Audit 요구가 없는 단순 Value Object에
무조건 넣지는 않는다.

---

# 59. Actor / Author

작성/수정 주체가 Domain적으로 중요하면
명확한 Field를 사용한다.

예:

```text
createdByStaffId
answeredByMentorId
```

단순히:

```text
userId
```

로 의미를 숨기지 않는다.

---

# 60. Audit

법적/업무적으로 중요한 변경 이력이 필요한 경우
단순 `updatedAt`만으로 충분한지 검토한다.

현재 모든 Entity에 Audit Log를 강제하지 않는다.

---

# 61. Soft Delete

Soft Delete는 모든 Table에 자동 적용하지 않는다.

필요한 경우 Feature/Domain 요구를 확인한다.

삭제된 데이터가 Revision/Report Snapshot에 필요한 경우
물리 삭제보다 보존 전략을 검토한다.

---

# 62. Archive

`Archived`는 삭제와 다르다.

```text
Archived
→ 보존된 완료 상태

Deleted
→ 삭제
```

둘을 같은 Flag로 처리하지 않는다.

---

# 63. Draft

`Draft`는 저장되지 않은 UI 입력과
서버에 저장된 Domain Draft를 구분한다.

예:

```text
local form draft
```

와:

```text
MentorContent.status = DRAFT
```

는 다르다.

---

# 64. Loading

Loading은 Domain Status가 아니다.

예:

```text
isLoading
```

을 DB/API Business Status로 저장하지 않는다.

단, AI 분석처럼 서버 작업 자체의 상태는:

```text
PROCESSING
SUCCESS
FAILED
```

같은 Domain/Application 상태가 될 수 있다.

---

# 65. Retry

Retry 가능 여부는 Error/Process 의미에 따라 결정한다.

모든 Error에 Retry 버튼을 자동 추가하지 않는다.

---

# 66. Derived Field

Response에 계산된 값을 포함할 수 있다.

예:

```text
isDeadlineRisk
waitingHours
planExecutionRate
```

이 경우 원본 Source와 계산 기준을 Feature/Domain에서 유지한다.

같은 Derived Field를 Frontend와 Backend에서 서로 다른 공식으로 계산하지 않는다.

---

# 67. KPI Naming

KPI는 의미를 그대로 이름에 둔다.

예:

```text
feedbackPending
deadlineRisk
parentReportUnsent
queueOver48Hours
```

서비스 사용량과 실제 운영지표를 혼합하지 않는다.

---

# 68. Boolean Derived KPI

다음처럼 Boolean이면:

```text
isDeadlineRisk
needsAttention
```

Count KPI와 구분한다.

---

# 69. Query Read Model

화면용 조합 데이터는 Domain Entity를 억지로 확장하지 않고
Read Model / Projection을 사용할 수 있다.

예:

```text
TodayBoardItem
Student360View
ParentReportMonthlySnapshot
```

---

# 70. View Model

Frontend View Model은 허용된다.

단:

```text
Domain Business State 복제
```

목적으로 사용하지 않는다.

View Model은 표시 편의를 위한 구조다.

---

# 71. API DTO와 Domain Entity

Domain Entity를 API Response에 그대로 노출하지 않는다.

같은 Task라도:

```text
StudentTaskDetailResponse
AdminFeedbackQueueItemResponse
ParentReportTaskSummaryResponse
```

처럼 필요한 정보만 반환할 수 있다.

---

# 72. Versioning

현재 Public API Version Prefix:

```text
/v1
```

은 확정하지 않는다.

초기 Contract:

```text
/api/student/**
/api/admin/**
/api/mentor/**
```

를 사용한다.

외부 공개 또는 Breaking Change 관리가 필요해지면 ADR로 Version 전략을 결정한다.

---

# 73. Idempotency

중복 실행 위험이 높은 Command는 Idempotency를 검토한다.

예:

```text
Parent Report Send
Mentor Plan Apply
Version Submit
Question Answer
```

Idempotency-Key 사용 여부는 Endpoint별 Contract에서 확정한다.

---

# 74. Concurrency

동시 수정 가능성이 있는 Resource는
낙관적 Locking을 검토한다.

후보:

```text
expectedVersion
version
updatedAt
```

모든 Resource에 강제하지 않는다.

---

# 75. Permission Naming

권한 표현이 필요하면 Actor와 Action 기준으로 명확히 한다.

예:

```text
STUDENT
ADMIN
MENTOR
```

구체 권한 체계는 인증/인가 Architecture 결정 후 확장한다.

UI에서 숨겼다고 권한 검증이 끝난 것으로 보지 않는다.

---

# 76. PII Naming

개인정보는 일반 `data`, `info`로 뭉개지 않는다.

예:

```text
displayName
schoolName
organizationId
```

Surface별 최소 정보만 Response에 포함한다.

---

# 77. Anonymous Context

Mentor Q&A 등 익명 Context는
PII를 전달하지 않고 필요한 최소 정보만 구조화한다.

예:

```json
{
  "grade": "고2",
  "interestField": "화학공학"
}
```

---

# 78. Status Display Label

API Status와 UI Label을 분리할 수 있다.

예:

```text
API
FEEDBACK_WAITING

UI
피드백 대기
```

UI Label을 DB/API 값으로 직접 저장하지 않는다.

---

# 79. Localization

현재 UI가 한국어 중심이어도
Business Enum과 Field Name은 영어 기반으로 유지한다.

사용자 표시 문자열은 UI Layer에서 관리한다.

---

# 80. Magic String 금지

동일 Enum / Route / Error Code를 여러 파일에 문자열로 반복하지 않는다.

Frontend:

```text
공통 Type / Constant
```

Backend:

```text
Enum / Constant
```

을 사용한다.

---

# 81. Route Parameter

Route Parameter Naming은 API ID Naming과 맞춘다.

예:

```text
/tasks/:taskId
/mentors/:mentorId
/activities/:activityId
```

`id` 하나로 모든 Route를 표현하지 않는다.

---

# 82. Frontend URL Query

Search / Filter / Tab을 URL과 동기화할지 여부는
Feature별 UX에 따라 결정한다.

단, Detail 왕복 후 유지가 필요한 Context는
상태가 사라지지 않게 설계한다.

---

# 83. Back Context

다음 값은 Feature 요구 시 보존한다.

```text
selectedTab
search
filter
scroll
selectedVersionPair
selectedStudent
selectedTask
```

보존 방식은 Router / State 구조에 맞게 선택한다.

---

# 84. Cache

Cache는 Source of Truth가 아니다.

Cache 사용 시:

```text
source
freshness
TTL
invalidation
```

을 명확히 한다.

실시간 Queue와 월간 Snapshot을 같은 Cache 정책으로 처리하지 않는다.

---

# 85. Mock Contract

Mock과 Real Integration은 같은 Consumer Contract를 사용한다.

예:

```text
ExistingPlanPort
├─ Mock Adapter
└─ Real Adapter
```

Feature 코드에서 Mock 전용 Shape을 사용하지 않는다.

---

# 86. Seed ID

Seed ID는 여러 Surface에서 동일하게 재사용한다.

예:

```text
student_001
task_001
mentor_001
```

단, 이 Prefix 형식은 개발/Fixture 가독성을 위한 예시이며
Production ID 생성 규칙으로 강제하지 않는다.

---

# 87. Seed Time

시간 기반 Seed는 의도한 시점을 명확히 한다.

예:

```text
snapshotDate
submittedAt
deadlineDate
```

화면마다 서로 다른 "오늘"을 암묵적으로 사용하지 않는다.

---

# 88. Logging

로그에는 다음을 우선 기록한다.

```text
operation
resourceId
result
integration target
traceId
```

PII, Token, 민감한 Student 원문을 불필요하게 남기지 않는다.

---

# 89. Trace ID

Backend에서 요청 추적이 필요하면:

```text
traceId
```

를 Error Response에 선택적으로 포함할 수 있다.

Frontend는 traceId를 Business Logic에 사용하지 않는다.

---

# 90. Correlation

외부 연동이 복잡해지면
내부 Request와 External Request를 연결할 Correlation ID를 검토한다.

현재 필수는 아니다.

---

# 91. Security-sensitive Data

다음은 API Response/Log에 무분별하게 포함하지 않는다.

```text
Authentication Token
Session Secret
Provider Credential
민감 PII
내부 운영 Note
```

---

# 92. Theme Naming

Frontend Shared Theme에서 의미 기반 Token을 사용한다.

권장 개념:

```text
background
surface
textPrimary
textSecondary
border
accent
positive
warning
negative
disabled
```

Feature마다 Raw Color를 의미 없이 직접 반복하지 않는다.

---

# 93. Responsive Naming

Breakpoint Token Naming은
Frontend 구조 확정 후 하나의 기준으로 관리한다.

예:

```text
mobile
tablet
desktop
wide
```

실제 Pixel 값은 현재 문서에서 임의 확정하지 않는다.

---

# 94. Accessibility Naming

Accessible label이 필요한 Component는
의미가 분명한 이름을 제공한다.

예:

```text
aria-label="피드백 닫기"
```

Icon 이름 자체를 그대로 사용자 Label로 쓰지 않는다.

---

# 95. Test Fixture Naming

Test Fixture는 역할이 드러나게 작성한다.

좋은 예:

```text
studentWithPendingFeedback
taskWithFailedAiAnalysis
parentReportWithoutConsent
```

피해야 할 예:

```text
mock1
testData2
sample
```

---

# 96. Status Transition Test Naming

테스트 이름은:

```text
given / when / then
```

의 의미가 드러나게 작성한다.

예:

```text
givenSubmittedActivity_whenRequestFeedback_thenFeedbackWaiting
```

프로젝트의 실제 테스트 프레임워크 Naming Convention에 맞춰 조정할 수 있다.

---

# 97. Deprecated Field

Field를 제거하기 전 여러 Consumer가 사용하면
Breaking Change 여부를 확인한다.

단순히 Frontend 한 곳에서 사용하지 않는다고
공용 Response Field를 즉시 삭제하지 않는다.

---

# 98. Shared Convention 변경

이 문서의 규칙을 변경할 때 확인:

```text
Frontend 영향
Backend 영향
Database 영향
API Contract 영향
Seed/Test 영향
기존 LearnersHigh Integration 영향
```

여러 Feature에 영향을 주는 큰 변경이면 ADR 필요 여부를 검토한다.

---

# 99. Open Conventions

다음은 아직 최종 확정하지 않는다.

```text
Production ID 생성 방식
Backend 내부 UTC 저장 방식
최대 Pagination size
API Versioning
Idempotency-Key 적용 범위
Optimistic Locking 적용 범위
실제 Breakpoint pixel
실제 Storage Provider
Auth Permission 상세 모델
```

구현 단계에서 필요해질 때
관련 문서/ADR을 먼저 갱신한다.

---

# 100. Checklist

새 공통 Field / Status / Query를 만들기 전 확인한다.

```text
[ ] 이미 같은 의미의 이름이 존재하는가?
[ ] Feature-specific 개념인가, Shared 개념인가?
[ ] Domain 의미가 정의되어 있는가?
[ ] API Contract에 반영해야 하는가?
[ ] 기존 LearnersHigh Mapping이 필요한가?
[ ] Null / Empty 의미가 명확한가?
[ ] 날짜/시간 단위가 이름에 드러나는가?
[ ] Count/Rate/Duration 단위가 명확한가?
[ ] UI State를 Business State로 만들고 있지 않은가?
[ ] Open Decision을 임의 확정하고 있지 않은가?
```

---

# 101. 핵심 요약

```text
JSON
→ camelCase

API/Frontend ID
→ string

Date
→ YYYY-MM-DD

DateTime
→ ISO 8601 + offset

Month
→ YYYY-MM

Enum
→ 의미가 명확한 string
→ 기본 UPPER_SNAKE_CASE
→ 기존 확정값이 있으면 무단 변경 금지

Pagination
→ page=0, size=20
→ 0-based

Search
→ query

Sort
→ sort=field,direction

File
→ fileRef + metadata

Error
→ code + message + details + optional traceId

Snapshot
→ 과거 시점 고정 데이터
→ 원본 변경으로 자동 덮어쓰기 금지
```

가장 중요한 원칙:

```text
같은 의미는 같은 이름으로 표현한다.
단위와 시점을 숨기지 않는다.
UI State와 Domain State를 섞지 않는다.
기존 시스템 표현 차이는 Integration Layer에서 흡수한다.
미정 Convention을 구현 편의를 위해 먼저 확정하지 않는다.
```
