import type { StudentRecommendationContext } from '../model/types.ts'
import styles from './StudentContextSummary.module.css'

interface StudentContextSummaryProps {
  context: StudentRecommendationContext
}

// 추천에 사용한 내 Context를 먼저 보여줘 추천 이유를 이해할 수 있게 한다.
export function StudentContextSummary({ context }: StudentContextSummaryProps) {
  return (
    <div className={styles.summary}>
      <p className={styles.label}>{context.displayName}님 기준으로 추천해요</p>
      <ul className={styles.chips} aria-label="추천에 사용한 내 정보">
        <li className={styles.chip}>{context.grade}</li>
        <li className={styles.chip}>{context.interestField} 관심</li>
        {context.currentTask && <li className={styles.chip}>진행 중 · {context.currentTask.title}</li>}
        {context.savedContentTags.length > 0 && (
          <li className={styles.tags}>
            <span className="lh-visually-hidden">관심 Tag </span>
            {context.savedContentTags.map((tag) => `#${tag}`).join(' ')}
          </li>
        )}
      </ul>
    </div>
  )
}
