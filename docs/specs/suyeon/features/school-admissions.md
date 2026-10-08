# school-admissions

> 위치: `docs/specs/suyeon/features/school-admissions.md`  
> 이 문서는 기존 `learnershigh-suyeon-feature-spec.md`에서 해당 기능 영역을 분리한 구현용 Feature Spec이다.  
> 공통 Entity / State / Cross-Surface 규칙은 `docs/specs/suyeon/domain.md`를 우선 확인한다.

## 1. Scope

Student의 수행평가 과정, Evidence, Version, Feedback, Revision, Growth Activity, Reflection, Archive, Connection, Interview Bridge를 다룬다.

포함 범위:

```text
School Home
Task 8-stage flow
Student Task Detail
Topic
Evidence
Version + AI
Feedback
Revision History
Growth Activities
Student Reflection
Activity Feedback
Archive
Cross-subject Connection
Interview Bridge
Final Artifact 공유 상태
```

## 2. 반드시 함께 확인할 문서

- `docs/SOURCE_OF_TRUTH.md`
- `docs/OWNERSHIP.md`
- `docs/specs/suyeon/domain.md`
- `docs/architecture/integration-boundary.md`
- `docs/design/tds-web-guidelines.md`
- `docs/api/api-contract.md`
- `references/claude-design-mockup/School&Admissions/`

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
> Windows 기준 루트: `C:\learnershigh-extension\references\claude-design-mockup\School&Admissions\`  
> Repository 기준 루트: `references/claude-design-mockup/School&Admissions/`

### 참고 이미지 — School Home / Tasks

- `references/claude-design-mockup/School&Admissions/Tasks-00.png` — School의 `Tasks` 목록 화면


## 수행평가 8단계

| Stage | 단계 | 전이 기준 |
|---|---|---|
| 1 | 안내문 등록 | Student 또는 Admin 등록 |
| 2 | 주제 선정 | 제출 후 공용 검토 |
| 3 | 자료 조사 | Evidence 1개 이상 |
| 4 | 초안 V1 제출 | 제출 즉시 AI 분석 |
| 5 | AI 사전 점검 | 성공 또는 실패/Retry |
| 6 | 선생님 피드백 | Shared Feedback Queue |
| 7 | Revision V2/V3 | 필요 시 반복 |
| 8 | 최종 제출/발표 | Archive 자동 이관 |

Admin에서 사용하는 운영 상태:

- D-3 Deadline Risk
- Review 48h 초과
- Feedback 후 수정 미반영
- Deadline Passed
- Hold

Student에서는 운영시간 숫자를 직접 노출하지 않고 상태 중심으로 표현한다.

---

## Student Task Detail

### 참고 이미지 (Claude Design Mockup)

- `references/claude-design-mockup/School&Admissions/TasksDetail-01.png` — Overview
- `references/claude-design-mockup/School&Admissions/TasksDetail-02.png` — 평가 기준·제출물
- `references/claude-design-mockup/School&Admissions/TasksDetail-03.png` — 참고 자료
- `references/claude-design-mockup/School&Admissions/TasksDetail-04.png` — 과정 자료
- `references/claude-design-mockup/School&Admissions/TasksDetail-05.png` — 피드백
- `references/claude-design-mockup/School&Admissions/TasksDetail-06.png` — Mentor Case
- `references/claude-design-mockup/School&Admissions/TasksDetail-07.png` — 수정 기록


고정 7 Tab:

1. Overview
2. 평가 기준·제출물
3. 참고 자료
4. 과정 자료
5. 피드백
6. Mentor Case
7. 수정 기록

### Overview

핵심은 `지금 할 일`.

- 현재 단계
- 현재 상태
- 다음 Action
- Primary CTA

다른 Tab에서는 Compact Status만 표시한다.

---

## Topic

Student:

- 주제 제출

Admin:

- Approve
- 방향 요청

Data:

- Task.topic
- topicApprovalStatus
- currentStage

---

## Evidence

### 참고 이미지 (Claude Design Mockup)

- `references/claude-design-mockup/School&Admissions/Evidence-00.png` — School의 `Evidence` 전체 목록 화면


기능:

- 파일 추가
- 파일 삭제
- Stage Tag
- Preview

`Evidence >= 1`이면 자료 조사 Stage 완료 조건을 만족할 수 있다.

실제 제출물과 자연스러운 파일명을 사용한다.

---

## Version + AI

```text
Upload
→ Version 생성
→ AI Analysis Loading
→ Success | Failed
```

Success:

- AI Feedback 생성
- Task Stage 갱신
- Shared Feedback Queue 진입

Failed:

- Failed State
- Retry

---

## Feedback

Student-facing:

- AI 사전 점검
- 선생님 피드백

Admin-facing:

- AI Analysis
- Staff Review

Student에서는 선생님 피드백을 Primary, AI를 Secondary로 표현한다.

Admin은 AI 항목별로:

- 동의
- 제외
- 수정 후 전달

을 선택한다.

Student 원문을 Admin/AI가 대신 작성하지 않는다.

---

## Revision History

- V1/V2/V3
- Before/After
- Diff Highlight
- Feedback Link
- Version Preview

Detail 왕복 후 선택 Version Pair를 유지한다.

---

## Growth Activities

### 참고 이미지 (Claude Design Mockup)

- `references/claude-design-mockup/School&Admissions/Activities-00.png` — `Activities` 목록 / 검색 / 유형 필터 / 상태 카드
- `references/claude-design-mockup/School&Admissions/ActivitiesDetail-01.png` — Growth Activity 상세 상단 / 활동 과정 / Evidence / Archive 저장
- `references/claude-design-mockup/School&Admissions/ActivitiesDetail-02.png` — Growth Activity 상세 하단 / Reflection / 선생님 피드백


수행평가 밖의 성장 경험을 기록한다.

Activity Type:

- 교내대회
- 교외대회
- 봉사
- 동아리
- 학교 프로젝트/행사
- 자율 탐구
- 진로체험
- 기타

필드:

- 활동명
- Type
- 주최/기관
- 기간
- 역할
- 참여 이유
- 주요 과정
- 본인 기여
- 결과
- Evidence
- Reflection
- 후속 활동
- Tag
- 공개범위

### State

기본:

```text
Draft
→ Submitted
→ Reflected
→ Archived
```

Feedback 요청:

```text
Draft
→ Submitted
→ Feedback Waiting
→ Feedback Delivered
→ Reflected
→ Archived
```

모든 Activity에 Feedback을 강제하지 않는다.

---

## Student Reflection

### 참고 이미지 (Claude Design Mockup)

- `references/claude-design-mockup/School&Admissions/ActivitiesDetail-02.png` — Reflection 문항 및 선생님 피드백 영역


학생이 직접 작성한다.

- 참여 이유
- 역할
- 실제로 한 일
- 어려웠던 점
- 배운 점
- 다음에 바꾸고 싶은 점
- 실제 후속 활동

AI는 대신 작성하지 않는다.

AI 지원:

- 빈 항목 표시
- 구체화 질문
- 날짜/역할/Evidence 누락 확인
- 중복/긴 문장 안내

---

## Activity Feedback

Admin Feedback 구조:

1. 잘 드러난 점
2. 조금 더 구체화할 점
3. 생각해볼 질문
4. 다음 활동 제안
5. Parent Report 공개 후보(optional)

특정 Subject Teacher에게 자동 배정하지 않는다.

공용 Queue를 사용한다.

---

## Archive

### 참고 이미지 (Claude Design Mockup)

- `references/claude-design-mockup/School&Admissions/Archive-00.png` — 완료된 수행평가 / Growth Activity가 함께 쌓이는 `Archive` 목록 화면


Final Repository.

Source:

- `source=task`
- `source=growth`

Card:

- 출처 Badge
- 활동명
- 시기
- 과목/Activity Type
- 결과
- Reflection Summary
- Evidence Count

활용:

- Student360
- Parent Report 후보
- Connection
- Interview

---

## Cross-subject Connection

AI가 Activity 간 연관 후보를 제안한다.

Admin:

- Confirm
- Reject

Confirmed된 Connection은 Student360과 Interview에 활용한다.

---

## Interview Bridge

고3 대상.

Admin이 Published한 질문만 Student에게 보인다.

Student Action:

- Question 열기
- 답변 작성
- 연습 상태 변경

Admin Action:

- AI Draft
- 질문 추가
- 수정
- 삭제
- Activity 연결
- Publish

---

---

# 5. Cross-Surface Flow

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

## 11-2. AI 실패

```text
AI Failed
→ Student Failed State
→ Retry
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

# 6. Canonical Mock / Seed

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

## 12-5. Evidence

실제 제출물에 맞는 파일명을 사용한다.

좋은 예:

- `speech_outline.png`
- `AI_교육기사_3건_요약.pdf`
- `speech_v2_548words.docx`
- `제동거리_탐구보고서_최종.pdf`
- `하천_현장조사사진.zip`

임시 문자열 파일명을 사용하지 않는다.

---

---

# 7. Guardrail

## 13-1. Student Authorship

AI/Admin이 Student 원문이나 Reflection을 대신 작성하지 않는다.

가능:

- 질문
- 방향
- 누락 확인
- Feedback
- Next Action

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

### Student

- School Home
- Task Create
- Task Detail
- Topic Submission
- Evidence Vault
- AI Analysis Result / Retry
- Feedback
- Revision History
- Growth Activity Create
- Growth Activity Detail
- Reflection
- Archive
- Interview Bridge
- Final Artifact Parent Share

### Admin 연결

- Feedback Queue / Review
- Topic Review
- Activity Feedback
- Activity Archive
- Connection Review
- Interview Management

---

# 9. Acceptance Checklist

- [ ] Task 8단계가 유지된다.
- [ ] Task Detail 7개 Tab이 유지된다.
- [ ] Overview에 `지금 할 일`이 있다.
- [ ] AI 실패 Retry가 있다.
- [ ] 선생님 피드백이 AI보다 Primary다.
- [ ] Revision Before/After를 확인할 수 있다.
- [ ] Growth Activity와 Reflection을 직접 작성할 수 있다.
- [ ] Final Task와 Growth Activity가 Archive에 모인다.
- [ ] Published Interview Question만 보인다.

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
