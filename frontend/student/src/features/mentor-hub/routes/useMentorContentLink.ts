import { useNavigate } from 'react-router'
import type { MentorContentSummary } from '../model/types.ts'
import { mentorPlanPath, mentorRecordPath, mentorRoutinePath, mentorStoryPath } from './paths.ts'

/** Detail 화면이 있는 Mentor Content의 주소. Case 등 화면이 없는 유형은 undefined (가짜 주소를 만들지 않는다) */
export function mentorContentPath(content: MentorContentSummary): string | undefined {
  switch (content.kind) {
    case 'plan':
      return mentorPlanPath(content.contentId)
    case 'routine':
      return mentorRoutinePath(content.contentId)
    case 'story':
      return mentorStoryPath(content.contentId)
    case 'record':
      return mentorRecordPath(content.contentId)
    default:
      return undefined
  }
}

/** 관련 콘텐츠 줄(RelatedContentList)에 넘길 이동 함수. Detail 화면이 없으면 undefined */
export function useMentorContentLink() {
  const navigate = useNavigate()
  return (content: MentorContentSummary) => {
    const path = mentorContentPath(content)
    return path ? () => navigate(path) : undefined
  }
}
