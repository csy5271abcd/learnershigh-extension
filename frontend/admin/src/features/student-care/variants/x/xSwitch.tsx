// X 전용 일간·주간 바꾸기.
// 같은 지표를 '일간(최근 7일, 날짜별)'과 '주간(최근 5주, 주별)'으로 바꿔 보는 칸. 막대 7개 ↔ 5개처럼 같은 꼴의 그림을 기간만 바꾼다.
// 제목 줄 오른쪽에 글자 탭 두 개(일간·주간), 기본은 일간.
import { useState, type ReactNode } from 'react'

export type Period = 'd' | 'w'
/** value·onChange를 주면 여러 그림이 같은 기간을 함께 쓴다(탭을 옮겨도 고른 기간 유지) */
export function ViewSwitch({ title, titleW, daily, weekly, className = '', value, onChange }: { title: string; titleW?: string; daily: ReactNode; weekly: ReactNode; className?: string; value?: Period; onChange?: (p: Period) => void }) {
  const [own, setOwn] = useState<Period>('d')
  const v = value ?? own
  const setV = (p: Period) => { setOwn(p); onChange?.(p) }
  return (
    <section className={`vs ${className}`} aria-label={title}>
      <header className="xs-head">
        <h4>{v === 'w' && titleW ? titleW : title}</h4>
        <div className="xs-seg" role="group" aria-label={`${title} 기간`}>
          <button type="button" aria-pressed={v === 'd'} onClick={() => setV('d')}>일간</button>
          <button type="button" aria-pressed={v === 'w'} onClick={() => setV('w')}>주간</button>
        </div>
      </header>
      {v === 'd' ? daily : weekly}
    </section>
  )
}
