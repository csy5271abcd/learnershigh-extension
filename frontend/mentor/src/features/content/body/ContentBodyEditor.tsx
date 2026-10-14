import type { MentorContentBody } from '../../../api/types.ts'
import { CaseEditor } from './CaseEditor.tsx'
import type { TypedBody } from '../../../content-body/ContentBodyView.tsx'
import { PlanEditor } from './PlanEditor.tsx'
import { RecordEditor } from './RecordEditor.tsx'
import { RoutineEditor } from './RoutineEditor.tsx'
import { StoryEditor } from './StoryEditor.tsx'

/** 유형별 본문 Editor를 고른다. 각 유형 입력 UI는 자기 파일에 둔다. */
export function ContentBodyEditor({ content, onChange }: { content: TypedBody; onChange: (body: MentorContentBody) => void }) {
  switch (content.type) {
    case 'PLAN':
      return <PlanEditor value={content.body} onChange={onChange} />
    case 'ROUTINE':
      return <RoutineEditor value={content.body} onChange={onChange} />
    case 'STORY':
      return <StoryEditor value={content.body} onChange={onChange} />
    case 'RECORD':
      return <RecordEditor value={content.body} onChange={onChange} />
    case 'CASE':
      return <CaseEditor value={content.body} onChange={onChange} />
  }
}
