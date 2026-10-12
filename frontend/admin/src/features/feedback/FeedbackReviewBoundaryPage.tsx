import { useEffect, useRef } from 'react'
import { queueStageLabel, queueStatusLabel, type FeedbackQueueItem } from '../../read-model/feedbackQueue.ts'
import { daysUntil, formatDday, formatMonthDay, formatWaiting } from '../../read-model/time.ts'
import { sourceTypeLabel } from './model/feedbackQueue.ts'
import styles from './FeedbackReviewBoundaryPage.module.css'

interface FeedbackReviewBoundaryPageProps {
  /** 없는 feedbackId면 null */
  item: FeedbackQueueItem | null
  onBack: () => void
}

// Feedback Review 진입 Boundary (/feedback/:feedbackId). 실제 Review 화면(FeedbackDetail-01 / 02)은 다음 Branch에서 연결한다.
// 여기서는 어떤 항목을 열었는지만 보여준다. 동의 / 제외 / 전달 / 승인 같은 동작 · 성공 표시는 없다.
export function FeedbackReviewBoundaryPage({ item, onBack }: FeedbackReviewBoundaryPageProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [item?.feedbackId])

  const days = item?.deadlineDate ? daysUntil(item.deadlineDate) : null

  return (
    <div className={styles.page}>
      <button type="button" className={styles.back} onClick={onBack}>
        <span aria-hidden="true">‹</span> Feedback Dashboard<span className="lh-visually-hidden">로 돌아가기</span>
      </button>

      {item === null ? (
        <section className={styles.notice}>
          <h1 ref={headingRef} className={styles.noticeTitle} tabIndex={-1}>
            검토 항목을 찾을 수 없어요.
          </h1>
          <p>주소가 잘못되었거나 이미 Queue에서 빠진 항목이에요.</p>
        </section>
      ) : (
        <article className={styles.detail} aria-labelledby="feedback-review-title">
          <header className={styles.header}>
            <p className={styles.eyebrow}>
              {sourceTypeLabel[item.type]} · {item.subject}
            </p>
            <h1 id="feedback-review-title" ref={headingRef} className={styles.title} tabIndex={-1}>
              {item.title}
            </h1>
          </header>

          <dl className={styles.summary}>
            <div>
              <dt>학생</dt>
              <dd>
                {item.student.displayName} · {item.grade}
              </dd>
            </div>
            <div>
              <dt>Stage</dt>
              <dd>{queueStageLabel[item.stage]}</dd>
            </div>
            <div>
              <dt>Deadline</dt>
              <dd>{item.deadlineDate && days !== null ? `${formatMonthDay(item.deadlineDate)} · ${formatDday(days)}` : '마감 없음'}</dd>
            </div>
            <div>
              <dt>Waiting</dt>
              <dd>{formatWaiting(item.waitingHours)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{queueStatusLabel[item.status]}</dd>
            </div>
          </dl>

          <p className={styles.boundary} role="note">
            검토 화면은 다음 단계에서 연결됩니다. 지금은 Queue 항목 정보만 확인할 수 있어요.
          </p>
        </article>
      )}
    </div>
  )
}
