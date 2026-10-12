import { goBack, navigate, type AdminLocation } from '../../../app/adminLocation.ts'
import { deriveFeedbackQueue } from '../../../read-model/feedbackQueue.ts'
import { useAdminState } from '../../../store/adminStore.ts'
import { FeedbackReviewBoundaryPage } from '../FeedbackReviewBoundaryPage.tsx'
import { feedbackDashboardPath, isFromDashboard } from './paths.ts'

// Feedback Review 진입 Boundary. Dashboard에서 왔으면 돌아가기를 History Back으로 처리해 Filter · Scroll을 복원한다.
export function FeedbackReviewRoute({ feedbackId, location }: { feedbackId: string; location: AdminLocation }) {
  const state = useAdminState()
  return (
    <FeedbackReviewBoundaryPage
      item={deriveFeedbackQueue(state).find((item) => item.feedbackId === feedbackId) ?? null}
      onBack={() => {
        if (isFromDashboard(location.state)) goBack()
        else navigate(feedbackDashboardPath)
      }}
    />
  )
}
