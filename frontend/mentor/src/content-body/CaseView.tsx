import type { CaseBody } from '../api/types.ts'
import styles from './contentBody.module.css'

// Case: 활동 단계 / Evidence Summary / 결과 / Reflection. 단계 수와 이름은 Case마다 다르다. (domain.md §34)
export function CaseView({ body }: { body: CaseBody }) {
  const sections = [
    { id: 'evidence', title: 'Evidence', text: body.evidenceSummary },
    { id: 'result', title: '결과', text: body.result },
    { id: 'reflection', title: 'Reflection', text: body.reflection },
    { id: 'follow-up', title: '후속 활동', text: body.followUp },
  ].filter((section) => section.text.trim())

  return (
    <div className={styles.body}>
      <p className={styles.meta}>
        고{body.grade} · {body.subject || '과목 / 영역 미입력'}
        {body.activityType && ` · ${body.activityType}`}
      </p>
      {body.summary && <p className={styles.lead}>{body.summary}</p>}
      <section className={styles.block} aria-labelledby="case-stages">
        <h3 id="case-stages" className={styles.blockTitle}>
          활동 단계
        </h3>
        <ol className={styles.stages}>
          {body.stages.map((stage, index) => (
            <li key={stage.stageId} className={styles.stage}>
              <span className={styles.stageNumber} aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <p className={styles.task}>{stage.title || `${index + 1}단계`}</p>
                {stage.description && <p className={styles.subtle}>{stage.description}</p>}
              </div>
            </li>
          ))}
        </ol>
      </section>
      {sections.map((section) => (
        <section key={section.id} className={styles.block} aria-labelledby={`case-${section.id}`}>
          <h3 id={`case-${section.id}`} className={styles.blockTitle}>
            {section.title}
          </h3>
          <p>{section.text}</p>
        </section>
      ))}
    </div>
  )
}
