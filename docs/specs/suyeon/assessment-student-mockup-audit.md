# Student Assessment — Mockup 통합 검수 (Stage 1~7)

> 상태: **검수 기록 (DRAFT)**. 코드·계약 변경 없음. 수정은 별도 작업에서 한다.
> 작성일: 2026-10-27 · Branch `feature/assessment-stage7-pdf-import` · 기준 Commit `90720de`
> 비교 기준: `references/claude-design-mockup/LearnersHighAssessment/Student/` PNG 63장 + 실제 브라우저 화면(Mock 모드)
> 관련 문서: `assessment-screen-map.md`(MM-01~48), `harness-change-proposals.md`(P-01~21), `assessment-frontend-quality.md`

## 0. 검수 방법과 범위

| 항목 | 내용 |
|---|---|
| Mockup | 63장 전부 열어 확인 (폴더별: School-Assessments 29, Advanced-Exploration 13, Archive 5, SA-Subject-Lists 4, Assessment-Home 3, Resource-Library 3, Teacher-Feedback 3, School-Academic-Info 2, Growth-Records 1). 원본 해상도 2878~2880 × 1446~1466 (1920 CSS @ DPR 1.5) |
| 실제 화면 | `http://localhost:5173/assessment` (이 Repository의 student 앱, Mock 데이터, 시연 기준일 2026-10-16). 63개 상태를 모두 같은 조건(1920×972, DPR 1.5)으로 다시 캡처 |
| 비교 | Mockup과 캡처를 좌우로 붙인 비교 이미지 63장 + 2장씩 묶은 검토 시트 32장을 직접 확인. 노트 상세(SN-DETAIL-01)는 스크롤 상태를 추가 캡처 |
| 수치 | 비교 이미지에서 잰 값은 **추정값**(±10px)으로 표시. DOM에서 잰 값은 "실측" |
| 데이터 차이 | 과제 제목·학생 이름·건수가 Fixture와 Mockup에서 달라도 구조 차이로 보지 않음 |
| 증거 위치 | Scratchpad `measure\audit\` (§9) |

일치 수준: **높음** = 구조·주요 요소 일치 · **중간** = 구조는 같고 일부 요소 누락/차이 · **낮음** = 주요 영역이 비거나 다름 · **부분** = 데이터 상태가 달라 일부만 비교

## 1. Mockup ↔ 구현 매핑 (63/63)

캡처 경로는 Scratchpad `measure\audit\` 기준. 비교 이미지는 모두 `measure\audit\pairs\<Mockup ID>.png`.

| # | Mockup ID | 파일 | 대응 Route / 상태 | 화면 유형 | 비교 | 일치 수준 | 이슈 | 구현 캡처 |
|---|---|---|---|---|---|---|---|---|
| 1 | AE-DETAIL-01 | Advanced-Exploration/AE-Detail/AE-DETAIL-01_Default-Self-Check.png | `/enrichment/tasks/task_001` 자기 점검 탭 | 화면 | O | 중간 | AUD-028, 022 | ae/AE-DETAIL-01.png |
| 2 | AE-DETAIL-02 | …/AE-DETAIL-02_Right-Panel-AI-Assistant.png | 같은 화면, AI 도우미 탭 | Tab | O | 중간 | AUD-017 | ae/AE-DETAIL-02.png |
| 3 | AE-DETAIL-03 | …/AE-DETAIL-03_Right-Panel-Resources.png | 같은 화면, 자료 탭 | Tab | O | 낮음 | AUD-016 | ae/AE-DETAIL-03.png |
| 4 | AE-DETAIL-04 | …/AE-DETAIL-04_Revision-History-Popover.png | 같은 화면, 수정 이력 Popover | Popover | O | 부분 (task_001에 저장된 노트 없음) | AUD-025 | ae/AE-DETAIL-04.png |
| 5 | AE-DETAIL-05 | …/AE-DETAIL-05_More-Options-Menu.png | 같은 화면, 더보기 메뉴 | Popover | O | 높음 | — | ae/AE-DETAIL-05.png |
| 6 | AE-LIST-01 | Advanced-Exploration/AE-List/AE-LIST-01_Default.png | `/enrichment` | 화면 | O | 중간 | AUD-026, 027 | ae/AE-LIST-01.png |
| 7 | AE-LIST-02 | …/AE-LIST-02_Create-Exploration-Modal.png | 같은 화면, 직접 만들기 Modal | Modal | O | 높음 | AUD-004 | ae/AE-LIST-02.png |
| 8 | AE-LIST-03 | …/AE-LIST-03_Selected-Task-Preview.png | `/enrichment?selected=` 선택 상태 | 선택 상태 | O | 중간 | AUD-026, 027 | ae/AE-LIST-03.png |
| 9 | AE-MOCK-01 | Advanced-Exploration/AE-Mock-Exam/AE-MOCK-01_Passage-List.png | `/enrichment/mock-exams` | 화면 | O | 중간 | AUD-029 | ae/AE-MOCK-01.png |
| 10 | AE-MOCK-02 | …/AE-MOCK-02_Passage-Detail-Default.png | `/enrichment/mock-exams/:id` | 화면 | O | 중간 | AUD-029 | ae/AE-MOCK-02.png |
| 11 | AE-MOCK-03 | …/AE-MOCK-03_Passage-Detail-Scrolled.png | 같은 화면, 스크롤 | 스크롤 | O | 중간 | AUD-029 | ae/AE-MOCK-03.png |
| 12 | AE-MY-01 | Advanced-Exploration/AE-My-Explorations/AE-MY-01_My-Explorations-List.png | `/enrichment/my` | 화면 | O | 높음 | — | ae/AE-MY-01.png |
| 13 | AE-UNI-01 | Advanced-Exploration/AE-University-Resources/AE-UNI-01_University-Resources-SNU.png | `/enrichment/universities` | 화면 | O | 중간 | AUD-030 | ae/AE-UNI-01.png |
| 14 | AR-TAB-01 | Archive/AR-Tabs/AR-TAB-01_Recent.png | `/archive` 최근 기록 | Tab | O | 중간 | AUD-033, 035 | ga/AR-TAB-01.png |
| 15 | AR-TAB-02 | …/AR-TAB-02_Favorites.png | `/archive?tab=favorites` | Tab | O | 중간 | AUD-033 | ga/AR-TAB-02.png |
| 16 | AR-TAB-03 | …/AR-TAB-03_Completed.png | `/archive?tab=completed` | Tab | O | 중간 | AUD-034 | ga/AR-TAB-03.png |
| 17 | AR-TAB-04 | …/AR-TAB-04_Previous-Semesters.png | `/archive?tab=previous-semesters` | Tab | O | 높음 | AUD-035 | ga/AR-TAB-04.png |
| 18 | AR-TAB-05 | …/AR-TAB-05_Trash.png | `/archive?tab=trash` (`archiveTrashDemo`) | Tab | O | 중간 | AUD-033 | ga/AR-TAB-05.png |
| 19 | ST_Assessment-Home_01 | Assessment-Home/ST_Assessment-Home_01-Default.png | `/assessment` | 화면 | O | 중간 | AUD-036, 037, 038 | ht/HOME-01.png |
| 20 | ST_Assessment-Home_02 | …/ST_Assessment-Home_02-Scrolled.png | 같은 화면, 스크롤 | 스크롤 | O | 중간 | AUD-037, 038 | ht/HOME-02.png |
| 21 | ST_Assessment-Home_03 | …/ST_Assessment-Home_03-Notification-Popover.png | 같은 화면, 알림 Popover | Popover | O | 높음 | AUD-036 | ht/HOME-03.png |
| 22 | GR-LIST-01 | Growth-Records/GR-List/GR-LIST-01_Default.png | `/growth` | 화면 | O | 높음 | AUD-032 | ga/GR-LIST-01.png |
| 23 | RL-ADD-01 | Resource-Library/RL-Add-Resource/RL-ADD-01_Add-Resource-Modal.png | `/resources` 자료 추가 Modal | Modal | O | 높음 | AUD-004 | rl/RL-ADD-01.png |
| 24 | RL-LIST-01 | Resource-Library/RL-List/RL-LIST-01_Default.png | `/resources` | 화면 | O | 중간 | AUD-031 | rl/RL-LIST-01.png |
| 25 | RL-LIST-02 | …/RL-LIST-02_Subject-Recommended-Sources.png | `/resources?subject=` | 선택 상태 | O | 중간 | AUD-031 | rl/RL-LIST-02.png |
| 26 | SA-SUB-01 | SA-Subject-Lists/SA-SUB-01_Common-Korean-2.png | `/school-assessments?subject=subj_01` | 필터 상태 | O | 중간 | AUD-006, 007, 008 | ours/SA-SUB-01.png |
| 27 | SA-SUB-02 | …/SA-SUB-02_Integrated-Science-2.png | `?subject=subj_02` | 필터 상태 | O | 중간 | AUD-006, 007 | ours/SA-SUB-02.png |
| 28 | SA-SUB-03 | …/SA-SUB-03_Integrated-Social-Studies-2.png | `?subject=subj_03` | 필터 상태 | O | 중간 | AUD-006, 007 | ours/SA-SUB-03.png |
| 29 | SA-SUB-04 | …/SA-SUB-04_Science-Inquiry-Experiment-2.png | `?subject=subj_04` | 필터 상태 | O | 중간 | AUD-006, 007, 011 | ours/SA-SUB-04.png |
| 30 | SAI-01 | School-Academic-Info/SAI-01_School-Academic-Info.png | `/academic-info` | 화면 | O | 높음 | — | ours/SAI-01.png |
| 31 | SAI-02 | …/SAI-02_Term-Selector-Dropdown.png | 같은 화면, 학기 선택 메뉴 | Popover | O | 높음 | — | ours/SAI-02.png |
| 32 | SA-DETAIL-01 | School-Assessments/SA-Detail/SA-DETAIL-01_Default-In-Progress.png | `/school-assessments/assessment_001` | 화면 | O | 낮음 | AUD-013, 014, 015, 003 | detail/SA-DETAIL-01.png |
| 33 | SA-DETAIL-02 | …/SA-DETAIL-02_Topic-Recommendation-Modal.png | 같은 화면, 주제명 추천 Modal | Modal | O | 중간 | AUD-018, 005 | detail/SA-DETAIL-02.png |
| 34 | SA-DETAIL-03 | …/SA-DETAIL-03_Status-Dropdown-Open.png | 같은 화면, 상태 Dropdown 열림 | Dropdown | O (열린 목록은 브라우저 기본 select라 캡처 불가) | 중간 | AUD-019 | ours/SA-DETAIL-03.png |
| 35 | SA-DETAIL-04 | …/SA-DETAIL-04_Status-Before-Start.png | 시작 전 과제 상세 (`assessment_003`) | 상태 변화 | O | 부분 (다른 과제) | AUD-013, 014, 015 | ours/SA-DETAIL-04.png |
| 36 | SA-DETAIL-05 | …/SA-DETAIL-05_Status-In-Progress.png | 진행 중 (`assessment_001`) | 상태 변화 | O | 낮음 | AUD-013, 014, 015 | ours/SA-DETAIL-05.png |
| 37 | SA-DETAIL-06 | …/SA-DETAIL-06_Status-Completed.png | 완료 (`assessment_005`) | 상태 변화 | O | 부분 (다른 과제) | AUD-013, 014, 015 | ours/SA-DETAIL-06.png |
| 38 | SA-DETAIL-07 | …/SA-DETAIL-07_Result-File-Upload-Modal.png | 결과 파일 등록 Modal | Modal | O | 중간 | AUD-005, 020 | detail/SA-DETAIL-07.png |
| 39 | SA-DETAIL-08 | …/SA-DETAIL-08_Right-Panel-Evaluation-Criteria.png | 평가 기준 탭 | Tab | O | 낮음 | AUD-015 | ours/SA-DETAIL-08.png |
| 40 | SA-DETAIL-09 | …/SA-DETAIL-09_Right-Panel-AI-Assistant.png | AI 도우미 탭 | Tab | O | 중간 | AUD-017 | detail/SA-DETAIL-09.png |
| 41 | SA-DETAIL-10 | …/SA-DETAIL-10_Right-Panel-Feedback.png | 피드백 탭 | Tab | O | 중간 | AUD-021 | detail/SA-DETAIL-10.png |
| 42 | SA-DETAIL-11 | …/SA-DETAIL-11_Right-Panel-Resources.png | 자료 탭 | Tab | O | 낮음 | AUD-016 | ours/SA-DETAIL-11.png |
| 43 | SA-DETAIL-12 | …/SA-DETAIL-12_Revision-History-Modal.png | 수정 이력 Popover | Popover | O | 중간 | AUD-025 | detail/SA-DETAIL-12.png |
| 44 | SA-DETAIL-13 | …/SA-DETAIL-13_Request-Teacher-Feedback-Modal.png | 피드백 요청 완료 Modal | Modal | O | 중간 | AUD-005, 021 | detail/SA-DETAIL-13.png |
| 45 | SA-DETAIL-14 | …/SA-DETAIL-14_More-Options-Menu.png | 더보기 메뉴 | Popover | O | 높음 | — | detail/SA-DETAIL-14.png |
| 46 | SA-LIST-01 | School-Assessments/SA-List/SA-LIST-01_Default.png | `/school-assessments` | 화면 | O | 중간 | AUD-006~011 | ours/SA-LIST-01.png |
| 47 | SA-LIST-02 | …/SA-LIST-02_PDF-Import-Modal.png | PDF 가져오기 Modal | Modal | O | 높음 | AUD-040 | pdf/SA-LIST-02.png |
| 48 | SA-LIST-03 | …/SA-LIST-03_Add-Assessment-Modal.png | 수행평가 추가 Modal | Modal | O | 높음 | — | ours/SA-LIST-03.png |
| 49 | SA-LIST-04 | …/SA-LIST-04_Add-Assessment-Modal-Expanded.png | 같은 Modal, 펼침 | Modal 상태 | O | 낮음 | AUD-012 | ours/SA-LIST-04.png |
| 50 | SA-LIST-05 | …/SA-LIST-05_Before.png | `?status=BEFORE_START` | 필터 상태 | O | 중간 | AUD-006, 007 | ours/SA-LIST-05.png |
| 51 | SA-LIST-06 | …/SA-LIST-06_Processing.png | `?status=IN_PROGRESS` | 필터 상태 | O | 중간 | AUD-006, 007 | ours/SA-LIST-06.png |
| 52 | SA-LIST-07 | …/SA-LIST-07_Completed.png | `?status=COMPLETED` | 필터 상태 | O | 중간 | AUD-006, 007 | ours/SA-LIST-07.png |
| 53 | SA-TIPS-01 | School-Assessments/SA-Tips/SA-TIPS-01_TIP01-Connect-Topic-To-Curriculum.png | 상세의 꿀팁 Modal, TIP 01 | Modal 선택 상태 | O | 중간 | AUD-039, 005 | ht/SA-TIPS-01.png |
| 54 | SA-TIPS-02 | …/SA-TIPS-02_TIP03-Make-Topic-Specific.png | TIP 03 | Modal 선택 상태 | O | 중간 | AUD-039 | ht/SA-TIPS-02.png |
| 55 | SA-TIPS-03 | …/SA-TIPS-03_TIP05-Record-References.png | TIP 05 | Modal 선택 상태 | O | 중간 | AUD-039 | ht/SA-TIPS-03.png |
| 56 | SA-TIPS-04 | …/SA-TIPS-04_TIP02-Do-Not-Force-Career-Link.png | TIP 02 | Modal 선택 상태 | O | 중간 | AUD-039 | ht/SA-TIPS-04.png |
| 57 | SA-TIPS-05 | …/SA-TIPS-05_TIP04-Document-Process.png | TIP 04 | Modal 선택 상태 | O | 중간 | AUD-039 | ht/SA-TIPS-05.png |
| 58 | SA-TIPS-06 | …/SA-TIPS-06_TIP06_Consider-Next-Exploration.png | TIP 06 | Modal 선택 상태 | O | 중간 | AUD-039 | ht/SA-TIPS-06.png |
| 59 | SN-DETAIL-01 | School-Assessments/SN-Detail/SN-DETAIL-01_Research-Note-Detail.png | 상세 화면의 탐구 노트 (스크롤) | 화면 영역 | O | 중간 (Fixture 노트 내용이 짧음) | AUD-022, 023 | ours/SN-DETAIL-01-scrolled.png |
| 60 | SN-TEMPLATE-01 | School-Assessments/SN-Templates/SN-TEMPLATE-01_Template-Selection-Modal.png | 템플릿 선택 Modal | Modal | O | 중간 | AUD-024 | sn/SN-TEMPLATE-01.png |
| 61 | TF-LIST-01 | Teacher-Feedback/TF-List/TF-LIST-01_Default-All.png | `/feedback` | 화면 | O | 중간 | AUD-045 | fb/TF-LIST-01.png |
| 62 | TF-LIST-02 | …/TF-LIST-02_Pending-Feedback.png | `/feedback?status=PENDING` | 필터 상태 | O | 높음 | AUD-045 | fb/TF-LIST-02.png |
| 63 | TF-LIST-03 | …/TF-LIST-03_Completed-Feedback.png | `/feedback?status=DELIVERED` | 필터 상태 | O | 중간 | AUD-045 | fb/TF-LIST-03.png |

**합계**: 확인 63/63, 비교 63/63 (SA-DETAIL-03의 열린 목록, AE-DETAIL-04·SA-DETAIL-04·06·SN-DETAIL-01은 상태·데이터가 달라 부분 비교). 독립 Route 19개, 나머지 44장은 같은 화면의 Tab·Modal·Popover·필터·스크롤 상태.
일치 수준: 높음 15 · 중간 37 · 낮음 7 · 부분 4.

**Mockup 없는 구현 화면** (NO-MOCKUP, 기존 Assessment 디자인과의 일관성만 평가): 성장 기록 작성·상세(`/growth/new`, `/growth/:id`), 자료 상세·수정(`/resources/:id`), 꿀팁 화면(`/tips`), 평가계획서 분석 결과 검토(`/school-assessments/pdf-import/:rev`), 피드백 "요청 당시 자료" Modal. 모두 기존 상세 화면 틀(뒤로 링크·제목·Badge·섹션 구분선)을 따라 일관성 문제는 크지 않다.

## 2. 이슈 목록

형식: 유형 / 우선순위 / 관련 파일(`frontend/student/src/features/assessment/` 기준) / 수정 가능성 / 근거. 이미 MM으로 기록된 항목은 MM 번호를 함께 적는다.

### 공통

**AUD-001** · 모든 화면 · Sidebar 하단 `휴지통 N` 메뉴 없음
- 현재: 하단에 `학교·학업 정보`만 있음. Mockup은 그 아래 `휴지통 1`
- 유형 UI-MISSING (관련 CONTRACT-GAP: 삭제·휴지통 정책 OD-A11, MM-06) · P3
- 파일 `routes/AssessmentLayout.tsx` · 수정 가능성: 디자인·정책 결정 필요 (보관함 휴지통 탭으로 연결만 할지)
- 근거: pairs/SA-LIST-01.png 등 모든 화면

**AUD-002** · 모든 화면 · 상단 LearnersHigh Navigation이 Mockup과 다름
- 현재: 실측 높이 50px, "LearnersHigh" 글자 로고, Mentor·School Activity 메뉴. Mockup은 약 43px(추정), 아이콘 로고
- 유형 INTENTIONAL-DIFFERENCE (기존 LearnersHigh 상단 메뉴, CLAUDE.md §12 "일괄 교체 금지") · 수정 대상 아님
- 근거: 모든 pairs 상단

**AUD-003** · 상세·목록 · "시연용 샘플 데이터" 안내 위치가 화면마다 다름
- 현재: 수행평가 상세는 제목 Chip과 속성 사이(본문 상단)에 들어가 속성 목록을 약 40px 아래로 밀고, 다른 화면은 본문 하단
- 유형 UI-DESIGN · P3 · 파일 `components/MockDataNotice.tsx`, `routes/SchoolAssessmentDetailRoute.tsx`
- 수정 가능성: 즉시 (표시 의무는 유지하고 위치만 통일)
- 근거: pairs/SA-DETAIL-01.png

**AUD-004** · Modal 안 선택 Chip · 선택 상태 표현이 Mockup과 다름
- 현재: 직접 만들기 Modal의 과목 Chip, 자료 추가 Modal의 유형 Chip이 선택 시 파란 테두리. Mockup은 검은 배경·흰 글자(목록 필터 Chip과 같은 모양)
- 유형 UI-DESIGN · P3 · 파일 `components/enrichment/CreateEnrichmentModal.tsx`, `components/resources/AddResourceModal.tsx` 및 공용 Chip 스타일
- 수정 가능성: 즉시 · 근거: pairs/AE-LIST-02.png, pairs/RL-ADD-01.png
- **해결 (2026-10-27 통합 보강, 미커밋):** 두 Modal의 선택 Chip을 잉크(진한 배경·밝은 글자) 스타일로 통일(`enrichment.module.css` `.inkChips`). 검증 enh-check AUD-004

**AUD-005** · Modal 너비 (추정치, 비교 이미지 기준)

| Modal | Mockup | 구현 | 차이 |
|---|---|---|---|
| 꿀팁 (SA-TIPS) | 약 765px | 870px (`wide`, 실측 CSS) | +105px |
| 피드백 요청 완료 (SA-DETAIL-13) | 약 460px | 570px (기본) | +110px |
| 결과 파일 등록 (SA-DETAIL-07) | 약 495px | 570px | +75px |
| 주제명 추천 (SA-DETAIL-02) | 약 675px | 570px | −105px |
| PDF 가져오기 (SA-LIST-02) | 약 850px | 870px | +20px |
| 수행평가 추가·자료 추가·직접 만들기·템플릿 | 일치(±5px) | | |

- 유형 UI-DESIGN · P2 (화면 중앙 비율·여백 인상 차이) · 파일 `components/Modal.tsx`(크기 변형 추가), 각 Modal 호출부
- 수정 가능성: 즉시 (Modal 크기 옵션을 `compact 534 / default 570 / wide 870` 외에 늘리는 Frontend 내부 설계)

### Stage 1 — 학교 수행평가·피드백

**AUD-006** · 목록·과목별 목록 · `★ 중요` 열과 `중요` 필터 없음 — CONTRACT-GAP (MM-07: §12 중요 표시·Query 없음, 관련 UI-MISSING) · P2 · `routes/SchoolAssessmentListRoute.tsx` · 계약 확정 후
- **화면 해결 (2026-10-28 사용자 요청, 미커밋):** ★ 열(§30 즐겨찾기, 목록에서만 조작)과 `★ 중요` 필터. 서버 Query가 없어 최대 100건을 받아 화면에서 거름(MM-55, P-23)

**AUD-007** · 목록 · `기록` 열(노트 블록 수·피드백 아이콘)과 행 메타(유형·비율·AI 제한) 없음 — CONTRACT-GAP (MM-11) · P2 · 노트 블록 수·피드백 여부는 다른 API(§19·§31) 조합으로 계산할 수 있으나 과제마다 추가 호출이 필요해 계약 결정 필요
- **부분 해결 (2026-10-28 사용자 요청, 미커밋):** 기록 열 = 노트 수정 이력(NoteRevision 수) + 피드백 말풍선(답변 도착 강조), 각각 상세 수정 이력·피드백 탭으로 이동. 행 메타(유형·비율·AI 제한)와 서버 집계는 남음(MM-55, P-23)

**AUD-008** · 목록 · 날짜 열이 Mockup `평가일·마감`(2줄: "11월 중 / 개요 제출 10.20.") → 구현 `마감`(1줄) — CONTRACT-GAP (MM-03, 과제당 여러 일정 MM-42) · P3

**AUD-009** · 목록 · `일정순`에서 완료·지난 과제가 맨 위에 옴
- 재현: `/assessment/school-assessments` 진입 → 첫 행이 `매체 자료의 신뢰성 평가하기`(9.24 완료). Mockup은 완료 과제가 맨 아래
- 유형 UX-INTERACTION (관련 CONTRACT-GAP MM-12: 허용 Sort·"완료 후순위" 규칙 미정) · P2 · `model/schoolAssessmentView.ts`, Mock `schoolAssessmentMock.ts`
- 수정 가능성: 승인 후 (Sort 규칙 결정 필요. 화면만 재정렬하면 Page 단위 결과와 어긋남)
- **해결 (2026-10-27 승인·통합 보강, 미커밋):** `일정순`에서 화면 표시 순서만 미완료(마감순) → 날짜 미정 → 완료로 정렬(`orderForDisplay`). 서버 Sort 규칙(MM-12)은 미결이라 한 Page를 넘는 목록에서는 Page 경계 순서가 다를 수 있음. 검증 enh-check AUD-009

**AUD-010** · 목록·과목별 목록 · 오른쪽 위 알림 종 없음 (Mockup SA-LIST 전부에 있음) — UI-MISSING (MM-43) · P3 · 홈 `NotificationButton` 재사용 가능 · 디자인 결정 필요(목록에도 둘지)

**AUD-011** · 목록·상세 · 정보 출처 Badge 문구 — Mockup `학생 확인·수정`/`확인 필요`/`직접 등록`, 구현 `평가계획서 연결`/`직접 등록` — CONTRACT-GAP (MM-11, 확인 상태 필드 없음) · P3

**AUD-012** · 수행평가 추가 Modal 펼침 (SA-LIST-04) · 평가 유형, 반영비율·배점, 평가일, 평가 기준, 안내사항·준비물, 안내문 사진·PDF, 개인 메모 없음 (구현은 제출 마감일·설명만) — CONTRACT-GAP (§12 요청 필드, MM-03·15) · P2 · 사진·PDF는 BACKEND-DEPENDENCY(Storage)

**AUD-013** · 상세 속성 · 평가 유형, 평가일, 반영비율, 담당 선생님, 연결된 심화 탐구 행과 "선생님이 AI 글쓰기 도움을 제한한 과제" Badge 없음 — CONTRACT-GAP (MM-03·10) · P2 · 연결된 심화 탐구는 §18 `linkedAssessmentId` 역조회로 Frontend에서 표시 가능(즉시 가능한 부분)
- **추가 (2026-10-28 사용자 요청, 미커밋):** SA-DETAIL-01처럼 제목 아래 속성 목록에 평가 유형·평가일·반영비율·담당 선생님 행을 두고, 노트 위 회색 과제 정보는 학교 수행평가에서 제거. 값이 없으면 "미등록", 분석 값은 "평가계획서 후보 · 확인 필요"
- **부분 해결 (2026-10-27 통합 보강, 미커밋):** 연결된 심화 탐구 행을 속성 목록과 노트 위 과제 정보에 추가(§18 `relatedAssessmentId`). 과제 정보에 반영비율·평가일(평가계획서 분석 "후보 · 확인 필요"), 평가 유형·첨부("미등록"), 담당 선생님("미등록 · 확인 필요")을 표시. 계약 필드·AI 제한 Badge는 여전히 CONTRACT-GAP(MM-49, P-22)

**AUD-014** · 상세 · `안내문·첨부` 영역(사진 썸네일·"안내문 사진·PDF 추가") 없음 — CONTRACT-GAP + BACKEND-DEPENDENCY(Storage, API-OD-A03) · P2
- **화면 부분 해결 (2026-10-28 사용자 요청, 미커밋):** 속성 아래 안내문·첨부 영역(추가·썸네일·파일명·빼기). 이 화면에서만 미리보기(서버 저장 없음), 기존 첨부 데이터는 계약이 없어 비어 있음(MM-56, P-23)

**AUD-015** · 상세 평가 기준 탭 · 모든 과제에서 "평가 기준이 아직 연결되지 않았어요" Empty. Mockup은 기준별 배점·원본 쪽·원문·AI 쉬운 설명·예시·스스로 점검 체크리스트·원본 보기/설명 고치기/오류 신고
- 유형 CONTRACT-GAP (MM-20, §14) + AI-DEPENDENCY(쉬운 설명) · **P1** (상세의 기본 탭이 항상 비어 있어 핵심 학습 흐름이 끊김)
- Stage 7 이후 기회: PDF 가져오기로 만든 과제는 `evaluationItemRef`로 분석 결과의 채점기준 후보(`rubric`)를 가리킬 수 있음 → 계약 결정 시 "평가계획서 후보(확인 필요)"로 먼저 보여줄 수 있음
- 파일 `components/detail/DetailPanel.tsx` · 수정 가능성: 승인 후
- **해결 (2026-10-27 승인·통합 보강, 미커밋):** `components/detail/CriteriaTab.tsx` — 평가계획서 항목 후보(이름·반영 비율·배점·시기·채점 기준 후보·원본 근거 쪽/원문)를 "확인 필요"로, 학생 "내 점검"(저장 안 함), 직접 등록·분석 실패·과목/항목 없음·조회 오류 구분. AI 쉬운 설명·원본 보기·설명 고치기·오류 신고는 남음(MM-50, Stage 3). 검증 enh-check AUD-015

**AUD-016** · 상세 자료 탭 (수행평가·심화 탐구 공통) · "과목별 자료 추천 준비 중" Empty. Mockup은 링크로 바로 추가, 추천 자료원·검색어, 분류 Chip, 자료원 목록(원문 보기·+ 노트에 추가·별표)
- 유형 UI-MISSING · P2 · 파일 `components/detail/DetailPanel.tsx`(`ResourcesTab`)
- **즉시 가능한 부분**: Stage 3에서 만든 §22 추천 자료원(`listRecommendedSources`)과 자료 추가 Modal을 이 탭에 재사용 가능. "노트에 추가"는 Stage 4 편집기의 자료 링크 블록(§20 PUT, MM-34)로 연결 가능. 별표·분류 Chip은 CONTRACT-GAP(MM-21)
- MM-21의 "구현은 준비 중 Empty" 기록은 Stage 3 이후 상황과 맞지 않음 → 갱신 필요
- **해결 (2026-10-27 승인·통합 보강, 미커밋):** `components/detail/ResourcesTab.tsx` — 과목 추천 자료원(분류 필터, "탐색 후보 · 검색 결과 아님", 주소 미확인 자료원은 링크 없음), 내 자료함 검색, URL로 등록·찾은 자료 등록, "노트에 추가"(출처 카드). 자료원 별표·실제 검색 결과는 남음(MM-54). 검증 enh-check A

**AUD-017** · AI 도우미 탭 · 입력창이 목록 바로 아래에 붙음(Mockup은 패널 맨 아래 고정), "AI 글쓰기 제한" 주황 안내 없음 — UI-DESIGN P3(입력창 위치, 즉시) + CONTRACT-GAP(MM-10, 제한 여부 필드) · AI 응답은 BACKEND/AI

**AUD-018** · 주제명 추천 Modal · `희망 진로` 입력, `추천 유형` Chip 4종 없음, 너비 −105px(AUD-005) — CONTRACT-GAP (MM-22, §14) · P3

**AUD-019** · 상태 Dropdown · 브라우저 기본 `select`라 열린 목록 모양이 Mockup(흰 카드·선택 강조)과 다름 — UI-DESIGN · P3 · `components/StatusSelect.tsx` · 즉시 가능하나 키보드·스크린리더 동작을 직접 구현해야 해 공수 있음

**AUD-020** · 결과 파일 등록 Modal · Mockup의 "시연용 샘플 파일" 선택 Chip 없음 — INTENTIONAL-DIFFERENCE에 가까움(시연 제어, 제품 기능 아님) · P3 · 시연 편의가 필요하면 Mock 모드 전용으로만

**AUD-021** · 피드백 탭·요청 완료 Modal · "받는 분 박서연 선생님", 학생 정보·첨부·참고자료 행, "시연: 다음 요청 전송 실패시키기" 버튼 없음 — 받는 분은 INTENTIONAL-DIFFERENCE(ADR-0009 공용 요청함, 담당자 자동 배정 없음), 첨부·참고자료는 CONTRACT-GAP(MM-04), 시연 버튼은 시나리오 Query로 대체 · P3

**AUD-045** · 선생님 피드백 목록 · 답변 작성자 이름, 답변 항목 구조(잘한 점·보완하면 좋을 점·복습할 개념·다음 학습 활동), "시연: 선생님 답변 도착시키기" 없음 — CONTRACT-GAP (MM-24) · P3

### Stage 2 — 심화 탐구

**AUD-026** · 탐구 라이브러리 목록 · 분야 필터 2번째 줄, 행의 분야 Tag·난이도·별표 즐겨찾기 없음 — CONTRACT-GAP (MM-26) · P2

**AUD-027** · 선택 Preview · 분야 Badge, 즐겨찾기 버튼, 문제 상황·참고할 만한 곳·예상 결과물·자기 점검 기준 섹션 없음(구현은 탐구 목표·수행 안내만) — CONTRACT-GAP (MM-26) · P2

**AUD-028** · 심화 탐구 상세 · 속성 `탐구 유형`(분야·난이도) 없음, 자기 점검 탭에 문제 상황·예상 결과물·자기 점검 체크리스트 없음 — CONTRACT-GAP (MM-26) · P2

**AUD-029** · 모의고사 지문 · 계열 필터(인문사회·자연과학·공학), 카드 별표, 상세의 "2026년 3월 고2 학력평가 · 영어 22번" 출처 제목·즐겨찾기·영문 주제·"LearnersHigh 코멘트"·"관련 자율 심화 Task" 없음 — CONTRACT-GAP (MM-28) · P3
- **부분 반영 (2026-10-28 사용자 요청, 미커밋):** 공개 소재를 60선으로 교체하며 카드·상세에 시험 출처(시험·문항·PDF 쪽)와 추천 계열·학과 필터(세부 학과 단위)를 표시. 계열 대분류·카드 별표·영문 주제·코멘트·관련 Task는 남음(MM-28·MM-57, P-24)

**AUD-030** · 대학 공개 자료 · 대학 공식 자료 페이지 카드, 분야 Dropdown 없음 — CONTRACT-GAP (MM-29) · P3

### Stage 3 — 자료함

**AUD-031** · 자료 목록 · 행별 "연결된 수행평가" 열 없음(MM-30), Badge 문구 "출처 확인됨" → "출처 정보 입력됨"(MM-32, 의도적 문구), Mockup에 없는 검색창 추가(의도적) — CONTRACT-GAP / INTENTIONAL · P3

### Stage 4 — 탐구 노트

**AUD-022** · 노트 섹션 · `탐구 노트 v3` 제목 아래에 노트 제목 입력란("탐구 노트")이 한 줄 더 있어 제목이 두 번 보임. Mockup은 섹션 제목 1줄 — UI-DESIGN · P3 · `components/notes/NoteEditor.tsx` · 즉시 (제목 입력을 접거나 섹션 제목과 합치기, §20 `title`은 유지)

**AUD-023** · 노트 편집기 · 블록 드래그, 이미지·PDF 블록, 썸네일 있는 참고자료 카드(작성자·발행일·URL 2열) 없음 — 주원인 CONTRACT-GAP/의존성 (Editor 라이브러리 OD-A05·P-18, 블록 Schema API-OD-A04·MM-33·36, Storage API-OD-A03) · P2

**AUD-024** · 템플릿 선택 Modal · 선택지 "현재 노트 맨 위에 추가" 없음(MM-35), 미리보기에 소제목 아래 항목 예시줄(수행평가명·과목 등)이 Mockup보다 적음 — CONTRACT-GAP / UI-DESIGN · P3 · `components/detail/TemplateModal.tsx`

**AUD-025** · 수정 이력 Popover · 항목 요약(블록 수 변경) 없음, 복원 비활성 — CONTRACT-GAP (MM-23, §21 복원 정책) · P3

### Stage 5 — 성장 기록·보관함

**AUD-032** · 성장 기록 카드 · 오른쪽 "선생님 피드백 1건 / 탐구 노트 1개" 대신 "관련 활동 보기"(MM-37), Mockup에 없는 "성장 기록 쓰기" 버튼(의도적) — CONTRACT-GAP / INTENTIONAL · P3

**AUD-033** · 보관함 · 새 폴더·내보내기가 흐린 비활성(Mockup은 활성 모양), 사용자 폴더, 최근 기록의 피드백 행, 휴지통 "30일"·남은 일수·영구 삭제 없음 — CONTRACT-GAP (MM-39~41, OD-A11) · P3. 별표 버튼은 의도적(MM-40)

**AUD-034** · 보관함 `완료` 탭 · 지난 학기 완료 과제의 메타가 "학교 수행평가"로만 나와 학기를 알 수 없음. Mockup은 지난 학기 항목에 "2026학년도 1학기"
- 재현: `/assessment/archive?tab=completed` → `신과 염기 실험 보고서` 등 2026-1 항목 메타 = "과목 · 학교 수행평가 · 완료"
- 유형 UI-DESIGN · P3 · `model/growthArchiveView.ts`(`archiveMetaLine`이 이전 학기 탭에서만 학기 표시) · 즉시
- **해결 (2026-10-27 통합 보강, 미커밋):** 지난 학기 항목은 모든 탭에서 "2026학년도 1학기"를 표시(원본 학년도·학기 기준). 검증 enh-check AUD-034

**AUD-035** · 보관함 과목 폴더 Chip · Mockup은 채워진 폴더 아이콘·회색 배경, 구현은 선 아이콘·흰 배경 — UI-DESIGN · P3 · `components/growth/growthArchive.module.css`, `AssessmentIcons.tsx` · 즉시

### Stage 6 — 홈·꿀팁

**AUD-036** · 홈 제목 · "김민지님," 학생 이름 없음 — CONTRACT-GAP (MM-42) · P3

**AUD-037** · 홈 AI 입력창 · 그라데이션 테두리(파랑→보라→분홍) 대신 단색 파랑, 심화 탐구 "New" Badge 없음 — UI-DESIGN P3(테두리, 즉시: `--as-*` Token 추가 필요) / CONTRACT-GAP(New 규칙 MM-43)

**AUD-038** · 홈 빠른 실행 · Mockup은 원형 배경·2줄(6+1), 구현은 플랫 컬러 SVG·둥근 사각형 60px·7개 한 줄 — **INTENTIONAL-DIFFERENCE** (사용자가 Daglo 기준으로 직접 지시한 변경). 정렬·가독성·반응형 문제 없음(아이콘 점검 31/31) → 수정 대상 아님

**AUD-039** · 꿀팁 Modal · 과제별 "추천" Badge·추천 순서(01·03·05 먼저)·"'과제명'(과목)에 맞는 팁을 먼저 보여 드려요" 문구 없음(MM-44), 너비 +105px(AUD-005) — CONTRACT-GAP / UI-DESIGN · P3

### Stage 7 — PDF 가져오기

**AUD-040** · PDF 가져오기 Modal · 문서 행에 "분석 성공/실패" 대신 학기·검토 상태 줄, 안내 1줄 추가, "작년 평가계획서 보기" 추가, 업로드 아이콘(Mockup은 초록 PDF 아이콘) — 대부분 INTENTIONAL(MM-45, 시연·정확성 안내) · 아이콘만 UI-DESIGN P3 · 즉시

**AUD-041** · 분석 결과 검토 화면 · Mockup 없음 — NO-MOCKUP. 기존 상세 패턴과 일관. 하단 고정 작업 막대는 다른 화면에 없는 형태라 통합 디자인 때 공용 패턴으로 정리 권장 · P3

### Interaction·반응형·접근성

**AUD-042** · 390px · 작은 터치 대상(24px 미만) — 수행평가 상세 9개, 보관함 7개(별표 버튼), 목록 5개, 자료함 5개, 모의고사 5개, 심화 상세 4개, 성장 기록 3개 (실측) — UX-INTERACTION · P2 (WCAG 2.5.8 최소 24px) · 공용 아이콘 버튼·Chip 높이 조정, 즉시
- **해결 (2026-10-27 통합 보강, 미커밋):** ≤820px에서 글자 링크·뒤로 가기·편집기 손잡이·표 버튼 등 누름 영역 24px 이상, 별표는 공용 버튼 28px. 19개 화면 390px 재측정 0건(일괄 점검 76건). 보이는 글자 크기는 그대로

**AUD-043** · 390px · 탭·다가오는 일정 카드가 가로 스크롤 영역인데 스크롤 가능 표시(그라데이션·화살표)가 없음 — UX-INTERACTION · P3 · 즉시

**AUD-044** · 상태 Dropdown 되돌리기 · 진행 중→시작 전 등 되돌리기 비활성(MM-01·17) — CONTRACT-GAP · P3 (Mockup은 자유 변경 안내)

## 3. 디자인 차이 종합

| 분류 | 건수 | 이슈 | 영향이 큰 화면 |
|---|---:|---|---|
| Layout | 4 | 003, 005, 017, 041 | 수행평가 상세, 꿀팁 Modal |
| Typography | 0 | (제목·본문 크기·굵기는 측정 범위에서 Mockup과 같음) | — |
| Color | 2 | 004, 037 | 홈 AI 입력창, Modal Chip |
| Icon | 3 | 035, 040, (038 의도적) | 보관함, PDF Modal |
| Component | 4 | 004, 019, 022, 024 | 상태 Dropdown, 노트 제목 |
| Responsive | 2 | 042, 043 | 390px 상세·보관함 |
| Interaction | 2 | 009, 044 | 목록 정렬 |
| Missing Feature (UI) | 22 | 001, 006~008, 010~016, 018, 020, 021, 023, 026~033, 036, 039, 045 | 상세 평가 기준·자료 탭, 목록, 심화 탐구 |

**전체 이슈 45건** (AUD-001~045, 주원인 기준): CONTRACT-GAP 24 · UI-DESIGN 10 · UI-MISSING 3 · UX-INTERACTION 3 · INTENTIONAL-DIFFERENCE 4 · NO-MOCKUP 1 · FUNCTIONAL-BUG **0** · BACKEND-DEPENDENCY 주원인 0(관련 원인으로는 014·015·023 등 다수). 위 표는 화면 요소 관점의 교차 분류라 합계가 45와 다르다.

FUNCTIONAL-BUG: 이번 검수에서 데이터 손상·잘못된 학생 데이터·저장 실패 시 입력 손실·Snapshot/Revision 변경을 재현하지 못했다(기존 테스트 11종 재실행 결과 §8 포함). 확인 범위 밖 흐름은 §9 "확인하지 못한 상태"에 적었다.

## 4. 기능 미완료 목록

| 구분 | 항목 |
|---|---|
| Mockup에 있으나 미구현 | 중요 표시(006), 기록 열(007), 안내문·첨부(014), 평가 기준 상세(015), 자료 탭 추천·추가(016), 사용자 폴더(033), 탐구 분야·난이도·즐겨찾기(026~028), 모의고사·대학 자료 메타(029·030), 피드백 답변 구조(045), Sidebar 휴지통(001) |
| UI는 있으나 비활성 | 내보내기(성장 기록·보관함), 새 폴더, 휴지통 복구, 수정 이력 복원, 상태 되돌리기, 노트 내보내기·삭제, 평가 정보 수정, 심화 탐구로 이어가기, 도움말, 홈 AI 입력·보내기, 주제명 추천 실행, AI 요약, 꿀팁 화면의 주제명 추천 |
| Mock에서만 동작 | 모든 저장·조회(§9~§32 Mock Store, 새로고침 시 초기화), PDF 업로드(메타데이터만)·분석 결과(시연 Fixture), 알림(마감 계산) |
| 실제 Backend 필요 | 전체 저장소, File Storage(결과 파일·안내문·PDF), 권한·소유권, 피드백 관리자 답변 |
| AI 필요 | AI 도우미 대화, 평가 기준 쉬운 설명, 주제명 추천, 자료 AI 요약, PDF 분석 |
| API Contract 결정 필요 | CONTRACT-GAP 24건(§2) + MM-01~48 미결 항목 |

## 5. 우선순위별 목록

- **P0**: 없음
- **P1**: AUD-015 (평가 기준 탭 항상 비어 있음)
- **P2**: AUD-005, 006, 007, 009, 012, 013, 014, 016, 023, 026, 027, 028, 042
- **P3**: 나머지 (001, 003, 004, 008, 010, 011, 017~022, 024, 025, 029~037, 039~041, 043~045)
- **대상 아님**: AUD-002, 038 (의도적)

묶을 수 있는 공통 작업: Modal 크기 변형(005·039·018) / Chip 선택 스타일(004·035) / 아이콘 버튼 터치 영역(042) / 상세 자료 탭 재사용(016, 수행평가·심화 탐구 동시) / 안내문 위치(003).

## 6. 기존 MM·P 상태 점검

| 항목 | 현재 상태 |
|---|---|
| 해결된 것 | MM-16(상태 탭별 일정 숨김, 구현 반영), MM-05 중 빠른 실행·AI 입력 영역 UI(배치·비활성 표시), Stage 6 품질 기록의 "빠른 실행 선 아이콘·6+1"(아이콘 개선으로 해소) |
| 갱신 필요 | **MM-21**: "구현은 준비 중 Empty"이지만 Stage 3 이후 §22 추천 자료원 Mock이 있어 Frontend로 일부 해소 가능(AUD-016) |
| Mockup 차이일 뿐 (계약 무관) | AUD-003·004·005·019·022·034·035·037(테두리)·040(아이콘)·042·043 |
| 계약 결정 필요 | MM-01~04·06·07·10·11·12·13·15·17~33·35~48 |
| 사용자·팀 승인 필요 | Editor 라이브러리(P-18), 피드백 받는 분 표시(ADR-0009 확인), 삭제·휴지통(OD-A11), Sidebar 휴지통 메뉴 |
| Backend 이후 | File Storage(MM-18·38·48, API-OD-A03), 개인 정정 조회(MM-47), 알림(MM-43), 홈 요약(MM-42) |
| 제안 | P-01~P-21 모두 PROPOSED 유지. P-10 번호는 비어 있음(기존 문서 그대로) |

## 7. 통합 보완 작업 계획 (제안, 이번 작업에서는 수정하지 않음)

| Phase | 범위 | 선행 조건 |
|---|---|---|
| A. 공통 디자인·Layout | Modal 크기 변형(AUD-005), Chip 선택 스타일 통일(004), 안내문 위치 통일(003), 아이콘 버튼·Chip 최소 24px(042), 가로 스크롤 표시(043), 홈 AI 입력 그라데이션 Token(037) | 없음 (Frontend만, `--as-*` Token 범위) |
| B. 화면별 Mockup 차이 | 상세 자료 탭에 추천 자료원·자료 추가 재사용(016), 노트 제목 줄 정리(022), 보관함 완료 탭 학기 표시(034)·폴더 Chip(035), 상태 Dropdown 커스텀(019), 템플릿 미리보기 예시줄(024), PDF 아이콘(040), 연결된 심화 탐구 역조회 표시(013 일부) | 없음 (Frontend만) |
| C. Interaction·UX | 목록 정렬 완료 후순위(009), 상태 되돌리기(044), 반응형·접근성 재점검 | 009·044는 Sort·전이 정책 승인 |
| D. 계약·서버 의존 | 평가 기준(015), 목록 중요·기록·메타(006·007·008·011), 추가 필드(012·013), 안내문·첨부(014), 심화 탐구 메타(026~030), 피드백 답변 구조(045), 성장·보관함(032·033), 홈 이름·New(036), Editor 라이브러리(023) | api-contract 보완(P-15~P-21), Editor 결정(P-18), Storage·AI·Backend |

1차 통합 보완은 **Phase A + B**(Frontend만으로 안전하게 고칠 수 있는 것)를 권장한다.

## 8. 테스트와 검수의 구분

이번 검수에서 다시 실행한 기존 테스트(Scratchpad `ui-check\`): PDF 66/66, 홈 아이콘 31/31, 홈·꿀팁 57/57, 심화→홈 7/7, 성장·보관함 50/50, 노트 51/51, 자료함 43/43, 심화 65/65, 피드백 32/32, 상세 45/45, 목록·학업 정보 51/52(`favicon.ico` 404 Known Issue). 테스트 통과는 기능 동작 확인이며 Mockup 일치를 뜻하지 않는다(위 이슈는 모두 테스트 통과 상태에서 발견).

반응형·접근성 일괄 점검(`measure\audit-sweep.mjs`): 19개 Route × 4개 폭(1920·1024·820·390) = 76건. 가로 스크롤 0건, 이름 없는 버튼·링크·탭 0건, 콘솔 오류 0건(favicon 제외). 390px에서 화면 밖으로 나간 요소는 모두 의도된 가로 스크롤 영역(탭·다가오는 일정 카드). 작은 터치 대상 수는 AUD-042.

## 9. 검수 증거

| 항목 | 경로 (Scratchpad `…\scratchpad\measure\`) |
|---|---|
| 원본 Mockup | `references/claude-design-mockup/LearnersHighAssessment/Student/**` (Repository, 읽기 전용) |
| 구현 캡처 | `audit\ours\`, `audit\ae\`, `audit\detail\`, `audit\fb\`, `audit\ga\`, `audit\ht\`, `audit\pdf\`, `audit\rl\`, `audit\sn\` |
| 비교 이미지 | `audit\pairs\<Mockup ID>.png` 63장 + `SN-DETAIL-01-scrolled-pair.png` |
| 검토 시트 | `audit\sheets\sheet-01~32.png` |
| 매핑 데이터 | `audit\mapping.json` |
| 캡처·비교 스크립트 | `audit-extra.mjs`, 기존 `*-capture.mjs` 8종, `audit-pair.py`, `audit-sweep.mjs` |
| 브라우저 조건 | Chrome(Playwright) 1920×972 DPR 1.5, `ko-KR`, Mock 모드, 시연 기준일 2026-10-16, 학기 2026-2, 과제 `assessment_001` 기준 |

확인하지 못한 상태 (NOT-VERIFIED):
- SA-DETAIL-03 열린 Dropdown 모양: 브라우저 기본 `select` 목록은 화면 캡처에 나오지 않음
- AE-DETAIL-04: `task_001`에 저장된 노트가 없어 이력 목록 상태 비교 불가(빈 상태만 비교)
- 다크 모드, 브라우저 Zoom 125%·150%, 실제 화면 낭독기(NVDA 등) 청취, 터치 기기 실측: 실행하지 않음
- Backend·Storage·AI·실제 PDF 분석: 구현되지 않아 검수 불가

## 10. 변경 이력

| 날짜 | 내용 |
|---|---|
| 2026-10-27 | 최초 작성 (Stage 1~7 Student Mockup 63장 통합 검수, 코드 변경 없음) |
| 2026-10-28 | 모의고사 60선·참고자료(미커밋): AUD-029 부분 반영. S25 참고자료는 Mockup이 없어 검수 대상 밖(Daglo 구조 참고) |
| 2026-10-28 | 목록·상세 Mockup 복원(미커밋): AUD-006 화면 해결, AUD-007·014 부분 해결, AUD-013 속성 추가. 즐겨찾기 조작은 목록에서만 |
| 2026-10-27 | 통합 보강(미커밋)에서 승인된 AUD 처리 표시: 004·009·015·016·034·042 해결, 013 부분 해결. AUD-005와 그 밖의 AUD는 수정하지 않음 |
