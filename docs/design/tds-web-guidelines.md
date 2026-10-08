# LearnersHigh Extension — TDS Web Guidelines

> 위치: `docs/design/tds-web-guidelines.md`  
> 목적: LearnersHigh Extension의 신규 화면을 구현할 때 **Toss Design System(TDS) Mobile의 디자인 원칙을 Desktop / Tablet / Mobile Responsive Web에 맞게 재해석하는 공통 기준**을 정의한다.  
> 이 문서는 TDS 자체를 복제하거나 요약해 대체하는 문서가 아니다. 실제 컴포넌트의 목적·상태·Variant·Interaction은 공식 TDS 문서를 직접 확인한다.

---

# 1. 적용 범위

이 문서는 다음 신규 확장 화면에 적용한다.

```text
Student
├─ Mentor Hub
└─ School & Admissions

Admin
├─ Feedback
├─ Student Management
├─ Parent Progress
├─ Mentor Management
└─ 기타 신규 Extension 화면

Mentor
├─ My Content
├─ Q&A Inbox
├─ Create
└─ Profile
```

기존 LearnersHigh 화면 전체를 이 문서 기준으로 재디자인하지 않는다.

---

# 2. 가장 중요한 원칙

LearnersHigh Extension의 UI 기준은 다음처럼 역할을 나눈다.

```text
기능 / Interaction
→ Feature Spec

Entity / State
→ domain.md

API
→ api-contract.md

신규 Visual / Component Principle
→ TDS 공식 문서 + 이 문서

신규 화면의 구체적 Layout
→ Claude Design Mockup

기존 LearnersHigh의 Context / IA / 기존 Interaction
→ existing-runners-high-analysis.md + 기존 화면 이미지
```

즉:

```text
기존 LearnersHigh
→ 무엇이 어디에 있고 어떻게 연결되는지 참고

TDS
→ 정보 위계, 컴포넌트 구조, 상태, 피드백, 접근성 참고

Claude Design Mockup
→ 실제 신규 화면의 구성과 Layout 참고
```

로 사용한다.

---

# 3. 기존 LearnersHigh 유지 원칙

신규 확장 UI를 만들 때 다음을 유지한다.

```text
- 기존 LearnersHigh 메뉴 이름과 Context
- 기존 Navigation 흐름
- 기존 기능 진입 위치
- 기존 정보 구조의 의미
- 기존 기능과 신규 기능의 연결 방식
```

다음은 하지 않는다.

```text
- 기존 Student/Admin 화면 전체 리디자인
- 기존 기능을 신규 UI 안에서 중복 구현
- 오래된 기존 Visual을 신규 화면에 그대로 복제
```

신규 확장 화면만 Responsive Web으로 구현한다.

---

# 4. TDS 적용 원칙

신규 UI Visual은 TDS Mobile의 다음 원칙을 참고한다.

```text
Color
Typography
Component hierarchy
State
Feedback
Overlay
Accessibility
```

중요:

```text
TDS Mobile 화면을 그대로 복사하지 않는다.
```

가져와야 하는 것:

```text
- 정보 위계
- 컴포넌트 목적
- Variant 의미
- Size 체계
- State 표현
- Disabled / Loading / Error 처리
- Feedback 방식
- Overlay Interaction
- Accessibility 원칙
```

그대로 복사하지 않는 것:

```text
- Mobile 전용 화면 폭
- Mobile 전용 Navigation 구조
- Bottom Sheet 중심 Layout
- Fixed Bottom CTA 위치
- Mobile Keypad
- 1열 전용 Layout
```

---

# 5. Claude Code 구현 전 TDS 확인 절차

Claude Code는 신규 화면을 구현하기 전에 다음 순서로 확인한다.

```text
1. 관련 Feature Spec 확인
2. 관련 Claude Design Mockup 확인
3. TDS Foundation의 Color / Typography 확인
4. 화면에 필요한 TDS Component 문서 확인
5. Variant / Size / State 확인
6. Loading / Disabled / Error 확인
7. Overlay가 있으면 Dialog / Modal / Bottom Sheet / Toast 확인
8. Mobile Pattern을 Web Context로 변환
9. Interaction / Permission / Privacy 규칙과 대조
10. 구현
```

TDS 문서를 실제로 열 수 없는 경우:

```text
- 내용을 추측하지 않는다.
- 읽지 못한 URL을 보고한다.
- 기존 기억만으로 Variant / State를 확정하지 않는다.
```

---

# 6. TDS 공식 문서 — Main / Foundation

- [TDS Mobile](https://tossmini-docs.toss.im/tds-mobile/)
- [Colors](https://tossmini-docs.toss.im/tds-mobile/foundation/colors/)
- [Typography](https://tossmini-docs.toss.im/tds-mobile/foundation/typography/)

---

# 7. TDS 공식 문서 — Components

- [Badge](https://tossmini-docs.toss.im/tds-mobile/components/badge/)
- [Board Row](https://tossmini-docs.toss.im/tds-mobile/components/board-row/)
- [Border](https://tossmini-docs.toss.im/tds-mobile/components/border/)
- [Bottom Info](https://tossmini-docs.toss.im/tds-mobile/components/bottom-info/)
- [Bottom Sheet](https://tossmini-docs.toss.im/tds-mobile/components/bottom-sheet/)
- [Bubble](https://tossmini-docs.toss.im/tds-mobile/components/bubble/)
- [Button](https://tossmini-docs.toss.im/tds-mobile/components/button/)
- [Checkbox](https://tossmini-docs.toss.im/tds-mobile/components/checkbox/)
- [Grid List](https://tossmini-docs.toss.im/tds-mobile/components/grid-list/)
- [Highlight](https://tossmini-docs.toss.im/tds-mobile/components/highlight/)
- [Icon Button](https://tossmini-docs.toss.im/tds-mobile/components/icon-button/)
- [List Footer](https://tossmini-docs.toss.im/tds-mobile/components/list-footer/)
- [List Header](https://tossmini-docs.toss.im/tds-mobile/components/list-header/)
- [Loader](https://tossmini-docs.toss.im/tds-mobile/components/loader/)
- [Menu](https://tossmini-docs.toss.im/tds-mobile/components/menu/)
- [Modal](https://tossmini-docs.toss.im/tds-mobile/components/modal/)
- [Numeric Spinner](https://tossmini-docs.toss.im/tds-mobile/components/numeric-spinner/)
- [Paragraph](https://tossmini-docs.toss.im/tds-mobile/components/paragraph/)
- [Post](https://tossmini-docs.toss.im/tds-mobile/components/post/)
- [Progress Bar](https://tossmini-docs.toss.im/tds-mobile/components/progress-bar/)
- [Progress Stepper](https://tossmini-docs.toss.im/tds-mobile/components/progress-stepper/)
- [Rating](https://tossmini-docs.toss.im/tds-mobile/components/rating/)
- [Result](https://tossmini-docs.toss.im/tds-mobile/components/result/)
- [Search Field](https://tossmini-docs.toss.im/tds-mobile/components/search-field/)
- [Segmented Control](https://tossmini-docs.toss.im/tds-mobile/components/segmented-control/)
- [Skeleton](https://tossmini-docs.toss.im/tds-mobile/components/skeleton/)
- [Slider](https://tossmini-docs.toss.im/tds-mobile/components/slider/)
- [Stepper](https://tossmini-docs.toss.im/tds-mobile/components/stepper/)
- [Switch](https://tossmini-docs.toss.im/tds-mobile/components/switch/)
- [Tab](https://tossmini-docs.toss.im/tds-mobile/components/tab/)
- [Table Row](https://tossmini-docs.toss.im/tds-mobile/components/table-row/)
- [Text Button](https://tossmini-docs.toss.im/tds-mobile/components/text-button/)
- [Toast](https://tossmini-docs.toss.im/tds-mobile/components/toast/)
- [Tooltip](https://tossmini-docs.toss.im/tds-mobile/components/tooltip/)
- [Top](https://tossmini-docs.toss.im/tds-mobile/components/top/)

---

# 8. TDS 공식 문서 — Agreement / Asset / Bottom CTA / Chart / Dialog

- [Agreement v4](https://tossmini-docs.toss.im/tds-mobile/components/Agreement/v4/)
- [Asset Frame](https://tossmini-docs.toss.im/tds-mobile/components/Asset/frame/)
- [Asset](https://tossmini-docs.toss.im/tds-mobile/components/Asset/asset/)
- [Bottom CTA Single](https://tossmini-docs.toss.im/tds-mobile/components/BottomCTA/Single/)
- [Bottom CTA Double](https://tossmini-docs.toss.im/tds-mobile/components/BottomCTA/Double/)
- [Fixed Bottom CTA](https://tossmini-docs.toss.im/tds-mobile/components/BottomCTA/fixed-bottom-cta/)
- [Bar Chart](https://tossmini-docs.toss.im/tds-mobile/components/Chart/bar-chart/)
- [Dialog](https://tossmini-docs.toss.im/tds-mobile/components/Dialog/dialog/)
- [Alert Dialog](https://tossmini-docs.toss.im/tds-mobile/components/Dialog/alert-dialog/)
- [Confirm Dialog](https://tossmini-docs.toss.im/tds-mobile/components/Dialog/confirm-dialog/)

---

# 9. TDS 공식 문서 — Keypad / ListRow / TextField / Overlay

- [Alphabet Keypad](https://tossmini-docs.toss.im/tds-mobile/components/Keypad/alphabet-keypad/)
- [Full Secure Keypad](https://tossmini-docs.toss.im/tds-mobile/components/Keypad/full-secure-keypad/)
- [Number Keypad](https://tossmini-docs.toss.im/tds-mobile/components/Keypad/number-keypad/)
- [ListRow Overview](https://tossmini-docs.toss.im/tds-mobile/components/ListRow/list-row-overview/)
- [ListRow Components](https://tossmini-docs.toss.im/tds-mobile/components/ListRow/list-row-components/)
- [TextField](https://tossmini-docs.toss.im/tds-mobile/components/TextField/text-field/)
- [Split TextField](https://tossmini-docs.toss.im/tds-mobile/components/TextField/split-text-field/)
- [Text Area](https://tossmini-docs.toss.im/tds-mobile/components/TextField/text-area/)
- [Overlay check-first](https://tossmini-docs.toss.im/tds-mobile/hooks/OverlayExtension/check-first/)
- [Overlay use-dialog](https://tossmini-docs.toss.im/tds-mobile/hooks/OverlayExtension/use-dialog/)
- [Overlay use-toast](https://tossmini-docs.toss.im/tds-mobile/hooks/OverlayExtension/use-toast/)
- [Overlay use-bottom-sheet](https://tossmini-docs.toss.im/tds-mobile/hooks/OverlayExtension/use-bottom-sheet/)

추가 공식 개발 문서:

- [Toss Developer Center](https://developers-apps-in-toss.toss.im/)

---

# 10. Mobile Component → Web 재해석

| Mobile Pattern | Desktop / Wide Tablet Web 재해석 |
|---|---|
| Bottom Sheet | Modal / Right Drawer / Popover 중 Context에 맞게 선택 |
| Fixed Bottom CTA | Content Action Bar / Sticky Local Action / Toolbar Action |
| Top Navigation | Page Header / Breadcrumb / Toolbar |
| ListRow / Board Row | List Row / Table Row / Master-Detail Row |
| Grid List | Tablet 2~3열 / Desktop Responsive Multi-column |
| Menu | Dropdown / Context Menu / Popover |
| Dialog | Center Dialog / Modal |
| Bottom Info | Inline Helper / Summary Area / Footer Information |
| Bubble | Hover/Focus Tooltip 또는 Contextual Help |
| Numeric Spinner / Slider | Inline Control + Keyboard 입력 고려 |
| Keypad | Desktop에서는 실제 Keyboard 입력 우선 |
| Agreement | Form Section / Accordion / Checkbox Group |
| Asset / Frame | Responsive Media / Preview 영역 |
| Bottom CTA Double | Content Action Bar의 주/보조 Action |

이 표는 **기본 재해석 방향**이다.

실제 화면에서는:

```text
Feature 목적
화면 폭
정보량
사용 빈도
작업 중요도
Overlay 필요성
```

을 함께 고려한다.

---

# 11. Desktop 원칙

Desktop은 주로 Admin Surface에 사용한다.

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

Admin 화면에서는 정보량이 많기 때문에:

```text
카드만 반복해서 세로로 쌓는 구조
```

보다:

```text
Table
List Row
Split View
Master-Detail
```

구조를 우선 검토한다.

---

# 12. Admin Desktop Layout

대표 구조:

```text
┌───────────┬────────────────────────────────────┐
│ Sidebar   │ Header                             │
│           ├────────────────────────────────────┤
│           │ Page Title / Toolbar               │
│           ├────────────────────────────────────┤
│           │ Search / Filter / KPI              │
│           ├────────────────────────────────────┤
│           │ Main Content                       │
│           │ Table / List / Split Pane          │
└───────────┴────────────────────────────────────┘
```

Admin에서 중요한 것은:

```text
빠르게 찾기
비교하기
검토하기
상태 파악하기
다음 Action 수행하기
```

이다.

장식보다 정보 위계를 우선한다.

---

# 13. Admin Feedback Review

Feedback Review는 Feature Spec의 Desktop 3-column 구조를 유지한다.

```text
LEFT
Submission / Activity Viewer

CENTER
AI Analysis

RIGHT
Staff Review
```

Wide Desktop에서만 3-column을 유지할 수 있다.

폭이 줄어들면:

```text
3-column
→ 2-column + Drawer
→ 1-column + Tab / Drawer
```

처럼 재배치할 수 있다.

단, 기능 순서와 정보 우선순위는 유지한다.

---

# 14. Tablet 원칙

Tablet은 Student / Mentor Hub / School 중심으로 사용한다.

주요 Pattern:

```text
2-column
Responsive Grid
Tab
Detail Panel
Drawer
```

특히 넓은 Tablet에서는:

```text
List + Detail
Card Grid + Detail
Main Content + Context Panel
```

구조를 적극적으로 사용할 수 있다.

---

# 15. Tablet 2-column 예시

```text
┌──────────────────────┬──────────────────────┐
│ Primary Content      │ Context / Detail     │
│                      │                      │
│ Task / Mentor List   │ Selected Detail      │
│ Content              │ Action               │
└──────────────────────┴──────────────────────┘
```

화면이 충분하지 않으면:

```text
Right Panel
→ Drawer
```

로 전환할 수 있다.

---

# 16. Mobile 원칙

Mobile에서는 일부 Student / Mentor 기능에서 TDS Mobile Pattern을 가장 직접적으로 사용할 수 있다.

예:

```text
List
Card
Tab
Bottom Sheet
Fixed CTA
Dialog
Toast
```

단, Mobile에서도 Feature Spec의 정보 우선순위를 유지한다.

Desktop 화면을 단순 축소하지 않는다.

---

# 17. Responsive 원칙

Responsive는 화면을 작게 줄이는 작업이 아니다.

각 Breakpoint에서 다음을 재구성한다.

```text
Navigation
Column 수
Information density
Overlay 방식
Action 위치
Table → List 전환
Detail 표시 방식
```

---

# 18. Breakpoint 값

이 문서에서는 Pixel Breakpoint 값을 임의로 확정하지 않는다.

이유:

```text
실제 Frontend Framework
기존 LearnersHigh Layout
Target Device
Tablet Mockup
Admin Desktop 환경
```

을 함께 확인해야 하기 때문이다.

Breakpoint 값은:

```text
frontend implementation
+ shared-conventions
```

단계에서 확정한다.

---

# 19. Layout 우선순위

화면을 구현할 때 다음 순서로 구조를 잡는다.

```text
1. Page 목적
2. Primary Action
3. 현재 상태 / Next Action
4. 주요 콘텐츠
5. Secondary Action
6. Metadata
7. Decorative Detail
```

Mockup에 있는 요소를 동일한 중요도로 취급하지 않는다.

---

# 20. 정보 위계

한 화면 안에서는 다음 계층을 구분한다.

```text
Page Title
Section Title
Primary Data
Supporting Data
Metadata
Helper
```

다음은 피한다.

```text
모든 Text가 같은 Weight
모든 Card가 같은 강조도
모든 Button이 Primary
모든 Badge가 강한 색상
```

---

# 21. Primary Action

한 Context에서 가장 중요한 Action은 명확하게 보여준다.

예:

```text
Task Overview
→ "지금 할 일"

Parent Report
→ Validation 통과 후 Generate / Send

Mentor Plan
→ 내 계획에 적용
```

동일 영역에서 Primary Button을 과도하게 여러 개 두지 않는다.

---

# 22. Secondary Action

덜 중요한 Action은:

```text
Text Button
Menu
Icon Button
Secondary Button
```

등으로 위계를 낮춘다.

삭제 / 위험 Action은 Primary와 시각적으로 혼동되지 않도록 한다.

---

# 23. Button 원칙

Button 구현 전 공식 TDS Button 문서를 확인한다.

반드시 고려:

```text
Variant
Size
Enabled
Disabled
Loading
Pressed
Focus
```

Button Text는 가능한 한 Action을 직접 설명한다.

좋은 예:

```text
주제 제출
피드백 전달
PDF 생성
내 계획에 추가
```

피해야 할 예:

```text
확인
진행
완료
```

Context 없이 의미가 모호한 Label.

---

# 24. Icon Button

Icon만 사용하는 경우:

```text
접근 가능한 이름
Tooltip 필요 여부
Focus 상태
Touch / Click Target
```

을 확인한다.

Icon만으로 의미가 불분명하면 Text Label을 함께 사용한다.

---

# 25. Search / Filter

Admin 화면은 Search / Filter가 핵심 Interaction이다.

원칙:

```text
Search와 Filter의 역할을 구분
현재 적용된 Filter가 보여야 함
Filter 변경 시 결과 상태가 명확해야 함
Empty Result를 일반 Empty State와 구분
```

가능하면 Filter를 Modal 깊숙이 숨기지 않는다.

Desktop에서는 Toolbar / Inline Filter를 우선 검토한다.

---

# 26. Tab

Tab은 서로 동등한 정보 범주를 전환할 때 사용한다.

예:

```text
Task Detail 7 Tabs
Student 360 Tabs
Mentor Content Tabs
```

Tab을 Page Navigation 대용으로 남용하지 않는다.

Detail 왕복 후:

```text
Selected Tab
Scroll
Context
```

를 유지해야 하는 Feature는 해당 상태를 보존한다.

---

# 27. Table / List

Desktop Admin:

```text
많은 학생
많은 Queue Item
비교가 필요한 정보
```

는 Table / Dense List를 우선한다.

Student / Mentor:

```text
콘텐츠 탐색
추천
경험 사례
```

는 Card / List Row가 더 적합할 수 있다.

---

# 28. Card

Card는 의미 있는 하나의 Entity / 콘텐츠 단위에 사용한다.

Card를 단순 장식 Border Box로 남용하지 않는다.

Card 안에서는:

```text
Entity Identity
핵심 상태
핵심 정보
Action
```

의 위계가 명확해야 한다.

---

# 29. Badge

Badge는 짧은 상태 / Category 표현에 사용한다.

예:

```text
Draft
Published
D-2
candidate
confirmed
Task
Growth Activity
```

Badge Color만으로 의미를 전달하지 않는다.

Text Label을 유지한다.

---

# 30. Status Color

Status 표현은 Color 단독에 의존하지 않는다.

```text
Color
+
Text
+
필요 시 Icon
```

조합을 사용한다.

예:

```text
"마감 임박"
"검토 대기"
"AI 분석 실패"
```

---

# 31. Form

Form에서는 다음을 명확히 구분한다.

```text
Label
Input
Helper
Validation
Required
Error
```

Placeholder만으로 Label을 대체하지 않는다.

---

# 32. TextField

공식 TDS TextField 문서를 확인한 뒤:

```text
Default
Focus
Filled
Disabled
Error
```

상태를 구현한다.

Error는 가능한 한 Input 가까이에 표시한다.

---

# 33. Text Area

Reflection, Feedback, Mentor Story 등 긴 입력에는 Text Area를 사용한다.

Student Reflection에서는 AI가 본문을 대신 작성하지 않는다는 Domain Guardrail을 UI에서도 유지한다.

AI 지원은:

```text
질문
누락 안내
구체화 안내
```

형태로 표현한다.

---

# 34. Modal

Desktop에서 짧고 집중된 작업에 사용한다.

적합:

```text
Confirm
짧은 Create
짧은 Edit
선택
```

피해야 할 것:

```text
긴 Detail 전체
복잡한 3-column 검토
긴 Scroll Form
```

---

# 35. Right Drawer

Desktop에서 현재 List Context를 유지한 채 Detail / Edit를 열 때 사용할 수 있다.

적합:

```text
Student Quick Detail
Queue Item Detail
Contextual Preview
Secondary Edit
```

Drawer를 열었을 때 Background Context를 잃지 않는다.

---

# 36. Bottom Sheet

Mobile에서는 Contextual Action / 선택 등에 사용할 수 있다.

Desktop에서는 기본적으로:

```text
Modal
Right Drawer
Popover
```

중 적합한 방식으로 변환한다.

Desktop에 Bottom Sheet를 그대로 재현하지 않는다.

---

# 37. Popover / Menu

짧은 Context Action에 사용한다.

예:

```text
더보기
Filter Option
Sort
Row Action
```

주요 Workflow 전체를 작은 Popover 안에 넣지 않는다.

---

# 38. Dialog

중요한 확인 / 경고 / 취소에 사용한다.

예:

```text
제출 취소
삭제 확인
동의 해제
```

Dialog 남용을 피한다.

단순 성공 알림은 Toast가 더 적합할 수 있다.

---

# 39. Toast

짧은 결과 Feedback에 사용한다.

예:

```text
저장되었습니다.
피드백을 전달했습니다.
계획에 추가했습니다.
```

사용자가 반드시 읽어야 하는 Error / Validation을 Toast만으로 표시하지 않는다.

---

# 40. Loading

핵심 화면은 필요한 경우 Loading State를 가진다.

지원 후보:

```text
Skeleton
Loader
Inline Loading
Button Loading
```

긴 화면 전체에 Spinner 하나만 표시하는 방식은 피한다.

---

# 41. Skeleton

콘텐츠 구조가 예측 가능한 경우 사용한다.

예:

```text
Mentor Card List
Task List
Student Row
Report Section
```

실제 Layout과 너무 다른 Skeleton을 만들지 않는다.

---

# 42. Empty State

Empty State는 최소한 다음 유형을 구분한다.

```text
실제 데이터 없음
검색 결과 없음
Filter 결과 없음
아직 생성하지 않음
권한 / 공개 대상 없음
```

모두 같은 "데이터가 없습니다"로 처리하지 않는다.

---

# 43. Error State

Error는 Empty와 구분한다.

가능하면:

```text
무엇이 실패했는지
사용자가 무엇을 할 수 있는지
Retry가 가능한지
```

를 표시한다.

예:

```text
AI 분석 실패
→ Retry

기존 Plan 연동 실패
→ 다시 시도
```

---

# 44. Disabled

Disabled에는 이유가 있어야 한다.

예:

```text
Parent Report Send Disabled
→ 감소 지표 대응 Plan 없음
```

가능하면 근처에 이유를 표시한다.

Disabled Button만 보여주고 이유를 숨기지 않는다.

---

# 45. Success

성공 이후:

```text
Toast
Inline State Update
Result
```

등 Context에 맞는 Feedback을 준다.

중복으로 Modal + Toast + Banner를 모두 사용하지 않는다.

---

# 46. Retry

Retry가 가능한 실패에는 Retry Action을 제공한다.

예:

```text
AI Analysis Failed
Integration Fetch Failed
Report Generate Failed
```

Retry 시 현재 Context를 가능한 한 유지한다.

---

# 47. 공통 상태

각 핵심 화면은 필요한 경우 다음 상태를 고려한다.

```text
Loading
Empty
Error
Disabled
Selected
Hover
Focus
Pressed
Success
Retry
```

모든 컴포넌트에 모든 상태를 억지로 만들라는 의미는 아니다.

해당 Interaction에 필요한 상태만 명시한다.

---

# 48. Hover

Desktop에서는 Hover를 지원할 수 있다.

하지만 Hover만으로 중요한 정보를 제공하지 않는다.

Touch Device에서도 기능을 사용할 수 있어야 한다.

---

# 49. Focus

Keyboard 사용자를 위해 Focus 상태가 시각적으로 명확해야 한다.

다음은 피한다.

```text
outline: none
```

후 대체 Focus 표시를 제공하지 않는 구현.

---

# 50. Pressed

Button / Interactive Row / Card는 Pressed Feedback을 제공할 수 있다.

Pressed가 Hover와 구분되지 않아도 기능상 문제는 없어야 하지만,
Interaction Feedback은 일관되게 구현한다.

---

# 51. Selected

Tab, Row, Filter, Card Selection은 선택 상태를 명확하게 표시한다.

Color만 사용하지 않는다.

예:

```text
Background
Border
Icon
Text Weight
```

등을 조합할 수 있다.

---

# 52. Theme

지원:

```text
Light
Dark
System
```

Theme 변경 시 다음 Context를 유지한다.

```text
Route
Scroll
Search
Filter
Selected Tab
Selected Student
Selected Task
Drawer
Modal
Draft
```

Theme 변경 때문에 작업 중 Draft가 사라지면 안 된다.

---

# 53. Theme Token

실제 Theme 값은:

```text
frontend/shared/theme/
```

에 공통 Token으로 구현한다.

Feature Component에서 Raw Color를 반복해서 직접 지정하지 않는다.

개념:

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

실제 Token Naming / 값은 TDS Foundation 확인 후 확정한다.

---

# 54. Dark Theme

Dark Theme은 단순히:

```text
white → black
black → white
```

변환이 아니다.

확인:

```text
Surface elevation
Border visibility
Text contrast
Status visibility
Disabled contrast
Overlay contrast
Chart readability
```

---

# 55. Print-friendly Theme

Parent Report PDF / Image는:

```text
Print-friendly Light Theme
```

을 사용한다.

App이 Dark Mode여도 출력물 Theme은 영향을 받지 않는다.

---

# 56. Typography

Typography는 TDS Typography 위계를 참고한다.

구분할 역할:

```text
Page Title
Section Title
Body
Supporting Text
Caption / Metadata
Button / Label
```

Feature마다 Font Size를 임의로 새로 만들지 않는다.

---

# 57. Typography Guardrail

피해야 할 것:

```text
모든 제목을 굵은 대형 Text로 표현
본문보다 Metadata가 더 강함
너무 많은 Weight 사용
너무 작은 보조 Text
```

한 화면 안에서 Typography 단계 수를 불필요하게 늘리지 않는다.

---

# 58. Color

Color는 다음 용도로 사용한다.

```text
Hierarchy
State
Feedback
Emphasis
Brand / Accent
```

장식 목적으로 과도한 색을 추가하지 않는다.

---

# 59. Semantic Color

상태 색상은 의미를 유지한다.

예:

```text
Success
Warning
Error
Information
Disabled
```

Feature마다 다른 의미로 같은 색상을 사용하지 않는다.

---

# 60. Spacing

Spacing은 공통 Scale을 사용한다.

Feature별로:

```text
13px
19px
27px
```

같은 임의 간격을 계속 추가하지 않는다.

실제 Scale은 Theme / Design Token 단계에서 확정한다.

---

# 61. Radius

Card / Button / Input / Modal의 Radius는
공통 Token을 우선 사용한다.

Mockup의 Radius를 Pixel 단위로 기계적으로 복제하지 않는다.

---

# 62. Border / Divider

Border는 정보 그룹을 구분하기 위해 필요한 경우 사용한다.

모든 Card에 강한 Border를 두지 않는다.

가능하면:

```text
Spacing
Surface
Typography
Divider
```

를 이용해 그룹을 구분한다.

---

# 63. Elevation / Shadow

Shadow는 Overlay / Floating Surface / 중요 Layer 구분에 제한적으로 사용한다.

모든 Card에 강한 Shadow를 적용하지 않는다.

---

# 64. Density

Surface에 따라 정보 밀도를 다르게 할 수 있다.

```text
Admin Desktop
→ High / Medium Density

Student Tablet
→ Medium Density

Mentor Content
→ Medium / Comfortable Density
```

하지만 같은 Component가 Surface별로 완전히 다른 제품처럼 보이지 않도록 한다.

---

# 65. Accessibility — Keyboard

Desktop Web에서 다음이 Keyboard로 가능해야 한다.

```text
Tab 이동
Button 실행
Input Focus
Dialog 닫기
Menu 이동
주요 Form Submit
```

Mouse만으로 가능한 핵심 기능을 만들지 않는다.

---

# 66. Accessibility — Focus Order

Focus 순서는 Visual Reading Order와 최대한 일치해야 한다.

Modal / Drawer가 열리면
Focus가 해당 Overlay Context로 이동해야 한다.

닫힌 후 원래 Trigger로 복귀하는 것을 우선한다.

---

# 67. Accessibility — Label

다음에는 접근 가능한 이름이 필요하다.

```text
Icon Button
Input
Checkbox
Switch
Search
Menu Trigger
Close Button
```

---

# 68. Accessibility — Color

상태를 Color만으로 전달하지 않는다.

예:

```text
빨간 점만 표시 X

"마감 임박" + 색상
```

---

# 69. Accessibility — Motion

Animation은 정보를 이해하는 데 도움을 주는 수준으로 사용한다.

과도한:

```text
Bounce
Parallax
Repeated Motion
```

을 핵심 학습/관리 화면에 사용하지 않는다.

---

# 70. Accessibility — Responsive Zoom

Desktop / Tablet Browser 확대 시
핵심 Action이 잘리거나 접근 불가능해지지 않도록 한다.

---

# 71. Data Visualization

Chart를 사용할 경우:

```text
숫자 의미
기간
단위
비교 기준
```

을 명확히 표시한다.

색상만으로 Series를 구분하지 않는다.

---

# 72. KPI

KPI는 큰 숫자를 보여주는 것 자체가 목적이 아니다.

Admin Dashboard KPI는:

```text
실제 Action 필요성
운영 병목
학생 변화
```

를 빠르게 파악하게 해야 한다.

예:

```text
Feedback Pending
마감 임박
수정 미반영
Parent Report 미발송
```

---

# 73. Student 변화 표현

좋은 예:

```text
최근 2주 Plan 84% → 58%
영어 87 → 81
모의 수학 3 → 2등급
수행평가 D-2
```

피해야 할 예:

```text
앱 접속 12회
카드 클릭 28회
화면 조회 43회
```

서비스 내부 사용량을 핵심 관리 지표처럼 강조하지 않는다.

---

# 74. Mentor Recommendation UI

추천 Home은 단순 Feed가 아니다.

추천 Mentor에서는:

```text
Mentor Identity
대학·학과
전형
추천 이유
고교 Context
대표 경험
관련 Content
Tag
Profile CTA
```

정보 위계를 명확하게 한다.

추천 이유는 대학 순위보다 Student Context와 Mentor 경험 적합성을 보여준다.

---

# 75. School Task UI

Task Detail에서는 Overview의 핵심이:

```text
지금 할 일
```

이다.

다음 정보가 우선한다.

```text
현재 단계
현재 상태
다음 Action
Primary CTA
```

다른 Tab에서는 Compact Status로 줄일 수 있다.

---

# 76. Feedback UI

Student:

```text
Teacher / Staff Feedback = Primary
AI Feedback = Secondary
```

Admin:

```text
Submission
AI Analysis
Staff Review
```

세 정보 영역의 역할을 시각적으로 구분한다.

AI 결과를 최종 판정처럼 강조하지 않는다.

---

# 77. AI UI

AI 표시는 다음 역할을 명확히 한다.

```text
Analysis
Suggestion
Draft
Candidate
```

피해야 할 표현:

```text
AI 정답
AI 최종 판정
자동 확정
```

Human Review가 필요한 Feature에서는 Review 상태를 보여준다.

---

# 78. Parent Report UI

Parent Report Editor는 Desktop에서:

```text
LEFT
Content Editor

RIGHT
PDF / Image Preview
```

구조를 우선한다.

Preview는 편집 내용이 즉시 반영되는 방향을 유지한다.

---

# 79. Validation UI

발송 불가 상태에서는 이유를 명확하게 보여준다.

예:

```text
Send Disabled

이유:
- 감소 지표 대응 Plan 없음
- candidate Record가 확정 정보처럼 포함됨
- Student Artifact 동의 없음
```

단순히 Button만 Disable하지 않는다.

---

# 80. Privacy UI

Mentor Surface에서 Student는 익명 Context로 표시한다.

예:

```text
고2 · 화학공학 관심
```

금지:

```text
실명
학교
기관
상세 학습관리 정보
```

---

# 81. Record / Case Privacy

Record / Case 공개 전:

```text
PII Detection
→ Admin Review
→ Published
```

상태를 UI에서 구분할 수 있어야 한다.

검수 대기 콘텐츠를 Student에게 Published 콘텐츠처럼 보여주지 않는다.

---

# 82. Destructive Action

삭제 / 공유 동의 해제 / 제출 취소 등은
오동작 위험을 고려한다.

필요한 경우:

```text
Confirm Dialog
```

를 사용한다.

단순 Navigation 이동에는 Confirm을 남용하지 않는다.

---

# 83. Back Context

Detail 왕복 후 필요한 Context를 유지한다.

예:

```text
Search
Filter
Selected Tab
Scroll
Selected Student
Selected Task
Selected Version Pair
```

Feature Spec에서 유지 요구가 있는 항목은 반드시 보존한다.

---

# 84. Draft Preservation

다음과 같은 작성 화면에서는 Draft 보존을 고려한다.

```text
Mentor Create Post
Student Activity
Reflection
Parent Report Editor
```

Back / Theme 변경 등 UI 변화로 Draft가 사라지지 않게 한다.

---

# 85. Interaction 명세

모든 핵심 화면은 다음 6개 항목을 기준으로 Interaction을 확인한다.

| 항목 | 의미 |
|---|---|
| 진입 경로 | 어디에서 진입하는가 |
| 클릭 요소 | 어떤 Button / Row / Card / Tab을 누르는가 |
| 결과 | 클릭 후 어떤 UI / State 변화가 발생하는가 |
| 다음 화면 | Page / Drawer / Modal / Detail 등 |
| 데이터 변화 | 어떤 Entity / State가 갱신되는가 |
| 뒤로가기 | 어떤 Context를 유지하는가 |

Mockup만 보고 Interaction을 추측하지 않는다.

---

# 86. Overlay 선택 기준

Overlay를 선택할 때:

```text
정보량
작업 길이
원래 Context 유지 필요성
화면 크기
되돌아가기 필요성
```

을 고려한다.

간단 기준:

```text
짧은 Confirm
→ Dialog

작은 선택
→ Popover / Menu

Desktop Context Detail
→ Drawer

복잡한 별도 작업
→ Page

Mobile Contextual Action
→ Bottom Sheet
```

---

# 87. Table → Mobile 변환

Desktop Table을 Mobile에서 그대로 가로 Scroll시키는 것을 기본 해법으로 사용하지 않는다.

대신:

```text
중요 Column 우선
Card / List Row
Detail Drill-down
```

으로 재구성한다.

정말 비교가 필요한 Table만 Horizontal Scroll을 검토한다.

---

# 88. Master-Detail

Admin Desktop에서:

```text
List / Queue
+
Detail
```

이 반복되는 기능은 Master-Detail을 우선 검토한다.

예:

```text
Feedback Queue
Student List
Report List
```

---

# 89. Content Width

긴 본문 입력 / 읽기 화면에서는
Desktop 전체 폭을 Text로 채우지 않는다.

예:

```text
Story
Reflection
Feedback Text
Report Comment
```

는 읽기 편한 Content Width를 유지한다.

구체 Pixel 값은 공통 Token 단계에서 확정한다.

---

# 90. Image / Media

Asset / Frame 원칙을 참고해:

```text
Preview
Responsive Media
Aspect Ratio
Loading
Error
```

를 고려한다.

이미지가 UI를 밀어내거나 Layout Shift를 크게 만들지 않게 한다.

---

# 91. Long Text

긴 Text는 무조건 말줄임하지 않는다.

Context에 따라:

```text
List
→ 요약 / line clamp

Detail
→ 전체 Text

Tooltip
→ 보조 설명
```

형태로 구분한다.

---

# 92. Empty / Error Copy

메시지는 사용자가 다음 행동을 알 수 있게 작성한다.

좋은 예:

```text
아직 등록된 Evidence가 없습니다.
자료를 추가하면 조사 단계 진행에 반영됩니다.
[자료 추가]
```

피해야 할 예:

```text
No Data
Error
```

---

# 93. Loading Copy

긴 처리에는 현재 작업을 알릴 수 있다.

예:

```text
AI 분석 중
PDF 생성 중
```

사용자가 같은 Action을 반복 실행하지 않도록 Button Loading / Disabled를 함께 고려한다.

---

# 94. Feature-local 디자인 생성 금지

Feature마다 독자적인:

```text
Button
Modal
Toast
Badge
Input
Theme
Spacing scale
```

을 만들지 않는다.

먼저:

```text
frontend/shared/ui
frontend/shared/theme
```

의 공통 구현을 확인한다.

---

# 95. Shared UI 승격 기준

Feature Component를 Shared UI로 올리기 전:

```text
2개 이상 Feature/Surface에서 실제 재사용되는가?
Business Logic이 제거되어 있는가?
API가 안정적인가?
```

를 확인한다.

---

# 96. Mockup 역할

Claude Design Mockup은 다음을 확인하는 용도다.

```text
Layout
Section 순서
Card / Table 배치
CTA 위치
Tab 구성
Detail 관계
정보 밀도
```

Mockup만 보고 다음을 만들지 않는다.

```text
Entity
API
Permission
State Transition
새로운 Business Rule
```

---

# 97. Mockup 경로

현재 주요 Reference:

```text
references/claude-design-mockup/
├─ MentorHub/
├─ School&Admissions/
└─ AdminStudentManagement/
```

Feature Spec에 명시된 정확한 이미지 경로를 우선 사용한다.

---

# 98. 기존 화면 Reference 역할

기존 LearnersHigh Reference:

```text
docs/product/existing-runners-high-analysis.md

references/existing-runners-high/
├─ source/
└─ screens/
```

참고 대상:

```text
Navigation
Sidebar
Header
Entry Point
Existing Interaction
Information Context
```

Visual Style의 직접 복제 기준은 아니다.

---

# 99. 구현 전 Visual Checklist

```text
[ ] 관련 Feature Spec을 읽었는가?
[ ] 관련 Mockup을 확인했는가?
[ ] 기존 LearnersHigh Entry / Context를 확인했는가?
[ ] 필요한 TDS Component 공식 문서를 확인했는가?
[ ] Mobile Pattern을 Web에 그대로 복사하고 있지 않은가?
[ ] Primary Action이 명확한가?
[ ] Loading / Empty / Error가 있는가?
[ ] Disabled 이유가 필요한가?
[ ] Keyboard Focus가 가능한가?
[ ] Color 외에도 상태 정보가 있는가?
[ ] Tablet / Desktop 재배치를 고려했는가?
[ ] Back Context를 유지하는가?
[ ] Privacy 정보가 Surface 경계를 넘지 않는가?
```

---

# 100. Visual QA Checklist

화면 구현 후:

```text
[ ] Mockup의 핵심 Layout과 정보 순서가 유지되는가?
[ ] Feature Spec의 핵심 Interaction이 모두 가능한가?
[ ] Desktop에서 불필요한 Mobile Pattern이 남아 있지 않은가?
[ ] Tablet에서 2-column / Drawer 전환이 자연스러운가?
[ ] Mobile에서 핵심 Action이 가려지지 않는가?
[ ] Light / Dark에서 Text와 상태가 읽히는가?
[ ] Loading / Empty / Error가 깨지지 않는가?
[ ] 긴 Text와 긴 파일명이 Layout을 깨지 않는가?
[ ] Hover 없이도 기능 사용이 가능한가?
[ ] Keyboard Focus가 보이는가?
[ ] Theme 변경 후 Route / Draft / Selected State가 유지되는가?
```

---

# 101. 금지 사항

```text
- TDS Mobile 화면을 Web에 그대로 복사
- 기존 LearnersHigh 화면 전체 리디자인
- Mockup만 보고 Business Logic 생성
- Feature별 독립 Theme 생성
- Feature별 Button / Modal / Toast를 중복 구현
- Color만으로 상태 표현
- 모든 Action을 Primary Button으로 표현
- 모든 콘텐츠를 Card로 감싸기
- Desktop Table을 무조건 Mobile 가로 Scroll로 처리
- Error를 Empty처럼 처리
- Disabled 이유를 숨김
- AI Output을 최종 판단처럼 표현
- Student/Parent/Mentor Privacy Boundary를 Visual 편의로 무시
```

---

# 102. 문서 유지 규칙

이 문서에는 다음을 넣는다.

```text
TDS 공식 URL
TDS → Web 재해석 원칙
Responsive 원칙
Theme / State / Accessibility 기준
공통 Visual Guardrail
```

Feature별 구체 UI는 각 Feature Spec과 Mockup에서 관리한다.

같은 내용을 Feature Spec마다 복사하지 않는다.

---

# 103. TDS 문서가 변경된 경우

TDS 공식 문서가 바뀌었다고 해서
자동으로 기존 구현 전체를 변경하지 않는다.

다음 순서로 검토한다.

```text
1. 변경된 TDS Component 확인
2. 현재 Extension 구현과 영향 비교
3. 실제 개선 필요 여부 판단
4. Shared UI 영향 확인
5. 필요 시 구현 수정
```

---

# 104. 핵심 요약

```text
TDS
→ 디자인 철학 / 위계 / Component / State / Feedback / Accessibility

Claude Design Mockup
→ 신규 화면의 Layout

Existing LearnersHigh Reference
→ 기존 Context / IA / Navigation / Interaction

Feature Spec
→ 무엇이 어떻게 동작하는지
```

Mobile → Web 변환:

```text
Bottom Sheet
→ Modal / Drawer / Popover

Fixed Bottom CTA
→ Action Bar / Sticky Action / Toolbar

Top Navigation
→ Header / Breadcrumb / Toolbar

ListRow
→ List / Table / Master-Detail

Grid
→ Responsive Multi-column
```

Surface:

```text
Admin
→ Desktop / Dense / Table / Split Pane 중심

Student
→ Tablet / Responsive / Task 중심

Mentor
→ Tablet / Mobile / Content 중심
```

가장 중요한 원칙:

```text
TDS를 그대로 복사하지 않는다.
TDS의 원칙을 LearnersHigh Web Context에 맞게 재해석한다.

기존 화면은 Context를 유지하는 기준이고,
신규 Visual은 TDS + Mockup을 기준으로 한다.

화면이 예쁜 것보다
정보 위계, 상태, Interaction, 접근성, 데이터 일관성이 먼저다.
```
