import type { AdminState } from '../store/adminStore.ts'
import { DEADLINE_SOON_DAYS, deliveredFeedback, deriveFeedbackQueue, LONG_WAIT_HOURS } from './feedbackQueue.ts'
import { CONSECUTIVE_ABSENT_DAYS, isActiveTask, PLAN_LOW_RATE } from './studentInsights.ts'
import { daysUntil, hoursBetween } from './time.ts'
import { parentReportUnsent } from './todayBoard.ts'

/*
 * Operations Dashboard Read Model (api-contract §39 KPI 이름 그대로). 모든 값은 Shared Entity / 기존 Study 데이터에서 계산한다.
 * 수동 Counter 없음. 상담 관련 KPI / Alert는 Wangyu 영역이라 두지 않는다.
 */

export interface OperationsKpi {
  registeredStudents: number
  studentsWithStudyRecordToday: number
  activeTasks: number
  taskFeedbackPending: number
  activityFeedbackPending: number
  deadlineRisk: number
  parentReportUnsent: number
  /** 전달된 검토의 Queue 진입 → 전달 평균 시간 (소수 1자리). 이력이 없으면 null */
  averageFirstReviewHours: number | null
  queueOver48Hours: number
}

export type OperationsAlertKind = 'feedback-bottleneck' | 'parent-report-unsent' | 'plan-low' | 'consecutive-absence' | 'deadline-risk'

export interface OperationsAlert {
  kind: OperationsAlertKind
  title: string
  detail: string
  /** 관련 학생 / 항목 수 */
  count: number
  /** 이동할 화면 (Admin 주소) */
  href: string
}

export function computeOperationsKpi(state: AdminState): OperationsKpi {
  const queue = deriveFeedbackQueue(state)
  const delivered = deliveredFeedback(state).filter((item) => item.queuedAt)
  const active = state.tasks.filter(isActiveTask)
  return {
    registeredStudents: state.students.length,
    studentsWithStudyRecordToday: state.study.filter((item) => item.todayStudyMinutes > 0).length,
    activeTasks: active.length,
    taskFeedbackPending: queue.filter((item) => item.type === 'task').length,
    activityFeedbackPending: queue.filter((item) => item.type === 'activity').length,
    deadlineRisk: active.filter((task) => {
      const days = daysUntil(task.deadlineDate)
      return days >= 0 && days <= DEADLINE_SOON_DAYS
    }).length,
    parentReportUnsent: parentReportUnsent(state),
    averageFirstReviewHours:
      delivered.length === 0 ? null : Math.round((delivered.reduce((sum, item) => sum + hoursBetween(item.queuedAt!, item.deliveredAt), 0) / delivered.length) * 10) / 10,
    queueOver48Hours: queue.filter((item) => item.waitingHours > LONG_WAIT_HOURS).length,
  }
}

export function computeOperationsAlerts(state: AdminState): OperationsAlert[] {
  const kpi = computeOperationsKpi(state)
  const lowPlan = state.study.filter((item) => item.recent7DayPlanRate < PLAN_LOW_RATE).length
  const absent = state.study.filter((item) => item.consecutiveAbsentDays >= CONSECUTIVE_ABSENT_DAYS).length
  const alerts: OperationsAlert[] = []
  if (kpi.queueOver48Hours > 0) {
    alerts.push({ kind: 'feedback-bottleneck', title: 'Feedback 병목', detail: `${LONG_WAIT_HOURS}시간 넘게 기다린 검토가 ${kpi.queueOver48Hours}건이에요.`, count: kpi.queueOver48Hours, href: '/feedback?waiting=over48' })
  }
  if (kpi.deadlineRisk > 0) {
    alerts.push({ kind: 'deadline-risk', title: 'Deadline Risk', detail: `마감 D-${DEADLINE_SOON_DAYS} 이내 진행 중 수행평가가 ${kpi.deadlineRisk}개예요.`, count: kpi.deadlineRisk, href: '/today?scope=attention' })
  }
  if (kpi.parentReportUnsent > 0) {
    alerts.push({ kind: 'parent-report-unsent', title: 'Parent Report 미발송', detail: `9월 Report ${kpi.parentReportUnsent}건이 아직 발송 전이에요.`, count: kpi.parentReportUnsent, href: '/today' })
  }
  if (lowPlan > 0) {
    alerts.push({ kind: 'plan-low', title: 'Plan 50% 미만', detail: `최근 7일 Plan 실행률이 50% 미만인 학생이 ${lowPlan}명이에요.`, count: lowPlan, href: '/today?sort=plan' })
  }
  if (absent > 0) {
    alerts.push({ kind: 'consecutive-absence', title: '연속 미등원', detail: `${CONSECUTIVE_ABSENT_DAYS}일 이상 연속 미등원한 학생이 ${absent}명이에요.`, count: absent, href: '/today?scope=attention' })
  }
  return alerts
}
