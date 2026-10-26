# Assessment Frontend 품질 기준 (Stage 1)

> 위치: `docs/specs/suyeon/assessment-frontend-quality.md`
> 상태: **DRAFT.** 신규 Assessment Frontend의 Stage 1(Contract 기반 Mock) 완료 판단 기준이다. 공통 Test 원칙은 `.claude/rules/testing.md`를 따른다.
> **새 Test Framework를 도입하지 않는다.** 자동 UI 검증은 기존 Playwright(`e2e/`, ADR-0007 Proposed) 자산을 우선 사용한다. `e2e/` 설정 변경은 Shared 영역이므로 `harness-change-proposals.md`의 승인 후 적용한다.

## 1. 단계별 기준 (L1~L6)

| 레벨 | 무엇을 | 어떻게 | 통과 조건 |
|---|---|---|---|
| L1 정적 | Typecheck, Lint, Build | `frontend/`에서 `npm run typecheck`, `npm run lint`, `npm run build` (또는 `scripts/verify-frontend.ps1`) | 전부 성공. 경고도 실패로 처리 (`oxlint --deny-warnings`) |
| L2 상태 | 화면별 Default / Loading / Empty / Search·Filter Empty / Error / Retry / Disabled(사유) / Validation / Selected·Active | Mock 시나리오(`assessment-frontend-mock.md` §7)로 재현 | `assessment-screen-map.md`의 각 화면에 대해 상태 체크리스트 기록. Empty와 Error가 시각·문구로 구분됨 |
| L3 Interaction·Navigation | 메뉴 이동, 목록 → 상세 → 뒤로(검색·필터·스크롤 복원), 탭, 모달 열기·닫기(Esc, Focus 복귀), 폼 검증, 중복 제출 방지 | Playwright, Mock 모드 대상 (Shared 승인 후). 승인 전에는 수동 Checklist로 기록 | 핵심 Flow 시나리오가 결정적으로 통과 |
| L4 시각 비교 | Mockup 대비 Layout · Typography · Spacing · Component 상태 · 색·아이콘 위계 | §2 절차 | 차이 목록이 기록되고, Blocking 차이가 0 |
| L5 반응형·접근성 | Tablet 폭, 긴 텍스트·파일명, 키보드만으로 조작, Focus 표시, ARIA 역할·이름, 색 대비 | 수동 Checklist + Playwright 키보드 시나리오 | Checklist 전 항목 통과 또는 사유 기록 |
| L6 회귀 | 기존 Student 상단 Nav, Admin Shell, **Wangyu Student Care E2E** | `e2e/` 기존 Student Care Spec (Backend e2e Profile + Admin preview 필요, `README.md` §22) | Admin Shell·공통 CSS를 건드린 변경은 Student Care E2E 7개 전부 통과 필수 |

Stage 1 완료 = 대상 화면이 L1~L5를 충족하고, Admin Shell을 바꾼 경우 L6까지 충족한 상태다. **Stage 1 완료는 기능 `VERIFIED`가 아니다** (`CLAUDE.md` §18).

## 2. Mockup 시각 비교 절차

### 2-1. 기준 해상도

- Mockup PNG는 약 2880×1446~1468px이다 (2026-10-26, 83개 파일 확인). 첫 구현에서 글자·간격을 실측한 결과 **CSS Viewport 1920×약 972, deviceScaleFactor 1.5** 캡처로 본다 (이전 "1440 @ DPR 2" 판단은 정정).
- 기존 E2E 설정의 Desktop Viewport는 1440 폭이다 (`e2e/playwright.config.ts`). 시각 비교 캡처는 Mockup과 같은 1920×972 @1.5로 따로 찍는다.
- 스크롤 변형 Mockup(`*-Scroll*`, `*_02-Scrolled` 등)은 같은 Viewport에서 해당 위치로 스크롤한 상태와 비교한다.

### 2-2. 캡처와 비교

1. Mock 모드에서 해당 시나리오를 로드한다 (Mockup과 같은 데이터 상태).
2. 1920×972, DPR 1.5로 캡처한다. 시연 배지를 숨긴 경우 그 사실을 기록한다.
3. Mockup과 나란히 놓고 아래 항목을 판정한다. **픽셀 일치율을 완료 조건으로 쓰지 않는다.**

| 항목 | 확인 내용 | Blocking 기준 |
|---|---|---|
| Layout | 영역 구분(Sidebar · 본문 · 우측 패널), 폭 비율, 정렬선, Section 순서 | 영역 누락·순서 변경 |
| Typography | 위계(제목 / 본문 / 보조), 크기·굵기·행간의 상대 관계 | 위계 역전 |
| Spacing | 카드·목록·Form의 간격 리듬 | 일관성 붕괴(같은 Component 간격이 화면마다 다름) |
| Component 상태 | Default / Hover / Focus / Active / Disabled / Selected 표현 | 상태 구분 불가 |
| 색·아이콘 | 강조색 사용 위치, 상태 배지 색 의미 | 의미가 다른 상태가 같은 색 |
| 문구 | 버튼·상태 문구 | Spec과 의미가 다른 문구 (MM 항목 결정 반영) |

4. 결과를 `progress.md`의 Visual QA 기록에 남긴다: 화면 ID, Mockup 파일, 캡처 경로, Blocking / Non-blocking 차이, 의도적 차이(Spec 우선·계약 없음 등)와 근거.

### 2-3. 기준 우선순위

`assessment-design-principles.md`를 따른다. Layout과 시각 스타일(색상·Typography·Spacing)은 Claude Design Mockup이 직접 기준이고, Mockup에 없는 세부 표현만 Daglo로 보완하며, 기능·상태는 Spec/Domain/Contract가 우선한다. (`SOURCE_OF_TRUTH.md` §4-4의 "시각 톤 = Daglo" 표현은 P-14로 정정 제안 중) Mockup과 Spec이 충돌하면 Spec을 따르고 `assessment-screen-map.md` §3에 기록한다.

## 3. 공통 Component 일관성

- 같은 역할의 UI(버튼, 입력, 드롭다운, 탭, 모달, Toast, 표, 상태 배지, Empty / Error 블록)는 Assessment Feature 안에서 **하나의 구현**을 재사용한다.
- Assessment 시각 Token(색 · 글꼴 크기 · 간격 · 반경 · 그림자)은 Assessment 범위에 둔다. 기존 `docs/design/tds-web-guidelines.md`, `docs/design/student-care-ux.md`, Admin `app/theme.css`(Wangyu Token)는 변경하지 않는다.
- 두 Surface에서 같은 Component가 필요해지면 `assessment-frontend-mock.md` §4-2의 공유 위치 승인 절차를 따른다.

## 4. 현재 실행 가능 여부 (2026-10-26)

| 레벨 | 실행 가능 | 비고 |
|---|---|---|
| L1 | 가능 | 기존 workspace script |
| L2 | Assessment 코드 작성 후 | Mock 시나리오 필요 |
| L3 | 수동 가능 / 자동은 승인 후 | 현재 `e2e/`는 Admin preview + Backend 전제. Mock 모드 Student 대상 설정 없음 |
| L4 | 수동 가능 | 캡처 자동화는 L3와 같은 승인 필요 |
| L5 | 수동 가능 | |
| L6 | 가능 (환경 필요) | Docker MySQL / Backend e2e Profile |

## 부록. 화면별 검증 기록

| 날짜 | 화면 | 시각 비교 (1920×972 @1.5) | Interaction | 비고 |
|---|---|---|---|---|
| 2026-10-26 | S1~S4·S6 목록·학업 정보·추가 Modal | SA-LIST-01·03·04·05~07, SA-SUB-02, SAI-01·02 | Scratchpad Playwright 52건 중 51 PASS (favicon 404) | Token 실측 반영 |
| 2026-10-26 | S7~S13 상세 (본문·결과물·노트·패널·Modal) | SA-DETAIL-01·02·07·09·10·12·13·14, SN-DETAIL-01, SN-TEMPLATE-01 | Scratchpad Playwright 45건 PASS | 계약 밖 요소는 MM-18~23으로 기록, Stage 1 ≠ VERIFIED |
| 2026-10-26 | S15 선생님 피드백 목록·요청 당시 자료 Modal | TF-LIST-01·02·03 | Scratchpad Playwright 32건 PASS (필터·URL 유지·Snapshot 불변·상세 왕복·Empty/Error/Retry/Loading·키보드·390/1024px), 상세 45건·목록 51/52(favicon 404) 회귀 | 상세 피드백 요청이 결과 파일 목록 로딩 전에 파일 없이 전송되던 문제 수정. 계약 밖 요소 MM-24·25, Stage 1 ≠ VERIFIED |
