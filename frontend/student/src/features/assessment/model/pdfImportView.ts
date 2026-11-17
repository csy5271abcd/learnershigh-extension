import type { AcademicContext, EvaluationAnalysisStatus, EvaluationPlan, SchoolAssessment, SubjectRef } from '../api/types.ts'
import { mockPdfPolicy } from './pdfImportPolicy.ts'

// 평가계획서 가져오기(S5) 표시·검사 규칙. 서버 검증·분석을 대신하지 않는다.

/** 브라우저에서 고른 파일의 1차 확인. 확장자·MIME만 본다 (내용·악성 여부는 확인하지 않음). */
export function validatePdfFile(file: File): string | null {
  const isPdfName = file.name.toLowerCase().endsWith('.pdf')
  if (!isPdfName || (file.type !== '' && file.type !== 'application/pdf')) return 'PDF 파일만 선택할 수 있어요.'
  if (file.type === '') return '파일 형식을 확인할 수 없어요. PDF 파일인지 확인해 주세요.'
  if (file.size === 0) return '빈 파일이에요. 다른 PDF를 선택해 주세요.'
  if (file.size > mockPdfPolicy.maxBytes) return `파일이 너무 커요. 시연 기준으로 ${Math.round(mockPdfPolicy.maxBytes / 1024 / 1024)}MB 이하만 선택할 수 있어요.`
  return null
}

export const analysisStatusLabels: Record<EvaluationAnalysisStatus, string> = {
  NOT_REQUESTED: '분석 요청 전',
  PROCESSING: '분석 중',
  REVIEW_REQUIRED: '확인 필요',
  COMPLETED: '분석 완료',
  FAILED: '분석 실패',
}

/** 관리자 검토 상태 표시. 예시 값 `CONFIRMED`만 이름을 붙이고 나머지는 원래 값을 보여준다 (MM-45). */
export function reviewStatusLabel(status: string): string {
  return status === 'CONFIRMED' ? '관리자 확인 문서' : `검토 상태: ${status}`
}

export function planTermLabel(plan: Pick<EvaluationPlan, 'academicYear' | 'grade' | 'semester'>): string {
  return `${plan.academicYear}학년도 ${plan.grade}학년 ${plan.semester}학기`
}

export type PlanContextIssue = { kind: 'otherSchool' | 'otherTerm' | 'previousYear'; message: string }

/** 문서와 지금 선택한 학업 정보가 다른지. 다르면 이번 학기 수행평가로 추가하지 않는다 (자동 이동·학업 정보 변경 없음). */
export function planContextIssue(plan: EvaluationPlan, context: AcademicContext): PlanContextIssue | null {
  if (plan.schoolId !== context.school.schoolId) return { kind: 'otherSchool', message: '내 학교 문서가 아니에요. 이 문서로는 가져올 수 없어요.' }
  if (plan.academicYear < context.academicYear) {
    return { kind: 'previousYear', message: `${plan.academicYear}학년도 문서예요. 과거 참고자료로만 볼 수 있고, 이번 학기 수행평가로 추가할 수 없어요.` }
  }
  if (plan.academicYear !== context.academicYear || plan.grade !== context.grade || plan.semester !== context.semester) {
    return { kind: 'otherTerm', message: `선택한 학기(${context.academicYear}학년도 ${context.grade}학년 ${context.semester}학기)와 다른 문서예요. 이 학기 수행평가로 추가할 수 없어요.` }
  }
  return null
}

/** 분석 결과의 과목 이름을 내 과목과 이름이 완전히 같을 때만 연결한다. 비슷한 이름은 학생이 고른다. */
export function matchSubject(subjectName: string, subjects: SubjectRef[]): SubjectRef | undefined {
  const normalized = subjectName.replace(/\s+/g, '')
  return subjects.find((subject) => subject.name.replace(/\s+/g, '') === normalized)
}

/** §11 개인 검토 fieldPath (Mock은 수행평가 항목 이름만 정정한다, MM-47) */
export const labelFieldPath = (subjectIndex: number, itemIndex: number) =>
  `subjects[${subjectIndex}].performanceEvaluation.items[${itemIndex}].label`

const normalizeTitle = (title: string) => title.replace(/\s+/g, '').toLowerCase()

export type DuplicateState =
  | { kind: 'imported'; assessment: SchoolAssessment }
  | { kind: 'sameTitle'; assessment: SchoolAssessment }
  | null

/**
 * 중복 가능성 (student §6, §12 "중복은 알림 우선, 자동 병합 없음"). 최종 판정 규칙은 계약 미정 (MM-48).
 * - 같은 evaluationItemRef가 이미 있으면 "이미 가져온 항목" → 다시 추가하지 않는다.
 * - 같은 과목에 이름이 같은 과제가 있으면 "같은 이름" → 학생이 확인한 뒤에만 추가한다.
 */
export function duplicateState(
  existing: SchoolAssessment[],
  ref: { documentRevisionId: string; subjectId: string; itemKey: string },
  title: string | null,
): DuplicateState {
  const imported = existing.find(
    (item) =>
      item.evaluationItemRef?.documentRevisionId === ref.documentRevisionId &&
      item.evaluationItemRef.subjectId === ref.subjectId &&
      item.evaluationItemRef.itemKey === ref.itemKey,
  )
  if (imported) return { kind: 'imported', assessment: imported }
  if (!title) return null
  const sameTitle = existing.find((item) => item.subjectId === ref.subjectId && normalizeTitle(item.title) === normalizeTitle(title))
  return sameTitle ? { kind: 'sameTitle', assessment: sameTitle } : null
}

/** 값이 없을 때: 원본에 없음(null). 과목 추출 실패·근거 없음은 화면에서 따로 표시한다. */
export function valueOrMissing(value: string | number | null, suffix = ''): string {
  return value === null ? '원본에 없음' : `${value}${suffix}`
}
