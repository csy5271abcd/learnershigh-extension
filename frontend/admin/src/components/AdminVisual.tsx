import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { AdminIcon, type AdminIconName } from './AdminIcons.tsx'
import styles from './AdminVisual.module.css'

/*
 * Admin 시각 구성 요소 (TDS 원칙의 Admin Web 재해석 · Admin-local)
 * - 업무 의미는 색 + Icon + 글자 + Surface를 함께 써서 구분한다. 색만으로 구분하지 않는다.
 * - 강한 색: Primary(Blue) · Risk(Red)만. 나머지 Tone은 옅은 배경 + 작은 Icon 수준이다.
 * - Card마다 그림자를 두지 않는다. (Floating Layer만)
 */

export type VisualTone = 'neutral' | 'feedback' | 'topic' | 'revision' | 'activity' | 'risk' | 'complete' | 'ai'

/** 업무 · 상태 Label: Icon + 글자 + 옅은 배경 */
export function ToneTag({ tone, icon, children, strong = false }: { tone: VisualTone; icon?: AdminIconName; children: ReactNode; strong?: boolean }) {
  return (
    <span className={styles.toneTag} data-tone={tone} data-strong={strong || undefined}>
      {icon && <AdminIcon name={icon} size={14} />}
      {children}
    </span>
  )
}

type ActionVariant = 'primary' | 'soft' | 'text'

/** Action 위계: primary(채움) → soft(옅은 Tone) → text(글자). 모든 Action을 파란 상자로 만들지 않는다. */
export function ToneButton({ variant, tone = 'feedback', icon, children, className, ...rest }: { variant: ActionVariant; tone?: VisualTone; icon?: AdminIconName; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...rest} className={`${styles.toneButton}${className ? ` ${className}` : ''}`} data-variant={variant} data-tone={tone}>
      {icon && <AdminIcon name={icon} size={15} />}
      {children}
    </button>
  )
}

/** 가장 중요한 지표 하나: 큰 숫자 + 짧은 설명 + 구성 (dl 안의 div) */
export function SummaryHero({ label, value, unit, note, breakdown, icon }: { label: string; value: ReactNode; unit?: string; note?: ReactNode; breakdown?: { label: string; value: ReactNode; tone?: VisualTone; icon?: AdminIconName }[]; icon?: AdminIconName }) {
  return (
    <div className={styles.hero}>
      <dt className={styles.heroLabel}>
        {icon && <AdminIcon name={icon} size={16} />}
        {label}
      </dt>
      <dd className={styles.heroValue}>
        {value}
        {unit && <span className={styles.heroUnit}>{unit}</span>}
      </dd>
      {note && <dd className={styles.heroNote}>{note}</dd>}
      {breakdown && breakdown.length > 0 && (
        <dd className={styles.heroBreakdown}>
          <ul>
            {breakdown.map((item) => (
              <li key={item.label} data-tone={item.tone}>
                {item.icon && <AdminIcon name={item.icon} size={14} />}
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </li>
            ))}
          </ul>
        </dd>
      )}
    </div>
  )
}

/** 보조 지표: 작은 Icon + 숫자 + 설명. Tone은 Icon · 숫자 색에만 (배경 전체를 칠하지 않는다) */
export function CompactMetric({ label, value, note, tone = 'neutral', icon, action }: { label: string; value: ReactNode; note?: ReactNode; tone?: VisualTone; icon?: AdminIconName; action?: ReactNode }) {
  return (
    <div className={styles.metric} data-tone={tone}>
      <dt className={styles.metricLabel}>
        {icon && (
          <span className={styles.metricIcon}>
            <AdminIcon name={icon} size={15} />
          </span>
        )}
        {label}
      </dt>
      <dd className={styles.metricValue}>{value}</dd>
      {note && <dd className={styles.metricNote}>{note}</dd>}
      {action && <dd className={styles.metricAction}>{action}</dd>}
    </div>
  )
}

/** 글자 안의 짧은 통계: "확정 4 · 제외 3" */
export function InlineStats({ items, label }: { items: { label: string; value: ReactNode; tone?: VisualTone }[]; label: string }) {
  return (
    <ul className={styles.inlineStats} aria-label={label}>
      {items.map((item) => (
        <li key={item.label} data-tone={item.tone}>
          <span>{item.label}</span> <strong>{item.value}</strong>
        </li>
      ))}
    </ul>
  )
}

/** 변화 방향: 글자 기호(↑ / ↓) + 글자. SVG Icon · 색만으로 방향을 전달하지 않는다 */
export function Delta({ direction, children, quiet = false }: { direction: 'up' | 'down' | 'same' | 'first'; children: ReactNode; /** 작은 변화: 더 옅은 글자 */ quiet?: boolean }) {
  const symbol = direction === 'up' ? '↑' : direction === 'down' ? '↓' : ''
  return (
    <span className={styles.delta} data-direction={direction} data-quiet={quiet || undefined}>
      {symbol && <span aria-hidden="true">{symbol}</span>}
      {children}
      <span className="lh-visually-hidden">{direction === 'up' ? ' (상승)' : direction === 'down' ? ' (하락)' : direction === 'same' ? ' (유지)' : ''}</span>
    </span>
  )
}

/** 얇은 진행 막대 (하락이어도 막대는 중립색. 변화는 Delta 글자로) */
export function MiniProgress({ rate, label }: { rate: number; label: string }) {
  const percent = Math.max(0, Math.min(100, Math.round(rate * 100)))
  return (
    <span className={styles.progress} role="img" aria-label={`${label} ${percent}%`}>
      <span style={{ width: `${percent}%` }} />
    </span>
  )
}

/** 길게 이어지는 보조 내용을 접어 두는 단추 */
export function DisclosureButton({ expanded, controls, onToggle, children }: { expanded: boolean; controls: string; onToggle: () => void; children: ReactNode }) {
  return (
    <button type="button" className={styles.disclosure} aria-expanded={expanded} aria-controls={controls} onClick={onToggle}>
      <AdminIcon name="chevron-down" size={14} />
      {children}
    </button>
  )
}
