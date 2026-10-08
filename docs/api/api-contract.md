# LearnersHigh Extension — API Contract

> 위치: `docs/api/api-contract.md`  
> 목적: LearnersHigh Extension의 **Frontend ↔ Spring Boot Backend API 계약**을 정의한다.  
> 이 문서는 Endpoint, Actor, Request, Response, Error, State Change의 기준 문서다.  
> Entity / State 의미는 `docs/specs/<owner>/domain.md`, 기능 동작은 각 Feature Spec을 우선 확인한다.

---

# 1. 문서 상태

이 문서는 현재 확정된 Feature Spec과 Domain을 기반으로 작성한 **초기 공통 API Contract**다.

다음 항목은 아직 실제 기존 LearnersHigh API / DB / 인증 구조를 확인하지 않았으므로
임의로 확정하지 않는다.

```text
- 기존 Student/Admin 인증 방식
- 기존 User PK 타입
- 기존 Plan API Endpoint
- 기존 Library API Endpoint
- 기존 Study Session API Endpoint
- 기존 Performance Task API Endpoint
- 실제 File Storage Provider
- Kakao Delivery Provider 세부 API
```

이러한 항목은 `docs/architecture/integration-boundary.md`를 따른다.

---

# 2. 관련 Source of Truth

```text
docs/SOURCE_OF_TRUTH.md
docs/OWNERSHIP.md
docs/architecture/overview.md
docs/architecture/integration-boundary.md
docs/architecture/shared-conventions.md

docs/specs/suyeon/domain.md
docs/specs/suyeon/features/mentor-hub.md
docs/specs/suyeon/features/school-admissions.md
docs/specs/suyeon/features/student-management.md
docs/specs/suyeon/features/parent-progress.md
```

우선순위:

```text
HTTP Method / Path / Request / Response / Error
→ api-contract.md

Entity / Relationship / State
→ domain.md

사용자 Flow / Interaction
→ Feature Spec

기존 LearnersHigh 연결
→ integration-boundary.md
```

---

# 3. API 기본 원칙

## 3-1. Base Path

```text
/api
```

Actor별 Namespace:

```text
/api/student/**
/api/admin/**
/api/mentor/**
```

기존 LearnersHigh Integration API가 따로 필요하다면
Frontend가 직접 호출하지 않고 Backend Integration Layer를 거친다.

---

## 3-2. JSON

기본 Content-Type:

```http
Content-Type: application/json
Accept: application/json
```

파일 업로드가 포함되는 경우:

```http
multipart/form-data
```

또는 Storage Upload Contract 확정 후 `fileRef` 기반 방식을 사용할 수 있다.

---

## 3-3. Naming

JSON Field:

```text
camelCase
```

URL Resource:

```text
kebab-case
```

예:

```text
/api/admin/parent-reports
/api/student/school-records
```

---

## 3-4. ID

ID는 Frontend에서 숫자라고 가정하지 않는다.

```json
{
  "taskId": "task_001"
}
```

Frontend Type:

```text
string
```

기존 LearnersHigh ID와 Extension ID Mapping은
Integration Layer가 책임진다.

---

## 3-5. Date / Time

날짜:

```text
YYYY-MM-DD
```

시간이 포함된 값:

```text
ISO 8601
```

예:

```json
{
  "deadlineDate": "2026-10-20",
  "submittedAt": "2026-10-09T14:30:00+09:00"
}
```

Timezone 기준은 `shared-conventions.md`에서 최종 정의한다.

---

# 4. 공통 Response 원칙

성공 Response는 불필요한 Wrapper를 여러 단계 만들지 않는다.

단일 Resource 예:

```json
{
  "taskId": "task_001",
  "title": "AI 윤리 발표"
}
```

목록은 다음 구조를 기본으로 한다.

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

Pagination이 필요 없는 소규모 목록은 단순 `items`만 사용할 수 있다.

---

# 5. 공통 Error Format

```json
{
  "code": "TASK_NOT_FOUND",
  "message": "Task를 찾을 수 없습니다.",
  "details": {},
  "traceId": "optional-trace-id"
}
```

필드:

| Field | 의미 |
|---|---|
| `code` | Frontend가 분기 가능한 안정적인 Error Code |
| `message` | 사용자 또는 개발자에게 전달할 Message |
| `details` | Validation 등 추가 정보 |
| `traceId` | 서버 추적용 Optional 값 |

---

## 5-1. HTTP Status

기본 규칙:

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
502/503 Integration Failure
```

---

## 5-2. Validation Error

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

# 6. 공통 Integration Error

기존 LearnersHigh 연동 실패와 Empty를 구분한다.

금지:

```text
기존 Plan API 실패
→ items: []
```

권장:

```json
{
  "code": "EXISTING_PLAN_UNAVAILABLE",
  "message": "기존 학습계획 정보를 불러오지 못했습니다.",
  "details": {}
}
```

---

# 7. Actor / Permission 표기

각 Endpoint는 다음 Actor 중 하나를 가진다.

```text
STUDENT
ADMIN
MENTOR
```

현재 인증 Token / Session 방식은 미확정이다.

Endpoint의 Actor는 **접근 가능한 사용자 Surface**를 의미한다.

---

# 8. Common Query Convention

검색:

```text
?query=
```

Pagination:

```text
?page=0&size=20
```

정렬:

```text
?sort=updatedAt,desc
```

필터 예:

```text
?status=
?grade=
?type=
?month=
```

실제 허용 Filter는 각 Endpoint에서 명시한다.

---

# 9. Student — School & Admissions

Base:

```text
/api/student
```

---

## 9-1. Task List

```http
GET /api/student/tasks
```

Actor:

```text
STUDENT
```

Query 예:

```text
?status=
?subject=
?page=0
&size=20
```

Response:

```json
{
  "items": [
    {
      "taskId": "task_001",
      "title": "AI 윤리 발표",
      "subject": "정보",
      "deadlineDate": "2026-10-20",
      "currentStage": "TOPIC",
      "nextAction": "주제를 제출하세요.",
      "isDeadlineRisk": false
    }
  ],
  "page": {
    "number": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

`currentStage`의 실제 Enum Naming은 Domain / Convention 확정 후 고정한다.

---

## 9-2. Task Create

```http
POST /api/student/tasks
```

Actor:

```text
STUDENT
```

주의:

기존 LearnersHigh Performance Task와 연결 가능한 경우
Extension에 중복 Task를 생성하지 않는다.

Request 예:

```json
{
  "title": "AI 윤리 발표",
  "subject": "정보",
  "deadlineDate": "2026-10-20",
  "description": "발표 자료 준비"
}
```

Response:

```json
{
  "taskId": "task_001",
  "title": "AI 윤리 발표",
  "currentStage": "GUIDE_REGISTERED",
  "createdAt": "2026-10-09T14:30:00+09:00"
}
```

State Change:

```text
Task 생성
→ 수행평가 8단계 Stage 1
```

---

## 9-3. Task Detail

```http
GET /api/student/tasks/{taskId}
```

Actor:

```text
STUDENT
```

Response 예:

```json
{
  "taskId": "task_001",
  "title": "AI 윤리 발표",
  "subject": "정보",
  "deadlineDate": "2026-10-20",
  "currentStage": "TOPIC",
  "topic": null,
  "topicApprovalStatus": null,
  "nextAction": "주제를 제출하세요.",
  "evidenceCount": 0,
  "latestVersion": null,
  "finalArtifact": null,
  "relatedMentorCases": []
}
```

---

# 10. Student — Topic

## 10-1. Topic Submit

```http
PUT /api/student/tasks/{taskId}/topic
```

Actor:

```text
STUDENT
```

Request:

```json
{
  "topic": "생성형 AI가 교육에 미치는 영향"
}
```

Response:

```json
{
  "taskId": "task_001",
  "topic": "생성형 AI가 교육에 미치는 영향",
  "topicApprovalStatus": "PENDING",
  "currentStage": "TOPIC"
}
```

주의:

`PENDING`은 API 계약 작성을 위한 초기 후보 값이다.
`domain.md`의 Open Decision에서 정확한 Topic Approval Enum을 최종 확정해야 한다.

---

# 11. Student — Evidence

## 11-1. Evidence List

```http
GET /api/student/tasks/{taskId}/evidence
```

Response:

```json
{
  "items": [
    {
      "evidenceId": "evidence_001",
      "fileName": "AI_교육기사_3건_요약.pdf",
      "fileRef": "file_ref_001",
      "stageTag": "RESEARCH",
      "createdAt": "2026-10-09T14:30:00+09:00"
    }
  ]
}
```

---

## 11-2. Evidence Add

권장 Contract:

```http
POST /api/student/tasks/{taskId}/evidence
Content-Type: multipart/form-data
```

Form:

```text
file
stageTag
```

Response:

```json
{
  "evidenceId": "evidence_001",
  "fileName": "AI_교육기사_3건_요약.pdf",
  "fileRef": "file_ref_001",
  "stageTag": "RESEARCH"
}
```

State Change:

```text
Task.evidence 증가
→ Evidence >= 1이면 자료 조사 Stage 완료 조건 만족 가능
```

실제 Storage Provider가 결정되면
Direct Upload + `fileRef` 방식으로 변경할 수 있다.

---

## 11-3. Evidence Delete

```http
DELETE /api/student/tasks/{taskId}/evidence/{evidenceId}
```

Response:

```text
204 No Content
```

주의:

Evidence 삭제로 인해 Stage 조건이 깨질 수 있을 때의 역전이 정책은
현재 Spec에 정의되어 있지 않으므로 임의로 Stage를 되돌리지 않는다.

---

# 12. Student — Version / AI Analysis

## 12-1. Version Submit

```http
POST /api/student/tasks/{taskId}/versions
```

Actor:

```text
STUDENT
```

초기 방식:

```http
Content-Type: multipart/form-data
```

Form:

```text
file
```

Response:

```json
{
  "versionId": "version_001",
  "taskId": "task_001",
  "versionNumber": 1,
  "fileRef": "file_ref_002",
  "aiAnalysisStatus": "PROCESSING",
  "submittedAt": "2026-10-09T14:30:00+09:00"
}
```

State Change:

```text
Version 생성
→ AI Analysis 시작
```

---

## 12-2. Version List

```http
GET /api/student/tasks/{taskId}/versions
```

Response:

```json
{
  "items": [
    {
      "versionId": "version_001",
      "versionNumber": 1,
      "fileRef": "file_ref_002",
      "aiAnalysisStatus": "SUCCESS",
      "submittedAt": "2026-10-09T14:30:00+09:00"
    }
  ]
}
```

---

## 12-3. Version Detail

```http
GET /api/student/tasks/{taskId}/versions/{versionId}
```

Response는 Version Metadata + AI Analysis Summary를 포함할 수 있다.

---

## 12-4. AI Retry

```http
POST /api/student/tasks/{taskId}/versions/{versionId}/ai-analysis/retry
```

Actor:

```text
STUDENT
```

Response:

```json
{
  "versionId": "version_001",
  "aiAnalysisStatus": "PROCESSING"
}
```

Error:

```text
VERSION_NOT_FOUND
AI_ANALYSIS_ALREADY_PROCESSING
AI_ANALYSIS_RETRY_NOT_ALLOWED
```

---

# 13. Student — Feedback / Revision

## 13-1. Task Feedback

```http
GET /api/student/tasks/{taskId}/feedback
```

Response 예:

```json
{
  "teacherFeedback": [
    {
      "feedbackId": "feedback_001",
      "versionId": "version_001",
      "comment": "근거 자료의 출처를 더 구체적으로 적어주세요.",
      "nextAction": "출처를 보강한 V2를 제출하세요.",
      "deliveredAt": "2026-10-10T10:00:00+09:00"
    }
  ],
  "aiFeedback": [
    {
      "feedbackId": "feedback_ai_001",
      "versionId": "version_001",
      "summary": "주장과 근거 연결이 약한 부분이 있습니다."
    }
  ]
}
```

Student UI에서는 Teacher/Staff Feedback을 Primary로 표현한다.

---

## 13-2. Revision History

```http
GET /api/student/tasks/{taskId}/revision-history
```

Query:

```text
?fromVersionId=
&toVersionId=
```

Response:

```json
{
  "versions": [],
  "selectedDiff": {
    "fromVersionId": "version_001",
    "toVersionId": "version_002",
    "changes": []
  }
}
```

Diff의 실제 Text/Data 형식은 제출물 종류에 따라 달라질 수 있으므로
현재 단계에서 세부 Schema를 고정하지 않는다.

---

# 14. Student — Final Artifact

## 14-1. Artifact Detail

```http
GET /api/student/tasks/{taskId}/final-artifact
```

Response:

```json
{
  "artifactId": "artifact_001",
  "taskId": "task_001",
  "type": "PDF",
  "fileRef": "file_ref_final",
  "parentShareStatus": "not_shared"
}
```

---

## 14-2. Parent Share Consent

```http
PUT /api/student/tasks/{taskId}/final-artifact/parent-share
```

Request:

```json
{
  "consented": true
}
```

Response:

```json
{
  "artifactId": "artifact_001",
  "parentShareStatus": "consented"
}
```

Rules:

```text
false
→ not_shared 또는 consent 해제 상태로 복귀
→ Parent Report 첨부 대상에서 제거

true
→ consented
```

`attached`, `shared`는 Admin Report Flow에서 변경된다.

---

# 15. Student — Growth Activity

## 15-1. Activity List

```http
GET /api/student/activities
```

Query:

```text
?type=
?status=
?query=
?page=
&size=
```

Response:

```json
{
  "items": [
    {
      "activityId": "activity_001",
      "title": "교내 AI 프로젝트",
      "type": "SCHOOL_PROJECT",
      "status": "DRAFT",
      "period": {
        "startDate": "2026-09-01",
        "endDate": "2026-09-30"
      }
    }
  ],
  "page": {
    "number": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

Activity Type API Enum은 구현 시 `shared-conventions.md`에서 최종 고정한다.

---

## 15-2. Activity Create

```http
POST /api/student/activities
```

Request:

```json
{
  "title": "교내 AI 프로젝트",
  "type": "SCHOOL_PROJECT",
  "organizer": "교내 소프트웨어 동아리",
  "startDate": "2026-09-01",
  "endDate": "2026-09-30",
  "role": "발표 자료 조사",
  "participationReason": "",
  "process": "",
  "contribution": "",
  "result": "",
  "followUp": "",
  "tags": [],
  "visibility": "PRIVATE"
}
```

Response:

```json
{
  "activityId": "activity_001",
  "status": "DRAFT"
}
```

---

## 15-3. Activity Detail

```http
GET /api/student/activities/{activityId}
```

---

## 15-4. Activity Update

```http
PATCH /api/student/activities/{activityId}
```

Draft 상태의 수정에 사용한다.

수정 가능 Field와 Submitted 이후 수정 정책은
Feature 구현 시 명확히 제한한다.

---

## 15-5. Activity Submit

```http
POST /api/student/activities/{activityId}/submit
```

State Change:

```text
Draft
→ Submitted
```

---

# 16. Student — Activity Evidence

## 16-1. Evidence Add

```http
POST /api/student/activities/{activityId}/evidence
```

파일 처리 방식은 Task Evidence와 동일한 Contract를 사용한다.

---

## 16-2. Evidence Delete

```http
DELETE /api/student/activities/{activityId}/evidence/{evidenceId}
```

---

# 17. Student — Activity Feedback / Reflection / Archive

## 17-1. Feedback Request

```http
POST /api/student/activities/{activityId}/feedback-request
```

State Change:

```text
Submitted
→ Feedback Waiting
```

모든 Activity에 이 요청을 강제하지 않는다.

---

## 17-2. Activity Feedback

```http
GET /api/student/activities/{activityId}/feedback
```

Response:

```json
{
  "feedback": {
    "strength": "과정이 구체적으로 드러납니다.",
    "needsDetail": "본인 기여를 더 구체적으로 적어주세요.",
    "question": "가장 어려웠던 의사결정은 무엇이었나요?",
    "nextSuggestion": "후속 탐구 주제를 연결해보세요."
  }
}
```

---

## 17-3. Reflection Save

```http
PUT /api/student/activities/{activityId}/reflection
```

Request:

```json
{
  "participationReason": "...",
  "role": "...",
  "whatIDid": "...",
  "difficulty": "...",
  "learning": "...",
  "nextChange": "...",
  "followUpActivity": "..."
}
```

AI/Admin이 이 값을 대신 작성하지 않는다.

---

## 17-4. Archive

```http
POST /api/student/activities/{activityId}/archive
```

State Change:

```text
Reflected
→ Archived
```

---

# 18. Student — Archive

```http
GET /api/student/archive
```

Query:

```text
?source=task|growth
?query=
?page=
&size=
```

Response:

```json
{
  "items": [
    {
      "source": "task",
      "sourceId": "task_001",
      "title": "AI 윤리 발표",
      "periodLabel": "2026년 2학기",
      "category": "정보",
      "result": "최종 제출 완료",
      "reflectionSummary": null,
      "evidenceCount": 3
    }
  ],
  "page": {
    "number": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

Archive를 별도 Entity/Table로 저장할지는 `domain.md` Open Decision이다.

---

# 19. Student — Interview Bridge

## 19-1. Published Questions

```http
GET /api/student/interview/questions
```

Actor:

```text
STUDENT
```

고3 대상이며 Published 질문만 반환한다.

Response:

```json
{
  "items": [
    {
      "questionId": "question_001",
      "question": "이 활동에서 가장 중요한 역할은 무엇이었나요?",
      "relatedActivityIds": ["activity_001"],
      "practiceStatus": "NOT_STARTED"
    }
  ]
}
```

`practiceStatus`의 정확한 Enum은 Feature 구현 시 확정한다.

---

## 19-2. Answer Save

```http
PUT /api/student/interview/questions/{questionId}/answer
```

Request:

```json
{
  "answer": "..."
}
```

---

## 19-3. Practice Status

```http
PUT /api/student/interview/questions/{questionId}/practice-status
```

Request:

```json
{
  "status": "PRACTICING"
}
```

Enum은 추후 확정한다.

---

# 20. Student — Mentor Hub

## 20-1. Recommendation Home

```http
GET /api/student/mentor/recommendations
```

Response 예:

```json
{
  "recommendedMentors": [],
  "adminRecommendedCases": [],
  "mixedContent": []
}
```

추천은 대학 순위만으로 결정하지 않는다.

Student Context 적합성을 사용한다.

---

## 20-2. Mentor List

```http
GET /api/student/mentors
```

Query:

```text
?query=
?admissionType=
?major=
?page=
&size=
```

---

## 20-3. Mentor Profile

```http
GET /api/student/mentors/{mentorId}
```

Response 예:

```json
{
  "mentorId": "mentor_001",
  "name": "김민준",
  "university": "서울대학교",
  "major": "컴퓨터공학부",
  "admissionType": "학생부종합",
  "highSchoolContext": "...",
  "representativeExperience": "...",
  "verified": true,
  "tags": [],
  "contentSummary": {}
}
```

---

# 21. Student — Mentor Content

## 21-1. Content List

```http
GET /api/student/mentor-content
```

Query:

```text
?type=plan|routine|story|record|case
?mentorId=
?query=
?page=
&size=
```

---

## 21-2. Content Detail

```http
GET /api/student/mentor-content/{contentId}
```

Record / Case는 Published 상태의 검수된 콘텐츠만 Student에게 반환한다.

---

## 21-3. Save Content

```http
PUT /api/student/mentor-content/{contentId}/saved
```

Request:

```json
{
  "saved": true
}
```

---

# 22. Student — Mentor Plan Apply

## 22-1. Apply Preview / Conflict Check

```http
POST /api/student/mentor-content/{contentId}/plan-apply-preview
```

Request:

```json
{
  "startDate": "2026-10-12",
  "selectedItemIds": ["item_001", "item_002"],
  "libraryMappings": [
    {
      "mentorItemId": "item_001",
      "existingLibraryItemId": "library_123"
    }
  ]
}
```

Response:

```json
{
  "conflicts": [],
  "resolvedItems": []
}
```

---

## 22-2. Plan Apply

```http
POST /api/student/mentor-content/{contentId}/apply-plan
```

Request는 Preview에서 확정한 값과 Conflict Resolution을 포함한다.

Response:

```json
{
  "applicationId": "mentor_apply_001",
  "createdPlanItemIds": ["existing_plan_item_001"],
  "sourceMentorPlanId": "content_001",
  "snapshotCreated": true
}
```

기존 LearnersHigh Plan Write는 Integration Boundary를 따른다.

Mentor 원본 수정이 이미 적용된 Student Plan을 자동 변경하지 않는다.

---

# 23. Student — Mentor Routine Apply

## 23-1. Routine Preview

```http
POST /api/student/mentor-content/{contentId}/routine-apply-preview
```

Request:

```json
{
  "selectedHabitIds": ["habit_001"]
}
```

Response:

```json
{
  "conflicts": []
}
```

---

## 23-2. Routine Apply

```http
POST /api/student/mentor-content/{contentId}/apply-routine
```

정확한 Existing Plan/Schedule 연결 방식은 Integration 설계 후 확정한다.

---

# 24. Student — Mentor Q&A

## 24-1. My Questions

```http
GET /api/student/mentor-questions
```

---

## 24-2. Question Submit

```http
POST /api/student/mentor-questions
```

Request:

```json
{
  "mentorId": "mentor_001",
  "category": "STUDY_METHOD",
  "question": "수학 오답 정리는 어떻게 하셨나요?"
}
```

Response:

```json
{
  "questionId": "mq_001",
  "status": "pending",
  "mentorId": "mentor_001",
  "submittedAt": "2026-10-09T14:30:00+09:00"
}
```

---

## 24-3. Question Detail

```http
GET /api/student/mentor-questions/{questionId}
```

Response:

```json
{
  "questionId": "mq_001",
  "status": "answered",
  "question": "...",
  "answer": "...",
  "relatedContent": []
}
```

Known status:

```text
pending
answered
overdue
```

`reassign`은 현재 Action인지 상태인지 미확정이다.

---

# 25. Mentor — My Content

Base:

```text
/api/mentor
```

---

## 25-1. Content List

```http
GET /api/mentor/content
```

Query:

```text
?type=
?status=
?page=
&size=
```

---

## 25-2. Content Detail

```http
GET /api/mentor/content/{contentId}
```

---

## 25-3. Content Create

```http
POST /api/mentor/content
```

Request 개념:

```json
{
  "type": "STORY",
  "title": "...",
  "tags": [],
  "body": {},
  "visibility": "PUBLIC"
}
```

`body`의 내부 Shape은 Content Type별로 다르므로
Feature 구현 시 Type-specific DTO로 분리할 수 있다.

---

## 25-4. Content Update

```http
PATCH /api/mentor/content/{contentId}
```

---

## 25-5. Publish Request

```http
POST /api/mentor/content/{contentId}/publish
```

일반 Content는 즉시 Publish 가능 여부를 Feature에서 정의한다.

Record / Case는:

```text
PII Detection
→ Admin Review
→ Published
```

를 따른다.

즉 Record / Case에서 이 Endpoint는
Review Pending으로 전환하는 Command가 될 수 있다.

정확한 Review State는 Domain Open Decision 해결 후 확정한다.

---

# 26. Mentor — Q&A Inbox

## 26-1. Inbox

```http
GET /api/mentor/questions
```

Query:

```text
?status=pending|overdue|answered
?page=
&size=
```

질문자 Context:

```json
{
  "anonymousStudentContext": {
    "grade": "고2",
    "interestField": "화학공학"
  }
}
```

Student 실명 / 학교 / 기관 / 상세 관리 데이터는 반환하지 않는다.

---

## 26-2. Question Detail

```http
GET /api/mentor/questions/{questionId}
```

---

## 26-3. Answer

```http
POST /api/mentor/questions/{questionId}/answer
```

Request:

```json
{
  "answer": "...",
  "relatedContentIds": ["content_001"]
}
```

State Change:

```text
pending | overdue
→ answered

Student Q&A에 즉시 반영
```

---

# 27. Mentor — Profile

## 27-1. My Profile

```http
GET /api/mentor/profile
```

## 27-2. Update Profile

```http
PATCH /api/mentor/profile
```

수정 가능한 공개 필드만 허용한다.

---

# 28. Admin — Feedback Dashboard

Base:

```text
/api/admin
```

---

## 28-1. Dashboard Summary

```http
GET /api/admin/feedback/dashboard
```

Response:

```json
{
  "kpi": {
    "feedbackPending": 12,
    "deadlineRisk": 4,
    "revisionNotApplied": 3,
    "completedThisWeek": 18
  }
}
```

KPI는 별도 Mock Counter가 아니라 실제 Entity 상태에서 계산한다.

---

## 28-2. Shared Feedback Queue

```http
GET /api/admin/feedback
```

Query 예:

```text
?type=task|activity
?grade=
?stage=
?deadlineFrom=
?deadlineTo=
?waitingHoursMin=
?status=
?page=
&size=
```

Response:

```json
{
  "items": [
    {
      "feedbackId": "feedback_001",
      "type": "task",
      "student": {
        "studentId": "student_001",
        "displayName": "최수연"
      },
      "title": "AI 윤리 발표",
      "stage": "FEEDBACK",
      "waitingHours": 10,
      "deadlineDate": "2026-10-20"
    }
  ],
  "page": {
    "number": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

특정 Staff / 과목 자동 Routing은 사용하지 않는다.

---

# 29. Admin — Feedback Review

## 29-1. Feedback Detail

```http
GET /api/admin/feedback/{feedbackId}
```

Response 개념:

```json
{
  "feedbackId": "feedback_001",
  "submission": {},
  "criteria": [],
  "aiAnalysis": [],
  "staffReview": null
}
```

---

## 29-2. Feedback Review Submit

```http
POST /api/admin/feedback/{feedbackId}/review
```

Request:

```json
{
  "aiItems": [
    {
      "itemId": "ai_item_001",
      "decision": "ACCEPT",
      "editedText": null
    }
  ],
  "studentComment": "출처를 더 구체적으로 적어주세요.",
  "nextAction": "V2 제출",
  "parentReportCandidate": false,
  "action": "DELIVER"
}
```

AI Item Decision 후보:

```text
ACCEPT
EXCLUDE
EDIT_AND_DELIVER
```

Feature Spec에 정의된 세 행동을 API에서 표현하기 위한 Naming이다.

Response:

```json
{
  "feedbackId": "feedback_001",
  "delivered": true,
  "deliveredAt": "2026-10-10T10:00:00+09:00"
}
```

State Change:

```text
Admin Review
→ Student Feedback 반영
→ Queue/KPI 재계산
```

---

# 30. Admin — Topic Review

## 30-1. Review

```http
POST /api/admin/tasks/{taskId}/topic-review
```

Request 예:

```json
{
  "decision": "APPROVE",
  "comment": null
}
```

또는 방향 요청:

```json
{
  "decision": "REQUEST_DIRECTION",
  "comment": "범위를 조금 더 좁혀보세요."
}
```

Topic Approval Enum은 Domain Open Decision과 함께 최종 확정한다.

---

# 31. Admin — Activity Feedback

## 31-1. Activity Feedback Submit

```http
POST /api/admin/activities/{activityId}/feedback
```

Request:

```json
{
  "strength": "...",
  "needsDetail": "...",
  "question": "...",
  "nextSuggestion": "...",
  "parentReportCandidate": true
}
```

State Change:

```text
Feedback Waiting
→ Feedback Delivered
```

---

# 32. Admin — Mentor Case Recommendation

## 32-1. Case Search

```http
GET /api/admin/mentor-cases
```

Query:

```text
?query=
?subject=
?activityType=
?page=
&size=
```

---

## 32-2. Recommend Case

```http
POST /api/admin/students/{studentId}/mentor-case-recommendations
```

Request:

```json
{
  "caseId": "content_case_001",
  "taskId": "task_001",
  "activityId": null,
  "reason": "현재 수행평가 주제와 유사한 탐구 과정"
}
```

State Change:

```text
Task.relatedMentorCaseIds 갱신
+
Student Mentor Hub Recommendation 갱신
```

---

# 33. Admin — Today Board

```http
GET /api/admin/today-board
```

Query:

```text
?branchId=
?grade=
?query=
```

Response:

```json
{
  "kpi": {
    "attendedToday": 0,
    "needsAttention": 0,
    "feedbackPending": 0,
    "parentReportUnsent": 0
  },
  "items": [
    {
      "studentId": "student_001",
      "displayName": "최수연",
      "grade": "고2",
      "todayPureStudyMinutes": 240,
      "recent7DayPlanExecutionRate": 0.58,
      "taskStatus": "D-2",
      "recentChange": "영어 87 → 81",
      "managementPoint": "최근 2주 Plan 실행률 감소"
    }
  ]
}
```

기존 Study / Plan 데이터는 Integration Layer를 통해 조합한다.

---

# 34. Admin — Student 360

## 34-1. Overview

```http
GET /api/admin/students/{studentId}/360
```

Response:

```json
{
  "student": {},
  "overview": {},
  "study": {},
  "school": {},
  "activities": {},
  "mentor": {},
  "reports": {}
}
```

데이터가 크면 Tab별 Endpoint로 분리할 수 있다.

권장 후보:

```text
GET /api/admin/students/{studentId}/360/overview
GET /api/admin/students/{studentId}/360/study
GET /api/admin/students/{studentId}/360/school
GET /api/admin/students/{studentId}/360/activities
GET /api/admin/students/{studentId}/360/mentor
GET /api/admin/students/{studentId}/360/reports
```

초기 구현에서는 성능과 화면 사용 패턴을 보고 한 방식으로 통일한다.

---

# 35. Admin — TestResult

## 35-1. List

```http
GET /api/admin/students/{studentId}/test-results
```

Type:

```text
school_exam
mock_exam
academy_test
```

Response Item:

```json
{
  "testResultId": "test_001",
  "type": "school_exam",
  "name": "2학기 중간고사",
  "score": 87,
  "grade": null,
  "percentile": null,
  "rank": 12,
  "previousResult": 82,
  "change": 5
}
```

입력되지 않은 값은 임의 생성하지 않는다.

---

## 35-2. Create / Update

실제 TestResult 입력 주체가 Admin으로 확정될 경우:

```http
POST /api/admin/students/{studentId}/test-results
PATCH /api/admin/students/{studentId}/test-results/{testResultId}
```

현재 Feature Spec은 표시/관리 요구는 있지만
정확한 입력 Flow를 충분히 정의하지 않았으므로
Frontend 구현 전 확인한다.

---

# 36. Admin — SchoolRecordSnapshot

## 36-1. List

```http
GET /api/admin/students/{studentId}/school-records
```

Response:

```json
{
  "items": [
    {
      "schoolRecordSnapshotId": "record_001",
      "status": "candidate",
      "category": "동아리활동",
      "summary": "...",
      "snapshotDate": "2026-10-09"
    }
  ]
}
```

Status:

```text
confirmed
candidate
```

---

## 36-2. Status Update

```http
PUT /api/admin/students/{studentId}/school-records/{snapshotId}/status
```

Request:

```json
{
  "status": "confirmed"
}
```

candidate → confirmed 전환 기준은 Feature 구현 전에 명확히 확인해야 한다.

---

# 37. Admin — Connection

## 37-1. Candidate List

```http
GET /api/admin/connections
```

Query:

```text
?studentId=
?status=
```

---

## 37-2. Confirm

```http
POST /api/admin/connections/{connectionId}/confirm
```

---

## 37-3. Reject

```http
POST /api/admin/connections/{connectionId}/reject
```

정확한 durable status Enum은 Domain Open Decision에서 확정한다.

---

# 38. Admin — Interview Management

## 38-1. Question List

```http
GET /api/admin/interview/questions
```

---

## 38-2. Create

```http
POST /api/admin/interview/questions
```

Request:

```json
{
  "studentId": "student_001",
  "question": "...",
  "relatedActivityIds": ["activity_001"]
}
```

---

## 38-3. Update

```http
PATCH /api/admin/interview/questions/{questionId}
```

---

## 38-4. Delete

```http
DELETE /api/admin/interview/questions/{questionId}
```

---

## 38-5. Publish

```http
POST /api/admin/interview/questions/{questionId}/publish
```

Published 이후 Student Interview Bridge에 노출된다.

---

# 39. Admin — Operations Dashboard

```http
GET /api/admin/operations
```

Response 예:

```json
{
  "kpi": {
    "registeredStudents": 0,
    "studentsWithStudyRecordToday": 0,
    "activeTasks": 0,
    "taskFeedbackPending": 0,
    "activityFeedbackPending": 0,
    "deadlineRisk": 0,
    "parentReportUnsent": 0,
    "averageFirstReviewHours": 0,
    "queueOver48Hours": 0
  },
  "alerts": []
}
```

모든 KPI는 가능한 한 Shared Entity / Existing Data에서 계산한다.

---

# 40. Admin — Parent Report List

## 40-1. List

```http
GET /api/admin/parent-reports
```

Query:

```text
?studentId=
?month=2026-10
?status=
?page=
&size=
```

Response:

```json
{
  "items": [
    {
      "parentReportId": "report_001",
      "studentId": "student_001",
      "studentName": "최수연",
      "grade": "고2",
      "period": "2026-10",
      "status": "Draft",
      "warnings": [],
      "updatedAt": "2026-10-09T14:30:00+09:00",
      "sentAt": null
    }
  ]
}
```

주의:

ParentReport Status는 Domain Open Decision이 남아 있다.

현재 알려진 값:

```text
Draft
Reviewing
Ready
Sent
```

그리고 별도로:

```text
generated
```

가 기존 Spec에 존재한다.

최종 Enum 확정 전 문자열을 코드 전역 Enum으로 고정하지 않는다.

---

# 41. Admin — Parent Report Detail / Editor

## 41-1. Detail

```http
GET /api/admin/parent-reports/{reportId}
```

Response 개념:

```json
{
  "parentReportId": "report_001",
  "student": {},
  "period": "2026-10",
  "status": "Draft",
  "sections": {
    "monthlySummary": {},
    "studyPlan": {},
    "testResult": {},
    "taskResult": {},
    "strengthAttention": {},
    "schoolRecordActivity": {},
    "mentor": {},
    "nextPlan": {},
    "adminComment": {},
    "finalArtifact": {}
  },
  "validation": {
    "sendable": false,
    "warnings": []
  }
}
```

---

## 41-2. Update Draft

```http
PATCH /api/admin/parent-reports/{reportId}
```

Admin이 수정할 수 있는 Draft Section만 허용한다.

Source Entity Raw Data 자체를 수정하지 않는다.

---

# 42. Admin — Parent Report Draft / Generate

## 42-1. Create Monthly Draft

```http
POST /api/admin/parent-reports
```

Request:

```json
{
  "studentId": "student_001",
  "month": "2026-10"
}
```

State Change:

```text
Shared Data Aggregation
→ ParentReport Draft
```

---

## 42-2. AI Draft

```http
POST /api/admin/parent-reports/{reportId}/ai-draft
```

Response:

```json
{
  "monthlySummary": "...",
  "strength": "...",
  "attention": "...",
  "meaningfulChange": "...",
  "nextPlanCandidate": "..."
}
```

AI 결과는 최종 공개값이 아니다.

---

## 42-3. Validation

```http
POST /api/admin/parent-reports/{reportId}/validate
```

Response:

```json
{
  "sendable": false,
  "errors": [
    {
      "code": "MISSING_RESPONSE_PLAN",
      "message": "감소 지표에 대한 대응 Plan이 필요합니다."
    }
  ],
  "warnings": []
}
```

Validation Rule:

```text
하락 지표 + 대응 Plan 없음
→ Send Disabled

candidate Record를 confirmed처럼 표현
→ Send Disabled

Student 미동의 Artifact 첨부
→ Send Disabled
```

---

## 42-4. Generate PDF / Image

```http
POST /api/admin/parent-reports/{reportId}/generate
```

Request:

```json
{
  "format": "PDF"
}
```

또는:

```json
{
  "format": "IMAGE"
}
```

Response:

```json
{
  "reportId": "report_001",
  "exportFileRef": "export_001",
  "generatedAt": "2026-10-09T14:30:00+09:00"
}
```

권장:

`generated`를 ParentReport main status와 분리하고
`generatedAt` / `exportFileRef`로 표현하는 방식을 우선 검토한다.

단, 이는 Domain Open Decision 확정 후 최종 반영한다.

---

# 43. Admin — Parent Report Preview

```http
GET /api/admin/parent-reports/{reportId}/preview
```

Response는 Preview용 structured data 또는
Preview URL / rendered asset을 반환할 수 있다.

실제 구현 방식은 PDF/Image Rendering 기술 결정 후 확정한다.

---

# 44. Admin — Parent Report Send

```http
POST /api/admin/parent-reports/{reportId}/send
```

Request 예:

```json
{
  "channel": "KAKAO"
}
```

Precondition:

```text
Validation PASS
Generated Output 존재
Student Artifact Consent 만족
```

Response:

```json
{
  "reportId": "report_001",
  "status": "Sent",
  "sentAt": "2026-10-09T15:00:00+09:00"
}
```

State Change:

```text
ParentReport sent
Artifact.parentShareStatus = shared
Operations 미발송 Count 재계산
```

Read Status는 외부 Provider가 신뢰 가능한 값을 제공할 때만 추가한다.

---

# 45. Admin — Mentor Content Review

Record / Case가 Admin Review를 필요로 할 경우
다음 API가 필요할 수 있다.

초기 후보:

```http
GET /api/admin/mentor-content/review
GET /api/admin/mentor-content/{contentId}/review
POST /api/admin/mentor-content/{contentId}/review
```

다만 현재 Suyeon Feature Spec에서 Admin Review 화면 상세가 충분히 정의되지 않았으므로
Endpoint를 구현 전에 Feature Spec 보완이 필요하다.

---

# 46. Admin Settings

기존 공통 Settings와 연결한다.

Extension이 새 Settings 시스템을 만들지 않는다.

필요 시 Extension-specific 설정만 기존 Setting Contract에 연결한다.

예:

```text
AI 공개 정책
Theme
Institution
```

실제 Endpoint는 기존 LearnersHigh Settings 구조 확인 후 확정한다.

---

# 47. File Contract

현재 파일 사용 Entity:

```text
Evidence
Version
TaskFinalArtifact
ParentReport export
Mentor Content media 가능성
```

공통 File Reference 후보:

```json
{
  "fileRef": "file_ref_001",
  "fileName": "speech_v2_548words.docx",
  "contentType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "sizeBytes": 124000
}
```

Storage Provider / Signed URL 방식은 아직 확정하지 않는다.

---

# 48. Pagination Contract

Request:

```text
?page=0&size=20
```

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

Page는 0-based를 초기 기준으로 사용한다.

`shared-conventions.md` 작성 시 최종 확정한다.

---

# 49. Sort Contract

예:

```text
?sort=updatedAt,desc
```

복수 Sort가 필요하면 반복 Query를 사용할 수 있다.

```text
?sort=status,asc&sort=deadlineDate,asc
```

실제 Spring 구현 방식과 일치시킨다.

---

# 50. Idempotency

다음 Command는 중복 요청에 주의한다.

```text
Version Submit
Mentor Plan Apply
Parent Report Generate
Parent Report Send
Question Answer
Case Recommendation
```

필요한 Endpoint에는 향후:

```http
Idempotency-Key
```

사용을 검토한다.

초기 구현에서 강제 여부는 별도 결정한다.

---

# 51. Optimistic Concurrency

Admin과 Student가 같은 Entity를 동시에 수정할 가능성이 있는 경우
`updatedAt` 또는 Version Field를 이용한 충돌 감지를 검토한다.

예:

```json
{
  "expectedVersion": 3
}
```

409:

```json
{
  "code": "RESOURCE_VERSION_CONFLICT",
  "message": "다른 변경사항이 먼저 저장되었습니다."
}
```

현재 모든 Resource에 강제하지 않는다.

---

# 52. Common Error Codes

초기 공통 후보:

```text
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
RESOURCE_NOT_FOUND
RESOURCE_VERSION_CONFLICT
INVALID_STATE_TRANSITION

STUDENT_NOT_FOUND
TASK_NOT_FOUND
VERSION_NOT_FOUND
EVIDENCE_NOT_FOUND
ACTIVITY_NOT_FOUND
FEEDBACK_NOT_FOUND
MENTOR_NOT_FOUND
MENTOR_CONTENT_NOT_FOUND
MENTOR_QUESTION_NOT_FOUND
PARENT_REPORT_NOT_FOUND

AI_ANALYSIS_FAILED
AI_ANALYSIS_ALREADY_PROCESSING

ARTIFACT_CONSENT_REQUIRED
PARENT_REPORT_VALIDATION_FAILED
PARENT_REPORT_NOT_GENERATED

EXISTING_STUDENT_UNAVAILABLE
EXISTING_PLAN_UNAVAILABLE
EXISTING_LIBRARY_UNAVAILABLE
EXISTING_STUDY_DATA_UNAVAILABLE
EXISTING_TASK_UNAVAILABLE
```

Feature-specific Code는 실제 구현 시 추가한다.

---

# 53. State Transition Error

잘못된 상태에서 Command를 호출하면:

```http
409 Conflict
```

예:

```json
{
  "code": "INVALID_STATE_TRANSITION",
  "message": "현재 Activity 상태에서는 Archive할 수 없습니다.",
  "details": {
    "currentState": "DRAFT",
    "requestedAction": "ARCHIVE"
  }
}
```

---

# 54. Privacy Contract

API Response는 Surface별 최소 데이터만 반환한다.

특히 Mentor API:

금지:

```text
Student realName
school
organization
detailedStudyData
```

Student 질문 Context는 익명화된 정보만 반환한다.

---

# 55. Parent Output Contract

Parent Report에 포함하지 않는 데이터:

```text
Raw AI Analysis
Internal Admin Note
Draft Feedback
Unconfirmed Record를 confirmed처럼 표현한 값
Student 미동의 Artifact
```

Backend가 이 규칙을 Validation으로 보호해야 한다.

Frontend에서 숨기기만 하는 방식으로 끝내지 않는다.

---

# 56. Counseling Boundary

이 문서는 Suyeon-owned API Contract 범위다.

다음 API를 여기서 정의하지 않는다.

```text
/api/**/counseling/**
Counseling CRUD
Counseling CRM
Parent Counseling
Student Counseling
Joint Counseling
Counseling Follow-up
Counseling Brief
Admissions Counseling
```

상담 API는 Wangyu-owned Spec / Domain / Contract에서 정의한다.

Suyeon Feature가 상담 정보가 필요해질 경우
공유 Contract를 별도 합의한다.

---

# 57. API 변경 절차

API 변경이 필요하면:

```text
1. Feature Spec 확인
2. domain.md 확인
3. api-contract.md 먼저 수정
4. Backend DTO / Controller 수정
5. Frontend API Client / Type 수정
6. Test 수정
7. Cross-Surface 영향 확인
```

Frontend/Backend 코드부터 변경하고
나중에 Contract를 맞추지 않는다.

---

# 58. Breaking Change 기준

Breaking Change 예:

```text
Endpoint Path 변경
HTTP Method 변경
Required Field 추가
Field 삭제
Field Type 변경
Enum 의미 변경
Response nesting 변경
Error Code 의미 변경
```

두 개발자 Feature에 영향을 주는 Breaking Change는
`OWNERSHIP.md` Shared Change 절차를 따른다.

---

# 59. API Review Checklist

새 Endpoint 추가 전:

```text
[ ] 기존 Endpoint로 해결할 수 없는가?
[ ] Feature Spec에 필요한 동작인가?
[ ] Domain Entity / State가 정의되어 있는가?
[ ] Actor가 명확한가?
[ ] Request가 최소 필드인가?
[ ] Response가 Surface에 불필요한 PII를 포함하지 않는가?
[ ] Error가 Empty와 구분되는가?
[ ] State Change가 문서화됐는가?
[ ] Existing LearnersHigh Integration을 중복 구현하지 않는가?
[ ] Counseling Ownership을 침범하지 않는가?
[ ] Test Case를 정의할 수 있는가?
```

---

# 60. 초기 Contract Test 우선순위

우선 구현할 Contract Test:

```text
1. Student Task Detail
2. Version Submit / AI Status
3. Admin Shared Feedback Queue
4. Admin Feedback Review → Student Feedback
5. Today Board
6. Student 360
7. Mentor Recommendation / Profile
8. Mentor Plan Apply
9. Student Question → Mentor Answer
10. Activity → Feedback → Archive
11. Parent Report Validation / Generate / Send
```

---

# 61. 현재 Open API Decisions

다음은 아직 최종 확정하지 않는다.

## API-OD-01 ParentReport Status

```text
Draft / Reviewing / Ready / Sent
vs generated
```

권장 후보:

```text
status = Draft | Reviewing | Ready | Sent
exportFileRef / generatedAt = 별도 생성 상태
```

하지만 팀 합의 전 최종 확정하지 않는다.

---

## API-OD-02 Q&A Reassign

`reassign`을:

```text
POST /questions/{id}/reassign
```

같은 Command로 볼지,
지속 Status로 볼지 미확정.

---

## API-OD-03 Topic Approval Enum

Known behavior:

```text
Approve
방향 요청
```

정확한 Enum Naming 미확정.

---

## API-OD-04 Connection Status

Known behavior:

```text
AI Candidate
Admin Confirm
Admin Reject
```

정확한 Enum Naming 미확정.

---

## API-OD-05 Archive Persistence

`GET /archive`는 필요하지만
별도 Archive Resource를 저장할지 Projection으로 계산할지 미확정.

---

## API-OD-06 Mentor Record / Case Review

Admin Review Endpoint 상세와 Review State 미확정.

---

## API-OD-07 Existing LearnersHigh API

Student / Plan / Library / Study / Existing Task 관련 실제 Endpoint 미확정.

Frontend는 이 미확정 Existing API를 직접 호출하지 않는다.

---

# 62. Endpoint Inventory

## Student

```text
GET    /api/student/tasks
POST   /api/student/tasks
GET    /api/student/tasks/{taskId}

PUT    /api/student/tasks/{taskId}/topic

GET    /api/student/tasks/{taskId}/evidence
POST   /api/student/tasks/{taskId}/evidence
DELETE /api/student/tasks/{taskId}/evidence/{evidenceId}

GET    /api/student/tasks/{taskId}/versions
POST   /api/student/tasks/{taskId}/versions
GET    /api/student/tasks/{taskId}/versions/{versionId}
POST   /api/student/tasks/{taskId}/versions/{versionId}/ai-analysis/retry

GET    /api/student/tasks/{taskId}/feedback
GET    /api/student/tasks/{taskId}/revision-history

GET    /api/student/tasks/{taskId}/final-artifact
PUT    /api/student/tasks/{taskId}/final-artifact/parent-share

GET    /api/student/activities
POST   /api/student/activities
GET    /api/student/activities/{activityId}
PATCH  /api/student/activities/{activityId}
POST   /api/student/activities/{activityId}/submit

POST   /api/student/activities/{activityId}/evidence
DELETE /api/student/activities/{activityId}/evidence/{evidenceId}
POST   /api/student/activities/{activityId}/feedback-request
GET    /api/student/activities/{activityId}/feedback
PUT    /api/student/activities/{activityId}/reflection
POST   /api/student/activities/{activityId}/archive

GET    /api/student/archive

GET    /api/student/interview/questions
PUT    /api/student/interview/questions/{questionId}/answer
PUT    /api/student/interview/questions/{questionId}/practice-status

GET    /api/student/mentor/recommendations
GET    /api/student/mentors
GET    /api/student/mentors/{mentorId}
GET    /api/student/mentor-content
GET    /api/student/mentor-content/{contentId}
PUT    /api/student/mentor-content/{contentId}/saved
POST   /api/student/mentor-content/{contentId}/plan-apply-preview
POST   /api/student/mentor-content/{contentId}/apply-plan
POST   /api/student/mentor-content/{contentId}/routine-apply-preview
POST   /api/student/mentor-content/{contentId}/apply-routine

GET    /api/student/mentor-questions
POST   /api/student/mentor-questions
GET    /api/student/mentor-questions/{questionId}
```

## Mentor

```text
GET    /api/mentor/content
POST   /api/mentor/content
GET    /api/mentor/content/{contentId}
PATCH  /api/mentor/content/{contentId}
POST   /api/mentor/content/{contentId}/publish

GET    /api/mentor/questions
GET    /api/mentor/questions/{questionId}
POST   /api/mentor/questions/{questionId}/answer

GET    /api/mentor/profile
PATCH  /api/mentor/profile
```

## Admin

```text
GET    /api/admin/feedback/dashboard
GET    /api/admin/feedback
GET    /api/admin/feedback/{feedbackId}
POST   /api/admin/feedback/{feedbackId}/review

POST   /api/admin/tasks/{taskId}/topic-review

POST   /api/admin/activities/{activityId}/feedback

GET    /api/admin/mentor-cases
POST   /api/admin/students/{studentId}/mentor-case-recommendations

GET    /api/admin/today-board

GET    /api/admin/students/{studentId}/360
GET    /api/admin/students/{studentId}/test-results
GET    /api/admin/students/{studentId}/school-records
PUT    /api/admin/students/{studentId}/school-records/{snapshotId}/status

GET    /api/admin/connections
POST   /api/admin/connections/{connectionId}/confirm
POST   /api/admin/connections/{connectionId}/reject

GET    /api/admin/interview/questions
POST   /api/admin/interview/questions
PATCH  /api/admin/interview/questions/{questionId}
DELETE /api/admin/interview/questions/{questionId}
POST   /api/admin/interview/questions/{questionId}/publish

GET    /api/admin/operations

GET    /api/admin/parent-reports
POST   /api/admin/parent-reports
GET    /api/admin/parent-reports/{reportId}
PATCH  /api/admin/parent-reports/{reportId}
POST   /api/admin/parent-reports/{reportId}/ai-draft
POST   /api/admin/parent-reports/{reportId}/validate
GET    /api/admin/parent-reports/{reportId}/preview
POST   /api/admin/parent-reports/{reportId}/generate
POST   /api/admin/parent-reports/{reportId}/send
```

---

# 63. 구현 시 주의

이 Endpoint Inventory는 **현재 기능 명세를 구현 가능한 API 경계로 정리한 초기 Contract**다.

다음과 같은 이유로 Endpoint를 임의 추가하지 않는다.

```text
"화면에서 쓰기 편해서"
"Mock 만들기 쉬워서"
"Controller 하나 더 만들면 빨라서"
```

새 Endpoint가 필요하면:

```text
Feature Requirement
→ Domain Responsibility
→ Existing Contract 재사용 가능 여부
→ api-contract.md 변경
```

순서로 판단한다.

---

# 64. 핵심 요약

```text
Frontend
→ /api/student
→ /api/admin
→ /api/mentor

Backend
→ Surface별 API
→ Application Use Case
→ Shared Domain Identity

Existing LearnersHigh
→ Frontend 직접 접근 X
→ Integration Layer

API Shape
→ api-contract.md가 최종 기준

Entity / State
→ domain.md가 최종 기준
```

가장 중요한 규칙:

```text
Contract before Code.
One Entity, many Views.
Do not expose internal Domain blindly.
Do not hide Integration failures as Empty.
Do not expose PII across Surface boundaries.
Do not invent Counseling APIs in Suyeon scope.
Do not finalize unresolved states by guessing.
