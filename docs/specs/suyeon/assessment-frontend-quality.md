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
| 2026-10-26 | S16~S20 심화 탐구 (라이브러리·Preview·만들기·내 탐구·상세·모의고사·대학 자료) | AE-LIST-01~03, AE-MY-01, AE-DETAIL-01~05, AE-MOCK-01~03, AE-UNI-01 | Scratchpad Playwright 65건 PASS (선택·Preview 동기화·빠른 연속 선택·필터 후 선택 해제·시작 중복 방지·실패 재시도·직접 생성 Validation/닫기 확인·상태/연결 변경·출처 연결·개인 지문 등록·Empty/Error/Loading·1024/820/390px), Stage 1 회귀 45 / 32 / 51·52(favicon) | 계약 밖 요소 MM-26~29, sourceReference는 DRAFT Mock. Stage 1 ≠ VERIFIED |
| 2026-10-27 | S21 자료함 (목록·추천 자료원·추가 Modal·상세·수정) | RL-LIST-01·02, RL-ADD-01 | Scratchpad Playwright 43건 PASS (필터·검색·조건 초기화·상세 왕복 복원·추천 자료원·추가 Validation/중복 방지/실패 재시도/닫기 확인/Focus 복귀·수정 저장/실패·Empty/Error/Retry/Loading·심화 탐구 자료 탭 왕복·1024/820/390px), 회귀 65 / 32 / 45 / 51·52(favicon) | 남은 차이(통합 디자인 단계로 이관): 행별 연결된 수행평가 열 없음(MM-30), 검색창 추가(Mockup 없음), Badge 문구 "출처 정보 입력됨"(MM-32), AI 요약·노트에 추가 비활성, 추천 자료원 Chip 아이콘 없음, 상세 화면은 Mockup 없음. Stage 1 ≠ VERIFIED |
| 2026-10-27 | S8·S9 탐구 노트 편집기·Revision (학교 수행평가·심화 탐구) | SN-DETAIL-01, SN-TEMPLATE-01, AE-DETAIL-01·04 | Scratchpad Playwright 51건 PASS (자동 저장→Revision 증가·과거 Revision 불변·복원 비활성·피드백 Snapshot 불변·저장 전 요청 차단·새 노트 생성·블록 추가/"/" 전환/이동/삭제·표·체크리스트·템플릿 끝에 추가/확인 후 교체/저장 안 된 변경 시 교체 차단·저장 실패 재시도·충돌 비교 두 경로·이동 보호·Task별 분리·자료 링크 카드·1920/1024/820/390px), 회귀 상세 45(노트 관련 5개 기대값은 Stage 4 사양으로 갱신)·피드백 32·심화 65·자료함 43·목록 51/52(favicon) | 경량 편집기(라이브러리 없음). 남은 차이(통합 디자인 단계): 노트 제목 줄(Mockup 없음, 계약 title), 블록 드래그 없음(MM-36), 블록 간격·링크 카드 세부, 표 열 너비 조절 없음, 이미지·PDF 블록 없음. Stage 1 ≠ VERIFIED |
| 2026-10-27 | S22·S23 성장 기록·보관함 (목록·작성·상세·수정·5개 탭) | GR-LIST-01, AR-TAB-01~05 | Scratchpad Playwright 50건 PASS (학기 묶음·과목 필터·관련 활동 링크·상세·PATCH 저장/실패 입력 유지/이동 보호·Not Found·상세 더보기 → 작성(관련 활동·과목·결과물 채움)·POST·제목 필수·Empty/Error·보관함 탭 URL·검색·과목 폴더·즐겨찾기 해제/추가/실패·원본 유지·탭별 건수·휴지통 Empty/시연/복구 비활성·새 폴더 비활성·행 → 원본 상세·Keyboard·1280/768/390px), 회귀 상세 45·피드백 32·심화 65·자료함 43·노트 51·목록 51/52(기존 404) | 남은 차이(통합 디자인 단계): 카드 건수 대신 관련 활동 링크(MM-37), "성장 기록 쓰기" 버튼 추가, 폴더 아이콘이 채워지지 않은 선 아이콘, 보관함 행 별표(MM-40), 사용자 폴더·피드백 행·휴지통 남은 일수/영구 삭제 없음(MM-39·41), 작성·상세 화면 Mockup 없음. Stage 1 ≠ VERIFIED |
| 2026-10-27 | S24 Assessment 홈·S14 수행평가 꿀팁 (상세 Modal·메뉴 화면) | ST_Assessment-Home_01~03, SA-TIPS-01~06 | Scratchpad Playwright 57건 PASS (현황 계산·다가오는 일정 순서/제외/주의 색·대기 카드·최근 기록·AI 비활성·대상 기본값·알림 Popover/Esc/이동·일정/최근/요청 보기/빠른 실행 이동·대상 변경 → AI 탭·PDF/도움말 비활성·홈에서 수행평가 추가 → 현황/일정/Sidebar 반영·피드백 요청 → 대기 2건·학기 변경 분리·피드백/최근 기록/수행평가 부분 실패·Empty·Loading·꿀팁 Modal 6종/예시/선택/읽음 표시/노트 스크롤/주제명 추천 Modal/Esc Focus 복귀/외부 이동 후 복귀·꿀팁 화면 URL 유지/비활성 사유/Keyboard·1920/1024/820/390px), 회귀 성장·보관함 50·노트 51·자료함 43·심화 65·피드백 32·상세 45·목록 51/52(favicon.ico 404 확인) | 남은 차이(통합 디자인 단계): 제목의 학생 이름 없음(MM-42), AI 입력창 그라데이션 테두리 대신 단색, 빠른 실행 컬러 아이콘 대신 선 아이콘, New 배지 없음(MM-43), 일정 메타 "마감" 1종, 꿀팁 Modal 폭(870px, Mockup 약 765px), "추천" 배지·추천 순서·안내 문구 없음(MM-44), 꿀팁 화면은 Mockup 없음. Stage 1 ≠ VERIFIED |
