import { isMockDataSource } from './dataSource.ts'
import { fixtureAsOfDate } from './mock/assessmentFixture.ts'
import { activeScenarioLabel } from './mock/mockRuntime.ts'

// 화면이 Fixture를 직접 import하지 않도록 Data Source 정보를 여기서만 노출한다.

/** D-day 기준일 (YYYY-MM-DD). Mock은 Fixture 고정 기준일, 실제 연동은 오늘(Asia/Seoul). */
export function assessmentToday(): string {
  if (isMockDataSource) return fixtureAsOfDate
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())
}

export interface MockRuntimeInfo {
  asOfDate: string
  scenario: string | null
}

/** Mock 모드가 아니면 null. */
export function mockRuntimeInfo(): MockRuntimeInfo | null {
  if (!isMockDataSource) return null
  return { asOfDate: fixtureAsOfDate, scenario: activeScenarioLabel() }
}
