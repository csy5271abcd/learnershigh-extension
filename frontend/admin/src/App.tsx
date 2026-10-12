import { AdminShell } from './app/AdminShell.tsx'
import { navigate, useAdminLocation } from './app/adminLocation.ts'
import { feedbackDashboardPath, matchFeedbackReviewPath } from './features/feedback/routes/paths.ts'
import { FeedbackDashboardRoute } from './features/feedback/routes/FeedbackDashboardRoute.tsx'
import { FeedbackReviewRoute } from './features/feedback/routes/FeedbackReviewRoute.tsx'

// Admin Extension App Shell. 지금 연결된 화면은 Feedback Dashboard(/ · /feedback)와 Review 진입 Boundary(/feedback/:feedbackId)뿐이다.
// 다른 Feature는 src/features/<feature>/에 추가한다.
function App() {
  const location = useAdminLocation()
  const reviewId = matchFeedbackReviewPath(location.pathname)
  const isDashboard = location.pathname === '/' || location.pathname === feedbackDashboardPath

  return (
    <AdminShell
      current="feedback-dashboard"
      pageLabel={reviewId ? 'Feedback 검토' : 'Feedback Dashboard'}
      onEntrySelect={() => navigate(feedbackDashboardPath)}
    >
      {reviewId !== null ? (
        <FeedbackReviewRoute key={reviewId} feedbackId={reviewId} location={location} />
      ) : isDashboard ? (
        <FeedbackDashboardRoute location={location} />
      ) : (
        <section style={{ padding: 'var(--lh-space-8)' }}>
          <h1>페이지를 찾을 수 없어요.</h1>
        </section>
      )}
    </AdminShell>
  )
}

export default App
