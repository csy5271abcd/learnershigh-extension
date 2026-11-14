import { ArtifactViewerRoute } from './ArtifactViewerRoute.tsx'
import { EvaluationPlanOriginalRoute } from './EvaluationPlanOriginalRoute.tsx'
import { EvaluationPlansRoute } from './EvaluationPlansRoute.tsx'
import { Navigate, type RouteObject } from 'react-router'
import { AcademicInfoRoute } from './AcademicInfoRoute.tsx'
import { AnalysisPreviewResultRoute } from './AnalysisPreviewResultRoute.tsx'
import { ArchiveRoute } from './ArchiveRoute.tsx'
import { AssessmentHomeRoute } from './AssessmentHomeRoute.tsx'
import { AssessmentLayout } from './AssessmentLayout.tsx'
import { AssessmentTipsRoute } from './AssessmentTipsRoute.tsx'
import { EnrichmentLibraryRoute } from './EnrichmentLibraryRoute.tsx'
import { FeedbackListRoute } from './FeedbackListRoute.tsx'
import { GrowthRecordDetailRoute, GrowthRecordNewRoute } from './GrowthRecordFormRoute.tsx'
import { GrowthRecordsRoute } from './GrowthRecordsRoute.tsx'
import { MockExamMaterialDetailRoute } from './MockExamMaterialDetailRoute.tsx'
import { MockExamMaterialsRoute } from './MockExamMaterialsRoute.tsx'
import { PdfImportReviewRoute } from './PdfImportReviewRoute.tsx'
import { ReferenceLinksRoute } from './ReferenceLinksRoute.tsx'
import { ResourceDetailRoute } from './ResourceDetailRoute.tsx'
import { ResourceLibraryRoute } from './ResourceLibraryRoute.tsx'
import { assessmentRoutePattern, enrichmentPath } from './paths.ts'
import { SchoolAssessmentDetailRoute } from './SchoolAssessmentDetailRoute.tsx'
import { SchoolAssessmentListRoute } from './SchoolAssessmentListRoute.tsx'
import { UniversityExamDocumentRoute } from './UniversityExamDocumentRoute.tsx'
import { UniversityResourcesRoute } from './UniversityResourcesRoute.tsx'

// Assessment Route Tree. 공용 Student Router에는 이 객체 하나만 추가한다 (Shell 변경 최소화).
export const assessmentRoute: RouteObject = {
  path: assessmentRoutePattern,
  element: <AssessmentLayout />,
  children: [
    { index: true, element: <AssessmentHomeRoute /> },
    { path: 'school-assessments', element: <SchoolAssessmentListRoute /> },
    { path: 'school-assessments/:assessmentId', element: <SchoolAssessmentDetailRoute /> },
    { path: 'school-assessments/pdf-import/:documentRevisionId', element: <PdfImportReviewRoute /> },
    // 개발 Flag 전용 분석 미리보기 결과 페이지. 빌드 시점 상수라 운영 Build에서는 Route·화면 코드가 빠진다.
    ...(import.meta.env.DEV && import.meta.env.VITE_ASSESSMENT_DEV_ANALYSIS_PREVIEW === 'true'
      ? [{ path: 'school-assessments/analysis-preview/:previewId', element: <AnalysisPreviewResultRoute /> }]
      : []),
    { path: 'artifacts/:artifactId/viewer', element: <ArtifactViewerRoute /> },
    { path: 'evaluation-plans', element: <EvaluationPlansRoute /> },
    { path: 'evaluation-plans/:planId/original', element: <EvaluationPlanOriginalRoute /> },
    { path: 'academic-info', element: <AcademicInfoRoute /> },
    { path: 'feedback', element: <FeedbackListRoute /> },
    { path: 'enrichment', element: <EnrichmentLibraryRoute /> },
    { path: 'enrichment/mock-exams', element: <MockExamMaterialsRoute /> },
    { path: 'enrichment/mock-exams/:materialId', element: <MockExamMaterialDetailRoute /> },
    // 2026-11-11 범위 축소: 개인 심화 Task 화면은 폐기. 예전 주소는 참고자료 목록으로 보낸다(Task 데이터는 지우지 않음).
    { path: 'enrichment/my', element: <Navigate to={enrichmentPath} replace /> },
    { path: 'enrichment/universities', element: <UniversityResourcesRoute /> },
    { path: 'enrichment/universities/:documentId', element: <UniversityExamDocumentRoute /> },
    { path: 'enrichment/tasks/:taskId', element: <Navigate to={enrichmentPath} replace /> },
    { path: 'resources', element: <ResourceLibraryRoute /> },
    { path: 'resources/:resourceId', element: <ResourceDetailRoute /> },
    { path: 'reference-links', element: <ReferenceLinksRoute /> },
    { path: 'growth', element: <GrowthRecordsRoute /> },
    { path: 'growth/new', element: <GrowthRecordNewRoute /> },
    { path: 'growth/:recordId', element: <GrowthRecordDetailRoute /> },
    { path: 'archive', element: <ArchiveRoute /> },
    { path: 'tips', element: <AssessmentTipsRoute /> },
  ],
}
