// UI 검증용 Archive Fixture. 실제 GET /api/student/archive 대신, 같은 의미의 목록을 한 번에 돌려준다.
// - Archive를 별도로 저장하지 않는다. 원본(완료된 Task / Archived Growth Activity)에서 계산한 Projection이다. (API-OD-05)
// - source = task: 완료(8단계) Task. 최종 결과물 유무와 무관하다.
// - source = growth: Growth Activity 저장소가 아직 없어 빈 목록이다. (Growth Activity Branch에서 같은 Projection에 연결)
//   Archive 화면을 채우려고 Growth 데이터를 따로 만들지 않는다.
// - 로그인 Student(최하은)의 기록만 다룬다.

import type { ArchiveItemView, ArchiveSourceFilter, SchoolArchiveResult } from '../model/types.ts'
import { archiveTaskProjection } from './schoolFinalArtifact.fixture.ts'
import { taskStoreRevision } from './schoolTaskRepository.fixture.ts'

/** Archived Growth Activity 항목. Growth Activity 저장소가 연결되기 전까지는 비어 있다. */
function growthArchiveItems(): ArchiveItemView[] {
  return []
}

export interface SchoolArchiveQuery {
  source: ArchiveSourceFilter
  query: string
}

/** 검색: 활동 이름 · 과목(Activity Type) · Reflection 요약 (Mockup 검색 안내 범위) */
const matches = (item: ArchiveItemView, query: string) => {
  const keyword = query.trim().toLowerCase()
  if (!keyword) return true
  return [item.title, item.category, item.reflectionSummary ?? ''].some((text) => text.toLowerCase().includes(keyword))
}

export type SchoolArchiveFixtureScenario = 'success' | 'loading' | 'error' | 'empty'
const scenarios: SchoolArchiveFixtureScenario[] = ['success', 'loading', 'error', 'empty']

export function readSchoolArchiveFixtureScenario(search: string): SchoolArchiveFixtureScenario {
  const value = new URLSearchParams(search).get('fixture')
  return scenarios.find((scenario) => scenario === value) ?? 'success'
}

export type SchoolArchiveLoader = (query: SchoolArchiveQuery) => Promise<SchoolArchiveResult>
const loaders = new Map<string, SchoolArchiveLoader>()

/** 저장소가 바뀌면(최종 제출 등) 다른 Loader가 되어 다시 계산한다. */
export function createSchoolArchiveFixtureLoader(scenario: SchoolArchiveFixtureScenario): SchoolArchiveLoader {
  const key = `${scenario}|${taskStoreRevision()}`
  let loader = loaders.get(key)
  if (!loader) {
    loader = ({ source, query }) => {
      switch (scenario) {
        case 'loading':
          return new Promise<SchoolArchiveResult>(() => {})
        case 'error':
          return Promise.reject(new Error('School archive fixture error'))
        case 'empty':
        case 'success': {
          const all = scenario === 'empty' ? [] : [...archiveTaskProjection(), ...growthArchiveItems()]
          const items = all.filter((item) => (source === 'all' || item.source === source) && matches(item, query))
          return Promise.resolve({
            items,
            totalAll: all.length,
            page: { number: 0, size: items.length, totalElements: items.length, totalPages: items.length > 0 ? 1 : 0 },
          })
        }
      }
    }
    loaders.set(key, loader)
  }
  return loader
}
