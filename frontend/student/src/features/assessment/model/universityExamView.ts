import type {
  SubjectRef,
  UniversityExamCategory,
  UniversityExamDocument,
  UniversityExamQuestion,
  UniversityExamSectionKind,
} from '../api/types.ts'
import { referenceAreaForSubject } from './referenceAreas.ts'

// 대학별 기출 PDF 화면 규칙 (P-25 PROPOSED). 원문에 있는 값만 보여주고, 없는 값(난이도·점수·추천 학과 등)은 만들지 않는다.

export const examCategoryLabels: Record<UniversityExamCategory, string> = {
  PAST_EXAM: '실제 기출',
  SAMPLE_QUESTION: '예시 문항',
  OTHER: '기타',
}

export const examCategoryOrder: UniversityExamCategory[] = ['PAST_EXAM', 'SAMPLE_QUESTION', 'OTHER']

export const examSectionLabels: Record<UniversityExamSectionKind, string> = {
  INTENT: '출제 의도',
  BASIS: '출제 근거',
  EXPLANATION: '문항 해설',
  RUBRIC: '채점 기준',
  SAMPLE_ANSWER: '예시 답안',
  REVIEW: '총평',
}

/** 문제를 먼저 읽도록, 해설·채점 기준·예시 답안·총평은 기본으로 접어 둔다 */
export const answerSectionKinds = new Set<UniversityExamSectionKind>(['EXPLANATION', 'RUBRIC', 'SAMPLE_ANSWER', 'REVIEW'])

export function pageRangeLabel(start: number, end: number | null): string {
  return end && end !== start ? `${start}–${end}쪽` : `${start}쪽`
}

/** 문항 이름: 원문 표기에 분야가 없으면 분야를 앞에 붙인다 (예: "물리학 · 문제 1", "수학 A", "의과대학") */
export function questionDisplayLabel(question: Pick<UniversityExamQuestion, 'label' | 'field'>): string {
  const { label, field } = question
  if (!field || label.includes(field) || field.includes(label)) return label
  if (field.startsWith('수학') && label.startsWith('수학')) return label
  return `${field} · ${label}`
}

/** 문서의 원문 개념 (문항 개념 칸을 순서대로, 중복 없이) */
export function documentConcepts(document: UniversityExamDocument): string[] {
  return [...new Set(document.questions.flatMap((question) => question.concepts))]
}

/** 카드에 쓸 짧은 주제 줄: 개념이 있으면 개념, 없으면 원문 지문 제목·분야 이름 */
export function documentHighlights(document: UniversityExamDocument, limit = 4): string[] {
  const concepts = documentConcepts(document)
  if (concepts.length > 0) return concepts.slice(0, limit)
  const topics = document.questions.flatMap((question) => (question.topic ? [question.topic] : []))
  if (topics.length > 0) return topics.slice(0, limit)
  return document.questions.flatMap((question) => (question.field ? [question.field] : [])).slice(0, limit)
}

/** 문서 목록 검색 (문서 제목·대학·과목·원문 개념·문항 이름). PDF 본문 전체 검색이 아니다. */
export function matchesExamSearch(document: UniversityExamDocument, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase('ko')
  if (!needle) return true
  const texts = [
    document.title,
    document.university,
    document.universityName,
    document.examType,
    String(document.academicYear),
    ...document.subjectAreas,
    ...document.questions.flatMap((question) => [question.label, question.field ?? '', question.topic ?? '', ...question.concepts]),
  ]
  return texts.some((text) => text.toLocaleLowerCase('ko').includes(needle))
}

/** 그 쪽이 속한 문항 (다음 문항 시작 전까지). 문항 인덱스가 없거나 앞부분(표지 등)이면 null */
export function questionAtPage(document: UniversityExamDocument, page: number): UniversityExamQuestion | null {
  const sorted = [...document.questions].sort((a, b) => a.pageStart - b.pageStart)
  let found: UniversityExamQuestion | null = null
  for (const question of sorted) {
    if (question.pageStart <= page) found = question
    else break
  }
  return found
}

/** 그 쪽에서 시작하는 원문 구획 이름 (예: 3쪽 = 문항 해설·채점 기준) */
export function sectionsAtPage(question: UniversityExamQuestion | null, page: number): string[] {
  if (!question) return []
  const labels = question.sections.filter((section) => section.page === page).map((section) => examSectionLabels[section.kind])
  if (question.pageStart === page) labels.unshift('문제·제시문')
  return labels
}

export function universityLine(document: UniversityExamDocument): string {
  return document.university === document.universityName ? document.university : `${document.university} (${document.universityName})`
}

/** 출처 한 줄: "KAIST · 2026학년도 · 물리학 · 문제 1 · PDF 1쪽" */
export function examSourceLine(document: UniversityExamDocument, question: UniversityExamQuestion | null, pageStart: number, pageEnd: number | null = null): string {
  const parts = [document.university, `${document.academicYear}학년도`]
  if (question) parts.push(questionDisplayLabel(question))
  else parts.push(document.examType)
  parts.push(`PDF ${pageRangeLabel(pageStart, pageEnd)}`)
  return parts.join(' · ')
}

/**
 * 탐구를 만들 때 미리 고를 학생 과목: 문항 분야와 같은 영역(referenceAreas 규칙)의 이번 학기 과목이 하나뿐일 때만.
 * 여러 개이거나 없으면 고르지 않는다 (학생이 직접 고른다).
 */
export function suggestedSubjectId(subjects: SubjectRef[], field: string | null): string | undefined {
  const area = referenceAreaForSubject(field)
  if (!area) return undefined
  const matches = subjects.filter((subject) => referenceAreaForSubject(subject.name) === area)
  return matches.length === 1 ? matches[0].subjectId : undefined
}

export function formatFileSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`
}
