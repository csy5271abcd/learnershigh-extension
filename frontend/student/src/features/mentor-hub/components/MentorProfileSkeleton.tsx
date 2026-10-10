import pageStyles from '../MentorHubHomePage.module.css'
import styles from './MentorHubHomeSkeleton.module.css'

// Profile Header / 고교 Context 카드 / 성적 카드의 실제 배치와 같은 Skeleton.
export function MentorProfileSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <span className={`${styles.block} ${styles.profileHeader}`} />
      <div className={pageStyles.grid}>
        {[0, 1, 2].map((key) => (
          <span key={key} className={`${styles.block} ${styles.row}`} />
        ))}
      </div>
      <div className={pageStyles.grid}>
        {[0, 1].map((key) => (
          <span key={key} className={`${styles.block} ${styles.card}`} />
        ))}
      </div>
    </div>
  )
}
