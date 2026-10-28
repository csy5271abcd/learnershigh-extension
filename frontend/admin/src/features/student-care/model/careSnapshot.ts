import { addDays } from './format.ts'
import { compareMetric, type MetricComparison } from './metricComparison.ts'
import { buildPreviewMetrics } from './previewMetrics.ts'
import type { MetricView } from './mockMetrics.ts'
import type { StudentCareDetail, SignalType } from './types.ts'

export interface DailyCareRecord {
  date: string
  attendance: 'present' | 'absent' | 'unknown' | 'excluded'
  submission: 'submitted' | 'missing' | 'unknown' | 'excluded'
  minutes: number | null
  start: number | null
  planned: number | null
  actual: number | null
}
export interface CareSnapshotMetric extends MetricComparison {
  label: string
  attention: boolean
  view: MetricView
}
export interface CareSnapshot {
  asOf: string
  days: DailyCareRecord[]
  metrics: CareSnapshotMetric[]
  deferred: boolean
  recent: { attended: number; notEntered: number; missingPlans: number; minutes: number | null; minutesPerVisit: number | null; validDays: number; longestMissingRun: number; planGapMinutes: number | null; comparablePlanDays: number }
}
export type SnapshotInput = Pick<StudentCareDetail, 'asOf' | 'dailyStudy' | 'usualDailyMinutes'> & { student: { studentId: string }; signals: { type: SignalType }[]; deferred: boolean | StudentCareDetail['deferred'] }

/** 모든 시안이 동일한 날짜·수치·상태를 사용한다. FE 예시 데이터 전용. */
export function buildCareSnapshot(input: SnapshotInput, period = 14, excludeWeekend = false): CareSnapshot {
  const { metrics } = buildPreviewMetrics(input.student.studentId, input.asOf, input.dailyStudy, input.usualDailyMinutes, 28, excludeWeekend)
  const attendance = metrics.find(metric => metric.type === 'CONSECUTIVE_ABSENCE')!.view
  const submission = metrics.find(metric => metric.type === 'PLAN_MISSING')!.view
  const execution = metrics.find(metric => metric.type === 'EXECUTION_GAP')!.view
  const calendar = new Map(attendance.kind === 'weekly' ? attendance.calendar?.map(day => [day.date, day]) : [])
  const plans = new Map(submission.kind === 'dateList' ? submission.days.map(day => [day.date, day.state]) : [])
  const executionDays = new Map(execution.kind === 'planActual' ? execution.days.map(day => [day.date, day]) : [])
  const days: DailyCareRecord[] = Array.from({ length: period }, (_, index) => {
    const date = addDays(input.asOf, index - period + 1)
    const day = calendar.get(date), plan = plans.get(date), study = executionDays.get(date)
    return { date,
      attendance: !day ? 'unknown' : day.skip ? 'excluded' : day.came ? 'present' : 'absent',
      submission: !plan ? 'unknown' : plan === 'skip' ? 'excluded' : plan === 'ok' ? 'submitted' : 'missing',
      minutes: !day || day.skip ? null : day.minutes,
      start: !day || day.skip ? null : day.start,
      planned: study && !study.off ? study.planned : null,
      actual: !day || day.skip ? null : day.minutes,
    }
  })
  const recentDays = days.filter(day => day.date >= addDays(input.asOf, -6))
  const attended = recentDays.filter(day => day.attendance === 'present').length
  const minutes = recentDays.reduce((total, day) => total + (day.minutes ?? 0), 0)
  let run = 0, longestMissingRun = 0
  for (const day of recentDays) {
    run = day.submission === 'missing' ? run + 1 : 0
    longestMissingRun = Math.max(longestMissingRun, run)
  }
  const paired = recentDays.filter(day => day.planned !== null && day.actual !== null)
  const planGapMinutes = paired.length ? paired.reduce((total, day) => total + day.actual! - day.planned!, 0) : null
  return { asOf: input.asOf, days, deferred: Boolean(input.deferred),
    metrics: metrics.map(metric => ({ ...compareMetric(metric, input.asOf), label: metric.label, view: metric.view, attention: input.signals.some(signal => signal.type === metric.type) })),
    recent: { attended, notEntered: recentDays.filter(day => day.attendance === 'absent').length,
      missingPlans: recentDays.filter(day => day.submission === 'missing').length, minutes,
      minutesPerVisit: attended ? minutes / attended : null,
      validDays: recentDays.filter(day => day.minutes !== null && day.minutes >= 30).length,
      longestMissingRun, planGapMinutes, comparablePlanDays: paired.length },
  }
}
export function attendanceLabel(state: DailyCareRecord['attendance']) {
  return { present: '입실', absent: '미입실', unknown: '기록 없음', excluded: '제외' }[state]
}
export function submissionLabel(state: DailyCareRecord['submission']) {
  return { submitted: '제출', missing: '미제출', unknown: '기록 없음', excluded: '제외' }[state]
}

export function recentRecordAvailability(snapshot: CareSnapshot) {
  const days = snapshot.days.filter(day => day.date >= addDays(snapshot.asOf, -6) && day.date <= snapshot.asOf)
  const attendanceDays = days.filter(day => day.attendance === 'present' || day.attendance === 'absent').length
  const submissionDays = days.filter(day => day.submission === 'submitted' || day.submission === 'missing').length
  const studyDays = days.filter(day => day.minutes !== null).length
  return { attendanceDays, submissionDays, studyDays }
}
