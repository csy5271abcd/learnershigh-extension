# LearnersHigh Extension — Suyeon Domain

> 위치: `docs/specs/suyeon/domain.md`  
> 목적: 최수연 담당 기능에서 사용하는 **Entity, 관계, 상태 전이, 핵심 불변조건, Cross-Surface 데이터 전파, Seed/Fixture 기준**을 정의한다.  
> 이 문서는 화면 디자인 문서가 아니다. 화면별 동작은 각 Feature Spec을, Frontend ↔ Backend 전송 형식은 `docs/api/api-contract.md`를 따른다.

---

# 1. 문서 역할

이 문서는 최수연 담당 영역의 Domain Model을 하나의 기준으로 묶는다.

대상 Feature:

```text
Mentor Hub
Mentor Surface
School & Admissions
Admin Student Management
Parent Progress
```

핵심 목적:

```text
1. 같은 Student / Task / Mentor를 화면마다 다른 Mock Entity로 만들지 않는다.
2. Student / Admin / Mentor Surface가 동일한 Domain State를 공유한다.
3. 화면 상태와 Business State를 분리한다.
4. Derived KPI를 별도 수동 Counter로 관리하지 않는다.
5. 기존 LearnersHigh 데이터와 Extension Domain의 책임을 구분한다.
6. 상담 기능을 Suyeon Domain에 포함하지 않는다.
```

---

# 2. 관련 Source of Truth

구현 전에 다음 문서를 함께 확인한다.

```text
docs/SOURCE_OF_TRUTH.md
docs/OWNERSHIP.md
docs/architecture/overview.md
docs/architecture/integration-boundary.md
docs/api/api-contract.md

docs/specs/suyeon/features/mentor-hub.md
docs/specs/suyeon/features/school-admissions.md
docs/specs/suyeon/features/student-management.md
docs/specs/suyeon/features/parent-progress.md
```

Domain 충돌 시:

```text
Entity / Relationship / State Transition
→ 이 문서(domain.md)

기능 동작 / 사용자 Interaction
→ Feature Spec

HTTP Request / Response
→ api-contract.md

기존 LearnersHigh 연결
→ integration-boundary.md
```

를 따른다.

---

# 3. Ownership Boundary

Suyeon Domain에 포함되는 주요 영역:

```text
Mentor
School
Student Management
Parent Progress
```

Suyeon Domain에 포함하지 않는 영역:

```text
Counseling
Parent Counseling
Student Counseling
Joint Counseling
Counseling CRM
Counseling Brief
Counseling Follow-up
Admissions Counseling
Counseling Privacy
Counseling-derived business logic
```

상담 관련 데이터가 향후 필요해져도
Suyeon Domain 안에 상담 Entity / API / DB Model을 새로 만들지 않는다.

필요 시:

```text
Wangyu-owned Counseling Domain
        │
        ▼
Shared / Integration Contract
        │
        ▼
Suyeon Consumer Feature
```

형태로 연결한다.

---

# 4. Domain Map

현재 Suyeon Feature Spec에서 정의된 Core Entity:

```text
Organization
Staff
Student
Task
Version
Feedback
Evidence
Activity
ActivityFeedback
TestResult
SchoolRecordSnapshot
TaskFinalArtifact
MentorProfile
MentorContent
ParentReport
InterviewQuestion
Connection
```

주요 관계:

```text
Student
├─ Task
│  ├─ Version
│  │  └─ Feedback
│  ├─ Evidence
│  └─ TaskFinalArtifact
│
├─ Activity
│  ├─ Evidence
│  └─ ActivityFeedback
│
├─ TestResult
├─ SchoolRecordSnapshot
└─ ParentReport

MentorProfile
└─ MentorContent
   ├─ Plan
   ├─ Routine
   ├─ Story
   ├─ Q&A-related content
   ├─ Record
   └─ Case

Activity
└─ Connection
   └─ InterviewQuestion
```

---

# 5. Existing LearnersHigh와 Extension Entity 구분

다음 데이터는 기존 LearnersHigh가 Source System일 가능성이 높다.

```text
Organization
Branch / Institution Context
Student 기본정보
Staff / Admin Context
Study Time / Study Session
Existing Plan
Library
Learning History
Existing Report
Existing Performance Task 기본정보
```

Extension이 주로 소유하는 데이터:

```text
Task Extension Process
Version
Feedback
Evidence
Growth Activity
ActivityFeedback
MentorProfile / MentorContent
TaskFinalArtifact share state
ParentReport
Connection
InterviewQuestion
Extension TestResult / SchoolRecordSnapshot
```

실제 Write Owner가 기존 시스템 확인 결과와 다르면
`integration-boundary.md`와 ADR을 먼저 갱신한다.

---

# 6. Canonical Identity 원칙

같은 실체는 하나의 Canonical Identity를 사용한다.

예:

```text
Student S001
```

은 다음 화면에서 같은 Student여야 한다.

```text
Student Task Detail
Admin Feedback Dashboard
Today Board
Student 360
Parent Progress
Mentor recommendation context
```

같은 Mentor 역시:

```text
Mentor Profile
Recommendation Card
Plan
Routine
Story
Case
Q&A
```

에서 이름 / 대학 / 학과 / 전형 / 고교 Context / 대표 경험이 동일해야 한다.

---

# 7. 화면별 복제 Entity 금지

금지:

```text
StudentTaskPageTask
AdminFeedbackTask
Student360Task
ParentReportTask
```

처럼 같은 Task를 화면별 별도 Entity로 만들기.

권장:

```text
Task
└─ 여러 View Model / Projection
```

예:

```text
Task
├─ StudentTaskDetailView
├─ AdminFeedbackQueueItemView
├─ Student360TaskSummaryView
└─ ParentReportTaskSummaryView
```

View Model은 달라도 Identity와 Business State는 동일해야 한다.

---

# 8. UI State와 Domain State 구분

UI State 예:

```text
selectedTab
isModalOpen
isDrawerOpen
selectedVersionPair
searchKeyword
scrollPosition
loading
```

Domain State 예:

```text
Task.currentStage
Activity.state
SchoolRecordSnapshot.status
ParentReport.status
TaskFinalArtifact.parentShareStatus
```

UI 편의를 위해 Domain State를 새로 만들지 않는다.

---

# 9. Student

`Student`는 Extension의 중심 Aggregate Reference다.

주요 연결:

```text
Student
├─ Task[]
├─ Activity[]
├─ TestResult[]
├─ SchoolRecordSnapshot[]
├─ ParentReport[]
├─ Mentor application / saved context
└─ Existing LearnersHigh study data
```

Student 기본정보의 Write Owner는 기존 LearnersHigh를 우선한다.

---

## 9-1. Student Context

Mentor 추천에 활용 가능한 Context:

```text
grade
interestField
desiredMajor
admissionInterest
currentTask
currentActivity
recentStudyContext
savedContentTags
viewedContentTags
```

이 값들 중 실제 저장 위치와 필드 타입이 아직 확정되지 않은 항목은
DB Field로 먼저 고정하지 않는다.

Feature 구현 전에:

```text
Domain source
API source
Existing LearnersHigh source
```

중 어디에서 가져오는지 확정한다.

---

# 10. Organization

`Organization`은 기관 Context를 나타낸다.

주요 사용:

```text
Admin 접근 범위
Student 소속 Context
Today Board 대상 범위
Parent Report 대상 범위
Operations 집계
```

Extension에서 기존 Organization 관리 기능을 재구현하지 않는다.

---

# 11. Staff

`Staff`는 Admin 업무 수행 Actor를 표현한다.

주요 사용:

```text
Feedback Review
Activity Feedback
Parent Report Review
Interview Question Publish
Record / Case Review
```

중요:

```text
Feedback은 Shared Queue를 사용한다.
특정 Staff 자동 Routing을 기본 정책으로 두지 않는다.
과목 기준 자동 Routing도 사용하지 않는다.
```

---

# 12. Task

`Task`는 School & Admissions의 수행평가 Process 중심 Entity다.

기존 LearnersHigh Performance Task가 존재하면
Extension Task는 기존 Task 기본정보를 확장하는 방향을 우선한다.

개념:

```text
Existing Performance Task
        │ existingTaskId
        ▼
Extension Task Process
```

---

## 12-1. Task 핵심 관계

```text
Task
├─ Version[]
├─ Feedback[]
├─ Evidence[]
├─ TaskFinalArtifact?
├─ relatedMentorCaseIds[]
└─ Archive representation
```

`Feedback`이 Version에 연결되는 구조와
Task 수준으로 조회되는 구조를 모두 지원할 수 있지만,
정확한 FK / Aggregate Boundary는 DB 설계와 API Contract에서 확정한다.

---

## 12-2. Task 8단계

Feature Spec에서 확정된 수행평가 Process:

| Stage | 의미 | 전이 기준 |
|---|---|---|
| 1 | 안내문 등록 | Student 또는 Admin 등록 |
| 2 | 주제 선정 | 제출 후 공용 검토 |
| 3 | 자료 조사 | Evidence 1개 이상 |
| 4 | 초안 V1 제출 | 제출 즉시 AI 분석 |
| 5 | AI 사전 점검 | 성공 또는 실패/Retry |
| 6 | 선생님 피드백 | Shared Feedback Queue |
| 7 | Revision V2/V3 | 필요 시 반복 |
| 8 | 최종 제출/발표 | Archive 자동 이관 |

권장 Domain 표현:

```text
Task.currentStage
```

Stage 값의 실제 Enum Naming은
`shared-conventions.md` 또는 API Contract와 함께 확정한다.

문서 단계 숫자 `1~8`을 DB Enum 값으로 그대로 쓸지는 아직 확정하지 않는다.

---

## 12-3. Task Stage와 운영 상태 분리

Admin에서 사용하는 운영 상태:

```text
D-3 Deadline Risk
Review 48h 초과
Feedback 후 수정 미반영
Deadline Passed
Hold
```

이 값들은 Task의 8단계 Stage와 동일한 개념이 아니다.

따라서:

```text
currentStage
```

와

```text
operational flags / derived status
```

를 분리한다.

예:

```text
Task.currentStage = FEEDBACK
Task deadlineRisk = true
```

처럼 동시에 존재할 수 있다.

정확한 저장/계산 방식은 별도 확정한다.

---

# 13. Topic

Topic은 Task에 연결되는 수행평가 주제 정보다.

확정된 Domain 정보:

```text
Task.topic
topicApprovalStatus
currentStage
```

Student Action:

```text
주제 제출
```

Admin Action:

```text
Approve
방향 요청
```

`topicApprovalStatus`의 정확한 Enum 값은 현재 원문에 명시되어 있지 않다.

따라서 다음과 같은 임의 Enum을 먼저 확정하지 않는다.

```text
APPROVED
REJECTED
NEEDS_REVISION
...
```

Feature/API 작성 단계에서 확정한다.

---

# 14. Version

`Version`은 Task 제출물의 Revision 단위를 나타낸다.

확정 Flow:

```text
Upload
→ Version 생성
→ AI Analysis Loading
→ Success | Failed
```

Version 예:

```text
V1
V2
V3
```

Revision History에서는:

```text
Before / After
Diff Highlight
Feedback Link
Version Preview
```

를 제공한다.

---

## 14-1. Version 불변조건

```text
- 하나의 Version은 하나의 Task에 속한다.
- Version 순서는 Task 내부에서 일관되어야 한다.
- 이전 Version은 새로운 Version 생성으로 덮어쓰지 않는다.
- Revision History에서 과거 Version을 다시 조회할 수 있어야 한다.
```

---

# 15. AI Analysis State

현재 확인된 상태:

```text
Loading
Success
Failed
```

Failed:

```text
Failed State
→ Retry
```

AI 성공 시:

```text
AI Feedback 생성
Task Stage 갱신
Shared Feedback Queue 진입
```

AI 상태를 Task Stage와 혼합하지 않는다.

예:

```text
Task.currentStage
Version.aiAnalysisStatus
```

는 서로 다른 책임이다.

---

# 16. Feedback

`Feedback`은 Task / Version 검토 결과를 표현한다.

Student-facing:

```text
AI 사전 점검
선생님 피드백
```

Admin-facing:

```text
AI Analysis
Staff Review
```

Student에서는:

```text
Teacher/Staff Feedback = Primary
AI Feedback = Secondary
```

원칙을 유지한다.

---

## 16-1. Shared Feedback Queue

Task Feedback과 Activity Feedback은
공용 Queue 원칙을 사용한다.

금지:

```text
특정 Staff 자동 Routing
과목 기준 자동 Routing
```

Queue는 별도의 수동 Counter Source가 아니다.

관련 KPI는 실제 Feedback / ActivityFeedback Entity 상태에서 계산한다.

---

## 16-2. Admin Feedback Review

Admin은 AI 항목별로:

```text
동의
제외
수정 후 전달
```

을 선택할 수 있다.

그리고:

```text
Student Comment
Next Action
Parent Report 공개 후보
전달
최종 승인
```

등의 Admin Action이 존재한다.

각 Action의 정확한 State Transition은
`student-management.md`와 `api-contract.md`에서 확정한다.

현재 Domain 문서에서는 없는 상태값을 임의로 추가하지 않는다.

---

# 17. Evidence

`Evidence`는 Task 또는 Activity 과정에서 사용되는 근거/파일을 나타낸다.

관계:

```text
Task
└─ Evidence[]

Activity
└─ Evidence[]
```

기능:

```text
파일 추가
파일 삭제
Stage Tag
Preview
```

---

## 17-1. Task Stage Condition

확정된 규칙:

```text
Evidence >= 1
```

이면 자료 조사 Stage 완료 조건을 만족할 수 있다.

즉 Evidence 존재는 Stage 3 전이 조건 중 하나다.

---

## 17-2. Evidence 파일명

실제 제출물과 자연스러운 파일명을 사용한다.

좋은 예:

```text
speech_outline.png
AI_교육기사_3건_요약.pdf
speech_v2_548words.docx
제동거리_탐구보고서_최종.pdf
하천_현장조사사진.zip
```

임시 문자열 중심 파일명은 Canonical Seed에서 사용하지 않는다.

---

# 18. TaskFinalArtifact

`TaskFinalArtifact`는 최종 수행평가 결과물 중
Parent Report 등 외부 공유 대상이 될 수 있는 Artifact다.

지원 가능한 형태:

```text
PDF
Image
Presentation
Document
Video
Safe Link
```

---

## 18-1. Parent Share State

확정된 상태 흐름:

```text
not_shared
→ consented
→ attached
→ shared
```

Default:

```text
not_shared
```

중요 규칙:

```text
Student가 직접 공유를 허용한다.
```

Student가 발송 전 동의를 해제하면:

```text
Report 첨부에서 제거
```

한다.

---

## 18-2. Artifact 불변조건

```text
- consent 없이 Parent Report에 첨부하지 않는다.
- shared는 실제 발송이 일어난 후에만 사용한다.
- Parent Report 내부에 연결되었다는 이유만으로 consented로 간주하지 않는다.
```

---

# 19. Activity

`Activity`는 수행평가 밖의 학생 성장 경험을 나타낸다.

Activity Type:

```text
교내대회
교외대회
봉사
동아리
학교 프로젝트/행사
자율 탐구
진로체험
기타
```

---

## 19-1. Activity 정보

현재 Feature Spec에서 정의된 정보:

```text
활동명
Type
주최/기관
기간
역할
참여 이유
주요 과정
본인 기여
결과
Evidence
Reflection
후속 활동
Tag
공개범위
```

정확한 Field Naming / Nullability는 DB/API 설계 단계에서 확정한다.

---

# 20. Activity State

기본 Flow:

```text
Draft
→ Submitted
→ Reflected
→ Archived
```

Feedback 요청 Flow:

```text
Draft
→ Submitted
→ Feedback Waiting
→ Feedback Delivered
→ Reflected
→ Archived
```

중요:

```text
모든 Activity에 Feedback을 강제하지 않는다.
```

따라서 `Feedback Waiting`은 선택적 경로다.

---

## 20-1. Activity Transition 원칙

허용 개념:

```text
Draft
  ↓
Submitted
  ├──────────────→ Reflected
  │
  └→ Feedback Waiting
          ↓
     Feedback Delivered
          ↓
       Reflected
          ↓
       Archived
```

Feature에서 명시하지 않은 역방향 Transition은 임의로 추가하지 않는다.

예:

```text
Archived → Draft
```

는 현재 확정되지 않았다.

---

# 21. Student Reflection

Reflection은 Student 저작 영역이다.

학생이 직접 작성:

```text
참여 이유
역할
실제로 한 일
어려웠던 점
배운 점
다음에 바꾸고 싶은 점
실제 후속 활동
```

AI는 대신 작성하지 않는다.

허용되는 AI 지원:

```text
빈 항목 표시
구체화 질문
날짜 / 역할 / Evidence 누락 확인
중복 / 긴 문장 안내
```

---

## 21-1. Authorship 불변조건

금지:

```text
AI가 Student Reflection 완성
Admin이 Student Reflection 대신 작성
AI가 Student 원문을 최종본으로 자동 교체
```

허용:

```text
질문
방향
누락 확인
Feedback
Next Action
```

---

# 22. ActivityFeedback

`ActivityFeedback`은 Activity에 대한 Admin Feedback이다.

구조:

```text
1. 잘 드러난 점
2. 조금 더 구체화할 점
3. 생각해볼 질문
4. 다음 활동 제안
5. Parent Report 공개 후보(optional)
```

공용 Queue를 사용한다.

특정 Subject Teacher 자동 배정은 하지 않는다.

---

# 23. Archive

Archive는 최종 Repository 역할을 한다.

Source:

```text
source = task
source = growth
```

Archive Card 정보:

```text
출처 Badge
활동명
시기
과목 / Activity Type
결과
Reflection Summary
Evidence Count
```

활용:

```text
Student 360
Parent Report 후보
Connection
Interview
```

---

## 23-1. Archive Entity 여부

현재 Feature Spec에서는 Archive를 기능/Repository로 명시하지만
별도 `Archive` Core Entity를 Core Entity 목록에 두지는 않았다.

따라서 구현 전 다음 중 어느 방식인지 확정해야 한다.

```text
A. Task / Activity의 Archived State를 Query하여 Archive View 생성
B. 별도의 Archive projection / table 사용
```

`Archive` Entity를 임의로 추가하지 않는다.

---

# 24. Connection

`Connection`은 Activity 간 Cross-subject 연관을 표현한다.

Flow:

```text
Archive Activity
→ AI Connection Candidate
→ Admin Confirm
→ Interview Question Draft
```

AI는 후보를 제안한다.

Admin:

```text
Confirm
Reject
```

한다.

Confirmed Connection은:

```text
Student 360
Interview
```

에서 활용된다.

---

## 24-1. Connection State

현재 원문에서는:

```text
candidate
confirmed / rejected 의미
```

가 동작으로 존재하지만 정확한 Enum Naming은 명시되지 않았다.

따라서 `CANDIDATE / CONFIRMED / REJECTED` 같은 Enum은
합리적인 후보일 뿐 현재 확정값으로 간주하지 않는다.

API/Feature 문서에서 확정 후 반영한다.

---

# 25. InterviewQuestion

`InterviewQuestion`은 고3 대상 Interview Bridge에 사용한다.

Flow:

```text
AI Draft
→ Admin Add/Edit/Delete
→ Activity 연결
→ Publish
→ Student Interview Bridge
```

Student에게는:

```text
Published Question만 보인다.
```

Student Action:

```text
Question 열기
답변 작성
연습 상태 변경
```

---

# 26. TestResult

`TestResult`는 학생의 시험/평가 결과를 표현한다.

확정 Type:

```text
school_exam
mock_exam
academy_test
```

표시 가능한 값:

```text
score
grade
percentile
rank
previousResult
change
```

---

## 26-1. TestResult 불변조건

```text
서로 다른 시험 유형을 무리하게 하나의 평균으로 합치지 않는다.
실제로 입력되지 않은 값을 생성하지 않는다.
```

즉:

```text
school_exam score
mock_exam grade
academy_test rank
```

처럼 시험 특성에 따라 존재하는 값이 다를 수 있다.

---

# 27. SchoolRecordSnapshot

학생의 학교 기록 상태를 Snapshot 형태로 표현한다.

확정 Status:

```text
confirmed
candidate
```

핵심 규칙:

```text
candidate를 confirmed처럼 표현하지 않는다.
```

같은 Entity를 참조:

```text
School
Student 360
Parent Report
```

---

## 27-1. SchoolRecord 불변조건

```text
- confirmed / candidate 의미를 화면마다 다르게 해석하지 않는다.
- Parent Report에서 candidate를 실제 반영 기록처럼 표현하지 않는다.
- candidate를 confirmed로 변환하는 기준은 별도 Feature/API 규칙 없이 추측하지 않는다.
```

---

# 28. MentorProfile

`MentorProfile`은 Mentor Identity와 공개 Profile Context를 표현한다.

일관되게 유지해야 하는 값:

```text
이름
대학
학과
전형
고교 Context
대표 경험
```

관련 화면:

```text
Mentor Recommendation
Mentor Profile
Mentor Content
Activity Case
```

---

# 29. MentorContent

MentorContent의 주요 유형:

```text
Plan
Routine
Story
Record
Case
```

Student Q&A 답변에서 관련 Mentor Content를 연결할 수 있다.

Mentor My Content 표시 상태:

```text
Draft
Published
```

---

## 29-1. MentorContent Publish Rule

일반 Content와 Record / Case는 공개 절차가 다를 수 있다.

Record / Case:

```text
PII Detection
→ Admin Review
→ Published
```

중요:

```text
Record / Case를 작성 즉시 Published로 만들지 않는다.
```

정확한 Review State Enum은 아직 확정하지 않는다.

---

# 30. Mentor Plan

Mentor Plan은 Student 기존 Plan에 적용될 수 있다.

Flow:

```text
적용 시작일
→ 가져올 항목 선택
→ 내 Library / 교재 Mapping
→ 기존 일정 충돌 확인
→ 수정
→ 내 주간계획에 추가
```

적용 Item:

```text
source = mentorPlanId
```

개념을 가진다.

---

## 30-1. Snapshot Rule

Mentor Plan 적용 시점의 Snapshot을 유지한다.

즉:

```text
Mentor 원본 Plan 수정
≠
이미 Student Plan에 적용된 Item 자동 변경
```

기존 적용 결과는 자동 동기화하지 않는다.

---

# 31. Mentor Routine

Student는:

```text
전체 적용
특정 Habit만 적용
```

할 수 있다.

적용 전:

```text
기존 일정과 충돌 검사
```

를 수행하고 Conflict State를 제공한다.

Conflict의 정확한 Domain Enum / 해결 방식은
Feature/API 작성 시 확정한다.

---

# 32. Mentor Story

Story 주제 예:

```text
성공
실패
회복
성적 변화
수시/정시 전환
진로 고민
공부법
멘탈 관리
```

Story는 Content Type이며
별도 Student 관리 Entity로 만들지 않는다.

---

# 33. Mentor Record

Record는 실제 학교생활기록 관련 참고 콘텐츠다.

공개 가능한 유형:

```text
세부능력 및 특기사항
자율활동
동아리활동
진로활동
공식 프로젝트/탐구 연계 기록
```

제거 대상:

```text
학교명
담당 교사
학번
반 / 번호
주민번호
수험번호
제3자 실명
```

금지:

```text
원본 PDF 공개
그대로 복사하는 CTA
"내 기록으로 만들기"
```

---

# 34. Activity Case

Mentor의 실제 활동 사례다.

Detail 구성:

```text
1. 활동 기본정보
2. 안내 / 목표
3. 주제
4. 조사 / 준비
5. Evidence
6. 결과물
7. 중간 과정
8. 최종 결과
9. Reflection
10. 후속 활동
11. 관련 Mentor Content
12. 내 Task / Activity 참고 연결
```

모든 Case에 동일한 Revision 패턴을 강제하지 않는다.

---

# 35. Mentor Q&A

Student Question Flow:

```text
질문 작성
→ Category 선택
→ Submit
→ pending
→ Mentor Answer
→ answered
```

72시간 이상 미답변:

```text
pending
→ overdue
→ reassign
```

Reassign 시 Mentor가 변경된다.

---

## 35-1. Q&A State 해석 주의

확실히 상태로 확인되는 값:

```text
pending
answered
overdue
```

`reassign`은 원문에서 전이 흐름에 등장하지만
**지속 상태인지 Action인지 명확히 구분되어 있지 않다.**

따라서 Domain 구현 시:

```text
REASSIGNED 상태
```

를 임의로 만들지 않는다.

Feature/API 설계에서 다음 중 하나를 확정한다.

```text
A. reassign = command/action
B. reassign = durable status
```

현재 권장 해석은 Action 후보지만 확정값은 아니다.

---

# 36. Mentor Q&A Privacy

Mentor에게 질문자는 익명 Context로 표시한다.

예:

```text
고2 · 화학공학 관심
```

Mentor에게 공개하지 않는 정보:

```text
Student 실명
학교
기관
상세 학습관리 데이터
```

---

# 37. Mentor Case Recommendation

Admin이 Student Task / Activity에 적합한 Mentor Case를 추천한다.

추천 시:

```text
Task.relatedMentorCaseIds
+
Student Mentor Hub Recommendation
```

이 함께 갱신된다.

즉 Admin Surface 변경이 Student Surface에 전파되는 Cross-Surface Flow다.

---

# 38. ParentReport

`ParentReport`는 실시간 Raw Data 화면이 아니라
검토된 월간 Snapshot이다.

사용 데이터:

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

---

# 39. Parent Report 정보 우선순위

```text
1. 이번 달 전체 상태
2. 공부시간 / Plan
3. 학교시험 / 모의고사 / 학원 Test
4. 수행평가 결과
5. 잘한 점 / 관리할 점
6. School Record / 활동
7. Mentor 활용
8. 다음 달 Plan
9. Admin 종합 Comment
```

서비스 내부 사용량은 메인 KPI로 사용하지 않는다.

---

# 40. ParentReport Status — 현재 충돌 존재

Feature Spec 안에 ParentReport 상태 표현이 두 가지로 존재한다.

Report List:

```text
Draft
Reviewing
Ready
Sent
```

Generate 단계:

```text
ParentReport.status = generated
```

이 두 정의는 현재 그대로는 하나의 Enum으로 확정하기 어렵다.

따라서 이 문서에서는 **임의로 통합하지 않는다.**

구현 전에 다음을 확정해야 한다.

```text
Option A
Draft → Reviewing → Ready → Generated → Sent

Option B
generated는 status가 아니라 export/generatedAt 같은 별도 상태

Option C
다른 명시적 모델
```

확정 전:

```text
GENERATED
```

를 최종 Domain Enum에 추가하지 않는다.

이 항목은 Feature Spec / API Contract 작성 시 해결해야 하는 Open Decision이다.

---

# 41. ParentReport Generation Flow

확정 Flow:

```text
Monthly Aggregation
→ AI Draft
→ Admin Review
→ Artifact Consent Check
→ Validation
→ Preview
→ PDF / Image Generate
→ Kakao Delivery
→ Operations Update
```

Send 후 확인된 변화:

```text
status = sent
sentAt 기록
Artifact.parentShareStatus = shared
Operations 미발송 Count 감소
```

Read Status는 신뢰 가능한 외부 정보가 있을 때만 반영한다.

---

# 42. ParentReport AI Boundary

AI 후보:

```text
Monthly Summary
Strength
Attention
Meaningful Change
Next Plan Candidate
```

AI는 Draft까지만 만든다.

```text
AI Draft
→ Admin Review
→ 공개
```

AI Raw와 내부 Feedback 원문은 Parent에게 공개하지 않는다.

---

# 43. ParentReport Validation

발송 전 검사:

### 감소 지표

학습 / 성적 지표가 하락했는데 대응 Plan이 없으면:

```text
Send Disabled
```

### School Record

```text
candidate를 confirmed처럼 표현
→ 발송 불가
```

### Artifact

```text
Student 공유 동의 없음
→ 첨부 불가
```

---

# 44. Parent 전용 Surface

현재 Domain 범위에는 별도 Parent App / Web이 없다.

Parent는 현재:

```text
Admin이 생성한 PDF / Image Report를 전달받는 수신자
```

로 취급한다.

Parent Account / Parent Login / Parent Navigation Entity를 임의로 추가하지 않는다.

---

# 45. Cross-Surface Flow — Task

확정 Flow:

```text
Student Upload
→ Version
→ AI Analysis
→ Shared Feedback Queue
→ Admin Review
→ Student Feedback
→ Revision
→ Re-review
→ Final
→ Archive
```

관련 Surface:

```text
Student
Admin
```

주요 Domain:

```text
Task
Version
Feedback
Evidence
TaskFinalArtifact
```

---

# 46. Cross-Surface Flow — Mentor Case

```text
Admin Recommend
→ Task Related Case
→ Student Mentor Hub Recommendation
```

관련 Domain:

```text
Task
MentorContent(Case)
Student recommendation projection
```

---

# 47. Cross-Surface Flow — Mentor Plan

```text
Student Apply Mentor Plan
→ Existing Student WeeklyPlan
→ source = mentorPlanId
→ Snapshot 유지
→ Student360 Mentor에 반영
```

이 Flow는 기존 LearnersHigh Plan과의 Integration을 포함한다.

---

# 48. Cross-Surface Flow — Q&A

```text
Student Question
→ Mentor Inbox
→ Mentor Answer
→ Student Q&A
```

관련 Surface:

```text
Student
Mentor
```

---

# 49. Cross-Surface Flow — Activity

기본:

```text
Create
→ Submitted
→ Reflection
→ Archive
```

Feedback 요청:

```text
Submitted
→ Activity Feedback Queue
→ Admin Feedback
→ Student 보완
→ Archive
```

---

# 50. Cross-Surface Flow — Connection / Interview

```text
Archive Activity
→ AI Connection Candidate
→ Admin Confirm
→ Interview Question Draft
→ Publish
→ Student Interview Bridge
```

관련 Surface:

```text
Admin
Student
```

---

# 51. Cross-Surface Flow — Parent Report

```text
Study
+ Plan
+ TestResult
+ Task Result
+ SchoolRecord
+ Activity
+ Mentor
+ Artifact Consent
→ ParentReport Draft
→ Validation
→ PDF / Image
→ Kakao Delivery
```

ParentReport는 여러 Domain의 데이터를 소비하지만
원본 Domain Entity를 수정하는 주체가 되지 않는다.

---

# 52. Derived State 원칙

다음 값은 별도 수동 Counter로 저장하지 않는 것을 기본으로 한다.

예:

```text
Feedback Pending
마감 임박
수정 미반영
이번 주 완료
오늘 관리 필요
Parent Report 미발송
48h 초과 Queue
```

가능하면 실제 Entity에서 계산한다.

예:

```text
Feedback Pending Count
= Feedback / ActivityFeedback 현재 상태 기반

Parent Report 미발송
= 해당 기간 ParentReport 중 Sent가 아닌 대상 기반
```

정확한 계산식은 관련 Feature에서 정의한다.

---

# 53. Today Board Domain View

Today Board는 별도의 새로운 Student Source가 아니다.

다음 데이터를 조합한 Read Model 성격이다.

```text
Student
Existing Study
Existing Plan
Task
TestResult
Derived Management Point
```

Row 정보:

```text
Student
Grade
오늘 순공
최근 7일 Plan
Task 상태
최근 시험 / 학습 변화
관리 포인트
Quick Action
```

Plan 집계 기간:

```text
최근 7일
```

---

# 54. Student 360 Domain View

Student 360은 하나의 별도 Aggregate가 아니라
Student 중심 통합 Read Model로 본다.

Tab:

```text
Overview
Study
School
Activities
Mentor
Reports
```

소스:

```text
Existing LearnersHigh Study / Plan
Task
Evidence
SchoolRecordSnapshot
Activity
Mentor Content / Application
ParentReport
```

---

# 55. Operations Domain View

Operations Dashboard KPI는 Shared Entity에서 계산한다.

예:

```text
등록 학생
오늘 학습 기록 발생
진행 중 Task
Task Feedback Pending
Activity Feedback Pending
Deadline Risk
Parent Report 미발송
Queue 평균 첫 검토시간
48h 초과 Queue
```

별도 Mock Counter를 Canonical Source로 두지 않는다.

---

# 56. Seed / Fixture — Student

Student Surface에는 로그인한 한 학생 데이터만 보인다.

한 Route에서 다른 학생의:

```text
Task
Activity
Evidence
Archive
```

를 섞지 않는다.

여러 학생 비교는 Admin에서만 한다.

---

# 57. Seed / Fixture — Mentor

같은 Mentor는 모든 화면에서 동일 정보를 사용한다.

```text
이름
대학
학과
전형
고교 Context
대표 경험
```

Mentor Profile / Recommendation / Case가 동일 Mentor Entity를 참조한다.

---

# 58. Seed / Fixture — 시간

화면 Snapshot 시점이 다르면:

```text
snapshotDate
```

를 구분한다.

예:

```text
10/03 V2 검토 대기
10/31 최종 결과 완료
```

서로 다른 시점의 상태를 같은 순간의 데이터처럼 혼합하지 않는다.

---

# 59. 집계 기간

확정된 기간 차이:

```text
Today Board Plan
= 최근 7일

Parent Report Plan
= 해당 월 전체
```

기간이 다른 수치를 같은 값처럼 사용하지 않는다.

---

# 60. Canonical Seed 원칙

좋은 Seed:

```text
Student S001
├─ Task T001
│  ├─ Version V1
│  ├─ Version V2
│  ├─ Feedback
│  └─ Evidence
│
├─ Activity A001
│  ├─ Evidence
│  └─ Reflection
│
├─ TestResult
├─ SchoolRecordSnapshot
└─ ParentReport
```

같은 Student / Task / Mentor ID를 여러 Surface에서 재사용한다.

---

# 61. Privacy — Student → Mentor

Mentor에게 전달 금지:

```text
실명
학교
기관
상세 학습관리 데이터
불필요한 PII
```

익명 Context만 전달한다.

---

# 62. Privacy — Record / Case

Flow:

```text
PII Detection
→ Admin Review
→ Published
```

검수되지 않은 Record / Case는 공개하지 않는다.

---

# 63. Privacy — Parent

Parent Report에는:

```text
검토된 정보
승인된 Snapshot
Student 동의 Artifact
```

만 포함한다.

금지:

```text
Raw AI Analysis
Internal Feedback 원문
미확정 School Record를 확정 정보처럼 표시
Student 미동의 Artifact
```

---

# 64. AI Domain Guardrail

AI의 역할:

```text
Analysis
Suggestion
Draft
Candidate
```

AI는 Source of Truth가 아니다.

최종 판단 / 공개는 필요한 Human Actor가 수행한다.

예:

```text
AI Analysis
→ Admin Review
```

```text
AI Report Draft
→ Admin Review
```

---

# 65. Domain Command 개념

실제 Class / Method 명칭은 아직 확정하지 않지만
Use Case는 다음과 같은 Command 성격으로 볼 수 있다.

```text
SubmitTaskTopic
AddTaskEvidence
SubmitTaskVersion
RetryAiAnalysis
ReviewFeedback
SubmitActivity
RequestActivityFeedback
SubmitReflection
ArchiveActivity
RecommendMentorCase
ApplyMentorPlan
SubmitMentorQuestion
AnswerMentorQuestion
ConfirmConnection
PublishInterviewQuestion
GenerateParentReport
SendParentReport
ChangeArtifactConsent
```

이 목록은 API Endpoint 목록이 아니다.

실제 Naming은 Service / API Contract 작성 시 확정한다.

---

# 66. Domain Event 개념

Cross-Surface 동기화를 위해 다음과 같은 사건이 존재할 수 있다.

예:

```text
TaskVersionSubmitted
AiAnalysisSucceeded
AiAnalysisFailed
FeedbackDelivered
TaskFinalized
ActivitySubmitted
ActivityFeedbackDelivered
ActivityArchived
MentorCaseRecommended
MentorPlanApplied
MentorQuestionAnswered
ConnectionConfirmed
InterviewQuestionPublished
ParentReportGenerated
ParentReportSent
ArtifactConsentChanged
```

현재 문서는 Event Bus 도입을 요구하지 않는다.

이 목록은:

```text
"어떤 변화가 다른 Surface에 영향을 주는가"
```

를 표현하기 위한 Domain Event 개념이다.

실제 구현은 동기 Service 호출 / Transaction / Event 방식 중
Architecture에 맞게 결정한다.

---

# 67. Transaction Boundary 원칙

한 Use Case에서 반드시 함께 성공해야 하는 변경은
Service에서 Transaction Boundary를 검토한다.

예:

```text
Feedback 전달
→ Feedback 상태 변경
→ Student-visible 상태 갱신
```

또는:

```text
Parent Report Send
→ Report sent
→ sentAt
→ Artifact shared
→ Operations derived state 변화
```

Derived KPI는 별도 수동 업데이트보다 재계산을 우선 검토한다.

---

# 68. DB 설계와 Domain 문서의 관계

이 문서는 DB Schema 문서가 아니다.

따라서:

```text
Entity
≠ 반드시 Table 1개

Value / State
≠ 반드시 Column 1개
```

DB 설계 시 Domain 의미를 보존하되
정규화 / Snapshot / Projection 구현 방식은 별도로 결정한다.

---

# 69. API Contract와 Domain 문서의 관계

Domain Entity를 그대로 API Response로 노출하지 않는다.

예:

```text
Task Domain
→ StudentTaskDetailResponse

Task Domain
→ AdminFeedbackQueueItemResponse
```

Surface에 필요한 DTO는 달라도
같은 Domain State를 사용해야 한다.

---

# 70. Integration Boundary

기존 LearnersHigh와 연결되는 주요 데이터:

```text
Student
Organization / Branch
Plan
Library
Study Time
Learning History
Existing Report
Existing Performance Task
```

이 데이터는:

```text
docs/architecture/integration-boundary.md
```

를 따른다.

Extension Domain에서 기존 DB 구조를 직접 추측하지 않는다.

---

# 71. 기존 Performance Task 연결

현재 Architecture에서는:

```text
기존 Performance Task 기본정보
+
Extension Task Process
```

형태를 우선한다.

따라서 Task에:

```text
existingTaskId
```

같은 Mapping이 필요할 가능성이 있지만
정확한 필드와 PK 타입은 기존 시스템 확인 전 확정하지 않는다.

---

# 72. Existing Plan 연결

Mentor Plan Apply는
Extension 내부의 별도 WeeklyPlan을 만드는 기능이 아니다.

```text
Mentor Plan
→ Integration Boundary
→ Existing LearnersHigh Plan
```

을 따른다.

---

# 73. 기존 Study Data 연결

Today Board / Student 360 / Parent Progress가 사용하는:

```text
Study Time
Plan Execution
```

은 기존 LearnersHigh 데이터 연결을 우선한다.

새로운 Timer / Study Session Domain을 Suyeon 영역에서 만들지 않는다.

---

# 74. Open Decisions

다음 항목은 현재 Feature Spec만으로 최종 확정할 수 없다.

구현 전에 해결하거나 API/Feature 문서에서 명확히 해야 한다.

### OD-01 ParentReport Status

```text
Draft / Reviewing / Ready / Sent
```

과

```text
status = generated
```

관계.

### OD-02 Q&A reassign

```text
reassign
```

이 Durable State인지 Command인지.

### OD-03 Topic Approval Status

정확한 Enum 값.

### OD-04 Connection Status

Candidate / Confirm / Reject의 정확한 상태 모델.

### OD-05 Mentor Record / Case Review State

PII Detection → Admin Review → Published를
한 Status로 관리할지 복수 상태로 관리할지.

### OD-06 Archive Persistence

별도 Archive Entity/Table인지
Archived Task/Activity Projection인지.

### OD-07 Existing Task Mapping

기존 Performance Task와 Extension Task의 정확한 PK / Write Owner.

### OD-08 Mentor Plan Source Metadata

기존 Plan에 `source=mentorPlanId`를 어떤 방식으로 보존할지.

### OD-09 File Storage

Evidence / TaskFinalArtifact의 실제 Storage Provider와 `fileRef` Contract.

### OD-10 Authentication

Mentor 인증 방식 및 기존 Student/Admin 인증 재사용 방식.

Open Decision은 추측으로 닫지 않는다.

---

# 75. Domain Invariants 요약

반드시 유지해야 하는 규칙:

```text
1. 같은 Student / Task / Mentor는 Surface마다 같은 Identity를 사용한다.

2. Task Stage와 운영 Risk Status를 혼합하지 않는다.

3. Version은 과거 제출물을 덮어쓰지 않는다.

4. Evidence 1개 이상은 Task 자료 조사 Stage 완료 조건으로 사용할 수 있다.

5. Feedback은 Shared Queue이며 특정 Staff/과목 자동 Routing을 하지 않는다.

6. Student Reflection은 Student가 작성한다.

7. 모든 Activity에 Feedback을 강제하지 않는다.

8. candidate SchoolRecord를 confirmed처럼 표현하지 않는다.

9. Mentor에게 Student PII / 상세 관리정보를 노출하지 않는다.

10. Record / Case는 개인정보 검수 후 공개한다.

11. Mentor Plan 적용 후 원본 수정이 기존 Student Snapshot을 자동 변경하지 않는다.

12. Parent Artifact는 Student 동의 없이 공유하지 않는다.

13. Parent Report는 Raw AI / 내부 Feedback을 그대로 공개하지 않는다.

14. Dashboard KPI를 별도 Mock Counter로 Source of Truth화하지 않는다.

15. 서로 다른 집계 기간의 수치를 같은 값처럼 사용하지 않는다.

16. 상담 기능을 Suyeon Domain에 구현하지 않는다.

17. 기존 LearnersHigh Timer / Plan / Library를 중복 구현하지 않는다.
```

---

# 76. Cross-Surface Propagation Matrix

| 변경 | Student | Admin | Mentor | Parent Output |
|---|---|---|---|---|
| Task Version 제출 | Version/AI 상태 변경 | Feedback Queue 진입 가능 | - | 아직 미반영 |
| Feedback 전달 | Student Feedback 갱신 | Queue/KPI 갱신 | - | 공개 후보에 따라 영향 가능 |
| Activity 제출 | Activity 상태 갱신 | Feedback 요청 시 Queue 영향 | - | 월간 후보 데이터 |
| Activity Archive | Archive 갱신 | Student360/Connection 후보 | - | Report 후보 |
| Mentor Case 추천 | Mentor Hub 추천 갱신 | Recommendation 상태 | - | 기본적으로 직접 영향 없음 |
| Mentor Plan 적용 | Student Plan 연결 | Student360 Mentor에 반영 | Content Apply 수에 영향 가능 | Mentor 활용 Summary 후보 |
| Q&A 답변 | Student Q&A 갱신 | - | Inbox 상태 갱신 | - |
| Connection Confirm | Interview 후보 기반 | Connection 상태 갱신 | - | 필요 시 Activity Summary |
| Interview Publish | 고3 Student에게 노출 | 관리 상태 갱신 | - | - |
| Artifact Consent 변경 | 공유 상태 표시 | Parent Report 첨부 가능 여부 | - | 첨부 여부 변경 |
| Parent Report Send | - | Report/Operations 상태 갱신 | - | PDF/Image 전달 |

표에 없는 부수 효과를 임의로 추가하지 않는다.

---

# 77. Feature별 Domain 책임

## Mentor Hub

주요 Domain:

```text
MentorProfile
MentorContent
Student Context
Q&A
Mentor Plan Application
Mentor Case Recommendation
```

## School & Admissions

주요 Domain:

```text
Task
Version
Feedback
Evidence
Activity
ActivityFeedback
TaskFinalArtifact
Connection
InterviewQuestion
```

## Admin Student Management

주요 Domain / Read Model:

```text
Feedback Queue
Today Board
Student 360
TestResult
SchoolRecordSnapshot
Operations
```

## Parent Progress

주요 Domain:

```text
ParentReport
TaskFinalArtifact Share State
Monthly Snapshot
Validation
Delivery State
```

---

# 78. 개발 순서

Domain 관점의 권장 구현 순서:

```text
Shared Entity / Identity
→ Canonical Fixture / Seed
→ State Transition
→ API Contract
→ Backend Domain / Application
→ Frontend API / State
→ Screen
→ Cross-Surface Propagation
→ Loading / Empty / Error
→ Test
→ Visual Polish
```

화면부터 각각 독립 Mock으로 만드는 방식은 피한다.

---

# 79. Feature 구현 전 Domain Checklist

```text
[ ] 사용 Entity가 이 문서에 존재하는가?
[ ] 새 Entity가 정말 필요한가?
[ ] 기존 LearnersHigh Entity를 중복 생성하고 있지 않은가?
[ ] Entity Identity가 다른 Surface와 동일한가?
[ ] State Transition이 정의되어 있는가?
[ ] UI State와 Domain State를 구분했는가?
[ ] Cross-Surface 영향이 있는가?
[ ] Derived KPI를 수동 저장하고 있지 않은가?
[ ] API Contract 변경이 필요한가?
[ ] DB Migration이 필요한가?
[ ] 개인정보 공개 범위를 확인했는가?
[ ] Counseling Domain을 침범하지 않는가?
[ ] Open Decision을 임의로 확정하지 않았는가?
```

---

# 80. Domain 변경 절차

Core Entity / State를 변경하려면:

```text
1. SOURCE_OF_TRUTH 확인
2. OWNERSHIP 확인
3. 관련 Feature Spec 확인
4. domain.md 변경안 작성
5. api-contract 영향 확인
6. DB 영향 확인
7. 다른 Surface 영향 확인
8. 필요 시 ADR 작성
9. 코드 수정
10. Test
```

코드부터 수정하고 나중에 Domain 문서를 맞추는 방식은 피한다.

---

# 81. Domain Conflict Template

```text
[DOMAIN CONFLICT]

현재 작업:
<Feature>

Entity:
<Entity Name>

Domain 문서:
<현재 정의>

Feature Spec:
<관련 정의>

충돌:
<무엇이 다른지>

Cross-Surface 영향:
Student:
Admin:
Mentor:
Parent:

API 영향:
YES | NO

DB 영향:
YES | NO

제안:
<최소 변경안>

상태:
WAITING FOR CONFIRMATION
```

---

# 82. 완료 기준

Domain 구현이 완료되었다고 보기 위해서는:

```text
Entity
+ Identity
+ Relationship
+ State Transition
+ Invariant
+ API Contract
+ Persistence
+ Cross-Surface Propagation
+ Privacy
+ Test
```

가 일관되어야 한다.

UI가 보이는 것만으로 Domain 구현 완료로 판단하지 않는다.

---

# 83. 핵심 요약

```text
Student가 중심 Identity다.

Task
→ Version
→ AI Analysis
→ Feedback
→ Revision
→ Final
→ Archive

Activity
→ Submitted
→ Optional Feedback
→ Reflection
→ Archive

MentorContent
→ Browse / Save / Apply / Q&A

Mentor Q&A
→ pending
→ answered
또는
→ overdue
→ reassign flow

Archive Activity
→ Connection Candidate
→ Admin Confirm
→ Interview Question
→ Publish

Shared Student Data
→ ParentReport Snapshot
→ Validation
→ PDF / Image
→ Delivery
```

가장 중요한 Domain 원칙:

```text
같은 실체는 같은 Entity를 사용한다.
화면마다 Business State를 복제하지 않는다.
Derived 값은 Source Entity에서 계산한다.
AI는 Draft / Candidate 역할을 넘지 않는다.
Student 저작권과 개인정보 경계를 지킨다.
상담 기능은 Wangyu Domain에 둔다.
기존 LearnersHigh 기능은 재구현하지 않는다.
불명확한 상태값은 추측하지 않는다.
```
