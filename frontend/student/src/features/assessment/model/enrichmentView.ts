import type { EnrichmentSourceType, EnrichmentTask, MockExamSource } from '../api/types.ts'

// 심화 탐구 표시 규칙 (Business State가 아닌 표시용 파생 값).
// 진행 상태 이름·되돌리기 제한은 학교 수행평가와 같은 3개 상태 규칙을 쓰지만(§18), Entity는 따로다.

/**
 * 모의고사 탐구 카드의 과목 표시 이름. §17 Query의 `subjectId`가 가리키는 과목 목록 API가 없어(MM-28)
 * Fixture가 쓰는 시연용 ID에만 이름을 붙인다. 모르는 ID는 '기타 과목'으로 보인다.
 */
export const mockExamSubjects: { subjectId: string; name: string }[] = [
  { subjectId: 'mock_kor', name: '국어' },
  { subjectId: 'mock_eng', name: '영어' },
  { subjectId: 'mock_math', name: '수학' },
  { subjectId: 'mock_soc', name: '사회' },
  { subjectId: 'mock_sci', name: '과학' },
]

export function mockExamSubjectName(subjectId: string): string {
  return mockExamSubjects.find((subject) => subject.subjectId === subjectId)?.name ?? '기타 과목'
}

/** 원문 출처 줄. 시험 정보가 하나도 없으면 LearnersHigh 자체 제작 주제로 표시한다 (원문과 해설 구분, inquiry §4). */
export function mockExamSourceLabel(source: MockExamSource, subjectName: string): string | null {
  const parts = [
    source.academicYear ? `${source.academicYear}년` : null,
    source.examMonth ? `${source.examMonth}월` : null,
    source.grade ? `고${source.grade}` : null,
    subjectName,
    source.questionNumber ? `${source.questionNumber}번` : null,
  ]
  const hasExamInfo = source.academicYear || source.examMonth || source.grade || source.questionNumber
  return hasExamInfo ? parts.filter(Boolean).join(' ') : null
}

export const sourceTypeLabels: Record<EnrichmentSourceType, string> = {
  MOCK_EXAM_MATERIAL: '모의고사 탐구 소재',
  PERSONAL_MOCK_EXAM_MATERIAL: '내가 등록한 지문',
  UNIVERSITY_RESOURCE: '대학별 기출 자료',
}

const weekdays = ['일', '월', '화', '수', '목', '금', '토']

/** `2026-10-16T09:01:00+09:00` → `10. 16. (금)` (데이터의 Offset 날짜 그대로) */
export function formatTaskDate(iso: string): string {
  const [year, month, day] = iso.split('T')[0].split('-').map(Number)
  const weekday = weekdays[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
  return `${month}. ${day}. (${weekday})`
}

/** 공개 콘텐츠에서 시작한 학생 Task (가장 최근 것). 같은 콘텐츠로 여러 Task를 만드는 정책은 미정(API-OD-A12). */
export function taskStartedFrom(tasks: EnrichmentTask[], catalogTaskId: string): EnrichmentTask | undefined {
  return tasks
    .filter((task) => task.catalogTaskId === catalogTaskId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
}

/** 검색어 정규화 (클라이언트 표시 필터용) */
export function matchesText(query: string, ...texts: (string | null | undefined)[]): boolean {
  const needle = query.trim().toLocaleLowerCase('ko')
  return needle === '' || texts.some((text) => text?.toLocaleLowerCase('ko').includes(needle))
}
