import { toApiError } from '../api/canonicalSource.ts'

// A14 §39-11 관리자 추가 행 저장 오류 → 화면 문구 (서버 필드 오류 이유와 1:1)

export const manualRowReasonText: Record<string, string> = {
  'row.content|required': '단원·학습 내용·특별 일정 중 하나는 적어 주세요.',
  'row.schedule.monthFrom|required': '이 시기 단위에는 시작 월이 필요해요.',
  'row.schedule.monthTo|required': '여러 달이면 끝 월이 필요해요.',
  'row.schedule.weekFrom|required': '이 시기 단위에는 주차가 필요해요.',
  'row.schedule.weekTo|out_of_range': '끝 주차가 시작 주차보다 앞설 수 없어요.',
  'row.schedule.calendarYear|not_allowed': '연도는 입력할 수 없어요.',
  'row.pdfPageNumber|out_of_range': '원문 쪽 번호가 문서 쪽 수를 넘어요.',
  'row.pdfPageNumber|not_allowed': '이 문서 형식에는 쪽 번호를 넣을 수 없어요.',
  'row.subjectIndex|out_of_range': '분석 결과에 없는 과목이에요.',
  'row.subjectIndex|conflict': '추가 행의 과목은 바꿀 수 없어요.',
  'row|too_many': '추가 행이 너무 많아요(최대 200행).',
}

/** 서버 오류 → 화면 문구 (입력값은 그대로 둔다) */
export function manualRowErrorText(cause: unknown): string {
  const error = toApiError(cause)
  if (error.code === 'PLAN_REVIEW_DRAFT_CONFLICT' || error.code === 'CONCURRENT_MODIFICATION') return '다른 관리자가 먼저 운영계획 초안을 바꿨어요. 화면을 새로 고친 뒤 다시 저장해 주세요(입력한 값은 그대로 있어요).'
  if (error.code === 'PLAN_REVIEW_DRAFT_STALE') return '분석 결과가 바뀌었어요. 화면을 새로 고쳐 주세요.'
  const reasons = Object.entries(error.fieldReasons())
  if (reasons.length) return reasons.map(([field, reason]) => manualRowReasonText[`${field}|${reason}`] ?? (reason === 'teaching_plan_already_confirmed' ? '확정된 운영계획이에요. 재검토를 시작한 뒤 추가해 주세요.' : `${field}: ${reason}`)).join(' ')
  return error.message
}

