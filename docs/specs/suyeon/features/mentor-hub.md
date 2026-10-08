# mentor-hub

> 위치: `docs/specs/suyeon/features/mentor-hub.md`  
> 이 문서는 기존 `learnershigh-suyeon-feature-spec.md`에서 해당 기능 영역을 분리한 구현용 Feature Spec이다.  
> 공통 Entity / State / Cross-Surface 규칙은 `docs/specs/suyeon/domain.md`를 우선 확인한다.

## 1. Scope

Student가 Mentor 경험과 콘텐츠를 탐색·저장·적용·질문하고, Mentor가 자신의 콘텐츠와 익명 Q&A를 관리하는 기능을 다룬다.

포함 범위:

```text
Student Mentor Hub
Mentor Profile
Plan
Routine
Story
Student Q&A
Record
Activity Case
Mentor My Content
Mentor Q&A Inbox
Create Post
Mentor Profile
Admin Mentor Case Recommendation 연결
```

## 2. 반드시 함께 확인할 문서

- `docs/SOURCE_OF_TRUTH.md`
- `docs/OWNERSHIP.md`
- `docs/specs/suyeon/domain.md`
- `docs/architecture/integration-boundary.md`
- `docs/design/tds-web-guidelines.md`
- `docs/api/api-contract.md`
- `references/claude-design-mockup/MentorHub/`

## 3. 공통 경계

- 기존 LearnersHigh 기능을 편의를 위해 중복 구현하지 않는다.
- 기존 기능 연결은 `docs/architecture/integration-boundary.md`를 따른다.
- 신규 Visual은 `docs/design/tds-web-guidelines.md`와 해당 Claude Design Mockup을 따른다.
- Frontend ↔ Backend 형식은 `docs/api/api-contract.md`를 따른다.
- 상담 관련 Entity / API / DB / 화면 / 비즈니스 로직은 이 Spec 범위에 포함하지 않는다.
- 문서 또는 Mockup이 충돌하면 임의로 추측하지 않고 `docs/SOURCE_OF_TRUTH.md`를 따른다.

---

# 4. Feature Requirements — Mentor Hub

> 이 장의 `참고 이미지`는 Claude Design Mockup 기준 경로를 사용한다.  
> 기준 루트: `references/claude-design-mockup/MentorHub/`

Mentor Hub는 수행평가 사례만 모아놓는 기능이 아니다.

다음 경험을 폭넓게 제공한다.

- 내신
- 수능
- 논술
- 공부법
- 전형 선택
- 성적 변화
- Plan
- Routine
- 실패/회복
- 수행평가
- 동아리
- 교내외 대회/프로젝트
- 봉사/진로활동
- 실제 Record
- Activity Case

---

## Student Mentor Hub Home

### 참고 이미지 (Claude Design Mockup)

- `references/claude-design-mockup/MentorHub/StudentMentorHubHome/StudentMentorHubHome-01.png`
- `references/claude-design-mockup/MentorHub/StudentMentorHubHome/StudentMentorHubHome-02.png`

첫 화면은 단순 Feed가 아니라 현재 학생에게 무엇을 먼저 참고하면 좋은지 보여주는 추천 Home이다.

### Student Context

추천에 활용 가능한 정보:

- grade
- interestField
- desiredMajor
- admissionInterest
- currentTask
- currentActivity
- recentStudyContext
- savedContentTags
- viewedContentTags

### Main Tab

```text
추천 / 멘토 / Plan / Routine / Story / Q&A / Record / Case
```

### 추천 Mentor

상위 3명을 크게 노출한다.

Card 정보:

1. Mentor 이름
2. 대학·학과
3. 전형
4. 추천 이유
5. 고교 Context
6. 대표 경험
7. 관련 Content
8. Tag
9. Profile CTA

추천 이유는 대학 순위가 아니라 학생 Context와 Mentor 경험의 적합성으로 설명한다.

### 다른 Mentor

약 6명의 Compact Row.

- 이름
- 대학·학과
- 전형
- 한 줄 대표 경험
- Profile

### Admin 추천 Case

현재 Student Task/Activity와 연관된 Mentor Case를 Admin이 추천할 수 있다.

Student에게는:

- Case 제목
- Mentor
- 연관 이유
- 추천일
- 연결 Task
- `Case 보기`

를 제공한다.

### Mixed Recommendation

추천 Home 하단에서는 다음 유형을 섞는다.

- Plan
- Routine
- Story
- Q&A
- Record
- Case

Case만 지나치게 반복하지 않는다.

---

## Mentor Profile

### 참고 이미지 (Claude Design Mockup)

- `references/claude-design-mockup/MentorHub/MentorProfile/MentorProfile-00.png`
- `references/claude-design-mockup/MentorHub/MentorProfile/MentorProfile-01.png`
- `references/claude-design-mockup/MentorHub/MentorProfile/MentorProfile-02.png`

표시:

- 대학·학과
- 인증
- 전형
- 고교 Context
- 성적 Summary
- 대표 경험
- Content Tab

Action:

- Follow
- 질문하기
- Content 열기

Detail 왕복 후 선택 Tab과 Scroll을 유지한다.

---

## Plan

### 참고 이미지 (Claude Design Mockup)

- `references/claude-design-mockup/MentorHub/Plan/Plan-00.png`
- `references/claude-design-mockup/MentorHub/Plan/Plan-01.png`
- `references/claude-design-mockup/MentorHub/Plan/Plan-02.png`
- `references/claude-design-mockup/MentorHub/Plan/Plan-03.png`
- `references/claude-design-mockup/MentorHub/Plan/Plan-04.png`

대표 구조:

- 1~4주차
- 요일
- 할 일
- 과목
- Memo

Apply Flow:

```text
적용 시작일
→ 가져올 항목 선택
→ 내 Library/교재 Mapping
→ 기존 일정 충돌 확인
→ 수정
→ 내 주간계획에 추가
```

적용 Item은 `source=mentorPlanId`를 가진다.

적용 시점의 Snapshot을 유지하며 Mentor 원본 수정이 이미 적용된 Student Plan을 자동 변경하지 않는다.

---

## Routine

### 참고 이미지 (Claude Design Mockup)

- `references/claude-design-mockup/MentorHub/Routine/Routine-00.png`
- `references/claude-design-mockup/MentorHub/Routine/Routine-01.png`
- `references/claude-design-mockup/MentorHub/Routine/Routine-02.png`

Action:

- 전체 적용
- 특정 Habit만 적용

적용 전 기존 일정과 충돌을 검사하고 Conflict State를 제공한다.

---

## Story

### 참고 이미지 (Claude Design Mockup)

- `references/claude-design-mockup/MentorHub/Story/Story-00.png`
- `references/claude-design-mockup/MentorHub/Story/Story-01.png`
- `references/claude-design-mockup/MentorHub/Story/Story-02.png`

주제:

- 성공
- 실패
- 회복
- 성적 변화
- 수시/정시 전환
- 진로 고민
- 공부법
- 멘탈 관리

Action:

- Topic Filter
- Detail
- 저장
- 관련 질문
- Mentor Profile

Feed 복귀 시 Topic/Scroll 유지.

---

## Student Q&A

### 참고 이미지 (Claude Design Mockup)

- `references/claude-design-mockup/MentorHub/StudentQ&A/StudentQ&A-00.png`
- `references/claude-design-mockup/MentorHub/StudentQ&A/StudentQ&A-01.png`

Flow:

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

## Record

Mentor의 실제 학교생활기록 관련 내용을 개인정보 제거와 검수 후 참고하는 기능이다.

공개 가능한 유형:

- 세부능력 및 특기사항
- 자율활동
- 동아리활동
- 진로활동
- 공식 프로젝트/탐구 연계 기록

제거:

- 학교명
- 담당 교사
- 학번
- 반/번호
- 주민번호
- 수험번호
- 제3자 실명

금지:

- 원본 PDF 공개
- 그대로 복사하는 CTA
- `내 기록으로 만들기`

학생은 문장을 복사하기보다 실제 활동과 기록의 연결을 이해한다.

---

## Activity Case

### 참고 이미지 (Claude Design Mockup)

- `references/claude-design-mockup/MentorHub/ActivityCase/ActivityCase-00.png`
- `references/claude-design-mockup/MentorHub/ActivityCase/ActivityCase-01.png`
- `references/claude-design-mockup/MentorHub/ActivityCase/ActivityCase-02.png`
- `references/claude-design-mockup/MentorHub/ActivityCase/ActivityCase-03.png`
- `references/claude-design-mockup/MentorHub/ActivityCase/ActivityCase-04.png`
- `references/claude-design-mockup/MentorHub/ActivityCase/ActivityCase-05.png`
- `references/claude-design-mockup/MentorHub/ActivityCase/ActivityCase-06.png`
- `references/claude-design-mockup/MentorHub/ActivityCase/ActivityCase-07.png`
- `references/claude-design-mockup/MentorHub/ActivityCase/ActivityCase-08.png`
- `references/claude-design-mockup/MentorHub/ActivityCase/ActivityCase-09.png`
- `references/claude-design-mockup/MentorHub/ActivityCase/ActivityCase-10.png`
- `references/claude-design-mockup/MentorHub/ActivityCase/ActivityCase-11.png`

Card:

- 실제 활동명
- 과목/영역
- 짧은 설명
- 결과물 Summary

Detail:

1. 활동 기본정보
2. 안내/목표
3. 주제
4. 조사/준비
5. Evidence
6. 결과물
7. 중간 과정
8. 최종 결과
9. Reflection
10. 후속 활동
11. 관련 Mentor Content
12. 내 Task/Activity 참고 연결

모든 Case에 같은 Revision 패턴을 강제하지 않는다.

---

# 5. Feature Requirements — Mentor Surface

## My Content

Mentor가 자신이 작성한 콘텐츠를 관리한다.

Content Type:

- Plan
- Routine
- Story
- Record
- Case

표시:

- Draft / Published
- 조회
- 저장
- Apply 수

Action:

- Type Filter
- Detail
- Edit
- Create

---

## Q&A Inbox

질문자는 익명 Context로 표시한다.

예:

`고2 · 화학공학 관심`

Mentor는:

- Question 확인
- 답변 입력
- 관련 Plan/Routine/Story/Record/Case 연결
- Submit

할 수 있다.

답변 완료 시 Student Q&A에 즉시 반영한다.

---

## Create Post

```text
Type
→ Tag
→ Body
→ Visibility
→ Preview
→ Submit
```

Record / Case는 개인정보 검수 후 Published 상태가 된다.

작성 중 Back 이동 시 Draft를 보존한다.

---

## Mentor Profile

Mentor 자신의 공개정보와 Published Content를 확인한다.

표시:

- 대학·학과
- 전형
- 고교 Context
- 대표 경험
- Tag
- Published Content

Mentor에게 Student의 실제 관리 데이터는 제공하지 않는다.

---

---

# 6. Cross-Surface Flow

## 11-3. Mentor Case

```text
Admin Recommend
→ Task Related Case
→ Student Mentor Hub Recommendation
```

## 11-4. Mentor Plan

```text
Student Apply Mentor Plan
→ Student WeeklyPlan
→ source=mentorPlanId
→ Snapshot 유지
→ Student360 Mentor에 반영
```

## 11-5. Q&A

```text
Student Question
→ Mentor Inbox
→ Mentor Answer
→ Student Q&A
```

72시간 미답변:

```text
pending
→ overdue
→ reassign
```

---

# 7. Canonical Mock / Seed

## 12-2. Mentor

같은 Mentor는 모든 화면에서 다음 값이 동일해야 한다.

- 이름
- 대학
- 학과
- 전형
- 고교 Context
- 대표 경험

Mentor Profile / Recommendation / Case가 동일 Entity를 참조한다.

## 12-3. 시간 기준

화면 Snapshot 시점이 다르면 `snapshotDate`를 구분한다.

예:

- 10/03 V2 검토 대기
- 10/31 최종 결과 완료

---

# 8. Guardrail

## 13-2. AI

AI는:

- Analysis
- Suggestion
- Draft

까지만 한다.

최종 판단과 공개 여부는 Admin이 결정한다.

## 13-3. Mentor Privacy

Mentor에게 Student의:

- 실명
- 학교
- 기관
- 상세 학습관리 데이터

를 공개하지 않는다.

## 13-4. Record Privacy

Record/Case:

```text
PII Detection
→ Admin Review
→ Published
```

---

# 9. Screen Inventory

### Student

- Mentor Hub Home
- Mentor List
- Mentor Profile
- Plan Detail
- Apply to My Plan
- Routine Detail
- Story Feed / Detail
- Q&A
- Record List / Detail
- Activity Case

### Admin 연결

- Mentor Case Search / Recommend

### Mentor

- My Content
- Content Detail / Edit
- Q&A Inbox
- Question Detail
- Answer
- Create Post
- Preview
- Review Pending
- Profile

---

# 10. Acceptance Checklist

## Student

- [ ] Mentor Home 추천 이유가 대학 순위 중심이 아니다.
- [ ] Mentor / Plan / Routine / Story / Q&A / Record / Case를 탐색할 수 있다.
- [ ] Plan 적용 시 Snapshot이 유지된다.
- [ ] Routine 충돌 상태가 존재한다.
- [ ] Student Q&A와 Mentor 답변이 연결된다.

## Mentor

- [ ] My Content를 관리한다.
- [ ] 익명 Q&A Inbox를 확인한다.
- [ ] 답변이 Student Q&A에 반영된다.
- [ ] 관련 Content를 연결할 수 있다.
- [ ] Create Post가 Draft를 보존한다.
- [ ] Record/Case는 개인정보 검수 후 공개된다.
- [ ] Student 실명/기관/상세 관리 데이터가 보이지 않는다.

---

# 11. 완료 기준

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
