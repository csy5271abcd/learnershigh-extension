---
paths:
  - "frontend/student/**"
---

# Frontend Student Rules

이 규칙은 `frontend/student/**` 작업에 적용한다.

## 1. 역할

Student Surface는 학생 본인의 학습, 학교활동, Mentor 콘텐츠를 사용하는 화면이다.

주요 Suyeon 기능:

```text
Mentor Hub
School & Admissions
```

기존 Student Navigation 전체를 다시 만들지 않는다.

## 2. 작업 전 확인

Student 화면 작업 전:

```text
docs/specs/suyeon/domain.md
관련 Feature Spec
docs/api/api-contract.md
docs/design/tds-web-guidelines.md
관련 Claude Design Mockup
```

기존 기능과 연결되는 화면이면:

```text
docs/architecture/integration-boundary.md
기존 LearnersHigh Student Reference
```

도 확인한다.

## 3. Feature-first Structure

권장:

```text
frontend/student/src/features/
├─ mentor-hub/
└─ school-admissions/
```

Feature 내부 책임을 먼저 유지한다.

Feature 전용 Component / Hook / Utility를
편의상 `frontend/shared/`로 이동하지 않는다.

## 4. Existing Context 유지

기존 Student Navigation과 Existing Feature Context를 유지한다.

예:

```text
기존 수행평가 Entry
→ School로 연결

Mentor
→ 신규 Extension Entry
```

기존 Student 전체 UI를 TDS 스타일로 일괄 리디자인하지 않는다.

## 5. Business State 복제 금지

다음 상태는 Domain/API를 기준으로 사용한다.

```text
Task Stage
Activity State
Feedback State
Parent Share State
Mentor Question State
```

UI 표시를 위해 다른 이름의 Local Business State를 새로 만들지 않는다.

## 6. UI State 분리

Local UI State는 다음처럼 제한한다.

```text
selectedTab
searchKeyword
filter
isDrawerOpen
isModalOpen
selectedVersionPair
scrollPosition
```

Domain State와 섞지 않는다.

## 7. Task Detail

Task Detail은 Feature Spec의 7개 Tab 구조를 유지한다.

Overview에서 가장 중요한 정보:

```text
현재 단계
현재 상태
다음 Action
Primary CTA
```

`지금 할 일`이 핵심이다.

다른 Tab에서는 Compact Status로 줄일 수 있다.

## 8. Task 8단계

Student UI가 Stage를 임의로 건너뛰거나
화면 convenience를 위해 Stage를 별도 계산하지 않는다.

Stage 전이는 Backend / Domain 기준을 따른다.

## 9. AI Analysis

지원 상태:

```text
Loading
Success
Failed
Retry
```

AI는 Teacher/Staff Feedback보다 Primary가 아니다.

Student-facing UI:

```text
Teacher / Staff Feedback = Primary
AI Feedback = Secondary
```

## 10. Reflection

Student Reflection은 학생 작성 영역이다.

AI 기능은:

```text
누락 안내
구체화 질문
중복/긴 문장 안내
```

까지만 제공한다.

자동 완성된 Reflection 본문을 Student 원문처럼 저장하지 않는다.

## 11. Mentor Hub

Mentor Home은 단순 Feed가 아니라 Student Context 기반 추천 Home이다.

추천 이유는 대학 순위가 아니라:

```text
학생 Context
+
Mentor 경험 적합성
```

을 설명한다.

## 12. Mentor Plan / Routine Apply

기존 LearnersHigh Plan과 연결한다.

새 Student Weekly Plan 시스템을 만들지 않는다.

Apply 전:

```text
Preview
Mapping
Conflict Check
```

를 거친다.

이미 적용된 Snapshot은 Mentor 원본 수정으로 자동 변경하지 않는다.

## 13. Q&A

Student Q&A에는:

```text
pending
answered
overdue
```

등 Domain/API에서 확정된 상태만 사용한다.

`reassign`의 의미가 미확정이면 임의 State를 만들지 않는다.

## 14. Privacy

Student가 보는 Mentor Record / Case는
Published / 검수 완료 Content만 노출한다.

PII가 제거되지 않은 Record/Case를 표시하지 않는다.

## 15. Back Context

Feature Spec에서 요구된 경우 Detail 왕복 후 다음을 보존한다.

```text
Selected Tab
Search
Filter
Scroll
Selected Version Pair
```

## 16. Responsive

Student는 Tablet을 중요 Target으로 본다.

우선 고려:

```text
2-column
Responsive Grid
Tab
Detail Panel
Drawer
```

Mobile에서는 Desktop/Tablet 구조를 단순 축소하지 않는다.

## 17. Loading / Empty / Error

핵심 Screen은 필요한 상태를 구현한다.

특히:

```text
Task 없음
Evidence 없음
검색 결과 없음
AI 실패
기존 Plan 연동 실패
```

를 서로 구분한다.

## 18. API 사용

Frontend Component에서 Response Shape을 추측하지 않는다.

`docs/api/api-contract.md`의 DTO 의미를 따른다.

API Error를 무조건 `[]`, `null`로 치환하지 않는다.

## 19. Test

최소 확인:

```text
주요 Route 진입
Primary CTA
State Transition 표시
Loading
Empty
Error
Back Context
Privacy
Cross-Surface 반영이 필요한 Action
```

## 20. 금지

```text
기존 Student 기능 재구현
화면별 Task Mock 생성
AI를 최종 판단처럼 표현
Reflection 자동 작성
Mentor Record 원본 공개
미정 Enum 임의 추가
API 없는 Local-only Business Flow 구현
```
