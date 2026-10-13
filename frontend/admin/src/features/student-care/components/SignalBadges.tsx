import type { SignalSummary } from '../model/types.ts'

type Signals = Pick<SignalSummary, 'type' | 'label'>[]

/**
 * 신호 배지 목록. 버튼 안처럼 목록을 둘 수 없는 곳에서는 `inline`으로 span만 쓰고,
 * 읽을 때는 "신호: 연속 미입실, 계획 미제출 반복"처럼 나눠 읽게 한다.
 */
export function SignalBadges({ signals, inline = false }: { signals: Signals; inline?: boolean }) {
  if (inline) {
    return (
      <span className="sc-badges">
        <span className="sc-visually-hidden">신호: </span>
        {signals.map((signal, index) => (
          <span key={signal.type} className="sc-badge">
            {index > 0 && <span className="sc-visually-hidden">, </span>}
            {signal.label}
          </span>
        ))}
      </span>
    )
  }
  return (
    <ul className="sc-badges" aria-label="신호">
      {signals.map((signal) => (
        <li key={signal.type} className="sc-badge">
          {signal.label}
        </li>
      ))}
    </ul>
  )
}
