# 화면 ↔ API ↔ DB 연결 (2026-11-11)

Backend Assessment 테이블(Flyway 4개 중 Assessment 2개: `V202611090300`, `V202611090310`)

```text
assessment_school_assessment                       ← 학생 수행평가
assessment_evaluation_plan / assessment_plan_revision
assessment_plan_analysis_run                       ← 분석 후보(수신)
assessment_plan_review / assessment_plan_confirmed_value
(+ Student Care: care_* — Wangyu, 변경 없음)
```

노트·NoteRevision·Artifact·ArtifactVersion·FeedbackRequest·Snapshot·Reply·GrowthRecord·Resource·Favorite 테이블은 **없다**.

| 화면 | Frontend 함수 | HTTP | Backend | DB | 상태 |
|---|---|---|---|---|---|
| Student 학교·학업 정보 | `getAcademicContext` | GET `/api/student/assessment/academic-context` | StudentSchoolAssessmentController | (개발용 Mock Client) | 연결 |
| Student 수행평가 목록·상세 | `listSchoolAssessments`, `getSchoolAssessment` | GET `/api/student/assessment/school-assessments[/{id}]` | 같음 | `assessment_school_assessment` | 연결 |
| Student 수행평가 등록·수정·상태 | `create…`, `update…`, `change…Status` | POST / PATCH | 같음 | 같음 | 연결 |
| Student 공식 평가계획서 | `listEvaluationPlans`, `getEvaluationPlan` | GET `/api/student/assessment/evaluation-plans…` | StudentEvaluationPlanController | plan·revision·confirmed_value | 연결 (확정값만) |
| Student 분석 결과 페이지 | `requestAnalysisPreview` | POST `/dev-analysis/analyze-preview` (개발 Proxy → 127.0.0.1:8765) | 계정 B 분석기 | **없음 (탭 메모리)** | 개발 Flag 전용 |
| Student 노트·Revision·결과물·피드백·성장·자료함·즐겨찾기 | `assessmentDetailApi`, `growthArchiveApi`, `resourcesApi` | — | 없음 | 없음 | 503 연결 전 |
| Student 심화 탐구·참고자료 카탈로그 | `content/enrichmentContent.ts` | 없음 | 없음 | 없음 | 정적 |
| Admin 학교·학년도·계획서 목록 | `listSchools`, `listPlanYears`, `listEvaluationPlans` | GET `/api/admin/assessment/evaluation-plans…` | AdminEvaluationPlanController | plan·revision | 연결 |
| Admin 등록·개정본 | `uploadEvaluationPlan`, `addPlanRevision` | POST multipart | 같음 | plan·revision (원본 바이트는 보관 안 함, 메타·SHA-256·쪽 수) | 연결 |
| Admin 자동 분석 | `requestAnalysisPreview` → `importPlanAnalysis` | POST `/dev-analysis/analyze-preview` → POST `…/revisions/{id}/analysis-imports` | 분석기 → AdminPlanAnalysisImportController (`assessment.analysis-import.enabled=true`) | `assessment_plan_analysis_run` | 개발 Flag 전용, 수신 Endpoint는 PROPOSED(C-10) |
| Admin 검토 전체 페이지 | `getPlanAnalysis` | GET `…/revisions/{id}/analysis` | AdminEvaluationPlanController | analysis_run·review·confirmed_value | 연결 |
| Admin 검토 저장·확정 | `savePlanReview`, `confirmPlanReview` | PUT `…/review` | 같음 | review·confirmed_value | 연결 (PDF만, HWP·HWPX `review_not_supported`) |
| Admin 학생별 수행평가 | `listStudentSchoolAssessments` | GET `/api/admin/assessment/students/{id}/school-assessments` | AdminStudentAssessmentController | `assessment_school_assessment` | API 연결(지점 범위 검사). 학생 목록 화면은 연결 전 |
| Admin 학생 목록·학생 기록·피드백·참고자료·현황·학생 화면 보기 | `assessmentAdminMock.*` | — | 없음 | 없음 | 503 연결 전 |

인증: 모두 개발용 Mock Header(`X-Assessment-Student-Id`, `X-Assessment-Admin-Id`). Production Build에는 붙지 않는다. 실제 인증 미연결(API-OD-A01).
