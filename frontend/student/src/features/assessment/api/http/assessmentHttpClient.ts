import { ApiError } from '../apiError.ts'
import { devContextId } from '../../dev/devContext.ts'
import type { ApiErrorBody } from '../types.ts'

// Student Assessment HTTP Adapter 공통 요청 함수 (Stage 2, assessment-frontend-mock.md §2 `api/http/`).
// - 주소는 같은 Origin의 `/api/...`만 쓴다. 개발 서버 Proxy·배포 Gateway가 Backend로 넘긴다(Proxy 설정은 Shared 영역, 별도 승인).
// - 인증: 실제 기존 LearnersHigh 인증은 아직 연결 전이다(API-OD-A01). 개발 서버(`import.meta.env.DEV`)에서만
//   `VITE_ASSESSMENT_DEV_STUDENT_ID`가 있으면 Backend Mock 인증 Header를 붙인다. Production Build에서는 붙이지 않으므로 서버가 401을 돌려준다.
// - 서버 오류는 §5 Error Body 그대로 ApiError로 던진다. 연결 실패·JSON이 아닌 응답도 오류로 던지고 빈 값·Mock 값으로 바꾸지 않는다.

export type QueryValue = string | number | boolean | null | undefined

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  query?: Record<string, QueryValue>
  json?: unknown
  /** multipart/form-data (Content-Type은 브라우저가 boundary와 함께 붙인다) */
  form?: FormData
}

// 관리자 "학생 화면 보기"(Admin iframe, 읽기 전용 모드)에서만 설정한다. 학생으로 가장하지 않는다:
// 학생 Header를 붙이지 않고, 조회(GET)만 관리자 전용 경로 /api/admin/assessment/students/{id}/student-view/...로 보낸다.
// 서버가 관리자 담당 범위를 다시 검사한다. 쓰기는 viewMode.guardWrite가 먼저 막고, 여기서도 GET 외에는 보내지 않는다.
let adminReadOnlyStudentId: string | null = null
const studentPrefix = '/api/student/assessment'

/** Admin 학생 화면 보기 전용. Student 앱에서는 호출하지 않는다. */
export function configureAdminReadOnlyView(studentId: string | null) {
  adminReadOnlyStudentId = studentId
}

export function isAdminReadOnlyHttpView(): boolean {
  return adminReadOnlyStudentId !== null
}

function viewPath(path: string): string {
  if (adminReadOnlyStudentId === null || !path.startsWith(studentPrefix)) return path
  return `/api/admin/assessment/students/${encodeURIComponent(adminReadOnlyStudentId)}/student-view${path.slice(studentPrefix.length)}`
}

function adminViewHeaders(): Record<string, string> {
  // 개발 서버 전용: 화면에서 고른 시연 관리자 → 없으면 VITE_ASSESSMENT_DEV_ADMIN_ID (dev/devContext.ts). Production은 {}.
  // 조기 반환을 남겨 Production 번들에서 Header 이름까지 빠지게 한다(빌드 시 상수 분기 제거).
  if (!import.meta.env.DEV) return {}
  const adminId = devContextId('admin')
  return adminId ? { 'X-Assessment-Admin-Id': adminId } : {}
}

function devAuthHeaders(): Record<string, string> {
  if (adminReadOnlyStudentId !== null) return adminViewHeaders()
  // 개발 서버 전용: 화면에서 고른 시연 학생 → 없으면 VITE_ASSESSMENT_DEV_STUDENT_ID (dev/devContext.ts). Production은 {}.
  if (!import.meta.env.DEV) return {}
  const studentId = devContextId('student')
  return studentId ? { 'X-Assessment-Student-Id': studentId } : {}
}

/** 개발용 Mock 인증 Header를 붙이는 중인지 (화면 개발 표시용). Production에서는 항상 false. */
export function devAuthLabel(): string | null {
  const headers = devAuthHeaders()
  return headers['X-Assessment-Student-Id'] ? `개발용 Mock 인증 · ${headers['X-Assessment-Student-Id']}` : null
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
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

async function readJson(response: Response): Promise<unknown> {
  const type = response.headers.get('content-type') ?? ''
  if (!type.includes('application/json')) return undefined
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

/** 원본 파일 주소 (같은 Origin, 개발 서버 Proxy 경유). 개발 Mock 인증 Header가 필요하므로 화면은 downloadFile로 받는다. */
export async function downloadFile(path: string): Promise<Blob> {
  let response: Response
  try {
    response = await fetch(viewPath(path), { headers: { ...devAuthHeaders() } })
  } catch {
    throw new ApiError(0, { code: 'NETWORK_ERROR', message: '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' })
  }
  if (!response.ok) {
    const parsed = await readJson(response)
    if (isErrorBody(parsed)) throw new ApiError(response.status, parsed)
    throw new ApiError(response.status, { code: 'INTERNAL_ERROR', message: `파일을 받지 못했어요. (HTTP ${response.status})`, details: {} })
  }
  return response.blob()
}

/**
 * 학생 본인 경로에 JSON 을 POST 하고 파일(Blob)을 받는다(§20-1 노트 PDF). 관리자 읽기 전용 보기에서는 보내지 않는다.
 * 서버 Error Body 는 ApiError 로, 연결 실패는 NETWORK_ERROR 로 던진다.
 */
export async function postForFile(path: string, json: unknown): Promise<{ blob: Blob; contentDisposition: string | null }> {
  if (adminReadOnlyStudentId !== null) {
    throw new ApiError(403, { code: 'FORBIDDEN', message: '관리자 읽기 전용 보기에서는 사용할 수 없어요.', details: {} })
  }
  let response: Response
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { Accept: 'application/pdf, application/json', 'Content-Type': 'application/json', ...devAuthHeaders() },
      body: JSON.stringify(json),
    })
  } catch {
    throw new ApiError(0, { code: 'NETWORK_ERROR', message: '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' })
  }
  if (!response.ok) {
    const parsed = await readJson(response)
    if (isErrorBody(parsed)) throw new ApiError(response.status, parsed)
    throw new ApiError(response.status, { code: 'INTERNAL_ERROR', message: `파일을 만들지 못했어요. (HTTP ${response.status})`, details: {} })
  }
  return { blob: await response.blob(), contentDisposition: response.headers.get('content-disposition') }
}

export async function assessmentHttp<T>(path: string, options: HttpRequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...devAuthHeaders() }
  let body: BodyInit | undefined
  if (options.form) {
    body = options.form
  } else if (options.json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.json)
  }
  if (adminReadOnlyStudentId !== null && (options.method ?? 'GET') !== 'GET') {
    throw new ApiError(403, { code: 'READ_ONLY_VIEW', message: '관리자 읽기 전용 화면에서는 학생 기록을 바꿀 수 없어요.', details: {} })
  }
  let response: Response
  try {
    response = await fetch(buildUrl(viewPath(path), options.query), { method: options.method ?? 'GET', headers, body })
  } catch {
    throw new ApiError(0, { code: 'NETWORK_ERROR', message: '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' })
  }
  const parsed = await readJson(response)
  if (!response.ok) {
    if (isErrorBody(parsed)) throw new ApiError(response.status, parsed)
    throw new ApiError(response.status, {
      code: 'INTERNAL_ERROR',
      message: `서버 응답을 처리하지 못했어요. (HTTP ${response.status})`,
      details: {},
    })
  }
  if (response.status === 204) return undefined as T
  if (parsed === undefined) {
    // 개발 서버가 Proxy 없이 index.html을 돌려주는 경우 등: 성공으로 처리하지 않는다.
    throw new ApiError(502, { code: 'INTERNAL_ERROR', message: '서버 응답 형식이 올바르지 않아요. (JSON 아님)', details: {} })
  }
  return parsed as T
}
