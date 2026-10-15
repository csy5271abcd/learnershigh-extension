import type { RoutineBody } from '../api/types.ts'
import styles from './contentBody.module.css'

// Routine: Habit · 주기 · 시간 · 설명
export function RoutineView({ body }: { body: RoutineBody }) {
  return (
    <div className={styles.body}>
      {body.description && <p className={styles.lead}>{body.description}</p>}
      <ol className={styles.habits}>
        {body.habits.map((habit) => (
          <li key={habit.habitId} className={styles.habit}>
            <span className={styles.time}>
              {habit.start && habit.end ? `${habit.start}–${habit.end}` : '시간 미정'}
            </span>
            <div className={styles.habitMain}>
              <p className={styles.task}>
                {habit.title || '이름 없는 습관'}
                {habit.frequency && <span className={styles.frequency}>{habit.frequency}</span>}
              </p>
              {habit.description && <p className={styles.subtle}>{habit.description}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
