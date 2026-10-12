import { activityPeriodText, activityTypeLabel } from '../model/activity.ts'
import type { InterviewRelatedActivity } from '../model/interview.ts'
import styles from '../SchoolInterviewPage.module.css'

/** Interview 비대상 학년 (질문이 없는 Empty와 다르다: 화면 자체가 대상이 아니다) */
export function InterviewIneligibleNotice({ onGoTasks }: { onGoTasks: () => void }) {
  return (
    <div className={styles.notice}>
      <h2 className={styles.noticeTitle}>Interview는 고3 학생에게 열려요.</h2>
      <p>지금 학년에서는 면접 질문을 볼 수 없어요. 고3이 되면 선생님이 공개한 질문으로 답변을 연습할 수 있어요.</p>
      <button type="button" className={styles.noticeButton} onClick={onGoTasks}>
        Tasks로 가기
      </button>
    </div>
  )
}

/** 관련 활동 한 줄 (목록 카드). Canonical Activity에서 읽고, 찾지 못하면 그 부분만 안내한다. */
export function InterviewRelatedSummary({ related }: { related: InterviewRelatedActivity[] }) {
  const found = related.filter((item) => item.activity)
  return (
    <p className={styles.meta}>
      관련 활동 ·{' '}
      {found.length > 0 ? found.map((item) => item.activity?.title).join(' · ') : <span className={styles.unavailable}>관련 활동 정보를 찾을 수 없어요.</span>}
      {found.length > 0 && found.length < related.length && <span className={styles.unavailable}> · 일부 활동 정보를 찾을 수 없어요.</span>}
    </p>
  )
}

/** 관련 활동 카드 (Question Detail): 유형 · 기간 · 이름 + 원본 활동 기록으로 이동 */
export function InterviewRelatedCard({ item, onOpen }: { item: InterviewRelatedActivity; onOpen: (activityId: string) => void }) {
  if (!item.activity) {
    return (
      <li className={styles.relatedItem}>
        <p className={styles.unavailable}>관련 활동 정보를 찾을 수 없어요.</p>
      </li>
    )
  }
  const { activity } = item
  return (
    <li className={styles.relatedItem}>
      <p className={styles.meta}>
        {activityTypeLabel(activity.type)} · {activityPeriodText(activity)}
      </p>
      <h3 className={styles.relatedTitle}>{activity.title}</h3>
      <button type="button" className={styles.secondaryAction} onClick={() => onOpen(activity.activityId)}>
        활동 기록 보기<span className="lh-visually-hidden">: {activity.title}</span>
      </button>
    </li>
  )
}
