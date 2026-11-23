import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'

// 원문 | 결과(검토) 분할선 공용 훅 — 검토 Workspace와 분석 결과 조회(A27-UX [05])가 같은 동작을 쓴다.
// 끌기(Pointer Capture) 또는 ←/→(5%) · Home/End로 원문 폭 30~70%. 값은 이 브라우저에만 기억한다(화면별 key).
// 끄는 동안에는 글자 선택을 막고, 끝나면 되돌린다(원문 PDF·표의 내부 스크롤은 그대로).
const MIN = 30
const MAX = 70

function read(key: string, fallback: number): number {
  try {
    const value = Number(window.localStorage.getItem(key))
    return value >= MIN && value <= MAX ? value : fallback
  } catch {
    return fallback
  }
}

export function useSplitPane(storageKey: string, fallback: number) {
  const [split, setSplit] = useState(() => read(storageKey, fallback))
  const bodyRef = useRef<HTMLDivElement>(null)
  const save = (value: number) => {
    const clamped = Math.min(MAX, Math.max(MIN, Math.round(value)))
    setSplit(clamped)
    try {
      window.localStorage.setItem(storageKey, String(clamped))
    } catch {
      // 기본 폭 사용
    }
  }
  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const rect = bodyRef.current?.getBoundingClientRect()
    if (!rect) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const previousSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'
    const move = (moveEvent: PointerEvent) => save(((moveEvent.clientX - rect.left) / rect.width) * 100)
    const stop = () => {
      document.body.style.userSelect = previousSelect
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
  }
  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === 'ArrowLeft') save(split - 5)
    else if (event.key === 'ArrowRight') save(split + 5)
    else if (event.key === 'Home') save(MIN)
    else if (event.key === 'End') save(MAX)
    else return
    event.preventDefault()
  }
  /** 분할선 button에 그대로 펼친다 */
  const separatorProps = {
    role: 'separator' as const,
    'aria-orientation': 'vertical' as const,
    'aria-valuenow': split,
    'aria-valuemin': MIN,
    'aria-valuemax': MAX,
    onPointerDown,
    onKeyDown,
  }
  return { split, bodyRef, separatorProps, bodyStyle: { ['--rv-split' as string]: `${split}%` } }
}
