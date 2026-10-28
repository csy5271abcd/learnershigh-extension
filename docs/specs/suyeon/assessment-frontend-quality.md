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
| 2026-10-27 | S5 평가계획 PDF 가져오기 Modal·분석 결과 검토(Mockup 미제공 보완 UI) | SA-LIST-02 (결과 화면은 비교 대상 Mockup 없음) | Scratchpad Playwright 66건 PASS (목록·홈 진입·Esc 후 필터 유지·파일 형식/MIME/빈 파일/50MB 검사·Blob 미리보기·내 PDF 업로드 Mock → 분석 불가 안내 → 직접 추가·업로드 실패 재시도·공통 문서 분석 진행/완료·부분 실패·지필 선택 불가·이미 가져옴/같은 이름·원본에 없음/근거 미확인·근거 펼침·추출 실패 과목·과목 미연결/직접 연결·이름 정정/과목 전환 유지/저장 전 등록 차단/저장/실패 입력 유지/이동 확인·선택 2개 등록(중복 클릭)·이미 가져옴 전환·목록/Sidebar/상세/홈 반영·부분 등록 실패 → 실패한 것만 재시도·스캔본 실패·결과 없음·요청 실패·목록 실패/Empty·다른 학교·작년 문서·상태 조회 실패·미요청 직접 진입·없는 문서·Keyboard·1920/1024/820/390px). 시연 Fixture 기준 흐름 검증이며 실제 PDF 분석 검증이 아님. 회귀 홈·꿀팁 57(PDF 빠른 실행 기대값을 Stage 7 동작으로 갱신)·심화→홈 7·성장·보관함 50·노트 51·자료함 43·심화 65·피드백 32·상세 45·목록 51/52(favicon.ico 404) | 남은 차이(통합 디자인 단계): 공통 문서 행에 학기·검토 상태 줄 추가(Mockup은 "분석 성공/실패"), 안내 문구 1줄 추가, "작년 평가계획서 보기" 추가, 업로드 아이콘(Mockup은 PDF 아이콘), 결과 화면 전체(Mockup 없음). Stage 1 ≠ VERIFIED |
| 2026-10-27 | S24 홈 빠른 실행 아이콘 (Stage 6 남은 차이 일부 해소) | ST_Assessment-Home_01 + Daglo `daglo-home.png` 빠른 실행 (같은 1.5배 캡처로 비교) | Scratchpad Playwright 아이콘·배치 31건 PASS (1920·1280·1024·820·390px, 접근성 이름·장식 처리·타일/아이콘 크기·줄 수·겹침), 홈 57·PDF 66 | 선 아이콘 → 플랫 컬러 아이콘, 6+1 → 7개 한 줄. 남은 차이: 라벨 15px(Daglo 약 17~18px), 타일 모서리 30%(Daglo squircle 약 38%), 대응 아이콘이 없는 기능은 같은 시각 언어로 직접 디자인 |
| 2026-10-27 | 학생 통합 보강: 상세 자료·평가 기준 탭, 노트 위 과제 정보, Notion형 편집기·템플릿, 즐겨찾기(목록·상세·라이브러리·내 탐구·보관함), 모의고사 스크린샷 영역·시험 주제 카드 | SA-DETAIL-01·08·11, AE-DETAIL-03, SN-DETAIL-01·SN-TEMPLATE-01, AE-MOCK-01, AR-TAB-02 (스크린샷 영역·과제 정보 패널·주제 카드는 Mockup 없음) | Scratchpad Playwright 124건 PASS (편집기 키보드·IME·"/" 메뉴 22종·블록별 동작·저장본 읽기, 템플릿 보강, 과제 정보·평가 기준 후보/직접 등록/분석 실패/조회 오류, 자료 탭 추천·필터·검색·노트에 추가·URL 등록·오류, 즐겨찾기 화면 간 동기화·키보드·24px·실패, 스크린샷 등록·드래그 영역·키보드 영역·탐구 시작·PDF, AUD-009·034·004·042, 1920/1024/820/390px), 회귀 노트 51·상세 45·피드백 32·성장·보관함 50·자료함 43·심화 65·심화→홈 7·홈·꿀팁 57·PDF 66·아이콘 31·목록 51/52(favicon 404). 일괄 점검 76건 | 남은 차이: 상세 속성의 평가 유형·담당 선생님·안내문 첨부·AI 제한 Badge(MM-49), 평가 기준 원본 보기·설명 고치기·오류 신고·AI 쉬운 설명(MM-50, Stage 3), 자료 탭 자료원 별표·실제 검색 결과 없음(MM-54), 블록 드래그 없음(MM-36), 수식 렌더러·지도·OCR 없음. 기존 테스트 기대값 변경은 progress 기록 참고. Stage 1 ≠ VERIFIED |
| 2026-10-28 | S3 학교 수행평가 목록·S7 상세 Mockup 복원 (★·중요 필터·기록 열, 속성 목록·안내문·첨부, 상세 별표·노트 위 과제 정보 제거) | SA-LIST-01, SA-DETAIL-01 (1920×972 @1.5 나란히 비교) | Scratchpad Playwright 50건 PASS (헤더·★ 위치/색/24px/키보드·중요 필터 단독/검색/상태 조합/즉시 반영·완료 후순위·보관함 반영·기록 열 Revision 수/피드백 도착·대기/0건/실패·기록→수정 이력·피드백 탭·필터 복귀·속성 9종 순서/후보/미등록·PDF p.12 → 평가 기준·배치 순서·안내문 Empty/거절/추가/빼기·결과물·Editor 자동 저장·4개 탭·직접 등록 과제·라이브러리/내 탐구/상세 별표 위치·1920/1024/820/390px·390px 겹침 없음), 통합 보강 123·회귀 전체(위 progress) | 남은 차이: 행 메타 유형·비율·AI 제한, 정보 출처 "학생 확인·수정"/"확인 필요" 문구(AUD-011), 평가일·마감 2줄 일정(AUD-008), 상세 AI 제한 배지·평가 유형 값·담당 선생님 이름, 안내문 기존 첨부(계약 없음), 시연 데이터 안내 위치(AUD-003 미승인), 상태 Dropdown 안내 문구(MM-01) |
| 2026-10-28 | S19 모의고사 60선 카드·상세, S25 참고자료(신설), S7·S18 자료 탭, S3 필터 단일 선택, S7 보조 문구 회색 | AE-MOCK-01~03(구조 참고), daglo-quiz-01·02(참고자료 레이아웃 참고, Mockup 없음) | Scratchpad Playwright 77건 PASS (원본 Markdown 대조: 60개·ID·소재명·원문 글자 그대로·누락 0, 자료원 24곳 이름·주소 일치·중복 0 / 필터 단일 선택 전이·예전 URL·중요 해제 반영·검색 유지 / 회색 보조 문구·링크·D-day·오른쪽 배지 색 유지 / 과목 탭 건수·더 보기 60개·필터 조합·검색·Empty·대표 6개 소재·상세 원문·펼치기·목록 복귀 상태·탐구 시작(제목 수정)·예전 소재 ID 조회 / Sidebar·Route·STEP·추천·24 카드·실제 주소·새 탭·영역 순서·추가 자료원·유형 필터·검색·Empty·찾은 자료 등록 → 자료함 / 자료 탭 6곳·종류 필터·전체 보기 영역 미리 선택·노트 삽입 / 심화 탐구 자료 탭 / 오류 / 1920·1024·820·390px·키보드), 회귀 전체(progress) | 남은 차이: AE-MOCK의 계열 대분류 필터·카드 별표·영문 주제·LearnersHigh 코멘트·관련 자율 Task(AUD-029, MM-28) 없음, 참고자료 화면은 Mockup이 없어 Daglo 구조 참고만, 자료원 로고 대신 분류 아이콘, Daglo 히어로의 손가락·PDF 스티커 같은 장식 없음 |
| 2026-10-28 | S7·S18 상세 스크롤 구조 (이중 스크롤·하단 빈 공간 수정) | SA-DETAIL-01 (구조) | Scratchpad Playwright 25건 PASS + 측정(1920×972: document 1108 → 972, 가운데 879/1421·오른쪽 879 독립 스크롤, 하단 = viewport) · 회귀 전체 | CSS 2줄(`position: relative`, `overscroll-behavior-y: contain`). 디자인 변경 없음 |
| 2026-10-28 | Assessment Sidebar 과목 검색·접기(10개 이상) + 3영역 스크롤(학기 선택·학교·학업 정보 고정, 가운데만 스크롤) | Sidebar 기존 디자인(9개 이하 그대로), Mockup에 과목 10개 이상 화면 없음 | Scratchpad Playwright 52건 PASS (과목 0·4·9·10·15·20·30개, 1920×972@1.5·1440×900·1440×640·1024·820·390, 키보드·Drawer) + 측정(30개 1920: 위 73·가운데 787·아래 62, document = viewport) · 회귀 전체 | Mock 시나리오 `subjectsN`은 화면 확인 전용. 과목 수 기준 10은 사용자 요청값 |
| 2026-10-28 | S20 대학별 자료 확장 + S26 대학별 기출 PDF 원문 보기(신설), 심화 탐구·노트 출처 연계 | Mockup 없음 (AE-UNI-01 구조 참고), 실제 PDF 27개 | 직전 Playwright 실행: 27개 열람 27/27·대표 8개 PASS, 이후 단계는 메모리 부족 중지로 **부분 검증** (노트·오류·반응형·회귀 NOT RUN) | pdfjs-dist 도입·원문 배포 권한·문항 인덱스 검수는 P-25 PROPOSED |
| 2026-10-28 | S20 대학별 자료 목록형 간소화 + S26 원문 상세 오른쪽 문서형 간소화 | Daglo `daglo-board.png`(목록 위계 참고) | Playwright: 목록 22·원문 패널 14·탐구/노트 9·오류 7·반응형 11·PDF 27개 전체 13, 회귀 전체 순차 PASS(favicon 404 제외) | 파란 강조선·테두리·큰 파란 버튼 제거를 계산된 스타일로 확인 |
| 2026-10-28 | S26 원문 오른쪽 패널 간소화 전 디자인 복원 (선택 카드 파란 강조선·테두리만 제거) | 간소화 전 캡처(같은 문서·같은 쪽) | Playwright panel-check 50/50 + 목록 22/22 + 회귀 | 파란색은 탐구 방향 예시 배경·현재 쪽 버튼 표시 등 이전 디자인 그대로 |
| 2026-10-28 | 상단 Assessment → 홈, 구형 Mentor Hub·School Activity 제거 (Student) | — | Playwright nav-check 36/36 + 회귀 전체 순차 PASS(favicon 404 제외) | Router·Shell·Navigation은 Shared 영향(OWNERSHIP §10-1) → 리뷰 권장 |
| 2026-10-28 | S1·S2 학생 과목 추가 (학업 정보·Sidebar 공통 Modal) + Assessment 과목 선택 연동 | SAI-01 (과목 칩·추가 칩 위치) | Playwright subject-check 57/57 + 회귀 전체 순차 PASS(favicon 404 제외) | 자유 입력 과목 생성·브라우저 저장은 Mock 전용 (P-26 PROPOSED) |
