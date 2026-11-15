import { lazy, Suspense } from 'react'
import type { AdminLocation } from '../../../app/adminLocation.ts'
import { isAdminMockDataSource } from '../api/mock/adminMockRuntime.ts'
import { navigate } from '../../../app/adminLocation.ts'
import { listFeedbackRequests } from '../api/assessmentAdminApi.ts'
import { MockNotice } from '../components/AdminParts.tsx'
import { EmptyState } from '../components/canonicalUi.ts'
import { useRemote } from '../model/useRemote.ts'
import styles from '../styles/assessmentAdmin.module.css'
import { EvaluationPlanAiRoute } from '../ai/EvaluationPlanAiRoute.tsx'
import { ContentRoute } from './ContentRoute.tsx'
import { EvaluationPlanReviewRoute } from './EvaluationPlanReviewRoute.tsx'
import { PlanReviewWorkspaceRoute } from '../review/ReviewWorkspace.tsx'
import { PlanComparisonRoute } from './PlanComparisonRoute.tsx'
import { EvaluationPlansRoute } from './EvaluationPlansRoute.tsx'
import { FeedbackDetailRoute } from './FeedbackDetailRoute.tsx'
import { FeedbackListRoute } from './FeedbackListRoute.tsx'
import { OverviewRoute } from './OverviewRoute.tsx'
import { matchAssessmentRoute, paths, tabPath, type AssessmentTab } from './paths.ts'
import { ReferenceLibraryRoute } from './ReferenceLibraryRoute.tsx'
import { StudentRecordRoute } from './StudentRecordRoute.tsx'
import { StudentsRoute } from './StudentsRoute.tsx'
import { StudentViewRoute } from './StudentViewRoute.tsx'

// 개발 서버(http 모드) 전용 시연 관리자 전환 패널 (Student dev 모듈 공용). Production 번들에서는 빠진다.
const DevContextSwitcher = import.meta.env.DEV
  ? lazy(() => import('../../../../../student/src/features/assessment/dev/DevContextSwitcher.tsx'))
  : null

// 개발 전용 Monthly Planner 샘플 Preview (/assessment/dev/monthly-planner). Production 번들에서는 Route와 샘플 데이터가 함께 빠진다.
const MonthlyPlannerPreview = import.meta.env.DEV ? lazy(() => import('../dev/MonthlyPlannerPreview.tsx')) : null
const plannerPreviewPath = '/assessment/dev/monthly-planner'

const tabs: { id: AssessmentTab; label: string }[] = [
  { id: 'overview', label: '전체 현황' },
  { id: 'students', label: '학생 Assessment' },
  { id: 'feedback', label: '피드백 관리' },
  { id: 'plans', label: '학교별 평가계획서' },
  { id: 'content', label: '심화 탐구 콘텐츠' },
  { id: 'references', label: '관리자 참고자료실' },
]

/** PDF Viewer·2열 비교·학생 화면 보기처럼 넓은 작업 공간이 필요한 화면 (요청 ①: 그 밖의 화면은 기본 최대 너비) */
const wideViews = new Set<string>(['students', 'student', 'feedback-detail', 'plan-review', 'plan-compare', 'plan-ai', 'university-detail', 'university-ai'])
/** 학생 Desktop 화면 미리보기가 들어가는 화면: 최대 폭 제한 없이 가용 폭 전체를 쓰고, 미리보기가 그 폭에 맞춰 Student 화면을 축소한다 */
// plan-review: 원문과 검토를 나란히 두는 작업 공간이라 가용 폭 전체를 쓴다 (2026-11-14 UI 재설계)
const previewViews = new Set<string>(['student-view', 'record', 'plan-review'])

// Admin "학습관리 › Assessment 관리" (AD-01). 기존 Admin Shell 안에서 이 Feature가 자기 화면만 그린다.
// 상단 탭은 목록 화면에서만 보이고, 상세 화면(학생 기록·피드백 작성·Task 편집·PDF)은 뒤로가기 Header를 쓴다 (AM-03·06·10).
export function AssessmentAdminRoute({ location }: { location: AdminLocation }) {
  const route = matchAssessmentRoute(location.pathname)
  const search = new URLSearchParams(location.search)
  // 피드백 대기 건수는 실제 요청 상태에서 계산한다 (화면용 Counter 금지). 화면을 옮길 때마다 다시 읽는다.
  const pending = useRemote(() => listFeedbackRequests({ status: 'PENDING' }), [location.pathname])
  const pendingCount = pending.state.status === 'success' ? pending.state.data.items.length : null

  const listView = ['overview', 'students', 'student', 'feedback', 'plans', 'tasks', 'mock-exams', 'universities', 'sources', 'references', 'not-found'].includes(route.view)

  let page
  if (MonthlyPlannerPreview && location.pathname === plannerPreviewPath) {
    return (
      <div className={`lh-assessment ${styles.root}`} data-view="planner-preview">
        <div className={styles.frame} data-width="full">
          <Suspense fallback={null}>
            <MonthlyPlannerPreview />
          </Suspense>
        </div>
      </div>
    )
  }
  switch (route.view) {
    case 'overview':
      page = <OverviewRoute search={search} />
      break
    case 'students':
      page = <StudentsRoute studentId={null} search={search} />
      break
    case 'student':
      page = <StudentsRoute studentId={route.studentId} search={search} />
      break
    case 'record':
      page = <StudentRecordRoute key={`${route.studentId}:${route.sourceId}`} studentId={route.studentId} kind={route.kind} sourceId={route.sourceId} />
      break
    case 'student-view':
      page = <StudentViewRoute key={route.studentId} studentId={route.studentId} search={search} />
      break
    case 'plan-ai':
      page = <EvaluationPlanAiRoute />
      break
    case 'feedback':
      page = <FeedbackListRoute search={search} />
      break
    case 'feedback-detail':
      page = <FeedbackDetailRoute key={route.requestId} requestId={route.requestId} />
      break
    case 'plans':
      page = <EvaluationPlansRoute search={search} />
      break
    case 'plan-compare':
      page = <PlanComparisonRoute search={search} />
      break
    case 'plan-review':
      // http: 단계별 검토 Workspace(2026-11-14 재설계). Mock 데이터 모드는 이전 화면(시연 Fixture 저장)을 그대로 쓴다
      page = isAdminMockDataSource ? (
        <EvaluationPlanReviewRoute key={route.revisionId} planId={route.planId} revisionId={route.revisionId} />
      ) : (
        <PlanReviewWorkspaceRoute key={route.revisionId} planId={route.planId} revisionId={route.revisionId} />
      )
      break
    case 'tasks':
    case 'task-edit':
    case 'mock-exams':
    case 'mock-exam-detail':
    case 'mock-exam-edit':
    case 'universities':
    case 'university-detail':
    case 'university-ai':
    case 'sources':
      // 심화 탐구는 읽기 전용 정적 콘텐츠(2026-11-12). 이전 대학 AI 분석 주소도 ContentRoute의 안내 화면으로 보낸다(명세 §4·§10, AI 코드는 삭제하지 않음)
      page = <ContentRoute route={route} search={search} />
      break
    case 'references':
      page = <ReferenceLibraryRoute search={search} />
      break
    default:
      page = (
        <div className={styles.body}>
          <EmptyState
            title="Assessment 관리에 없는 주소예요"
            description="주소를 다시 확인해 주세요."
            action={
              <button type="button" className={styles.secondaryButton} onClick={() => navigate(paths.overview)}>
                전체 현황으로 가기
              </button>
            }
          />
        </div>
      )
  }

  return (
    <div className={`lh-assessment ${styles.root}`} data-view={route.view}>
      <div className={styles.frame} data-width={previewViews.has(route.view) ? 'full' : wideViews.has(route.view) ? 'wide' : 'default'}>
        {listView && (
          <nav className={styles.tabs} aria-label="Assessment 관리 메뉴">
            {tabs.map((tab) => (
              <button key={tab.id} type="button" className={styles.tab} aria-current={route.tab === tab.id ? 'page' : undefined} onClick={() => navigate(tabPath(tab.id))}>
                {tab.label}
                {tab.id === 'feedback' && pendingCount !== null && pendingCount > 0 && (
                  <span className={styles.tabCount} aria-label={`답변 대기 ${pendingCount}건`}>
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
            <span className={styles.tabsEnd}>
              <MockNotice />
            </span>
          </nav>
        )}
        {page}
      </div>
      {DevContextSwitcher && !isAdminMockDataSource && (
        <Suspense fallback={null}>
          <DevContextSwitcher kind="admin" landingPath="/assessment/students" />
        </Suspense>
      )}
    </div>
  )
}
