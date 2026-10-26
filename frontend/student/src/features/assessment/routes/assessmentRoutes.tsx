import type { RouteObject } from 'react-router'
import { AcademicInfoRoute } from './AcademicInfoRoute.tsx'
import { AssessmentLayout } from './AssessmentLayout.tsx'
import { AssessmentPendingRoute } from './AssessmentPendingRoute.tsx'
import { FeedbackListRoute } from './FeedbackListRoute.tsx'
import { assessmentRoutePattern, pendingAssessmentSections } from './paths.ts'
import { SchoolAssessmentDetailRoute } from './SchoolAssessmentDetailRoute.tsx'
import { SchoolAssessmentListRoute } from './SchoolAssessmentListRoute.tsx'

// Assessment Route Tree. 공용 Student Router에는 이 객체 하나만 추가한다 (Shell 변경 최소화).
export const assessmentRoute: RouteObject = {
  path: assessmentRoutePattern,
  element: <AssessmentLayout />,
  children: [
    { index: true, element: <AssessmentPendingRoute title="Assessment 홈" /> },
    { path: 'school-assessments', element: <SchoolAssessmentListRoute /> },
    { path: 'school-assessments/:assessmentId', element: <SchoolAssessmentDetailRoute /> },
    { path: 'academic-info', element: <AcademicInfoRoute /> },
    { path: 'feedback', element: <FeedbackListRoute /> },
    ...Object.values(pendingAssessmentSections).map((section) => ({
      path: section.path.replace('/assessment/', ''),
      element: <AssessmentPendingRoute title={section.label} />,
    })),
  ],
}
