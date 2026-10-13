import type { ApiError } from '../api/apiClient.ts'
import { isStale, staysAtField } from './conflicts.ts'

/** 입력 칸에 붙일 오류 속성. 오류가 없으면 아무것도 붙이지 않는다. */
export function invalidProps(errorId: string, message: string | null) {
  return message ? { 'aria-invalid': true, 'aria-describedby': errorId } : {}
}

/**
 * 칸에는 서버 문구 대신 칸별 안내(`fallback`)를 보여주는 오류.
 * 400 / 422 범위 오류는 서버 문구가 폼 전체 요약이고, 재점검일 오류는 서버 문구를 페이지 안내에 보여준다.
 */
const SUMMARY_CODES: ReadonlySet<string> = new Set(['VALIDATION_ERROR', 'INVALID_CARE_SETTINGS', 'INVALID_RECHECK_DATE'])

/**
 * 서버 오류가 가리키는 필드(`details.fields[].field`)에 보여줄 문구.
 * 422처럼 원인이 하나인 오류는 서버 문구를, SUMMARY_CODES는 칸별 안내(`fallback`)를 쓴다.
 */
export function fieldMessage(error: ApiError | null, paths: string[], fallback: string): string | null {
  if (!error || !error.hasField(...paths)) return null
  return SUMMARY_CODES.has(error.code) ? fallback : error.message
}

/**
 * 폼 아래에 따로 보여줄 오류. 같은 문구를 두 번 보여주지 않는다:
 * 칸에 붙은 오류가 있으면 칸에만, 상태 오류는 페이지 안내에만 보여준다.
 */
export function formLevelError(error: ApiError | null, fieldMessages: (string | null)[]): ApiError | null {
  if (!error) return null
  if (fieldMessages.some((message) => message !== null)) return null
  if (isStale(error.code) && !staysAtField(error)) return null
  return error
}
