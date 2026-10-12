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

export const isFromDashboard = (entry: unknown) =>
  typeof entry === 'object' && entry !== null && (entry as Partial<FeedbackReviewEntry>).fromDashboard === true
