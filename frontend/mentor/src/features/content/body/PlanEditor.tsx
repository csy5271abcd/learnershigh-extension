import type { PlanBody, PlanBodyItem, PlanDay } from '../../../api/types.ts'
import { SelectField, TextAreaField, TextField } from '../../../components/FormFields.tsx'
import ui from '../../../components/ui.module.css'
import { newLocalId } from '../model/contentForm.ts'
import { planDays } from '../../../content-body/labels.ts'
import styles from './editor.module.css'

interface PlanEditorProps {
  value: PlanBody
  onChange: (next: PlanBody) => void
}

const newItem = (): PlanBodyItem => ({ itemId: newLocalId('item'), day: '월', subject: '', task: '', memo: '' })

// Plan: 주차별로 요일 · 과목 · 할 일 · Memo를 적는다.
export function PlanEditor({ value, onChange }: PlanEditorProps) {
  const setWeekItems = (weekIndex: number, items: PlanBodyItem[]) =>
    onChange({ ...value, weeks: value.weeks.map((week, index) => (index === weekIndex ? { ...week, items } : week)) })

  const updateItem = (weekIndex: number, itemId: string, patch: Partial<PlanBodyItem>) =>
    setWeekItems(
      weekIndex,
      value.weeks[weekIndex].items.map((item) => (item.itemId === itemId ? { ...item, ...patch } : item)),
    )

  const removeWeek = (weekIndex: number) =>
    onChange({
      ...value,
      // 주차 번호는 순서대로 다시 매긴다.
      weeks: value.weeks.filter((_, index) => index !== weekIndex).map((week, index) => ({ ...week, week: index + 1 })),
    })

  return (
    <div className={ui.form}>
      <TextAreaField
        label="계획 설명"
        optional
        rows={3}
        value={value.description}
        onChange={(event) => onChange({ ...value, description: event.target.value })}
        help="어떤 시기에, 왜 이렇게 나눴는지 적어 주세요."
      />
      {value.weeks.map((week, weekIndex) => (
        <fieldset key={week.week} className={styles.editorGroup}>
          <legend className="visually-hidden">{week.week}주차</legend>
          <div className={styles.editorGroupHeader} aria-hidden="true">
            <span>{week.week}주차</span>
          </div>
          {week.items.map((item, itemIndex) => (
            <div key={item.itemId} className={`${styles.editorItem} ${styles.itemDivider}`}>
              <SelectField
                compact
                label={`${itemIndex + 1}번 요일`}
                value={item.day}
                onChange={(event) => updateItem(weekIndex, item.itemId, { day: event.target.value as PlanDay })}
              >
                {planDays.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </SelectField>
              <TextField
                compact
                label="과목"
                value={item.subject}
                onChange={(event) => updateItem(weekIndex, item.itemId, { subject: event.target.value })}
              />
              <TextField
                compact
                label="할 일"
                value={item.task}
                onChange={(event) => updateItem(weekIndex, item.itemId, { task: event.target.value })}
              />
              <TextField
                compact
                optional
                label="Memo"
                value={item.memo}
                onChange={(event) => updateItem(weekIndex, item.itemId, { memo: event.target.value })}
              />
              <button
                type="button"
                className={`${ui.button} ${ui.ghost}`}
                onClick={() => setWeekItems(weekIndex, week.items.filter((current) => current.itemId !== item.itemId))}
                aria-label={`${week.week}주차 ${itemIndex + 1}번 할 일 삭제`}
              >
                삭제
              </button>
            </div>
          ))}
          <div className={ui.actions}>
            <button
              type="button"
              className={`${ui.button} ${ui.neutral} ${ui.small}`}
              onClick={() => setWeekItems(weekIndex, [...week.items, newItem()])}
            >
              {week.week}주차 할 일 추가
            </button>
            {value.weeks.length > 1 && (
              <button type="button" className={`${ui.button} ${ui.ghost} ${ui.small}`} onClick={() => removeWeek(weekIndex)}>
                {week.week}주차 삭제
              </button>
            )}
          </div>
        </fieldset>
      ))}
      <div className={ui.actions}>
        <button
          type="button"
          className={`${ui.button} ${ui.secondary}`}
          onClick={() => onChange({ ...value, weeks: [...value.weeks, { week: value.weeks.length + 1, items: [newItem()] }] })}
        >
          주차 추가
        </button>
      </div>
    </div>
  )
}
