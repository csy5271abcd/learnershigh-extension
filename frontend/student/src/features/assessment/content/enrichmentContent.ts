import { fixtureAcademicContexts } from '../api/mock/assessmentFixture.ts'
import { fixtureCatalog } from '../api/mock/enrichmentFixture.ts'
import { fixtureMockExamResearch } from '../api/mock/mockExamResearchFixture.ts'
import { withLocalMockExamPassages } from '../api/mock/mockExamPassages.ts'
import { fixtureReferenceAreas, fixtureReferenceSources, referenceSourcesBasis } from '../api/mock/referenceSourcesFixture.ts'
import { universityExamDocuments } from '../api/mock/universityExamMock.ts'
import type { EnrichmentCatalogItem, MockExamMaterial, RecommendedSource, ReferenceCatalog, UniversityExamDocument } from '../api/types.ts'
import { referenceAreaForSubject, sourcesForArea } from '../model/referenceAreas.ts'

// 심화 탐구 정적 참고자료 (features/assessment-enrichment-content.md §6, assessment-frontend-mock.md §4-3).
// - Contract Mock이 아니다. Backend·API가 없는 Frontend 정적 콘텐츠이며 `dataSource`(mock|http) 스위치와 무관하다.
//   http 모드에서도 "서버 연결 전(503)"을 내지 않는다. 학교 수행평가 등 다른 Resource에는 이 방식을 쓰지 않는다.
// - 위치는 §6-2의 승인 전 임시 위치다(`frontend/shared/assessment/content/`는 P-07·P-38 승인 대기).
//   원본 데이터 파일은 Admin(`canonicalSource.ts`)도 같은 경로로 읽으므로 이번에 옮기지 않았다(새 복제 금지).
// - 읽기 전용이다. 학생 개인 데이터(Task·진행 상태·즐겨찾기)를 만들지 않는다.
// - 모의고사 원문은 Git 제외 로컬 파일(`mockExamPassages.local.json`)이 있을 때만 붙는다. 없으면 빈 문자열 → 화면이 "원문 미포함"을 안내한다.

const subjectNames = new Map(fixtureAcademicContexts.flatMap((context) => context.subjects.map((subject) => [subject.subjectId, subject.name] as const)))

/** 콘텐츠의 교과 표시 이름. 학생 학기별 과목(예: 통합사회2)이 아니라 교과(통합사회)로 보여준다. 학생 학업 정보와 무관하다. */
function subjectLabelOf(subjectId: string): string {
  const name = subjectNames.get(subjectId)
  return name ? name.replace(/\d+$/, '') : '교과 미지정'
}

export interface EnrichmentContentItem extends EnrichmentCatalogItem {
  subjectLabel: string
}

const catalogContent: readonly EnrichmentContentItem[] = fixtureCatalog
  .filter((item) => item.published)
  .map((item) => ({ ...structuredClone(item), subjectLabel: subjectLabelOf(item.subjectId) }))

const mockExamContent: readonly MockExamMaterial[] = withLocalMockExamPassages(structuredClone(fixtureMockExamResearch))

const matchesQuery = (query: string | undefined, ...texts: string[]) => {
  const needle = query?.trim().toLocaleLowerCase('ko')
  return !needle || texts.some((text) => text.toLocaleLowerCase('ko').includes(needle))
}

/** 탐구 라이브러리에서 쓰는 교과 목록 (콘텐츠에 실제로 있는 값만, 순서는 콘텐츠 순서) */
export function catalogSubjectLabels(): string[] {
  return [...new Set(catalogContent.map((item) => item.subjectLabel))]
}

export function listCatalogContent(filter: { subjectLabel?: string; query?: string }): EnrichmentContentItem[] {
  return catalogContent.filter(
    (item) =>
      (!filter.subjectLabel || item.subjectLabel === filter.subjectLabel) &&
      matchesQuery(filter.query, item.title, item.goal, item.subjectLabel, ...item.methods),
  )
}

export function getCatalogContent(catalogTaskId: string): EnrichmentContentItem | null {
  return catalogContent.find((item) => item.catalogTaskId === catalogTaskId) ?? null
}

/** 모의고사 60선 (영어 30·국어 30). 과목은 콘텐츠 자체의 과목 ID(mock_eng·mock_kor)로 거른다. */
export function listMockExamContent(filter: { subjectId?: string; query?: string }): MockExamMaterial[] {
  return mockExamContent.filter(
    (item) =>
      (!filter.subjectId || item.subjectId === filter.subjectId) &&
      matchesQuery(filter.query, item.idea.topicTitle, item.idea.coreMaterial, item.research?.examTitle ?? '', ...item.idea.relatedFields),
  )
}

export function getMockExamContent(materialId: string): MockExamMaterial | null {
  return mockExamContent.find((item) => item.materialId === materialId) ?? null
}

/** 원문 지문이 이 환경에 포함됐는지 (로컬 전용 파일) */
export function mockExamPassageCount(): number {
  return mockExamContent.filter((item) => Boolean(item.research?.passage)).length
}

/** 대학별 자료 (Manifest 메타데이터). 원문 PDF는 개발 서버 전용 경로로만 열린다. */
export function listUniversityExamContent(): UniversityExamDocument[] {
  return universityExamDocuments
}

export function getUniversityExamContent(documentId: string): UniversityExamDocument | null {
  return universityExamDocuments.find((item) => item.documentId === documentId) ?? null
}

/** 과목별 참고자료 자료원 카탈로그 (P-24, Endpoint 없음) */
export function getReferenceCatalogContent(): ReferenceCatalog {
  return { sources: structuredClone(fixtureReferenceSources), areas: structuredClone(fixtureReferenceAreas), basis: { ...referenceSourcesBasis } }
}

/**
 * 과목별 추천 자료원 (검토된 정적 카탈로그, 2026-11-11). AI 추천이 아니다.
 * 과목 ID가 아니라 과목 이름을 영역으로 정규화한다(model/referenceAreas.ts) → 학교마다 과목 ID가 달라도 같은 규칙.
 * 영역을 알 수 없는 과목(예: 영어·예체능)은 어느 과목에도 쓰이는 일반 자료원(공식 기관·논문·학술)으로 대신하고 basis='general'로 알린다.
 * 원문 문서에 검색어가 없어 searchKeywords는 비워 둔다(만들지 않는다).
 */
export function recommendedSourcesForSubject(subjectName: string | null | undefined, query?: string): { basis: 'subject' | 'general' | 'none'; areaLabel: string | null; items: RecommendedSource[] } {
  const catalog = getReferenceCatalogContent()
  const areaKey = referenceAreaForSubject(subjectName)
  const needle = query?.trim().toLocaleLowerCase('ko')
  const keep = (source: RecommendedSource) =>
    !needle || [source.sourceName, source.category, source.description].some((text) => text.toLocaleLowerCase('ko').includes(needle))
  if (areaKey) {
    const items = sourcesForArea(catalog, areaKey)
      .map(({ source, usage }) => ({ sourceName: source.name, category: source.category, homepageUrl: source.url, description: usage, searchKeywords: [] }))
      .filter(keep)
    return { basis: 'subject', areaLabel: catalog.areas.find((area) => area.areaKey === areaKey)?.label ?? null, items }
  }
  const general = catalog.sources
    .filter((source) => source.category === '공식 기관' || source.category === '논문·학술')
    .filter((source) => ['국립중앙도서관', 'RISS 학술연구정보서비스', 'DBpia', 'ScienceON', 'KOSIS 국가통계포털'].some((name) => source.name.startsWith(name)) || source.category === '논문·학술')
    .map((source) => ({ sourceName: source.name, category: source.category, homepageUrl: source.url, description: source.primaryUsage, searchKeywords: [] }))
    .filter(keep)
  return { basis: general.length ? 'general' : 'none', areaLabel: null, items: general }
}
