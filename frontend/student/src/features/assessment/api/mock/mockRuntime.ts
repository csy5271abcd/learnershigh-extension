import { ApiError } from '../apiError.ts'
import type { ApiErrorBody } from '../types.ts'
import { fixtureAsOfDate } from './assessmentFixture.ts'

// Mock 실행 환경: 지연, 개발용 시나리오, 고정 시계.
// 시나리오는 URL Query `?mockScenario=a,b`로 고른다 (Mock 모드에서만 읽는다, assessment-frontend-mock.md §7).
// 이름 끝이 `Once`이면 첫 호출에서만 실패한다 (실패 → 재시도 → 성공 검증용, testing.md §15).

export type MockScenario =
  | 'slow'
  | 'empty'
  | 'listError'
  | 'contextError'
  | 'createError'
  | 'createValidation'
  | 'academicLocked'
  | 'statusConflict'
  | 'noteError'
  | 'artifactError'
  | 'uploadError'
  | 'feedbackListError'
  | 'feedbackEmpty'
  | 'feedbackError'
  | 'enrichmentEmpty'
  | 'catalogError'
  | 'catalogDetailError'
  | 'taskListError'
  | 'taskCreateError'
  | 'materialError'
  | 'universityError'
  | 'resourceEmpty'
  | 'resourceListError'
  | 'resourceDetailError'
  | 'resourceRecommendationError'
  | 'resourceCreateError'
  | 'resourceUpdateError'
  | 'noteSaveError'
  | 'noteConflict'
  | 'growthEmpty'
  | 'growthListError'
  | 'growthSaveError'
  | 'archiveError'
  | 'archiveTrashDemo'
  | 'favoriteError'
  | 'evaluationPlanListError'
  | 'evaluationPlanEmpty'
  | 'evaluationPlanOtherSchool'
  | 'evaluationPlanUploadError'
  | 'analysisRequestError'
  | 'analysisLoadError'
  | 'analysisSlow'
  | 'analysisFailed'
  | 'analysisNoResult'
  | 'personalReviewError'

const consumedOnce = new Set<string>()

function activeScenarioTokens(): string[] {
  if (typeof window === 'undefined') return []
  const raw = new URLSearchParams(window.location.search).get('mockScenario')
  return raw ? raw.split(',').map((token) => token.trim()).filter(Boolean) : []
}

/** 시나리오가 켜져 있으면 true. `xxxOnce`는 처음 한 번만 true를 돌려준다. */
export function scenarioActive(name: MockScenario): boolean {
  const tokens = activeScenarioTokens()
  if (tokens.includes(name)) return true
  const onceToken = `${name}Once`
  if (tokens.includes(onceToken) && !consumedOnce.has(onceToken)) {
    consumedOnce.add(onceToken)
    return true
  }
  return false
}

export function activeScenarioLabel(): string | null {
  const tokens = activeScenarioTokens()
  return tokens.length > 0 ? tokens.join(', ') : null
}

/** 실제 Network 왕복처럼 응답을 비동기로 돌려준다. 결과는 호출 측이 바꿔도 Store에 영향이 없도록 복사한다. */
export function respond<T>(produce: () => T): Promise<T> {
  const latency = scenarioActive('slow') ? 2500 : 280
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      try {
        resolve(structuredClone(produce()))
      } catch (error) {
        reject(error)
      }
    }, latency)
  })
}

export function fail(status: number, body: ApiErrorBody): never {
  throw new ApiError(status, body)
}

// 고정 시계: 기준일 오전 9시에서 시작해 Mock 명령마다 1분씩 진행한다. 실행 시점의 현재 시간을 쓰지 않는다.
let clockTick = 0
export function mockNow(): string {
  clockTick += 1
  const hours = 9 + Math.floor(clockTick / 60)
  const minutes = clockTick % 60
  return `${fixtureAsOfDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+09:00`
}

let idSequence = 0
export function nextMockId(prefix: string): string {
  idSequence += 1
  return `${prefix}_mock_${String(idSequence).padStart(3, '0')}`
}
