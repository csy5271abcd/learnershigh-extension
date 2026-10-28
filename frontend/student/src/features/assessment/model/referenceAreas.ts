import type { ReferenceAreaKey, ReferenceCatalog, ReferenceSource } from '../api/types.ts'

// 참고자료 과목 영역 규칙 (화면 규칙, 2026-10-28). 학교 과목 이름은 영역 이름과 다르므로 별도로 연결한다.
// 서버 추천 규칙이 아니다 (P-24 PROPOSED). 알 수 없는 과목은 null → 화면이 전체를 보여주고 학생이 영역을 고른다.

export const referenceAreaKeys: ReferenceAreaKey[] = ['korean', 'math', 'social', 'science', 'chemistry', 'biology', 'software', 'history']

export function parseReferenceArea(value: string | null): ReferenceAreaKey | undefined {
  return referenceAreaKeys.find((key) => key === value)
}

/**
 * 과목 이름 → 영역. 단순 포함 검사로 잘못 고르지 않도록 구체적인 규칙을 먼저 본다
 * (예: "화학"·"생명"은 "과학"보다 먼저, "통합사회"는 "사회", "과학탐구실험"은 과학·물리).
 */
const rules: { area: ReferenceAreaKey; pattern: RegExp }[] = [
  { area: 'chemistry', pattern: /화학/ },
  { area: 'biology', pattern: /생명|생물/ },
  { area: 'software', pattern: /^정보|인공지능|프로그래밍|소프트웨어|데이터 과학/ },
  { area: 'history', pattern: /역사|한국사|세계사|동아시아사/ },
  { area: 'math', pattern: /수학|미적분|확률과 통계|기하|대수/ },
  { area: 'korean', pattern: /국어|문학|화법|작문|언어와 매체|독서/ },
  { area: 'science', pattern: /물리|통합과학|과학탐구|지구과학|^과학/ },
  { area: 'social', pattern: /사회|정치|경제|법과|윤리|지리|사회·문화/ },
]

export function referenceAreaForSubject(subjectName: string | null | undefined): ReferenceAreaKey | null {
  if (!subjectName) return null
  const name = subjectName.replace(/\s+/g, ' ').trim()
  return rules.find((rule) => rule.pattern.test(name))?.area ?? null
}

/** 영역의 자료원을 원본 순서대로 (같은 자료원은 한 번만) */
export function sourcesForArea(catalog: ReferenceCatalog, areaKey: ReferenceAreaKey): { source: ReferenceSource; usage: string }[] {
  const area = catalog.areas.find((item) => item.areaKey === areaKey)
  if (!area) return []
  const byId = new Map(catalog.sources.map((source) => [source.sourceId, source]))
  return area.sources.flatMap(({ sourceId, usage }) => {
    const source = byId.get(sourceId)
    return source ? [{ source, usage }] : []
  })
}

/** 자료원이 추천되는 영역 이름들 (카드 태그) */
export function areasOfSource(catalog: ReferenceCatalog, sourceId: string): { areaKey: ReferenceAreaKey; label: string }[] {
  return catalog.areas.filter((area) => area.sources.some((item) => item.sourceId === sourceId)).map((area) => ({ areaKey: area.areaKey, label: area.label }))
}

export function areaLabel(catalog: ReferenceCatalog | undefined, areaKey: ReferenceAreaKey): string {
  return catalog?.areas.find((area) => area.areaKey === areaKey)?.label ?? areaKey
}

export function matchesReferenceSearch(query: string, source: ReferenceSource, areaLabels: string[], usages: string[]): boolean {
  const needle = query.trim().toLocaleLowerCase('ko')
  if (!needle) return true
  return [source.name, source.nature, source.category, source.primaryUsage, ...areaLabels, ...usages].some((text) => text.toLocaleLowerCase('ko').includes(needle))
}
