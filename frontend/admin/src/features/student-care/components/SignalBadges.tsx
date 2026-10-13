import type { SignalSummary } from '../model/types.ts'

export function SignalBadges({ signals }: { signals: Pick<SignalSummary, 'type' | 'label'>[] }) {
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
