import type { ApiError } from '../api/apiClient.ts'

/** 입력 칸에 붙일 오류 속성. 오류가 없으면 아무것도 붙이지 않는다. */
export function invalidProps(errorId: string, message: string | null) {
  return message ? { 'aria-invalid': true, 'aria-describedby': errorId } : {}
}

/**
 * 서버 오류가 가리키는 필드(`details.fields[].field`)에 보여줄 문구.
 * 422처럼 원인이 하나인 오류는 서버 문구를, 400 VALIDATION_ERROR는 필드별 안내(`fallback`)를 쓴다.
 */
export function fieldMessage(error: ApiError | null, paths: string[], fallback: string): string | null {
  if (!error || !error.hasField(...paths)) return null
  return error.code === 'VALIDATION_ERROR' ? fallback : error.message
}
