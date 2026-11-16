# [계정 A] A0 Commit · A2 평가계획서 원문 Storage·API · 전체 관리자 운영 권한 · PDF Viewer — 실행 보고 (2026-11-13)

> 기준 문서: `ACCOUNT-A-A0-A1-PREP-20261113.md`. 브랜치 `feature/assessment-student-integration-enhancement`. **Push 하지 않았다.**
> 승인 범위: C1·C2·C3·C5·C7 Commit / S-4·S-5 원문 Storage·file·preview API / OD-A08 "모든 관리자가 모든 학교 평가계획서 운영" / AdminShell 유지.
> 하지 않은 것: 레거시 삭제(D1~D5), C4·C6·C8 Commit, Student Care·완규님 코드 수정, 분석기(계정 B) 수정, 기존 LearnersHigh 통합(1팀), 자동 수집기.
> 표기: [직접] 이번에 실행 확인 / [정적] 코드 확인. 모든 시험 파일은 합성 데이터다.

---

## 1. Commit 결과 (C1·C2·C3·C5·C7)

| 순서 | Hash | 메시지 | 파일 | 독립 빌드 확인 [직접, 임시 worktree] |
|---|---|---|---|---|
| C1 | `34e11eb` | build(backend): add assessment dependencies and config | `backend/build.gradle.kts`(+5), `application.yml`(+32) | `compileJava compileTestJava test` **PASS** |
| C2 | `943d54f` | feat(db): add assessment migrations (verbatim, already applied) | Migration 6개 | 내용 = A0 백업 tar = Snapshot Ref, 바이트 동일 확인 |
| C3 | `c4650c0` | feat(assessment): add backend domain, API and tests | main 132 Java + resources 2, test 19 Java + resources 13 | `compileJava compileTestJava test` **PASS (Unit 272)**. 이 Commit의 Backend 트리 = A0 기준선(IT 144 PASS)과 동일 |
| C5 | `a583324` | feat(assessment): add admin assessment feature | `frontend/admin/src/features/assessment/**`(53), `student-preview.html` | **단독 빌드 불가 — tsc 오류 79건**. Admin Assessment가 Student Assessment 파일 37개를 import하는데 그 최신본이 C4(미승인)에 있다. 현재 작업 트리 전체로는 PASS |
| C7 | `109140f` | docs(assessment): add suyeon specs, reports and verification scripts | `docs/specs/suyeon/**` A257·M11·D4 | 문서 |

보안·민감정보 처리 [직접]
- C1 `application.yml`은 작업 파일이 CRLF여서 전체 줄이 바뀐 것처럼 보였다. HEAD와 같은 LF로 되돌려 **내용 변경 32줄만** Commit했다(값은 모두 환경 변수·안전 기본값, 비밀 없음).
- C3 테스트 Fixture는 README로 합성 자료임을 확인(가상고등학교), 토큰·개인 경로 0건.
- C7: Runbook 3개에 있던 **로컬 개발 DB 비밀번호 문자열**(이미 `.env.example`에 공개된 개발 기본값과 동일)을 `<.env의 MYSQL_PASSWORD>`로 치환한 뒤 Commit.
- C7에서 **48개 파일 보류**(Commit 안 함): PNG 스크린샷 24, 시연·합성 PDF 6, Seed·실행 결과 JSON(합성 학생 60명 명단, 실제 학교 평가계획서 분석 출력 포함). 원본은 A0 백업과 `refs/backup/a0-20261113`에 보존.
- 남은 주의: C7 문서 12개에 로컬 경로 `C:\Users\<사용자명>\...`이 있다(비밀은 아님). **Push 전 정리 여부 결정 필요.**
- 다른 팀 파일 Stage 0건. Wangyu 소유 경로 변경 0건.

보존: `C:\learnershigh-backups\20261113-a0\`, `refs/backup/a0-20261113`(`1325d0b`) 그대로. 이번 작업 결과도 `refs/backup/a2-20261113`(`1060128`, 브랜치 아님·Push 금지)에 추가로 고정했다.

## 2. Commit하지 않은 Shared 변경 (승인 범위 밖)

| 묶음 | 파일 |
|---|---|
| C4 Student Assessment (Suyeon, Shared 1개 포함) | `frontend/student/src/features/assessment/**` 수정·신규(이번 A2 학생 화면 변경 포함), `frontend/student/tools/**`, `frontend/student/vite.config.ts` |
| C6 Admin Shell | `frontend/admin/src/App.tsx`, `app/AdminShell.tsx`, `app/AdminShell.module.css`, `frontend/admin/vite.config.ts` — **이번 세션에서 수정하지 않음**(A0 백업과 SHA 동일) |
| C8 하네스·계약·ADR | `CLAUDE.md`, `AGENTS.md`, `ARCHITECTURE.md`, `README.md`, `.claude/rules/*` 7, `docs/OWNERSHIP.md`, `docs/SOURCE_OF_TRUTH.md`, `docs/adr/0001~0005·README`, ADR-0008·0009(미추적), `docs/architecture/*` 4, `scripts/verify*.ps1` 3, `scripts/CLAUDE.md`, **`docs/api/api-contract.md`(이번 §10-1-1·§38-1·§38-2·§53·API-OD-A03 추가 포함)** |
| 이번 A2 코드 | Backend 25 파일 수정 + 3 신규, Admin 7 수정 + 1 신규, `docs/specs/suyeon/domain.md`(OD-A08 부분 결정) — Commit 승인 범위 밖이라 작업 트리 + Snapshot Ref로만 보존 |
| 기타 | `backend/bin/`(IDE 산출물, ignore 제안), `references/**` |

## 3. 테스트 결과 [직접]

| 검증 | 결과 |
|---|---|
| Backend Unit (`gradlew test`, ArchUnit 포함) | **272 / 실패 0** |
| Backend Integration (`gradlew integrationTest`, Testcontainers) | **149 / 실패 0** (기준선 144 + 신규 `PlanOriginalFileApiTest` 5) |
| 그중 Student Care (Unit+IT) | **222 / 실패 0** (`StudentCareBoardApiTest`, `…CaseApiTest`, `…ConcurrencyApiTest`, `…ReviewFixesMigrationTest` 등 25개 클래스) |
| Frontend typecheck (student·admin·mentor) | exit 0 |
| Frontend lint (`oxlint --deny-warnings`) | exit 0 |
| Frontend build | exit 0. 운영 번들에 `X-Assessment-*` Header 이름 0건 |
| Student Care Playwright E2E | **실행 안 함** — `/api/test/reset`이 DB를 초기화하므로 격리 Schema가 필요하다. 이번 변경은 Student Care 파일·Shell을 건드리지 않았고 Backend Student Care 테스트 222건으로 회귀를 확인했다. D1(Shell 변경) PR에서는 반드시 격리 Schema로 실행한다 |

기존 테스트 중 **정책 변경으로 기대값을 바꾼 것**(테스트를 통과시키려고 완화한 것이 아니라 승인된 결정 반영):
- `EvaluationPlanApiTest`: `adm_gangnam` 403 → 200(OD-A08), 학생이 `UNREVIEWED` 문서를 봄 → 확정 전 0건·404, 업로드 `fileRef` 없음 → `plan_file_…`. 인증 없음·알 수 없는 관리자·학생 Header → 401 검사를 **추가**.
- `AnalyzerV21SyntheticImportApiTest`, `AnalyzerV211ImportAndItemKeyApiTest`, `MultiformatExperimentalApiTest`: 학생의 미확정 문서 조회 200 → 404, DB `file_ref` NULL → UUID 저장 키.
- `MultiformatDisabledApiTest`, `DocumentFormatInspectorTest`: 실험 Flag OFF에서 HWPX 415 → 원문 등록 201(분석 수신 필드 `format`·`documentLocator`는 여전히 `unknown_field`, 지원 안 하는 형식은 여전히 415).
- `DemoRosterTest`: 시연 관리자 평가계획서 권한 없음 → 있음.
- 평가계획서 IT 7개 클래스에 `assessment.plan-storage.root=${java.io.tmpdir}/…` 추가(시험 파일이 개발 Storage에 섞이지 않게).

## 4. 원문 Storage 구현 파일

| 파일 | 내용 |
|---|---|
| `backend/.../assessment/integration/storage/PlanDocumentStorage.java` (신규) | 결과물 Storage `LocalFileArtifactStorage`를 **그대로 재사용**(UUID 키, 임시 파일→원자적 이동, 덮어쓰기 없음, 경로 이탈 차단), Root만 분리: 기본 `${assessment.storage.root}/plan-documents`, `assessment.plan-storage.root`로 변경 가능. `application.yml`(Shared)은 바꾸지 않았다 |
| `entity/PlanRevision.java` | `upload(...)`에 저장 키 인자 추가(기존 `fileRef = null` 고정 제거), `hasStoredFile()`, `contentType()` |
| `service/plan/EvaluationPlanService.java` | 같은 Plan 내 동일 SHA-256 → 409, 원문 저장 → Revision 연결, **Rollback 시 파일 보상 삭제**(결과물 업로드와 같은 `TransactionSynchronization` 방식) |
| `service/plan/DocumentFormatInspector.java` | 원문 등록은 PDF·HWP·HWPX 기본 허용(실제 바이트 판별·암호/배포용/ZIP 폭탄/경로 이탈 검사 유지). 실험 Flag는 분석 수신 필드에만 |
| `repository/PlanRevisionRepository.java` | `existsByPlanIdAndSha256` |
| `exception/AssessmentErrorCode.java` | `PLAN_FILE_DUPLICATE`(409) |
| `dto/plan/PlanFileView.java` (신규), `AdminEvaluationPlanResponse`, `StudentEvaluationPlanResponse`, `PlanUploadResponse` | §48 모양 `file{fileRef,fileName,contentType,sizeBytes,checksum,documentFormat,pageCount,available,previewAvailable}`. 응답 `fileRef`는 불투명 `plan_file_<revisionId>`(저장 키 비노출) |
| `service/plan/PlanViews.java` | `fileRef()`, `previewAvailable()`, `file()` |
| `service/plan/EvaluationPlanQueryService.java` | 학생 공개 범위(확정 Revision만), `adminFile`/`studentFile` + **크기·SHA-256 재검증** |
| Migration | **없음**(`file_ref VARCHAR(64)` 기존 컬럼 사용) |

기존 데이터: `file_ref = NULL`인 이전 등록분은 그대로 두고 `file.available=false`, 원문 요청은 404로 응답한다(다른 파일을 만들거나 연결하지 않음).

## 5. file·preview Endpoint

| Method / Path | 권한 | 응답 |
|---|---|---|
| `GET /api/admin/assessment/evaluation-plans/{planId}/revisions/{revisionId}/file` | 인증된 관리자(모든 학교) | 원문 형식 그대로, `attachment` |
| `GET …/revisions/{revisionId}/preview` | 동일 | PDF `inline`. HWP·HWPX `415 PREVIEW_UNAVAILABLE` |
| `GET /api/student/assessment/evaluation-plans/{planId}/file` | 학생: 자기 학교·학년도·학년·학기 + **확정된** 문서 | 최근 확정 Revision 원문, 그 외 404 |
| `GET /api/student/assessment/evaluation-plans/{planId}/preview` | 동일 | PDF `inline` |

공통: 정확한 `Content-Type`, UTF-8 파일명 `Content-Disposition`(업로드 시 경로·제어 문자 제거, 200자 제한), `nosniff`, `private, no-store`, 20MB 제한, 저장 파일 크기·SHA 불일치 또는 파일 없음 → `409 FILE_INTEGRITY_FAILED`, 원문 미보관 → 404, 인증 없음 → 401.
계약 반영: `docs/api/api-contract.md` §10-1(학생 공개 범위)·§10-1-1·§38-1·§38-2·§53·API-OD-A03 부분 결정(승인 범위만, 미커밋 C8 파일).

## 6. PDF/HWP/HWPX 원문 저장 테스트 결과

자동(`PlanOriginalFileApiTest`, 5건 PASS) [직접]
- PDF·HWP·HWPX 각각: 업로드 → `file.available`·형식·Content-Type·크기·SHA 응답 → 내려받은 바이트 = 원본 → **같은 Root로 새로 만든 Storage(재시작 상황)로 읽어도 SHA 동일** → 미리보기 PDF 200 inline / HWP·HWPX 415. Storage 파일 +3, 저장 키 응답 비노출.
- 같은 Plan 같은 파일 409 + 파일·Revision 남지 않음 / 다른 파일 개정 201 / 같은 슬롯 여러 문서·다른 문서의 같은 파일 허용(목록 3건).
- 저장 파일 변조·삭제 → 409, 원문 없는 이전 등록분 → `available=false`·404.

수동(격리 Schema `lh_a2_verify_20261113`, 임시 Storage, 포트 18081) [직접]
- `adm_gangnam` PDF 업로드 → `adm_bundang` 내려받기 SHA `f5839c05…` 일치 → **Backend 종료·재기동 후** 같은 SHA로 재다운로드, `file` 메타 유지.
- HWPX 업로드 → 내려받기 SHA `19cd28b6…` 일치, preview 415.
- 학생 `stu_001`: 확정 전 목록 0건·원문 404 → `adm_gangnam`이 확정 → 원문 200(SHA 일치)·preview 200·목록 1건 `CONFIRMED`, 다른 학교 문서 404.

## 7. PDF Viewer 실제 동작 [직접]

- Admin 검토 화면(`/assessment/evaluation-plans/{planId}/revisions/{revisionId}`): **왼쪽 원문 Viewer / 오른쪽 분석 결과**. 인증 API로 받은 미리보기를 blob 주소로 Student `PdfViewer`(pdf.js 5.4.296, 이미 Admin이 재사용 중)에 넘긴다 → **새 의존성 추가 없음(S-11 불필요)**.
- Playwright(Edge headless) 확인: 한글 합성 PDF 1쪽 캔버스 렌더링(비백색 픽셀 5,941), 다음 쪽 이동 후 다른 내용(4,807), 확대 후 캔버스 556→595px, 콘솔 오류 0건. 화면: `account-a-a2-original-storage-20261113/a2-admin-pdf-viewer-p1.png`, `…-p2-zoom.png`.
- 근거 쪽 이동: 분석 결과의 "PDF n쪽" 배지가 버튼이 되어 Viewer를 그 쪽으로 이동(원문 미리보기가 있을 때만). 자동 테스트는 없음(수동·코드 확인).
- 목록 화면: "원본 PDF/HWP/HWPX" 버튼 활성화(원문 있을 때), HTTP 모드에서 PDF·HWP·HWPX 파일 선택 허용, "서버는 원본을 보관하지 않아요" 문구 정정.
- Student: 신규 Route `/assessment/evaluation-plans/:planId/original`(`?page=N`), 평가계획서 선택 목록에 "원문 보기" 링크. **typecheck·lint·build만 확인, 브라우저 실행 확인은 하지 않았다**(Student 기본 `vite.config`에 `/api` Proxy가 없어 C4 개발 설정 필요). Student API는 위 수동 확인으로 검증.

## 8. HWP/HWPX Viewer 상태와 남은 과제

**미완료.** 원문 보관·내려받기·SHA 검증까지만 된다. 서비스 안 미리보기는 `previewAvailable=false`·415로 정직하게 표시하고, 화면은 "변환 엔진 검증 중 · 원본 내려받기" 안내를 보여 준다. 텍스트만 보여 주는 대체 화면은 만들지 않았다.

변환 엔진 비교 검증 계획(설치·도입 전 승인 필요, S-13)
1. 후보: ① LibreOffice headless + H2Orestart(HWP/HWPX import 확장) ② 한컴 공식 서버 변환 제품 ③ 상용 문서 Viewer SDK. 한컴오피스 데스크톱 자동화는 운영 불가(라이선스·무인 실행), **기준 PDF 생성용**으로만 검토. JS 렌더러는 표·HWPX 미흡으로 제외.
2. 표본: `references/curriculum-plan/`(Read-only)의 HWP·HWPX 중 병합 셀·수식·다단·가로 쪽·긴 표가 있는 문서 형식별 5개 이상. 외부 업로드 금지.
3. 기준: 쪽 수 일치, 표 구조(병합 셀), 수식, 글꼴 대체, 쪽 나눔, 분석기 Locator 텍스트가 변환 PDF Text Layer에서 찾아지는 비율. 문서별 체크리스트 + 쪽별 캡처 비교.
4. 라이선스: LibreOffice(MPL-2.0), H2Orestart(GPL 계열 — 별도 Process 실행 시 의무 범위 검토), 상용 제품은 계약 조건.
5. 실행 격리: 네트워크 차단, 임시 디렉터리, Timeout, 크기 상한, 동시 1건, 원문과 별도 Rendition 키 `(sha256, converter, version)`, 상태 `NOT_REQUESTED|CONVERTING|READY|FAILED|UNSUPPORTED`(Migration·계약 필요).
6. 통과한 엔진만 S-13 승인 후 도입. 그전까지 HWP/HWPX Viewer는 완료로 보고하지 않는다.

## 9. 모든 관리자 평가계획서 운영 권한 적용 결과

- 구조: `AdminActor(adminId, branchIds, evaluationPlanOperator)` — 학교 목록(`planOperationSchoolIds`) 제거. 값은 **인증 경계**(`AssessmentActorProvider`)가 채운다. Mock Provider는 모든 Mock·시연 관리자에게 `true`. 실제 LearnersHigh 인증 Adapter(1팀 연동 시)는 같은 값을 관리자 역할로 채우면 된다. 내부 Interface를 새로 만들지 않았다(ADR-0005·ArchUnit 규칙).
- `PlanAccess.requireOperator(admin)`: 학교 무관. 평가계획서 등록·개정·조회·분석 수신·검토·원문에만 쓰인다.
- 학생 공개: 확정 Revision만(업로드·분석만으로 공개 안 함). 확정 = 학생 공유(새 상태 Enum 만들지 않음).
- 추적: 등록자 `uploaded_by`, 확정자 `reviewed_by`, `reviewed_at`, Revision 번호 — 기존 컬럼 그대로. IT로 `adm_gangnam`→`adm_bundang` 등록자 기록 확인.
- 필수 검증 [직접]: 관리자 A 운정고(합성 ID) 업로드 ✓ / 관리자 B 같은 문서 조회·개정·분석 수신·원문 ✓ / 다른 학교 운영 ✓ / 인증 없음·알 수 없는 ID·학생 Header 401 ✓ / 학생 타 학교 403·404 유지 ✓ / 학생 기록·Student Care 테스트 PASS ✓.
- 남은 한계: Admin 화면의 학교 목록은 여전히 "담당 학생의 학교 + 개발 설정" 기준이다. **모든 학교 목록 API가 없어** 화면에서 임의 학교를 고를 수는 없다(API는 모든 학교 허용). 학교 원천(OD-A04)과 학교 목록 계약이 필요하다.

## 10. Student Care 보호·회귀

- Wangyu 경로(`studentcare/`, `features/student-care/`, `StudentCareRoute*`, `AdminUi.module.css`, `theme.css`, `index.css`, `e2e/`, `docs/specs/wangyu`, Student Care Migration) **변경 0건** [직접 `git diff 1790cb4`].
- AdminShell·App.tsx: 이번 세션 변경 없음(A0 백업 SHA와 동일).
- Student Care Backend 테스트 222건 PASS. Playwright E2E는 미실행(§3).

## 11. 기존 데이터 보존 [직접]

- 시연 DB `lh_demo_manual_20261111`: 접근·변경 없음. 확인 조회만 — Revision 5건, 수행평가 366건, Flyway 마지막 적용 2026-11-11(이전과 동일).
- 개발 결과물 Storage: 파일 100개 그대로, `plan-documents` 폴더 생성 안 됨(시험은 모두 임시 Root).
- 신규 생성: 격리 검증 Schema `lh_a2_verify_20261113`(root로 생성, 앱 사용자에게 그 Schema 권한만 부여) + 임시 Storage(`%TEMP%\lh-a2-verify-storage-*`). 합성 데이터만 있음. **삭제 여부는 사용자 결정**(기존 실험 DB 정리와 함께).
- Docker Volume·기존 Migration 변경 없음.

## 12. A3 Backend → Python 분석기 연동 다음 작업

1. `integration/analysis/PlanAnalyzerClient`(외부 경계 Interface) + `HttpPlanAnalyzerClient`(RestClient multipart, `X-Analysis-Token`은 환경 변수, connect 5s/read 130s, 연결 거부·503 BUSY만 2회 재시도) + `UnconfiguredPlanAnalyzerClient`(503).
2. `POST …/revisions/{revisionId}/analysis`(계약 §39에 이미 있음): **이제 `PlanDocumentStorage`에서 원문을 읽어** 분석기로 보낸다(브라우저 경유 제거) → `backendImport.payload` → 기존 `importAnalysis` 검증 경로 재사용 → `PlanAnalysisRun` 저장. 원문 없는 이전 등록분은 409/422로 거절.
3. 분석기 `requestId`·`analyzerChannel`·`elapsedMs` 기록(컬럼 부족 시 Migration 제안).
4. IT: 분석기 Stub(성공·Timeout·503·SHA 불일치·중복), 실제 8765 수동 1회.
5. 계정 B 요청서 R1~R6(월별 `teachingPlan`, `PARTIAL`, 과목별 `extraction`, `contractVersion`)은 `ACCOUNT-A-A0-A1-PREP-20261113.md` §6 그대로. **월별 운영 계획은 계정 B 실제 JSON 전까지 Mock을 공식 결과로 저장하지 않는다.**
6. Admin `requestPlanAnalysisHttp`의 `notConnected` 해제.

## 13. A1 레거시 삭제의 안전한 진행 조건

1. C4·C6 Commit(또는 같은 PR 포함) 승인 — Shell 파일이 아직 미커밋이라 삭제 diff와 섞인다.
2. 격리 Schema로 Student Care Playwright E2E 기준선 확보(삭제 전·후 비교).
3. D1: AdminShell 구조·디자인 유지, `extensionEntries`에서 폐기 6개 항목과 `App.tsx` 분기·import만 제거, `/`·Not Found 이동처는 `/assessment` 제안(Wangyu 리뷰).
4. D2~D3: `features/feedback`, `features/student-management`, `fixtures`, `read-model`, `store`, 전용 components, `assets/{activity-case,fixture-files}`, `student/assets/mentor-*` — 단계별 `git grep` 잔여 참조 0 + typecheck·lint·build + E2E.
5. D4 `frontend/mentor`(Shared 승인: workspace·lockfile).
6. Backend 레거시: 재검증 결과 전용 코드 없음(주석 2건뿐) → 삭제 작업 없음.

## 14. 오류·미완료

| 항목 | 상태 |
|---|---|
| C5 단독 빌드 | 불가(C4 의존). 보고만 함 |
| C2 해시 1차 비교 | 내 비교 Script 오류(Manifest의 `*경로` 표기)로 MISMATCH가 출력됐고 Commit이 먼저 진행됐다. 즉시 Blob·tar·Snapshot 3중 비교로 **바이트 동일**을 확인했다 |
| 검증 Backend 1차 기동 실패 | 앱 계정에 DB 생성 권한이 없음 → root로 격리 Schema 생성·권한 부여 후 기동 |
| HWP/HWPX 서비스 안 Viewer | 미완료(§8) |
| Student 원문 화면 브라우저 확인 | 미실행(§7) |
| 근거 쪽 이동 자동 테스트 | 없음 |
| 모든 학교 목록 API | 없음(§9) |
| 업로드 동시성(같은 파일 동시 2건) | Plan `@Version` 낙관적 락으로 한쪽만 성공할 것으로 판단 [정적], 전용 테스트 없음 |
| A2 코드 Commit | 승인 범위 밖이라 미커밋. `refs/backup/a2-20261113`에 고정 |
| Push | 하지 않음. Push 전 C7 문서의 로컬 경로 정리 결정 필요 |
