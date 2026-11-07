// 문서 스크롤 잠금. 겹친 창(학생 창, 미저장 확인, 설정)이 여러 개여도 하나의 수로 세어 마지막 창이 닫힐 때만 푼다.
let count = 0, saved = ''
export function lockScroll(): () => void {
  const html = document.documentElement
  if (count === 0) { saved = html.style.overflow; html.style.overflow = 'hidden' }
  count++
  let done = false
  return () => { if (done) return; done = true; count = Math.max(0, count - 1); if (count === 0) html.style.overflow = saved }
}
