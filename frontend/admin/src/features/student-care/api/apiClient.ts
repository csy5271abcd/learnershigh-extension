// 공통 Error 형식(api-contract.md §5)을 ApiError로 바꾼다. 연동 실패를 빈 데이터로 바꾸지 않는다.

export interface FieldViolation {
  field: string
  reason: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields: FieldViolation[]

  constructor(status: number, code: string, message: string, fields: FieldViolation[]) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields
  }

  /** `details.fields[].field`(JSON 경로, 예: `plan.goal`) 중 하나라도 이 오류의 원인인지. */
  hasField(...paths: string[]): boolean {
    return this.fields.some((violation) => paths.includes(violation.field))
  }
}

const NETWORK_MESSAGE = '서버에 연결하지 못했습니다. 네트워크를 확인한 뒤 다시 시도해주세요.'

/** catch로 받은 값을 ApiError로 정규화한다. 모든 화면은 이 함수만 쓴다. */
export function toApiError(caught: unknown): ApiError {
  if (caught instanceof ApiError) return caught
  const message = caught instanceof Error ? caught.message : String(caught)
  return new ApiError(0, 'UNKNOWN_ERROR', message || '요청을 처리하지 못했습니다.', [])
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', NETWORK_MESSAGE, [])
  }

  if (response.status === 204) {
    return undefined as T
  }

  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const error = (body ?? {}) as { code?: string; message?: string; details?: { fields?: FieldViolation[] } }
    throw new ApiError(
      response.status,
      error.code ?? 'UNKNOWN_ERROR',
      error.message ?? '요청을 처리하지 못했습니다.',
      error.details?.fields ?? [],
    )
  }
  return body as T
}
