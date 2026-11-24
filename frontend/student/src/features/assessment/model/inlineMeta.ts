import { updateSchoolAssessment } from '../api/schoolAssessmentApi.ts'
import type { SchoolAssessment, UpdateSchoolAssessmentRequest } from '../api/types.ts'
import { assessmentTypeText } from './personalDetails.ts'
import { formatDateWithWeekday } from './schoolAssessmentView.ts'

// A27-UX 학생 상세 인라인 편집 보조 (components/detail/InlineMeta.tsx). 한 필드만 §12 PATCH로 보낸다.
export type InlineSaver = (request: UpdateSchoolAssessmentRequest) => Promise<void>

export function inlineSaver(assessmentId: string, onSaved: (updated: SchoolAssessment) => void): InlineSaver {
  return async (request) => {
    const updated = await updateSchoolAssessment(assessmentId, request)
    onSaved(updated)
  }
}

export const typeDisplay = (item: SchoolAssessment) => assessmentTypeText(item)
export const dateDisplay = (value: string | null | undefined) => (value ? formatDateWithWeekday(value) : null)
