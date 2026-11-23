# A28-51~53 — 노트 PDF 내보내기 · 휴지통/영구 삭제 아이콘 구별 · 휴지통 행 영구 삭제 (2026-11-24)

입력: `A28_51_53_ClaudeCode_Input_20261124.zip`(`CLAUDE_CODE_PROMPT.md` · `README.md` · 이미지 01·02 · 참고 A28-48~50 보고서).
원칙: 사용자 DB·Storage·확정 기록·학생 기록 보존, 원본 작업 트리 미커밋 변경 보존, 최신 integration 기준 새 브랜치, PR #17·main 미변경, 메모리 보호 실행기로 순차 시험, 사용자 데이터 영구 삭제 실행 금지.

> 표기: PASS = 자동 시험 + 실환경 화면 확인 / PASS(자동) = 자동 시험만(실환경은 8080 재시작 필요) / PARTIAL / NOT RUN / FAIL.

## 0. 기준 상태(실제 확인)

| 항목 | 값 |
|---|---|
| 기준 브랜치 | `origin/integration/assessment-studentcare-20261116` = `5517806`(PR #19 병합 `277047f` + 병합 기록 문서) |
| main | `c03a1a4`(변경 없음) |
| PR #19 | 병합 완료(재사용하지 않음) · PR #17 Draft·미병합(건드리지 않음) |
| 원본 작업 트리 | `C:\learnershigh-assessment-integration`(integration 브랜치, 미커밋 약 500건) — 커밋·reset·stash 없음. 이번 변경 22파일만 새 worktree 로 옮김 |
| 새 worktree/브랜치 | `C:\learnershigh-a28-51-53` · `feature/a28-51-53-pdf-trash-uat`(시작 `5517806`) |
| 사용자 환경 | 8080(사용자 Backend, 이번 변경 전 코드) · 5173 학생 Vite · 5174 관리자 Vite · MySQL `lh-local-run-mysql`(running, OOM 없음) |
| 사용자 DB | Flyway 31건(마지막 `202611231000`), 표 42개 |

## 1. 항목별 결과

| 항목 | 이미지 | 결과 | 원인 → 수정 |
|---|---|---|---|
| A28-51 노트 내보내기 → PDF | 01 | **PASS(자동)** — 실환경 화면은 메뉴·오류 처리까지 확인, 실제 PDF 받기는 **8080 재시작 뒤** 가능(지금 8080 은 이전 코드라 `note-export` 404) | 원인: A28-49 의 내보내기는 브라우저에서 Markdown(.md) 문자열을 만든 것. → 서버 `POST .../school-assessments/{id}/note-export`(§20-1)가 **저장된 최신 노트 Revision** 으로 PDFBox 텍스트 PDF 를 만든다(그림 캡처 아님, 글 선택·검색 가능). 화면은 응답을 `application/pdf` 로 받아 `제목_탐구노트_yyyy-MM-dd.pdf` 로 저장 |
| A28-52 휴지통 vs 영구 삭제 아이콘 | 01 | **PASS** | 원인: 메뉴의 '휴지통으로 이동'·'삭제'가 같은 `TrashIcon`. → '삭제'를 **'영구 삭제'** + 새 `CircleXIcon`(X 원, 같은 선 굵기)로. 휴지통 항목은 휴지통 아이콘 유지. 둘 다 빨간 경고색(기존 danger 스타일) 그대로, 위치·키보드 동작 그대로 |
| A28-53 휴지통 행 영구 삭제 | 02 | **PASS**(실환경은 확인 창 열기·취소까지, 실제 삭제는 격리 E2E 에서만) | 원인: 휴지통 행에 '복구'만 있었음. → 학교 수행평가 행에 '복구' 옆 **같은 높이·모서리·테두리·글자 크기** '영구 삭제'(X 원 아이콘 + 빨간 글자). 기존 `DeleteSchoolAssessmentModal`·§12-1 API 그대로 재사용. 성공하면 그 행만 즉시 빠지고 목록·건수 다시 읽음 |

## 2. 수정 파일 · 주요 함수

- Backend(신규): `NoteExportController`(§20-1) · `NoteExportService.export/fileName/metaPairs` · `NotePdfRenderer.render`(블록별 그리기·줄바꿈·쪽 나눔·쪽 번호·이미지 상한) · `ExportFontLocator.find`. 수정: `NoteAttachmentService.imageForExport`(본인 첨부·SHA 재확인 바이트), `AssessmentErrorCode.EXPORT_FONT_UNAVAILABLE`(503).
- Backend 시험: `NotePdfRendererTest`(신규 3) · `SchoolAssessmentDeletionApiTest`(+ PDF 내보내기 통합 1).
- Frontend(학생): `model/noteExport`(Markdown 생성 제거 → `noteExportRequest`·`pdfFileName`·`exportFileName(.pdf)`, 시험 교체) · `api/http/assessmentHttpClient.postForFile` · `recordsHttp.exportNotePdfHttp` · `assessmentDetailApi.exportNotePdf` · `SchoolAssessmentDetailRoute.exportNote`(저장 전 안내·중복 방지·진행/오류 표시·임시 주소 해제) · `detailMenuItems`(영구 삭제 아이콘·라벨, 만드는 중 항목) · `AssessmentIcons.CircleXIcon` · `ArchiveRoute`(휴지통 행 버튼·확인 창·행 제거) · `growthArchive.module.css`(`.trashActions`·`.dangerSmallButton`·포커스 테두리).
- E2E: `a28-51-53.spec.ts`(신규 5) · `a28-48-50.spec.ts`(내보내기 .pdf · 메뉴 '영구 삭제').
- 계약: §20-1 신규(DRAFT), §12-1 에 화면 연결 메모, 오류표 `EXPORT_FONT_UNAVAILABLE`. 화면 맵 S23 갱신.

## 3. A28-51 PDF 설계와 품질 확인

- **방식 선택**: Backend 에 이미 있는 PDFBox 3.0.5 로 서버 생성(새 의존성 없음). 클라이언트 PDF 라이브러리는 한글 글꼴 파일을 번들해야 해 제외. 글꼴은 서버 OS 설치 글꼴(Windows 맑은 고딕, Linux Nanum·Noto CJK 순, 설정 `assessment.export.pdf-font-path`)을 **부분 임베드** — 저장소에 글꼴 파일 추가 없음. 글꼴이 없으면 빈 PDF 대신 `503 EXPORT_FONT_UNAVAILABLE`.
- **내용**: 제목 · 과목 · 진행 상태/평가 유형/평가일/제출 마감/반영 비율/제출물(값 없으면 '미정') · 노트 기준(서버 저장 vN·저장 시각, 없으면 '저장된 노트 없음') · 내보낸 날짜 · 노트 제목 · 본문 블록 원문 그대로 · 첨부 목록(이름·유형·크기·저장 여부) · 쪽 번호.
- **블록**: 화면 편집기가 지원하는 20종(HEADING·PARAGRAPH·BULLET·NUMBERED·CHECKLIST·QUOTE·TOGGLE·CALLOUT·CODE·MATH·DIVIDER·TABLE·CHART·RESOURCE_LINK·EXAM_SOURCE·LINK·IMAGE·FILE·VIDEO·MAP)을 조사해 각각 표현. 모르는 형식도 글을 버리지 않음. 글꼴에 없는 글자(일부 이모지)는 '?'(빈 네모 없음).
- **이미지**: 블록의 `attachmentId` 가 **이 학생 소유 노트 첨부**이고 PNG·JPEG·GIF 이면 저장 바이트(크기·SHA 재확인)를 본문 폭에 맞춰 넣음(잘림·겹침 없음, 남은 쪽 높이가 모자라면 다음 쪽). WEBP·PDF·HWP·Office·남의 첨부·바이트 없는 이전 첨부·깨진 그림은 본문에 '[이미지/PDF/파일 첨부] 이름 (사유)' + 첨부 목록. 외부 URL 은 읽지 않음. 상한: 본문 이미지 30개·1개 15MB·합계 60MB·4,000만 화소.
- **저장 전 편집**: 편집이 저장되지 않았으면 확인 창("PDF는 서버에 저장된 노트(vN) 기준… 먼저 저장하려면 '취소'") → 취소하면 내보내지 않음. 진행하면 PDF 머리말에 기준 Revision 표시, 완료 알림에도 "저장 안 된 편집은 빠졌어요".
- **중복·진행·오류**: 만드는 중 메뉴 항목이 '노트 내보내기 (PDF 만드는 중…)'로 바뀌고 비활성(요청 1회만), 'PDF를 만드는 중이에요…' 알림, 실패 시 'PDF를 만들지 못했어요. <서버 이유>', 받은 뒤 임시 주소 10초 뒤 해제. 관리자 학생 화면 보기·시연 데이터에서는 이유만 알림(관리자 경로 없음).
- **실파일 검사(이번 실행)**:
  - 단위: 한글 장문(띄어쓰기 없는 긴 문장 포함) 60문단 + 목록·표·이미지 PNG 1600×900/JPEG 400×1800 + 남의/이전/HWP 첨부 + 모르는 블록 + 이모지 → `%PDF-` · **5쪽** · 이미지 2개 · 텍스트 추출로 모든 문단·특수문자(`& · % " <>`)·긴 문장 글자 손실 없음 · 쪽 번호. 빈 노트 1쪽. 상한 31~32번째·깨진 그림은 사유 표시.
  - 쪽 그림: 합성 시험 PDF 의 1·3·5쪽을 pdf.js 로 그려 눈으로 확인 — 한글 깨짐·□ 없음, 이미지 폭 맞춤, 쪽 번호(로컬 `C:\learnershigh-local-run\a28-51\pdf\sample-p1/p3/p5.png`, 저장소에 넣지 않음).
  - 통합: 실제 API → `application/pdf`, `filename*=UTF-8''나의 20세기 역사 탐구_탐구노트_…pdf`(`:` 제거), 최신 Revision(v2)만(이전 v1 글 없음), 이미지 본문 배치·PDF 첨부는 목록, 남의 학생 404·비인증 401·휴지통 항목 404.
  - E2E: 45문단+이미지 2+PDF 첨부 노트를 화면 메뉴로 받음 → 파일 이름·시그니처·**2쪽 이상**·pdf.js 텍스트 추출(첫 쪽 제목·메타, 중간·마지막 문단, 첨부 목록, 마지막 쪽 'N / N'), U+25A1/25A0/FFFD 없음. 빈 노트·저장 전 확인 창(취소 시 다운로드 없음)·만드는 중 비활성·500 실패 알림.

## 4. A28-53 휴지통 영구 삭제 — 권한·409·보존

- API 는 §12-1 그대로(코드 재확인): 학생 본인만(남의 ID 404, 비인증 401), 활성·휴지통 모두 대상, 제목 불일치 400, `official`·`feedbackRequests`·`growthRecords` 409(데이터 그대로). 한 Transaction 으로 노트·Revision·결과물·버전·안내문 첨부 행·즐겨찾기·수행평가 행 삭제 후 커밋 뒤 결과물·안내문 바이트 삭제. **노트 첨부 행·바이트, 상태 감사 이력은 남김**(다른 Revision·Snapshot 이 가리킬 수 있음) — 완화하지 않음.
- 화면: 휴지통 목록의 학교 수행평가 행에만 버튼(목록 항목 = 수행평가 객체, 연결 노트만 따로 지우지 않음 — 확인 창 문구도 "탐구 노트·수정 이력·결과물 파일·안내문 첨부가 모두 지워지고"). 다른 종류(결과물·자료·성장 기록) 휴지통 행은 영구 삭제 API 가 없어 '복구'만. 관리자 학생 화면 보기에서는 휴지통 행의 복구·영구 삭제 버튼을 모두 숨김(서버도 student-view 쓰기 경로 없음). 시연 데이터는 이유 알림.
- 409 문구: 학교 확정 자동 등록 / 피드백 요청 기록(선생님 기록 보존) / 성장 기록 연결 — 확인 창 안에 표시, 행 유지.

## 5. 시험(이번 회차 실제 실행)

| 항목 | 결과 | 증거(로컬) |
|---|---|---|
| `verify-frontend.ps1`(typecheck·oxlint `--deny-warnings`·build, 학생·관리자) | **PASS** | — |
| Node `*.test.mjs` 전체 | **47 파일 201/201** | — |
| Backend 단위(ArchUnit 포함) | **480 · 실패 0 · skip 3** | `a28-43/tests/a2851-unit.log` |
| Backend 통합 `SchoolAssessmentDeletionApiTest`(PDF 1 + 영구 삭제 3) | **4/4**(skip 0) | `a28-43/tests/a2851-it-xml` |
| E2E 신규·수정 스펙(1차) | 7/8 — `[A28-51] 상태` 1건: 만드는 중 항목이 **의도대로 비활성**이라 시험의 일반 클릭이 기다리다 시간 초과 → 시험을 `aria-disabled` 확인 + 강제 클릭(요청 1회)로 고침 → **5/5** | `a2851-new.log`·`a2851-new2.log` |
| **Assessment E2E 전체**(29 파일, 일회용 DB 3묶음) | **33 + 39 + 17 = 89/89** | `e2e51-full-1~3.log` |
| **REPLAY**(실측 원본 8) | **8/8** | `replay51.log` |
| 메모리 | 실행 내내 남은 메모리 3.9~5.3GB, 중단 기준(1.2GB) 도달 없음, 사용자 MySQL running·OOM 없음 | `a28-43/tests/summary.txt` |
| 사용자 DB/Storage 전후 비교(읽기 전용) | 표 42개 행 수·`CHECKSUM TABLE` **동일**, Storage 3,408 파일 목록 해시 **동일**, Flyway 31건(`202611231000`) | `a28-43/backup/*-a2851-before/after.tsv` |
| GitHub CI | §7 참고 | |

## 6. 실환경 화면(읽기 전용, 800·1366·1600·1920)

사용자 5173(이번 화면 코드) + 8080(이전 Backend). 비-GET 은 모두 차단하고 쓰기가 없는 `note-export` POST 만 통과. 사용자 데이터에 영구 삭제·복구를 누르지 않음.

- ⋯ 메뉴: `평가 정보 수정 · 심화 탐구로 이어가기 · 성장 기록에 남기기 · 노트 내보내기 · 휴지통으로 이동 · 영구 삭제`, 휴지통 항목 아이콘에 원 없음 / 영구 삭제 아이콘은 X 원 — 4해상도 모두.
- 휴지통(이미지 02 의 행): '복구'·'영구 삭제' 같은 높이, 화면 안, 가로 넘침 0. 영구 삭제 → 확인 창(제목 입력 전 버튼 비활성) → '취소'.
- 노트 내보내기: 8080 이 이전 코드라 `404 .../note-export` → 화면은 받기 없이 실패 알림(이 404 가 유일한 API 4xx). **8080 재시작 뒤 실제 PDF 받기 확인 필요**(§9).
- 캡처: `C:\learnershigh-local-run\a28-51\screens\52-menu-*.png` · `53-trash-*.png` · `53-modal-1600.png` · `51-export-1600.png`, 결과 JSON `a28-51\ui-check-51.json`(개인정보가 보이는 캡처라 저장소에 넣지 않음).

## 7. Migration

**없음.** 새 표·열 없음(PDF 는 요청마다 만들고 저장하지 않음, 영구 삭제는 기존 표의 행 삭제). 사용자 DB Flyway 31건 그대로.

## 8. GitHub

- 브랜치 `feature/a28-51-53-pdf-trash-uat`(시작 `5517806`) · 커밋 `07c386a`(코드·시험·계약·보고서 24파일, 일반 push) + 이 보고서 갱신 커밋.
- **PR #20** `https://github.com/csy5271abcd/learnershigh-extension/pull/20` → `integration/assessment-studentcare-20261116`, **Draft**(§20-1·§12-1 DRAFT 계약 · 8080 재시작 뒤 사용자 직접 확인 필요). 자동 병합하지 않음.
- GitHub CI(`07c386a`): Harness·Frontend·E2E(Student Care)·Backend(1회) **success**. 다른 Backend 실행 1회는 통합 시험 305건 중 **`SchoolInfoSelectionClassificationApiTest` 1건 실패**(A28-37 부터 반복된 간헐 실패, 이번 변경과 무관한 학교알리미 분류 시험 — 같은 커밋의 다른 실행은 통과). 재실행 성공으로 '해결'이라 하지 않음 — 원인 미확정 그대로.
- CI 의 Linux 실행기에는 한글 글꼴이 없을 수 있어 PDF 렌더 단언(`NotePdfRendererTest`·통합 시험의 200 부분)은 CI 에서 건너뛰었을 수 있다(통합 skip 2). PDF 품질은 로컬(Windows 맑은 고딕) 단위·통합·E2E 로 확인했다. CI 에 글꼴 설치는 공유 workflow 변경이라 하지 않음.
- `main`(`c03a1a4`)·PR #17(Draft·미병합)·PR #19 브랜치 변경 없음(fetch 로 확인).

## 9. 남은 제한 · 직접 확인 순서

1. **8080 재시작 필요**(Backend 신규 API §20-1). 재시작 뒤:
   - `http://localhost:5173/assessment/school-assessments/<본인 수행평가 ID>` → 오른쪽 위 `⋯` → **노트 내보내기** → `제목_탐구노트_날짜.pdf` 가 받아지는지, 열어서 한글·이미지·쪽 번호 확인. 노트를 고친 뒤 저장 전에 누르면 '먼저 저장' 확인 창이 떠야 함.
   - 같은 메뉴에서 '휴지통으로 이동'(휴지통 아이콘)과 '영구 삭제'(X 원 아이콘) 구별.
   - `http://localhost:5173/assessment/archive?tab=trash` → 행 오른쪽 '복구' 옆 '영구 삭제' → 제목 그대로 입력 → **영구 삭제**(되돌릴 수 없음 — 지워도 되는 항목에서만).
2. Linux 서버 배포 시 한글 글꼴(Nanum 또는 Noto CJK) 설치 또는 `assessment.export.pdf-font-path` 설정 필요 — 없으면 503 안내(단위 시험은 글꼴이 없으면 건너뜀).
3. 제목·본문 글꼴은 한 가지 굵기(맑은 고딕 Regular) — 제목은 크기로만 구별.
4. 휴지통의 결과물·자료·성장 기록 행은 영구 삭제 API 가 없어 '복구'만.
5. §20-1·§12-1 은 DRAFT(팀 승인 별도). 간헐 실패 `SchoolInfoSelectionClassificationApiTest`(이전부터, 원인 미확정)는 이번 변경과 무관.
