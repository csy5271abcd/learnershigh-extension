import { useState } from 'react'
import { goBack, navigate, type AdminLocation } from '../../../app/adminLocation.ts'
import { readScreenScenario, useScreenLoad } from '../../../app/useScreenLoad.ts'
import { ErrorState, LoadingState, NoticeState } from '../../../components/AdminUi.tsx'
import ui from '../../../components/AdminUi.module.css'
import { deriveFeedbackQueue, findReviewTarget } from '../../../read-model/feedbackQueue.ts'
import { useAdminState } from '../../../store/adminStore.ts'
import { inAppEntry, mentorCaseSearchPath, student360Path } from '../../student-management/routes/paths.ts'
import { ActivityFeedbackPage } from '../ActivityFeedbackPage.tsx'
import type { ReviewNavigation } from '../ReviewTopBar.tsx'
import { TaskReviewPage } from '../TaskReviewPage.tsx'
import { TopicReviewPage } from '../TopicReviewPage.tsx'
import { feedbackDashboardPath, feedbackReviewPath, isFromDashboard } from './paths.ts'

// Feedback Review (/feedback/:feedbackId). feedbackId로 검토 종류를 찾는다: 수행평가 Version 검토 · 주제 검토 · 활동 피드백.
// 전달한 항목도 같은 주소로 다시 열면 전달 결과를 읽기 전용으로 보여준다.
// Dashboard에서 왔으면 돌아가기를 History Back으로 처리해 Filter · Scroll을 복원한다. 이전 / 다음은 처음 연 시점의 Queue 순서를 쓴다.
export function FeedbackReviewRoute({ feedbackId, location }: { feedbackId: string; location: AdminLocation }) {
  const state = useAdminState()
  const scenario = readScreenScenario(location.search)
  const { state: load, reload } = useScreenLoad('feedback-review', scenario)
  const queue = deriveFeedbackQueue(state)
  const [order] = useState(() => queue.map((item) => item.feedbackId))
  const fromDashboard = isFromDashboard(location.state)

  const live = new Set(queue.map((item) => item.feedbackId))
  const index = order.indexOf(feedbackId)
  const navigation: ReviewNavigation = {
    position: live.has(feedbackId) ? queue.findIndex((item) => item.feedbackId === feedbackId) + 1 : null,
    total: queue.length,
    prevId: index > 0 ? ([...order.slice(0, index)].reverse().find((id) => live.has(id)) ?? null) : null,
    nextId: (index >= 0 ? order.slice(index + 1) : queue.map((item) => item.feedbackId)).find((id) => live.has(id) && id !== feedbackId) ?? null,
  }

  const onBack = () => (fromDashboard ? goBack() : navigate(feedbackDashboardPath))
  // 이전 / 다음은 같은 검토 흐름이라 History를 쌓지 않고 바꾼다. (Back = Dashboard)
  const onGo = (id: string) => {
    window.history.replaceState(window.history.state, '', feedbackReviewPath(id))
    window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }))
  }
  const onOpenStudent = (studentId: string) => navigate(student360Path(studentId), { entry: inAppEntry })

  if (load.status === 'loading')
    return (
      <div className={ui.page}>
        <LoadingState label="검토 항목을 불러오는 중이에요." />
      </div>
    )
  if (load.status === 'error')
    return (
      <div className={ui.page}>
        <ErrorState title="검토 항목을 불러오지 못했어요." onRetry={reload} />
      </div>
    )

  const target = load.empty ? null : findReviewTarget(state, feedbackId)
  if (!target)
    return (
      <div className={ui.page}>
        <button type="button" className={ui.back} onClick={onBack}>
          <span aria-hidden="true">‹</span> Shared Queue<span className="lh-visually-hidden">로 돌아가기</span>
        </button>
        <NoticeState title="검토 항목을 찾을 수 없어요." focus>
          <p>주소가 잘못되었거나 검토 대상이 아닌 항목이에요.</p>
        </NoticeState>
      </div>
    )

  if (target.kind === 'topic-review')
    return <TopicReviewPage key={feedbackId} state={state} task={target.task} student={target.student} navigation={navigation} onBack={onBack} onGo={onGo} onOpenStudent={onOpenStudent} />
  if (target.kind === 'activity-feedback')
    return <ActivityFeedbackPage key={feedbackId} state={state} activity={target.activity} student={target.student} navigation={navigation} onBack={onBack} onGo={onGo} onOpenStudent={onOpenStudent} />
  return (
    <TaskReviewPage
      key={feedbackId}
      state={state}
      review={target.review}
      task={target.task}
      student={target.student}
      navigation={navigation}
      onBack={onBack}
      onGo={onGo}
      onOpenStudent={onOpenStudent}
      onRecommendCase={(studentId, taskId) => navigate(mentorCaseSearchPath({ studentId, taskId }), { entry: inAppEntry })}
    />
  )
}
