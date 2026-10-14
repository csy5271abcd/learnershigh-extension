import type { RecordBody } from '../../../api/types.ts'
import { recordAreaLabel, recordPeriodText } from '../model/labels.ts'
import styles from './body.module.css'

// Record: 개인정보를 지운 기록 문장 + 연결된 활동. 원본 파일 / 복사 / "내 기록으로 만들기" Action은 두지 않는다. (domain.md §33)
export function RecordView({ body }: { body: RecordBody }) {
  return (
    <div className={styles.body}>
      <p className={styles.meta}>
        {recordPeriodText(body)} · {recordAreaLabel(body.area)} · {body.subjectOrActivity || '과목 / 활동 미입력'}
      </p>
      <figure className={styles.record}>
        <figcaption className={styles.blockTitle}>기록 문장</figcaption>
        <blockquote className={styles.recordText}>{body.recordText || '기록 문장을 아직 쓰지 않았어요.'}</blockquote>
        <p className={styles.subtle}>개인정보를 지운 문장만 보여요. 원본 파일은 공개하지 않아요.</p>
      </figure>
      {body.linkedActivity && (
        <section className={styles.block} aria-labelledby="record-activity">
          <h3 id="record-activity" className={styles.blockTitle}>
            연결된 활동
          </h3>
          <p>{body.linkedActivity}</p>
        </section>
      )}
      {body.mentorNote && (
        <section className={styles.block} aria-labelledby="record-note">
          <h3 id="record-note" className={styles.blockTitle}>
            멘토 메모
          </h3>
          <p>{body.mentorNote}</p>
        </section>
      )}
    </div>
  )
}
