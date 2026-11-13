# [계정 A] Phase A0 실행 · A1 삭제 영향 분석 · A2~A5 구현 준비 보고 (2026-11-13)

> 작성: 계정 A (Assessment 개발). 브랜치 `feature/assessment-student-integration-enhancement`, HEAD `1790cb4`.
> 범위: 첫 실행 지시 STEP 1~5. **레거시 삭제, 기능 구현, Shared 파일 변경, Git Commit(브랜치), Push는 하지 않았다.**
> 실행한 변경은 ① 저장소 밖 백업 폴더 생성 ② 로컬 전용 Git Snapshot Ref 생성 ③ 이 보고서 파일 작성뿐이다.
> 표기: **[직접]** 이번에 실행·조회 / **[정적]** 코드 정적 확인 / **[과거]** 11-13 보고서 기반.
> 이 저장소는 Public이다. 토큰·비밀번호·`.env` 값과 기존 LearnersHigh 원본 저장소 정보는 쓰지 않았다.

---

## 0. 요약 (10줄)

1. **보존 완료**: 미추적·수정 파일 814개를 저장소 밖 `C:\learnershigh-backups\20261113-a0\`에 tar + SHA-256 Manifest + Binary Patch로 백업했고, 같은 내용을 로컬 전용 Ref `refs/backup/a0-20261113` (`1325d0b`)에 Git 객체로 고정했다. 작업 트리·Index·브랜치는 그대로다. [직접]
2. **테스트 기준선**: Backend Unit 272/272 PASS, Integration 144/144 PASS, Frontend typecheck·lint·build(student·admin·mentor) 모두 exit 0. [직접]
3. **11-13 보고서 대비 차이**: Backend 소스·Git 상태는 보고서와 같다(Java 132개 미추적, Migration 6개 미추적). 차이는 3가지다. ① Student Mentor Hub·School & Admissions는 이미 `1790cb4`에서 삭제됨 ② API 계약 §38은 "슬롯당 여러 PDF 허용"이라 슬롯 중복은 결함이 아니다(문제는 SHA 중복) ③ 계약 §11/§39에 `teachingPlan`·`achievement`가 이미 예약돼 있다.
4. **Commit 보류 사유**: Assessment Backend는 Shared 파일(`build.gradle.kts`의 PDFBox·anthropic-java, `application.yml`의 `assessment.*`)이 있어야 빌드된다. Suyeon 파일만 Commit하면 그 Commit은 빌드되지 않는다 → 순서 있는 Commit 계획(§2-3)을 승인받아야 한다.
5. **레거시 Backend 코드 없음**: `mentor/`, `school/`, `studentmanagement/`, Today Board·Operations 전용 Java 코드·Table·Migration은 없다. 남은 레거시는 **Frontend뿐**이다(Admin 73개 + 자산 15개, Student 자산 30개, `frontend/mentor` 115개). [직접 grep]
6. **Student Care 보호**: `features/student-care`는 외부 import가 0건이다. 레거시와 공유하는 것은 `AdminUi.module.css`(StudentCareRoute가 사용), Shell(`App.tsx`·`AdminShell.tsx`), 전역 CSS뿐이다. Assessment Admin은 레거시를 import하지 않는다(`app/adminLocation.ts`만 사용).
7. **A2 원문 저장은 Migration 없이 가능**: `assessment_plan_revision.file_ref VARCHAR(64)`가 이미 있고, `ArtifactStorage`(UUID 키) 패턴을 그대로 쓸 수 있다. 원문 폐기 지점은 `PlanRevision.upload(...)`의 `revision.fileRef = null` 한 곳이다.
8. **HWP/HWPX 변환 엔진은 검증된 것이 없다**: 로컬에 LibreOffice가 없고, 한컴오피스 2024는 데스크톱 제품이다. 후보 엔진을 실제 문서로 비교 검증하기 전에는 레이아웃 보존을 주장하지 않는다(§7).
9. **분석기 계약 공백**: 월별 교수·학습 운영 계획(`teachingPlan`)은 분석기 출력과 Backend DTO에 모두 없고, Backend import는 `PARTIAL` 상태를 받지 못한다(`REVIEW_REQUIRED|FAILED`만). 계정 B 계약 개정안을 §6에 정리했다.
10. **11/17 P0 권고**: A0 Commit(승인 후) → A2 원문 저장·PDF Viewer → A3 Backend→분석기 동기 호출 → A4 검토·확정 최소 연결(과목 매핑 + PUT review) → A5 학생 확정값 조회. A1 Admin 삭제와 A4 전면 개편·월별 계획 탭은 승인·계약이 선행돼야 하므로 11/17 이후로 미룬다(§9).

---

## 1. Phase A0 완료 내역

| # | 작업 | 결과 | 근거 |
|---|---|---|---|
| 1 | Git 상태 확인 | 변경 188건(Porcelain 기준, 디렉터리 단위 접힘). 파일 단위 미추적 714개(`--untracked-files=all`) | [직접] `git status` |
| 2 | Tracked/Modified/Untracked 분리 | `C:\learnershigh-backups\20261113-a0\git-status.txt`, `ownership-classification.tsv` | [직접] |
| 3 | Assessment 보존 상태 | Backend main 132 Java + test 19 Java + test resources 13 + main resources 2 미추적. Admin `features/assessment` 53개 미추적. Migration 6개 미추적. Student Assessment 84개 수정 + 미추적 다수 | [직접] |
| 4 | 추적 가능성 | **이전에는 불가**(한 번도 Commit 안 됨) → 이번에 Snapshot Ref로 Git 객체화(§2-2) | [직접] |
| 5 | 안전한 백업 | 저장소 밖 tar(814 파일, 60MB) + SHA-256 Manifest + `git diff --binary` Patch + 삭제 파일 목록 | [직접] |
| 6 | 소유권 분류 | §2-1 | [직접] |
| 7 | 실행 환경·테스트 | §1-1 | [직접] |

### 1-1. 테스트 기준선 (2026-11-13, 변경 전)

| 검증 | 명령 | 결과 | 로그 |
|---|---|---|---|
| Backend Unit (ArchUnit 포함) | `backend/gradlew test` | **272 실행 / 실패 0 / 오류 0 / 건너뜀 0**, BUILD SUCCESSFUL | `baseline-gradle-test.log` |
| Backend Integration (Testcontainers MySQL) | `backend/gradlew integrationTest` | **144 실행 / 실패 0 / 오류 0 / 건너뜀 0**, BUILD SUCCESSFUL (5m 16s). 시연 DB 미사용(Testcontainers 일회성 MySQL) | `baseline-gradle-it.log` |
| Frontend Typecheck | `npm run typecheck` (student·admin·mentor) | exit 0 | `baseline-fe-typecheck.log` |
| Frontend Lint | `npm run lint` (oxlint `--deny-warnings`) | exit 0 | `baseline-fe-lint.log` |
| Frontend Build | `npm run build` | exit 0 (student 392 / admin 562 / mentor 125 modules) | `baseline-fe-build.log` |
| Student Care E2E | `e2e/` Playwright | **이번에 실행 안 함** — 아래 주의 참고 | — |

로그는 모두 `C:\learnershigh-backups\20261113-a0\`에 있다.

**Student Care E2E 실행 주의 (데이터 보호)**: `e2e/tests/support.ts`의 `resetBackend()`가 `POST /api/test/reset`을 부른다. 시연 DB `lh_demo_manual_20261111`에 붙은 Backend로 실행하면 안 된다. A1 삭제 PR에서는 **새 빈 Schema**(예: `lh_e2e_a1_<날짜>`)로 Backend를 `e2e` Profile + `LEARNERSHIGH_TEST_ENDPOINTS_ENABLED=true`로 띄우고, Admin `vite preview --port 4174`에 대해 실행한다. 기존 Volume·DB는 건드리지 않는다.

실행 환경: Docker `learnershigh-mysql`(mysql:8.4, 3307) 실행 중, 분석기 8765 `/health` 200, Backend 18080·Vite는 꺼져 있음. Java는 PATH가 17이지만 Gradle Toolchain이 21을 사용한다. [직접]

---

## 2. Git 보존 상태

### 2-1. 소유권 분류 (Porcelain 188건)

| 분류 | 건수 | 내용 |
|---|---|---|
| **Suyeon** (수정) | 84 | `frontend/student/src/features/assessment/**` 등 |
| **Suyeon** (미추적) | 45 항목 | `backend/**/assessment/**`(main·test·resources), `frontend/admin/src/features/assessment/`, `frontend/admin/student-preview.html`, Student Assessment 신규 파일, `docs/specs/suyeon/**` 보고서 폴더 |
| **Suyeon** (삭제) | 4 | `docs/specs/suyeon/features/{mentor-hub,parent-progress,school-admissions,student-management}.md` (구형 명세, HEAD에 보존됨) |
| Suyeon dev tool | 1 | `frontend/student/tools/universityExamPdfDevServer.ts` (Shared `vite.config.ts` 2개가 import) |
| **Shared** (수정) | 34 | `CLAUDE.md`, `AGENTS.md`, `ARCHITECTURE.md`, `README.md`, `.claude/rules/*` 7개, `docs/OWNERSHIP.md`, `docs/SOURCE_OF_TRUTH.md`, `docs/adr/0001~0005,README`, `docs/api/api-contract.md`, `docs/architecture/*` 4개, `backend/build.gradle.kts`, `backend/src/main/resources/application.yml`, `frontend/admin/src/App.tsx`, `frontend/admin/src/app/AdminShell.tsx·.module.css`, `frontend/{admin,student}/vite.config.ts`, `scripts/verify*.ps1` 3개 |
| **Shared** (미추적) | 3 | `docs/adr/0008`, `docs/adr/0009`, `scripts/CLAUDE.md` |
| Shared DB (Assessment 전용 Table) | 6 | `database/migrations/V202611090300…V202611111620` — **이미 시연 DB에 적용됨 → 내용 수정 금지, 그대로 Commit해야 함** |
| Reference (Read-only) | 10 | `references/claude-design-mockup/LearnersHighAssessment/`, `references/design/`, `references/mock-exam/`, `references/previous-exam-questions/`, `references/reference-link/` 등 |
| 빌드 산출물 | 1 | `backend/bin/` (IDE 컴파일 출력. `.gitignore`에 없음 → Commit하지 않음. ignore 추가는 Shared 제안) |
| **Wangyu** | **0** | `studentcare`, `features/student-care`, `docs/specs/wangyu`, `e2e/` 변경 없음 |

참고: `application.yml` diff는 전체 줄이 바뀐 것으로 나오지만 실제 추가 내용은 `servlet.multipart`, `assessment.{ai,storage,plan-review,demo-roster,analysis-import}` 블록이다(줄바꿈 형식 변경 추정). Commit 전에 `git diff --ignore-cr-at-eol`로 확인할 것.

### 2-2. 이번에 실행한 보존 작업

| 보존 단위 | 위치 | 내용 | 복원 방법 |
|---|---|---|---|
| 파일 백업 | `C:\learnershigh-backups\20261113-a0\worktree-changed-and-untracked.tar` | 수정·미추적 814 파일 (`backend/bin` 제외, Reference 포함) | `tar -xf … -C <대상>` 후 `sha256-manifest.txt`로 `sha256sum -c` |
| Patch | `tracked-changes.binary.patch` | 추적 파일 수정분 (`git diff --binary`) | `git apply` |
| 기준 정보 | `HEAD.txt`, `git-status.txt`, `deleted-files.txt`, `filelist.txt` | HEAD `1790cb4…`, 브랜치명 | — |
| **Git Snapshot** | `refs/backup/a0-20261113` → `1325d0b` (부모 `1790cb4`) | 791 파일. `backend/bin`, `references/previous-exam-questions`(대학 기출 PDF, 저작권) 제외 | `git checkout 1325d0b -- <경로>` 또는 `git diff 1790cb4 1325d0b` |

Snapshot은 임시 Index(`GIT_INDEX_FILE`)로 만들었다. 실제 Index·작업 트리·브랜치는 바뀌지 않았다(확인: 상태 188건 유지, staged 0). `refs/backup/*`은 브랜치가 아니므로 기본 `git push`로 올라가지 않는다. **이 Ref는 Push하지 말 것**(Public 저장소, 시연 문서 폴더에 합성 학생 파일 포함).

### 2-3. 브랜치 Commit 계획 (승인 필요 — 이번에 실행 안 함)

각 Commit이 독립적으로 빌드되게 의존 순서대로 나눴다. Push는 별도 승인.

| 순서 | Commit | 파일 | 소유 | 승인 |
|---|---|---|---|---|
| C1 | `build(backend): add assessment deps and config` | `backend/build.gradle.kts`, `backend/src/main/resources/application.yml` | Shared | **Wangyu 확인** (P-31 PROPOSED) |
| C2 | `feat(db): assessment migrations (already applied, verbatim)` | Migration 6개 | Shared DB | Wangyu 확인 (Assessment 전용 Table, Student Care Table 미변경) |
| C3 | `feat(assessment): backend domain, API, tests` | `backend/src/{main,test}/java/**/assessment/**`, `backend/src/{main,test}/resources/assessment/**` | Suyeon | 본인 |
| C4 | `feat(assessment): student frontend http integration` | `frontend/student/src/features/assessment/**`(수정+신규), `frontend/student/tools/**` + `frontend/student/vite.config.ts`(Plugin을 tools로 옮긴 리팩터) | Suyeon + Shared 1개 | vite.config는 동작 동일 리팩터 → 리뷰 요청 |
| C5 | `feat(assessment): admin assessment feature` | `frontend/admin/src/features/assessment/**`, `frontend/admin/student-preview.html` | Suyeon | 본인 |
| C6 | `feat(admin): assessment entry in shell` | `frontend/admin/src/App.tsx`, `app/AdminShell.tsx·.module.css`, `frontend/admin/vite.config.ts` | Shared Shell | **Wangyu 리뷰 필수** (P-06) |
| C7 | `docs(assessment): suyeon specs and reports` | `docs/specs/suyeon/**`(삭제 4건 포함) | Suyeon | 본인 |
| C8 | `docs: harness/ADR/contract updates` | 루트 문서, `.claude/rules/*`, `docs/adr/*`, `docs/api/api-contract.md`, `docs/architecture/*`, `docs/OWNERSHIP.md`, `docs/SOURCE_OF_TRUTH.md`, `scripts/*` | Shared | **팀 승인** (ADR-0008·0009 포함) |
| — | Commit 안 함 | `backend/bin/`, `references/**` | — | Reference는 별도 결정 |

C3~C5·C7은 Suyeon 단독으로 진행할 수 있지만 **C1 없이 C3는 빌드되지 않는다**. C1을 승인받기 전에 C3를 먼저 넣으려면 C1+C3를 한 Commit으로 묶고 PR에서 Shared 변경을 명시하는 방법도 있다.

### 2-4. 시연 데이터·Storage 보존 (변경 없음)

시연 DB `lh_demo_manual_20261111`, 실험 DB 41개, `~/.learnershigh-extension/dev-artifact-storage`(파일 100개)는 읽지도 바꾸지도 않았다. 실험 DB 정리는 별도 결정 사항으로 남긴다.

---

## 3. 레거시 삭제 대상 전체 목록 (Phase A1 영향 분석, 삭제 미실행)

### 3-0. 11-13 보고서·cleanup-plan 대비 현재 상태

| 대상 | `legacy-cleanup-plan.md`(10-26) | 현재 [직접] |
|---|---|---|
| Student `features/mentor-hub/` (135) | 삭제 예정 | **삭제됨** (`1790cb4`, 10-29) |
| Student `features/school-admissions/` (96) | 삭제 예정 | **삭제됨** (`1790cb4`) |
| Student Nav `mentor`·`schoolActivity` | 삭제 예정 | **삭제됨** |
| Student `src/assets/activity-case/` | — | **삭제됨** |
| Student `frontend/student/assets/mentor-{man,woman}/` (30) | — | **남아 있음**. Student 코드는 사용 안 함, Admin Fixture만 사용 |
| Admin 구형 6개 기능 | 미착수 | **남아 있음** |
| `frontend/mentor/` workspace (115) | 미착수 | **남아 있음** |
| Backend 구형 패키지 | 없음 | **없음** (`assessment`, `common`, `studentcare`만 존재) |

### 3-1. Admin 삭제 대상 (전용 코드)

| 묶음 | 파일 | 전용 근거 |
|---|---|---|
| Feedback Dashboard (구형 Queue, ADR-0003 Superseded) | `features/feedback/` 11개: `ActivityFeedbackPage`, `FeedbackDashboardPage(.module.css)`, `ReviewPage.module.css`, `ReviewTopBar`, `TaskReviewPage`, `TopicReviewPage`, `model/feedbackQueue.ts`, `routes/{FeedbackDashboardRoute,FeedbackReviewRoute,paths}` | `App.tsx`에서만 import |
| Today Board · Student 360 · Mentor 추천 · Connection 검토 · Interview 관리 · Operations | `features/student-management/` 21개 (`TodayBoardPage`, `Student360Page`, `MentorRecommendPage`, `MentorCaseDetailPage`, `MentorContent*`, `MentorProfilePage`, `MentorPhoto`, `ConnectionReviewPage`, `Connection.module.css`, `model/connection.ts`, `InterviewManagementPage`, `OperationsPage`, `InspectorPages`, `OutreachDialogs`, `Recommend{Case,Content}Dialog`, `StudentManagement.module.css`, `routes/{StudentManagementRoutes,paths}`) | `App.tsx`에서만 import |
| 전용 Fixture | `fixtures/` 13개 (`admin{Activities,Connections,Evidence,Feedback,Mentor,MentorCaseDetails,MentorContent,MentorPhotos,Records,Students,Tasks}.fixture.ts`, `snapshot.ts`, `types.ts`) | 레거시와 레거시 전용 components만 사용 |
| 전용 Read Model | `read-model/` 11개 (`feedbackQueue`, `integrity`, `materialRole`, `mentorContent`, `operations`, `student360`, `studentInsights`, `studentProjection`, `taskDetail`, `time`, `todayBoard`) | 동일 |
| 전용 Store | `store/adminCommands.ts`, `store/adminStore.ts` | `App.tsx`의 `configureCommandScenario` 호출 1곳 + 레거시 |
| 전용 Components | `components/{TaskInspector,ActivityInspector,AdminFilePreview(.module.css),filePreview.ts,Inspector.module.css,AdminVisual(.module.css),AdminIcons}` | 레거시 Route·Fixture만 사용 |
| 전용 Asset | `assets/activity-case/**`(5), `assets/fixture-files/**`(10) | `fixtures/`만 사용 |
| Student 쪽 Asset (Admin 전용 사용) | `frontend/student/assets/mentor-man/`(15), `mentor-woman/`(15) | `fixtures/adminMentorPhotos.fixture.ts`만 import |
| `app/useScreenLoad.ts` | 1 | 레거시만 사용 (삭제 PR에서 재확인) |

합계: Admin 소스 73 + 자산 15, Student 자산 30.

**Backend 대응 코드: 없음.** Mentor·Today Board·Interview·Operations·Connection 관련 Controller/Service/Repository/DTO/Migration은 존재하지 않는다(`grep -rliE "mentor|today.?board|interview|operations"` → 주석 2건: `StudentCareQueryService` Javadoc의 "예: Today Board", `AdminActor`의 `planOperationSchoolIds`). 주석 수정은 Wangyu 파일이므로 하지 않는다.

### 3-2. `frontend/mentor/` Workspace

115개 파일. 참조: `frontend/package.json`의 `workspaces`·`dev:mentor`, `package-lock.json`, `README.md` 4곳, `.claude/rules/frontend-mentor.md`. 다른 Workspace·e2e·CI에서 import 없음. 제거하면 `frontend/package.json`과 Lockfile이 바뀐다(Shared).

### 3-3. 이름이 같지만 보존할 것

| 보존 | 이유 |
|---|---|
| `features/assessment/routes/FeedbackListRoute.tsx`, `FeedbackDetailRoute.tsx` | 신규 Assessment 피드백(ADR-0009). 구형 `features/feedback`와 import 관계 없음 |
| `features/assessment/routes/StudentsRoute`, `StudentDetailRoute`, `StudentRecordRoute`, `StudentViewRoute` | Assessment 학생 기록 조회. 구형 Student 360과 무관 |
| `AdminUi.tsx`(`NoticeState`) | `App.tsx` Not Found 화면이 사용. 레거시 삭제 후에도 남김 |
| `features/assessment/components/AdminParts.tsx` | Assessment 전용(이름만 비슷) |

### 3-4. 삭제 단계 제안

| 단계 | 내용 | 검증 | 승인 |
|---|---|---|---|
| D0 | (A0 Commit 완료 후) 브랜치 분기 | — | — |
| D1 | `App.tsx`: 구형 Route 분기·import 제거, `/`와 Not Found 이동처를 `/assessment`(또는 Wangyu가 정한 화면)로 변경, `configureCommandScenario` 호출 제거. `AdminShell.tsx`: `extensionEntries`에서 6개 항목 제거, `AdminExtensionEntryId` 축소 | typecheck·lint·build, Student Care E2E(격리 Schema) | **Wangyu 리뷰** (Shell·`/` 기본 화면) |
| D2 | `features/feedback`, `features/student-management` 삭제 | `git grep` 잔여 참조 0, L1 | Suyeon |
| D3 | `fixtures/`, `read-model/`, `store/`, 전용 components, `assets/{activity-case,fixture-files}`, `student/assets/mentor-*` 삭제 | L1 + dist에 `mentor-` 자산 0 | Suyeon |
| D4 | `frontend/mentor/` 삭제 + `frontend/package.json`·Lockfile·README·`.claude/rules/frontend-mentor.md`·`scripts/verify.ps1` 정리 | `npm ci` 재현, CI | **Shared 승인** |
| D5 | e2e `support.ts` 주석("'/'는 Feedback Dashboard") 갱신 | — | Shared(e2e) |

**DB·Migration**: 구형 기능 Table·Migration이 없으므로 DB 작업은 필요 없다.

---

## 4. Student Care 보호 확인 결과

| 확인 | 결과 | 근거 |
|---|---|---|
| `features/student-care`의 외부 import | **0건** (React와 내부 상대 경로만) | [직접] grep |
| Student Care가 사용하는 Shared | `app/StudentCareRoute.tsx`(`AdminUi.module.css`의 `ui.page`), `app/theme.css`, `index.css`, `main.tsx`, `App.tsx` 분기, `AdminShell` Entry `student-care` | [직접] |
| 레거시 삭제 시 영향 | `AdminUi.module.css`·`AdminUi.tsx`·`theme.css`·`index.css`는 **삭제 목록에서 제외**. Shell 수정(D1)은 Student Care Entry·Route를 그대로 둔다 | §3 |
| E2E 영향 | `e2e/tests/*`는 `/student-care`로 직접 이동(`STUDENT_CARE_PATH`) → 구형 Route 제거와 무관. 단 D1 PR에서 실제 실행으로 확인 | [정적] |
| Backend | `studentcare/` 변경 없음. 구형 Domain이 없으므로 Backend 삭제 영향 없음 | [직접] |
| 이번 작업의 Wangyu 파일 변경 | **0건** | §2-1 |

---

## 5. Shared 승인 필요 항목

| ID | 항목 | 대상 | 필요한 결정 |
|---|---|---|---|
| S-1 | A0 Commit C1·C2·C6·C8 | §2-3 | Commit 허용·순서 (P-06, P-31, ADR-0008·0009) |
| S-2 | Admin Shell 레거시 제거 (D1) | `App.tsx`, `AdminShell.tsx` | 구형 Entry 6개 제거, `/` 기본 화면 |
| S-3 | `frontend/mentor` 제거 (D4) | `frontend/package.json`, Lockfile, README, rules, verify | Workspace 제거 |
| S-4 | 평가계획서 원문 파일 Endpoint 계약 | `api-contract.md` §10·§38·§48 | 신규 GET file/preview Endpoint, 응답 `file` 블록 (§8 A2) |
| S-5 | 평가계획서 Storage 결정 (API-OD-A03) | 개발용 로컬 Storage를 MVP에 사용 | 결과물과 같은 방식(11-11 승인)을 평가계획서에도 적용할지 |
| S-6 | 서버 분석 실행 응답 계약 | §39 `POST .../analysis` | 동기 MVP / 비동기 상태 Shape |
| S-7 | `analysis-imports` 계약 등록 여부 | 현재 PROPOSED·기본 404 | 개발 전용 유지 vs 공식화 |
| S-8 | HWP·HWPX 다중 형식 공식화 | §39 확장 M-1~M-7, `format`·`documentLocator` | 실험 Flag 해제 조건 |
| S-9 | 월별 교수·학습 계획 확정 필드 | `ReviewFieldRules` 화이트리스트 + §39 | `teachingPlan[]` 필드 경로 |
| S-10 | OD-A08 MVP 운영 권한 | `MockHeaderAssessmentActorProvider` | 시연 15개 학교 운영자 부여 방식 |
| S-11 | Admin에 `pdfjs-dist` 추가 | `frontend/admin/package.json`, Lockfile | Student와 같은 5.4.296. 대안: Student Loader 상대 import(이미 `vite.config`가 student/tools를 import하는 선례 있음) |
| S-12 | `backend/bin/` ignore | `.gitignore` | IDE 출력 무시 |
| S-13 | 변환 엔진 도입 | Backend 런타임 의존성·라이선스 | §7 평가 후 |

---

## 6. Backend–분석기 계약 초안 (계정 B 합의용, DRAFT)

### 6-1. 현재 실제 Interface [직접·정적]

- 분석기 `curriculum-analysis-preview 0.1-dev`, 계약명 `analyze-preview-0.1-dev`("공식 Shared API 계약 아님"). 127.0.0.1 전용, CORS 거부.
- `GET /health` (인증 없음), `POST /analyze-preview` multipart: `file`, `analyzerVersion`(v21.1 기본 | v21 | v21.2-quality), `includeAnalysis`, `fileId`, `includeInferred=false`. Header `X-Analysis-Token` 필수. 상한 20MB · 120초 · 동시 2건.
- 응답 Envelope: `service, requestId, ok, status, analyzerVersion, analyzerChannel, analyzer, analysisMode, source{…, pageCount, sectionCount}, reviewState, summary, backendImport, warnings[], errors[], elapsedMs, (analysis)`. `status` ∈ `OK_REVIEW_REQUIRED | PARTIAL | PARSE_FAILED | UNSUPPORTED_FORMAT | REJECTED | ERROR`.
- `backendImport.payload`(PDF) = Backend `AnalysisImportRequest` (`dto/plan/AnalysisImportRequest.java`): `analyzer{name,version}`, `source{sha256,pageCount,format?}`, `status`(`REVIEW_REQUIRED|FAILED`만), `failureReason`, `subjects[]{subjectName,pageRange,writtenEvaluation{weightPercent,exams[],sources},performanceEvaluation{weightPercent,items[]{itemKey,label,area,timing,weightPercent,maxScore,content,submissions,conditions,rubric[]{element,levels[]{description,score},sources},sources},sources},sources}`, `warnings[]`. 알 수 없는 필드는 거절.
- HWP·HWPX: `backendImport.variant=EXPERIMENTAL_MULTIFORMAT`, Locator는 `documentLocator{kind,section,path,table,row,col,rowSpan,colSpan,control,cell}`.

### 6-2. 공백

| # | 공백 | 영향 |
|---|---|---|
| G1 | **월별 교수·학습 운영 계획** 없음 (분석기 출력·Backend DTO 모두. 분석기에는 Golden 기대값 키 `teachingPlan`만 있음) | A4 월별 탭·A5 학생 표시 불가 |
| G2 | Backend import `status`가 `PARTIAL`을 못 받음 | 부분 결과가 `REVIEW_REQUIRED`로 뭉개짐 |
| G3 | 분석기 A-3: 부분 결과가 `OK_REVIEW_REQUIRED`로 나오는 사례 | 잘못된 확정 위험 |
| G4 | 공통 문서 정보(문서상 학교명·학년도·학년·학기) 미추출 | 업로드 슬롯과 문서 불일치 감지 불가 |
| G5 | 과목별 추출 상태·오류 코드 없음 (문서 단위 `warnings` 문자열만) | 관리자 UI에서 "누락·오류 표시" 불가 |
| G6 | 계약 버전 필드 없음 | 호환 판단 불가 |
| G7 | 성취기준·성취수준(`achievement`) 미출력 | 계약 §11에는 예약됨 |

### 6-3. 개정안 `analysis-import-0.3` (호환 유지)

원칙: **기존 필드는 그대로 두고, 새 필드는 모두 선택(Optional)**. Backend는 `contractVersion`이 없으면 0.2로 보고 기존 검증을 그대로 쓴다. 0.3이면 아래 필드를 추가로 허용한다(알 수 없는 필드 거절 원칙은 유지).

```jsonc
{
  "contractVersion": "0.3",                       // 신규, 없으면 0.2
  "analyzer": { "name": "...", "version": "v21.1", "profile": "DEFAULT" },  // profile 신규(선택)
  "source": { "sha256": "...", "format": "PDF|HWP|HWPX", "pageCount": 12, "sectionCount": null },
  "status": "REVIEW_REQUIRED | PARTIAL | FAILED",  // PARTIAL 신규
  "failureReason": null,
  "document": {                                   // 신규(선택) — 후보값, 확정 아님
    "schoolName":   { "value": "…", "sources": [ /* Locator */ ] },
    "academicYear": { "value": 2026, "sources": [] },
    "grade":        { "value": 1, "sources": [] },
    "semester":     { "value": 2, "sources": [] }
  },
  "subjects": [{
    "subjectName": "…", "pageRange": { "from": 3, "to": 9 },
    "extraction": {                               // 신규(선택)
      "status": "COMPLETE | PARTIAL | MISSING_SECTION",
      "issues": [ { "code": "RUBRIC_NOT_LINKED", "fieldPath": "performanceEvaluation.items[1].rubric", "message": "…" } ]
    },
    "writtenEvaluation": { /* 기존 */ },
    "performanceEvaluation": { /* 기존 */ },
    "teachingPlan": [{                            // 신규(선택), 수행평가와 분리
      "rowKey": "tp_01",
      "month": 3, "weekLabel": "1~2주", "weekFrom": 1, "weekTo": 2,
      "unit": "…",
      "achievementStandards": [ { "code": "[10통과1-01-01]", "text": "…" } ],
      "inquiryProcess": "…", "teachingMethods": ["…"], "assessmentMethods": ["…"],
      "linkageFocus": "…",                       // 수업·평가 연계의 주안점
      "specialSchedule": "1차 지필평가",           // 정기시험 등
      "sources": [ /* Locator */ ]
    }],
    "achievement": { "standards": [], "levels": [], "thresholds": [] },  // 계약 §11 예약분, 선택
    "sources": []
  }],
  "warnings": [ "…" ]
}
```

- 원문에 없는 값은 `null`(0이나 빈 문자열로 바꾸지 않음), INFERRED 값은 보내지 않는다(기존 원칙 유지).
- 정확도·신뢰도 수치는 계약에 넣지 않는다(공식 데이터 오염 방지, 기존 원칙).
- Error 코드 후보: `SUBJECT_SECTION_NOT_FOUND`, `RUBRIC_NOT_LINKED`, `TABLE_COLUMN_MERGED`, `NAME_UNREADABLE`, `WEIGHT_SUM_MISMATCH`. 최종 목록은 계정 B가 정한다.

### 6-4. 서버 간 호출 규약 (Backend가 Client)

| 항목 | MVP (11/17) | 이후 |
|---|---|---|
| Endpoint | 기존 `POST /analyze-preview` 그대로 (`includeAnalysis=false`, `fileId=revisionId`) | `POST /v1/analyses` → `202 {jobId}`, `GET /v1/analyses/{jobId}` |
| 인증 | `X-Analysis-Token`. Backend 환경 변수(`ASSESSMENT_ANALYZER_TOKEN`)로만 주입. 로그·응답·문서에 쓰지 않음 | mTLS 또는 서명 토큰 |
| Timeout | connect 5s, read 130s (분석기 120s + 여유) | 비동기로 대체 |
| Retry | 연결 거부·`503 BUSY`만 최대 2회(지수 백오프). 4xx·422·Timeout은 재시도 안 함 | Job 단위 재시도 |
| 멱등 | `(revisionId, payload_sha256)` Unique 기존 제약 재사용. 같은 Revision 분석 중 중복 요청은 409 | `Idempotency-Key` |
| 결과 검증 | `source.sha256 == revision.sha256` (기존 `AnalysisImportValidator`) | 동일 |
| 기록 | `analyzer.version`, `analyzerChannel`, 분석기 `requestId`, `elapsedMs`, status, warnings | Job 상태 이력 |

**계정 B 요청서 (분석기 변경이 필요한 항목, 계정 A는 구현하지 않음)**: R1 `teachingPlan[]` 출력(G1) · R2 부분 결과를 `PARTIAL`로 판정(G2·G3, A-3) · R3 과목별 `extraction` 상태(G5) · R4 `contractVersion` 표기(G6) · R5 문서 메타 후보(G4, 선택) · R6 HWP/HWPX 결과를 `EXPERIMENTAL_MULTIFORMAT`에서 0.3 정식 Shape로 승격.

---

## 7. PDF/HWP/HWPX Viewer 구현 전략

### 7-1. 공통 구조

```text
원본(불변, 형식 그대로) ── storageKey = PlanRevision.fileRef
        │
        ├─ PDF  → 원본을 그대로 Viewer에 전달
        └─ HWP/HWPX → 서버 변환 PDF "Rendition"(파생물, 원본과 별도 키)
                       키: (revision.sha256, converterName, converterVersion)
                       상태: NOT_REQUESTED | CONVERTING | READY | FAILED | UNSUPPORTED
```

- 인증이 Header(`X-Assessment-*`, 이후 실제 토큰)라서 `<iframe src>`로는 인증 헤더를 붙일 수 없다 → **`fetch`로 바이트를 받아 pdf.js `getDocument({ data })`로 그린다**. 현재 결과물 Viewer의 `iframe`(`ArtifactViewerRoute.tsx:309`) 방식은 평가계획서에 쓰지 않는다.
- pdf.js는 Student에 이미 `pdfjs-dist 5.4.296`(Apache-2.0)과 동적 Loader(`components/university/pdfjsLoader.ts`, `PdfViewer.tsx`)가 있다. 이것을 평가계획서 Viewer로 일반화하고, Admin은 S-11 결정에 따라 의존성을 추가하거나 Loader를 재사용한다.
- 기능: 페이지 이동, 확대·축소, Text Layer 기반 검색(PDF·변환 PDF), `pdfPageNumber` 근거로 이동, Revision·SHA 표시(Version 변경 확인), 원본 다운로드(형식 그대로), 변환 실패·미지원 상태 화면.
- HWP·HWPX 근거 이동: 분석기 Locator는 쪽이 아니라 구역·표·행·열이다. 변환 PDF에서 `extractedText`를 Text Layer로 찾아 이동하고, 못 찾으면 Locator(구역·표·행·열)를 그대로 보여 준다. 정확한 쪽 연결이 된다고 가정하지 않는다.

### 7-2. HWP/HWPX 변환 엔진 — 검증 전 후보 (선정하지 않음)

현재 로컬에는 LibreOffice가 없고, 한컴오피스 2024(데스크톱)만 설치돼 있다. [직접]

| 후보 | 형식 | 장점 | 위험 | 판단 |
|---|---|---|---|---|
| LibreOffice headless + H2Orestart 확장 | HWP·HWPX → PDF | 서버 실행 가능, 오픈소스 | 표·병합 셀·수식·글꼴 재현 품질 미검증. 확장 라이선스(GPL 계열) 검토 필요. 한글 글꼴 설치 필요 | **1순위 평가 대상** |
| 한컴 공식 서버 변환 제품 | HWP·HWPX | 원본 제작사, 품질 기대 | 상용 계약·비용·배포 환경 | 견적·라이선스 확인 대상 |
| 한컴오피스 데스크톱 자동화(COM) | HWP·HWPX | 품질 기준으로 쓸 수 있음 | 서버 사용 라이선스 불명, Windows 전용, 무인 실행 불안정 | **운영 불가**. 평가용 기준 PDF 생성에만 사용 검토 |
| 상용 문서 Viewer SDK | 다수 | 학교·기관 사용 사례 | 비용, 외부 의존 | 비교 대상 |
| JS 렌더러(hwp.js 등) | HWP5 일부 | 서버 불필요 | 표·HWPX 미흡 | 제외 |

**평가 절차 (선정 전 필수)**
1. 표본: `references/curriculum-plan/`의 HWP·HWPX 중 표 병합·수식·다단·가로 페이지가 있는 문서 각 5개 이상(Read-only, 외부 업로드 금지).
2. 기준: 한컴오피스로 만든 PDF를 기준본으로 두고 쪽 수 일치, 표 구조(병합 셀), 수식, 글꼴 대체, 쪽 나눔을 문서별 체크리스트로 기록. 화면 비교 캡처 첨부.
3. 보안: 변환은 네트워크 차단·임시 디렉터리·Timeout·크기 상한·동시 1건 Sandbox Process로 실행. 외부 서비스 업로드 금지.
4. 결과를 `docs/specs/suyeon/`에 표로 남기고 S-13으로 승인받는다. **통과 전에는 HWP/HWPX Viewer를 "원본 다운로드 + 변환 미지원/준비 중" 상태로 둔다.** 텍스트만 보여 주는 것은 완료로 보지 않는다.

### 7-3. 완료 기준 (형식별)

`업로드 → 원문 저장(SHA 일치) → 미리보기 생성(PDF는 원본, HWP/HWPX는 Rendition) → Viewer 표시 → Backend 재시작 후 재열람 → 권한 밖 404` 를 PDF·HWP·HWPX 각각 Integration Test + 수동 1회로 확인한다.

---

## 8. A2~A5 작업 순서 및 예상 변경 파일

경로 접두: `B` = `backend/src/main/java/com/learnershigh/extension/assessment/`, `BT` = 같은 경로의 test, `FA` = `frontend/admin/src/features/assessment/`, `FS` = `frontend/student/src/features/assessment/`.

### A2 — 원문 저장·열람 (Migration 불필요)

| 순서 | 변경 | 파일 |
|---|---|---|
| 1 | Plan 전용 Storage Bean: 기존 `ArtifactStorage` Interface 재사용, 별도 Root(`@Value("${assessment.plan-storage.root:${user.home}/.learnershigh-extension/dev-plan-storage}")` — 기본값을 코드에 두어 `application.yml`(Shared) 수정 없이 시작) | `B/integration/storage/` (Qualifier 추가 또는 `LocalFilePlanDocumentStorage`) |
| 2 | 업로드 시 바이트 저장 → `fileRef` 기록, DB 실패 시 보상 삭제(`ArtifactService` 패턴) | `B/entity/PlanRevision.java` (`upload(...)`에 `fileRef` 인자 — 현재 `revision.fileRef = null`), `B/service/plan/EvaluationPlanService.java` (`register`·`addRevision`) |
| 3 | 같은 Plan 안 같은 SHA 재업로드 거절(409) — Service 검사. DB Unique는 기존 데이터 확인 후 별도 Migration | `EvaluationPlanService`, `PlanRevisionRepository` |
| 4 | 다운로드·미리보기 Endpoint (계약 S-4 승인 후): Admin `GET …/revisions/{rid}/file`, `…/preview`; Student `GET …/evaluation-plans/{planId}/file`, `…/preview` (기존 슬롯 권한 `studentGet` 재사용) | `B/controller/AdminEvaluationPlanController.java`, `StudentEvaluationPlanController.java`, `FileResponses.java`(재사용), `EvaluationPlanQueryService.java` |
| 5 | 응답에 `file{available, fileName, contentType, sizeBytes, sha256, previewStatus}` | `B/dto/plan/AdminEvaluationPlanResponse.java`, `StudentEvaluationPlanResponse.java`, `PlanViews.java` |
| 6 | 기존 5건(`file_ref` NULL)은 `available=false`로 표시. 바이트를 만들어 넣지 않음 | 동일 |
| 7 | IT: 업로드→재시작 후 다운로드 SHA 일치, 타 학교 404, 중복 409 | `BT/…/EvaluationPlanApiTest` 확장 |
| 8 | (P1) HWP/HWPX Rendition: `PlanRenditionService` + 변환 Client Interface + 상태 저장(신규 Migration 필요 → Shared) | 신규 |

### A3 — Backend → 분석기 공식 연동

| 순서 | 변경 | 파일 |
|---|---|---|
| 1 | `PlanAnalyzerClient` Interface + `HttpPlanAnalyzerClient`(RestClient multipart, Token 환경 변수) + `UnconfiguredPlanAnalyzerClient`(미설정 시 503 — 기존 AI Client 패턴 `integration/ai/*` 그대로) | 신규 `B/integration/analysis/` |
| 2 | `POST …/revisions/{rid}/analysis` (계약 §39에 이미 있음): Storage에서 바이트 → Client → `backendImport.payload` → 기존 `importAnalysis` 검증 경로 재사용 → `PlanAnalysisRun` 저장 | `B/controller/AdminEvaluationPlanController.java`, `EvaluationPlanService.java`, `AnalysisImportParser.java` |
| 3 | 상태: MVP는 동기(분석기 120s 상한 이내). `PlanAnalysisStatus`에 `PARTIAL`은 계약 S-6·G2 합의 후 추가 | `B/entity/PlanAnalysisStatus.java` |
| 4 | 분석 버전·분석기 requestId 기록 (기존 컬럼 확인 후 부족하면 Migration) | `PlanAnalysisRun.java` |
| 5 | Frontend: `notConnected` 해제 | `FA/api/http/assessmentAdminHttp.ts:216` |
| 6 | IT: 분석기 Stub(MockRestServiceServer 등)으로 성공·Timeout·503·SHA 불일치·중복. 실제 8765 수동 1회 | `BT/…` 신규 |
| 7 | `analysis-imports`·Vite `/dev-analysis` Proxy는 개발 경로로만 유지 | 변경 없음 |

설정 키(`assessment.analyzer.base-url`, token)는 `application.yml`(Shared)에 넣지 않고 `@Value` 기본값 + 환경 변수로 시작하고, 정식 등록은 C1과 함께 승인받는다.

### A4 — 관리자 검토 UI

| 순서 | 변경 | 파일 |
|---|---|---|
| 1 (P0 최소) | 분석 과목 ↔ 학업 과목 ID 매핑 UI + `PUT review` 연결 (`savePlanReviewHttp` notConnected 해제) | `FA/api/http/assessmentAdminHttp.ts:461-466`, `FA/routes/EvaluationPlanReviewRoute.tsx`, `FA/components/PlanReviewConfirmPanel.tsx` |
| 2 (P0) | 원문 비교: 좌 Viewer(A2) / 우 결과, 근거 쪽 이동 | `FA/routes/EvaluationPlanReviewRoute.tsx` 재구성, Viewer Component |
| 3 (P1) | 문서 목록 개편(학교·학년·학기·형식·분석 버전·분석 상태·검토 상태·권한 필터) | `FA/routes/EvaluationPlansRoute.tsx` |
| 4 (P1) | 탭: 수행평가 세부 기준 / 월별 교수·학습 운영 계획(분석기 R1 이후) / 지필 / 이력 | 신규 Route·Component |
| 5 (P1) | 임시 저장·필드별 수정 이력: 현재 서버에 임시 저장이 없음(`"임시 저장은 서버에 없어요"`) → 신규 Endpoint·Table(Migration, Shared) | Backend 신규 |
| 6 (P1) | `teachingPlan.*` 필드 경로 화이트리스트 | `B/service/plan/ReviewFieldRules.java` |

Mockup 기준: `references/claude-design-mockup/LearnersHighAssessment/Admin/` (구현 전에 PNG를 열어 확인).

### A5 — 학생 확정값 제공

| 순서 | 변경 | 파일 |
|---|---|---|
| 1 | 학생 응답에 `confirmed`(CONFIRMED Revision의 확정값만) 추가. 미확정 후보 0건을 IT로 보장 | `B/service/plan/EvaluationPlanQueryService.java` (`toStudent`), `B/dto/plan/StudentEvaluationPlanResponse.java`, `ConfirmedFieldView.java` |
| 2 | 학생 원문 Viewer(A2 Endpoint) | `FS/api/http/evaluationPlansHttp.ts`, `FS/api/evaluationPlansApi.ts`, `FS/routes/AcademicInfoRoute.tsx` 또는 신규 Plan 상세 Route |
| 3 | 수행평가 기록 연결: 기존 `ConfirmedItemKeys`(학생 `evaluationItemRef` ↔ 확정 itemKey) 활용 | `FS/routes/SchoolAssessmentDetailRoute.tsx` |
| 4 | Loading·Empty(확정 전)·Error 상태 | 동일 |

계약: §10-1 응답 확장(S-4와 함께 승인).

---

## 9. 11월 17일 P0 작업과 미룰 작업

### P0 (11/17까지, 승인 의존 표시)

| 순서 | 작업 | 선행 승인 | 규모 |
|---|---|---|---|
| P0-1 | A0 Commit C3·C5·C7 (+ C1·C2 승인 시) | S-1 | S |
| P0-2 | A2 원문 저장·다운로드·PDF Viewer (Admin·Student) | S-4, S-5 (S-11은 Loader 재사용으로 우회 가능) | M |
| P0-3 | A3 Backend→분석기 동기 호출 (PDF 정식, HWP/HWPX는 실험 Flag 유지) | S-6 | M |
| P0-4 | A4 최소: 과목 매핑 + PUT review 연결 + 원문 옆 결과 비교 | S-10(운영자 1명 이상) | M |
| P0-5 | A5 학생 확정값 + 원문 열람 | P0-2·P0-4 | M |

HWP/HWPX의 11/17 목표: **원문 저장·다운로드·분석·검토까지는 가능, 서비스 내 레이아웃 보존 Viewer는 엔진 검증 전이므로 "준비 중" 상태**. 이 차이는 대표님 요구사항과 다르므로 사전 보고가 필요하다.

### 미룰 작업

| 작업 | 사유 |
|---|---|
| A1 Admin 레거시 삭제(D1~D3) | Shell 변경 Wangyu 리뷰(S-2). 기능 영향 없음(현재 공존) |
| `frontend/mentor` 제거(D4) | Shared 승인(S-3) |
| HWP/HWPX 변환 Rendition 운영 | 엔진 평가(§7-2) 필요 |
| A4 전면 IA 개편, 월별 계획 탭, 필드 이력·임시 저장 | 계정 B R1, Migration(Shared) |
| 비동기 분석 Job | MVP는 동기로 충분(120s 상한) |
| Admin Overview 실 API | P1 (현재 Mock) |
| 실제 인증·기존 LearnersHigh 연동 | BLOCKED (API-OD-A01, 1팀) |
| 수집기 수신 API | 완규님과 계약 합의 후 |
| 실험 DB 41개 정리 | 별도 결정 |

---

## 10. 다음 실행에서 시작할 정확한 작업

**사전 확인 (사용자에게 받을 답)**
1. §2-3 Commit 계획 승인 범위 (최소: C3·C5·C7 / C1·C2를 같이 넣을지)
2. S-4·S-5: 평가계획서 원문을 결과물과 같은 로컬 격리 Storage에 저장하는 MVP 승인, 신규 file/preview Endpoint 계약 추가 승인
3. S-10: 시연 학교 평가계획서 운영자 부여 방식

**다음 Claude Code 실행 프롬프트 (그대로 사용 가능)**

```text
[계정 A] Phase A0 Commit + A2 원문 저장 1차

1. docs/specs/suyeon/ACCOUNT-A-A0-A1-PREP-20261113.md §2-3에서 승인된 Commit만 순서대로 만든다.
   - 각 Commit 전후 backend `gradlew test`, frontend typecheck·lint·build 실행. Push 금지.
   - Migration 6개는 내용 수정 없이 그대로 추가한다(시연 DB에 적용됨).
2. 새 브랜치 feat/assessment-plan-original-storage 를 만든다.
3. A2 1~3, 5~7 (§8)을 구현한다:
   - api-contract.md §38·§10-1·§48에 file 블록과 file/preview Endpoint를 먼저 DRAFT로 추가(승인된 범위만).
   - PlanRevision.upload에 fileRef 인자 추가, EvaluationPlanService register/addRevision에서 Storage 저장 + 보상 삭제.
   - 같은 Plan 내 동일 SHA 409, 기존 file_ref NULL 행은 available=false.
   - Admin/Student file·preview Endpoint + IT(재시작 후 SHA 일치, 타 학교 404, 중복 409).
4. 시연 DB·기존 Storage·Docker Volume은 초기화하지 않는다. IT는 Testcontainers만 사용.
5. 결과를 docs/specs/suyeon/에 보고하고 progress.md를 실제 상태로 갱신한다.
```

그다음 실행: A3(분석기 Client, §8 A3 1~6) → A4 최소 연결 → A5.

---

## 부록. 이번에 실행한 명령 (요약)

`git status/log/show/diff/ls-files/check-ignore`, `git read-tree`·`add`·`write-tree`·`commit-tree`·`update-ref`(임시 Index, `refs/backup/a0-20261113`), `tar`, `sha256sum`, `grep`(소유권·의존성·Secret 패턴 검사: 일치 0건), `docker ps`, `curl /health`(8765), `gradlew test`, `gradlew integrationTest`, `npm run typecheck/lint/build`(frontend), 분석기 저장소 Read-only grep.

실행하지 않은 것: 레거시 삭제, 기능 코드 수정, Shared 파일 수정, 브랜치 Commit·Push, DB 변경 API 호출, 시연 DB 조회, Student Care E2E(DB Reset 위험 — §1-1), 분석기 재분석·테스트, 기존 LearnersHigh 원본 접근.
