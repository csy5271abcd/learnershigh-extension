// UI 검증용 Archive Fixture. 실제 GET /api/student/archive 대신, 같은 의미의 목록을 한 번에 돌려준다.
// - Archive를 별도로 저장하지 않는다. 원본(완료된 Task / Archived Growth Activity)에서 계산한 Projection이다. (API-OD-05)
// - source = task: 완료(8단계) Task. 최종 결과물 유무와 무관하다.
// - source = growth: Archive 저장(archived)한 Growth Activity. Activity 저장소에서 계산한다. (Archive 전용 Growth 데이터 없음)
// - 정렬: 각 원본 날짜(Task 마감일 / 활동 종료일)가 늦은 순. 완료 시각 Contract가 없어 Fixture 정렬이다.
// - 로그인 Student(최하은)의 기록만 다룬다.

import type { ArchiveItemView, ArchiveSourceFilter, SchoolArchiveResult } from '../model/types.ts'
import { activityStoreRevision, growthArchiveEntries } from './schoolActivity.fixture.ts'
import { archiveTaskEntries } from './schoolFinalArtifact.fixture.ts'
import { taskStoreRevision } from './schoolTaskRepository.fixture.ts'

/** 완료된 Task + Archive 저장한 활동 (날짜가 늦은 순) */
const archiveItems = (): ArchiveItemView[] =>
  [...archiveTaskEntries(), ...growthArchiveEntries()]
    .sort((a, b) => b.sortDate.localeCompare(a.sortDate) || a.item.sourceId.localeCompare(b.item.sourceId))
    .map(({ item }) => item)

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
  const key = `${scenario}|${taskStoreRevision()}|${activityStoreRevision()}`
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
          const all = scenario === 'empty' ? [] : archiveItems()
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
