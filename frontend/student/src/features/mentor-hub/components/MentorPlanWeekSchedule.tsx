import type { MentorPlanDay, MentorPlanWeek } from '../model/types.ts'
import styles from './MentorPlanWeekSchedule.module.css'
import { UnderlineTabs } from './UnderlineTabs.tsx'

interface MentorPlanWeekScheduleProps {
  weeks: MentorPlanWeek[]
  selectedWeek: number
  onWeekSelect: (week: number) => void
}

const tabIdPrefix = 'mentor-plan-week-tab'
const panelId = 'mentor-plan-week-panel'

const dayName: Record<MentorPlanDay, string> = {
  월: '월요일',
  화: '화요일',
  수: '수요일',
  목: '목요일',
  금: '금요일',
  토: '토요일',
  일: '일요일',
}

// Plan Detail의 주차 Tab + 요일별 할 일 (Plan-01 Mockup: 요일 | 할 일(과목) | Memo)
// Tablet 이하에서는 Memo가 할 일 아래 보조 정보로 내려간다.
export function MentorPlanWeekSchedule({ weeks, selectedWeek, onWeekSelect }: MentorPlanWeekScheduleProps) {
  const tabs = weeks.map((week) => ({ id: String(week.week), label: `${week.week}주차` }))
  const current = weeks.find((week) => week.week === selectedWeek) ?? weeks[0]

  return (
    <section aria-labelledby="mentor-plan-schedule-heading">
      <h2 id="mentor-plan-schedule-heading" className="lh-visually-hidden">
        주차별 계획
      </h2>
      <UnderlineTabs
        items={tabs}
        selected={String(current.week)}
        onSelect={(id) => onWeekSelect(Number(id))}
        ariaLabel="Plan 주차"
        idPrefix={tabIdPrefix}
        panelId={panelId}
      />
      <div role="tabpanel" id={panelId} aria-labelledby={`${tabIdPrefix}-${current.week}`} className={styles.panel}>
        {current.items.length > 0 ? (
          <>
            <div className={styles.columns} aria-hidden="true">
              <span>요일</span>
              <span>할 일</span>
              <span>Memo</span>
            </div>
            <ol className={styles.items}>
              {current.items.map((item) => (
                <li key={item.itemId} className={styles.item}>
                  <p className={styles.day}>
                    <span aria-hidden="true">{item.day}</span>
                    <span className="lh-visually-hidden">{dayName[item.day]}</span>
                  </p>
                  <div className={styles.task}>
                    <p className={styles.taskTitle}>{item.task}</p>
                    <p className={styles.subject}>
                      <span className="lh-visually-hidden">과목: </span>
                      {item.subject}
                    </p>
                  </div>
                  {item.memo && (
                    <p className={styles.memo}>
                      <span className="lh-visually-hidden">Memo: </span>
                      {item.memo}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className={styles.empty}>이 주차에 등록된 계획이 없어요.</p>
        )}
      </div>
    </section>
  )
}
