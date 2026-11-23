import { ApiError } from './apiError.ts'
import { isMockDataSource } from './dataSource.ts'
import { assessmentHttp } from './http/assessmentHttpClient.ts'
import { guardWrite, isAssessmentReadOnlyView } from './viewMode.ts'
import type { CalendarPlacement } from './types.ts'

// A28-33 학생 달력 개인 임시 배치 (api-contract §30-b, 2026-11-23 DRAFT). 학생 본인 데이터만(관리자 Endpoint 없음).
// Mock 모드는 이 탭 메모리에만 둔다(서버 저장 아님 — 화면 개발용).

const path = '/api/student/assessment/calendar-placements'
const query = (academicYear: number, semester: number) => `?academicYear=${academicYear}&semester=${semester}`
const mock = new Map<string, CalendarPlacement>()
const mockKey = (academicYear: number, semester: number, sourceKey: string) => `${academicYear}|${semester}|${sourceKey}`

/** §30-b GET. 관리자 학생 화면 보기에서는 학생 개인 배치를 읽지 않는다(기본 배치로 보임) */
export function listCalendarPlacements(academicYear: number, semester: number): Promise<{ items: CalendarPlacement[] }> {
  if (isAssessmentReadOnlyView()) {
    return Promise.reject(new ApiError(403, { code: 'READ_ONLY_VIEW', message: '관리자 보기에서는 학생 개인 배치를 보여 주지 않아요.', details: {} }))
  }
  if (isMockDataSource) {
    const prefix = `${academicYear}|${semester}|`
    return Promise.resolve({ items: [...mock].filter(([key]) => key.startsWith(prefix)).map(([, value]) => ({ ...value })) })
  }
  return assessmentHttp<{ items: CalendarPlacement[] }>(`${path}${query(academicYear, semester)}`)
}

/** §30-b PUT (같은 키 덮어쓰기) */
export function saveCalendarPlacement(input: { academicYear: number; semester: number; sourceKey: string; displayDate: string; rangeFrom: string; rangeTo: string }): Promise<CalendarPlacement> {
  return guardWrite('saveCalendarPlacement', () => {
    if (isMockDataSource) {
      const saved = { sourceKey: input.sourceKey, displayDate: input.displayDate, rangeFrom: input.rangeFrom, rangeTo: input.rangeTo, updatedAt: new Date().toISOString() }
      mock.set(mockKey(input.academicYear, input.semester, input.sourceKey), saved)
      return Promise.resolve({ ...saved })
    }
    return assessmentHttp<CalendarPlacement>(path, { method: 'PUT', json: input })
  })
}

/** §30-b DELETE — 그 학기 배치 초기화 */
export function resetCalendarPlacements(academicYear: number, semester: number): Promise<void> {
  return guardWrite('resetCalendarPlacements', () => {
    if (isMockDataSource) {
      const prefix = `${academicYear}|${semester}|`
      for (const key of [...mock.keys()]) if (key.startsWith(prefix)) mock.delete(key)
      return Promise.resolve()
    }
    return assessmentHttp<void>(`${path}${query(academicYear, semester)}`, { method: 'DELETE' })
  })
}
