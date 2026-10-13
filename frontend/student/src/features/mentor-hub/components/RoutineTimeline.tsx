import { conflictText } from '../model/routineApply.ts'
import { durationMinutes, slotText } from '../model/timeSlot.ts'
import type { MentorRoutineDetail, RoutineApplyConflict } from '../model/types.ts'
import styles from './RoutineTimeline.module.css'

interface RoutineTimelineProps {
  routine: MentorRoutineDetail
  /** 전체 적용 기준 기존 일정 충돌. 아직 확인 전이면 undefined */
  conflicts?: RoutineApplyConflict[]
  conflictCheckFailed: boolean
}

// Routine-01 Mockup "하루 Timeline": 시작 시간 · 점 · 세로선 / 할 일 · 설명 · 시간대 / 겹치는 기존 일정 안내
export function RoutineTimeline({ routine, conflicts, conflictCheckFailed }: RoutineTimelineProps) {
  return (
    <section className={styles.timeline} aria-labelledby="routine-timeline-heading">
      <h2 id="routine-timeline-heading" className={styles.heading}>
        {routine.timelineTitle}
      </h2>
      {conflictCheckFailed && <p className={styles.checkFailed}>내 기존 일정과 겹치는지 확인하지 못했어요.</p>}
      {routine.timeline.length > 0 ? (
        <ol className={styles.blocks}>
          {routine.timeline.map((block) => {
            const conflict = conflicts?.find((item) => item.targetId === block.blockId)
            return (
              <li key={block.blockId} className={styles.block}>
                <time className={styles.start} dateTime={block.slot.start}>
                  {block.slot.start}
                </time>
                <span className={styles.dot} aria-hidden="true" />
                <div className={styles.content}>
                  <h3 className={styles.title}>{block.title}</h3>
                  <p className={styles.description}>{block.description}</p>
                  <p className={styles.meta}>
                    {slotText(block.slot)} · {durationMinutes(block.slot)}분
                  </p>
                  {conflict && (
                    <p className={styles.conflict}>
                      <span className="lh-visually-hidden">기존 일정과 겹침: </span>
                      {conflictText(conflict)}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className={styles.empty}>등록된 Timeline이 없어요.</p>
      )}
    </section>
  )
}
