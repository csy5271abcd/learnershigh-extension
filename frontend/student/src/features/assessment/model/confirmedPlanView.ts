import type { AcademicContext, ConfirmedPlanField } from '../api/types.ts'

// 학생 확정 평가정보 (§10-1 confirmedFields). 관리자가 확정한 값만 받는다 — 후보·초안은 이 응답에 없다.
// 값 상태: 'missing' = 확정 목록에 없음(미확정) · 'absent' = 관리자가 "원문에 없음"으로 확인(value=null) · 'value'.
// 서버에 없는 값은 만들지 않는다. 지필 차수 번호는 학생 응답에 없으므로 '항목 n'으로만 부른다.

export type ConfirmedValue =
  | { state: 'missing' }
  | { state: 'absent'; page: number | null }
  | { state: 'value'; value: string | number; page: number | null }

export interface ConfirmedItem {
  index: number
  label: ConfirmedValue
  weightPercent: ConfirmedValue
  maxScore: ConfirmedValue
  timing: ConfirmedValue
}

export interface ConfirmedSubject {
  subjectId: string
  /** 학업 정보에서 확인한 이름. 모르면 null (지어내지 않는다) */
  subjectName: string | null
  enrolled: boolean
  writtenWeight: ConfirmedValue
  performanceWeight: ConfirmedValue
  exams: ConfirmedItem[]
  items: ConfirmedItem[]
  /** 위 규칙에 맞지 않는 확정 필드 (버리지 않고 그대로 보여 준다) */
  others: { fieldPath: string; value: ConfirmedValue }[]
}

const missing: ConfirmedValue = { state: 'missing' }
const ITEM = /^(writtenEvaluation\.exams|performanceEvaluation\.items)\[(0|[1-9]\d{0,2})]\.(label|weightPercent|maxScore|timing)$/

function toValue(field: ConfirmedPlanField): ConfirmedValue {
  if (field.value === null || field.value === undefined || field.value === '') return { state: 'absent', page: field.pdfPageNumber ?? null }
  return { state: 'value', value: field.value, page: field.pdfPageNumber ?? null }
}

function emptyItem(index: number): ConfirmedItem {
  return { index, label: missing, weightPercent: missing, maxScore: missing, timing: missing }
}

export function groupConfirmedFields(fields: ConfirmedPlanField[], context: AcademicContext | undefined): ConfirmedSubject[] {
  const bySubject = new Map<string, ConfirmedSubject>()
  const enrolledIds = new Set(context?.subjects.map((subject) => subject.subjectId) ?? [])
  const names = new Map<string, string>()
  for (const subject of context?.catalogSubjects ?? []) names.set(subject.subjectId, subject.name)
  for (const subject of context?.subjects ?? []) names.set(subject.subjectId, subject.name)

  for (const field of fields) {
    let subject = bySubject.get(field.subjectId)
    if (!subject) {
      subject = {
        subjectId: field.subjectId,
        subjectName: names.get(field.subjectId) ?? null,
        enrolled: enrolledIds.has(field.subjectId),
        writtenWeight: missing,
        performanceWeight: missing,
        exams: [],
        items: [],
        others: [],
      }
      bySubject.set(field.subjectId, subject)
    }
    const value = toValue(field)
    if (field.fieldPath === 'writtenEvaluation.weightPercent') {
      subject.writtenWeight = value
      continue
    }
    if (field.fieldPath === 'performanceEvaluation.weightPercent') {
      subject.performanceWeight = value
      continue
    }
    const match = ITEM.exec(field.fieldPath)
    if (!match) {
      subject.others.push({ fieldPath: field.fieldPath, value })
      continue
    }
    const list = match[1] === 'writtenEvaluation.exams' ? subject.exams : subject.items
    const index = Number(match[2])
    let item = list.find((candidate) => candidate.index === index)
    if (!item) {
      item = emptyItem(index)
      list.push(item)
    }
    item[match[3] as 'label' | 'weightPercent' | 'maxScore' | 'timing'] = value
  }

  const subjects = [...bySubject.values()]
  for (const subject of subjects) {
    subject.exams.sort((a, b) => a.index - b.index)
    subject.items.sort((a, b) => a.index - b.index)
  }
  // 내 수강 과목 → 이름 확인된 과목 → 이름 모르는 과목 순, 같은 묶음은 이름(또는 코드) 순
  const rank = (subject: ConfirmedSubject) => (subject.enrolled ? 0 : subject.subjectName ? 1 : 2)
  return subjects.sort((a, b) => rank(a) - rank(b) || (a.subjectName ?? a.subjectId).localeCompare(b.subjectName ?? b.subjectId, 'ko'))
}

export function unitOf(key: 'label' | 'weightPercent' | 'maxScore' | 'timing'): string {
  return key === 'weightPercent' ? '%' : key === 'maxScore' ? '점' : ''
}

/** 근거 쪽이 하나라도 있으면 첫 쪽 (과목 카드의 '원문 보기' 기본 위치) */
export function firstPageOf(subject: ConfirmedSubject): number | null {
  const values: ConfirmedValue[] = [subject.writtenWeight, subject.performanceWeight]
  for (const item of [...subject.exams, ...subject.items]) values.push(item.label, item.weightPercent, item.maxScore, item.timing)
  for (const other of subject.others) values.push(other.value)
  const pages = values.flatMap((value) => (value.state !== 'missing' && value.page ? [value.page] : []))
  return pages.length ? Math.min(...pages) : null
}
