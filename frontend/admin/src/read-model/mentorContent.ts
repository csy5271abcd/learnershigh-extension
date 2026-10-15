import { mentorCaseDetailsFixture } from '../fixtures/adminMentorCaseDetails.fixture.ts'
import { mentorPlansFixture, mentorProfilesFixture, mentorRecordsFixture, mentorRoutinesFixture, mentorStoriesFixture } from '../fixtures/adminMentorContent.fixture.ts'
import type { MentorCaseDetail, MentorCaseRef, MentorContentType, MentorPlanContent, MentorProfileRecord, MentorRecordContent, MentorRoutineContent, MentorStoryContent } from '../fixtures/types.ts'
import type { AdminState } from '../store/adminStore.ts'

/*
 * Admin Mentor 추천 Read Model. Mentor 정보는 MentorProfile 하나에서, Content는 같은 contentId Canonical Fixture에서 읽는다.
 * - Case 목록은 State(mentorCases), Case 상세는 adminMentorCaseDetails, Plan · Routine · Story · Record는 adminMentorContent.
 * - Mentor별 공개 Content 수는 Content의 mentorId로 계산한다. (Student Profile Content Tab과 같은 기준 · Browser 검증)
 * - Admin Mentor Profile / Content 상세 API Shape은 Contract에 없다. (Gap) Fixture에서 id로 찾는다.
 */

export const mentorContentTypeLabel: Record<MentorContentType, string> = { case: 'Case', plan: 'Plan', routine: 'Routine', story: 'Story', record: 'Record' }
export const mentorContentTypes: MentorContentType[] = ['case', 'plan', 'routine', 'story', 'record']

export type MentorContentItem =
  | { type: 'case'; contentId: string; title: string; mentorId: string; summary: string; ref: MentorCaseRef; detail: MentorCaseDetail | null }
  | { type: 'plan'; contentId: string; title: string; mentorId: string; summary: string; detail: MentorPlanContent }
  | { type: 'routine'; contentId: string; title: string; mentorId: string; summary: string; detail: MentorRoutineContent }
  | { type: 'story'; contentId: string; title: string; mentorId: string; summary: string; detail: MentorStoryContent }
  | { type: 'record'; contentId: string; title: string; mentorId: string; summary: string; detail: MentorRecordContent }

export const mentorProfiles: readonly MentorProfileRecord[] = mentorProfilesFixture

export const findMentorProfile = (mentorId: string) => mentorProfilesFixture.find((item) => item.mentorId === mentorId) ?? null

/** '이화여대 생명과학과' (Case 목록 mentorAffiliation과 같은 형식) */
export const mentorAffiliation = (profile: Pick<MentorProfileRecord, 'university' | 'major'>) => `${profile.university} ${profile.major}`

const cache = new WeakMap<readonly MentorCaseRef[], MentorContentItem[]>()

/** 모든 공개 Mentor Content (Case → Plan → Routine → Story → Record 순) */
export function allMentorContent(state: AdminState): MentorContentItem[] {
  const cached = cache.get(state.mentorCases)
  if (cached) return cached
  const items: MentorContentItem[] = [
    ...state.mentorCases.map((ref) => {
      const detail = mentorCaseDetailsFixture.find((item) => item.contentId === ref.contentId) ?? null
      return { type: 'case' as const, contentId: ref.contentId, title: ref.title, mentorId: ref.mentorId, summary: detail?.summary ?? '', ref, detail }
    }),
    ...mentorPlansFixture.map((detail) => ({ type: 'plan' as const, contentId: detail.contentId, title: detail.title, mentorId: detail.mentorId, summary: detail.summary, detail })),
    ...mentorRoutinesFixture.map((detail) => ({ type: 'routine' as const, contentId: detail.contentId, title: detail.title, mentorId: detail.mentorId, summary: detail.summary, detail })),
    ...mentorStoriesFixture.map((detail) => ({ type: 'story' as const, contentId: detail.contentId, title: detail.title, mentorId: detail.mentorId, summary: detail.summary, detail })),
    ...mentorRecordsFixture.map((detail) => ({ type: 'record' as const, contentId: detail.contentId, title: detail.title, mentorId: detail.mentorId, summary: detail.summary, detail })),
  ]
  cache.set(state.mentorCases, items)
  return items
}

export const findMentorContent = (state: AdminState, contentId: string) => allMentorContent(state).find((item) => item.contentId === contentId) ?? null

export function mentorContentCounts(state: AdminState, mentorId: string): Record<MentorContentType, number> {
  const counts: Record<MentorContentType, number> = { case: 0, plan: 0, routine: 0, story: 0, record: 0 }
  for (const item of allMentorContent(state)) if (item.mentorId === mentorId) counts[item.type] += 1
  return counts
}

/** 검색 대상 글자 (제목 · 요약 · Mentor · 대학 · 학과 · Content별 핵심 값) */
export function mentorContentSearchText(item: MentorContentItem): string {
  const profile = findMentorProfile(item.mentorId)
  const base = [item.title, item.summary, profile?.name ?? '', profile?.university ?? '', profile?.major ?? '']
  if (item.type === 'case') base.push(item.ref.subject, item.ref.activityType)
  if (item.type === 'plan') base.push(...item.detail.weeks.flatMap((week) => week.items.map((entry) => entry.subject)))
  if (item.type === 'story') base.push(...item.detail.topics)
  if (item.type === 'record') base.push(item.detail.areaLabel, item.detail.subjectOrActivity)
  return base.join(' ').toLowerCase()
}

/** Plan 과목 (중복 없이, 처음 나온 순) */
export const planSubjects = (plan: MentorPlanContent) => [...new Set(plan.weeks.flatMap((week) => week.items.map((item) => item.subject)))]
