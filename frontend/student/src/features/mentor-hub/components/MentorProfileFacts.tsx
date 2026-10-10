import type { MentorSummary } from '../model/types.ts'
import styles from './MentorProfileSections.module.css'

interface MentorProfileFactsProps {
  mentor: MentorSummary
}

// 고교 Context는 Home과 같은 값을 쓰고, 첫 항목(학교 유형)을 제목으로 나눠 보여준다.
function splitHighSchoolContext(context: string) {
  const [head, ...rest] = context.split(' · ')
  return { head, rest: rest.join(' · ') }
}

export function MentorProfileFacts({ mentor }: MentorProfileFactsProps) {
  const highSchool = splitHighSchoolContext(mentor.highSchoolContext)

  return (
    <dl className={styles.facts}>
      <div className={styles.fact}>
        <dt>고교 당시</dt>
        <dd>
          <span className={styles.factValue}>{highSchool.head}</span>
          {highSchool.rest && <span className={styles.factDetail}>{highSchool.rest}</span>}
        </dd>
      </div>
      <div className={styles.fact}>
        <dt>전형</dt>
        <dd>
          <span className={styles.factValue}>{mentor.admissionType}</span>
        </dd>
      </div>
      <div className={styles.fact}>
        <dt>Tag</dt>
        <dd>
          <span className={styles.factTags}>
            {mentor.tags.map((tag) => (
              <span key={tag} className={styles.factTag}>
                #{tag}
              </span>
            ))}
          </span>
        </dd>
      </div>
    </dl>
  )
}
