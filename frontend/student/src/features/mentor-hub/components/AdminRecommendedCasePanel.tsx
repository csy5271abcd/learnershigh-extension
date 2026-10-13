import { formatMonthDay, mentorAffiliation } from '../model/format.ts'
import type { AdminRecommendedCase } from '../model/types.ts'
import styles from './AdminRecommendedCasePanel.module.css'

interface AdminRecommendedCasePanelProps {
  recommendedCase: AdminRecommendedCase
  studentDisplayName: string
  onCaseSelect?: (caseId: string) => void
}

export function AdminRecommendedCasePanel({
  recommendedCase,
  studentDisplayName,
  onCaseSelect,
}: AdminRecommendedCasePanelProps) {
  const { mentor, linkedTask, processSteps } = recommendedCase

  return (
    <article className={styles.panel}>
      <div className={styles.main}>
        <p className={styles.badges}>
          <span className={styles.adminBadge}>Admin 추천</span>
          <span className={styles.kindBadge}>Activity Case</span>
        </p>
        <h3 className={styles.title}>{recommendedCase.title}</h3>
        <p className={styles.mentor}>
          {mentor.name} · {mentorAffiliation(mentor)} · {mentor.admissionType}
        </p>

        <div className={styles.link}>
          <p className={styles.linkLabel}>{studentDisplayName}님의 Task와 연결돼요</p>
          <p className={styles.linkTask}>{linkedTask.title}</p>
          <p className={styles.linkReason}>{recommendedCase.relationReason}</p>
        </div>

        <p className={styles.meta}>
          추천일 · <time dateTime={recommendedCase.recommendedDate}>{formatMonthDay(recommendedCase.recommendedDate)}</time>
        </p>
      </div>

      <div className={styles.aside}>
        {processSteps.length > 0 && (
          <div>
            <p className={styles.stepsLabel}>이 Case에서 볼 수 있는 과정</p>
            <ol className={styles.steps}>
              {processSteps.map((step, index) => (
                <li key={step} className={styles.step}>
                  <span className={styles.stepNumber}>{index + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}
        <button
          type="button"
          className={styles.caseButton}
          aria-label={`${recommendedCase.title} Case 보기`}
          onClick={() => onCaseSelect?.(recommendedCase.caseId)}
        >
          Case 보기
        </button>
      </div>
    </article>
  )
}
