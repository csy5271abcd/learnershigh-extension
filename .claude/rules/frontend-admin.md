---
paths:
  - "frontend/admin/**"
---

# Frontend Admin Rules

이 규칙은 `frontend/admin/**` 작업에 적용한다.

## 1. 역할

Admin Surface는 다음을 관리한다.

```text
Feedback
Student Management
Parent Progress
Mentor Management
Operations
```

Admin UI는 Student UI보다 정보 밀도가 높고
Desktop 사용을 우선 고려한다.

## 2. 작업 전 확인

```text
docs/specs/suyeon/domain.md
관련 Feature Spec
docs/api/api-contract.md
docs/design/tds-web-guidelines.md
관련 Admin Claude Design Mockup
```

기존 Admin Context 연결 시:

```text
docs/architecture/integration-boundary.md
기존 LearnersHigh Admin Reference
```

도 확인한다.

## 3. Desktop-first

주요 Pattern:

```text
Sidebar
Header
Toolbar
Search / Filter
Table
Split Pane
Right Drawer
Modal
Master-Detail
```

모든 정보를 Card로 세로 나열하지 않는다.

## 4. Shared Feedback Queue

Task Feedback과 Activity Feedback은 Shared Queue를 사용한다.

금지:

```text
특정 Staff 자동 Routing
과목 기준 자동 Routing
Feature별 별도 Queue Source
```

Filter는 Queue View의 조건일 뿐 새로운 Business Routing Rule이 아니다.

## 5. Feedback Review

Wide Desktop 기본 구조:

```text
LEFT   Submission / Activity Viewer
CENTER AI Analysis
RIGHT  Staff Review
```

화면 폭이 줄어들면:

```text
3-column
→ 2-column + Drawer
→ 1-column + Tab/Drawer
```

로 재배치할 수 있다.

기능 우선순위는 유지한다.

## 6. AI Review

Admin은 AI 항목을:

```text
동의
제외
수정 후 전달
```

할 수 있다.

AI 결과를 자동 승인하지 않는다.

Student에게 전달되는 최종 Feedback은 Staff Review 결과를 기준으로 한다.

## 7. Today Board

Today Board의 목적은 "오늘 관리가 필요한 학생" 파악이다.

서비스 사용 횟수보다 실제 변화 중심으로 표시한다.

좋은 예:

```text
최근 2주 Plan 84% → 58%
영어 87 → 81
모의 수학 3 → 2등급
수행평가 D-2
```

## 8. Student 360

Student 360은 별도 Student Aggregate를 만들지 않는다.

기존/공유 데이터를 조합한 Read Model로 본다.

```text
Overview
Study
School
Activities
Mentor
Reports
```

Tab마다 같은 Student Identity를 유지한다.

## 9. KPI

KPI는 실제 Shared Entity / Existing Data에서 계산한다.

금지:

```text
화면용 Mock Counter
수동으로 맞춰두는 숫자
같은 KPI를 여러 곳에서 다른 공식으로 계산
```

## 10. Parent Progress

Parent 전용 App/Web을 만들지 않는다.

Admin Flow:

```text
List
→ Editor
→ Validation
→ Preview
→ Generate
→ Send
```

Editor는 Desktop 2-column을 우선한다.

```text
LEFT  Content Editor
RIGHT Preview
```

## 11. Parent Validation

Send Disabled 이유를 사용자에게 보여준다.

예:

```text
감소 지표 대응 Plan 없음
candidate Record 문제
Student Artifact 동의 없음
```

Button만 Disable하고 이유를 숨기지 않는다.

## 12. SchoolRecordSnapshot

반드시 구분:

```text
confirmed
candidate
```

candidate를 confirmed처럼 보이게 하지 않는다.

## 13. TestResult

시험 유형을 구분한다.

```text
school_exam
mock_exam
academy_test
```

입력되지 않은 값을 UI convenience를 위해 생성하지 않는다.

## 14. Mentor Case Recommendation

Admin 추천 시:

```text
Task/Activity 연결
+
Student Mentor Hub Recommendation
```

의 Cross-Surface 효과를 고려한다.

한 화면에서만 성공 표시하고 Student 쪽 상태를 갱신하지 않는 구현을 피한다.

## 15. Privacy

Admin 내부 정보와 Parent 공개 정보를 분리한다.

Parent Output에:

```text
Raw AI
Internal Feedback 원문
미확정 Record
미동의 Artifact
```

를 노출하지 않는다.

## 16. Search / Filter

Admin 화면에서는 Search / Filter를 주요 도구로 본다.

현재 적용된 조건이 명확하게 보여야 한다.

다음 Empty를 구분한다.

```text
데이터 자체 없음
검색 결과 없음
Filter 결과 없음
Integration Error
```

## 17. Long-running Action

다음 작업은 Loading / Duplicate Submit 방지를 고려한다.

```text
Feedback 전달
PDF 생성
Parent Report Send
AI Draft
```

## 18. Quick Action

Quick Action은 실제 Domain/API Action에 연결한다.

예:

```text
Reminder
Student 360
Feedback Review
```

API/Feature Spec이 없는 Quick Action을 Mock 동작으로 만들지 않는다.

## 19. Test

최소 확인:

```text
Queue Filter
Review Action
KPI 반영
Student 360 동일 Identity
Parent Validation
Generate / Send 상태
Loading / Empty / Error
Privacy
```

## 20. 금지

```text
Staff/Subject 자동 Routing 추가
Dashboard Counter 수동 관리
candidate를 confirmed로 표시
Parent App 신규 구현
상담 기능을 Suyeon Admin Feature에 추가
AI Output 자동 공개
미정 Status 임의 확정
```
