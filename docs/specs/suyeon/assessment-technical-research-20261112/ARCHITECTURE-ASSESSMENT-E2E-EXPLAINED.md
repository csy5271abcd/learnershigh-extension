# LearnersHigh Assessment 전체 아키텍처 — 설명

> 다이어그램: `ARCHITECTURE-ASSESSMENT-E2E.mmd`. SVG·PNG는 렌더러가 없어 만들지 않았다.
> 근거: `frontend/*/package.json`, `backend/build.gradle.kts`, `backend/src/main/resources/application.yml`, `backend/.../assessment/**`(Java 129개), `database/migrations/*.sql`(8개), Vite 개발 Proxy 스크립트(`docs/specs/suyeon/assessment-ui-analysis-connection-202611/scripts/vite.student-analysis-preview.config.ts`, `assessment-full-integration-202611/scripts/vite.admin-analyzer.config.ts`), 최신 보고서(`assessment-phase-b-and-ux-completion-202611/`, 2026-11-12 05:37).
> 상태: **[실행 확인]** 보고서에 실제 E2E 기록 있음 / **[코드 확인]** / **[개발 전용]** / **[비활성]**

## 1. 구성요소와 실제 기술

| 구성요소 | 실제 기술·버전 | 경로 | 상태 |
|---|---|---|---|
| Student | React 19.3.0, react-dom 19.3.0, react-router 7.18.4, pdfjs-dist 5.4.296, TypeScript 6.0.3, Vite 8.3.4, oxlint 1.87.0 | `frontend/student` (:5173) | 코드 확인 |
| Admin | React 19.3.0, TypeScript 6.0.3, Vite 8.3.4 (라우터 라이브러리 없음) | `frontend/admin` (:5174) | 코드 확인 |
| Node | `^22.12.0` (engines) | `frontend/package.json` | 코드 확인 |
| Frontend 데이터 원천 | `VITE_ASSESSMENT_DATA_SOURCE = mock | http` (개발 기본 mock, Production Build 기본 http) | `api/dataSource.ts`, `adminMockRuntime.ts` | 코드 확인 |
| Backend | Java 21 toolchain, Spring Boot 4.1.1, spring-boot-starter-webmvc·validation·data-jpa·flyway, mysql-connector-j, flyway-mysql | `backend/build.gradle.kts` (:18080 개발) | 코드 확인 |
| Backend 계층 | Controller → Service → Repository(Spring Data JPA) → Entity. ADR-0005 의존 규칙은 ArchUnit 1.5.1 테스트로 검사 | `backend/.../assessment/{controller,service,repository,entity,dto}` | 코드 확인 |
| 검증 | Bean Validation(DTO 어노테이션) + `AnalysisImportValidator`·`ReviewFieldRules` + Jackson 엄격 설정(정수에 소수·문자열 숫자·숫자 Enum 거절) | `application.yml` | 코드 확인 |
| Security | **Spring Security 없음.** `MockHeaderAssessmentActorProvider`가 헤더로 학생·관리자를 정함 | `integration/auth/*` | 개발 전용 |
| 학업 Context | `MockAcademicContextProvider` (`learnershigh.integration.mode=mock`) | `integration/context/*` | 개발 전용 |
| DB | MySQL(Docker `learnershigh-mysql`), Flyway, `ddl-auto: none`, 테스트는 Testcontainers MySQL | `database/migrations` | 실행 확인 |
| File Storage | `LocalFileArtifactStorage` — 사용자 홈 아래 격리 폴더, UUID 키, SHA-256, 형식 서명 검사, 경로 이동 차단, DB 롤백 시 파일 삭제, 파일당 50MB | `integration/storage/*`, `assessment.storage.*` | 개발 전용 |
| 평가계획서 원본 | **저장하지 않음** — Revision에 파일 이름·크기·쪽 수·SHA만(`file_ref` 열은 있으나 원본 보관 결정 전) | `assessment_plan_revision` | 코드 확인 |
| AI 분석기 | Python 3.12 로컬 HTTP 서비스, 규칙 기반 v21.1 | `CA/tools/service` (:8765) | 실행 확인 |
| Backend AI(Claude) | anthropic-java 3.2.0, 모델 기본 `claude-opus-5-5` | `integration/ai/*` | **비활성(provider=none, 미호출)** |

## 2. DB 테이블 (Assessment)

| Migration | 테이블 |
|---|---|
| `V202611090300` | `assessment_school_assessment` |
| `V202611090310` | `assessment_evaluation_plan`, `assessment_plan_revision`, `assessment_plan_analysis_run`(status REVIEW_REQUIRED/FAILED, origin, analyzer_name·version, `result_json`, `warnings_json`), `assessment_plan_review`(decision), `assessment_plan_confirmed_value`(`field_path`, `value_json`, `pdf_page_number`) |
| `V202611110506` | `assessment_note`, `assessment_note_revision`, `assessment_artifact`, `assessment_artifact_version`, `assessment_feedback_request`, `assessment_feedback_snapshot`, `assessment_feedback_reply`, `assessment_growth_record`, `assessment_resource`, `assessment_favorite` |
| `V202611111600` | 확정값 근거 열 `evidence_format`·`evidence_locator_json`·`analysis_subject_index` 추가, PDF 기존 값 `evidence_format=PDF` Backfill |
| `V202611111610` | 검토 무결성: 확정값 UNIQUE(review·subject·field_path), `manual_comparison_confirmed`, `reviewer_auth`(`MOCK_HEADER`|`VERIFIED`, 기존 행은 `MOCK_HEADER`) |
| `V202611111620` | soft delete 열 |

지시서의 이름과 실제 이름: `EvaluationPlan`·`PlanRevision`(DocumentRevision)·`PlanAnalysisRun`(AnalysisRun)·`PlanReview`+`assessment_plan_confirmed_value`(ConfirmedValue)·`SchoolAssessment`·`AssessmentNote`·`ArtifactVersion`·`FeedbackSnapshotItem`(FeedbackSnapshot)·`GrowthRecord`·`AssessmentResource`(Resource). 이름 차이만 있고 모두 있다.

## 3. 주요 흐름

| # | 흐름 | 실제 경로 | 상태 |
|---|---|---|---|
| 1 | Student 개인 평가계획서 분석 미리보기 | Student 화면 → `/dev-analysis/analyze-preview`(Vite Proxy가 토큰 주입) → 분석기 8765 → 응답을 **탭 메모리에만** 보관 → 결과 전체 페이지. Backend·DB 쓰기 없음 | 실행 확인(30/30, `VITE_ASSESSMENT_DEV_ANALYSIS_PREVIEW` 켤 때만). **개발 전용** — 운영 번들에 `dev-analysis`·토큰 문자열 0건 |
| 2 | Admin 평가계획서 등록·분석 | Admin → `POST /api/admin/assessment/evaluation-plans`(multipart, 원본 SHA·크기만 저장) → **브라우저가** 같은 파일을 `/dev-analysis`로 분석기에 보냄 → 응답의 `backendImport.payload`를 `POST …/revisions/{rid}/analysis-imports`로 Backend에 전달 → `assessment_plan_analysis_run` 저장(같은 Payload는 `created=false`) → 검토 페이지 | 실행 확인(PDF 13/13, HWP·HWPX 15/15×2, 격리 환경). Backend가 분석기를 직접 부르지 않는다 |
| 3 | 관리자 검토·확정 | `GET …/analysis` → 원문 대조 → `PUT …/review`(fieldPath별 값·근거) → `assessment_plan_review` + `confirmed_value`, Revision `CONFIRMED` | PDF 실행 확인. HWP·HWPX는 `structured-confirm-dev=true` + Mock 인증에서만(HWPX 브라우저 44/44, HWP 통합 테스트) |
| 4 | 학생 공식 평가정보 조회 | `GET /api/student/assessment/evaluation-plans` — 계획서 메타데이터·`reviewStatus`만. 확정 값 자체는 응답에 없음 | 실행 확인 |
| 5 | 수행평가 관리 | `/api/student/assessment/school-assessments`(등록·조회·수정·상태·삭제). `evaluationItemRef`는 확정 검토에 쓰인 Run의 수행 itemKey만 허용 | 실행 확인 |
| 6 | 노트·결과물 저장 | 노트(Revision 이력), 결과물(Version, 로컬 Storage, 미리보기 PDF·이미지, 메타데이터 비교) | 실행 확인(19/19, 44/44) |
| 7 | 피드백 요청·전달 | 학생 요청(요청 당시 Snapshot) → 관리자 대기열·초안·전달 → 학생 확인 | 실행 확인 |
| 8 | 정적 심화 탐구 열람 | Frontend 정적 콘텐츠(라이브러리·모의고사 60·대학 기출 27·PDF) — 서버 없음 | 실행 확인(36/36) |
| – | 관리자 학생 화면 보기 | Admin iframe의 Student 화면이 GET만 `/api/admin/assessment/students/{id}/student-view/**`로 보냄(학생 Header로 가장하지 않음) | 실행 확인 |
| – | Backend Claude 분석 | `/api/admin/assessment/ai/*` | 비활성 |

## 4. 개발 구성과 운영 목표의 차이

| 항목 | 현재(개발·시연) | 운영 목표(문서상) |
|---|---|---|
| Frontend ↔ 분석기 | Vite Proxy(Node)가 토큰을 붙임. 운영 번들에는 없음 | 미정. Backend 경유 안전한 문서 처리(`ARCHITECTURE-FUTURE.md`) |
| 인증 | Mock Header(학생·관리자 ID) | 기존 LearnersHigh 인증 연동(API-OD-A01, 미결) |
| 학업 Context | Mock Provider | 기존 LearnersHigh Client(API-OD-07, 미결) |
| Storage | 로컬 격리 폴더 | 운영 Provider·백업·악성코드 검사(미결) |
| 분석기 | 개발자 PC의 127.0.0.1 서비스, 공유 토큰 | 미정 |
| HWP·HWPX 확정 | 개발 Flag + `reviewer_auth=MOCK_HEADER` | 실제 인증(`reviewer_auth=VERIFIED`) 뒤에만 |
| Backend Flag | `ASSESSMENT_ANALYSIS_IMPORT_ENABLED`(기본 false → 404), `ASSESSMENT_MULTIFORMAT_EXPERIMENTAL`(기본 false), `ASSESSMENT_PLAN_REVIEW_STRUCTURED_CONFIRM_DEV`(기본 false), `ASSESSMENT_AI_PROVIDER`(기본 none) | 활성화는 별도 결정 |
