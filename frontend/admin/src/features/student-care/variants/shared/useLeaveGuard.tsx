// 상담 입력에 저장하지 않은 내용이 있을 때 학생 전환·닫기·탭 이동을 한 번 멈춘다(plan-v5 3장).
// 기존 CounselForm은 고치지 않고, 감싼 영역에서 입력·선택이 일어났는지만 본다.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

export function useLeaveGuard() {
  const [dirty, setDirty] = useState(false)
  const [pending, setPending] = useState<(() => void) | null>(null)
  const keep = useRef<HTMLButtonElement>(null)
  const guard = useCallback((action: () => void) => { if (dirty) setPending(() => action); else action() }, [dirty])
  useEffect(() => { if (pending) keep.current?.focus() }, [pending])
  // 브라우저 새로고침·닫기
  useEffect(() => {
    if (!dirty) return
    const on = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', on)
    return () => window.removeEventListener('beforeunload', on)
  }, [dirty])
  const prompt: ReactNode = pending && (
    <div className="v5-confirm-dim">
      <div className="v5-confirm" role="alertdialog" aria-modal="true" aria-labelledby="v5-leave-title">
        <p id="v5-leave-title"><b>저장하지 않은 기록이 있습니다</b></p>
        <div className="v5-confirm-actions">
          <button ref={keep} type="button" className="sc-button" onClick={() => setPending(null)}>계속 작성</button>
          <button type="button" className="sc-button" onClick={() => { const go = pending; setPending(null); setDirty(false); go() }}>버리기</button>
        </div>
      </div>
    </div>
  )
  /** 상담 영역을 감싸는 요소에 붙인다 */
  const watch = {
    onInputCapture: () => setDirty(true),
    onChangeCapture: () => setDirty(true),
    onClickCapture: (e: React.MouseEvent) => { const b = (e.target as HTMLElement).closest('button'); if (b && b.type !== 'submit' && !b.closest('.v5-no-dirty')) setDirty(true) },
  }
  return { dirty, setDirty, guard, prompt, watch }
}
export type LeaveGuard = ReturnType<typeof useLeaveGuard>
