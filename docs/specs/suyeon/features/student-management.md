# student-management

> 위치: `docs/specs/suyeon/features/student-management.md`  
> 이 문서는 기존 `learnershigh-suyeon-feature-spec.md`에서 해당 기능 영역을 분리한 구현용 Feature Spec이다.  
> 공통 Entity / State / Cross-Surface 규칙은 `docs/specs/suyeon/domain.md`를 우선 확인한다.

## 1. Scope

Admin이 학생 상태와 검토 업무를 관리하는 확장 기능을 다룬다.

포함 범위:

```text
Feedback Dashboard
Feedback Review
Mentor Case Recommendation
Today Board
Student 360
TestResult
SchoolRecordSnapshot
Operations Dashboard
Admin Settings Integration
```

## 2. 반드시 함께 확인할 문서

- `docs/SOURCE_OF_TRUTH.md`
- `docs/OWNERSHIP.md`
- `docs/specs/suyeon/domain.md`
- `docs/architecture/integration-boundary.md`
- `docs/design/tds-web-guidelines.md`
- `docs/api/api-contract.md`
- `references/claude-design-mockup/AdminStudentManagement/`

## 3. 공통 경계

- 기존 LearnersHigh 기능을 편의를 위해 중복 구현하지 않는다.
- 기존 기능 연결은 `docs/architecture/integration-boundary.md`를 따른다.
- 신규 Visual은 `docs/design/tds-web-guidelines.md`와 해당 Claude Design Mockup을 따른다.
- Frontend ↔ Backend 형식은 `docs/api/api-contract.md`를 따른다.
- 상담 관련 Entity / API / DB / 화면 / 비즈니스 로직은 이 Spec 범위에 포함하지 않는다.
- 문서 또는 Mockup이 충돌하면 임의로 추측하지 않고 `docs/SOURCE_OF_TRUTH.md`를 따른다.

---

# 4. Feature Requirements

> 이 장의 `참고 이미지`는 Claude Design Mockup 기준 경로를 사용한다.  
> Windows 기준 루트: `C:\learnershigh-extension\references\claude-design-mockup\AdminStudentManagement\`  
> Repository 기준 루트: `references/claude-design-mockup/AdminStudentManagement/`


## Feedback Dashboard

### 참고 이미지 (Claude Design Mockup)

- `references/claude-design-mockup/AdminStudentManagement/FeedbackDashboard/FeedbackDashboard-00.png` — Feedback Dashboard / 공용 검토 Queue 목록
- `references/claude-design-mockup/AdminStudentManagement/FeedbackDashboard/FeedbackDetail-01.png` — Feedback 상세 / 검토 화면
- `references/claude-design-mockup/AdminStudentManagement/FeedbackDashboard/FeedbackDetail-02.png` — Feedback 상세 / 추가 검토 상태


Goal:

오늘 처리할 검토 업무 파악.

KPI:

- Feedback Pending
- 마감 임박
- 수정 미반영
- 이번 주 완료

Filter:

- 전체
- 수행평가
- 성장활동
- 학년
- Stage
- Deadline
- Waiting Time
- Status

Task Feedback과 Activity Feedback을 Shared Queue 원칙으로 처리한다.

특정 Staff 자동 Routing은 사용하지 않는다.

---

## Feedback Review

Desktop 3-column.

```text
LEFT   Submission / Activity Viewer
CENTER AI Analysis
RIGHT  Staff Review
```

Admin Action:

- Criteria 확인
- AI 동의
- AI 제외
- AI 수정 후 전달
- Student Comment
- Next Action
- Parent Report 공개 후보
- 전달
- 최종 승인

---

## Mentor Case Recommendation

Admin이 Student Task/Activity에 적합한 Mentor Case를 추천한다.

추천 시 동시에:

```text
Task.relatedMentorCaseIds
+
Student Mentor Hub Recommendation
```

이 갱신된다.

---

## Today Board

### 참고 이미지 (Claude Design Mockup)

- `references/claude-design-mockup/AdminStudentManagement/TodayBoard/TodayBoard-00.png`
- `references/claude-design-mockup/AdminStudentManagement/TodayBoard/TodayBoard-01.png`
- `references/claude-design-mockup/AdminStudentManagement/TodayBoard/TodayBoard-02.png`
- `references/claude-design-mockup/AdminStudentManagement/TodayBoard/TodayBoard-03.png`
- `references/claude-design-mockup/AdminStudentManagement/TodayBoard/TodayBoard-04.png`


Goal:

오늘 관리 우선순위를 확인한다.

KPI:

- 오늘 등원
- 관리 필요
- Feedback Pending
- Parent Report 미발송

Row:

- Student
- Grade
- 오늘 순공
- 최근 7일 Plan
- Task 상태
- 최근 시험/학습 변화
- 관리 포인트
- Quick Action

Quick Action:

- Message
- Reminder
- Student 360

관리 포인트는 서비스 사용 횟수가 아니라 실제 학습 변화 중심으로 표현한다.

좋은 예:

- 최근 2주 Plan 84% → 58%
- 영어 87 → 81
- 모의 수학 3 → 2등급
- 수행평가 D-2

---

## Student 360

Tab:

```text
Overview
Study
School
Activities
Mentor
Reports
```

### Overview

- Student Context
- 최근 학습 변화
- 중요한 시험
- 수행평가 상태
- Activity
- 다음 Action
- Parent Report 상태

### Study

- 순공시간
- Plan 실행률
- 과목별 공부시간
- 학교 시험
- 모의고사
- 학원 Test

### School

- Task
- Evidence
- Final Result
- SchoolRecordSnapshot
- confirmed / candidate

### Activities

- 동아리
- 대회
- 봉사
- 프로젝트
- 진로체험
- Reflection
- Archive

### Mentor

- 추천 Mentor
- 저장 Content
- 적용 중 Plan/Routine
- Task 연결 Case

### Reports

- Parent Report
- 발송 이력
- Parent 공유 동의 Artifact

---

## TestResult

Type:

- `school_exam`
- `mock_exam`
- `academy_test`

표시 가능한 값:

- score
- grade
- percentile
- rank
- previousResult
- change

서로 다른 시험을 무리하게 한 평균으로 합치지 않는다.

실제 입력되지 않은 값은 만들지 않는다.

---

## SchoolRecordSnapshot

상태:

- confirmed
- candidate

candidate를 confirmed처럼 표현하지 않는다.

School / Student360 / Parent Report가 같은 Entity를 참조한다.

---

## Operations Dashboard

Shared Entity에서 계산한다.

KPI:

- 등록 학생
- 오늘 학습 기록 발생
- 진행 중 Task
- Task Feedback Pending
- Activity Feedback Pending
- Deadline Risk
- Parent Report 미발송
- Queue 평균 첫 검토시간
- 48h 초과 Queue

Alert:

- Feedback 병목
- Parent Report 미발송
- Plan 50% 미만
- 연속 미등원

KPI를 별도 Mock Counter로 유지하지 않는다.

---

## Admin Settings

기존 공통 Settings와 연결한다.

- AI 공개 정책
- Theme
- Institution

새 Settings 시스템을 중복 구현하지 않는다.

---

---

# 5. 관련 Cross-Surface Flow

## 11-1. Task

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

## 11-3. Mentor Case

```text
Admin Recommend
→ Task Related Case
→ Student Mentor Hub Recommendation
```

## 11-6. Growth Activity

```text
Create
→ Submitted
→ Reflection
→ Archive
```

Feedback 요청 시:

```text
Submitted
→ Activity Feedback Queue
→ Admin Feedback
→ Student 보완
→ Archive
```

## 11-7. Connection / Interview

```text
Archive Activity
→ AI Connection Candidate
→ Admin Confirm
→ Interview Question Draft
→ Publish
→ Student Interview Bridge
```

---

# 6. Canonical Mock / 집계 기준

## 12-1. Student

Student Surface에는 로그인한 한 학생 데이터만 보인다.

한 Route에서 다른 학생의:

- Task
- Activity
- Evidence
- Archive

를 섞지 않는다.

여러 학생 비교는 Admin에서만 한다.

## 12-3. 시간 기준

화면 Snapshot 시점이 다르면 `snapshotDate`를 구분한다.

예:

- 10/03 V2 검토 대기
- 10/31 최종 결과 완료

## 12-4. 집계 기간

- Today Board Plan = 최근 7일
- Parent Report Plan = 해당 월 전체

기간이 다른 수치를 같은 값처럼 사용하지 않는다.

---

# 7. Guardrail

## 13-2. AI

AI는:

- Analysis
- Suggestion
- Draft

까지만 한다.

최종 판단과 공개 여부는 Admin이 결정한다.

## 13-5. Queue

Feedback은 공용 Queue를 사용한다.

금지:

- 특정 Staff 자동 Routing
- 과목 기준 Routing

---

---

# 8. Screen Inventory

- Feedback Dashboard
- Feedback Queue
- Feedback Review
- Topic Review
- Activity Feedback
- Mentor Case Search / Recommend
- Today Board
- Student 360
- TestResult Detail
- SchoolRecordSnapshot
- Activity Archive
- Connection Review
- Interview Management
- Operations Dashboard
- Admin Settings Integration

---

# 9. Acceptance Checklist

- [ ] 모든 Admin 계정이 동일 확장 화면에 접근한다.
- [ ] Feedback이 Shared Queue로 동작한다.
- [ ] 특정 Staff/과목 Routing이 없다.
- [ ] Feedback Review 3-column 구조가 있다.
- [ ] AI 항목 동의/제외/수정후전달이 가능하다.
- [ ] Admin Feedback이 Student 상태에 반영된다.
- [ ] Today Board는 실제 관리 필요를 중심으로 표시한다.
- [ ] Student360에서 Study/School/Activities/Mentor/Reports를 확인한다.
- [ ] TestResult Type을 구분한다.
- [ ] SchoolRecord confirmed/candidate를 구분한다.
- [ ] Operations KPI가 Shared Entity에서 계산된다.

---

# 10. 완료 기준

## 구현 완료 기준

Feature가 완료되었다고 판단하려면 화면 존재 여부만 확인하지 않는다.

```text
Requirement
+ Shared Entity
+ Interaction
+ Cross-Surface State
+ Loading/Empty/Error
+ Back Context
+ Permission/Privacy
+ Test
```

새 Visual polish보다 Interaction과 데이터 연결 오류를 우선 수정한다.
