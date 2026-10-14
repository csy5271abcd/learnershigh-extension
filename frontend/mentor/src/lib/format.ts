// 화면 표시용 Format. Timezone은 Browser 기준이며 상태 계산에는 쓰지 않는다.

/** "2026-10-12T22:40:00+09:00" → "2026. 10. 12." */
export function formatDate(iso: string): string {
  const date = new Date(iso)
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`
}

/** "8시간 전" */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000))
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}

/** 1234 → "1,234" */
export const formatCount = (count: number) => count.toLocaleString('ko-KR')

/** 오류 객체에서 화면에 보일 문장을 꺼낸다. 알 수 없는 오류는 일반 문구로 바꾼다. */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}
