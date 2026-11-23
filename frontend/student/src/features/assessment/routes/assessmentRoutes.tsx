import { ArtifactViewerRoute } from './ArtifactViewerRoute.tsx'
import { EvaluationPlanOriginalRoute } from './EvaluationPlanOriginalRoute.tsx'
import { EvaluationPlansRoute } from './EvaluationPlansRoute.tsx'
import { MonthlyPlanRoute } from './MonthlyPlanRoute.tsx'
import { Navigate, type RouteObject } from 'react-router'
import { AcademicInfoRoute } from './AcademicInfoRoute.tsx'
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
import { ReferenceLinksRoute } from './ReferenceLinksRoute.tsx'
import { ResourceDetailRoute } from './ResourceDetailRoute.tsx'
import { ResourceLibraryRoute } from './ResourceLibraryRoute.tsx'
import { assessmentRoutePattern, enrichmentPath, schoolAssessmentsPath } from './paths.ts'
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
    // A27-UX 학생(2026-11-19): 학생 평가계획서 PDF 가져오기·AI 분석 화면은 없앴다(공식 원문 열람·확정 공개값 열람만).
    // 예전 주소는 수행평가 목록으로 보낸다. 관리자 분석 기능·공용 결과 컴포넌트(components/pdf-import)는 그대로다.
    { path: 'school-assessments/pdf-import/:documentRevisionId', element: <Navigate to={schoolAssessmentsPath} replace /> },
    { path: 'school-assessments/analysis-preview/:previewId', element: <Navigate to={schoolAssessmentsPath} replace /> },
    { path: 'artifacts/:artifactId/viewer', element: <ArtifactViewerRoute /> },
    { path: 'evaluation-plans', element: <EvaluationPlansRoute /> },
    { path: 'monthly-plan', element: <MonthlyPlanRoute /> },
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
