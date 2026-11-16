import type { ApiErrorBody } from './types.ts'

// §5 공통 Error Format을 그대로 담는 오류. 화면은 `code`로 분기하고 오류를 빈 목록으로 바꾸지 않는다.
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: ApiErrorBody['details']

  constructor(status: number, body: ApiErrorBody) {
    super(body.message)
    this.name = 'ApiError'
    this.status = status
    this.code = body.code
    this.details = body.details
  }

  /** §5-2 VALIDATION_ERROR의 필드별 사유 */
  fieldReasons(): Record<string, string> {
    const result: Record<string, string> = {}
    for (const field of this.details?.fields ?? []) result[field.field] = field.reason
    return result
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  return new ApiError(0, {
    code: 'NETWORK_ERROR',
    message: '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',
  })
}
