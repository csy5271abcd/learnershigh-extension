# A28-37~42 — 최종 UAT 보완 · 학생 첨부 실제 저장 · GitHub 통합 (2026-11-23)

입력: `A28_37_Final_UAT_GitHub_20261123.zip`(지시서 · 사용자 화면 7장 · A28-36 실행 보고서). ZIP 내부 SHA-256 은 MANIFEST 와 10/10 일치를 확인했다.
원칙: 사용자 DB·Storage·확정 이력·학생 기록 보존, 실제 문서 재분석·승인 없음, 쓰기 시험은 일회용 DB/Storage 에서만, 원본 작업 트리 미커밋 변경 보존(커밋은 PR #19 worktree 에서만).

> 상태 표기: PASS = 자동 시험·실환경 확인 모두 통과 / PASS(자동) = 자동 시험만 / PARTIAL / BLOCKED / NOT RUN.
> **사용자가 직접 눌러 본 결과가 아니다.** 실환경 확인은 사용자 8080(이전 코드) + 5173/5174(Vite, 새 화면 코드)에 비-GET 요청을 차단한 자동 브라우저로 했다.

## 1. 항목별 판정

| 항목 | 이미지 | 판정 | 근본 원인 → 수정 |
|---|---|---|---|
| A28-37 학생 주차 목록 빈 화면 | 01 | **PASS** | A26 부터 'n월 m주' 행을 달력 줄에 임시 배치하면서 `weekBands` 에서 빠졌고, 목록은 `weekBands` 와 `dateFrom === 칸 날짜` 행만 모았다 → 주차 행만 있는 달은 목록 0개. 이전 달에서 시작하는 기간 행도 같은 조건으로 빠졌다. `weekListGroups()`(순수 함수)로 달력과 같은 배치 결과를 원문 시기(월 전체 · n월 m주 · n월 m~k주 · 원문 날짜/기간 · 학기 n주차 · 미확인)로 묶는다. 목록 항목 수 = 달력 위 'N개'(정의 동일, 중복 0). 관리자 검토 화면도 같은 컴포넌트라 함께 고쳐진다 |
| A28-38 확정 내용 수정 | 02 | **PASS(기존 기능 노출 보완)** | 이미 구현돼 있었다: 평가 정보 §39-8(재검토 → 초안 → 다시 최종 승인 = 새 확정 기록, 이전 기록 불변), 운영계획 §39-10. 그러나 결과 화면 머리 '확정 내용 수정'과 검토 화면 확정 단계의 진입점이 **PDF 문서에서만** 보였다(A28-05 이전 규칙). 이미지 02 는 학교알리미 HWP 라 버튼이 없었다. `canEditConfirmed(형식, 출처)` = PDF 또는 학교알리미 수집 원본(§39-14 서버 원본 검증으로 재승인 가능). 관리자 직접 업로드 HWP·HWPX 는 운영 확정 경로가 없어(verified_auth_required) 그대로 숨김. 운영계획 재검토 버튼 이름을 '운영계획 수정'으로 맞췄다 |
| A28-39 '검토 시작' 단일 진입 | 03·04·05 | **PASS** | 목록에 '분석 시작'·'검토 시작'·'AI 결과 보기'·'확정 결과 보기'가 상태마다 섞여 있었다. 문서당 주 CTA 하나(`planListAction`): 분석 전 '검토 시작'(실제 분석 요청 → 저장되면 검토 화면 1단계, 이미지 05) · 실패 '다시 분석'(성공해야만 검토 화면) · 분석 중 잠금 · 분석 결과 있음 '검토 시작/검토 이어하기'(재분석 없음) · 확정 '확정 결과'. 두 번 클릭해도 분석 요청 1회. 자동 분석 ≠ 승인 |
| A28-40 결과 버튼 통합 | 03·04 | **PASS** | 미확정 문서를 '확정 결과'라고 부르지 않는다. 결과 화면 안 `결과 / 검토 비교 / 확정 이력` 탭과 머리 '확정 내용 수정'·'다시 분석'은 그대로(같은 데이터 모델) |
| A28-41 학생 첨부 실제 저장·관리자 열람 | 06·07 | **PASS(자동) · 실환경 PARTIAL** | 아래 §3. 새 업로드의 실환경 확인은 사용자 8080 재시작 뒤 가능 |
| A28-42-1 A28-36 실환경 반영 | — | **BLOCKED(사용자 조작)** | 8080 은 여전히 10:19 시작 프로세스(이전 코드). 지시대로 사용자 창을 종료하지 않았다. 재시작 절차는 §7 |
| A28-42-2 관리자 학생 화면 보기 홈 달력 | — | **PASS(자동)** · 실환경 NOT RUN | E2E `a28-36-preview-calendar` 통과. 실환경은 8080 재시작 필요 |
| A28-42-3 '~요' 문장 축소 | — | **PARTIAL** | 같은 규칙 집계 1,401 → 1,392(새 오류 안내 4개 포함 순감 9). 85% 목표 미달 |
| A28-42-4 최종 UAT 체크리스트 | — | §7 (사용자 확인 항목) | |

## 2. 이미 있던 기능 vs 이번에 새로 만든 것

| 이미 있던 것(재사용) | 이번에 새로 만든 것 |
|---|---|
| 평가 정보 재검토·재확정·확정 이력(§39-8), 운영계획 재검토(§39-10), 최종 승인 1회(§39-14·15) | HWP·HWPX 학교알리미 원본의 '확정 내용 수정' 진입점, '운영계획 수정' 이름 |
| 결과물(Artifact) 버전 파일: 실제 바이트 저장(UUID 키·SHA-256·불변 버전), 학생·관리자 원본/미리보기 API 와 권한 검사(§24~26·36) | 관리자 피드백 상세 '요청에 포함한 파일'의 열기·내려받기 버튼(서버 API 는 원래 있었고 화면만 'Storage 연동 전' 문구였다) |
| 피드백 Snapshot(노트 Revision·결과물 버전 고정) | 노트 이미지·파일 블록의 실제 파일 저장(§26-1, 새 표) · 학생/관리자/학생 화면 보기 열람 |
| 분석 요청 API·검토 화면 | 목록의 상태 기반 단일 CTA·분석 후 자동 이동 |

- 확정 수정 실제 경로: 관리자 → 분석 → 문서 '확정 결과' → 머리 **'확정 내용 수정'** → 확인 창 '수정 시작' → 검토 화면(수정 초안, 학생에게는 이전 확정본 유지) → 고칠 항목만 수정 → **'최종 승인'**(= 새 확정 기록). 월별 운영계획은 검토 화면 4단계 **'운영계획 수정'**. 결과 화면 '확정 이력'에 차수·시각·관리자·직전 대비 변경이 남는다.

## 3. A28-41 학생 파일 저장

### 3-1. 수정 전 자료 경로 조사

| 자료 | 프론트 → API → DB → Storage | 수정 전 |
|---|---|---|
| 노트 이미지·파일 블록(이미지 07, 이미지 06 '탐구 노트(요청 당시)') | 블록 `attrs.file = {name,size,mimeType}` 만 노트 Revision JSON 에 저장 | **바이트 없음**(브라우저 메모리 미리보기만). 업로드·다운로드·미리보기 없음 |
| 결과물 버전(이미지 06 '요청에 포함한 파일') | `POST …/artifacts/{id}/versions` → `assessment_artifact_version` → 격리 Storage | **바이트 있음**. 학생·관리자 원본/미리보기 API 있음. 관리자 화면 버튼만 없었음 |
| 피드백 Snapshot | 요청 당시 노트 Revision ID·결과물 버전 ID 고정 | 결과물은 바이트 보존, 노트 블록 파일은 원래 없음 |
| 평가계획서 HWP·HWPX 원문 PDF 미리보기 | 별도 원문 Storage·변환기 | 이번 범위 아님(혼동하지 않음) |

사용자 DB 사실(읽기 전용): 결과물 버전 3건의 저장 키 파일이 사용자 Storage 에 있고 크기·SHA 가 DB 와 일치(이미지 06 의 두 파일 포함). 이미지 06·07 의 노트 이미지 블록 2개는 이름·크기만 있고 바이트가 없다 — **복원 불가**이며 만들지 않았다. 화면은 '이전 첨부 · 파일 미저장(다시 첨부 필요)'으로 정확히 알린다.

### 3-2. 구현(§26-1 DRAFT, Migration `V202611231000`)

- `POST /api/student/assessment/note-attachments`(본인) → `assessment_note_attachment`(id · student_id · storage_key · file_name · content_type · size_bytes · sha256 · uploaded_at) + 결과물과 같은 `ArtifactStorage`(UUID 저장 키, Root 밖 경로 거절, 임시 파일 → 원자 이동, 덮어쓰기 없음).
- 형식: PNG·JPG·JPEG·GIF·WEBP·PDF·HWP·HWPX·DOC·DOCX·PPT·PPTX·XLS·XLSX — 확장자 + 파일 앞부분 서명 둘 다(MIME 위장·SVG·HTML 거절). 최대 50MB(`assessment.storage.max-file-bytes`), 0바이트 400.
- 원자성: 파일 → DB, DB 롤백 시 보상 삭제. 행·파일 불변(삭제·덮어쓰기 경로 없음) → 학생이 파일을 바꾸면 새 첨부, 이전 Snapshot 이 가리키는 바이트는 유지.
- 노트 저장 검사: `attrs.file.attachmentId` 는 그 학생 첨부여야 함(다른 학생 ID 끼워 넣기 400). attachmentId 없는 이전 블록은 그대로 저장(호환).
- 열람: 학생 원본/미리보기, 관리자 `…/admin/assessment/note-attachments/{id}/file|preview`(담당 학생만, 범위 밖 404, 비인증 401), 학생 화면 보기 `…/students/{id}/student-view/note-attachments/…`(그 학생만). 응답 Header 는 §26 과 같음(`Content-Disposition` UTF-8, `nosniff`, `private, no-store`), 미리보기는 SHA 재확인. 저장 키·서버 경로는 응답에 없음.
- 화면: 학생 편집기에서 파일을 고르면 서버 저장 응답(attachmentId)을 받은 뒤에만 블록을 바꾼다(실패 시 이전 파일 유지·오류 표시, 가짜 성공 없음). 이미지는 서버 미리보기로 다시 그리고 '열기'(이미지·PDF)·'내려받기'. DOC·DOCX·PPT·PPTX·HWP·HWPX 는 '앱 안 미리보기 미지원 형식(내려받아 확인)' — 빈 미리보기로 속이지 않는다. 관리자 피드백 상세의 노트 블록·결과물 파일도 열기·내려받기.
- 남은 결정(Open): 업로드 뒤 노트를 저장하지 않은 첨부(고아 행)는 바이트와 행이 함께 남는다(깨진 행 없음) — 정리 정책 미정. 운영 Storage Provider·악성코드 검사·보존 기간은 §48 Open Decision 그대로.

## 4. API · Migration · 사용자 DB

- API: §26-1 신규 7개(DRAFT, 팀 승인 별도), §26 미리보기 형식에 WEBP 추가, §53 `NOTE_ATTACHMENT_NOT_FOUND` 추가. 그 밖 API 모양 변화 없음.
- Migration: `V202611231000__assessment_note_attachment.sql`(새 표 1개, 추가형). 기존 Migration 수정 없음.
- 사용자 DB 적용 절차와 결과:
  1. 시작 덤프(읽기 전용 `--single-transaction`, 약 97MB) + SHA-256 기록, 41개 표 행 수·`CHECKSUM TABLE`·Storage 파일 목록(3,308개) 기준선.
  2. 일회용 MySQL(tmpfs)에 덤프 복원 → 복원본 행 수 = 기준선(41표). Flyway 12.4.0(백엔드와 같은 버전)으로 validate: 기존 30건 체크섬 일치, 오류는 '새 Migration 미적용' 1건뿐 → migrate 1건(411ms) → validate 통과 → 기존 40표 행 수·CHECKSUM 동일, 새 표 0행. 일회용 DB 삭제.
  3. 적용 직전 사용자 DB 재확인(시작과 동일) → **사용자 DB 에 적용**(1건, 576ms) → validate 통과.
  4. 적용 뒤: Flyway 31건(최신 `202611231000`), 표 42개, 기존 40표 행 수·CHECKSUM 동일, Storage 3,308개·목록 SHA 동일.
- 실행 중인 8080(이전 코드)은 새 표를 쓰지 않으므로 영향 없음. 사용자가 8080 을 새 코드로 다시 시작해도 Flyway 는 추가로 적용할 것이 없다.

### 4-1. 사고 기록 — 사용자 DB 컨테이너 메모리 부족 종료와 복구

- 15:24 에 Backend 통합 시험을 **한 번에 전체** 실행했다. 시험 컨텍스트마다 Testcontainers MySQL 이 하나씩 떠서 19개까지 쌓였고, 15:32(KST) 사용자 DB 컨테이너 `lh-local-run-mysql` 이 Docker 에 의해 **OOM 강제 종료**(exit 137, `OOMKilled=true`)됐다. 시험 쪽도 컨테이너 기동 시간 초과로 일부 클래스가 실패했다(코드 결함 아님).
- 조치: 제 시험 프로세스(Gradle 3개)·시험 컨테이너 19개만 정리 → 사용자 컨테이너를 공식 스크립트가 안내하는 `docker start` 로 재시작(데이터는 이름 있는 볼륨, InnoDB 자동 복구 정상) → 검증.
- 검증: 42개 표 행 수·`CHECKSUM TABLE` 이 Migration 직후 기준선과 **모두 동일**, Storage 3,308개·목록 SHA 동일, Flyway 31건, 주요 표 `CHECK TABLE` OK. 사용자 8080(이전 코드, 건드리지 않음)은 다시 연결돼 GET 200.
- 영향: 약 42분 동안 사용자 DB 가 내려가 있었다(그 사이 8080 의 DB 요청은 실패했을 것). 데이터 손실은 없다.
- 재발 방지: 이후 통합 시험은 5묶음으로 나눠 순차 실행하고, 묶음마다 사용자 DB 컨테이너 상태를 확인해 내려가 있으면 중단하도록 했다.

## 5. 간헐 실패(flaky) 조사

- `SchoolInfoSelectionClassificationApiTest`(PR #19 head `644c746` 의 push CI 에서 실패, 같은 SHA 의 pull_request CI 는 통과): 실패 지점은 285행 — 2024년 원본이 `YEAR_MISMATCH` 가 아니라 다른 판정으로 기록된 경우에만 실패하는 단언. 분류 규칙(`yearQueryVerified` 는 설정 상수)은 결정적이므로 입력 경쟁이 원인이다.
  - 원인: 가상 학교알리미 `FAKE` 는 8개 시험 클래스가 함께 쓰는 정적 서버이고, 동기화 서비스는 캐시된 같은 Spring 컨텍스트의 **단일 스레드 작업 줄**이다. 앞 시험(다른 클래스 포함, 예: 학생 `official/ensure`·분류 뒤 분석 대기열)이 남긴 작업이 다음 시험의 `@BeforeEach`(FAKE 초기화·DB 삭제)와 픽스처 설정 사이에 실행되면, 원본을 연도 근거 없이 기록할 수 있고 '같은 SHA 는 다시 분류하지 않는다'는 재사용 규칙 때문에 그 판정이 이번 시험까지 남는다. 같은 클래스의 다른 시험에 이미 '다음 시험이 진행 중 작업을 재사용하지 않게' 기다리는 보정이 하나 있었던 것도 같은 문제다.
  - 수정: `SchoolInfoSyncService.awaitIdle(Duration)`(작업 줄에 빈 작업을 넣고 끝날 때까지 대기 — FIFO 라 앞선 작업 완료 보장, 운영 동작 변화 없음)을 추가하고, `FAKE` 를 쓰는 8개 클래스의 `@BeforeEach` 에서 초기화 전에 호출한다.
  - 한계: 로컬에서 수정 전 실패를 재현하지는 못했다(CI 1회 기록이 근거). 반복 실행 결과는 §6.
- `a12-flows`(E2E): §6 결과 참고.

## 6. 시험(이번 회차 실제 실행)

| 항목 | 결과 |
|---|---|
| `scripts/verify-frontend.ps1` | PASS |
| Frontend typecheck · lint(oxlint --deny-warnings) | PASS(문구 수정 뒤 재실행) |
| Node 시험 | 43 파일 **191/191**(신규: 주차 목록 3 · 목록 CTA 3 · 확정 수정 진입 2) |
| Backend 단위(ArchUnit 포함, 로컬) | 477 실행 · 실패 0 · skip 3(기존) |
| Backend 통합(로컬) | 1묶음(A·E·F·L·M·N·O, 27클래스, 신규 `NoteAttachmentApiTest` 4 포함) **86/86**. 처음 전체 한 번 실행은 메모리 부족(§4-1)으로 무효. 2~5묶음은 시스템 메모리 부족으로 Claude Code 가 중단 → **로컬 NOT RUN** |
| Backend 단위 + 통합 전체(GitHub CI, head `4024d2c`) | push·pull_request 두 실행 모두 **success**(통합 전체 포함 — 이전에 실패한 `SchoolInfoSelectionClassificationApiTest`·`SchoolAssessmentApiTest` 포함) |
| GitHub CI Harness · Frontend · E2E(Student Care 22) · CI Result | 두 실행 모두 success |
| Assessment E2E(로컬 일회용 DB, 대상 묶음: 신규 `a28-37-42` 3 + 수정한 기존 4파일) | **26/26** |
| Assessment E2E 전체 | **NOT RUN**(사용자 DB OOM 사고 뒤 메모리 확보 전까지 실행하지 않음) |
| REPLAY 8 | **NOT RUN**(같은 이유) |
| 하네스 `verify.ps1 -SkipFrontend -SkipBackend` | 로컬 NOT RUN · CI Harness success |
| 실환경 화면(읽기 전용, 800/1366/1600/1920, 이미지 01·02·03·04·06·07 주소) | 가로 넘침 0 · API 4xx/5xx 0 · 콘솔 오류 0(학생 화면 1건은 점검 스크립트가 차단한 자동 POST `official/ensure` 의 중단) · 차단한 쓰기 1종(그 POST). 캡처: 로컬 실행 폴더 `a28-37/screens/` |

- `a12-flows` 간헐 실패: 이번 회차에 실행하지 않았다(전체 E2E NOT RUN) — 해결 선언하지 않는다.
- `SchoolInfoSelectionClassificationApiTest`: 근본 원인 수정 뒤 CI 2회 통과. 로컬 반복 실행은 메모리 때문에 못 했다 — CI 2회만으로 '해결 완료'라고 단정하지 않고 관찰 대상으로 둔다.

## 7. 서버 상태 · 사용자 확인 순서

- 현재: 8080 = 사용자 실행(10:19 시작, 이전 코드, 건드리지 않음) · 5173/5174 = Vite(새 화면 코드 자동 반영) · MySQL `lh-local-run-mysql`(127.0.0.1:33307, Flyway 31건).
- 사용자 조작:
  1. 8080 창을 닫고 로컬 실행 폴더의 `start-backend.ps1` 로 다시 시작(새 Migration 은 이미 적용돼 있어 추가 적용 없음).
  2. 학생 월별 운영계획 → 2학기 8월 → '주차 목록': 달력 위 개수와 목록 항목 수가 같은지, 과목 필터를 바꿔도 같은지.
  3. 관리자 분석 목록: 문서마다 버튼 하나('검토 시작' / '다시 분석' / '확정 결과') + '원문'. 분석 전 문서의 '검토 시작'은 실제 분석을 하므로 직접 판단해 눌러 주세요(누르면 분석 결과가 저장되지만 학생 공개는 '최종 승인' 전까지 없음).
  4. 이미지 02 문서 '확정 결과' → 머리 '확정 내용 수정'이 보이는지(눌러서 '수정 시작'까지 가면 수정 초안이 생긴다 — 학생 공개값은 바뀌지 않지만 서버에 초안이 남는다).
  5. 학생 노트에서 이미지·PDF·HWPX·DOCX 를 새로 첨부 → 새로고침 → '서버에 저장됨'·이미지 표시·내려받기 → 피드백 요청 → 관리자 피드백 상세에서 열기·내려받기. 이미지 06·07 의 기존 두 이미지는 바이트가 없어 '다시 첨부' 안내가 맞다.
  6. 관리자 '학생 화면 보기' 홈 달력에 붉은 오류가 없는지(A28-36).

## 8. Git · GitHub

- 시작 상태(GitHub API 재조회): PR #17 `integration/assessment-studentcare-20261116 → main` Draft · mergeable(clean) · 1,666 파일 · 167 커밋. PR #18 `feat/perf-assess-plan-extraction → integration` closed·merged(통합 이력 보존, 별도 main 병합 안 함). PR #19 `feature/a28-30-35-uat-fixes → integration` Draft · head `644c746` · mergeable_state `unstable`(같은 SHA 의 push CI 에서 Backend 통합 `SchoolInfoSelectionClassificationApiTest` 1건 실패, pull_request CI 는 통과 → §5). 브랜치 보호 규칙·필수 리뷰 없음.
- 원본 작업 트리(`integration` 브랜치, HEAD `9755581`, 미커밋 약 470항목)는 **커밋·reset·stash 하지 않았다.** 임시 인덱스로 트리 스냅샷을 만들어 PR #19 head 와 비교하고, PR #19 worktree 에 추가·수정 파일만 복사했다(삭제 79건 = PR #18 연구 자료, 적용하지 않음). 복사 뒤 134개 파일 바이트 일치 확인, 비밀값·개인 경로 검사.
- PR #19 에 커밋 3개를 추가해 push(fast-forward, force 없음):
  - `0b721e9` A28-36(이전 회차 미커밋 97파일, 그 시점 내용 그대로)
  - `6529535` A28-37~42 코드·시험(46파일)
  - `4024d2c` 계약 §26-1·이 보고서
  - 이 절을 고친 문서 커밋 1개를 더 올린다(아래 PR 링크에서 최신 head 확인).
- GitHub CI(`4024d2c`): push·pull_request 모두 Harness · Frontend · Backend(단위+통합 전체) · E2E(Student Care) · CI Result **success**.
- **PR #19 → integration 병합: 보류(BLOCKED).** 지시서 §10-2 '테스트와 E2E/REPLAY 가 최신 head 에서 통과' 중 Assessment E2E 전체·REPLAY 가 로컬 메모리 문제로 NOT RUN 이다(CI 는 Assessment E2E·REPLAY 를 돌리지 않는다). PR 은 Draft 로 두고 설명만 갱신했다. 메모리를 확보한 뒤(다른 앱 종료) Assessment E2E 두 묶음 + REPLAY 를 돌려 통과하면 병합할 수 있는 상태다. 계약 §9-1-c·§30-b·§30-c·§39-6·§26-1 은 DRAFT(Assessment = Suyeon 담당, 공용 문서 팀 확인 별도) — 팀 승인을 받았다고 표시하지 않는다.
- PR URL: https://github.com/csy5271abcd/learnershigh-extension/pull/19 (head `feature/a28-30-35-uat-fixes` → base `integration/assessment-studentcare-20261116`) · PR #17 https://github.com/csy5271abcd/learnershigh-extension/pull/17 (integration → main, Draft) · main HEAD `c03a1a4`(변경 없음).

## 9. main 병합 · 문서 정리

- **main 병합: BLOCKED.** PR #17 설명의 main 병합 전 체크리스트 중 사람 결정 항목이 열려 있다 — ① 완규님 Student Care 검토(인수 시험 교체·상담 탭 첫 글자 유실 결함 — 타 담당 코드라 수정하지 않음), ② 시연 DB `lh_demo_manual_20261111` Migration 방식 승인, ③ 과거 Git 이력에 공개된 Railway 분석기 토큰의 교체·폐기 확인(이 환경에서 확인할 방법이 없음), ④ 'Draft → Ready · main 병합은 사람이 결정'. 지시서 §10-2 에 따라 병합하지 않았다.
- **main 병합 후 문서 정리: NOT RUN**(병합 전이므로 계획만). 정리 후보(현행/중복/폐기/역사 보존 구분 뒤 진행):
  - 현행 갱신: `docs/specs/suyeon/progress.md`(11-12 이후 갱신 없음 → A28 결과 반영), `assessment-screen-map.md`·`assessment-frontend-mock.md` 의 '노트 파일은 저장 안 됨' 서술, `OWNERSHIP.md` 3-6 Assessment 의 DRAFT 계약 목록(§9-1-c·§30-b·§30-c·§39-6·§26-1).
  - 역사 보존(수정 안 함): A10~A28 보고서·PR 연구 자료 79개·ADR·타 팀 문서. 필요하면 `archive/` 이동 또는 deprecated 표시만, 이동 전 `rg` 로 참조 검사.
  - 이번 PR 안에서 이미 고친 현행 계약 서술: §26(WEBP), §26-1 신설, §48·API-OD-A03(노트 첨부 실제 저장), §53(`NOTE_ATTACHMENT_NOT_FOUND`).
