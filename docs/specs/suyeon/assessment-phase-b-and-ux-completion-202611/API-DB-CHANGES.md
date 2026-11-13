# API·DB·Entity 변경

계약 반영: `docs/api/api-contract.md` §62-2를 새로 썼다(기존 절은 고치지 않음).

## Migration (기존 Migration 수정 없음)

| 파일 | 내용 |
|---|---|
| `V202611111600__assessment_plan_confirmed_value_evidence_locator.sql` | D-1 (승인 초안 그대로) |
| `V202611111610__assessment_plan_review_integrity.sql` | UNIQUE (review·과목·fieldPath), `manual_comparison_confirmed`, `reviewer_auth` |
| `V202611111620__assessment_soft_delete.sql` | 수행평가·결과물·자료·성장 기록 `deleted_at`·`deleted_by` (쌍 CHECK) |

## Endpoint

| 구분 | Endpoint |
|---|---|
| 검토 | `PUT .../evaluation-plans/{planId}/revisions/{revisionId}/review` HWP·HWPX 확장(sourceCheck·analysisSubjectIndex·documentLocator·absence). 응답 `sourceReview`(관리자, HWP·HWPX만) |
| 학생 화면 보기 | `GET /api/admin/assessment/students/{studentId}/student-view/{academic-context, school-assessments[/id], evaluation-plans[/id], notes, notes/{id}/revisions[/id], artifacts, artifacts/{id}/versions[/{v}/file\|/preview], artifacts/{id}/compare, feedback-requests[/id[/reply]], growth-records[/id], resources[/id], shared-resources, archive}` |
| 미리보기 | `GET /api/{student,admin}/assessment/artifacts/{id}/versions/{v}/preview` |
| 비교 | `GET /api/{student,admin}/assessment/artifacts/{id}/compare` |
| 휴지통(학생) | `DELETE /school-assessments/{id}`, `/artifacts/{id}`, `/resources/{id}`, `/growth-records/{id}`, `POST /archive/restore`, `GET /archive?tab=trash` |
| 휴지통(관리자) | `DELETE /reference-library/{id}`, `GET /reference-library/trash`, `POST /reference-library/{id}/restore` |

새 오류 코드: `PREVIEW_UNAVAILABLE`(415), `FILE_INTEGRITY_FAILED`(409). 새 사유: `verified_auth_required`, `parent_in_trash`.

## 설정

`assessment.plan-review.structured-confirm-dev` (`ASSESSMENT_PLAN_REVIEW_STRUCTURED_CONFIRM_DEV`, 기본 false)

## Backend 코드

- Entity: `PlanReview`(원문 확인·검토자 인증), `PlanConfirmedValue`(근거 형식·Locator·과목 번호), `SchoolAssessment`·`Artifact`·`AssessmentResource`·`GrowthRecord`(휴지통)
- Service: `EvaluationPlanService.review`(형식별 분기), `ReviewFieldRules`(신규), `ReviewEvidenceScope`(연결), `PlanViews`, `ArtifactQueryService`(미리보기·비교), `TrashService`(신규), `AdminStudentViewAccess`(신규), `ArchiveService`, `ResourceService`
- Repository: 활성 조회는 `DeletedAtIsNull`, 휴지통 조회 추가. 관리자 Snapshot 감사 조회(`findById`)는 그대로
- Controller: `AdminStudentViewController`(신규), `StudentRecordController`·`AdminRecordController` 추가, `FileResponses.inline`
- Test: `StructuredPlanReviewApiTest`(3), `AssessmentUxCompletionApiTest`(4), `EvaluationPlanApiTest` PDF 중복·색인 1개 추가, `MultiformatExperimentalApiTest` 사유 기대값 `review_not_supported` → `verified_auth_required`(승인 반영, 확정 차단 자체는 유지)

## Frontend 코드

- Student
  - `ArtifactViewerRoute`(신규)·Route·paths
  - `ArtifactSection`(미리보기·비교·휴지통)
  - `SchoolAssessmentDetailRoute`·`ResourceDetailRoute`·`GrowthRecordFormRoute`(휴지통)
  - `ArchiveRoute`(복구)
  - `ResourceLibraryRoute`(추천)
  - `content/enrichmentContent.ts`(추천 정적 원천)
  - `api/*`·`http/recordsHttp.ts`·`assessmentHttpClient.ts`(관리자 읽기 전용 경로)
- Admin
  - `PlanReviewConfirmPanel`·`MultiformatReviewReadiness`(HWP·HWPX 확정)
  - `ArtifactVersionsView`(미리보기·다운로드·http 비교)
  - `ReferenceLibraryRoute`(휴지통)
  - `preview/*`·`StudentViewRoute`·`StudentRecordRoute`(학생 화면 보기 http)
  - `api/*`(adminHttpClient DELETE·204·파일)

Student Care·Admin Shell·Sidebar·Router·Shared `vite.config.ts`는 바꾸지 않았다.
