import type { MentorExperience } from '../model/types.ts'
import styles from './MentorProfileSections.module.css'

interface MentorExperienceListProps {
  experiences: MentorExperience[]
}

export function MentorExperienceList({ experiences }: MentorExperienceListProps) {
  if (experiences.length === 0) {
    return <p className={styles.emptyNotice}>공개한 대표 경험이 없어요.</p>
  }

  return (
    <ol className={styles.experienceGrid}>
      {experiences.map((experience, index) => (
        <li key={experience.title} className={styles.experienceCard}>
          <span className={styles.experienceIndex} aria-hidden="true">
            {String(index + 1).padStart(2, '0')}
          </span>
          <h3 className={styles.experienceTitle}>{experience.title}</h3>
          <p className={styles.experienceDescription}>{experience.description}</p>
        </li>
      ))}
    </ol>
  )
}
