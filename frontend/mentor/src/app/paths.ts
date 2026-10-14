// Mentor Surface 내부 Route. (Mentor 전용 App이며 기존 LearnersHigh URL이 아니다)

const id = (value: string) => encodeURIComponent(value)

export const contentListPath = '/content'
export const contentPath = (contentId: string) => `/content/${id(contentId)}`
export const contentEditPath = (contentId: string) => `/content/${id(contentId)}/edit`
export const contentReviewPendingPath = (contentId: string) => `/content/${id(contentId)}/review-pending`
export const createPath = '/create'

export const questionListPath = '/questions'
export const questionPath = (questionId: string) => `/questions/${id(questionId)}`
export const answerPath = (questionId: string) => `/questions/${id(questionId)}/answer`

export const profilePath = '/profile'
export const profileEditPath = '/profile/edit'
