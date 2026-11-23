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
| Backend 통합 신규 `SchoolAssessmentDeletionApiTest` | (아래 갱신) |
| Assessment E2E 전체 | (아래 갱신) |
| REPLAY | (아래 갱신) |
| 실환경 화면(읽기 전용, 800·1366·1600·1920) | 노트 미리보기 이미지·PDF 열림, 메뉴 6개(준비 중 0), 내보내기 .md 실제 다운로드(내용 확인), 평가 정보 수정 창, 삭제 확인 창(제목 입력 전 버튼 비활성 — 실제 삭제는 누르지 않음), 심화 탐구 이동, 표시 날짜 dropdown 모양 일치. 가로 넘침 0 · API 4xx/5xx 0 · 차단한 쓰기는 학생 화면 자동 POST `official/ensure` 1종. 캡처: 로컬 실행 폴더 `a28-43/screens/48-*`·`49-*`·`50-*` |

## 5. Migration

없음. 사용자 DB 는 Flyway 31건(`202611231000`) 그대로.

## 6. GitHub

(반영 뒤 갱신)
