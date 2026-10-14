import type { RoutineBody, RoutineHabit } from '../../../api/types.ts'
import { TextAreaField, TextField } from '../../../components/FormFields.tsx'
import ui from '../../../components/ui.module.css'
import { newLocalId } from '../model/contentForm.ts'
import styles from './body.module.css'

interface RoutineEditorProps {
  value: RoutineBody
  onChange: (next: RoutineBody) => void
}

const newHabit = (): RoutineHabit => ({
  habitId: newLocalId('habit'),
  title: '',
  frequency: '',
  start: '',
  end: '',
  description: '',
})

// Routine: Habit · 주기 · 시간 · 설명
export function RoutineEditor({ value, onChange }: RoutineEditorProps) {
  const updateHabit = (habitId: string, patch: Partial<RoutineHabit>) =>
    onChange({ ...value, habits: value.habits.map((habit) => (habit.habitId === habitId ? { ...habit, ...patch } : habit)) })

  return (
    <div className={ui.form}>
      <TextAreaField
        label="루틴 설명"
        optional
        rows={3}
        value={value.description}
        onChange={(event) => onChange({ ...value, description: event.target.value })}
      />
      <fieldset className={styles.editorGroup}>
        <legend className="visually-hidden">습관</legend>
        <div className={styles.editorGroupHeader} aria-hidden="true">
          <span>습관</span>
        </div>
        {value.habits.map((habit, index) => (
          <div key={habit.habitId} className={`${styles.habitItem} ${styles.itemDivider}`}>
            <TextField
              compact
              label={`${index + 1}번 습관 이름`}
              value={habit.title}
              onChange={(event) => updateHabit(habit.habitId, { title: event.target.value })}
            />
            <TextField
              compact
              label="주기"
              placeholder="예: 평일"
              value={habit.frequency}
              onChange={(event) => updateHabit(habit.habitId, { frequency: event.target.value })}
            />
            <TextField
              compact
              type="time"
              label="시작"
              value={habit.start}
              onChange={(event) => updateHabit(habit.habitId, { start: event.target.value })}
            />
            <TextField
              compact
              type="time"
              label="끝"
              value={habit.end}
              onChange={(event) => updateHabit(habit.habitId, { end: event.target.value })}
            />
            <button
              type="button"
              className={`${ui.button} ${ui.ghost}`}
              onClick={() => onChange({ ...value, habits: value.habits.filter((item) => item.habitId !== habit.habitId) })}
              aria-label={`${index + 1}번 습관 삭제`}
            >
              삭제
            </button>
            <div className={styles.wide}>
              <TextField
                compact
                optional
                label="설명"
                value={habit.description}
                onChange={(event) => updateHabit(habit.habitId, { description: event.target.value })}
              />
            </div>
          </div>
        ))}
        <div className={ui.actions}>
          <button
            type="button"
            className={`${ui.button} ${ui.neutral} ${ui.small}`}
            onClick={() => onChange({ ...value, habits: [...value.habits, newHabit()] })}
          >
            습관 추가
          </button>
        </div>
      </fieldset>
    </div>
  )
}
