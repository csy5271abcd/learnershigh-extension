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
}

const NETWORK_MESSAGE = '서버에 연결하지 못했습니다. 네트워크를 확인한 뒤 다시 시도해주세요.'

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
