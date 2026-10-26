# Assessment 화면 매핑 (Screen ↔ Mockup ↔ Spec ↔ Contract)

> 위치: `docs/specs/suyeon/assessment-screen-map.md`
> 상태: **DRAFT.** Stage 1 Frontend 착수용 매핑이다. Requirement Source가 아니며, 기능·상태는 Feature Spec / `domain.md` / `api-contract.md`가 우선한다.
> Mockup 경로 접두사: `references/claude-design-mockup/LearnersHighAssessment/` (Read-only). 모든 PNG는 약 2880×1446~1468px다.
> **정정 (2026-10-26, 첫 구현 중 실측):** 글자·간격을 실제 구현과 비교한 결과 **CSS 1920×약 972 @ DPR 1.5**로 보는 것이 맞다 (본문 14px, 페이지 제목 22px, Sidebar 약 212px). 이전 문구의 "1440 @ DPR 2"는 틀렸다. 시각 비교 캡처는 1920×972 @1.5로 한다.
> **Route:** S1~S4·S6·S7(기본 정보) Student Route는 첫 구현에서 아래 경로로 **확정**했다 (`frontend/student/src/features/assessment/routes/paths.ts`). 나머지는 제안이다. Admin Route는 Admin Shell 협의 후 정한다.

## 1. Student

| # | 화면 / 변형 | Mockup | Spec | Contract | Route (제안) | 비고 |
|---|---|---|---|---|---|---|
| S1 | Assessment Shell (좌측 메뉴·학기 선택·과목 바로가기) | 모든 Student PNG 공통, `School-Academic-Info/SAI-02_Term-Selector-Dropdown` | student §3 | §9 | `/assessment/*` | 상단 기존 Nav에 Assessment 진입 1개. Sidebar 카운트는 계약 없음 → 목록 API 조합 |
| S2 | 학교·학업 정보 | `School-Academic-Info/SAI-01` | student §4 (ST-01) | §9 | `/assessment/academic-info` | |
| S3 | 학교 수행평가 목록 + 상태 필터 변형 | `School-Assessments/SA-List/SA-LIST-01`, `-05_Before`, `-06_Processing`, `-07_Completed` | student §6 (ST-03) | §12·13 | `/assessment/school-assessments` | **05~07은 상태 필터 탭(시작 전 / 진행 중 / 완료) 변형**이다 (06 이미지 확인, 05·07은 파일명 기준). 행 안의 상태 Dropdown은 역전이 OD |
| S4 | 수행평가 추가 모달 | `SA-LIST-03`, `-04_Expanded` | student §6 | §12 POST | (모달) | |
| S5 | PDF 가져오기 모달 | `SA-LIST-02` | student §5 (ST-02) | §10·11 | (모달) | 분석은 Stage 3 AI, Stage 1은 상태 표현만 |
| S6 | 과목별 목록 | `SA-Subject-Lists/SA-SUB-01~04` | student §3·§6 | §12 (subjectId) | `/assessment/school-assessments?subject=` | 같은 목록에 필터를 적용한 것 |
| S7 | 수행평가 상세 (기본·상태 변형·더보기) — **2026-10-26 Stage 1 구현** (계약 밖 속성 제외) | `SA-Detail/SA-DETAIL-01,03~06,14` | student §6 | §12·13 | `/assessment/school-assessments/:assessmentId` | 01 이미지 확인: 계약 밖 필드 있음 (§3 표) |
| S8 | 탐구 노트 (상세 페이지 하단에 포함) + 템플릿 모달 | `SN-Detail/SN-DETAIL-01`, `SN-Templates/SN-TEMPLATE-01` | inquiry §5·§6 | §19~21 | S7 내부 | **별도 페이지가 아니라 상세 페이지 안에 포함** (이미지 확인). Editor Library 미정 **구현(2026-10-26): 최신 Revision 읽기 전용 + 템플릿 미리보기.** **Stage 4(2026-10-27, Mock): 경량 블록 편집기(라이브러리 없음, OD-A05 미정) — 소제목·본문·목록·번호·체크리스트·인용·표·자료 링크 카드, + / ⋮⋮ 메뉴(이동·유형 바꾸기·삭제), 빈 줄 "/", Alt+↑↓, 노트 생성(§20 POST)·자동 저장(§20 PUT, expectedRevisionId, Mock 1.5초)·저장 상태·실패 재시도·충돌 비교, 템플릿 적용(끝에 추가 / 확인 후 새 노트로 시작), 자료함 링크 카드(§20 PUT 방식), 저장 안 된 변경 이동 보호. 학교 수행평가·심화 탐구 공통 (`components/notes/`)** |
| S9 | 수정 이력 모달 | `SA-DETAIL-12` | inquiry §5 | §21 | (모달) | **구현: Revision 목록(§21) Popover.** **Stage 4: 항목을 누르면 과거 Revision 읽기 전용 보기(§21 상세), 복원 버튼은 보이되 비활성+사유(정책 미정), 저장마다 목록 갱신** |
| S10 | 결과 파일 업로드 / 버전 | `SA-DETAIL-07` | inquiry §8 | §24~26, §25-1 | (모달 / 섹션) | **구현: 새 결과물 v1 / 새 버전, 버전 목록·피드백 대상 선택 (Mock은 메타데이터만)** |
| S11 | 우측 패널: 평가 기준 / AI 도우미 / 피드백 / 자료 | `SA-DETAIL-08`, `-09`, `-10`, `-11` | student §7, inquiry §10, feedback §4, inquiry §7 | §14, §28, §31, §22 | S7 패널 | AI는 고정 Suggestion Mock **구현: 4개 탭. 피드백 탭은 요청·Snapshot·기록·답변까지 동작, 평가 기준·자료는 Empty(MM-20·21), AI는 비활성(Stage 3)** |
| S12 | 주제명 추천 모달 | `SA-DETAIL-02` | student §9 (ST-06) | §14 | (모달) | AI **구현: §14 필드 입력 UI, 추천 실행 비활성(Stage 3)** |
| S13 | 피드백 요청 완료 모달 | `SA-DETAIL-13` | feedback §4 (ST-14) | §31 | (모달) | "받는 분 OOO 선생님", 시연 버튼 포함 (이미지 확인) **구현: §31 응답 Snapshot 표시** |
| S14 | 수행평가 꿀팁 6종 | `SA-Tips/SA-TIPS-01~06` | student §8 (ST-05) | §15 | `/assessment/tips/:tipId` | |
| S15 | 선생님 피드백 목록 (전체 / 대기 / 완료) | `Teacher-Feedback/TF-List/TF-LIST-01~03` | feedback §8 (ST-15) | §31·32 | `/assessment/feedback` | **구현(2026-10-26, Stage 1 Mock):** `?status=` 필터·건수, 요청 카드(상태·요청 시각·보낸 자료 Snapshot), 답변(전체 의견·위치별 의견·후속 추천), 요청 당시 자료 Modal(§21 Revision 본문·파일 Metadata, 지금 최신 버전과 구분), 제목 → 상세 `?panel=feedback`, Sidebar `대기 N`. 과제 매칭은 MM-19 조합, 계약 밖 표현은 MM-24 |
| S16 | 심화 탐구 목록 / 생성 모달 / 선택 Preview | `Advanced-Exploration/AE-List/AE-LIST-01~03` | inquiry §3 (ST-16) | §16·18 | `/assessment/enrichment` (`?subject=&q=&selected=`) | **구현(2026-10-26, Stage 1 Mock):** 과목·검색·카드 선택(URL 보존), 선택 ID와 같은 §16 상세만 Preview, 이 탐구 시작하기(§18 POST, 새 taskId·중복 클릭 방지·실패 재시도), 이미 시작한 콘텐츠는 진행 중 Badge·내 탐구 열기, 직접 만들기 Modal(제목·과목 필수, 목표·연결 수행평가 선택). 분야 필터·난이도·즐겨찾기·문제 상황 등은 MM-26 |
| S17 | 내 심화 탐구 | `AE-My-Explorations/AE-MY-01` | inquiry §3 | §18 | `/assessment/enrichment/my` (제안 `/mine`에서 변경) | **구현:** 시작일·연결 수행평가(§12 상세로 제목 확인)·상태, 검색은 받은 목록 안 화면 필터(§18 Query 없음), Empty/Error |
| S18 | 심화 탐구 상세 (자기 점검·AI·자료·이력·더보기) | `AE-Detail/AE-DETAIL-01~05` | inquiry §3·§5·§10 | §18·20·21·28 | `/assessment/enrichment/tasks/:taskId` (`mock-exams` 등 탭 경로와 겹치지 않게 변경) | **구현:** S7 상세 틀·노트·이력·더보기 재사용(피드백 버튼 없음), 상태 변경(§18 PATCH status, 되돌리기 막음), 수행평가 연결(§18 PATCH), 자기 점검 탭 = 출발 공개 콘텐츠의 수행 안내·출발 자료(원본 비공개 시 안내), AI·자료 탭 준비 중 |
| S19 | 모의고사 지문 목록 / 상세 | `AE-Mock-Exam/AE-MOCK-01~03` | inquiry §4 (ST-07) | §17 | `/assessment/enrichment/mock-exams`, `/mock-exams/:materialId` | **구현:** 시연용 자체 제작 카드(실제 지문 없음), 과목 필터·검색, 상세(원문 정보와 탐구 아이디어 분리, 원문 링크 없음 표시), 심화 Task 만들기(§18 sourceReference DRAFT), 내 지문 등록(§17 POST, 링크만·확인 안 함)·내 지문 목록, 수행평가 아이디어 연결은 Editor 전 비활성. MM-28 |
| S20 | 대학 공개 자료 | `AE-University-Resources/AE-UNI-01` | inquiry §9 (ST-17) | §27 | `/assessment/enrichment/universities` (`?university=&year=&type=&q=`) | **구현:** 대학 Chip은 응답 값으로 생성(가상 기관명), 학년도(§27 Query)·자료 유형(화면 필터), 원본 열기는 확인된 URL만(시연 데이터 전부 없음), 미리보기 비활성, 탐구 아이디어 펼침 → 심화 탐구 시작(sourceReference DRAFT). MM-29 |
| S21 | 자료함 / 과목별 추천 / 자료 추가 모달 | `Resource-Library/RL-LIST-01~02`, `RL-Add-Resource/RL-ADD-01` | inquiry §7 | §22·23 | `/assessment/resources` (`?q=&type=&subject=`), `/resources/:resourceId` | **구현(2026-10-27, Stage 1 Mock):** 과목별 추천 자료원(탐색 후보, 펼침 → 그 자료원으로 자료 추가), 유형 필터(Mockup 5종), 검색(§22 query, Mockup에 없지만 다른 목록과 같은 위치), 내 자료 목록·출처 정보 표시, 자료 추가 Modal(유형 7종·자료명 필수·URL/발행일 형식 검사·닫기 확인), 자료 상세(Mockup 없음, 최소 구성)·수정(§22 PATCH, 메모·태그 포함), Sidebar 건수. 노트에 추가·AI 요약 비활성, 삭제 없음(§22에 없음). MM-30~32 |
| S22 | 성장 기록 | `Growth-Records/GR-LIST-01` | inquiry §11 | §29 | `/assessment/growth` (`?subject=`), `/growth/new?sourceType=&sourceId=`, `/growth/:recordId` | **구현(2026-10-27, Stage 5 Mock):** 개인 기록 안내(세특과 별개·자동 생성 없음), 과목 Chip, 학기별 묶음(과목이 속한 학기로 계산, MM-37), 카드(출처 배지·과목·제목·내 역할/해결한 문제/배운 점/추가 탐구, 빈 항목 숨김), 관련 활동 링크. 작성(§29 POST, 제목 필수, 관련 활동·과목·시작일·9개 서술 항목·관련 활동의 결과물 선택)·상세·수정(§29 PATCH 바뀐 항목만)·실패 시 입력 유지·이동 보호. 학교 수행평가·심화 탐구 상세 더보기 "성장 기록에 남기기" → 관련 활동을 채운 작성 화면. 내보내기 비활성. 작성·상세 Mockup 없음. AI 생성 없음. MM-37·38 |
| S23 | 보관함 5개 탭 | `Archive/AR-Tabs/AR-TAB-01~05` | inquiry §12 | §30 | `/assessment/archive?tab=` (`&q=&subject=`) | 휴지통 동작은 OD-A11. **구현(2026-10-27, Stage 5 Mock):** 원본(학교 수행평가·심화 탐구)을 다시 조회하는 Projection(사본 없음), 탭 5개(URL 유지)·검색(§30 query)·과목 폴더(받은 목록 안 화면 필터)·행 → 원본 상세, 행 메타(과목·유형·상태 / 이전 학기는 학년도·학기), 노트 N블록, 즐겨찾기 별표(SCHOOL_ASSESSMENT만, §30 PUT). 새 폴더·내보내기 비활성, 사용자 폴더 없음, 휴지통은 기본 Empty(시연 시나리오만 항목)·복구 비활성·영구 삭제 없음·30일 안내 없음. MM-39~41 |
| S24 | Assessment 홈 / 스크롤 / 알림 Popover | `Assessment-Home/ST_Assessment-Home_01~03` | student §3 | 요약 API 없음 | `/assessment` | 01 이미지 확인: AI 입력창·빠른 실행·New 배지는 계약 없음 |

## 2. Admin

공통 크롬: AM Mockup은 기존 LearnersHigh Admin 크롬(어두운 Sidebar, `학습관리` 하위 기존 메뉴, `Assessment 관리 NEW`, 상단 문자잔고·알림)과 페이지 내부 탭 6개(전체 현황 / 학생 Assessment / 피드백 관리 / 학교별 평가계획서 / 심화 탐구 콘텐츠 / 관리자 참고자료실)를 보여준다 (AM-01·06·07 이미지 확인). 현재 `frontend/admin/src/app/AdminShell.tsx`와 형태가 다르며 **Admin Shell 변경은 Wangyu 협의 대상**이다.

| # | 화면 | Mockup (`Admin/Assessment-Management/`) | Spec | Contract | 비고 |
|---|---|---|---|---|---|
| A1 | 전체 현황 | `AM-Overview/AM-01` | admin §3·§14 | §33·47 | KPI는 Fixture Entity에서 계산 |
| A2 | 학생 Assessment 목록 / 상세 / 스크롤 | `AM-Student-Assessment/AM-02~04` | admin §4·§11~13 | §34~37 | 읽기 전용. 노트 Renderer는 Student와 공유 대상 |
| A3 | 피드백 목록 / 상세 편집기 | `AM-Feedback-Management/AM-05~06` | feedback §5~7 | §44~46 | 06 이미지 확인: **위치별(쪽·슬라이드) 의견 UI 없음**, 시연 버튼 포함 |
| A4 | 학교별 평가계획서 / 업로드 모달 | `AM-School-Evaluation-Plans/AM-07~08` | admin §5·§6 | §38·39 | 07 이미지 확인: 학년×학기 6슬롯, 개정본 추가 |
| A5 | 심화 Task 목록 / 생성 / 편집 | `AM-Enrichment-Content/Enrichment-Tasks/AM-09~11` | admin §9 | §41 | 공개 상태 Enum 미정 |
| A6 | 모의고사 소재 목록 / 등록 / 편집 (+스크롤) | `AM-Enrichment-Content/Mock-Exam-Materials/AM-12~16` | admin §7 | §40 | |
| A7 | 대학 공개 자료 목록 / 등록 모달 | `AM-Enrichment-Content/University-Public-Resources/AM-17~18` | admin §10 | §42 | |
| A8 | 관리자 참고자료실 / 저장 모달 | `AM-Reference-Library/AM-19~20` | admin §8 | §43 | 내부 스크랩은 비공개 |

## 3. Mockup ↔ 계약 불일치 (결정 대기)

이미지로 직접 확인한 항목만 "확인", 파일명 등으로 추론한 항목은 "추정"으로 표기한다.

| ID | 화면 | Mockup 표현 | 문서 기준 | 근거 | 필요한 결정 |
|---|---|---|---|---|---|
| MM-01 | S3, S7 | 상태 Dropdown + "언제든 자유롭게 바꿀 수 있어요", 목록 행에서 즉시 변경 | API §13 "역전이 정책 확정 전 임의 허용 금지" | 확인 | 역전이 허용 여부 |
| MM-02 | S11 피드백 패널 | "새 요청은 답변을 받은 뒤 보낼 수 있어요" | API-OD-A06 재요청 미정 | 확인 | 과제당 대기 요청 수 |
| MM-03 | S7 | 평가 유형, 평가일("11월 중" 자유 텍스트), 반영비율, 정보 출처 배지, 담당 선생님, 연결된 심화 탐구, 안내문·첨부(사진·PDF 추가) | API §12 DTO에 없음, 안내문 첨부는 Domain Entity 없음 | 확인 | 필드별 채택/제외 → Domain · 계약 개정 |
| MM-04 | S13 | 요청 Snapshot에 "첨부 2개(사진·PDF)" 포함 | §31 Snapshot = Note Revision + ArtifactVersion | 확인 | 안내문 첨부의 Snapshot 포함 여부 (MM-03과 연계) |
| MM-05 | S24 | AI 입력창, 빠른 실행 7개, New 배지, Sidebar 카운트 | 홈 요약 API 없음 (student §3 인정) | 확인 | 홈 데이터 구성 방식, AI 입력창 계약 위치 (ST-18) |
| MM-06 | S1 | Sidebar 하단 `휴지통` 별도 메뉴 + 카운트 | student §3 메뉴 목록에 없음 (보관함 탭) | 확인 | 메뉴 노출 여부 |
| MM-07 | S3 | "중요 ★" 필터 | §12 목록 Query에 favorite 필터 없음 (§30 favorites만 있음) | 확인 | §12 Query 확장 여부 |
| MM-08 | A3 | 위치별 의견 UI 없음, "심화 탐구 Task 추천: 직접 제안" | feedback §6 AD-15 위치 의견, §46 계약 대응 여부 미확인 | 확인 / 추정 | 위치 의견 UI 범위·시점 |
| MM-09 | Admin 공통 | 기존 Admin 크롬 재현 + 페이지 내부 탭 | admin §3 IA 트리, 현재 AdminShell과 다름 | 확인 | Shell 변경 범위 (Wangyu 협의) |
| MM-10 | S7, S13, A3 | "선생님이 AI 글쓰기 도움을 제한한 과제" 배지, "받는 분: OOO 선생님" | feedback §2: 시연 표현, 새 Actor 금지 | 확인 | 표시 여부 / 문구 |
| MM-11 | S3 | 목록 열 `기록`(노트 수·피드백 아이콘), 행 메타 `유형·반영비율`, 출처 배지 `학생 확인·수정`/`확인 필요`, Header 알림 벨 | §12 목록 응답에 없음 | 확인 | 목록 응답 확장 여부. 구현은 `evaluationItemRef` 유무로 `평가계획서 연결 / 직접 등록`만 표시 |
| MM-12 | S3 | 정렬 `일정순`에서 완료 과제가 맨 아래 | §12·§50에 §12 허용 Sort 필드 미명시 | 확인 | 허용 Sort 값과 "완료 후순위" 규칙. 구현은 `deadlineDate,asc`(날짜 미정은 뒤) / `createdAt,desc` / `title,asc` |
| MM-13 | S1, S2 | 학기 Dropdown·이전 기록(지난 학년도·이전 학교 포함) | §9에 학기 목록 API 없음, §9-1 Query 생략 시 의미 미명시 | 확인 | 학기 목록 계약. 구현은 Query 생략 = 현재 학기로 가정하고 현재 학년도 1·2학기만 후보로 조회 |
| MM-14 | S2 | `+ 과목 추가`, `전학·진급 처리` | §9-2 Write Owner 미확정(OD-A04), 과목 검색 API 없음 | 확인 | 두 버튼은 사유 안내만 하고 동작하지 않음. 수강 과목 선택 해제만 §9-2로 저장 |
| MM-15 | S2 | — (§9-2 응답 Body 없음, §12 상세 응답에 `description`·학기 없음) | §9-2, §12 | 확인 | 응답 Shape 보완. 구현은 저장 후 GET 재조회, 설명은 저장만 하고 표시하지 않음 |
| MM-16 | S3 | 상태 탭(시작 전·진행 중·완료) 선택 시 `다가오는 일정` 숨김 | 표시 규칙(Business Rule 아님) | 확인 (05~07) | 결정: Mockup대로 구현 (2026-10-26) |
| MM-17 | S7 | 상태 Dropdown 옆 문구 "언제든 자유롭게 바꿀 수 있어요" | MM-01과 같은 쟁점 | 확인 | 결정 전에는 "되돌리기는 정책 확정 전" 안내로 대체 |
| MM-18 | S7·S8·S10 | 노트 목록·결과물 목록 응답 | §20 GET 항목 Shape 미기재(요청+저장 응답만), §24 목록 항목 Shape 미기재 | 확인 | 구현은 "요청 필드 + 저장 응답 필드" 조합으로 가정 (`api/types.ts` 주석). 계약에 명시 필요 |
| MM-19 | S11 피드백 탭, S15 | 과제별 "요청 기록", 목록의 과제 제목 | §31 목록 Query에 `sourceType/sourceId` 없음, 목록 항목 Shape 미기재 | 확인 | 구현은 201 응답 Shape으로 보고, 요청 Snapshot의 `noteRevisionId`를 불러온 학기 수행평가(§12)의 노트 Revision(§20·21)과 맞춰 과제를 찾음(S15: `model/feedbackListView.ts`, 못 찾으면 "연결된 과제를 확인할 수 없어요"). Query·필드 추가 제안(P-15) |
| MM-20 | S11 평가 기준 탭 | 기준별 배점·원본 쪽·원문·AI 쉬운 설명·자기 점검 | 과제별 공식 기준 조회 Endpoint 없음(§11 분석 결과는 항목 키·rubric 구조 미정), §14는 AI 설명 POST만 | 확인 | 구현은 "평가 기준이 아직 연결되지 않았어요" Empty. 조회 계약 제안(P-15) |
| MM-21 | S11 자료 탭 | 링크로 바로 추가, 추천 자료원·검색어·분류 탭·노트에 추가 | §22 추천 응답 항목 Shape 미기재, 노트 삽입은 Editor(OD-A05) 필요 | 확인 | 구현은 준비 중 Empty |
| MM-22 | S12 | 희망 진로, 추천 유형 Chip | §14 요청에 필드 없음 (Spec ST-06에는 추천 유형 표) | 확인 | 구현은 §14 필드만, 추천 실행은 Stage 3 |
| MM-23 | S7·S9·S11 | "자동 저장됨", 이력 "복원", 이력 항목 요약("블록 4개 수정"), 시연 버튼 | 노트 저장 미구현(OD-A05), 복원 §21 미확정, 요약 필드 없음, 시연 버튼은 시나리오 제어 | 확인 | 표시하지 않음. 시연 동작은 `?mockScenario=`. **Stage 4: "자동 저장됨 · vN"은 Mock 저장 응답 뒤에만 표시, 복원은 비활성+사유, 요약은 계속 없음** |
| MM-24 | S15 | 답변 작성자 이름("박서연 선생님"), 답변 항목 `잘한 점 / 보완하면 좋을 점 / 복습할 개념 / 다음 학습 활동`, 추천 활동 제목, 추천 버튼 `참고만 하기 / 노트에 메모 추가 / 심화 탐구로 시작`, 보낸 자료 `첨부 N · 참고자료 N`, 시연 버튼 | §32 Reply는 `overallComment`·`comments[]`·`recommendations[]{type, resourceId/catalogTaskId, note}`만. 추천 수락·확인 기록 계약 없음, 첨부는 MM-04 | 확인 | 구현은 "선생님 답변"(이름 없음, ADR-0009), 전체 의견 + 위치별 의견 행 + 추천 `note`. 추천 버튼은 aria-disabled + 이유 안내. 구조화 항목 채택 시 §32·§45 개정 필요 |
| MM-25 | S15 Modal | 요청 당시 노트 본문 | §21 `GET .../revisions/{revisionId}` 응답 Shape 미기재 | 확인 | 구현은 Revision 목록 항목 + `noteId`·`title`·`blocks`로 가정 (`api/types.ts` `NoteRevisionDetail`). MM-18과 함께 명시 필요 |
| MM-26 | S16·S18 | 탐구 분야 필터(자료 분석·비판적 사고·실험 설계…), 난이도, 키워드 태그, 복수 과목, 즐겨찾기 별, 문제 상황·참고할 만한 곳·예상 결과물·자기 점검 기준(체크박스) | §16 항목은 `catalogTaskId·title·subjectId·goal·methods·published`만. 즐겨찾기(§30)는 sourceType 예시가 SCHOOL_ASSESSMENT뿐, 자기 점검 체크 저장 계약 없음 | 확인 | 구현은 §16 필드만(목표·수행 안내). 필드 보완 제안(P-16) |
| MM-27 | S16~S18 | 개인 Task 목록·상세 응답, 수정 가능 필드, 같은 공개 콘텐츠로 여러 Task 시작 | §18 응답 Shape 미기재, PATCH Body 미기재, 중복 시작 정책 미정(API-OD-A12) | 확인 | 응답 = 요청 필드 + `taskId·createdAt·updatedAt`로 가정, PATCH는 `relatedAssessmentId`만 사용. 이미 시작한 콘텐츠는 "내 탐구 열기"만 보여줌(서버 강제 아님) |
| MM-28 | S19 | 공개 지문 카드 응답, 과목 목록, 계열 필터, 영문 주제·해시태그·LearnersHigh 코멘트·관련 자율 심화 Task·즐겨찾기 | §17은 개인 등록 필드만 예시, 공개 카드 Shape·과목 목록 API 없음 | 확인 | 카드 = `materialId·subjectId·source{학년도·월·학년·문항·sourceUrl}·idea{주제·핵심 소재·분야·해설·목표·방법·확장 질문}`(Spec §4 표)로 가정, 과목 이름은 시연용 ID에만 붙임. sourceReference는 §18 DRAFT |
| MM-29 | S20 | 대학 공식 자료 페이지 카드, 분야 필터, 자료 응답 | §27 응답 Shape·유형 Query 없음 | 확인 | 자료 = Spec §9 메타데이터(대학·제목·학년도·유형·공식 URL·확인일·관련 개념·탐구 연계)로 가정, 유형은 화면 필터. 실제 대학 문서처럼 보이지 않게 가상 기관명 사용 |
| MM-30 | S21 | 자료 목록·상세 응답, PATCH 수정 필드, 행별 "연결된 수행평가", 파일 크기 | §22는 POST 예시만 있고 GET·PATCH Shape 없음, 자료–과제/노트 연결 필드 없음, 파일 메타(§48) 미연결 | 확인 | 응답 = 요청 필드 + `resourceId·createdAt·updatedAt`, PATCH = 요청 필드 부분 집합(파일 제외)으로 가정. 연결된 수행평가·파일 크기는 표시하지 않음 |
| MM-31 | S21 | 자료 유형 7종(링크·기사·논문·도서·영상·PDF·이미지), 목록 필터 5종(기사·논문 Chip 없음) | §22 `type` Enum 미정(예시 `ARTICLE`뿐) | 확인 | Mock은 `LINK·ARTICLE·PAPER·BOOK·VIDEO·PDF·IMAGE`를 후보 값으로 사용, 필터는 Mockup 5종 그대로 |
| MM-32 | S21 | "출처 확인됨" / "출처 확인 필요" Badge, 등록 화면 안내 "작성자와 발행일을 모두 채우면 출처 확인됨" | 시스템 검증 결과가 아니라 학생 입력 완결성 규칙. 계약·Spec에 확인 상태 필드 없음 | 확인 | 구현은 같은 규칙으로 "출처 정보 입력됨"/"출처 확인 필요"로 표시(검증된 것처럼 보이지 않게 문구 조정). 용어 결정 필요 |
| MM-33 | S8 | 노트 블록 유형(목록·번호·체크리스트·인용·표·링크 카드)과 체크 상태·셀·출처 데이터 | §20 예시는 `HEADING`·`PARAGRAPH`와 `{blockId,type,text}`뿐, 블록 Schema는 Editor 선정 후(API-OD-A04) | 확인 | Mock은 `BULLET·NUMBERED·CHECKLIST·QUOTE·TABLE·RESOURCE_LINK` type과 임시 `attrs`(checked·rows·resource)로 저장, 화면에 "시연용(Mock) 형식" 안내. 확정 전 서버 계약 아님 |
| MM-34 | S8 | 노트에 자료 넣기 | §23 resource-links Endpoint 또는 §20 PUT 중 택1 (§23 본문) | 확인 | 편집기가 링크 블록을 만들어 §20 PUT으로 저장 (§23 미사용). 원문 복사 없이 resourceId·제목·출처·URL만 |
| MM-35 | S8 | 템플릿 "현재 노트 맨 위에 추가", "새 노트로 시작 — 지금 내용은 수정 이력에 보관해 언제든 복원" | §19·Spec §6은 새 노트 / 뒤에 추가만, 복원 정책 미정 | 확인 | 맨 위 추가 제외. 새 노트로 시작 = 확인 후 본문 교체(이전 저장본은 이력에 남음, 복원 없음), 저장 안 된 변경이 있으면 비활성. 과제당 노트 수 정책은 MM-18 |
| MM-36 | S8 | 블록 드래그(⋮⋮ 끌기), 블록 Hover "+" | 드래그는 Editor 라이브러리 기능 | 확인 | ⋮⋮는 메뉴(위로·아래로·유형·삭제), + 는 아래에 본문 추가. 드래그는 Editor 결정 뒤 |
| MM-37 | S22 | 학기별 묶음("2026학년도 2학기"), 카드 오른쪽 "선생님 피드백 1건"/"탐구 노트 1개", 내보내기, (작성 버튼·상세 화면 없음) | §29는 요청 필드만 있고 응답 Shape·학기 필드·관련 건수·내보내기 없음, 필수 필드 미정 | 확인 | 응답 = 요청 필드 + `recordId·createdAt·updatedAt`, PATCH = 요청 필드 부분 집합, 필수 = 제목만으로 가정. 학기는 과목이 속한 §9-1 학기로 계산(과목 없으면 "학기 미지정"). 건수 대신 "관련 활동 보기" 링크. 내보내기 비활성. "성장 기록 쓰기" 버튼·작성/상세 화면은 Mockup 없이 추가 |
| MM-38 | S22 | (결과물 연결) | §29 `artifactIds`가 Artifact인지 특정 ArtifactVersion인지 미정 | 확인 | 관련 활동의 Artifact 단위로만 연결, "어느 파일 버전인지는 아직 고정하지 않아요" 안내. 다른 활동의 Artifact는 Mock이 400 |
| MM-39 | S23 | 행(아이콘·제목·"과목 · 학교 수행평가 · 상태"·노트 N블록), 최근 기록의 "피드백: …" 행 | §30은 tab·query만 있고 항목 Shape 없음, sourceType은 학교 수행평가·심화 탐구 예시뿐 | 확인 | 항목 = 원본 참조(`sourceType·sourceId`) + 제목·과목·학년도·학기·상태·`lastActivityAt`·`noteBlockCount`·`favorite`·`deletedAt`으로 가정. 최근 기록 = 이번 학기 수행평가 + 심화 탐구(학기 없음), 완료 = 모든 학기 완료, 이전 학기 = 학기가 다른 수행평가(심화 탐구 제외). 피드백 행은 넣지 않음. `lastActivityAt` = 생성·노트 저장·파일 업로드 중 최근(열람 기록 아님) |
| MM-40 | S23 | 즐겨찾기 탭의 심화 탐구 라이브러리 콘텐츠(별표), 행 안 즐겨찾기 버튼 없음 | §30 PUT 예시는 `SCHOOL_ASSESSMENT`뿐 | 확인 | 학교 수행평가 행에만 별표 버튼(Mockup에 없는 진입점) 추가, 다른 유형은 Mock 400. 해제는 표시만 지우고 원본 유지 |
| MM-41 | S23 | 사용자 폴더("발표 자료 모음")·새 폴더·내보내기, 휴지통 "30일 뒤 완전히 삭제"·"23일 남음"·복구·영구 삭제 | 폴더·내보내기 계약 없음, §30 Query에 과목 없음, 삭제·복구 정책 미정(API-OD-A08, OD-A11) | 확인 | 과목 폴더만(받은 목록 안 화면 필터), 새 폴더·내보내기 비활성. 휴지통은 기본 Empty, `archiveTrashDemo` 시연 항목만, 복구 aria-disabled+사유, 영구 삭제·남은 일수·30일 안내 없음 |

## 4. 갱신 규칙

- 결정이 나면 해당 MM 행을 삭제하지 말고 "결정: …(근거 문서)"로 갱신한다.
- 새 화면·변형을 발견하면 행을 추가하고 Spec 절을 연결한다. Mockup만으로 Spec에 없는 기능을 추가하지 않는다.
