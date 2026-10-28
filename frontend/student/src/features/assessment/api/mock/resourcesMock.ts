import type {
  CreateResourceRequest,
  PageResponse,
  RecommendedSource,
  StudentResource,
  UpdateResourceRequest,
} from '../types.ts'
import { referenceAreaForSubject, sourcesForArea } from '../../model/referenceAreas.ts'
import { fixtureReferenceAreas, fixtureReferenceSources, referenceSourcesBasis } from './referenceSourcesFixture.ts'
import { fail, mockNow, nextMockId, respond, scenarioActive } from './mockRuntime.ts'
import { mockStore } from './mockStore.ts'

// §22 참고자료 추천·자료함 Mock. 학생 자료는 본인 것만 있는 개인 Store 배열이다.
// URL은 형식만 검사한다. 실제 페이지가 있는지·열리는지는 확인하지 않는다.

/** Mockup RL-ADD-01의 유형 후보 (계약 Enum 미확정, MM-31) */
const knownTypes = new Set(['LINK', 'ARTICLE', 'PAPER', 'BOOK', 'VIDEO', 'PDF', 'IMAGE'])
const urlPattern = /^https?:\/\/[^\s]+\.[^\s]+/
const datePattern = /^\d{4}(-\d{2}(-\d{2})?)?$/

const serverError = (message = '일시적인 서버 오류가 발생했어요.') =>
  fail(500, { code: 'INTERNAL_ERROR', message, details: {} })

function validate(fields: Partial<CreateResourceRequest>, requireAll: boolean) {
  const errors: { field: string; reason: string }[] = []
  if (requireAll || fields.title !== undefined) {
    if (!fields.title?.trim()) errors.push({ field: 'title', reason: 'required' })
  }
  if (requireAll || fields.type !== undefined) {
    if (!fields.type || !knownTypes.has(fields.type)) errors.push({ field: 'type', reason: 'unknown' })
  }
  if (fields.sourceUrl && !urlPattern.test(fields.sourceUrl)) errors.push({ field: 'sourceUrl', reason: 'format' })
  if (fields.publishedDate && !datePattern.test(fields.publishedDate)) errors.push({ field: 'publishedDate', reason: 'format' })
  if (fields.tags && fields.tags.some((tag) => tag.length > 20)) errors.push({ field: 'tags', reason: 'tooLong' })
  if (errors.length > 0) {
    fail(400, { code: 'VALIDATION_ERROR', message: '입력값을 확인해주세요.', details: { fields: errors } })
  }
}

const clean = (value: string | null | undefined) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function listRecommendedSourcesMock(query: { subjectId: string; query?: string }): Promise<{ items: RecommendedSource[] }> {
  return respond(() => {
    if (scenarioActive('resourceRecommendationError')) serverError('추천 자료원을 불러오지 못했어요.')
    const needle = query.query?.trim().toLocaleLowerCase('ko')
    // 과목 → 참고자료 영역 → 자료원 카탈로그(원본 문서 기준 24곳) 한 곳에서 만든다. 화면마다 따로 하드코딩하지 않는다.
    const subjectName = mockStore.academicContexts.flatMap((context) => context.subjects).find((subject) => subject.subjectId === query.subjectId)?.name
    const areaKey = referenceAreaForSubject(subjectName)
    const recommended: RecommendedSource[] = areaKey
      ? sourcesForArea({ sources: fixtureReferenceSources, areas: fixtureReferenceAreas, basis: referenceSourcesBasis }, areaKey).map(({ source, usage }) => ({
          sourceName: source.name,
          category: source.category,
          homepageUrl: source.url,
          description: usage,
          // 원본 문서에 검색어가 없어 만들지 않는다.
          searchKeywords: [],
        }))
      : []
    const items = recommended.filter(
      (source) => !needle || [source.sourceName, source.category, ...source.searchKeywords].some((text) => text.toLocaleLowerCase('ko').includes(needle)),
    )
    return { items }
  })
}

export function listResourcesMock(query: { query?: string; type?: string; page: number; size: number }): Promise<PageResponse<StudentResource>> {
  return respond(() => {
    if (scenarioActive('resourceListError')) serverError()
    const needle = query.query?.trim().toLocaleLowerCase('ko')
    const matched = (scenarioActive('resourceEmpty') ? [] : mockStore.resources)
      .filter((item) => !query.type || item.type === query.type)
      .filter(
        (item) =>
          !needle ||
          [item.title, item.sourceName, item.author, item.memo, ...item.tags].some((text) => text?.toLocaleLowerCase('ko').includes(needle)),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const start = query.page * query.size
    return {
      items: matched.slice(start, start + query.size),
      page: { number: query.page, size: query.size, totalElements: matched.length, totalPages: Math.ceil(matched.length / query.size) },
    }
  })
}

function findResource(resourceId: string): StudentResource {
  const item = mockStore.resources.find((entry) => entry.resourceId === resourceId)
  if (!item) fail(404, { code: 'RESOURCE_NOT_FOUND', message: '자료를 찾을 수 없어요.', details: {} })
  return item
}

export function getResourceMock(resourceId: string): Promise<StudentResource> {
  return respond(() => {
    if (scenarioActive('resourceDetailError')) serverError()
    return findResource(resourceId)
  })
}

export function createResourceMock(request: CreateResourceRequest): Promise<StudentResource> {
  return respond(() => {
    if (scenarioActive('resourceCreateError')) serverError('일시적인 서버 오류로 자료를 저장하지 못했어요.')
    validate(request, true)
    const now = mockNow()
    const record: StudentResource = {
      resourceId: nextMockId('resource'),
      type: request.type,
      title: request.title.trim(),
      sourceName: clean(request.sourceName),
      sourceUrl: clean(request.sourceUrl),
      author: clean(request.author),
      publishedDate: clean(request.publishedDate),
      memo: clean(request.memo),
      tags: request.tags.map((tag) => tag.trim()).filter(Boolean),
      // 파일 저장소가 없어 Mock은 파일 참조를 받지 않는다 (§48·API-OD-A03).
      fileRef: null,
      createdAt: now,
      updatedAt: now,
    }
    mockStore.resources.push(record)
    return record
  })
}

export function updateResourceMock(resourceId: string, request: UpdateResourceRequest): Promise<StudentResource> {
  return respond(() => {
    if (scenarioActive('resourceUpdateError')) serverError('일시적인 서버 오류로 수정하지 못했어요.')
    const item = findResource(resourceId)
    validate(request, false)
    if (request.type !== undefined) item.type = request.type
    if (request.title !== undefined) item.title = request.title.trim()
    if (request.sourceName !== undefined) item.sourceName = clean(request.sourceName)
    if (request.sourceUrl !== undefined) item.sourceUrl = clean(request.sourceUrl)
    if (request.author !== undefined) item.author = clean(request.author)
    if (request.publishedDate !== undefined) item.publishedDate = clean(request.publishedDate)
    if (request.memo !== undefined) item.memo = clean(request.memo)
    if (request.tags !== undefined) item.tags = request.tags.map((tag) => tag.trim()).filter(Boolean)
    item.updatedAt = mockNow()
    return item
  })
}
