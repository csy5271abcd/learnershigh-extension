// Mentor Surface 내부 Route. (Mentor 전용 App이며 기존 LearnersHigh URL이 아니다)

import type { MentorContentType } from '../api/types.ts'

const id = (value: string) => encodeURIComponent(value)

export const homePath = '/'

export const contentListPath = '/content'
export const contentPath = (contentId: string) => `/content/${id(contentId)}`
export const contentEditPath = (contentId: string) => `/content/${id(contentId)}/edit`
export const contentReviewPendingPath = (contentId: string) => `/content/${id(contentId)}/review-pending`
export const createPath = '/create'
/** 작성 Launcher에서 유형을 고르고 Composer로 바로 들어간다. */
export const createWithTypePath = (type: MentorContentType) => `/create?type=${type}`

export const questionListPath = '/questions'
export const questionPath = (questionId: string) => `/questions/${id(questionId)}`
export const answerPath = (questionId: string) => `/questions/${id(questionId)}/answer`

export const discoverPath = '/discover'
export const discoverContentPath = (contentId: string) => `/discover/content/${id(contentId)}`
export const discoverMentorPath = (mentorId: string) => `/discover/mentors/${id(mentorId)}`

export const profilePath = '/profile'
export const profileEditPath = '/profile/edit'
