import type { PlanBody } from '../api/types.ts'
import styles from './contentBody.module.css'

// Plan: 주차 → 요일 · 할 일 · 과목 · Memo (Plan-01 Mockup의 표 구성)
export function PlanView({ body }: { body: PlanBody }) {
  const itemCount = body.weeks.reduce((sum, week) => sum + week.items.length, 0)

  return (
    <div className={styles.body}>
      {body.description && <p className={styles.lead}>{body.description}</p>}
      <p className={styles.meta}>
        {body.weeks.length}주 · 할 일 {itemCount}개
      </p>
      {body.weeks.map((week) => (
        <section key={week.week} className={styles.block} aria-labelledby={`plan-week-${week.week}`}>
          <h3 id={`plan-week-${week.week}`} className={styles.blockTitle}>
            {week.week}주차
          </h3>
          {week.items.length === 0 ? (
            <p className={styles.meta}>이 주차에는 할 일이 없어요.</p>
          ) : (
            <table className={styles.planTable}>
              <thead>
                <tr>
                  <th scope="col">요일</th>
                  <th scope="col">할 일</th>
                  <th scope="col">Memo</th>
                </tr>
              </thead>
              <tbody>
                {week.items.map((item) => (
                  <tr key={item.itemId}>
                    <th scope="row" className={styles.day}>
                      {item.day}
                    </th>
                    <td>
                      <span className={styles.task}>{item.task}</span>
                      <span className={styles.subject}>{item.subject}</span>
                    </td>
                    <td>{item.memo ? <span className={styles.memo}>{item.memo}</span> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}
    </div>
  )
}
