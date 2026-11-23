# A28-48~50 — 학생 탐구 노트·홈 화면 보완 (2026-11-23 22:40~)

입력: `A28_48_50_ClaudeCode_Input_20261123.zip`(`CLAUDE_CODE_PROMPT.md` · 이미지 1~3). 원칙: 사용자 DB·Storage·확정 기록·학생 기록 보존, 원본 작업 트리 미커밋 변경 보존, PR #19 브랜치 기준, PR #17 미변경, 메모리 보호 실행기로 순차 시험.

> 표기: PASS = 자동 시험 + 실환경 화면 확인 / PASS(자동) = 자동 시험만 / PARTIAL / NOT RUN / FAIL.
> 실환경 확인은 사용자 8080(21:22 시작 · A28-43~47 코드) + 5173(Vite, 이번 화면 코드)에 비-GET 요청을 막은 자동 브라우저로 했다(사용자가 직접 누른 결과 아님).

## 1. 항목별 결과

| 항목 | 이미지 | 결과 | 내용 |
|---|---|---|---|
| A28-48 학생 노트 첨부 바로 미리보기 | 1 | **PASS** | 노트 이미지·파일 블록에 '미리보기'(이미지는 그림을 눌러도 열림) → 같은 화면 창 `NoteFilePreviewModal`: 이미지(화면 맞춤·확대·축소·원래 크기), PDF(대학별 자료와 같은 pdf.js `PdfViewer` — 쪽 이동·확대·축소·폭 맞춤), 그 밖 형식은 '앱 안 미리보기 미지원 · 내려받아 확인' + 내려받기. '새 탭 ↗'·'내려받기' 유지. 서버 미리보기 API(§26-1, 본인 첨부·SHA 재확인)만 쓰고 닫으면 임시 주소 해제. 관리자 '학생 화면 보기'에서는 같은 함수가 읽기 전용 경로로 간다. 실환경: 이미지 1 화면의 PNG(2836px)·PDF(22쪽) 미리보기 열림 |
| A28-49 ⋯ 메뉴 전부 동작 | 2 | **PASS(삭제는 서버 변경 → 8080 재시작 뒤 실환경)** | '준비 중' 0개. 평가 정보 수정 → 본문과 같은 수정 창 · 심화 탐구로 이어가기 → `/assessment/enrichment`(심화 탐구 첫 화면) · 성장 기록에 남기기(기존) · 노트 내보내기 → 서버 저장본을 Markdown(.md) 파일로(제목·과목·진행 상태·평가 유형·평가일·마감·반영 비율·제출물·노트 버전·본문 블록·첨부 목록, 저장 안 된 편집은 빠졌다고 알림) · 휴지통으로 이동(A28-46 그대로) · **삭제**(영구, §3) |
| A28-50 표시 날짜 dropdown | 3 | **PASS** | 학생 홈 일정 상세의 '표시 날짜'를 관리자 dropdown(`review.select`)과 같은 모양으로: 높이 40px · 둥근 10px · 연한 테두리(`--as-color-line`) · 14px · hover/포커스 테두리. 날짜 목록(원문 범위 안)·선택 즉시 저장·'기본 위치로' 동작은 그대로 |
| 학교 검색 회귀 | — | 확인(이전 회차 8080 재시작 뒤 PASS, 이번 코드 변경 없음) | |

## 2. 수정 파일 요약

- Backend: `SchoolAssessmentDeletionController`·`SchoolAssessmentDeletionService`(신규), 저장소 6개에 조회·삭제 메서드 추가(수행평가·결과물·피드백 요청·성장 기록·안내문 첨부·즐겨찾기). 시험 `SchoolAssessmentDeletionApiTest`(신규).
- Frontend(학생): `NoteFilePreviewModal`·`DeleteSchoolAssessmentModal`·`model/noteExport`(+시험) 신규, `NoteBlockParts`(미리보기 버튼), `detailMenuItems`·`SchoolAssessmentDetailRoute`(메뉴 동작·내보내기·삭제 창), `homeDashboard.module.css`(dropdown), `noteEditorModel`(블록 메뉴의 '서버 저장 안 됨' 옛 설명 정정), API 함수.
- E2E: `a28-48-50.spec.ts`(신규), `a28-33-calendar-placement`(dropdown 모양 단언 추가), `a28-43-47`(메뉴에 '삭제'가 생긴 것 반영).
- 계약: §12-1 수행평가 영구 삭제(DRAFT).

## 3. 수행평가 삭제(영구) 정책 — §12-1

`POST /api/student/assessment/school-assessments/{id}/permanent-delete { confirmTitle }` → 204. 휴지통 이동(복원 가능)과 구분되는 되돌릴 수 없는 삭제.

| 경우 | 동작 |
|---|---|
| 학생이 직접 만든 수행평가(활성·휴지통) | 제목을 그대로 적어야 버튼이 켜짐 → 노트·노트 Revision, 결과물·결과물 버전, 안내문 첨부 행, 즐겨찾기, 수행평가 행을 한 Transaction 으로 삭제 → 커밋 뒤 결과물·안내문 파일 바이트 삭제 |
| 학교 확정 자동 등록 항목 | 409 `official` — 공식 확정값과 연결되고 동기화가 다시 만들 수 있어 휴지통만 |
| 선생님께 피드백을 요청한 항목 | 409 `feedbackRequests` — 요청 당시 Snapshot·답변(관리자 기록) 보존. 휴지통만 |
| 성장 기록이 연결된 항목 | 409 `growthRecords` — 다른 기록을 깨지 않게 막음 |
| 남은 것 | 노트 첨부(§26-1) 행·바이트와 상태 변경 감사 이력은 남긴다(다른 노트 Revision 이 가리킬 수 있음·감사 기록) |

- 권한: 학생 본인만(남의 ID 404, 비인증 401). 관리자 경로 없음. Migration 없음(기존 표의 행 삭제).

## 4. 시험(이번 회차 실제 실행)

| 항목 | 결과 |
|---|---|
| Frontend `verify-frontend.ps1` · typecheck · lint | PASS |
| Node | 45 파일 **194/194**(신규 노트 내보내기 2) |
| Backend 단위(ArchUnit 포함) | **477** · 실패 0 · skip 3 |
| Backend 통합 신규 `SchoolAssessmentDeletionApiTest` | 로컬 **3/3**(2026-11-24, 보호 실행기). CI: 첫 push(`3683655`) 에서 시험 데이터가 공식 연결 CHECK 를 어겨 1건 실패 → 시험 데이터만 고침(`6d60708`) → CI 통과 |
| Assessment E2E 전체(28파일, 일회용 DB 3묶음, 2026-11-24) | **33 + 34 + 17 = 84/84** — 실행 내내 사용자 DB 정상(남은 메모리 4GB 안팎) |
| REPLAY(실측 원본) | **8/8** |
| 실환경 화면(읽기 전용, 800·1366·1600·1920) | 노트 미리보기 이미지·PDF 열림, 메뉴 6개(준비 중 0), 내보내기 .md 실제 다운로드(내용 확인), 평가 정보 수정 창, 삭제 확인 창(제목 입력 전 버튼 비활성 — 실제 삭제는 누르지 않음), 심화 탐구 이동, 표시 날짜 dropdown 모양 일치. 가로 넘침 0 · API 4xx/5xx 0 · 차단한 쓰기는 학생 화면 자동 POST `official/ensure` 1종. 캡처: 로컬 실행 폴더 `a28-43/screens/48-*`·`49-*`·`50-*` |

## 5. Migration

없음. 사용자 DB 는 Flyway 31건(`202611231000`) 그대로.

## 6. GitHub

- PR #19(`feature/a28-30-35-uat-fixes` → integration) 커밋: `1f0159f` 영구 삭제 · `4dcbf31` 학생 화면 3건 · `3683655` 보고서 · `6d60708` 삭제 시험 데이터 수정. 일반 push, Draft 유지. PR #17·main 변경 없음.
- GitHub CI(`6d60708`): pull_request 실행 Harness·Frontend·Backend(단위+통합 전체)·E2E(Student Care)·CI Result **모두 success**. push 실행은 Backend 통합에서 간헐 실패 시험 `SchoolInfoSelectionClassificationApiTest` 1건 실패(같은 단언, 원인 미확정 — CI 가 시험 보고서를 산출물로 올리지 않아 진단 메시지를 볼 수 없음).
- 2026-11-24: 메모리 확보 뒤 보호 실행기로 삭제 IT 3/3 → E2E 전체 84/84 → REPLAY 8/8. 시험한 원본 트리 = PR #19 head `4e29dbc`(차이는 PR 쪽 보존 연구 자료 79개뿐) 확인.
- **PR #19 병합: 완료.** Draft → Ready 뒤 `integration/assessment-studentcare-20261116` 에 merge commit `277047f` 로 병합(커밋 이력 보존, head SHA 고정). 병합 트리 = PR head, 이전 integration 커밋(`79b5ac5`) 보존.
- 병합 시점 CI(`4e29dbc`): pull_request 실행 전체 success, push 실행은 간헐 실패 `SchoolInfoSelectionClassificationApiTest` 1건(이번 변경 전부터 있던 문제, 원인 미확정) — 사용자 지시의 병합 조건(E2E 전체 + REPLAY 통과)은 충족해 병합했다.
- `main`(`c03a1a4`) 변경 없음. PR #17(integration → main)은 Draft 유지·미병합(head 가 integration 을 따라 `277047f` 로 갱신된 것뿐).
- 병합 뒤 문서 정리: `assessment-screen-map.md` S21·MM-32 행에 A28-47(출처 배지·AI 요약 제거) 반영, 이 보고서와 A28 종합 보고서 요약 갱신. 삭제한 문서 없음(역사 보고서·연구 자료는 보존).
- 사용자 DB: 컨테이너 재시작·OOM 없음, 마지막 점검까지 행 수 변화 없음. Migration 없음.
