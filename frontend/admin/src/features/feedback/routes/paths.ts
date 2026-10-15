export const feedbackDashboardPath = '/feedback'

export const feedbackReviewPath = (feedbackId: string) => `/feedback/${encodeURIComponent(feedbackId)}`

/** /feedback/:feedbackId 의 feedbackId. 다른 주소면 null */
export function matchFeedbackReviewPath(pathname: string): string | null {
  const match = /^\/feedback\/([^/]+)\/?$/.exec(pathname)
  return match ? decodeURIComponent(match[1]) : null
}

/** Dashboard에서 Review로 들어왔다는 표시. 있으면 돌아가기를 History Back으로 처리해 Filter · Scroll을 복원한다. */
export interface FeedbackReviewEntry {
  fromDashboard: true
}

/** Dashboard 또는 다른 Admin 화면(inApp)에서 들어왔는지. 그렇다면 돌아가기 = History Back */
export const isFromDashboard = (entry: unknown) =>
  typeof entry === 'object' && entry !== null && ((entry as Partial<FeedbackReviewEntry>).fromDashboard === true || (entry as { inApp?: boolean }).inApp === true)
