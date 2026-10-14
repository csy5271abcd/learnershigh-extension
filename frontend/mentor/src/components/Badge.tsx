import styles from './Badge.module.css'

export type BadgeTone = 'neutral' | 'accent' | 'positive' | 'warning' | 'negative'

// 상태 / 유형 표시. 색만으로 뜻을 전하지 않도록 항상 글자와 함께 쓴다. (tds-web-guidelines §30)
export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: string }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>
}
