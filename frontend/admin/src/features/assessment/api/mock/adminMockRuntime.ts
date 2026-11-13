import { ApiError, fixtureAsOfDate } from '../canonicalSource.ts'

// Admin Assessment Mock 실행 환경: 지연, 개발용 시나리오, 고정 기준일 (assessment-frontend-mock.md §7, Student mockRuntime과 같은 규칙).
// 시나리오는 URL Query `?mockScenario=a,b`. 이름 끝이 `Once`이면 첫 호출만 실패한다 (실패 → 재시도 → 성공 확인).

export type AdminMockScenario =
  | 'slow'
  | 'empty'
  | 'listError'
  | 'detailError'
  | 'feedbackListError'
  | 'draftSaveError'
  | 'deliverError'
  | 'deliverErrorOnce'
  | 'uploadError'
  | 'analysisError'
  | 'contentSaveError'
  | 'scrapSaveError'
  | 'studentCustomSubject'

/** VITE_ASSESSMENT_DATA_SOURCE = 'mock' | 'http'. 지정이 없으면 개발 서버는 mock, Production Build는 http (assessment-frontend-mock.md §3) */
const configuredSource = import.meta.env.VITE_ASSESSMENT_DATA_SOURCE as string | undefined
export const isAdminMockDataSource = configuredSource === 'mock' || (configuredSource !== 'http' && import.meta.env.DEV)

const onceUsed = new Set<string>()

function activeScenarios(): string[] {
  const value = new URLSearchParams(window.location.search).get('mockScenario')
  return value ? value.split(',').map((item) => item.trim()).filter(Boolean) : []
}

export function scenarioActive(name: AdminMockScenario): boolean {
  if (!activeScenarios().includes(name)) return false
  if (!name.endsWith('Once')) return true
  if (onceUsed.has(name)) return false
  onceUsed.add(name)
  return true
}

export function activeScenarioLabel(): string | null {
  const list = activeScenarios()
  return list.length ? list.join(', ') : null
}

/** 응답 지연을 흉내 낸다. 결과는 매번 복사해 화면이 Store 객체를 직접 바꾸지 못하게 한다. */
export function respond<T>(produce: () => T): Promise<T> {
  // Stage 2 http Adapter가 없으므로 Mock 모드가 아니면 "연결 전" 오류를 돌려준다 (배포물에서 Mock이 조용히 실행되지 않게, Student와 같은 규칙)
  if (!isAdminMockDataSource) return Promise.reject(new ApiError(503, { code: 'ASSESSMENT_API_NOT_CONNECTED', message: 'Assessment 서버가 아직 연결되지 않았어요.' }))
  const delay = activeScenarios().includes('slow') ? 1400 : 220
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      try {
        resolve(structuredClone(produce()))
      } catch (error) {
        reject(error)
      }
    }, delay)
  })
}

export function fail(status: number, code: string, message: string): never {
  throw new ApiError(status, { code, message })
}

/** 고정 기준일 + 지금 시각 (KST). D-day 등은 기준일로 계산한다 (testing.md §14) */
export function mockNow(): string {
  const now = new Date()
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()].map((value) => String(value).padStart(2, '0')).join(':')
  return `${fixtureAsOfDate}T${time}+09:00`
}

let sequence = 0
export function nextMockId(prefix: string): string {
  sequence += 1
  return `${prefix}_admin_${Date.now().toString(36)}${sequence}`
}

export const mockAsOfDate = fixtureAsOfDate
