import type { ReactNode } from 'react'
import styles from '../MentorHubHomePage.module.css'

interface HomeSectionProps {
  id: string
  title: string
  description?: string
  children: ReactNode
}

// 추천 Home의 Section 제목 / 설명 / 본문 묶음.
export function HomeSection({ id, title, description, children }: HomeSectionProps) {
  const headingId = `${id}-heading`

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <div className={styles.sectionHeader}>
        <h2 id={headingId} className={styles.sectionTitle}>
          {title}
        </h2>
        {description && <p className={styles.sectionDescription}>{description}</p>}
      </div>
      {children}
    </section>
  )
}
