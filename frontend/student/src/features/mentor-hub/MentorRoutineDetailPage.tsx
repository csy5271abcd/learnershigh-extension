import type { ReactNode } from 'react'
import { MentorAvatar } from './components/MentorAvatar.tsx'
import skeletonStyles from './components/MentorHubHomeSkeleton.module.css'
import { RoutineHabitList } from './components/RoutineHabitList.tsx'
import { RoutineTimeline } from './components/RoutineTimeline.tsx'
import { mentorAffiliation } from './model/format.ts'
import type { MentorRoutineDetail, RoutineApplyMode, RoutineApplyPreviewResult } from './model/types.ts'
import { useContentDetail } from './model/useContentDetail.ts'
import homeStyles from './MentorHubHomePage.module.css'
// Badge / 제목 / Mentor 표시는 Plan Detail과 같은 모양을 쓴다.
import detailStyles from './MentorPlanDetailPage.module.css'
import profileStyles from './MentorProfilePage.module.css'
import styles from './MentorRoutineDetailPage.module.css'

interface MentorRoutineDetailPageProps {
  contentId: string
  /** Data Source Boundary. 현재는 Fixture Loader, API 연결 시 GET /api/student/mentor-content/{contentId}. */
  loadRoutine: (contentId: string) => Promise<MentorRoutineDetail | null>
  /** 전체 Timeline 기준 기존 일정 충돌 (Timeline 안내용, routine-apply-preview와 같은 Data Source) */
  loadConflicts: (contentId: string) => Promise<RoutineApplyPreviewResult | null>
  /** 고른 Habit은 호출 측(Route, URL)이 소유해 Profile 왕복 / 적용 취소 후에도 유지한다. */
  selectedHabitIds: string[]
  onHabitSelectionChange: (habitIds: string[]) => void
  onBack: () => void
  onGoToRoutineList: () => void
  onMentorSelect: (mentorId: string) => void
  onApply: (mode: RoutineApplyMode) => void
  /** Routine을 불러온 뒤 Detail 위에 그릴 화면 (적용 Modal Route) */
  overlay?: (routine: MentorRoutineDetail) => ReactNode
}

// Routine Detail (Routine-01 Mockup): 제목 · Mentor · 적용 버튼 / 설명 / 왼쪽 Timeline, 오른쪽 Habit 선택
export function MentorRoutineDetailPage({
  contentId,
  loadRoutine,
  loadConflicts,
  selectedHabitIds,
  onHabitSelectionChange,
  onBack,
  onGoToRoutineList,
  onMentorSelect,
  onApply,
  overlay,
}: MentorRoutineDetailPageProps) {
  const { state, reload } = useContentDetail(contentId, loadRoutine)
  const { state: conflictState } = useContentDetail(contentId, loadConflicts)

  return (
    <main className={`${homeStyles.page} ${profileStyles.page}`} aria-busy={state.status === 'loading'}>
      <button type="button" className={profileStyles.back} onClick={onBack}>
        <span aria-hidden="true">‹</span> Mentor
        <span className="lh-visually-hidden">로 돌아가기</span>
      </button>

      {state.status === 'loading' && (
        <>
          <p className="lh-visually-hidden" role="status">
            Routine을 불러오는 중이에요.
          </p>
          <RoutineDetailSkeleton />
        </>
      )}

      {state.status === 'error' && (
        <div className={homeStyles.errorNotice} role="alert">
          <h1 className={homeStyles.errorTitle}>Routine을 불러오지 못했어요.</h1>
          <p className={homeStyles.errorDescription}>잠시 후 다시 시도해 주세요.</p>
          <button type="button" className={homeStyles.retryButton} onClick={reload}>
            다시 시도
          </button>
        </div>
      )}

      {state.status === 'notFound' && (
        <div className={homeStyles.errorNotice}>
          <h1 className={homeStyles.errorTitle}>Routine을 찾을 수 없어요.</h1>
          <p className={homeStyles.errorDescription}>주소가 잘못되었거나 공개되지 않은 Routine이에요.</p>
          <button type="button" className={homeStyles.retryButton} onClick={onGoToRoutineList}>
            Routine 목록으로 이동
          </button>
        </div>
      )}

      {state.status === 'success' && (
        <>
          <RoutineSummary
            routine={state.data}
            selectedCount={selectedHabitIds.length}
            onMentorSelect={onMentorSelect}
            onApply={onApply}
          />
          <div className={styles.columns}>
            <RoutineTimeline
              routine={state.data}
              conflicts={conflictState.status === 'success' ? conflictState.data.conflicts : undefined}
              conflictCheckFailed={conflictState.status === 'error'}
            />
            <RoutineHabitList
              habits={state.data.habits}
              selectedHabitIds={selectedHabitIds}
              onSelectionChange={onHabitSelectionChange}
            />
          </div>
          {overlay?.(state.data)}
        </>
      )}
    </main>
  )
}

interface RoutineSummaryProps {
  routine: MentorRoutineDetail
  selectedCount: number
  onMentorSelect: (mentorId: string) => void
  onApply: (mode: RoutineApplyMode) => void
}

function RoutineSummary({ routine, selectedCount, onMentorSelect, onApply }: RoutineSummaryProps) {
  const { mentor } = routine
  const habitsBlockedId = 'routine-habits-blocked'
  const habitsBlocked = routine.habits.length === 0 ? '이 Routine에는 따로 고를 습관이 없어요.' : selectedCount === 0 ? '적용할 습관을 골라주세요.' : undefined

  return (
    <header className={styles.summary}>
      <div className={styles.heading}>
        <p className={detailStyles.badge}>Routine</p>
        <h1 className={detailStyles.title}>{routine.title}</h1>
        <button type="button" className={detailStyles.mentor} onClick={() => onMentorSelect(mentor.mentorId)}>
          <MentorAvatar name={mentor.name} imageUrl={mentor.profileImageUrl} size="md" />
          <span className={detailStyles.mentorText}>
            {mentor.name} · {mentorAffiliation(mentor)} · {mentor.admissionType}
            <span className="lh-visually-hidden"> Profile 보기</span>
          </span>
        </button>
      </div>

      <div className={styles.actions}>
        <div className={styles.actionButtons}>
          <button
            type="button"
            className={styles.habitsButton}
            aria-haspopup="dialog"
            disabled={habitsBlocked !== undefined}
            aria-describedby={habitsBlocked ? habitsBlockedId : undefined}
            onClick={() => onApply('habits')}
          >
            습관만 적용 ({selectedCount})
          </button>
          <button
            type="button"
            className={styles.allButton}
            aria-haspopup="dialog"
            disabled={routine.timeline.length === 0}
            onClick={() => onApply('all')}
          >
            전체 적용
          </button>
        </div>
        {habitsBlocked && (
          <p id={habitsBlockedId} className={styles.actionHint}>
            {habitsBlocked}
          </p>
        )}
      </div>

      <p className={`${detailStyles.description} ${styles.description}`}>{routine.description}</p>
    </header>
  )
}

// 제목 / Mentor / 설명 + Timeline · Habit 2열의 실제 배치와 같은 Skeleton
function RoutineDetailSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <span className={`${skeletonStyles.block} ${styles.skeletonTitle}`} />
      <span className={`${skeletonStyles.block} ${styles.skeletonLine}`} />
      <div className={styles.columns}>
        <span className={`${skeletonStyles.block} ${styles.skeletonPanel}`} />
        <span className={`${skeletonStyles.block} ${styles.skeletonPanel}`} />
      </div>
    </div>
  )
}
