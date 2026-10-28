import type { AcademicContext, ArchiveItem, ArchiveSourceType, ArchiveTab, GrowthRecord } from '../api/types.ts'
import { statusLabels } from './schoolAssessmentView.ts'

// 성장 기록(§29)·보관함(§30) 화면 표시 규칙. 데이터는 API 응답만 쓰고 여기서는 이름·묶음만 만든다.

export const relatedSourceLabels: Record<ArchiveSourceType, string> = {
  SCHOOL_ASSESSMENT: '학교 수행평가',
  ENRICHMENT_TASK: '심화 탐구',
  // 탐구 라이브러리 공개 콘텐츠 즐겨찾기 (Mock 전용 제안 P-22)
  ENRICHMENT_CATALOG: '심화 탐구 라이브러리',
}

/** §29 요청 필드의 화면 이름. 목록 카드는 Mockup GR-LIST-01의 네 항목만, 상세는 입력한 항목 전부를 보여준다. */
export const growthTextFields = [
  { field: 'role', label: '내 역할' },
  { field: 'motivation', label: '시작한 계기' },
  { field: 'process', label: '진행 과정' },
  { field: 'contribution', label: '내가 기여한 점' },
  { field: 'difficulty', label: '어려웠던 점' },
  { field: 'solution', label: '해결한 문제' },
  { field: 'outcome', label: '결과' },
  { field: 'reflection', label: '배운 점' },
  { field: 'followUp', label: '추가 탐구' },
] as const

export type GrowthTextField = (typeof growthTextFields)[number]['field']

export const growthCardFields: GrowthTextField[] = ['role', 'solution', 'reflection', 'followUp']

/** 모든 학기 학업 정보에서 과목 이름을 찾는다 (지난 학기 과목 포함). 못 찾으면 null */
export function subjectNameIn(contexts: AcademicContext[], subjectId: string | null): string | null {
  if (!subjectId) return null
  for (const context of contexts) {
    const subject = context.subjects.find((item) => item.subjectId === subjectId)
    if (subject) return subject.name
  }
  return null
}

export interface GrowthTermGroup {
  key: string
  label: string
  records: GrowthRecord[]
}

/**
 * Mockup처럼 학기별로 묶는다. §29 응답에는 학기가 없어(MM-37), 과목이 속한 학기 학업 정보(§9-1)로 학기를 정한다.
 * 과목이 없거나 학기를 알 수 없는 기록은 "학기 미지정"으로 마지막에 둔다.
 */
export function groupGrowthRecordsByTerm(records: GrowthRecord[], contexts: AcademicContext[]): GrowthTermGroup[] {
  const groups = new Map<string, GrowthTermGroup & { order: number }>()
  for (const record of records) {
    const context = record.subjectId ? contexts.find((item) => item.subjects.some((s) => s.subjectId === record.subjectId)) : undefined
    const key = context ? `${context.academicYear}-${context.semester}` : 'none'
    const group = groups.get(key) ?? {
      key,
      label: context ? `${context.academicYear}학년도 ${context.semester}학기` : '학기 미지정',
      order: context ? context.academicYear * 10 + context.semester : -1,
      records: [],
    }
    group.records.push(record)
    groups.set(key, group)
  }
  return [...groups.values()].sort((a, b) => b.order - a.order).map(({ key, label, records: items }) => ({ key, label, records: items }))
}

export const archiveTabs: { tab: ArchiveTab; label: string }[] = [
  { tab: 'recent', label: '최근 기록' },
  { tab: 'favorites', label: '즐겨찾기' },
  { tab: 'completed', label: '완료' },
  { tab: 'previous-semesters', label: '이전 학기' },
  { tab: 'trash', label: '휴지통' },
]

export function parseArchiveTab(value: string | null): ArchiveTab {
  return archiveTabs.find((item) => item.tab === value)?.tab ?? 'recent'
}

/** 보관함 행 메타 (Mockup AR-TAB: "과목 · 학교 수행평가 · 완료", 이전 학기는 "과목 · 2026학년도 1학기 · 완료") */
export function archiveMetaLine(
  item: ArchiveItem,
  subjectName: string | null,
  tab: ArchiveTab,
  currentTerm?: { academicYear: number; semester: number },
): string {
  const status = item.status && item.status in statusLabels ? statusLabels[item.status as keyof typeof statusLabels] : null
  // 지난 학기 항목은 어느 탭이든 그 학기를 보여준다 (AUD-034). 학기는 원본의 학년도·학기만 쓰고 수정일로 추측하지 않는다.
  const isPreviousTerm =
    item.academicYear !== null &&
    item.semester !== null &&
    (tab === 'previous-semesters' || (currentTerm !== undefined && (item.academicYear !== currentTerm.academicYear || item.semester !== currentTerm.semester)))
  const middle = isPreviousTerm
    ? `${item.academicYear}학년도 ${item.semester}학기`
    : relatedSourceLabels[item.sourceType]
  return [subjectName, middle, status].filter(Boolean).join(' · ')
}

/** 보관함 과목 폴더: 지금 받은 목록 안의 과목별 건수 (계약에 사용자 폴더가 없어 과목만 둔다, MM-41) */
export function countArchiveSubjects(items: ArchiveItem[]): { subjectId: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const item of items) if (item.subjectId) counts.set(item.subjectId, (counts.get(item.subjectId) ?? 0) + 1)
  return [...counts.entries()].map(([subjectId, count]) => ({ subjectId, count }))
}
