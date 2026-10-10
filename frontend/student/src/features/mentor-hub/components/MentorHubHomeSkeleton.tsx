import pageStyles from '../MentorHubHomePage.module.css'
import styles from './MentorHubHomeSkeleton.module.css'

// 실제 Layout(추천 Mentor 3개 + 다른 Mentor Row)과 같은 Grid를 써서 Layout Shift를 줄인다.
export function MentorHubHomeSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <div className={pageStyles.section}>
        <div className={pageStyles.sectionHeader}>
          <span className={`${styles.block} ${styles.title}`} />
          <span className={`${styles.block} ${styles.line}`} />
        </div>
        <div className={pageStyles.grid}>
          {[0, 1, 2].map((key) => (
            <span key={key} className={`${styles.block} ${styles.card}`} />
          ))}
        </div>
      </div>
      <div className={pageStyles.section}>
        <div className={pageStyles.sectionHeader}>
          <span className={`${styles.block} ${styles.title}`} />
        </div>
        <div className={pageStyles.grid}>
          {[0, 1, 2, 3, 4, 5].map((key) => (
            <span key={key} className={`${styles.block} ${styles.row}`} />
          ))}
        </div>
      </div>
    </div>
  )
}
