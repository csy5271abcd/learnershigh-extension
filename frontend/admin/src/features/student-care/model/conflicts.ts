import type { ApiError } from '../api/apiClient.ts'

/**
 * 화면이 보던 상태 / 기준일이 서버와 달라져 생기는 오류 (65-4, 65-6, §5 CONCURRENT_MODIFICATION).
 * 이 오류가 나면 상세 · 보드 · 요약을 모두 다시 불러오고, 안내는 페이지에 남긴다 (다시 불러온 뒤 버튼이 사라질 수 있으므로).
 */
const STALE_CODES: ReadonlySet<string> = new Set([
  'ACTIVE_CARE_CASE_EXISTS',
  'STUDENT_NOT_FLAGGED',
  'INVALID_STATE_TRANSITION',
  'RECHECK_NOT_DUE',
  'CONCURRENT_MODIFICATION',
  'INVALID_RECHECK_DATE',
])

export function isStale(code: string): boolean {
  return STALE_CODES.has(code)
}

/**
 * 재점검일 오류는 페이지 안내와 함께 그 칸에도 표시하고 Focus를 그 칸으로 옮긴다 (다시 고르면 되므로).
 * 나머지 상태 오류는 다시 불러온 뒤 그 칸이 없을 수 있으므로 페이지 안내에만 보여준다.
 */
export function staysAtField(error: ApiError): boolean {
  return error.code === 'INVALID_RECHECK_DATE'
}

/** 상태 오류 뒤 페이지에 남길 안내 (서버 문구 + 다시 불러온다는 사실). */
export function staleMessage(error: ApiError): string {
  return `${error.message} 최신 상태를 다시 불러옵니다.`
}
