import { ApiError, type ApiErrorBody } from '../canonicalSource.ts'
import { devContextId } from '../../../../../../student/src/features/assessment/dev/devContext.ts'

// Admin Assessment HTTP Adapter 공통 요청 함수 (Stage 2).
// - 같은 Origin `/api/...`만 쓴다. Admin 개발 서버는 기존 vite.config의 `/api` Proxy(VITE_API_TARGET)를 그대로 쓴다.
// - 인증: 실제 기존 LearnersHigh 관리자 인증은 연결 전(API-OD-A01). 개발 서버에서만 VITE_ASSESSMENT_DEV_ADMIN_ID가 있으면
//   Backend Mock Header(X-Assessment-Admin-Id)를 붙인다. Production Build에서는 붙이지 않아 서버가 401을 돌려준다.
// - 서버 오류는 §5 Error Body 그대로 던진다. 연결 실패·JSON 아닌 응답을 빈 값·Mock 값으로 바꾸지 않는다.

export type QueryValue = string | number | boolean | null | undefined

function devAuthHeaders(): Record<string, string> {
  // 개발 서버 전용: 화면에서 고른 시연 관리자 → 없으면 VITE_ASSESSMENT_DEV_ADMIN_ID (Student dev/devContext.ts 공용). Production은 {}.
  // 조기 반환을 남겨 Production 번들에서 Header 이름까지 빠지게 한다.
  if (!import.meta.env.DEV) return {}
  const adminId = devContextId('admin')
  return adminId ? { 'X-Assessment-Admin-Id': adminId } : {}
}

/** 화면 개발 표시용. Production에서는 항상 null. */
export function adminDevAuthLabel(): string | null {
  const id = devAuthHeaders()['X-Assessment-Admin-Id']
  return id ? `개발용 Mock 인증 · ${id}` : null
}

export function notConnected(reason: string): Promise<never> {
  return Promise.reject(new ApiError(503, { code: 'ASSESSMENT_API_NOT_CONNECTED', message: reason, details: {} }))
}

function url(path: string, query?: Record<string, QueryValue>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue
    params.append(key, String(value))
  }
  const search = params.toString()
  return search ? `${path}?${search}` : path
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === 'object' && value !== null && typeof (value as ApiErrorBody).code === 'string'
    && typeof (value as ApiErrorBody).message === 'string'
}

export async function adminHttp<T>(
  path: string,
  options: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; query?: Record<string, QueryValue>; json?: unknown; form?: FormData } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...devAuthHeaders() }
  let body: BodyInit | undefined
  if (options.form) body = options.form
  else if (options.json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.json)
  }
  let response: Response
  try {
    response = await fetch(url(path, options.query), { method: options.method ?? 'GET', headers, body })
  } catch {
    throw new ApiError(0, { code: 'NETWORK_ERROR', message: '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' })
  }
  const type = response.headers.get('content-type') ?? ''
  let parsed: unknown
  if (type.includes('application/json')) {
    try {
      parsed = await response.json()
    } catch {
      parsed = undefined
    }
  }
  if (!response.ok) {
    if (isErrorBody(parsed)) throw new ApiError(response.status, parsed)
    throw new ApiError(response.status, { code: 'INTERNAL_ERROR', message: `서버 응답을 처리하지 못했어요. (HTTP ${response.status})`, details: {} })
  }
  // 204(삭제·휴지통 이동 등): 본문 없음이 정상
  if (response.status === 204) return undefined as T
  if (parsed === undefined) {
    throw new ApiError(502, { code: 'INTERNAL_ERROR', message: '서버 응답 형식이 올바르지 않아요. (JSON 아님)', details: {} })
  }
  return parsed as T
}

/** 원본·미리보기 파일 (같은 Origin). 서버가 담당 범위·형식·SHA를 확인한다. 오류는 Error Body 그대로 던진다. */
export async function adminFile(path: string): Promise<Blob> {
  let response: Response
  try {
    response = await fetch(url(path), { headers: { ...devAuthHeaders() } })
  } catch {
    throw new ApiError(0, { code: 'NETWORK_ERROR', message: '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' })
  }
  if (!response.ok) {
    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      parsed = undefined
    }
    if (isErrorBody(parsed)) throw new ApiError(response.status, parsed)
    throw new ApiError(response.status, { code: 'INTERNAL_ERROR', message: `파일을 받지 못했어요. (HTTP ${response.status})`, details: {} })
  }
  return response.blob()
}
