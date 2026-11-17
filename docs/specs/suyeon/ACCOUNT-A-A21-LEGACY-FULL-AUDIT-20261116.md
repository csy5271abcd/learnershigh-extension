# [계정 A] A21 — Student Care·Assessment 외 레거시 기능 전수 조사 (2026-11-16)

> **조사만 수행.** 제품 코드 수정·Commit·Push·PR 갱신·DB 변경 없음. 이 보고서는 통합 Worktree에 **Commit하지 않은 파일**로 둔다.
> 대상: `C:\learnershigh-assessment-integration` · `integration/assessment-studentcare-20261116` @ `1c89c48`(= 원격, PR #17 head). `origin/main` = `c03a1a4`(fetch로 재확인).
> 읽은 문서: `docs/specs/suyeon/legacy-cleanup-plan.md`, `docs/OWNERSHIP.md`(§3-4·§4·§6·§10·§11), `docs/SOURCE_OF_TRUTH.md`, `ACCOUNT-A-A20-…md`, `docs/specs/wangyu/README.md`.

## 조사 방법

1. **Frontend import 그래프**: `frontend/admin`·`frontend/student`·`e2e`의 TS/TSX/MJS/CSS/HTML 500개 파일에서 정적 import·`?url` Asset·CSS `url()`·HTML `src`를 해석했다(1,853개 관계). 해석하지 못한 1건은 주석 속 경로였다.
2. **도달성 계산**: 시작점을 셋으로 나눠 각각에서 도달하는 파일을 구했다.
   - SC: `features/student-care/**` + `app/studentCarePaths.ts`
   - AS: `features/assessment/**`
   - LEG: `features/feedback/**` + `features/student-management/**`
   - 앱 진입점(`main.tsx`·`index.html`·`student-preview.html`·`vite.config.ts`)과 Node 시험(`*.test.mjs`) 기준 도달성도 따로 계산했다.
3. 그래프 결과와 다르게 보이는 문자열 참조는 직접 확인했다(전부 주석).
4. **Backend**: 패키지별 파일, `@RestController` Endpoint 전체, Spring 역할(`@Component`·`@Profile`·`@ConditionalOnProperty`), 클래스별 사용처, 최초 추가 Commit(main/브랜치)을 조사했다.
5. **통합 재확인**: merge Commit `64437b7`의 두 부모로 충돌 재계산, 충돌 표시 검색, 경로별 `git diff`, `api-contract.md` 줄 단위 보존 확인, PR #17·`main`의 GitHub CI 결과(읽기 전용 API).

판정 표기: **삭제 가능** / **의존성 분리 후 삭제 가능** / **보존 필수** / **결정 필요**

---

## 1. 프론트엔드 레거시 파일 목록

### 1-1. 핵심 사실

- 구형 관리자 화면(Today Board·Feedback Dashboard·구형 Feedback Review·Student 360·Connection·Interview·Operations)은 **실제 API를 한 번도 호출하지 않는다.** 코드의 `/api/admin/feedback/...`·`/api/admin/connections` 등은 **주석 속 계획**일 뿐이다(`store/adminCommands.ts:9-15`, `feedback/TopicReviewPage.tsx:13` 등). Backend Endpoint(§4)와 `api-contract.md`에도 해당 절이 없다. 화면은 `fixtures/*` → `store/adminStore.ts` → `read-model/*`의 로컬 Mock만으로 동작한다. 유일한 `fetch`(`components/filePreview.ts:75`)는 로컬 Fixture 파일을 읽는다.
- **Student Care·Assessment는 구형 모듈을 하나도 import하지 않는다.** SC 시작점에서 도달하는 Feature 밖 파일은 `app/studentCarePaths.ts` 하나, AS 쪽은 `app/adminLocation.ts` 하나다. LEG와 겹치는 파일은 `app/adminLocation.ts`(AS+LEG)뿐이다.
- 학생 앱은 이미 Assessment만 남았다. `router.tsx`의 `/`는 Assessment로 Redirect하고 나머지는 Not Found다. `mentor-hub`·`school-admissions`는 Assessment 브랜치에서 이미 삭제됐다. 남은 것은 제거 이력 **주석** 7곳뿐이다(`app/router.tsx:9`, `app/StudentAppShell.tsx:7`, `app/NotFoundPage.tsx:5` 등).

### 1-2. 기능별 조사표 (관리자 `frontend/admin/src/`)

| 기능 | 파일(수) | 메뉴·Route | App.tsx / AdminShell 참조 | SC import | AS import | 공용 의존 | Fixture·Store·Read Model | Asset·CSS | 시험·CI | 판정 |
|---|---|---|---|---|---|---|---|---|---|---|
| **Feedback Dashboard** | `features/feedback/FeedbackDashboardPage.tsx`·`.module.css`, `routes/FeedbackDashboardRoute.tsx`, `routes/paths.ts`, `model/feedbackQueue.ts` | 메뉴 'Feedback Dashboard', `/feedback`, **`/`(관리자 기본 화면)** | `App.tsx:42,58-62,115`(기본 current·pageLabel·404 버튼), `AdminShell.tsx:4,40` | 없음 | 없음 | `AdminUi`, `AdminVisual`, `AdminIcons`, `app/useScreenLoad.ts` | `read-model/feedbackQueue.ts`, `store/*`, `fixtures/*` | — | 없음 | **의존성 분리 후 삭제 가능**(`/` 기본 화면 결정 필요) |
| **구형 Feedback Review**(Task·Topic·Activity) | `features/feedback/TaskReviewPage.tsx`, `TopicReviewPage.tsx`, `ActivityFeedbackPage.tsx`, `ReviewTopBar.tsx`, `ReviewPage.module.css`, `routes/FeedbackReviewRoute.tsx` | `/feedback/:id` | `App.tsx`(`matchFeedbackReviewPath`) | 없음 | 없음 | `AdminUi`, `AdminVisual`, `components/AdminFilePreview`·`filePreview` | `store/*`, `read-model/taskDetail.ts`·`materialRole.ts` | — | 없음 | **의존성 분리 후 삭제 가능** — 신규 Assessment 피드백(`/assessment/feedback`, ADR-0009)과 다른 모델 |
| **Today Board** | `features/student-management/TodayBoardPage.tsx` | 메뉴 'Today Board', `/today` | `App.tsx:67`, AdminShell 항목 | 없음 | 없음 | `AdminUi`, `AdminVisual`, `AdminIcons`, `useScreenLoad` | `read-model/todayBoard.ts`, `studentInsights.ts`, `store/*` | — | 없음 | **결정 필요 → 의존성 분리 후 삭제 가능**: 완규님 문서에 'Today Board가 학생 케어 신호를 소비하는 방안'이 **제안**으로 있음(`docs/specs/wangyu/README.md:43`, `OWNERSHIP.md` §4). 구현은 없음(Today Board가 `StudentCareQueryService`·`features/student-care`를 import하지 않음) |
| **Student 360** | `Student360Page.tsx`, `InspectorPages.tsx`(Task·Activity 상세) | `/students/:id`, `/tasks/:id`, `/activities/:id`(메뉴 없음, 다른 화면에서 진입) | `App.tsx`(match 3종) | 없음 | 없음 | `components/TaskInspector`·`ActivityInspector`·`Inspector.module.css`, `AdminFilePreview` | `read-model/student360.ts`·`studentProjection.ts`·`taskDetail.ts` | `assets/fixture-files/*` | 없음 | **의존성 분리 후 삭제 가능** — Assessment의 학생 상세(`/assessment/students/:id`)와 별개 |
| **Connection Review** | `ConnectionReviewPage.tsx`, `Connection.module.css`, `model/connection.ts` | 메뉴 'Connection 검토', `/connections` | `App.tsx:83`, AdminShell 항목 | 없음 | 없음 | `AdminUi`, `AdminVisual`, `useScreenLoad` | `fixtures/adminConnections.fixture.ts`, `store/*` | — | 없음 | **의존성 분리 후 삭제 가능** |
| **Interview Management** | `InterviewManagementPage.tsx`, `OutreachDialogs.tsx` | 메뉴 'Interview 관리', `/interview` | `App.tsx:87`, AdminShell 항목 | 없음 | 없음 | `AdminUi`, `AdminVisual`, `useScreenLoad` | `store/*` | — | 없음 | **의존성 분리 후 삭제 가능** |
| **Operations** | `OperationsPage.tsx` | 메뉴 'Operations', `/operations` | `App.tsx:105`, AdminShell 항목 | 없음 | 없음 | `AdminUi`, `useScreenLoad` | `read-model/operations.ts` | — | 없음 | **의존성 분리 후 삭제 가능** — OWNERSHIP §4의 'Counseling-related Operations KPI'(완규님)는 이 화면에 구현돼 있지 않음 |
| 공통 Route·주소 | `features/student-management/routes/StudentManagementRoutes.tsx`, `routes/paths.ts`, `StudentManagement.module.css` | 위 Route 전부 | `App.tsx` import | 없음 | 없음 | — | — | — | 없음 | 위 기능과 함께 **삭제 가능** |
| **Mentor 잔여 데이터 계층** | `fixtures/adminMentor.fixture.ts`, `adminMentorContent.fixture.ts`, `adminMentorCaseDetails.fixture.ts`, `read-model/mentorContent.ts`, `read-model/integrity.ts` | 없음(A20에서 화면 제거) | 없음 | 없음 | 없음 | — | `adminMentor*`는 `store/adminStore.ts`·`read-model/student360.ts`가 씀 | `assets/activity-case/*`(아래) | 없음 | `adminMentorCaseDetails.fixture.ts`·`read-model/mentorContent.ts`·`read-model/integrity.ts`는 **어느 진입점에서도 도달하지 않음 → 삭제 가능**. `adminMentor.fixture.ts`·`adminMentorContent.fixture.ts`는 store가 쓰므로 **구형 기능과 함께 삭제** |
| **School Admissions** | (관리자에는 없음. 학생 쪽은 브랜치에서 이미 삭제) | — | — | — | — | — | — | — | — | **이미 제거됨**(주석만 남음) |

### 1-3. 구형 전용 공용·데이터 파일 (LEG 시작점에서만 도달)

| 영역 | 파일 | 판정 |
|---|---|---|
| `fixtures/`(12) | `adminActivities`, `adminConnections`, `adminEvidence`, `adminFeedback`, `adminMentor`, `adminMentorCaseDetails`, `adminMentorContent`, `adminRecords`, `adminStudents`, `adminTasks`(`.fixture.ts`), `snapshot.ts`, `types.ts` | 구형과 함께 **삭제 가능** |
| `read-model/`(11) | `feedbackQueue`, `integrity`, `materialRole`, `mentorContent`, `operations`, `student360`, `studentInsights`, `studentProjection`, `taskDetail`, `time`, `todayBoard`(`.ts`) | 구형과 함께 **삭제 가능** |
| `store/`(2) | `adminCommands.ts`, `adminStore.ts` | **의존성 분리 후 삭제 가능** — `App.tsx:52`가 모든 관리자 화면(학생 케어·Assessment 포함)에서 `configureCommandScenario(location.search)`를 호출한다 |
| `components/`(9) | `ActivityInspector.tsx`, `TaskInspector.tsx`, `Inspector.module.css`, `AdminFilePreview.tsx`·`.module.css`, `filePreview.ts`, `AdminIcons.tsx`, `AdminVisual.tsx`·`.module.css` | 구형과 함께 **삭제 가능**(SC·AS import 0) |
| `app/useScreenLoad.ts` | 구형 화면 8곳만 씀 | 구형과 함께 **삭제 가능** |
| `assets/fixture-files/`(10) | 구형 Task·Activity 첨부 예시(txt·csv·png·svg·pdf) | 구형과 함께 **삭제 가능** |
| `assets/activity-case/`(5) | 항생제 Case 샘플(pptx·hwp·xlsx·pdf) — 유일한 import 주체가 고아 파일 `adminMentorCaseDetails.fixture.ts`. 학생 쪽 같은 사본은 브랜치에서 이미 삭제 | **삭제 가능** |

**합계**: 관리자 구형 **68개 파일**(feedback 11 · student-management 12 · fixtures 12 · read-model 11 · store 2 · components 9 · `app/useScreenLoad.ts` 1 · `assets/fixture-files` 10)과 고아 `assets/activity-case` 5개. 모두 SC·AS 시작점에서 도달하지 않는다.

### 1-4. Student Care·Assessment 내부의 미사용 파일 (레거시 아님 — 소유자 판단)

| 위치 | 파일 | 근거 | 판정 |
|---|---|---|---|
| **Student Care**(완규님) | 앱 진입점에서 도달하지 않음 + Node 시험도 쓰지 않음: `components/AttendanceChart.tsx`, `QuickClearButton.tsx`, `branch-overview-v2.css`, `model/CareDesignContext.ts`, `model/studentCareNavigation.ts`, `ops/OpsStrip.tsx`, `variants/shared/StudentRows.tsx`·`bands.ts`·`branch.ts`·`scrollLock.ts`·`useLeaveGuard.tsx` | 11-12 X′ 단일 화면 결정 뒤 남은 모듈로 보임 | **결정 필요(완규님)** — 레거시로 분류하지 않음 |
| Student Care | 앱에서는 안 쓰지만 **Node 시험이 쓰는 모델·API**(`branchDistribution`, `branchOverview`, `branchStudentPatterns`, `careDisplay`, `chartPeriods`, `inferredAttendance`, `personalDistribution`, `selectedPeriod`, `tooltipPlacement`, `weeklyReview`, `api/originalPreviewApi`·`originalPreviewData`·`loadCareRoster`, `variants/shared/pack`) | CI 'Student care model and seed tests'가 실행 | **보존 필수** |
| Student Care | `app/StudentCareRoute.module.css` | `StudentCareRoute.tsx`는 main에서 삭제됐고 이 CSS는 고아 | **결정 필요(완규님)** |
| Student Care | `vite.config.ts`의 `student-care-original-preview-data` Plugin | `features/student-care-v1/` 폴더가 없어 동작 대상이 없음 | **결정 필요(완규님)** |
| **Assessment**(Suyeon) | 관리자 `ai/MockExamAiPanel.tsx`, `ai/UniversityExamAiRoute.tsx`, `routes/MockExamRoutes.tsx`, `routes/UniversityRoutes.tsx` | `ContentRoute.tsx:24` 주석 "이전 편집 화면 코드는 사용처 정리(명세 §10) 전이라 Route에서만 뺐다" | **결정 필요(Assessment 내부)** — 레거시 정리와 분리 |
| Assessment | 학생 `api/mock/referenceLinksMock.ts`, `components/enrichment/ScreenshotRegionsModal.tsx`(+css, `model/mockExamScreenshotStore.ts`), `components/notes/NoteContextPanel.tsx`, `routes/AssessmentPendingRoute.tsx`(+css) | import 0 | **결정 필요(Assessment 내부)** |
| Assessment | 학생 `api/mock/readOnlyViewStore.ts`, `routes/AssessmentReadOnlyViewer.tsx` | 학생 앱은 안 쓰지만 **관리자 Assessment가 cross-app import**(`admin/.../api/canonicalSource.ts`, `components/canonicalUi.ts`) | **보존 필수** |

---

## 2. 백엔드 레거시 파일 목록

**결론: Backend에는 구형 기능(Today Board·Feedback Dashboard·Student 360·Connection·Interview·Operations·Mentor·School·Parent Progress)용 코드가 없다.** `backend/src/main/java/com/learnershigh/extension/` 아래 패키지는 `assessment`(Java 172), `studentcare`(49), `common`(38), `LearnersHighExtensionApplication.java`뿐이다. `studentmanagement/`·`mentor/`·`school/`·`parentprogress/`는 없다. Migration 18개도 Student Care 5 + Assessment 13뿐이다.

| 분류 | 파일 | 근거 |
|---|---|---|
| **A. Student Care 전용** | `studentcare/**`(controller 2·service 14·entity 12·repository 3·dto 17·exception 1) | `@RestController StudentCareController`·`CareVisionEvidenceController`(main, beans3142) |
| **B. Assessment 전용** | `assessment/**`(controller 16·service 50·entity 24·repository 18·dto 40·integration 22·exception 2), `resources/assessment/demo-roster`·`subject-catalog` | 컨트롤러 14개 모두 브랜치에서 추가 |
| **C. 공유 Backend**(모두 main에서 옴) | `common/error/*`(`BusinessException`·`ErrorCode`·`CommonErrorCode`·`FieldViolation` 등 → SC·AS 모두 사용, `GlobalExceptionHandler`·`JsonErrorController`·`JsonErrorReportValve`·`TomcatErrorReportCustomizer`·`MalformedQuery` = 전역 오류 처리 Bean), `common/json/StrictJsonConfig`(@Configuration), `common/time/ClockConfig`·`AdjustableClock`, `common/integration/learnershigh/ExistingStudentClient`·`ExistingStudent`·`ExistingBranch`(SC·AS 모두 사용)·`MockExistingStudentClient`(@ConditionalOnProperty mock — AS도 사용) | 사용처 grep + Spring 역할 |
| **D. 다른 기존 기능 전용** | `common/integration/learnershigh/ExistingStudyClient`·`ExistingDailyStudy`·`ExistingIntegrationException`·`MockExistingStudyClient`·`MockStudyScenarios`·`MockVisualStudyScenarios`·`MockIntegrationSwitch`(기존 LearnersHigh 학습 원천 — Student Care가 사용), `DemoStudyDataStore`(@Profile care-demo), `common/integration/vision/*`(사진 관찰 — Student Care), `common/testsupport/E2eTestSupport*`(@Profile e2e, `/api/test/*`) | 완규님 Student Care·E2E 실행 환경 |
| **E. 미사용 레거시 Backend** | **없음** | — |
| **F. 근거 부족(보존)** | `common/integration/learnershigh/phapi/*` 7개(`PhapiStudyMapper` 등) — main 코드에서 호출자 0, 시험·ArchUnit Fixture만 참조 | 클래스 주석: "실제 Adapter(RealExisting*Client)는 phapi를 호출한 뒤 이 Mapper만 거친다"(기존 PHP 연동 ACL, integration-boundary §28) → 앞으로 붙일 실제 연동 계약. **보존 필수(완규님·1팀)** |

시험 코드: `test/.../architecture/**`(ArchUnit 규칙 + compliant/violating Fixture 21), `test/.../migration/StudentCareReviewFixesMigrationTest`, `test/.../common/**`, `test/.../studentcare/**`, `test/.../assessment/**` — 레거시 시험 없음.

---

## 3. 현재 관리자 메뉴 및 Route 목록

**Sidebar**(`AdminShell.tsx`): 기존 LearnersHigh 표시 메뉴 8개(`학원관리`·`문자관리`·`학생관리`·`학습관리`·`학습조정`·`학원비결제`·`리워드`·`솔루션결제`, 동작 없음). '학습관리' 아래에 기존 하위 표시 7개와 Extension 항목 8개:

| 메뉴 | id | Route(`App.tsx`) | 소유·분류 |
|---|---|---|---|
| Today Board | `today-board` | `/today` | Suyeon 구형 |
| 학생 케어 | `student-care` | `/student-care` + `isStudentCarePath`(`/student-care/ops`·`/a~d`·`/z`·`/y`·`/x`·`/z2`·`/notation`) + `/student-care/x2` → 모두 `VariantX2` | **완규님 — 보존** |
| 학부모 리포트 | `parent-report` | `/parent-report` → `ParentReportFrame` | **완규님 — 보존** |
| Feedback Dashboard | `feedback-dashboard` | `/feedback`, **`/`** | Suyeon 구형 |
| Connection 검토 | `connections` | `/connections` | Suyeon 구형 |
| Interview 관리 | `interview` | `/interview` | Suyeon 구형 |
| Operations | `operations` | `/operations` | Suyeon 구형 |
| Assessment 관리(NEW) | `assessment` | `/assessment/**`(전체 현황·학생·학생 화면 보기·기록·피드백·평가계획서·AI 분석·학년도별 열람·콘텐츠 Task·모의고사·대학·출처·참고자료실, `features/assessment/routes/paths.ts:90-124`) | **Suyeon — 보존** |
| (메뉴 없음) | — | `/feedback/:id`, `/students/:id`, `/tasks/:id`, `/activities/:id` | Suyeon 구형 |
| (그 외) | — | '페이지 없음'(A20에서 제거한 `/mentor-*`·`/mentors/*` 포함) | — |

Vite Proxy(`vite.config.ts`, 완규님): `/supervisor-api`, `/vision-api`, `/api/admin/student-care`(→ `VITE_CARE_API_TARGET`), `/api`. **보존.**
학생 앱 Route: `/` → `/assessment`, `/assessment/**` 25개(school-assessments·evaluation-plans·monthly-plan·academic-info·feedback·enrichment·resources·reference-links·growth·archive·tips), `*` Not Found.

## 4. 현재 Backend API 목록

| 영역 | Endpoint 수 | 내용 |
|---|---|---|
| `/api/admin/student-care/**` | 12 | `board`, `branches`, `metrics`, `settings`(GET·PUT), `students/{id}`, `students/{id}/history`, `cases`, `cases/{id}/decisions`, `cases/{id}/notes`, `students/{id}/vision-evidence`, `…/vision-evidence/{evidenceId}/content` |
| `/api/admin/assessment/**` | 76 | 평가계획서·Revision·분석·검토·운영계획·과목 슬롯 23(`AdminEvaluationPlanController`), 분석 결과 수신 1, 학생·노트·결과물·성장 기록·피드백 요청·답변·참고자료실 22(`AdminRecordController`), 학생 화면 보기 22, 현황·관리 학교 2, 학교 1, 학생 수행평가 1, AI 4 |
| `/api/student/assessment/**` | 43 | 학업 Context·학교 수행평가 6, 평가계획서 5, 노트·결과물·버전·자료·성장 기록·피드백·보관함 32 |
| `/api/test/**` | 3 | `clock`, `integration`, `reset` — `@Profile("e2e")` + `learnershigh.test-endpoints.enabled=true`일 때만 |
| **구형 기능** | **0** | `/api/admin/feedback`·`today`·`students/{id}/…`·`connections`·`interview`·`operations`·`mentor` 없음 |

(전체 Endpoint 표는 조사 스크립트 출력 기준이며 `@RequestMapping` + `@Get/Post/Put/Patch/DeleteMapping`을 합쳐 셌다.)

## 5. Today Board 잔존 여부

**Frontend에 잔존**: 메뉴, `/today`, `TodayBoardPage.tsx`, `read-model/todayBoard.ts`·`studentInsights.ts`, 로컬 Fixture. **Backend·API 계약에는 없음.** 학생 케어와의 연결은 문서상 제안뿐이고 코드 연결은 없다. 삭제 전 완규님에게 제안 철회 여부를 확인해야 한다.

## 6. Feedback Dashboard 잔존 여부

**Frontend에 잔존하며 관리자 `/` 기본 화면이다**(`App.tsx:58-62`). 구형 Feedback Review 3종도 남아 있다. Backend·계약에는 없다. 신규 Assessment 피드백(`/assessment/feedback`, `/api/admin/assessment/feedback-requests/**`, ADR-0009)과 이름만 같고 모델이 다르다(구형 Queue, ADR-0003 Superseded).

## 7. Student 360·Connection·Interview·Operations 잔존 여부

넷 다 **Frontend에만 잔존**(Route·메뉴·페이지·Read Model·Fixture). Backend·계약·시험·CI 의존은 없다. Student 360은 A20에서 Mentor 탭만 제거됐다. Task/Activity 상세(`/tasks/:id`, `/activities/:id`)도 같은 묶음이다.

---

## 8. Student Care 기능 보존 검증

| 확인 | 결과 | 구분 |
|---|---|---|
| main의 Student Care 코드가 그대로인가 | `git diff origin/main HEAD -- features/student-care backend/.../studentcare backend/test/.../studentcare parentReportPreview.ts visionDevAuth.ts app/studentCarePaths.ts app/theme.css backend/.../common database scripts/demo e2e/tests` → **차이는 Assessment Migration 13개 추가뿐** | 코드 존재 |
| X′·학부모 리포트·사진 관찰·감독관 Proxy | `App.tsx`의 `VariantX2`·`ParentReportFrame`, `vite.config.ts`의 `visionDevProxy`·`/supervisor-api`·`parentReportPreview`, Backend `CareVisionEvidenceController`·`common/integration/vision` 존재 | 코드 존재 |
| 동작 | Backend Unit Student Care 180·IT 83 통과, Node 시험 92/92, 실화면에서 학생 케어 150명 목록·`data-care-theme` 확인(A20) | **시험·화면 확인** |
| **Playwright 인수 시험** | **31/31 실패** — `main c03a1a4` 화면에서도 같은 31건·같은 첫 오류(A20 로컬). **GitHub CI도 PR #17과 main 모두 'E2E (Playwright)' failure**(이번에 API로 확인) | **main 기존 실패** |
| api-contract | main이 merge-base 이후 추가한 35줄 **모두 존재**, 삭제된 1,004줄 중 Student Care 관련 0(삭제분은 구형 Suyeon 절 137개 제목) | 문서 보존 |

## 9. Assessment 기능 보존 검증

| 확인 | 결과 | 구분 |
|---|---|---|
| A19 구현 전체 | `git diff feature/assessment-student-integration-enhancement HEAD -- features/assessment(관리자·학생) backend/.../assessment backend/main/resources/assessment e2e/assessment* docs/api` → Assessment 파일 **차이 0**. 차이는 main에서 들어온 Student Care 시험 25개·Migration 3개·계약 +59줄(순수 추가) | 코드 존재 |
| 학년별 평가계획서·관리자 확정·학생 조회 | `MockAcademicContextProvider.findSlot`·`DemoRoster`·`AllGradesPlanSlotApiTest` 등 그대로, IT Assessment 103 통과 | **시험 확인** |
| Railway HTTP Client·환경 변수 | `PlanAnalyzerConfig`·`HttpPlanAnalyzerClient` 그대로(위 diff 0), 설정 가이드 `assessment-analyzer-setup.md` | 코드 존재(원격 실측은 A19) |
| 화면 | Assessment Stub E2E 23/23(A20, 통합 빌드) | **시험 확인** |

## 10. 병합 충돌 4파일의 최종 상태

- **충돌은 정확히 4파일**: `git merge-tree --write-tree c03a1a4 f858574` 재계산 결과 `application.yml`, `frontend/admin/src/App.tsx`, `frontend/admin/src/app/AdminShell.tsx`, `frontend/admin/vite.config.ts`.
- **충돌 표시 0**: `git grep -nE '^(<<<<<<<|>>>>>>>)( |$)|^=======$' HEAD`(Markdown·references 제외) 결과 없음.

| 파일 | 최종 상태 | 누락 확인 |
|---|---|---|
| `application.yml` | `spring.servlet.multipart`(100MB/101MB) + 최상위 `server.compression` + `assessment.*` + `learnershigh.vision`·`mock` + `e2e` Profile 문서 | YAML 2문서 파싱 성공, 두 블록 모두 존재(A20) |
| `App.tsx` | 학생 케어 X′·학부모 리포트·Assessment 분기 공존, 구형 분기 유지(Mentor만 A20 제거) | main의 `studentCarePaths` import 4개 그대로 |
| `AdminShell.tsx` | Assessment 개편 Shell + `parent-report` 항목 + `data-care-theme` 속성. `.module.css`는 자동 병합(학생 케어 테마 블록 27줄 존재) | — |
| `vite.config.ts` | main의 `loadEnv` 함수형·Proxy 4종·학부모 리포트·`student-care-v1` Plugin + Assessment `universityExamPdfDevServer`·`student-preview.html` 입력 | 양쪽 import 전부 존재 |

**통합 후 바뀐 공통 파일(main 대비)**: `README.md`, `backend/build.gradle.kts`, `application.yml`, `docs/api/api-contract.md`, `e2e/package.json`·`tsconfig.json`·`playwright.assessment*.config.ts`(추가 3), `frontend/admin/src/App.tsx`·`app/AdminShell.tsx`·`AdminShell.module.css`·`vite.config.ts`·`student-preview.html`(추가), `frontend/package.json`·`package-lock.json`, `frontend/student/package.json`·`src/app/*`·`components/student-navigation/*`, `scripts/verify.ps1`, 그리고 Mentor·mentor-hub 삭제분.

## 11. 추가 발견한 기능 충돌·설정 충돌

| # | 내용 | 영향 | 담당 |
|---|---|---|---|
| 1 | **관리자 `/` 기본 화면이 구형 Feedback Dashboard**(`App.tsx:58-62`), 404의 복귀 버튼도 'Feedback Dashboard로 가기'(`App.tsx:115`) | 구형 제거 시 기본 화면(학생 케어 / Assessment)을 정해야 함 | 사용자·완규님 결정 |
| 2 | `App.tsx:52` `configureCommandScenario(location.search)`(구형 `store/adminCommands`)가 학생 케어·Assessment 화면에서도 매번 실행됨 | 구형 Mock 시나리오와 결합. 기능 오류는 관찰되지 않음 | Suyeon(구형 제거 시 같이 삭제) |
| 3 | Student Care 화면이 Assessment가 개편한 진한 Sidebar Shell 안에 보임 | 시각 변화 | 완규님 승인 |
| 4 | `vite.config.ts`의 `student-care-v1` resolve Plugin 대상 폴더 없음 / `app/StudentCareRoute.module.css` 고아 | 죽은 설정·파일 | 완규님 |
| 5 | Student Care 인수 시험과 데이터 불일치: `generate-care-seed.mjs`는 AS_OF 11-11·210명, CI `APP_FIXED_DATE=2026-10-28`, `seed-care-history.mjs`는 60명 기대 | E2E 31/31 실패(main 포함) | 완규님 |
| 6 | 시연 DB(기록상 `V202611160100`)에 main Migration 3개(`V202610251000`·`V202610290800`·`V202610291700`)가 순서 밖 | Flyway 기본 검증에서 기동 거부 가능성 높음(미실측) | 사용자 승인 |
| 7 | `scripts/verify.ps1`이 `docs/adr/0003-shared-feedback-queue.md`(Superseded)와 `.claude/rules/frontend-mentor.md`를 필수 파일로 요구 | 구형 문서를 지워도 Harness가 실패함 — 문서는 이력 보존이 기본이라 유지 권장 | Shared |
| 8 | 문서가 구형 기능을 현재 기능처럼 설명: README §2(Mentor Hub 등), `OWNERSHIP.md` §3-1~3-5·§10·§11 예시, `ARCHITECTURE.md`, `.github/CODEOWNERS` 주석, `.github/pull_request_template.md`의 Mentor 항목, `e2e/tests/support.ts:37` 주석("'/'는 Feedback Dashboard") | 오해 소지. 원본 폴더에서 다른 작업자가 같은 문서 다수를 미Commit 수정 중 | Shared·조율 |
| 9 | 원본·통합 Worktree의 Git 무시 대상 `frontend/mentor/node_modules`(원본은 `dist/`도) | Push 영향 없음, 로컬 정리 필요 | 사용자 |
| 10 | 비교용 `C:\learnershigh-main-baseline` Worktree 남음 | 로컬 정리 | 사용자 |

## 12. 구형 기능 제거 시 필요한 작업 (승인 후, 이번에는 미실행)

**Frontend**
1. **기본 화면 결정** → `App.tsx`: `/` 분기, `current`·`pageLabel` 기본값, 404 버튼 대상 변경.
2. `App.tsx`: `features/feedback/**`·`features/student-management/**` import와 분기(`/feedback`, `/feedback/:id`, `/today`, `/students/:id`, `/tasks/:id`, `/activities/:id`, `/connections`, `/interview`, `/operations`), `entryPaths`의 6개 항목, `configureCommandScenario` 호출 제거. `NoticeState`·`ui.page`·`ui.secondaryButton`은 유지(학생 케어·학부모 리포트 Wrapper와 404가 씀).
3. `AdminShell.tsx`: `AdminExtensionEntryId`에서 `today-board`·`feedback-dashboard`·`connections`·`interview`·`operations` 제거, `extensionEntries` 5개 제거, 주석 정리. **`data-care-theme`·`surface`·`parent-report`는 유지.**
4. 파일 삭제(68 + 5): §1-2·§1-3 목록. `components/AdminUi.tsx`·`.module.css`는 **유지**(Shell 사용). 내부의 구형 전용 export(`Kpi`·`ConfirmDialog`·`ModalDialog`·`Meter`·`ChipGroup`·`LoadingState` 등)의 정리는 선택.
5. 고아 Mentor 3개(`adminMentorCaseDetails.fixture.ts`, `read-model/mentorContent.ts`, `read-model/integrity.ts`)와 `assets/activity-case/*`는 위 작업과 독립적으로 먼저 지워도 된다.
6. Backend API·Migration: **변경 없음**(구형 Backend 없음). 기존 Migration은 삭제·변경하지 않는다.
7. 시험·CI: 구형 전용 시험이 없어 변경할 시험 없음. `e2e/tests/support.ts:37` 주석은 완규님 파일이라 협의 후 수정.
8. 문서: `legacy-cleanup-plan.md` 4단계 완료 기록, README·OWNERSHIP §3-4·§10-2 갱신(원본 미Commit 작업자와 조율), ADR은 이력 보존.

## 13. 보호해야 할 공통 코드

| 대상 | 이유 |
|---|---|
| `frontend/admin/src/main.tsx`, `index.css`(`lh-visually-hidden` — SC·AS·Shell 사용), `app/theme.css`(학생 케어 Token) | 앱 진입·전역 스타일 |
| `App.tsx`, `app/AdminShell.tsx`·`.module.css`, `app/adminLocation.ts`(**Assessment 12개 파일이 사용**), `app/studentCarePaths.ts` | Shell·Router |
| `components/AdminUi.tsx`·`AdminUi.module.css` | `App.tsx`가 학생 케어·학부모 리포트 Wrapper·404에 사용 |
| `vite.config.ts`, `parentReportPreview.ts`(+시험), `visionDevAuth.ts`, `student-preview.html`, `index.html` | 개발 서버·Proxy·빌드 입력 |
| 학생 `features/assessment/api/mock/readOnlyViewStore.ts`, `routes/AssessmentReadOnlyViewer.tsx` | 관리자 Assessment가 cross-app import |
| `frontend/student/tools/universityExamPdfDevServer.ts` | 관리자 vite Plugin |
| Backend `common/**` 전부(error·json·time·integration·testsupport·vision·phapi) | §2 C·D·F |
| `database/migrations/*` 18개 | 이력 보존 |
| `e2e/**`, `.github/workflows/ci.yml`, `scripts/**` | Shared 실행 환경 |

## 14. 제거 후 필요한 테스트

- Frontend typecheck·lint·build(student·admin), `verify-frontend.ps1 -Strict`, Harness `verify.ps1`.
- Admin 실화면: 메뉴 3개(학생 케어·학부모 리포트·Assessment)와 새 `/` 기본 화면, 제거한 주소 → '페이지 없음', 학생 케어 테마 전환, 콘솔 페이지 오류 0.
- Student Care Node 시험 92, Student Care Playwright(인수 시험 정합성 해결 후), Assessment Stub E2E 23.
- Backend Unit·Integration 전체(코드 변경이 없어도 Merge 전 1회), ArchUnit.
- `git grep`으로 `features/feedback`·`student-management`·`fixtures/`·`read-model/`·`store/` 참조 0 확인.

## 15. 완규님 검토가 필요한 항목

1. Today Board와 학생 케어 신호 공유 **제안**을 철회해도 되는지(Today Board 삭제 전제).
2. 관리자 `/` 기본 화면을 학생 케어로 할지(또는 Assessment).
3. Student Care 인수 시험 31건 실패: CI 고정일·Seed(210명·11-11)·`seed-care-history.mjs`(60명) 정합성.
4. 학생 케어가 Assessment 개편 Shell 안에 보이는 시각 변화.
5. Student Care 내부 미사용 모듈 11개, `StudentCareRoute.module.css`, `student-care-v1` Plugin 정리 여부.
6. `phapi` ACL 보존 방침(실제 PHP 연동 시점).
7. `e2e/tests/support.ts` 주석, 공용 문서(OWNERSHIP·README) 갱신 협의.
8. 감독관·사진 관찰 서비스가 없을 때의 `/supervisor-api` 502 처리.

## 16. 현재 PR #17의 병합 차단 사항

| # | 차단 사항 | 근거 |
|---|---|---|
| 1 | **GitHub CI 'E2E (Playwright)' failure**(head `1c89c48`). Harness·Frontend·Backend는 success. **`main c03a1a4`도 같은 E2E failure** | GitHub check-runs API, A20 로컬 기준선 31/31 동일 |
| 2 | **시연 DB Migration 순서 밖**(3개) — 적용 방식 미결정 | §11-6 |
| 3 | Student Care Shell 시각 변화 미승인 | §11-3 |
| 4 | 구형 관리자 기능 6종이 아직 남아 있고 `/` 기본 화면이 구형 | §5~§7, §11-1 — 'Student Care·Assessment만 남기기' 목표 기준 미완료(제거는 별도 승인 필요) |
| 5 | 공용 문서·스크립트를 원본 폴더 미Commit 작업자(README·`scripts/verify.ps1`·OWNERSHIP 등)와 조율하지 않음 | A20 §19 |
| 6 | Draft → Ready 전환·병합 결정 | 사람 결정 |

PR 상태(읽기 전용 확인): open · **draft** · mergeable=true · mergeable_state=`unstable`(CI 실패 때문).
