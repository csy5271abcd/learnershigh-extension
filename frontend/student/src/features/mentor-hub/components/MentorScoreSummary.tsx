import type { MentorScoreSummary as ScoreSummary } from '../model/types.ts'
import styles from './MentorProfileSections.module.css'

interface MentorScoreSummaryProps {
  summary?: ScoreSummary
}

const formatGrade = (grade: number) => grade.toFixed(1)

/** 9등급제에서 1등급에 가까울수록 막대가 길다. (1등급 = 100%, 9등급 = 0%) */
const gradeBarPercent = (grade: number) => Math.max(0, Math.min(100, ((9 - grade) / 8) * 100))

export function MentorScoreSummary({ summary }: MentorScoreSummaryProps) {
  const schoolGrades = summary?.schoolGrades
  const csat = summary?.csat

  if (!schoolGrades && !csat) {
    return <p className={styles.emptyNotice}>공개한 성적 정보가 없어요.</p>
  }

  const terms = schoolGrades?.terms ?? []
  const average = terms.length > 0 ? terms.reduce((sum, term) => sum + term.averageGrade, 0) / terms.length : 0

  return (
    <div className={styles.scoreGrid}>
      {schoolGrades && terms.length > 0 && (
        <section className={styles.scoreCard} aria-labelledby="school-grades-heading">
          <div className={styles.scoreCardHeader}>
            <h3 id="school-grades-heading">내신 · 학기별 평균 등급</h3>
            <span className={styles.scoreMeta}>{schoolGrades.scaleLabel}</span>
          </div>
          <p className={styles.gradeAverage}>
            <strong>{formatGrade(average)}</strong>
            <span>
              {terms.length}학기 평균 · {formatGrade(terms[0].averageGrade)} → {formatGrade(terms[terms.length - 1].averageGrade)}
            </span>
          </p>
          <ul className={styles.gradeList}>
            {terms.map((term) => (
              <li key={term.term} className={styles.gradeRow}>
                <span className={styles.gradeTerm}>{term.term}</span>
                <span className={styles.gradeTrack} aria-hidden="true">
                  <span className={styles.gradeBar} style={{ width: `${gradeBarPercent(term.averageGrade)}%` }} />
                </span>
                <span className={styles.gradeValue}>
                  {formatGrade(term.averageGrade)}
                  <span className="lh-visually-hidden">등급</span>
                </span>
              </li>
            ))}
          </ul>
          <p className={styles.scoreFootnote}>막대가 길수록 등급이 높아요 (1등급에 가까워요)</p>
        </section>
      )}

      {csat && (
        <section className={styles.scoreCard} aria-labelledby="csat-heading">
          <div className={styles.scoreCardHeader}>
            <h3 id="csat-heading">수능 성적</h3>
            <span className={styles.scoreMeta}>{csat.basisLabel}</span>
          </div>
          <table className={styles.csatTable}>
            <thead>
              <tr>
                <th scope="col">영역</th>
                <th scope="col">선택 과목</th>
                <th scope="col" className={styles.numeric}>
                  등급
                </th>
                <th scope="col" className={styles.numeric}>
                  백분위
                </th>
              </tr>
            </thead>
            <tbody>
              {csat.subjects.map((subject) => (
                <tr key={`${subject.area}-${subject.subject}`}>
                  <td className={styles.csatArea}>{subject.area}</td>
                  <td>{subject.subject}</td>
                  <td className={`${styles.numeric} ${styles.gradeCell} ${subject.grade === 1 ? styles.topGrade : ''}`}>
                    {subject.grade}등급
                  </td>
                  <td className={styles.numeric}>
                    {subject.percentile ?? (
                      <>
                        <span aria-hidden="true">-</span>
                        <span className="lh-visually-hidden">없음</span>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {csat.minimumRequirement && <p className={styles.csatNote}>{csat.minimumRequirement}</p>}
        </section>
      )}
    </div>
  )
}
