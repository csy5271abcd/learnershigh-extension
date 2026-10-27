import type { RouteObject } from 'react-router'
import { AcademicInfoRoute } from './AcademicInfoRoute.tsx'
import { ArchiveRoute } from './ArchiveRoute.tsx'
import { AssessmentHomeRoute } from './AssessmentHomeRoute.tsx'
import { AssessmentLayout } from './AssessmentLayout.tsx'
import { AssessmentTipsRoute } from './AssessmentTipsRoute.tsx'
import { EnrichmentLibraryRoute } from './EnrichmentLibraryRoute.tsx'
import { EnrichmentTaskDetailRoute } from './EnrichmentTaskDetailRoute.tsx'
import { FeedbackListRoute } from './FeedbackListRoute.tsx'
import { GrowthRecordDetailRoute, GrowthRecordNewRoute } from './GrowthRecordFormRoute.tsx'
import { GrowthRecordsRoute } from './GrowthRecordsRoute.tsx'
import { MockExamMaterialDetailRoute } from './MockExamMaterialDetailRoute.tsx'
import { MockExamMaterialsRoute } from './MockExamMaterialsRoute.tsx'
import { MyEnrichmentTasksRoute } from './MyEnrichmentTasksRoute.tsx'
import { PdfImportReviewRoute } from './PdfImportReviewRoute.tsx'
import { ResourceDetailRoute } from './ResourceDetailRoute.tsx'
import { ResourceLibraryRoute } from './ResourceLibraryRoute.tsx'
import { assessmentRoutePattern } from './paths.ts'
import { SchoolAssessmentDetailRoute } from './SchoolAssessmentDetailRoute.tsx'
import { SchoolAssessmentListRoute } from './SchoolAssessmentListRoute.tsx'
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
    { path: 'academic-info', element: <AcademicInfoRoute /> },
    { path: 'feedback', element: <FeedbackListRoute /> },
    { path: 'enrichment', element: <EnrichmentLibraryRoute /> },
    { path: 'enrichment/mock-exams', element: <MockExamMaterialsRoute /> },
    { path: 'enrichment/mock-exams/:materialId', element: <MockExamMaterialDetailRoute /> },
    { path: 'enrichment/my', element: <MyEnrichmentTasksRoute /> },
    { path: 'enrichment/universities', element: <UniversityResourcesRoute /> },
    { path: 'enrichment/tasks/:taskId', element: <EnrichmentTaskDetailRoute /> },
    { path: 'resources', element: <ResourceLibraryRoute /> },
    { path: 'resources/:resourceId', element: <ResourceDetailRoute /> },
    { path: 'growth', element: <GrowthRecordsRoute /> },
    { path: 'growth/new', element: <GrowthRecordNewRoute /> },
    { path: 'growth/:recordId', element: <GrowthRecordDetailRoute /> },
    { path: 'archive', element: <ArchiveRoute /> },
    { path: 'tips', element: <AssessmentTipsRoute /> },
  ],
}
