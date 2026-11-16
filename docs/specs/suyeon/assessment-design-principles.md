# LearnersHigh Assessment Design Principles

> 위치: `docs/specs/suyeon/assessment-design-principles.md`
> 상태: **ACTIVE (Suyeon 범위)**. 2026-10-26 사용자 확정 방향을 기록한다.
> 적용: 신규 Assessment Student / Admin 화면 전체 (`frontend/{student,admin}/src/features/assessment/**`).
> 기능·데이터 규칙은 Feature Spec / `domain.md` / `api-contract.md`가 우선한다. 이 문서는 **시각 구현 기준**만 정한다.
> Shared 문서 `docs/SOURCE_OF_TRUTH.md` §4-4는 아직 "시각 톤 = Daglo"로 적혀 있다. 일치 패치는 `harness-change-proposals.md` P-14 (승인 대기).

## 1. 확정 방향

> LearnersHigh Assessment는 Daglo 디자인을 참고하여 제작된 Claude Design Mockup을 직접적인 화면 구현 기준으로 사용한다.
> Mockup을 최대한 정확하게 재현하며, 세부 디자인이 불명확한 경우 Daglo Reference를 참고한다.
> 신규 Assessment에는 TDS 스타일을 혼합하지 않는다.

## 2. 원칙

1. Claude Design Mockup(`references/claude-design-mockup/LearnersHighAssessment/`)은 Assessment의 **직접적인 시각 구현 기준**이다. Layout뿐 아니라 색상·Typography·Spacing·Radius·Icon·상태 표현까지 포함한다.
2. Mockup은 Daglo 서비스를 참고해 만들어졌다. 따라서 Daglo Reference(`references/design/daglo/`)를 함께 쓴다. 두 Reference는 경쟁하는 기준이 아니다.
3. Daglo는 디자인 스타일과 세부 UX 패턴(Hover·Focus·Selected, Drawer, Popover 등)을 **보완**하는 참고 자료다.
4. Mockup에 명확히 표현된 디자인은 다른 스타일로 재해석하지 않고 그대로 구현한다.
5. Mockup에 없는 세부 표현만 Daglo를 참고한다. Daglo에 있다는 이유만으로 Mockup에 없는 Component를 추가하지 않는다.
6. TDS 디자인 Token·Button·Input·Card·Typography·Spacing을 신규 Assessment에 섞지 않는다. 기존 TDS 문서·코드는 삭제·수정하지 않는다 (TDS 제외는 신규 Assessment 시각 디자인에 한정).
7. 기존 LearnersHigh 상단 Navigation, Admin Shell, Wangyu Student Care UI는 보존한다.
8. 모든 주요 화면은 실제 Mockup PNG를 열어 분석한 뒤 구현한다. 파일명·문서 설명으로 디자인을 추측하지 않는다.
9. 구현 후 실제 브라우저 캡처를 Mockup과 같은 배율로 비교하고 차이를 수정한다 (§5).
10. 공통 Component를 재사용하더라도 최종 화면은 Mockup과 일치해야 한다.
11. Feature Spec과 API Contract의 기능·데이터 규칙은 유지한다. Mockup과 충돌하면 기능 규칙을 지키고 차이를 `assessment-screen-map.md` §3에 기록한다.
12. 새 Assessment 화면(Student·Admin)도 같은 기준과 Token을 쓴다.

Daglo의 로고·브랜드명·제품 기능을 복제하지 않는다. Mockup·Daglo 모두 Business Rule의 근거가 아니다.

## 3. Design Token (Student 구현: `frontend/student/src/features/assessment/styles/assessmentTheme.css`)

값은 Mockup PNG 픽셀을 측정해 정했다 (2026-10-26, Student SA-LIST·SAI·SA-DETAIL). Mockup 캡처 배율은 **1920 CSS px @ DPR 1.5**다 (원본 약 2880px).
적용 범위는 `.lh-assessment` 하위뿐이다. 전역 `body`/`button`/`input`과 `index.css`의 `--lh-color-*`(TDS 의미 기반 Token)는 바꾸지 않고, Assessment 코드에서 참조하지 않는다.

| 분류 | Token | 값 | Mockup 근거 |
|---|---|---|---|
| 글꼴 | `--as-font` | Pretendard 우선 | Mockup 글꼴 |
| 글자 | `--as-color-text` | `#1d1f23` | 제목·본문·선택 탭 |
| 글자 | `--as-color-text-secondary` | `#72777f` | 학기 표기, 완료 제목, 속성 라벨 |
| 글자 | `--as-color-text-tertiary` | `#999da3` | 행 메타, 표 Header, 건수, 안내 |
| 글자 | `--as-color-placeholder` | `#c1c3c9` | Placeholder, 비활성 버튼 글자 |
| 선 | `--as-color-line` | `#eaebef` | 모든 Border·Divider |
| 면 | `--as-color-subtle` | `#f8f9fb` | 검색창, 상세 상단 바 |
| 면 | `--as-color-fill` | `#f3f4f7` | 회색 Badge, Hover |
| 면 | `--as-color-active` | `#eaebef` | 선택된 Sidebar 메뉴, 비활성 버튼 배경 |
| 강조 | `--as-color-primary` | `#216cf8` | 주 버튼, D-day, 진행 중 점, 필수 별표 |
| 강조 | `--as-color-ink` | `#1d1f23` | 선택된 상태 탭(Pill) |
| 상태 | `--as-color-danger` | `#f44136` | 임박 D-day, 오류 |
| 상태 | `--as-color-success` / `-soft` / `-text` | `#14b8a6` / `#e5f5f2` / `#0b6e63` | 완료 점, 초록 출처 Badge |
| 상태 | `--as-color-warning-soft` / `-text` | `#fff3d1` / `#935500` | 확인 필요 Badge |
| 상태 | `--as-color-idle` | `#b8bbc2` | 시작 전 점 |
| 기타 | `--as-color-backdrop` | 검정 50% | Modal 배경 |

크기 (CSS px): Sidebar 213 · 본문 978 (좌측 여백 36) · 페이지 제목 21 Bold · 행 제목 14 Regular · 메뉴·버튼 13 · 메타 12 · Badge 11 · 상세 제목 28 Bold · Modal 제목 19 Bold.
Radius: Badge 5 · 메뉴·입력·버튼 7 · 카드·학기 선택 10 · 큰 카드 14 · Modal 16 · 탭·Chip Pill.

Dark Mode는 Mockup에 없다. 같은 위계를 유지하는 보정값을 Token에서만 정의한다.

## 4. Component 기준 (실측)

| Component | 기준 |
|---|---|
| Sidebar 메뉴 | 높이 37, 간격 2, 아이콘 17, 선택 시 `#eaebef` 배경 + 600 |
| 학기 선택 | 높이 47, Radius 10, 아이콘 상자 28 회색 / Dropdown은 같은 폭 Popover |
| 검색창 | 266×35, `#f8f9fb` 채움, 테두리 없음 (Daglo 검색창 패턴) |
| 주/보조 버튼 | 높이 34, Radius 7, 13 SemiBold / 보조는 흰 바탕 + `#eaebef` |
| 상태 탭 | 높이 30 Pill, 선택 시 `#1d1f23` 채움 |
| 목록 행 | 높이 67, **구분선 없음**(Daglo 목록), Hover 시 `#f8f9fb` 둥근 배경, 열: 54 / 제목 / 124 / 128 / 115 / 58 |
| 상태 Select | 점 7 + 72×29 Select, 굵은 검정 Chevron |
| 출처 Badge | 높이 22, Radius 5, 11 SemiBold |
| 다가오는 일정 카드 | 236×57, D-day 열 75 + 세로 구분선. **상태 탭 선택 시 숨김**(SA-LIST-05~07) |
| Modal | 폭 570, Radius 16, 좌우 36, 입력 40, Chip 33 Pill, 저장 비활성 `#eaebef`/`#c1c3c9` |
| 학교·학업 카드 | 폭 605, Radius 14, 필드 상자 3열 39, Chip 30, 버튼 29 |
| 상세 | 상단 바 43 `#f8f9fb`, 가운데 열 586, 속성 행 34(아이콘 15 + 라벨 13 회색), 오른쪽 패널 372 |

Mockup에 없는 상태(Hover·Focus·선택 Chip·Drawer·Toast·Empty/Error)는 Daglo 패턴과 위 Token으로 표현한다.

## 5. 시각 검증 절차

1. 대응 Mockup PNG를 연다.
2. 같은 UI 상태의 앱을 **1920×972 @ DPR 1.5**로 캡처한다.
3. 같은 영역을 잘라 위아래로 붙여 비교한다. 기존 상단 Navigation 높이가 다르므로(실제 50px, Mockup 43px) 세로 7px(원본 11px)을 보정한다.
4. 글자 크기는 같은 문구의 렌더링 폭을 Mockup 폭과 비교해 보정한다 (Pretendard가 같으므로 비율이 유효).
5. 색상은 Mockup 픽셀을 샘플링해 Token과 대조한다.
6. 차이를 수정하고 다시 캡처한다. 남은 차이는 원인(계약 없음, 기존 Shell, 의도적 차이)과 함께 기록한다.
7. 픽셀 일치율은 완료 조건이 아니다 (`assessment-frontend-quality.md`).

## 6. 변경 이력

| 날짜 | 내용 |
|---|---|
| 2026-10-26 | 최초 작성. Student 1차 화면 실측 Token·Component 기준 기록 |
