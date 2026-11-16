import type { PlanAnalysisStatus, PublishState } from '../api/types.ts'

// 표시 규칙 (Business State 아님). 날짜는 KST 문자열을 그대로 읽고, D-day는 Mock 기준일로 계산한다 (testing §14).

export const statusLabels: Record<string, string> = { BEFORE_START: '시작 전', IN_PROGRESS: '진행 중', COMPLETED: '완료' }
export const feedbackStatusLabels: Record<string, string> = { PENDING: '답변 대기', DELIVERED: '답변 완료' }
export const publishLabels: Record<PublishState, string> = { PUBLISHED: '공개', DRAFT: '비공개' }
export const sourceTypeLabels: Record<string, string> = { SCHOOL_ASSESSMENT: '학교 수행평가', ENRICHMENT_TASK: '심화 탐구' }

const pad = (value: number) => String(value).padStart(2, '0')

/** '2026-10-15T21:12:00+09:00' → '10. 15. 21:12' */
export function dateTimeLabel(value: string | null | undefined): string {
  if (!value) return '—'
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value)
  if (!match) return value
  const [, , month, day, hour, minute] = match
  return `${Number(month)}. ${Number(day)}.${hour ? ` ${hour}:${minute}` : ''}`
}

export function dateLabel(value: string | null | undefined): string {
  if (!value) return '—'
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  return match ? `${match[1]}. ${Number(match[2])}. ${Number(match[3])}.` : value
}

/** 기준일 대비 남은 날 (마감 지남은 음수) */
export function daysUntil(date: string, asOfDate: string): number {
  return Math.round((Date.parse(`${date}T00:00:00+09:00`) - Date.parse(`${asOfDate}T00:00:00+09:00`)) / 86_400_000)
}

export function dDayLabel(date: string, asOfDate: string): string {
  const days = daysUntil(date, asOfDate)
  if (days === 0) return 'D-day'
  return days > 0 ? `D-${days}` : `D+${-days}`
}

export function fileSizeLabel(bytes: number | null): string {
  if (bytes === null) return '크기 정보 없음'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

export const todayKey = () => {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** 쉼표·줄바꿈으로 나눈 목록 입력 */
export const splitList = (value: string) =>
  value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)

let toastSequence = 0
/** Toast 구분용 증가 번호 (렌더 중 시각 함수를 부르지 않는다) */
export const nextToastId = () => {
  toastSequence += 1
  return toastSequence
}

export const analysisLabels: Record<PlanAnalysisStatus, { label: string; tone?: string }> = {
  NOT_REQUESTED: { label: '분석 전' },
  PROCESSING: { label: '분석 중', tone: 'primary' },
  REVIEW_REQUIRED: { label: '검토 필요', tone: 'warning' },
  PARTIAL: { label: '일부 항목 확인 필요', tone: 'warning' },
  COMPLETED: { label: '분석 완료', tone: 'success' },
  FAILED: { label: '분석 실패', tone: 'danger' },
}

/** 이름 끝 두 글자 (목업 AM-02 원형 이니셜) */
export const initialsOf = (name: string) => (name.length > 2 ? name.slice(-2) : name)
