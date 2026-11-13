# LearnersHigh Assessment 현황 점검 및 통합 준비도 (2026-11-13)

> 읽기 전용 점검 결과입니다. 코드·DB·서버·Git 상태는 바꾸지 않았고, 이 보고서 파일만 새로 만들었습니다.
> 점검 시점: 2026-11-13 (KST). 브랜치: `feature/assessment-student-integration-enhancement` (HEAD `1790cb4`).
> 확실성 표기: **[직접]** 이번 점검에서 실행·조회해 확인 / **[정적]** 코드 정적 분석 / **[과거]** 과거 보고서 기반(이번에 재실행 안 함) / **[미검증]** 근거 없음.
> 학생·활동 데이터는 모두 합성 시연 데이터입니다. 토큰·비밀번호·`.env` 값은 이 문서에 쓰지 않았습니다.
> 이 저장소는 Public이므로 `existing-learnershigh-data.md` 정책에 따라 기존 LearnersHigh 원본 저장소의 이름·경로·Endpoint는 쓰지 않았습니다.

---

## 1. Executive Summary

1. **실제로 완성된 범위**: Student 수행평가·탐구 노트(Revision)·결과물(파일 버전)·피드백(Snapshot)·성장 기록·보관함, Admin 학생 기록 열람·피드백 답변 전달은 **Spring Boot + MySQL에 실제로 저장되고 Student/Admin 양쪽에서 같은 ID로 조회됩니다**. [직접: DB 조회, 정적: 코드] [과거: 11-12 E2E]
2. **Frontend**: Student·Admin 모두 `mock | http` 두 가지 모드로 동작합니다. 위 핵심 기록 기능은 http로 연결되어 있지만 **Admin 홈(Overview)**, 학업정보 수정, 과목 추가, 학생 평가계획서 업로드·분석·개인 검토, 심화·대학·모의고사 자료는 **Mock 전용이거나 http 모드에서 503**입니다. [정적]
3. **Backend**: Assessment 132개 Java 파일, 12개 Controller, 약 70개 Endpoint가 있습니다. 마지막 테스트 기록은 Unit 272건, Integration 144건 모두 PASS(2026-11-12 12:24 KST)이며, **그 이후 Backend Java 코드는 바뀌지 않았습니다.** [직접: XML 결과·파일 시각 비교] 다만 **Backend Assessment 코드, Admin Assessment 코드, Assessment Migration 6개가 모두 Git Untracked 상태로, 한 번도 Commit되지 않았습니다.** [직접]
4. **인증**: 실제 LearnersHigh 로그인과는 연결되지 않았습니다. 지금은 `X-Assessment-Student-Id` / `X-Assessment-Admin-Id` Mock Header로 인증하므로 **Header만 조작하면 다른 학생으로 위장할 수 있습니다**. [정적]
5. **분석기**: `127.0.0.1:8765`에서 실행 중입니다(v21.1, **`llmCalls=false`, 규칙 기반**). PDF는 PDFBox 3.0.5(Java 17), HWP는 직접 구현한 OLE/레코드 Reader, HWPX는 ZIP+XML로 읽습니다. [직접: `/health`] [정적]
6. **분석 정확도**: 사람이 대조한 표본 21개 항목 기준으로 검출 76%, 반영비율 14/14, **채점기준표 0/5**였습니다. 삼각산고는 과목명이 모두 "반"으로 잘못 나왔습니다. 운정고 2026-2 1학년 PDF(303쪽)는 **PARTIAL** 판정이고 일부 과목에서 항목이 누락됐습니다. [과거]
7. **가장 큰 미완성 기능**: 평가계획서 **원문 파일을 Backend에 보관하지 않습니다**(`file_ref`가 항상 NULL). Backend는 분석기를 **직접 호출하지 않고**, 분석 결과는 개발 Flag가 켜진 경우에만 브라우저를 거쳐 수신합니다. 관리자 검토·확정 화면은 http에 연결되지 않았고, **학생에게 분석 결과나 확정값을 제공하는 API가 없습니다.** [직접·정적]
8. **11/17 최대 위험**: ① 원문 저장, 서버 측 분석 호출, 확정값 학생 노출로 이어지는 "평가계획서 핵심 흐름"이 끊겨 있습니다. ② 실제 인증과 기존 LearnersHigh 연동 방식이 미결입니다(외부 의존). ③ 대량의 미커밋 코드가 Git 이력 없이 남아 있습니다. ④ 문서 분석 정확도가 복잡한 문서에서 낮습니다.

---

## 2. 개발 환경 및 현재 실행 상태

### 2-1. 경로

| 구분 | 실제 경로 | 근거 |
|---|---|---|
| 확장 저장소 | `C:\learnershigh-extension` | [직접] |
| Student Frontend | `frontend/student/` (React 19 + Vite + react-router 7), Assessment `src/features/assessment/` | [직접] |
| Admin Frontend | `frontend/admin/` (Router 없음, `app/adminLocation.ts`), Assessment `src/features/assessment/` | [직접] |
| Backend | `backend/` (Java 21, Spring Boot 4.1.1), Assessment `src/main/java/com/learnershigh/extension/assessment/` | [직접] |
| Migration | `database/migrations/` (Student Care 2개 + Assessment 6개) | [직접] |
| E2E (Playwright) | `e2e/tests/student-care.spec.ts`만 있음. Assessment E2E는 `docs/specs/suyeon/**/scripts/*.mjs` 시연용 스크립트로 흩어져 있음 | [직접] |
| 검증 Script | `scripts/verify*.ps1` | [직접] |
| 문서 분석기 | `C:\Users\choi suyeon\LearnersHigh-local\curriculum-analysis` (저장소 밖, Git 미관리, "계정 B" 소유로 기록됨) | [직접] |
| 평가계획서 원문 데이터셋 | `references/curriculum-plan/` (`.git/info/exclude` 처리, Read-only) | [직접] |
| 기존 LearnersHigh 원본 | 저장소 밖 로컬 분석 사본이 **있음**(PHP 7.3/8 + Composer, 학생 모바일 화면은 PHP/HTML). 경로·이름은 Public 저장소 정책상 생략 | [직접] |

**분석기와 확장 저장소의 의존 관계**: 코드 수준의 의존은 없고 HTTP로만 연결됩니다.
- 분석기 → 확장: 없음
- 확장 → 분석기: ① Student/Admin **개발 서버 Proxy** `/dev-analysis/*` → `127.0.0.1:8765/analyze-preview`, 토큰은 Node Proxy가 붙입니다. 이 Proxy 설정은 기본 `vite.config.ts`에 없고 `docs/specs/suyeon/*/scripts/vite.*.config.ts`에만 있습니다. ② 분석 응답의 `backendImport.payload`를 **브라우저가** Backend `POST .../analysis-imports`로 다시 보냅니다(Flag가 켜진 경우만).
- Backend Java에는 8765나 분석기를 호출하는 코드가 없습니다. [직접: grep 0건]

### 2-2. 프로세스·포트 (2026-11-13 점검 시점)

| 서비스 | 참고 포트 | 상태 | 근거 |
|---|---|---|---|
| MySQL (Docker `learnershigh-mysql`, mysql:8.4) | 3307 | **실행 중** (Up 13h, healthy) | [직접] `docker ps` |
| Backend | 18080 | **응답 없음** (연결 실패) | [직접] curl 000 |
| Student Vite | 5173 | **응답 없음** | [직접] |
| Admin Vite | 5174 | **응답 없음** | [직접] |
| Python 분석기 | 8765 | **실행 중**, `/health` 200 | [직접] |

`/health` 응답 요약: `defaultAnalyzerVersion=v21.1`, 지원 형식 `PDF/HWP/HWPX`, `analysisMode.llmCalls=false`, `method=RULE_BASED_STRUCTURE_ANALYSIS`, `pdfLayout.java=true`, 상한 20MB·120초·동시 2건·2048MB, 인증 Header `X-Analysis-Token` 필수, 계약 `analyze-preview-0.1-dev`("공식 Shared API 계약 아님").

판단 단계별 상태:

| 항목 | Backend | 분석기 | Student/Admin Vite |
|---|---|---|---|
| 서버 실행 가능 | 가능 (`build/libs/*.jar`, 11-12 11:34) [정적] | 가능 | 가능 |
| 포트 연결 | 불가 (현재 꺼짐) | 가능 | 불가 |
| Health | 확인 불가 | 정상 | 확인 불가 |
| 실제 API 응답 | **이번에 미확인** | 이번에는 분석 요청 안 함 | 미확인 |
| 실제 데이터 조회 | DB 직접 SELECT로 대체 확인 | — | — |

> 서버를 새로 띄우지 않았으므로 이번 점검에서는 HTTP API 응답과 화면 동작을 직접 확인하지 않았습니다. API 왕복 동작은 11-12 기록 [과거]과 코드 [정적]를 근거로 판단했습니다.

### 2-3. DB

- 시연 Backend가 쓰던 DB는 `lh_demo_manual_20261111`입니다(`BACKEND-RESTART-20261112.md`). Flyway 8건이 모두 success입니다. [직접]
- 같은 MySQL 안에 **테스트·실험용 DB가 41개** 남아 있습니다(`lh_assessment_*`, `lh_demo_*`). 정리 대상인지는 결정이 필요합니다. [직접]
- 결과물 파일 Storage는 `~/.learnershigh-extension/dev-artifact-storage`이며 파일은 100개입니다. 여러 테스트 DB가 같은 Storage를 함께 씁니다. [직접]

### 2-4. Git

- 변경 187건. 주요 Untracked 항목: `backend/.../assessment/**`(132 파일), `backend/src/test/.../assessment/**`, `frontend/admin/src/features/assessment/**`, `frontend/student/.../assessment/dev/**` 등 17개, Assessment Migration 6개, ADR-0008·0009, `docs/specs/suyeon/` 하위 보고서 폴더 다수. [직접]
- Shared 영역 미커밋 변경: `frontend/admin/src/App.tsx`, `app/AdminShell.tsx`(+206/-29), `backend/build.gradle.kts`, `application.yml`, `CLAUDE.md`·`README.md`·rules 다수. **팀 승인 기록이 없습니다**(progress.md P-06/P-31). [직접]

---

## 3. Student Frontend 기능별 구현 매트릭스

기준: http 모드(`VITE_ASSESSMENT_DATA_SOURCE=http`). 개발 서버의 기본값은 `mock`이고 Production Build의 기본값은 `http`입니다(`api/dataSource.ts`).

| # | 기능 | 상태 | 실제 API | 저장 | 테스트 근거 | 남은 작업 |
|---|---|---|---|---|---|---|
| 1 | Assessment 홈·요약 | 부분 완료 | 수행평가·기록 API를 조합 | DB 기반 | [과거] Student 76/76 E2E(11-12) | Tips는 정적 콘텐츠 |
| 2 | 학교·학업 정보 조회 | 부분 완료 | `GET /academic-context` (http) | **Mock Provider**(시연 명단 JSON) | [과거] | 실제 학교 정보 원천(OD-A04) 연결. `PUT academic-context` http 미구현(503) |
| 3 | 수행평가 목록·상세 | **완료**(개발 인증 기준) | GET list/detail | MySQL | [과거] E2E + IT `SchoolAssessmentApiTest` 11건 | 실제 인증 |
| 4 | 수행평가 생성·수정·상태 변경·삭제 | **완료**(개발 인증 기준) | POST / PATCH / PATCH status / DELETE(휴지통) | MySQL, `@Version` 낙관적 락 | [과거] IT PASS | **중복 생성 방지 없음**(Idempotency·Unique 없음) |
| 5 | 과목 선택·학기 전환 | 부분 완료 | context 기반 | 과목 후보 = 공통 SubjectCatalog(학교별 아님) | [과거] | 과목 추가(`createStudentSubject`) http 미구현(503) |
| 6 | 평가계획서 목록·원문 열람 | 부분 완료 | `GET /evaluation-plans`, `/{planId}` | 메타데이터만 | IT `EvaluationPlanApiTest` | **원문 파일 열람 불가**(Backend 미보관). 응답에 분석값·확정값 없음 |
| 7 | PDF·HWP·HWPX 분석 미리보기 | **개발 전용** | `/dev-analysis` Proxy → 8765 | **저장 안 함**(메모리) | [과거] 10/10 | 운영 경로 없음. Student 업로드·분석 API(§10 계약)는 Backend 미구현 |
| 8 | 탐구 노트·자동 저장·이력 | **완료**(개발 인증 기준) | notes POST/PUT/GET, revisions | MySQL (Revision 불변) | [과거] 노트 18/18, IT `StudentRecordApiTest` | 실제 인증 |
| 9 | 결과물 업로드·열람·다운로드 | **완료**(개발 Storage 기준) | artifacts, versions(multipart), file, preview, compare | **실제 파일 바이트를 로컬 Storage에 저장**, SHA 검증 | [직접] DB `size_bytes>0`, storage_key 존재. [과거] 뷰어 2/2 | 운영 File Storage(OD-A07) |
| 10 | 자료함·심화 탐구 | 부분/Mock | resources CRUD는 http. 심화 Task·개인 모의고사·대학 자료는 **Mock 또는 503** | resources는 MySQL | [정적] | 심화는 11-03에 범위 축소(정적 콘텐츠) |
| 11 | 성장 기록·보관함 | **완료**(개발 인증 기준) | growth-records CRUD, archive, favorites, restore | MySQL | [과거] IT `StudentRecordExtrasApiTest` | — |
| 12 | 피드백 요청·조회 | **완료**(개발 인증 기준) | feedback-requests POST/GET, reply | MySQL, Snapshot 불변, `uq(student_id, snapshot_key)` 중복 방지 | [과거] IT + E2E | — |
| 13 | Loading/Empty/Error/권한 없음 | 부분 완료 | 연결 실패는 오류로 처리(빈 값으로 바꾸지 않음) | — | [과거] | 실제 401 처리(로그인 이동)는 인증 결정 이후 |

- 새로고침 후 데이터 유지: http 모드에서 MySQL에 저장되므로 유지됩니다. [과거 E2E + 정적]
- 학생 ID와 학교·학년·학기: 11-12 기록상 60명 재조회 불일치 0입니다. [과거]
- 운영 Build의 개발 화면 제거: 현재 `dist`(11-12 17:35 빌드, 이후 소스 변경 0건)에서 `dev-analysis`, Mock Header 이름, `stu_demo`, `adm_demo`, `DevContextSwitcher`가 **0건**입니다. [직접] 다만 Mock 시나리오 코드(`mockScenario`)와 예시 Fixture 문자열은 번들에 남아 있습니다(Admin 2개, Student 1개 Chunk). [직접]
- 기존 Navigation: Student 상단바에 기존 학생 이름이 고정되어 있습니다(ISSUES B-2). [과거]
- 기본 `frontend/student/vite.config.ts`에는 `/api` Proxy가 없습니다. http 모드 개발은 문서 폴더의 별도 Vite 설정에 의존합니다. [직접]

## 4. Admin Frontend 기능별 구현 매트릭스

| # | 기능 | 상태 | 실제 API | 저장 | 테스트 근거 | 남은 작업 |
|---|---|---|---|---|---|---|
| 1 | Assessment 관리자 홈(Overview) | **Mock 전용** | 없음 (`getOverviewMock` 고정 export) | — | [정적] | Backend `GET /overview` 미구현. KPI가 Mock 값 |
| 2 | 담당 학생 목록·검색·필터 | 완료(개발 인증) | `GET /students` | 지점 범위 | [과거] 21/21 | 과목 필터는 http에서 미적용(B-6) |
| 3 | 학생 상세 | 완료(개발 인증) | `GET /students/{id}` | — | [과거] | — |
| 4 | 학생별 수행평가 | 완료 | `GET /students/{id}/school-assessments` | 같은 ID | [과거] Cross-surface | — |
| 5 | 노트·이력 열람 | 완료 | notes, student-view revisions | 읽기 전용 | [과거] 18/18 | — |
| 6 | 결과물 열람·다운로드 | 완료 | versions/file/preview/compare | 실제 파일 | [과거] | — |
| 7 | 피드백 작성·전달·이력 | 완료 | feedback-requests, reply-draft PUT, deliver POST | MySQL, 전달 후 변경 409 | [과거] IT | — |
| 8 | 성장 기록·활동 현황 | 부분 완료 | growth-records, student-view | — | [과거] | 활동 요약은 기록 API 조합 |
| 9 | 학교별 평가계획서 목록 | 부분 완료 | `GET /evaluation-plans` (운영 학교만) | 메타데이터 | IT | **학교 목록 API 없음**(개발 설정 + 담당 학생 학교로 계산) |
| 10 | 평가계획서 등록·Revision | 부분 완료 | POST, POST revisions (PDF·HWP·HWPX는 실험 Flag) | **메타데이터만, 원문 바이트 폐기** | IT `EvaluationPlanApiTest` 7건 | File Storage 결정(API-OD-A03) |
| 11 | 분석 결과 검토·확정 | **차단** | `GET .../analysis`는 연결됨. `PUT .../review`는 Backend에 있지만 `savePlanReviewHttp`는 **notConnected**. 별도 `confirmPlanReview`(구조 검토 화면)만 http | review·confirmed_value **0건** [직접] | IT `StructuredPlanReviewApiTest` 3건 | 과목 ID 매핑 UI(C-7). HWP/HWPX 확정은 `structured-confirm-dev=false`로 거절 |
| 12 | 운영 권한·지점 권한 | 분리 구현 | branchIds(기록) ↔ planSchools(평가계획서) | — | IT | **OD-A08 미결**. 시연 관리자 4명은 운영 학교가 비어 있음 |
| 13 | 분석 결과 미리보기 | **개발 전용** | `/dev-analysis` | 저장 안 함 | [과거] 49/49 | 운영 경로 없음 |
| 14 | 원문 뷰어·분석 결과 UI | 부분 | 근거 Locator(쪽 / HWP 구역·표·행·열) 표시 | — | [과거] 12/12 | 원문 파일이 없어 **서버 원문 뷰어 불가** |
| 15 | 오류·권한 없음·빈 데이터 | 부분 완료 | 403을 `planOperable=false`로 표시 | — | [과거] | — |
| — | 참고자료실 | 완료 | reference-library CRUD, 휴지통, 공개 설정 | MySQL | [과거] | — |
| — | 심화·대학·모의고사 콘텐츠 관리, AI 검토 | **Mock 전용** | 없음 | — | [정적] | 11-03 범위 축소 |
| — | AI 분석 화면(`/ai/*`) | 차단 | Backend 있음, Provider 기본 `none` → 503 | 메모리 | Unit 10 / Web 5 | API-OD-A10 미결 |

**이번에 다시 확인한 사항**
- `adm_demo_a01` 평가계획서 403: 코드가 그대로입니다. `MockHeaderAssessmentActorProvider`가 시연 관리자에게 `Set.of()`(운영 학교 없음)를 부여하고, `PlanAccess.requireSchool`이 403을 반환합니다. Frontend는 403을 받으면 개발 전용 미리보기 패널로 우회합니다(`EvaluationPlansRoute.tsx`, `PlanAnalysisPreviewPanel.tsx`). **설계상 의도된 제한이며 결함은 아닙니다.** [정적]
- 평가계획서 운영 권한이 있는 Mock 관리자는 `adm_plan_operator`와 `adm_demo_gangnam`뿐이며, 둘 다 `school_001`(가상 예시고)만 운영합니다. → **실제 15개 학교의 공식 평가계획서는 어떤 관리자도 등록할 수 없습니다.** [정적]
- DB의 평가계획서 5건은 모두 `school_001`이고 모두 `UNREVIEWED` 상태이며 `file_ref`가 NULL입니다. 같은 슬롯(1학년 2학기, 2학년 1학기)에 Plan이 **2개씩 중복**되어 있습니다(슬롯 Unique 제약 없음). [직접]
- 레거시 Admin Feature `features/feedback/`, `features/student-management/`(구형 Suyeon)는 아직 `App.tsx`에서 Route로 연결되어 있습니다. [직접] 폐기 범위가 아직 확정되지 않았습니다.

---

## 5. Backend 및 DB 구현 현황

| 도메인 | Entity / Table | Service·Repository | API | MySQL 영속 | 파일 저장 | 테스트 | 제약·미결 |
|---|---|---|---|---|---|---|---|
| 학업 Context | (DB 없음) `AcademicContextRecord` | `AcademicContextQueryService` | GET | ✗ (Mock Provider + 시연 명단 JSON) | — | DemoRoster 8+3 | OD-A04 |
| 학교·학생 매핑 | (DB 없음) | `AssessmentStudentDirectory`, `DemoRoster` | — | ✗ | — | ✓ | 기존 LH 학생 Client는 Mock(`learnershigh.integration.mode=mock`) |
| 수행평가 | `SchoolAssessment` / `assessment_school_assessment` | ✓ | ✓ | ✓ 366건 | — | IT 11, Unit 5 | 중복 방지 없음, OD-A01(기존 수행평가와 매핑) |
| 노트·Revision | `AssessmentNote`, `NoteRevision` | ✓ | ✓ | ✓ 65 / 120 | — | ✓ | uq(note source), uq(rev no) |
| 결과물·Version | `Artifact`, `ArtifactVersion` | ✓ | ✓ | ✓ 54 / 87 | **✓ 로컬 Storage** | ✓ | 운영 Storage 미정 |
| 피드백 | `FeedbackRequest`, `FeedbackReply`, `FeedbackSnapshotItem` | ✓ | ✓ | ✓ 38 / 31 / 39 | — | ✓ | ADR-0009 팀 승인 확인 필요 |
| 성장 기록 | `GrowthRecord` | ✓ | ✓ | ✓ 61 | — | ✓ | — |
| 자료·즐겨찾기 | `AssessmentResource`, `Favorite` | ✓ | ✓ | ✓ 4 / 22 | — | ✓ | — |
| 평가계획서·Revision | `EvaluationPlan`, `PlanRevision` | ✓ | ✓ | ✓ 5 / 5 (메타데이터만) | **✗ 원문 미보관** (`fileRef=null` 고정) | IT 7 | API-OD-A03, 슬롯 중복 허용 |
| AnalysisRun | `PlanAnalysisRun` | ✓ | import(Flag), GET | ✓ 5건 (모두 REVIEW_REQUIRED) | — | IT 1+3+2+5 | **수신 Endpoint는 계약 미등록(PROPOSED), 기본 OFF(404)**. uq(revision, payload_sha256) |
| 검토·확정값 | `PlanReview` / `assessment_plan_confirmed_value` | ✓ | PUT review | ✓ (테이블), **0건** | — | IT 3 | HWP·HWPX 확정은 개발 Flag 필요, OD-A08 |
| 권한 | `AdminActor(branchIds, planSchoolIds)`, `PlanAccess`, `StudentRecordAccess` | ✓ | — | — | — | ✓ | **Mock Header 인증**, Spring Security 미사용 |
| AI(Claude) 분석 | 없음(메모리) | `AssessmentAiService` | `/api/admin/assessment/ai/*` | ✗ | — | Unit 10, Web 5 | Provider 기본 none → 503 |

에러 코드: 401/403/404/409/413/415/422가 정의되어 있습니다(`AssessmentErrorCode`). 다른 학생·다른 지점 리소스는 404로 숨기고, 학교 운영 권한이 없으면 403을 반환합니다. [정적]

## 6. Frontend–Backend API 연결 매트릭스 (주요)

범례: B = Backend 구현, F = Frontend http 연결, DB = 저장·조회, T = 자동 테스트, X = 교차 Surface 확인

| 기능 | Method / Endpoint (`/api/student/assessment` = S, `/api/admin/assessment` = A) | B | F | DB | T | 상태 |
|---|---|---|---|---|---|---|
| 학업 Context | GET S/academic-context | ✓ | ✓ | Mock | ✓ | 부분 (Mock 원천) |
| 학업 Context 수정 | PUT S/academic-context | ✗ | 503 | — | — | **명세에만 존재** |
| 수행평가 CRUD·상태 | GET/POST S/school-assessments, GET/PATCH/DELETE `/{id}`, PATCH `/{id}/status` | ✓ | ✓ | ✓ | IT | 연결 완료(개발 인증) |
| 기준 설명·주제 제안(AI) | POST S/school-assessments/{id}/criteria-explanations, topic-suggestions | ✗ | ✗ | — | — | 명세에만 존재 |
| 평가계획서 조회(학생) | GET S/evaluation-plans, `/{planId}` | ✓ | ✓ | 메타 | IT | 부분 (분석·확정값 없음) |
| 평가계획서 업로드·분석·개인 검토(학생) | POST S/evaluation-plans/uploads, POST/GET `/{rev}/analysis`, PUT personal-review | ✗ | 503 | — | — | **명세에만 존재** |
| 노트 | GET/POST S/notes, PUT `/{id}`, GET revisions(`/{revId}`) | ✓ | ✓ | ✓ | IT | 연결 완료 |
| 결과물 | GET/POST S/artifacts, GET/POST versions, GET file/preview/compare, DELETE | ✓ | ✓ | ✓+파일 | IT | 연결 완료 |
| 결과물 단건 GET/PATCH | GET/PATCH S/artifacts/{id} | ✗ | — | — | — | 명세에만 존재 |
| 피드백(학생) | POST/GET S/feedback-requests, GET `/{id}`, GET reply | ✓ | ✓ | ✓ | IT | 연결 완료 |
| 성장 기록·보관함 | growth-records CRUD, archive, favorites, restore | ✓ | ✓ | ✓ | IT | 연결 완료 |
| 자료 | resources CRUD, shared-resources | ✓ | ✓ | ✓ | IT | 연결 완료 |
| 추천 자료원 | GET S/resources/recommendations | ✗ | 정적 콘텐츠 | — | — | 정적 처리 |
| 심화·모의고사·대학 | enrichment/*, mock-exam-materials, university-resources | ✗ | Mock/503 | — | — | 범위 축소(11-03) |
| 관리자 Overview | GET A/overview | ✗ | **Mock** | — | — | **명세에만 존재** |
| 관리자 학생 목록·상세 | GET A/students, `/{id}` | ✓ | ✓ | ✓ | IT | 연결 완료 |
| 관리자 학생 수행평가·노트·결과물·성장 | GET A/students/{id}/school-assessments, notes, artifacts, growth-records, student-view/** | ✓ | ✓ | ✓ | IT | 연결 완료 |
| 관리자 노트 단건 | GET A/students/{id}/notes/{noteId}(/revisions) | ✗ (student-view 경로로 대체) | — | — | — | 계약과 경로 불일치 |
| 관리자 피드백 | GET A/feedback-requests(`/{id}`), PUT reply-draft, POST deliver | ✓ | ✓ | ✓ | IT | 연결 완료 |
| 참고자료실 | A/reference-library CRUD·trash·restore·visibility | ✓ | ✓ | ✓ | IT | 연결 완료 (계약 반영 여부 별도 확인 필요) |
| 평가계획서 목록·등록·Revision | GET/POST A/evaluation-plans, GET `/{id}`, POST revisions | ✓ | ✓ | 메타만 | IT | 부분 (원문 미보관) |
| 서버 분석 실행 | POST A/evaluation-plans/{p}/revisions/{r}/analysis | ✗ | notConnected | — | — | **명세에만 존재** |
| 분석 결과 수신 | POST A/.../analysis-imports | ✓ (Flag) | ✓ (개발) | ✓ | IT | **계약 미등록(PROPOSED)**, 기본 404 |
| 분석 조회 | GET A/.../analysis | ✓ | ✓ | ✓ | IT | 연결 완료 |
| 검토 확정 | PUT A/.../review | ✓ | 구조 검토 화면만, 기본 저장은 notConnected | ✓ (0건) | IT 3 | **차단**(과목 매핑 UI·권한) |
| AI(Claude) 분석 | GET A/ai/status, POST evaluation-plan-analyses 등 | ✓ | ✓ | ✗ | Unit/Web | Provider 미연결 503 |

**필드·상태 코드 일치 여부**: 연결된 Resource는 Frontend http Adapter가 Backend DTO를 읽고, 11-12 E2E에서 왕복이 확인되었습니다 [과거]. 이번에는 Contract Test를 자동으로 실행하지 않았습니다. 계약과 불일치하는 것으로 확인된 사항은 다음과 같습니다. ① 관리자 노트 단건 경로 ② `analysis-imports`가 계약에 없음 ③ Admin 학교 목록 Endpoint 없음 ④ 학생 목록 응답에 수강 과목이 없음(B-6). [정적]

**API·권한 요점**
- 학생은 본인 기록만 접근할 수 있고(`StudentRecordAccess`, 남의 ID는 404), 관리자는 담당 지점 학생만 접근할 수 있습니다(`AdminStudentScope`). [정적] [과거: 범위 밖 21/21]
- 실제 LearnersHigh 인증은 연동되지 않았습니다. Mock Header만 있으면 통과하며, 그 Header는 학생 목록에 있는 ID인지만 검사합니다. [정적]
- 동시 수정: 주요 Entity에 `@Version`이 있고 충돌 시 `RESOURCE_VERSION_CONFLICT`(409), 파일 버전 경합 시 `FILE_VERSION_MISMATCH`(409)를 반환합니다. [정적]
- 중복 생성: 피드백은 DB Unique로 막혀 있습니다. **수행평가 생성과 평가계획서 슬롯은 중복이 가능합니다.** 실제 DB에서 평가계획서 슬롯 중복 2건을 확인했습니다. [직접]
- 파일 접근: 결과물 다운로드 시 소유권·지점 검사를 하고 SHA를 재검증합니다(`FILE_INTEGRITY_FAILED`). [정적]

---

## 7. 문서 분석기 구현·품질 보고

### 7-1. 기본 구성 [직접 /health + 정적]

| 항목 | 값 |
|---|---|
| 서비스 / 계약 | `curriculum-analysis-preview` 0.1-dev / `analyze-preview-0.1-dev` (개발용 내부 계약) |
| 분석기 버전 | 기본 `v21.1`, 재현용 `v21`, 실험용 `v21.2-quality` |
| 실행 | Python 3.12 표준 라이브러리 HTTP 서버(`tools/service/analysis_service.py`), 요청마다 Worker 프로세스. 127.0.0.1 전용, Host 검사, CORS 거부 |
| 의존성 | Python 3.12.9, OpenJDK 17.0.18 + **PDFBox 3.0.5**(`PdfLayout.java`). HWP는 자체 OLE/CFB·레코드 Reader(`docmodel/hwp5.py`, 외부 라이브러리 없음). HWPX는 `zipfile` + `ElementTree` |
| LLM | **호출 없음.** Worker가 소켓을 차단하고 `anthropic`·`google.genai` Import도 막습니다. (v6·v7 등 과거 실험에서 합성 데이터로 Claude·Gemini를 실제 호출한 기록은 있지만 현재 서비스 경로에는 없습니다.) |
| API | `GET /health`, `POST /analyze-preview`(multipart: file, analyzerVersion, includeAnalysis, fileId, includeInferred=false만 허용) |
| 출력 | PDF → 공식 `AnalysisImportRequest`(backend-adapter-0.2). HWP·HWPX → 실험 DTO(`source.format`, `documentLocator`). 상태 `OK_REVIEW_REQUIRED` / `PARTIAL` / `UNSUPPORTED_FORMAT` / `REJECTED` |
| 실패 처리 | 413/415/411/401/503(BUSY)/시간 초과. 부분 결과는 PARTIAL. 단, **부분 결과인데도 `OK_REVIEW_REQUIRED`로 나온 사례가 있습니다**(대신고 심리학 HWPX, ISSUES A-3) |
| 코드 최종 변경 | 2026-11-11 11:49. 이후 변경 없음. 같은 날 11:53 보고서에 테스트 615건 PASS 기록 [과거, 이번에 재실행 안 함] |

### 7-2. 분석 항목별

| 분석 항목 | 구현 | 검증 결과 | 문제점 |
|---|---|---|---|
| 학교명 | ✗ (문서에서 추출하지 않음, 등록 시 입력) | — | 자동 매칭 없음 |
| 학년도·학년·학기 | 일부(문서 학기 정보 표시) | **문서 내용과 자동 대조 안 함** [과거] | 선택값은 표시용 |
| 과목명 | ✓ | 충무 12/12, 가좌 6/6, **삼각산 11/11 오류("반")**, 진양 2/13 구간만 추출 [과거] | 과목 구간 감지 규칙 |
| 지필평가 | ✓ | 체육2·인간과철학 등 일치, 일부 시기 섞임 [과거] | — |
| 수행평가명 | ✓ | 검출 16/21, 이름 정확 12/16 [과거] | 표 열 결합("2차 시험 …"), 항목 경계 |
| 반영비율 | ✓ | **14/14**, 2칸 합산 정확 [과거] | HWPX 2건 누락 |
| 평가 시기 | ✓ | 11/12 [과거] | 시기 칸에 항목명이 들어간 사례 1건 |
| 만점·점수 | ✓ | 10/10 [과거] | — |
| 평가 방법 | 일부 | 미검증 | — |
| 채점기준표 | 구현(rubric 모듈) | **0/5** [과거] | 연결 실패 |
| 제출물·활동 조건 | ✓ (INFERRED는 제외) | 미검증 | — |
| 근거 페이지·표 위치 | ✓ PDF 쪽, HWP/HWPX 구역·표·행·열 | 인용 위치 339/339 일치. **연결 정확성은 별도 오류 있음** [과거] | 위치는 맞아도 다른 항목에 연결될 수 있음 |
| 다학년·다과목 분리 | 과목 분리 ✓, 학년 분리 미검증 | 진양 11구간 미추출 경고 | — |

### 7-3. 형식별

| 형식 | 정상 | 부분 | 실패·오류 |
|---|---|---|---|
| PDF | 충무 체육2, 운정 인간과철학 2/2 | 운정 2026-2 1학년(303쪽, **PARTIAL**, 13과목·수행 51개, 과학탐구실험2 40% 항목·한국사2 35% 누락), 충무 공통국어2·공통수학2 | 삼각산 과목명, 진양 구간 미추출 |
| HWP | 가좌 수학과(공통수학1·경제수학 완전 일치) | 문학과 영상(미검증) | 대신 인공지능 수학(`NAME_UNREADABLE`) |
| HWPX | — | 대신 심리학(1/2개, 비율 누락), 물리학Ⅱ(1/2개, 시기 오류) | — |

- **원문에 없는 값을 추정해 넣은 사례는 확인되지 않았습니다**(INFERRED 제외 정책). 다만 잘못된 결합·연결이 있어 결과적으로 **사실과 다른 값**이 나온 사례(이름 오염, 시기 칸 오류, 과목명 "반")는 있습니다. [과거]
- **운정고 2026-2 1학년 PDF**(`references/curriculum-plan/.../unjeong/2026/first-grade/second-semester/`, 2.7MB, SHA 앞 12자리 `3495a1d89f29`)는 로컬에 있습니다 [직접]. 대표 사례로 쓰기에 적합합니다. 과목마다 결과 수준이 다르므로(정확: 인간과철학 / 누락: 과학탐구실험2·한국사2) "정상 사례"와 "검토 필요 사례"를 함께 보여 줄 수 있습니다. 이번 점검에서는 분석을 다시 실행하지 않았습니다.
- 정확도 수치는 **8개 문서, 21개 항목 표본**입니다. 전체 정확도가 아닙니다.

---

## 8. 분석기–Backend–Frontend 전체 연결 상태

```text
원문 파일 ──① Backend 접수(메타데이터만) ── ✗ 원문 바이트 폐기
   │
   └─② (브라우저, 개발 Proxy) ─▶ Python 분석기 8765 ── ✓ 동작
                                     │
                     ③ 분석 JSON ─▶ (브라우저가 재전송) ─▶ Backend analysis-imports ── △ 개발 Flag 필요, 계약 미등록
                                                             │
                                                    ④ MySQL plan_analysis_run ── ✓ (5건)
                                                             │
                                ⑤ Admin GET analysis ── ✓ / ⑥ 검토·확정 ── ✗ 차단(0건)
                                                             │
                                ⑦ Student 조회 ── ✗ 분석·확정값 제공 API 없음
```

| 질문 | 답 | 근거 |
|---|---|---|
| 분석 결과를 Backend가 수신할 수 있는가 | 가능. 단 `ASSESSMENT_ANALYSIS_IMPORT_ENABLED=true`(기본 off)일 때만 | `AdminPlanAnalysisImportController` `@ConditionalOnProperty` |
| 개발용 설정이 반드시 필요한가 | **필요.** 분석기 토큰 Proxy, import Flag, 운영 학교 Mock 관리자, HWP/HWPX 실험 Flag | 코드·RUNBOOK |
| DB 저장 | 후보(AnalysisRun)는 저장 ✓, 확정값 0건 | [직접] |
| 동일 파일 중복 분석 방지 | 같은 Revision + 같은 payload SHA는 재사용(Unique). **같은 파일을 다른 Plan으로 등록하는 것은 막지 않음** | Migration·DB |
| SHA-256 동일성 | Revision에 sha256 저장, import 시 Revision SHA·쪽 수와 대조 | `AnalysisImportValidator` |
| 원문 재열람 | **불가** (`file_ref=null`) | `PlanRevision.upload` |
| 후보 ↔ 확정 구분 | 구분됨 (`plan_analysis_run` ↔ `plan_review`/`confirmed_value`) | Entity |
| 학생에게 미확정값 노출 | **노출 안 함** (학생 응답에 분석·후보가 없음). 확정값도 제공하지 않음 | `EvaluationPlanQueryService.toStudent` |
| Vite Proxy 없이 운영 가능 | **불가.** 서버 간 분석 호출 경로가 없음 | grep 0건 |

결론: **분석기 자체는 정상 동작합니다**[직접 health, 과거 E2E]. 그러나 **서비스 전체 연동은 개발용 우회 경로로만 이어져 있으며 운영 경로는 없습니다.**

---

## 9. 대표님 요구사항 대비 Gap Analysis (자동 수집 제외)

| 단계 | 상태 | 비고 |
|---|---|---|
| 1. Backend가 파일 접수 | **일부 작동** | 관리자 multipart 등록만 가능. 서비스 간 수집기 수신 API 없음 |
| 2. 학교·학년도·학년·학기 연결 | 일부 작동 | 슬롯 필드 있음. 실제 학교 ID 체계 미정(`school_001` 가상) |
| 3. 원문 파일 저장 | **별도 구현 필요** | File Storage 결정(API-OD-A03) 필요 |
| 4. 분석기로 전달 | **별도 구현 필요** | Backend → 분석기 Client 없음. 분석기 운영 배포 방식 결정 필요 |
| 5. 분석 결과 저장 | 일부 작동 | import Endpoint는 Flag + 계약 미등록 → **Shared 계약 결정 필요** |
| 6. 학생·관리자 조회 API | 일부 작동 | 관리자 후보 조회 ✓, 학생 확정값 조회 ✗ |
| 7. 화면에서 원문 열람 | **별도 구현 필요** | 3번이 선행되어야 함 |
| 8. 원문과 분석 결과 연결 표시 | 일부 작동 | Locator 표시 ✓, 원문 뷰어 ✗ |
| (검토·확정) | 차단 | 과목 ID 매핑 UI, OD-A08 권한, 실제 관리자 인증 |
| (수집기 결과 수신) | **완규님 수집기 결과 전달 + Shared 계약 필요** | 계약 없음 |

**자동 수집기 연동 인터페이스 — 현재 코드 보유 여부**

| 항목 | 현재 | 합의 필요 |
|---|---|---|
| 학교 식별 ID | `schoolId` 문자열(가상 `school_001`, 시연 명단 ID) | **실제 학교 코드 체계**(NEIS 학교코드 등, 기존 LH 학교 원천) |
| 학년도·학년·학기 | ✓ 필드 있음 | 학년 통합 문서(1~3학년 합본) 처리 |
| 공시 문서 URL | ✓ `source_url` 컬럼 | URL 정규화·만료 |
| 원문 바이트·저장소 참조 | ✗ (`file_ref` 미사용) | 바이트 전송 vs 공용 Storage 참조 |
| 파일명·MIME | ✓ | — |
| SHA-256 | ✓ Revision에 저장 | 중복 판별 기준으로 쓸지 |
| 문서 개정 정보 | Revision 번호만 | 공시 수정일·게시 ID |
| 중복 수집 판별 | ✗ (슬롯·SHA Unique 없음) | 슬롯 + SHA 규칙 |
| 수집 상태 | ✗ | 상태 Enum |
| 분석 요청 트리거 | ✗ | 수집 시 자동 / 관리자 수동 |
| 실패·재시도 정책 | ✗ | Idempotency-Key, 재시도 횟수 |
| 서비스 간 인증 | ✗ | Token / mTLS 등 |

---

## 10. 기존 LearnersHigh 통합 준비도

| 영역 | 현재 | 바로 가능 | 선행 결정 |
|---|---|---|---|
| 기존 학생 앱 | 저장소 밖 원본 사본상 **PHP 기반 웹/모바일 웹 페이지**(학생 모바일 화면도 PHP/HTML). React Native 여부는 **미확인** | 없음 | 통합 방식: 별도 웹(Link/iframe/WebView) vs 기존 PHP 화면 재구현. 기존 앱 Shell·빌드 담당 팀 확인 |
| Assessment Student | React 19 + Vite SPA | 독립 웹으로 배포 가능(정적 파일) | 기존 앱 Navigation 진입점, 사용자 Context 전달 |
| 기존 관리자 | 확장 Admin은 기존 Admin 화면을 재현한 React Shell(`AdminShell.tsx`, 미커밋 Shared 변경) | — | 실제 기존 관리자(PHP 콘솔)에 붙이는 방식 |
| 인증 | 기존: PHP + JWT 라이브러리(`firebase/php-jwt`) 사용 흔적 [정적, 원본 사본]. 확장: Mock Header | — | **API-OD-A01**: 기존 토큰 검증 방식, 학생·관리자·지점 ID 매핑 |
| 학생·지점 ID | 기존 PK는 bigint, 확장 계약은 String(`existing-learnershigh-data.md`) | 문자열 수용 가능 | 실제 매핑 |
| 학교 정보 원천 | 확장은 Mock(시연 명단) | — | **OD-A04**: 기존 LH에 학교 정보 컬럼이 있는지 확인 필요(미확인) |
| 기존 수행평가 | 기존 LH에 수행평가 기능이 **있음**(`existing-runners-high-analysis.md` §7-10) | — | **OD-A01**: 중복·Write Owner. 미결이면 같은 과제가 두 곳에 저장됨 |
| Backend | 독립 Spring Boot + 독립 MySQL. 경로는 `/api/student/assessment`, `/api/admin/assessment` | 독립 운영 가능(경로 충돌 가능성 낮음) | Gateway·도메인, CORS/Cookie |
| DB | 별도 Schema, Flyway | 기존 DB와 충돌 없음 | 기존 DB Read Adapter 여부 |

**배포 준비 상태**

| 항목 | 상태 |
|---|---|
| 로컬 실행 | 가능 (단, http·분석 연동은 문서 폴더 Script 의존) |
| Docker 패키징 | **불가** (Dockerfile 없음. MySQL만 compose) |
| 운영 Backend 설정 | 필요 (DB는 환경변수, Profile 미분리) |
| 파일 저장소 | 필요 (로컬 홈 디렉터리 Storage만 있음) |
| 서비스 간 인증 | 필요 (분석기는 개발 토큰) |
| 실제 사용자 인증 | 필요 (Spring Security 미사용) |
| 환경변수·비밀 분리 | 부분 (yml에 비밀 없음, 분석기 토큰은 로컬 파일) |
| 배포 파이프라인 | CI(`.github/workflows/ci.yml`: 하네스·Frontend·Backend 검증)만 있고 **CD 없음** |
| 운영 준비 완료 | **아님** |

---

## 11. 업무 분담 및 외부 의존성

| 범주 | 항목 |
|---|---|
| **최수연** | Assessment Frontend·Backend 전체, 평가계획서 원문 Storage·조회, Backend→분석기 Client, 검토·확정 UI, 학생 확정값 조회, Admin Overview, Git Commit 정리, 분석기 품질 개선(분석기 코드는 "계정 B" 소유로 기록됨 → 본인 계정 여부 확인) |
| **유완규** | 자동 수집기(학교알리미 등), 수집 결과 전달 형식, Student Care·상담(이번 변경 없음) |
| **Shared 승인·협의** | `api-contract.md` 개정(analysis-imports, 학교 목록, §9-1 catalogSubjects, 수집기 수신 API), AdminShell·App.tsx·build.gradle·application.yml 미커밋 변경(P-06/P-31), OD-A08 운영 권한, File Storage(API-OD-A03), ADR-0008·0009 팀 승인 |
| **기존 LearnersHigh 팀** | 인증·Session 방식(API-OD-A01), 학생·관리자·지점 ID, 학교 정보 원천(OD-A04), 기존 수행평가와의 관계(OD-A01), 앱 Navigation 진입점·WebView 가능 여부, 배포 환경 |

---

## 12. 미완성 작업 우선순위 (로드맵 확정 아님)

### P0 — 11/17 핵심 통합 MVP 필수

```text
작업명: P0-1 미커밋 Assessment 코드의 Git 보존
현재 상태: Backend assessment 132 파일·Admin assessment·Migration 6개·테스트 Untracked
문제 원인: Commit 이력 없음 → 유실·리뷰 불가
필요한 변경 범위: Suyeon 소유 파일만 범위별 Commit(Shared 변경은 분리)
예상 영향 파일: backend/**/assessment/**, frontend/admin/src/features/assessment/**, database/migrations/V2026110*·V2026111*
담당자: 최수연 (Shared 분리는 협의)
선행 의존성: 없음 (Shared 파일은 승인 대기)
우선순위: P0 / 작업 규모: S
완료 검증 방법: git status에서 Suyeon 소유 Untracked 0, verify.ps1 PASS
```

```text
작업명: P0-2 평가계획서 원문 파일 보관·열람
현재 상태: 메타데이터만 저장, file_ref=null
문제 원인: File Storage 미결(API-OD-A03)
필요한 변경 범위: 기존 ArtifactStorage 패턴 재사용, Revision file 조회 Endpoint, Admin/Student 원문 뷰어
예상 영향 파일: EvaluationPlanService, PlanRevision, Admin/Student plan Controller, api-contract §38·§10, Frontend 뷰어
담당자: 최수연 (+Shared 계약 승인)
선행 의존성: Storage 결정(개발용 로컬 Storage로 MVP 승인 여부)
우선순위: P0 / 작업 규모: M
완료 검증 방법: 업로드 → 재시작 후 다운로드 SHA 일치, 권한 밖 404 IT
```

```text
작업명: P0-3 Backend → 분석기 서버 간 호출 (브라우저 경유 제거)
현재 상태: 브라우저 Proxy + import Flag
문제 원인: 서버 측 Client 없음, import 계약 미등록
필요한 변경 범위: integration/analysis Client(Interface), POST .../analysis(계약 §39) 구현, 토큰 환경변수
예상 영향 파일: 신규 integration Client, EvaluationPlanService, application.yml(Shared), api-contract
담당자: 최수연
선행 의존성: P0-2, 계약 승인
우선순위: P0 / 작업 규모: M
완료 검증 방법: Vite Proxy 없이 등록 → 분석 → AnalysisRun 저장 IT(분석기 Stub) + 실제 8765 수동 1회
```

```text
작업명: P0-4 관리자 검토·확정 흐름 연결
현재 상태: savePlanReviewHttp notConnected, review 0건
문제 원인: 과목 ID 매핑 UI 없음(C-7), OD-A08
필요한 변경 범위: 분석 과목 ↔ 학업 과목 매핑 UI, PUT review 연결
예상 영향 파일: EvaluationPlanReviewRoute.tsx, assessmentAdminHttp.ts
담당자: 최수연
선행 의존성: OD-A08 MVP 범위 결정(최소 1명 운영자)
우선순위: P0 / 작업 규모: M
완료 검증 방법: PDF 1건 확정 → confirmed_value 생성, 재요청 시 409/멱등
```

```text
작업명: P0-5 학생에게 확정값·원문 제공
현재 상태: 학생 API는 메타데이터만 제공
필요한 변경 범위: 학생 plan 응답에 확정값(CONFIRMED만) 추가 + 원문 열람, Student UI
예상 영향 파일: EvaluationPlanQueryService, StudentEvaluationPlanResponse, Student evaluationPlansHttp·화면, api-contract §10-1
담당자: 최수연
선행 의존성: P0-2, P0-4
우선순위: P0 / 작업 규모: M
완료 검증 방법: 미확정 후보가 학생 응답에 0건임을 IT로 검증, 확정 후 학생 화면 표시 E2E
```

```text
작업명: P0-6 실제 학교 슬롯 운영 범위 (MVP용 운영자 권한)
현재 상태: 운영 가능 학교 = school_001 1곳
필요한 변경 범위: 시연 15개 학교 운영 권한 부여 방식 결정(설정 기반) → 코드 반영
예상 영향 파일: MockHeaderAssessmentActorProvider, demo-roster
담당자: 최수연 / 결정: Shared(OD-A08)
선행 의존성: OD-A08 임시 결정
우선순위: P0 / 작업 규모: S
완료 검증 방법: 운정고 2026-2-1 PDF 공식 등록 → 확정 → 학생 표시
```

### P1

| 작업 | 상태 | 담당 | 규모 |
|---|---|---|---|
| Admin Overview Backend 구현 + Mock 제거 | Mock 전용 | 최수연 | M |
| 평가계획서 슬롯 중복 방지(Unique 또는 Service 검사), 수행평가 중복 생성 방지 | 중복 2건 실재 | 최수연 | S |
| Admin 학교 목록 API, 학생 목록 수강 과목(B-6) | 개발 설정 의존 | 최수연 + 계약 | S |
| 기본 `vite.config.ts`에 `/api` Proxy 반영(Shared 승인) | 문서 폴더 Script 의존 | 최수연 + Shared | S |
| 학업정보 수정·과목 추가 API(또는 기존 LH 원천 결정) | 503 | 최수연 / 기존 LH | M |
| Assessment Playwright E2E를 `e2e/`로 정식 편입 | 문서 폴더 Script | 최수연 | M |
| 분석 상태 판정 수정(부분 결과 → PARTIAL) | A-3 | 분석기 소유자 | S |
| 수집기 수신 계약 초안 | 없음 | 최수연 + 유완규 | S |

### P2

채점기준표 연결(0/5), 과목명 규칙(삼각산), 진양 구간 추출, 표 열 결합·항목 경계, HWPX 다중 평가, LLM 보조 검증(v6~v21 llmprep 자산), Office Preview, Mock 코드의 운영 번들 제외, 레거시 Admin `feedback`·`student-management` 정리, 실험용 DB 41개 정리.

### BLOCKED

| 항목 | 차단 원인 |
|---|---|
| 실제 로그인·Session | API-OD-A01 (기존 LH 팀) |
| 기존 수행평가와의 매핑 | OD-A01 |
| 실제 학교 정보 원천 | OD-A04 |
| HWP·HWPX 운영 확정 | 실제 관리자 인증 필요 |
| 실제 학교 평가계획서 DB 반입 | 반입 승인(C-3) |
| 자동 수집 연동 | 수집기 구현 + 계약 |
| 운영 배포 | 인프라·Storage·인증 |

---

## 13. 위험 요소 및 결정 필요 사항

| 위험 | 내용 | 결정 필요 |
|---|---|---|
| 개발 인증 ↔ 실제 인증 | Header 위장이 가능하고, 운영 Build는 Header를 보내지 않아 401이 납니다 | API-OD-A01 |
| Mock ↔ 실제 DB | Admin Overview·심화·학업정보 수정은 Mock입니다. 학업 Context도 Mock Provider입니다 | 범위 확정 |
| 원본 파일 미보관 | 평가계획서 원문 재열람·재분석 불가 | API-OD-A03 |
| 공식 평가계획서 권한 | 운영 가능 학교 1곳(가상) | OD-A08 |
| 분석 결과 저장 | 수신 Endpoint가 계약에 없고 Flag 기본 off | Shared 계약 |
| 복잡한 문서 정확도 | 채점표 0/5, 과목명·구간 오류 | 관리자 검토 필수 유지 |
| 기존 LH 통합 난이도 | PHP 기반 기존 시스템, React SPA와 기술 스택이 다름 | 통합 방식 |
| 수집기 의존성 | 계약 없음 | 유완규 협의 |
| 미커밋 코드 | 유실·리뷰 불가 | 즉시 Commit 여부 |
| 데이터 정합성 | 평가계획서 슬롯 중복, 수행평가 366건(11-12 보고 361건 대비 +5, 원인 미확인) | — |
| 11/17 마감 | P0 6건 중 P0-2·3·5는 계약 승인이 선행 조건 → 승인 지연이 곧 일정 지연 | 승인 일정 |

---

## 14. 최종 판단

**Q1. Frontend와 실제 Backend 연결 정도**
학생 기록 계열(수행평가, 노트, 결과물, 피드백, 성장 기록, 보관함, 자료)과 관리자 학생 기록·피드백·참고자료실은 **http로 연결되어 있고 MySQL 왕복이 기록으로 확인됩니다** [과거·정적]. 미연결 항목은 Admin Overview, 학업정보 수정·과목 추가, 학생 평가계획서 업로드·분석·개인 검토, 관리자 서버 분석 실행·검토 확정(기본 화면), 심화·대학·모의고사입니다. 모든 연결은 **개발 Mock Header 인증**을 전제로 합니다.

**Q2. 미구현 핵심 Backend API**
`GET /admin/assessment/overview`, `POST .../revisions/{r}/analysis`(서버 분석), 평가계획서 원문 파일 조회, 학생 확정값 조회, `PUT /student/assessment/academic-context`, 학생 평가계획서 uploads·analysis·personal-review, 학교 목록, 수집기 수신 API, 실제 인증.

**Q3. 분석기 범위와 취약점**
PDF·HWP·HWPX 규칙 기반 추출(과목, 지필, 수행평가명, 비율, 시기, 만점, 근거 Locator)까지 구현되어 있고 LLM은 사용하지 않습니다. 가장 취약한 부분은 **채점기준표 연결(0/5)**과 **복잡한 표·과목 경계 해석**(과목명 "반", 구간 미추출, 열 결합)이며, 부분 결과의 상태 판정 오류도 있습니다.

**Q4. 분석 결과가 MySQL에 저장되고 Frontend에서 다시 조회되는가**
**관리자 기준으로는 조건부로 가능합니다.** import Flag가 켜진 개발 환경에서 브라우저를 거쳐 `plan_analysis_run`에 저장되고(현재 5건), Admin 검토 화면이 다시 조회합니다. 학생은 조회할 수 없습니다. 확정값은 0건입니다.

**Q5. 원문 보관·LearnersHigh 내 열람**
**구현되지 않았습니다.** `PlanRevision.fileRef = null`이 고정이고 원본 바이트를 버립니다.

**Q6. 기존 LearnersHigh 통합에서 가장 먼저 해결할 문제**
**인증·사용자 Context 전달 방식(API-OD-A01)과 학생·지점·학교 ID 매핑(OD-A04)**입니다. 이 문제가 해결되지 않으면 실제 사용자로 어떤 화면도 열 수 없습니다. 이어서 기존 수행평가와의 중복(OD-A01), 화면 통합 방식(PHP 기반 기존 앱에 SPA를 어떻게 넣을지)을 정해야 합니다.

**Q7. 수집기 완성 시 즉시 연동 가능한가**
**아닙니다.** 부족한 것은 다음과 같습니다. ① 서비스 간 수신 API와 인증 ② 원문 저장소 ③ 서버 측 분석 호출 ④ 실제 학교 ID 체계 ⑤ 중복 판별(슬롯 + SHA) 규칙 ⑥ 수집 상태·재시도 계약. ③까지는 최수연 담당이고, ①④⑤⑥은 유완규 님과의 계약 합의가 필요합니다.

**Q8. 11/17 MVP 필수 P0**
P0-1 Git 보존 → P0-2 원문 보관·열람 → P0-3 서버 간 분석 호출 → P0-4 검토·확정 연결 → P0-5 학생 확정값 표시 → P0-6 실제 학교 운영 권한(설정 기반). 실제 로그인은 외부 의존으로 BLOCKED 상태이므로 MVP에서는 "개발 인증 유지"를 명시적으로 승인받을지 결정해야 합니다.

**Q9. 11/17 이후로 미뤄도 되는 분석기 고도화**
채점기준표 연결, 과목명·구간 규칙 개선, 표 열 결합 수정, HWPX 다중 평가, `v21.2-quality` 승격, LLM 보조 검증·교차 확인, 대량 Golden 확대, OCR. 단, 부분 결과의 상태 판정(A-3)은 학생·관리자 신뢰도에 직결되므로 P1로 둡니다.

**Q10. 가장 심각한 기술 위험 5가지**
1. Assessment Backend·Admin 코드와 Migration 전체가 **미커밋**입니다.
2. **Mock Header 인증**: 실제 인증이 없어 위장할 수 있고, 운영 Build는 401이 됩니다.
3. 평가계획서 **원문 미보관과 브라우저 경유 분석 연동** 때문에 운영 경로가 없습니다.
4. **데이터 무결성 제약 부족**: 평가계획서 슬롯·수행평가 중복이 가능하고, 실제 중복 데이터가 있습니다.
5. 복잡한 문서에서 **분석 정확도가 낮고 부분 결과의 상태가 오판정**되어, 관리자 검토 부담이 크고 잘못 확정할 위험이 있습니다.

---

## 부록 A. 이번 점검에서 실제 실행한 것

| 명령·조회 | 결과 |
|---|---|
| `git status` / `git log` / `git ls-files` | 변경 187건, Assessment Backend·Admin 미추적 |
| `docker ps`, MySQL `SELECT`(읽기 전용) | `lh_demo_manual_20261111` 건수·상태(본문 표) |
| `curl GET 127.0.0.1:8765/health` | 200, v21.1, llmCalls=false |
| `curl` 18080·5173·5174 | 연결 없음 |
| `tsc -p tsconfig.app.json --noEmit --incremental false` (student, admin) | **exit 0** |
| `oxlint --deny-warnings` (student, admin) | **exit 0** |
| 기존 `dist` 문자열 검사 | 개발 문자열 0건, Mock 시나리오 문자열 일부 존재 |
| JUnit XML 집계(`backend/build/test-results`) | Unit 272/0 실패, Integration 144/0 실패 (11-12 12:24 KST 실행분). 이후 Java 변경 없음 |

## 부록 B. 실행하지 않은 것 (의도적으로 제외)

Backend·Vite 서버 기동, Gradle test/build, Vite build, Playwright E2E(Student Care 포함), 분석기 재분석(운정고 포함), 분석기 테스트 615건 재실행, 데이터 변경 API 호출, Contract Test.
