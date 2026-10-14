/** api-contract §5 공통 Error Format. Mentor 전용 Error Code는 아직 정의되지 않아 화면은 status로만 분기한다. */
export class MentorApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'MentorApiError'
    this.status = status
    this.code = code
  }
}

export const isNotFoundError = (error: unknown) => error instanceof MentorApiError && error.status === 404
