import { durationMinutes } from '../model/timeSlot.ts'
import type { MentorRoutineHabit } from '../model/types.ts'
import styles from './RoutineHabitList.module.css'

interface RoutineHabitListProps {
  habits: MentorRoutineHabit[]
  selectedHabitIds: string[]
  onSelectionChange: (habitIds: string[]) => void
}

// Routine-01 Mockup "Habit": 원하는 습관만 골라 "습관만 적용"에 쓴다. (native checkbox)
export function RoutineHabitList({ habits, selectedHabitIds, onSelectionChange }: RoutineHabitListProps) {
  const toggle = (habitId: string, checked: boolean) =>
    onSelectionChange(
      // Routine 순서를 유지한다.
      habits.map((habit) => habit.habitId).filter((id) => (id === habitId ? checked : selectedHabitIds.includes(id))),
    )

  return (
    <section className={styles.habits} aria-labelledby="routine-habit-heading">
      <h2 id="routine-habit-heading" className={styles.heading}>
        Habit
      </h2>
      <p className={styles.lead}>원하는 습관만 골라서 내 계획에 적용할 수 있어요.</p>
      {habits.length > 0 ? (
        <ul className={styles.list}>
          {habits.map((habit) => (
            <li key={habit.habitId}>
              <label className={styles.card}>
                <input
                  type="checkbox"
                  className={styles.check}
                  checked={selectedHabitIds.includes(habit.habitId)}
                  onChange={(event) => toggle(habit.habitId, event.target.checked)}
                />
                <span className={styles.text}>
                  <span className={styles.title}>{habit.title}</span>
                  <span className={styles.meta}>
                    {habit.frequency} {habit.slot.start} · {durationMinutes(habit.slot)}분
                  </span>
                  <span className={styles.description}>{habit.description}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>이 Routine에 등록된 습관이 없어요.</p>
      )}
    </section>
  )
}
