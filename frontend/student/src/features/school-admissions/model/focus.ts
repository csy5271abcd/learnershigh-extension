/**
 * 닫힌 뒤 Focus를 돌려줄 곳. 원래 버튼이 사라졌으면(삭제 / 제출 후 바뀐 화면 등) fallbackId로 옮긴다.
 * 다시 불러온 뒤 Focus가 문서 밖(body)으로 빠졌으면 한 번 더 돌려준다.
 */
export function restoreFocus(trigger: HTMLElement | null, fallbackId?: string) {
  const apply = () => {
    if (trigger?.isConnected) trigger.focus({ preventScroll: true })
    else if (fallbackId) document.getElementById(fallbackId)?.focus({ preventScroll: true })
  }
  requestAnimationFrame(apply)
  setTimeout(() => {
    if (!document.activeElement || document.activeElement === document.body) apply()
  }, 150)
}
