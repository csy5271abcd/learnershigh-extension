/**
 * 날짜가 속한 학기 이름 (3~7월 1학기, 8월~이듬해 2월 2학기). 예: 2026-10-05 → 2026년 2학기
 * Archive 시기 표시에 쓴다. (학기 Contract가 없어 화면 계산 규칙이다)
 */
export function semesterLabel(date: string): string {
  const [year, month] = date.split('-').map(Number)
  if (month >= 8) return `${year}년 2학기`
  if (month <= 2) return `${year - 1}년 2학기`
  return `${year}년 1학기`
}
