import { useState } from 'react'
import { MentorAvatar } from './components/MentorAvatar.tsx'
import skeletonStyles from './components/MentorHubHomeSkeleton.module.css'
import { MentorPlanWeekSchedule } from './components/MentorPlanWeekSchedule.tsx'
import { mentorAffiliation } from './model/format.ts'
import type { MentorPlanDetail } from './model/types.ts'
import { useMentorPlan } from './model/useMentorPlan.ts'
import homeStyles from './MentorHubHomePage.module.css'
import styles from './MentorPlanDetailPage.module.css'
import profileStyles from './MentorProfilePage.module.css'

interface MentorPlanDetailPageProps {
  contentId: string
  /** Data Source Boundary. 현재는 Fixture Loader, API 연결 시 GET /api/student/mentor-content/{contentId}. */
  loadPlan: (contentId: string) => Promise<MentorPlanDetail | null>
  /** 선택 주차는 호출 측(Route, URL)이 소유해 Profile 왕복 / 새로고침 후에도 유지한다. 없으면 1주차. */
  selectedWeek?: number
  onWeekSelect: (week: number) => void
  onBack: () => void
  onGoToPlanList: () => void
  onMentorSelect: (mentorId: string) => void
  /**
   * 내 계획에 적용 Flow 진입 Boundary. (시작일 → 항목 선택 → 교재 연결 → 충돌 확인 → 추가)
   * Apply Flow는 다음 단계에서 연결한다. 연결 전에는 버튼이 "아직 연결되지 않음" 안내만 보여준다.
   */
  onApply?: (plan: MentorPlanDetail) => void
}

export function MentorPlanDetailPage({
  contentId,
  loadPlan,
  selectedWeek,
  onWeekSelect,
  onBack,
  onGoToPlanList,
  onMentorSelect,
  onApply,
}: MentorPlanDetailPageProps) {
  const { state, reload } = useMentorPlan(contentId, loadPlan)

  return (
    <main className={`${homeStyles.page} ${profileStyles.page}`} aria-busy={state.status === 'loading'}>
      <button type="button" className={profileStyles.back} onClick={onBack}>
        <span aria-hidden="true">‹</span> Mentor
        <span className="lh-visually-hidden">로 돌아가기</span>
      </button>

      {state.status === 'loading' && (
        <>
          <p className="lh-visually-hidden" role="status">
            Plan을 불러오는 중이에요.
          </p>
          <MentorPlanDetailSkeleton />
        </>
      )}

      {state.status === 'error' && (
        <div className={homeStyles.errorNotice} role="alert">
          <h1 className={homeStyles.errorTitle}>Plan을 불러오지 못했어요.</h1>
          <p className={homeStyles.errorDescription}>잠시 후 다시 시도해 주세요.</p>
          <button type="button" className={homeStyles.retryButton} onClick={reload}>
            다시 시도
          </button>
        </div>
      )}

      {state.status === 'notFound' && (
        <div className={homeStyles.errorNotice}>
          <h1 className={homeStyles.errorTitle}>Plan을 찾을 수 없어요.</h1>
          <p className={homeStyles.errorDescription}>주소가 잘못되었거나 공개되지 않은 Plan이에요.</p>
          <button type="button" className={homeStyles.retryButton} onClick={onGoToPlanList}>
            Plan 목록으로 이동
          </button>
        </div>
      )}

      {state.status === 'success' && (
        <>
          <PlanSummary key={state.data.contentId} plan={state.data} onMentorSelect={onMentorSelect} onApply={onApply} />
          <MentorPlanWeekSchedule weeks={state.data.weeks} selectedWeek={selectedWeek ?? 1} onWeekSelect={onWeekSelect} />
        </>
      )}
    </main>
  )
}

interface PlanSummaryProps {
  plan: MentorPlanDetail
  onMentorSelect: (mentorId: string) => void
  onApply?: (plan: MentorPlanDetail) => void
}

function PlanSummary({ plan, onMentorSelect, onApply }: PlanSummaryProps) {
  const { mentor } = plan
  const [showApplyNotice, setShowApplyNotice] = useState(false)

  return (
    <header className={styles.summary}>
      <div className={styles.summaryText}>
        <p className={styles.badge}>Mentor Plan</p>
        <h1 className={styles.title}>{plan.title}</h1>
        <button type="button" className={styles.mentor} onClick={() => onMentorSelect(mentor.mentorId)}>
          <MentorAvatar name={mentor.name} imageUrl={mentor.profileImageUrl} size="md" />
          <span className={styles.mentorText}>
            {mentor.name} · {mentorAffiliation(mentor)} · {mentor.admissionType}
            <span className="lh-visually-hidden"> Profile 보기</span>
          </span>
        </button>
        <p className={styles.meta}>
          {plan.durationWeeks === 1 ? `${plan.daysPerWeek}일` : `${plan.durationWeeks}주 · 주 ${plan.daysPerWeek}일`}
        </p>
        <p className={styles.description}>{plan.description}</p>
      </div>

      <div className={styles.apply}>
        <button
          type="button"
          className={styles.applyButton}
          onClick={() => (onApply ? onApply(plan) : setShowApplyNotice(true))}
        >
          내 계획에 적용
        </button>
        <p className={styles.applyNotice} role="status">
          {!onApply && showApplyNotice ? '내 계획에 적용하는 단계는 아직 연결되지 않았어요.' : ''}
        </p>
      </div>
    </header>
  )
}

// Summary(Badge · 제목 · Mentor · 기간 · 설명) + 주차 Tab + 요일 행의 실제 배치와 같은 Skeleton
function MentorPlanDetailSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <span className={`${skeletonStyles.block} ${styles.skeletonBadge}`} />
      <span className={`${skeletonStyles.block} ${styles.skeletonTitle}`} />
      <span className={`${skeletonStyles.block} ${styles.skeletonLine}`} />
      <span className={`${skeletonStyles.block} ${styles.skeletonText}`} />
      <span className={`${skeletonStyles.block} ${styles.skeletonTabs}`} />
      {[0, 1, 2, 3, 4].map((key) => (
        <span key={key} className={`${skeletonStyles.block} ${styles.skeletonRow}`} />
      ))}
    </div>
  )
}
