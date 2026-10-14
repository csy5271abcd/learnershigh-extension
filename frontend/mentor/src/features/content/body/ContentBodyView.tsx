import type { MentorContentBodyByType, MentorContentType } from '../../../api/types.ts'
import { CaseView } from './CaseView.tsx'
import { PlanView } from './PlanView.tsx'
import { RecordView } from './RecordView.tsx'
import { RoutineView } from './RoutineView.tsx'
import { StoryView } from './StoryView.tsx'

export type TypedBody = { [T in MentorContentType]: { type: T; body: MentorContentBodyByType[T] } }[MentorContentType]

/** 유형별 본문 View를 고른다. 각 유형 Layout은 자기 파일에 둔다. */
export function ContentBodyView({ content }: { content: TypedBody }) {
  switch (content.type) {
    case 'PLAN':
      return <PlanView body={content.body} />
    case 'ROUTINE':
      return <RoutineView body={content.body} />
    case 'STORY':
      return <StoryView body={content.body} />
    case 'RECORD':
      return <RecordView body={content.body} />
    case 'CASE':
      return <CaseView body={content.body} />
  }
}
