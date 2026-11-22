import type { SchoolAssessment, SchoolAssessmentStatus, SchoolAssessmentType } from '../api/types.ts'

// A27-UX 학생 개인 수행평가 관리 정보 (추가·수정·상세 공용). 모두 선택 값이고 비우면 '모름' — 0이나 임의 날짜를 넣지 않는다.
export const assessmentTypeLabels: Record<SchoolAssessmentType, string> = {
  PRESENTATION: '발표',
  REPORT: '보고서',
  PROJECT: '프로젝트',
  EXPERIMENT: '실험·실습',
  DEBATE: '토론',
  PORTFOLIO: '포트폴리오',
  OTHER: '기타',
}

export const assessmentTypeOrder: SchoolAssessmentType[] = ['PRESENTATION', 'REPORT', 'PROJECT', 'EXPERIMENT', 'DEBATE', 'PORTFOLIO', 'OTHER']

/** 화면 표시: '기타'에 직접 입력한 이름이 있으면 그 이름 (§12-b DRAFT) */
export function assessmentTypeText(item: Pick<SchoolAssessment, 'assessmentType' | 'assessmentTypeLabel'>): string | null {
  if (!item.assessmentType) return null
  if (item.assessmentType === 'OTHER' && item.assessmentTypeLabel) return item.assessmentTypeLabel
  return assessmentTypeLabels[item.assessmentType]
}

/**
 * A27-UX 학생(2026-11-19): 제출물 선택 목록. 저장값은 §12 `submissions` 문자열 그대로(새 Enum 없음).
 * '기타'는 직접 입력한 문자열을 저장한다. '미정'은 저장하지 않음(null)과 같다.
 */
export const submissionOptions = ['보고서', '발표 자료(PPT)', '실험일지', '탐구노트', '포스터', '영상', '사진', '코드·프로그램', '포트폴리오'] as const
export const submissionOther = '기타'

/** 저장된 제출물 문자열 → 선택 상태 (목록에 없는 값은 '기타' 직접 입력) */
export function submissionChoice(value: string | null | undefined): { choice: string; custom: string } {
  if (!value) return { choice: '', custom: '' }
  return (submissionOptions as readonly string[]).includes(value) ? { choice: value, custom: '' } : { choice: submissionOther, custom: value }
}

/** 선택 상태 → 저장할 문자열 (빈 값 = null) */
export function submissionValue(choice: string, custom: string): string | null {
  if (!choice) return null
  if (choice === submissionOther) return custom.trim() || null
  return choice
}

export interface PersonalDetailsValue {
  assessmentType: SchoolAssessmentType | ''
  /** '기타' 직접 입력 (§12-b) */
  assessmentTypeLabel: string
  evaluationDate: string
  deadlineDate: string
  weightPercent: string
  /** 제출물 선택 ('' = 미정, '기타' = 직접 입력) */
  submissionChoice: string
  submissionCustom: string
  description: string
  personalMemo: string
  status?: SchoolAssessmentStatus
}

export const emptyPersonalDetails = (): PersonalDetailsValue => ({
  assessmentType: '',
  assessmentTypeLabel: '',
  evaluationDate: '',
  deadlineDate: '',
  weightPercent: '',
  submissionChoice: '',
  submissionCustom: '',
  description: '',
  personalMemo: '',
})

/** 저장된 수행평가 → 편집 값 */
export function personalDetailsOf(item: SchoolAssessment): PersonalDetailsValue {
  const submission = submissionChoice(item.submissions)
  return {
    assessmentType: item.assessmentType ?? '',
    assessmentTypeLabel: item.assessmentTypeLabel ?? '',
    evaluationDate: item.evaluationDate ?? '',
    deadlineDate: item.deadlineDate ?? '',
    weightPercent: item.weightPercent === null || item.weightPercent === undefined ? '' : String(item.weightPercent),
    submissionChoice: submission.choice,
    submissionCustom: submission.custom,
    description: item.description ?? '',
    personalMemo: item.personalMemo ?? '',
  }
}

/** 반영 비율 입력 검사: 빈 값 = 모름(null), 0~100 정수만 */
export function weightError(value: string): string | null {
  if (value.trim() === '') return null
  if (!/^\d{1,3}$/.test(value.trim())) return '0~100 사이 숫자로 입력해 주세요.'
  const number = Number(value)
  return number < 0 || number > 100 ? '0~100 사이 숫자로 입력해 주세요.' : null
}

/** '기타' 직접 입력 검사 (50자) */
export function typeLabelError(value: PersonalDetailsValue): string | null {
  if (value.assessmentType !== 'OTHER') return null
  return value.assessmentTypeLabel.trim().length > 50 ? '50자 이하로 적어 주세요.' : null
}

/** 제출물 직접 입력 검사 (500자) */
export function submissionError(value: PersonalDetailsValue): string | null {
  return value.submissionChoice === submissionOther && value.submissionCustom.trim().length > 500 ? '500자 이하로 적어 주세요.' : null
}

export function personalDetailsPayload(value: PersonalDetailsValue) {
  return {
    assessmentType: value.assessmentType || null,
    assessmentTypeLabel: value.assessmentType === 'OTHER' ? value.assessmentTypeLabel.trim() || null : null,
    evaluationDate: value.evaluationDate || null,
    deadlineDate: value.deadlineDate || null,
    weightPercent: value.weightPercent.trim() === '' ? null : Number(value.weightPercent),
    submissions: submissionValue(value.submissionChoice, value.submissionCustom),
    description: value.description.trim() || null,
    personalMemo: value.personalMemo.trim() || null,
  }
}
