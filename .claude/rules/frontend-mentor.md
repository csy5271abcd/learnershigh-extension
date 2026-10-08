---
paths:
  - "frontend/mentor/**"
---

# Frontend Mentor Rules

이 규칙은 `frontend/mentor/**` 작업에 적용한다.

## 1. 역할

Mentor Surface는 Mentor 본인이 사용하는 별도 Surface다.

주요 기능:

```text
My Content
Q&A Inbox
Create Post
Profile
```

Mentor는 Student 관리자 역할을 가지지 않는다.

## 2. 작업 전 확인

```text
docs/specs/suyeon/features/mentor-hub.md
docs/specs/suyeon/domain.md
docs/api/api-contract.md
docs/design/tds-web-guidelines.md
관련 MentorHub Mockup
ADR-0001
```

## 3. Privacy First

Mentor에게 다음 정보를 전달하지 않는다.

```text
Student 실명
학교
기관
상세 학습관리 데이터
내부 Admin Note
불필요한 PII
```

질문자는 익명 Context로 표시한다.

예:

```text
고2 · 화학공학 관심
```

## 4. Content Ownership

Mentor는 자신의 Content만 관리한다.

Content Type:

```text
Plan
Routine
Story
Record
Case
```

다른 Mentor의 Draft/Edit 권한을 가정하지 않는다.

## 5. Content State

확정된 기본 표시 상태:

```text
Draft
Published
```

Record / Case는:

```text
PII Detection
→ Admin Review
→ Published
```

를 따른다.

Review 중간 State 이름은 Domain/API에서 확정되기 전 임의 추가하지 않는다.

## 6. Draft Preservation

Create/Edit 중:

```text
Back
Theme 변경
Preview 이동
```

등으로 Draft가 사라지지 않도록 한다.

Draft 보존 방식은 실제 State/Persistence 구조에 맞춘다.

## 7. Q&A Inbox

Mentor는:

```text
Question 확인
답변 작성
관련 Content 연결
Submit
```

할 수 있다.

답변 완료 시 Student Q&A에 반영되어야 한다.

## 8. Q&A State

확정 상태만 사용한다.

```text
pending
answered
overdue
```

`reassign`은 Action인지 Status인지 미확정이므로 임의 모델링하지 않는다.

## 9. Related Content

답변에 연결 가능한 Content:

```text
Plan
Routine
Story
Record
Case
```

연결은 참조이며 Content 본문을 복제하지 않는다.

## 10. Record / Case

PII가 제거되지 않은 Record / Case를 Published 처리하지 않는다.

금지:

```text
원본 PDF 그대로 공개
학교명/교사명/학번 등 식별정보 공개
Student에게 복사 CTA 제공
```

## 11. Profile

Profile은 Mentor 공개 정보와 Published Content 중심이다.

학생 관리 데이터는 포함하지 않는다.

## 12. Responsive

Mentor는 Tablet / Mobile 사용을 우선 고려할 수 있다.

Mobile에서는 TDS Mobile Pattern을 더 직접적으로 사용할 수 있지만
Feature Spec의 정보 위계를 유지한다.

Desktop에서는 Bottom Sheet 등을 그대로 복사하지 않는다.

## 13. Loading / Empty / Error

구분:

```text
작성 Content 없음
Q&A 없음
검색/Filter 결과 없음
Network Error
Submit Error
```

## 14. API

`/api/mentor/**` Contract를 따른다.

Frontend에서 Mentor 권한을 UI로 숨기는 것만으로 끝내지 않고
Backend Permission과 함께 동작해야 한다.

## 15. Test

최소 확인:

```text
My Content List/Detail
Draft 보존
Publish Flow
Record/Case Review 경계
Q&A Answer
Related Content 연결
Student Privacy
Loading/Empty/Error
```

## 16. 금지

```text
Mentor에게 Student 실명 노출
Mentor를 Student 관리자처럼 구현
Record/Case 즉시 공개
미정 Review State 추가
다른 Mentor Content 수정 가정
Q&A 답변을 Student 화면과 분리된 Local State로만 처리
```
