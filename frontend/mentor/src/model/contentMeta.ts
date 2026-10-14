// Content 유형 / 상태 표시. My Content · Q&A 관련 Content · Profile이 함께 쓴다.

import type { BadgeTone } from '../components/Badge.tsx'
import type { MentorContentListItem, MentorContentType } from '../api/types.ts'

export const contentTypes: { id: MentorContentType; label: string; description: string }[] = [
  { id: 'PLAN', label: 'Plan', description: '주차 · 요일 · 과목별 할 일 계획' },
  { id: 'ROUTINE', label: 'Routine', description: '반복하는 습관과 시간' },
  { id: 'STORY', label: 'Story', description: '성적 변화 · 실패와 회복 · 진로 고민 같은 경험' },
  { id: 'RECORD', label: 'Record', description: '개인정보를 지운 학교생활기록 (검수 후 공개)' },
  { id: 'CASE', label: 'Case', description: '실제 활동 과정과 결과 사례 (검수 후 공개)' },
]

export const contentTypeLabel = (type: MentorContentType) => contentTypes.find((item) => item.id === type)?.label ?? type

/** 개인정보 검수(PII Detection → Admin Review)를 거쳐 공개되는 유형 (domain.md §29-1) */
export const isReviewRequired = (type: MentorContentType) => type === 'RECORD' || type === 'CASE'

/** Student Apply가 있는 유형. 다른 유형에는 Apply 수를 보여 주지 않는다. */
export const hasApply = (type: MentorContentType) => type === 'PLAN' || type === 'ROUTINE'

export type ContentStatusView = { label: string; tone: BadgeTone }

/**
 * 화면 상태 표시. Domain 상태는 DRAFT / PUBLISHED 두 개뿐이고,
 * "검수 대기"는 Canonical Review State 확정 전 UI-only representation이다. (OD-05)
 */
export function contentStatusView(item: Pick<MentorContentListItem, 'status' | 'review'>): ContentStatusView {
  if (item.status === 'PUBLISHED') return { label: '공개됨', tone: 'positive' }
  if (item.review.publishRequestSubmitted) return { label: '검수 대기', tone: 'warning' }
  return { label: '초안', tone: 'neutral' }
}

export const isInReview = (item: Pick<MentorContentListItem, 'status' | 'review'>) =>
  item.status === 'DRAFT' && item.review.publishRequestSubmitted
