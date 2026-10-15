// 비공개 Source → 공개 Projection. 공개 Field를 하나씩 골라 새 객체를 만든다. (Spread로 넘기지 않는다)
// Backend가 생기면 같은 규칙을 Server Projection이 맡는다. (Public Projection Contract: Open Decision)

import type { MentorContentDetail, MentorProfile } from '../types.ts'
import type { PublicMentorAuthor, PublicMentorView, PublishedMentorContentDetail, PublishedMentorContentView } from './types.ts'

/** Discover Source: 각 Mentor의 Content (내 Content와 같은 모양, 비공개 Field 포함) */
export type DiscoverSourceContent = MentorContentDetail & { mentorId: string }

/** Published만 공개한다. Draft / 검수 대기는 제외. */
export const isPubliclyVisible = (content: DiscoverSourceContent) => content.status === 'PUBLISHED' && content.publishedAt !== null

export function toPublicAuthor(profile: MentorProfile): PublicMentorAuthor {
  return {
    mentorId: profile.mentorId,
    name: profile.name,
    university: profile.university,
    major: profile.major,
    profileImageUrl: profile.profileImageUrl ?? null,
  }
}

export function toPublicMentorView(profile: MentorProfile, publishedContentCount: number): PublicMentorView {
  return {
    mentorId: profile.mentorId,
    name: profile.name,
    university: profile.university,
    major: profile.major,
    admissionType: profile.admissionType,
    highSchoolContext: profile.highSchoolContext,
    representativeExperience: profile.representativeExperience,
    verified: profile.verified,
    tags: [...profile.tags],
    profileImageUrl: profile.profileImageUrl ?? null,
    publishedContentCount,
  }
}

function summaryOf(content: DiscoverSourceContent): string {
  switch (content.type) {
    case 'PLAN':
    case 'ROUTINE':
      return content.body.description
    case 'STORY':
      return content.body.summary
    case 'RECORD':
      return content.body.mentorNote || content.body.subjectOrActivity
    case 'CASE':
      return content.body.summary
  }
}

export function toPublishedView(content: DiscoverSourceContent, author: MentorProfile): PublishedMentorContentView {
  return {
    contentId: content.contentId,
    type: content.type,
    title: content.title,
    tags: [...content.tags],
    summary: summaryOf(content),
    publishedAt: content.publishedAt ?? content.updatedAt,
    mentor: toPublicAuthor(author),
  }
}

export function toPublishedDetail(content: DiscoverSourceContent, author: MentorProfile): PublishedMentorContentDetail {
  return {
    ...toPublishedView(content, author),
    type: content.type,
    body: structuredClone(content.body),
  } as PublishedMentorContentDetail
}
