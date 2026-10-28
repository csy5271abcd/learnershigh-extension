import type { ReferenceCatalog } from '../types.ts'
import { fail, respond, scenarioActive } from './mockRuntime.ts'
import { fixtureReferenceAreas, fixtureReferenceSources, referenceSourcesBasis } from './referenceSourcesFixture.ts'

// 참고자료 자료원 카탈로그 Mock (계약 없음, P-24 PROPOSED). 화면은 이 응답 하나만 쓴다.
export function getReferenceCatalogMock(): Promise<ReferenceCatalog> {
  return respond(() => {
    if (scenarioActive('referenceCatalogError')) fail(500, { code: 'INTERNAL_ERROR', message: '참고자료를 불러오지 못했어요.', details: {} })
    return { sources: structuredClone(fixtureReferenceSources), areas: structuredClone(fixtureReferenceAreas), basis: { ...referenceSourcesBasis } }
  })
}
