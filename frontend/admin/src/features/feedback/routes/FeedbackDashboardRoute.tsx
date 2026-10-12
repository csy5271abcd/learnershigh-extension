import { navigate, replaceSearch, type AdminLocation } from '../../../app/adminLocation.ts'
import { readScreenScenario, useScreenLoad } from '../../../app/useScreenLoad.ts'
import { useAdminState } from '../../../store/adminStore.ts'
import { FeedbackDashboardPage } from '../FeedbackDashboardPage.tsx'
import { parseFeedbackFilter, writeFeedbackFilter } from '../model/feedbackQueue.ts'
import { feedbackReviewPath, type FeedbackReviewEntry } from './paths.ts'

// Feedback Dashboard. Filter / 검색 / page는 주소 Query(type · grade · stage · deadline · waiting · status · q · page)에 두어
// 새로고침 / Back / Forward 후에도 유지한다. (바꿀 때 History는 쌓지 않는다)
// 개발용 ?fixture=loading | error | error-once | empty
export function FeedbackDashboardRoute({ location }: { location: AdminLocation }) {
  const scenario = readScreenScenario(location.search)
  const { state: load, reload } = useScreenLoad('feedback-dashboard', scenario)
  const state = useAdminState()

  return (
    <FeedbackDashboardPage
      state={state}
      load={load}
      onRetry={reload}
      filter={parseFeedbackFilter(location.search)}
      onFilterChange={(filter) => replaceSearch(writeFeedbackFilter(location.search, filter))}
      onOpen={(item) => {
        const entry: FeedbackReviewEntry = { fromDashboard: true }
        navigate(feedbackReviewPath(item.feedbackId), { entry })
      }}
    />
  )
}
