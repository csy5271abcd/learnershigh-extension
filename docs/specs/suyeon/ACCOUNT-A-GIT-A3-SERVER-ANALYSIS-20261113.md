# [계정 A] Git 안정화 + A3 Backend → Python 분석기 직접 연동 — 실행 보고 (2026-11-13)

> 기준: `ACCOUNT-A-A0-A1-PREP-20261113.md`, `ACCOUNT-A-A0-COMMIT-A2-STORAGE-20261113.md`. 브랜치 `feature/assessment-student-integration-enhancement`. **Push 하지 않았다. Git 이력 재작성 없음.**
> 하지 않은 것: 기존 LearnersHigh 통합(1팀), 계정 B 분석기 코드 수정(읽기만 함), 완규님 Student Care·수집기, Admin UI 전면 재설계, 레거시 삭제, 시연 DB 접근·초기화.
> 표기: [직접] 이번에 실행 확인 / [정적] 코드 확인. 시험 문서: 합성 PDF·HWPX, 실제 학교 문서는 로컬 분석기로만 1건(운정고 PDF, 외부 전송 없음).

---

## 1. 새 Git Commit

| Hash | 내용 | 비고 |
|---|---|---|
| `b5680cf` | feat(assessment): student assessment http integration (C4) | **A0 Snapshot 시점 내용**으로 Stage(A2 변경과 분리). `frontend/student/vite.config.ts`는 기존 Plugin을 `tools/`로 옮긴 것뿐 — 본문 동일·루트 경로 동일 [직접 diff] |
| `318db95` | feat(admin): preserve admin shell with assessment entry (C6) | 현재 AdminShell 그대로 보존. 변경 내용: Assessment Entry 1개·`surface` prop(기본 plain)·App.tsx `/assessment` 분기. Student Care Entry·Route·화면 변경 없음 [직접 diff 검토] |
| `50f6de3` | feat(assessment): store evaluation plan originals and open plan operation to all admins (A2) | Backend 28 파일 |
| `6534ffd` | feat(assessment): admin evaluation plan original viewer and download (A2) | Admin 8 파일 |
| `094b3f2` | feat(assessment): student evaluation plan original route (A2) | Student 8 파일 |
| `5d1d59c` | docs(assessment): record A2 storage results and OD-A08 plan decision | `domain.md` OD-A08 부분 결정 + A2 보고서 |
| (이번 A3) | §2 표 참고 | |

**API 계약 Commit 보류 (중요 발견)**: Commit된 `docs/api/api-contract.md`(HEAD)는 아직 **Assessment 이전의 구형 계약**(3,446줄, §10 = Topic, §38 = Interview Management)이다. Assessment 계약 전체(§10 평가계획서·§38·§39·§48 등)는 미승인 C8 재작성본에만 있다. 그래서 A2·A3 계약 문단만 따로 Commit할 수 없었다(HEAD에 붙일 절이 없음). A2·A3 계약 내용은 작업 트리 `api-contract.md`(C8)와 이 보고서·A2 보고서에 기록했다. **C8 승인 또는 "Assessment 계약 부분만 Commit" 결정이 필요하다.**

## 2. A3 Commit과 남은 미커밋 변경

A3 Commit(이 보고서 작성 뒤 생성, 최종 응답에 Hash 기재):
- `feat(assessment): run evaluation plan analysis on the server (A3)` — Backend
- `feat(assessment): admin runs server analysis (A3)` — Admin
- `docs(assessment): A3 server analysis report` — 이 보고서

남는 미커밋(승인 범위 밖): C8 하네스·계약·ADR·rules·scripts(`api-contract.md`의 A2·A3 문단 포함), `backend/bin/`, `references/**`, `docs/specs/suyeon` 보류 바이너리·JSON(48개 + 이번 증거 스크린샷 폴더 2개). 보존: `refs/backup/a0-20261113`, `refs/backup/a2-20261113`, A3 뒤 `refs/backup/a3-20261113`.

## 3. 클린 체크아웃 빌드 [직접]

임시 worktree(`5d1d59c`, node_modules는 Junction으로만 연결 후 안전 해제):

| 항목 | 결과 |
|---|---|
| Student `tsc -b` / `vite build` | exit 0 / exit 0 |
| Admin `tsc -b` / `vite build` | exit 0 / exit 0 |
| Backend `compileJava compileTestJava test` | exit 0, Unit 272 / 실패 0 |

→ C4 포함 HEAD 전체는 클린 체크아웃에서 빌드된다. **C5(`a583324`) 단독은 여전히 빌드되지 않는다**(C4보다 먼저 Commit되어 있어 그 지점 단독으로는 Student 파일이 없다). 이력을 고치지 않고 기록만 한다.

## 4. Backend 분석기 Client

| 파일 | 역할 |
|---|---|
| `assessment/integration/analysis/PlanAnalyzerClient.java` | 외부 경계 Interface (`configured()`, `analyze(Request) → Result`) |
| `HttpPlanAnalyzerClient.java` | JDK `HttpClient`(HTTP/1.1 고정). multipart를 바이트 배열로 만들어 **Content-Length** 전송(분석기는 chunked 거부). `X-Analysis-Token` 헤더. 필드: `file`, `analyzerVersion`, `includeAnalysis=false`, `fileId`(Revision 기반, 분석기 규칙 `[A-Za-z0-9_-]{1,40}`) |
| `UnconfiguredPlanAnalyzerClient.java` | 미설정 시 항상 NOT_CONFIGURED(가짜 결과 없음) |
| `PlanAnalyzerException.java` | NOT_CONFIGURED / CONNECTION_FAILED / BUSY / TIMEOUT / AUTH_FAILED / REJECTED / SERVER_ERROR / BAD_RESPONSE |
| `PlanAnalyzerConfig.java` | 환경 변수로만 설정: `ASSESSMENT_ANALYZER_BASE_URL`, `ASSESSMENT_ANALYZER_TOKEN`, `ASSESSMENT_ANALYZER_VERSION`(v21.1), `…_TIMEOUT_MILLIS`(130000), `…_MAX_RETRIES`(2), `…_RETRY_DELAY_MILLIS`(500). **Shared `application.yml` 변경 없음** |
| `service/plan/PlanAnalysisService.java` | 분석 실행 Orchestration. **Transaction 없음**(분석기 최대 2분 동안 DB 잠금 없음) |
| `EvaluationPlanService.recordServerAnalysis` | 결과 저장만 짧은 Transaction. 기존 `AnalysisImportValidator`·payload SHA 중복 판정 재사용(`persistRun`으로 외부 수신과 공통화) |
| `EvaluationPlanQueryService.verifiedBytes` | 보관 원문 크기·SHA 재검증 후 바이트(파일 열람과 같은 검사) |
| `PlanAnalysisRun.serverAnalyzer(...)`, `ORIGIN_SERVER_ANALYZER` | 출처 구분(기존 `EXTERNAL_IMPORT`와 별도). Migration 없음(origin 컬럼 VARCHAR 30) |

재시도: **연결 실패·503 BUSY만** 최대 2회(지연 500ms × 회차). Timeout·4xx·5xx·응답 오류는 재시도하지 않는다(분석기는 상태 없음 → 재전송은 멱등이지만 Timeout 재시도는 부하만 키움).
토큰: 로그·응답·예외 메시지에 없음 [직접: 실행 로그에서 토큰 문자열 0건, 시험에서 응답 본문 검사].

## 5. 구현한 API

```http
POST /api/admin/assessment/evaluation-plans/{planId}/revisions/{revisionId}/analysis
```

- 계약 §39에 이미 있던 Endpoint. 본문 없음. 응답은 `GET .../analysis`와 같은 `PlanAnalysisResponse`(`analyzer.origin = "SERVER_ANALYZER"`).
- `201` 새 Run 저장 / `200` 같은 결과가 이미 있음(새 Run 없음).
- 권한: 인증된 관리자 누구나(OD-A08). 인증 없음·학생 → 401. 없는 문서 → 404.

| 상황 | 응답 | Run 저장 |
|---|---|---|
| 분석기 미설정 | 503 `PLAN_ANALYZER_NOT_CONFIGURED` | 없음 |
| 연결 실패 / BUSY(재시도 후) / Timeout / 토큰 불일치 | 503 `PLAN_ANALYZER_UNAVAILABLE` (`connection_failed` / `busy` / `timeout` / `analyzer_auth_failed`) | 없음 |
| 분석기 4xx(형식·크기 등) | 422 `PLAN_ANALYSIS_UNSUPPORTED` (`analyzer_rejected:<code>`) | 없음 |
| 분석기 5xx·JSON 아님·필수값 없음 | 502 `PLAN_ANALYZER_BAD_RESPONSE` (`analyzer_error:<code>` / `invalid_response`) | 없음 |
| 원문 SHA 불일치 | 502 (`sha_mismatch`) | 없음 |
| `importable=false` | 502 (`not_importable:<blocker>`) | 없음 |
| payload 계약 위반(모르는 필드 등) | 502 (`payload_invalid`) | 없음 |
| 분석기 판정 PARTIAL | **422 `PLAN_ANALYSIS_PARTIAL_NOT_STORABLE`** (`partial_result`) | 없음 (§6) |
| HWP·HWPX(실험 기능 꺼짐) | 422 (`format_contract_pending`) — 분석기 호출 안 함 | 없음 |
| 원문 없는 이전 등록분 | 422 (`original_missing`) | 없음 |
| 같은 개정본 동시 요청 | 409 `PLAN_ANALYSIS_IN_PROGRESS` | — |
| 보관 원문 변조 | 409 `FILE_INTEGRITY_FAILED` | 없음 |

실패해도 기존 Revision·이전 Run·검토 상태는 바뀌지 않는다(시험으로 확인, §9).

## 6. PDF/HWP/HWPX 분석 연결 상태

| 형식 | 상태 |
|---|---|
| **PDF** | **연결 완료.** 공식 `AnalysisImportRequest`(backend-adapter-0.2) 그대로 검증·저장 |
| **HWP·HWPX** | **계약 대기.** 기본(실험 기능 꺼짐)에서는 분석기를 부르지 않고 422 `format_contract_pending`. `assessment.multiformat.experimental=true`인 격리 개발 환경에서는 기존 실험 DTO(`source.format`·`documentLocator`)로 같은 경로를 탄다(정식 저장 아님, 공식 확정은 별도 Flag). 세 형식 공식 분석은 최종 필수 목표로 유지 |
| **PARTIAL** | 분석기 Adapter는 과목이 하나라도 있으면 payload `status=REVIEW_REQUIRED`를 낸다. Backend는 **Envelope 판정(PARTIAL)을 먼저 본다.** DB 제약 `ck_assessment_plan_analysis_status`가 `REVIEW_REQUIRED·FAILED`만 허용해 PARTIAL을 저장할 상태가 없다 → **REVIEW_REQUIRED로 바꿔 저장하지 않고 422로 알린다.** 저장하려면 Migration(Shared DB) 승인이 필요하다(제안 SQL 아래) |

PARTIAL 저장 Migration 제안(적용·Commit 안 함, 승인 대기):

```sql
-- V2026111xxxxx__assessment_plan_analysis_partial_status.sql (제안)
ALTER TABLE assessment_plan_analysis_run DROP CHECK ck_assessment_plan_analysis_status;
ALTER TABLE assessment_plan_analysis_run
    ADD CONSTRAINT ck_assessment_plan_analysis_status CHECK (status IN ('REVIEW_REQUIRED', 'PARTIAL', 'FAILED'));
```
함께 필요한 것: `PlanAnalysisStatus.PARTIAL`, 계약 §39 `analysisStatus` 값 추가, Admin 표시, PARTIAL Run 검토·확정 허용 여부 결정(제안: 사람 확정은 허용하되 과목별 추출 상태가 계약에 들어오기 전까지 경고 표시).

## 7. 실제 분석 결과 MySQL 저장 [직접]

격리 Schema `lh_a2_verify_20261113` + 실제 로컬 분석기(8765, v21.1, 규칙 기반·LLM 없음) + Backend(18081):

| 문서 | 분석기 판정 | 결과 |
|---|---|---|
| 합성 `synthetic-e2e.pdf` | OK_REVIEW_REQUIRED (1.7초) | **201**, `assessment_plan_analysis_run`: origin `SERVER_ANALYZER`, status `REVIEW_REQUIRED`, analyzer `v21.1/backend-adapter-0.2`, received_by `adm_bundang` |
| 운정고 2026-2 1학년 PDF(2.7MB, 실제 공개 문서, 로컬 분석) | **PARTIAL** (17.9초) | **422 `PLAN_ANALYSIS_PARTIAL_NOT_STORABLE`**, Run 저장 안 함 |
| 합성 `synthetic-plan.pdf` (Admin 화면에서 실행) | PARTIAL (0.9초) | 422, 화면 오류 안내 |

브라우저·Vite Proxy를 거치지 않았다: Playwright가 본 요청은 `POST/GET .../analysis`(Backend)뿐, `8765`·`/dev-analysis` 요청 0건.

## 8. Admin 화면 분석 실행 [직접, Edge headless]

- `requestPlanAnalysisHttp` → `POST .../analysis` 후 문서를 다시 읽어 서버 저장 상태를 돌려준다(`notConnected` 제거).
- 평가계획서 목록 "분석 요청" → 버튼이 **"분석 중… (최대 2분)"**(aria-busy) → 성공 시 "검토 필요" 배지 + "분석 결과 열기", 실패 시 서버 오류 메시지·코드·사유 Toast(예: `… (PLAN_ANALYSIS_PARTIAL_NOT_STORABLE · partial_result)`)와 버튼 복귀.
- "분석 결과 열기" → 왼쪽 원문 PDF Viewer + 오른쪽 분석 후보(분석기 `SERVER_ANALYZER` 표시). 새로고침 후에도 DB 결과가 보인다. 화면: `account-a-a3-server-analysis-20261113/a3-admin-review-with-original.png`, `a3-admin-partial-error.png`(Commit 안 함).
- 개발용 `analyzerUpload`(브라우저 → `/dev-analysis` → `analysis-imports`) 경로는 개발 Flag 전용으로 그대로 두었고 정상 흐름에서 쓰지 않는다.
- 문구 정정: "외부 분석기가 보낸 후보" → "분석기가 만든 후보".
- 관리자 검토 UI 재설계는 하지 않았다(A4).

## 9. 시험 결과

| 범위 | 결과 |
|---|---|
| Backend Unit (ArchUnit 포함) | **282 / 실패 0** (기준 272 + 신규 10) |
| Backend Integration | **157 / 실패 0** (기준 149 + 신규 8) |
| 그중 Student Care (Unit+IT) | **222 / 실패 0** |
| 신규 `HttpPlanAnalyzerClientTest` (Stub HTTP) | 7/7 — 성공 Envelope 해석·토큰·Content-Length(chunked 아님)·multipart 필드, BUSY 재시도 3회 후 실패, BUSY 뒤 성공, Timeout 재시도 없음(1회), 연결 거부, 401/413/500/JSON 아님/필수값 없음 구분, 토큰 비노출 |
| 신규 `PlanAnalysisServiceTest` | 3/3 — PARTIAL 저장 거부, 모순·미지 판정 거부, fileId 규칙 |
| 신규 `PlanServerAnalysisApiTest` (Stub 분석기 + Testcontainers) | 7/7 — 성공 저장·재조회·같은 결과 200·다른 관리자 실행·원문 그대로 전송(SHA)·학생 비공개, PARTIAL 422 미저장, SHA 불일치·JSON 아님·importable false·모르는 필드 502 + **이전 Run 보존**, BUSY 503(3회)·Timeout 503(1회), 동시 요청 409, HWPX 422(분석기 호출 0), 원문 없음 422, 인증 없음·알 수 없는 관리자·학생 401, 없는 문서 404 |
| 신규 `PlanServerAnalysisNotConfiguredApiTest` | 1/1 — 미설정 503, Run 없음 |
| Frontend typecheck / lint / build | exit 0 / 0 / 0. 운영 번들에 토큰·`8765`·Mock Header 0건 |
| Admin 분석 실행 화면(Playwright) | 로딩 문구·PARTIAL 오류·성공·결과 열기·원문 Viewer·새로고침 재조회 PASS, 콘솔 오류 0 |
| PDF Viewer 회귀 | 검토 화면 Canvas 렌더링 확인(위 화면) |
| 실제 분석기 수동 연동 | §7 |

## 10. Student Care 회귀

- 완규님 경로(`studentcare/`, `features/student-care/`, `app/`, `e2e/`, `docs/specs/wangyu`) 이번 변경 **0건** [직접 git diff].
- Backend Student Care 시험: §9.
- **Playwright Student Care E2E 기준선 확보: 7/7 PASS** [직접]. 격리 Schema `lh_e2e_sc_20261113`(root로 생성, 앱 계정에 그 Schema 권한만), Backend `e2e` Profile + `LEARNERSHIGH_TEST_ENDPOINTS_ENABLED=true`(18082), Admin `vite preview`(4174), Edge. `/api/test/reset`은 이 격리 Schema에만 실행됨(Flyway 로그로 연결 DB 확인). 시연 DB·Volume·결과물 Storage 접근 없음.

## 11. HWP/HWPX Viewer 엔진 평가 현황

**실제 변환 품질 측정은 아직 하지 않았다.** 이 PC에는 변환 엔진이 없고(LibreOffice 없음, 한컴오피스 2024는 데스크톱 제품), 프로그램 설치·외부 업로드는 하지 않았다. 아래는 조사 결과와 측정 계획이다.

| 후보 | HWP | HWPX | 서버 자동화 | 라이선스·조건 | 판단 |
|---|---|---|---|---|---|
| LibreOffice 내장 hwpfilter | HWP 3.0(HWP97)만 | ✗ | headless 가능 | MPL-2.0 | HWP 5.x 공문서에는 부적합 |
| LibreOffice + **H2Orestart** 확장(ebandal/H2Orestart, Java) | HWP v5 | ✓ | headless `soffice --convert-to pdf` | 확장 **GPL-3.0-or-later**(Debian 패키지 정보), LibreOffice MPL-2.0. 별도 Process 실행이면 우리 코드 GPL 의무는 일반적으로 없으나 **법무 확인 필요** | **1순위 측정 대상**(무료·서버 가능). 표·수식·쪽 나눔 품질 미검증 |
| 한컴 **Hwp SDK**(공식) | ✓ | ✓ | SDK 기반 서버 구성 | 상용, 서버 과금 조건 비공개(영업 문의) | 품질 기대치 최고, 비용·배포 형태 확인 필요 |
| 한컴오피스 데스크톱 자동화 | ✓ | ✓ | Windows GUI 의존, 무인 불안정 | 데스크톱 라이선스(서버 사용 불명) | **운영 불가**, 평가 기준 PDF 생성용으로만 검토 |
| Polaris Converter 등 상용 변환 서버 | ✓(문서상) | 확인 필요 | Linux/Windows 서버 | 상용 | 비교 견적 대상 |
| JS/WASM 렌더러(rhwp 등) | 일부 | 일부 | 브라우저 | 다양 | 표·HWPX 완성도 미확인, 보조 후보 |

측정 계획(형식별 별도): 
1. 표본 — `references/curriculum-plan/`(로컬 Read-only)에서 HWP·HWPX 각 10개(병합 셀·수식·가로 쪽·긴 표·장문 100쪽+ 포함).
2. 기준본 — 한컴오피스로 직접 PDF 저장(수동, 로컬).
3. 지표 — 변환 성공률, 쪽 수 일치, 표 구조·병합 셀(쪽별 육안 체크리스트), 수식·특수문자, 글꼴 대체(한글 글꼴 설치 여부별), 처리 시간(장문), 메모리, 분석기 Locator 문장이 변환 PDF Text Layer에서 찾아지는 비율.
4. 보안 — 네트워크 차단·임시 폴더·Timeout·크기 제한·동시 1건, 외부 업로드 금지.
5. 결과 표 + 쪽별 캡처를 `docs/specs/suyeon/`에 남기고 도입 제안.

**결정 요청**: 이 측정을 위해 **개발 PC에 LibreOffice(Portable 또는 격리 폴더) + H2Orestart 확장을 설치해 로컬에서만 변환해도 되는지** 승인이 필요하다(운영 설치 아님). 한컴 Hwp SDK 평가판·견적 문의 여부도 결정 필요. 그전까지 HWP/HWPX preview는 415 유지, 최종 필수 요구사항에서는 제외하지 않는다.

## 12. Public 저장소 개인정보 점검 [직접]

- 로컬 절대 경로(사용자 이름 포함)는 C7 `109140f`에서 들어온 문서 12개에 있다. 이후 Commit은 같은 파일을 물려받는다. **`origin/main`에는 없음**(0건) — 아직 Push 전이라 공개되지 않았다.
- 계획(이력 재작성은 승인 후에만):
  1. 해당 12개 파일의 경로를 `%LH_ANALYZER_HOME%`·`<분석기 폴더>` 같은 일반 표기로 바꾸는 후속 Commit.
  2. Push 전 이력 검사: `git log -p origin/main..HEAD | grep -E "Users[\\/]"` 0건이어야 Push.
  3. 1만으로는 이전 Commit에 문자열이 남으므로, **미Push Commit만 대상**으로 경로 치환 재작성(`git filter-repo --replace-text` 또는 rebase)을 제안한다. 이미 공개된 이력이 없어 영향 범위가 이 로컬 브랜치뿐이다. **승인 필요.**

## 13. 계정 B와 합의할 계약

현재 A3는 **v0.2(backend-adapter-0.2) 계약만으로** 동작한다. 아래는 합의 전 확정하지 않는다.

| 항목 | 현재 | 계정 A 초안(0.3) | 계정 B `extensions` 제안(분석기 `multiformat_adapter.py`) | 결정 필요 |
|---|---|---|---|---|
| 계약 버전 | 없음(Envelope `contract: analyze-preview-0.1-dev`, adapter 이름에 0.2) | payload `contractVersion` | payload `draft` 표시 | 버전 필드 위치·의미 |
| PARTIAL | Envelope에만. payload는 REVIEW_REQUIRED | payload `status: PARTIAL` | — | **payload에서 PARTIAL 표현** + DB/계약 상태 추가(§6) |
| 과목별 추출 상태 | 없음 | `subjects[].extraction{status, issues[]}` | `extensions.subjects…fieldPresence`·`detailCause`·`nameQuality`·`linkConfidence` | 한 모양으로 통일 |
| 정보 없음·추출 실패·검토 필요 | null = 미확인 | issues code | 값별 상태(C1) | 3상태 Enum 정의 |
| 수행평가 세부 기준 | 항목·rubric(levels·score)·submissions·conditions | 동일 + 오류 코드 | `deliverables{confirmation,basis}`·`conditions{kind,asWritten,origin}`·`specialRules`·`baseScore` | 공식 필드 승격 범위 |
| 월별 교수·학습 계획 | 없음 | `subjects[].teachingPlan[]` | (없음) | **계정 B 출력 필요** |
| 원문 Locator | PDF `pdfPageNumber`, HWP/HWPX 실험 `documentLocator` | 동일 | 동일(+`sourceRange`) | HWP/HWPX 정식화(S-8) |
| 분석기 버전 | `analyzer.version` (`v21.1/backend-adapter-0.2`) | + `profile` | 동일 | Envelope `requestId`·`elapsedMs` 저장 여부(현재 로그만, 컬럼 추가는 Migration) |
| v0.2 호환 | — | 새 필드 모두 선택, 버전 없으면 0.2로 해석 | `extensions`는 현재 Backend에서 `unknown_field` 거절 | **두 초안 중 하나 또는 병합** — 임의 확정 안 함 |

Backend 쪽 준비: 엄격 Parser(`AnalysisImportParser`)가 모르는 필드를 거절하므로, 합의된 필드는 DTO에 선택 필드로 추가하고 버전별로 허용하는 방식이 필요하다(계약 확정 후 구현).

## 14. A4 관리자 검토 UI 준비도

| 필요 | 상태 |
|---|---|
| 서버 저장 분석 결과 | ✓ (PDF, REVIEW_REQUIRED·FAILED) |
| 원문 Viewer 나란히 + 근거 쪽 이동 | ✓ (A2) |
| 과목 매핑 + PUT review 연결 | 확정 패널(`PlanReviewConfirmPanel`)은 http 연결됨. 기본 저장(`savePlanReviewHttp`)은 notConnected, 임시 저장 없음 |
| 수행평가 세부 기준 탭 | 데이터 있음(rubric·submissions·conditions), 전용 탭 없음 |
| 월별 교수·학습 계획 탭 | **데이터 없음**(계정 B 출력 대기) — Mock을 공식 결과로 저장하지 않음 |
| 오류·누락 표시 | 문서 단위 warnings만. 과목별 상태는 계약 대기 |
| PARTIAL 결과 검토 | 저장 불가(§6) — 실제 대표 문서(운정고)가 PARTIAL이라 A4 시연에 직접 영향 |
| 모든 학교 목록 | API 없음(API는 모든 학교 허용, 화면 선택은 담당 학생 학교 + 개발 설정) |

## 15. 가장 먼저 할 작업

1. **결정 받기**: ① PARTIAL 저장 Migration(§6) ② C8 또는 Assessment 계약만 Commit ③ 미Push 이력 경로 정리 재작성(§12) ④ LibreOffice+H2Orestart 로컬 측정 설치(§11).
2. ①이 승인되면 PARTIAL 저장 → 운정고 같은 실제 문서를 Admin에서 검토할 수 있게 된다(A4의 전제).
3. 계정 B와 §13 표로 0.3/extensions 통합안 협의(특히 `teachingPlan`, payload PARTIAL, 과목별 상태).
4. A4: 과목 매핑·PUT review 기본 저장 연결, 수행평가 세부 기준 탭, 경고·누락 표시.

## 부록: 검증 환경 정리

- 격리 Schema: `lh_a2_verify_20261113`(A2·A3 수동 검증), `lh_e2e_sc_20261113`(Student Care E2E). 합성 데이터 + 운정고 PDF 원문 1건(로컬 임시 Storage). **삭제 여부 사용자 결정.**
- 실행한 Backend(18081·18082)·Vite(5174·4174)는 모두 종료했다.
- 분석기 토큰은 분석기 로컬 파일에서 환경 변수로만 넘겼고 출력·기록하지 않았다.
