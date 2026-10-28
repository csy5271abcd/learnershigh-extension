import type { CareRosterRow } from '../api/loadCareRoster.ts'

export type BranchMetricKind = 'study' | 'arrival' | 'absence' | 'submission'

export interface BranchMetricContributor {
  studentId: string
  studentName: string
  current: number | null
  baseline: number | null
  delta: number
  /** Study: signed percentage points; arrival: signed minutes; others: event count.
   * Study impact is 0 when the total benchmark is zero (change is unavailable). */
  impact: number
  samples: number
}

export interface BranchMetricDay {
  date: string
  value: number | null
  baseline: number | null
  samples: number
  missing: number
}

export interface BranchOverviewMetric {
  kind: BranchMetricKind
  title: string
  value: number | null
  baseline: number | null
  change: number | null
  samples: number
  missing: number
  lateCount: number
  daily: BranchMetricDay[]
  contributors: BranchMetricContributor[]
}

export interface BranchOverview {
  /** Dates remain visible even when every student is excluded. */
  dates: string[]
  totalCount: number
  includedCount: number
  excludedCount: number
  metrics: Record<BranchMetricKind, BranchOverviewMetric>
}

interface StudentObservations {
  studentId: string
  studentName: string
  current: number
  baseline: number
  samples: number
}

const titles: Record<BranchMetricKind, string> = {
  study: '공부 시간', arrival: '평소 대비 입실 변화', absence: '예정일 미입실', submission: '계획 미제출',
}

/** Coverage counts observed student-days, never invented calendar records.
 * Scheduled-false or explicitly excluded attendance days do not participate.
 * Arrival: confirmed absences are inapplicable, not missing; unknown attendance,
 * missing actual start, or missing own weekday start count as missing.
 * Study: missing either side counts as missing; a recorded zero remains paired.
 * Absence: only scheduled-true confirmed present/absent statuses are comparable.
 * Submission: known submitted/missing statuses are comparable even if schedule is
 * unknown; explicit submission exclusions are inapplicable. No history is inferred.
 */
function summarize(rows: CareRosterRow[], kind: BranchMetricKind, lateThreshold: number, date?: string) {
  let samples = 0, missing = 0, current = 0, baseline = 0, lateCount = 0
  const students: StudentObservations[] = []
  for (const row of rows) {
    const ownBaselines = new Map(row.review.weekdayBaseline.map(day => [day.date, day]))
    const student: StudentObservations = { studentId: row.student.studentId, studentName: row.student.studentName, current: 0, baseline: 0, samples: 0 }
    for (const day of row.review.days) {
      if (date !== undefined && day.date !== date) continue
      if (day.scheduled === false || day.attendance === 'excluded') continue
      const expected = ownBaselines.get(day.date)
      let actual: number, usual = 0
      if (kind === 'study') {
        if (day.minutes === null || expected?.minutes == null) { missing++; continue }
        actual = day.minutes
        usual = expected.minutes
      } else if (kind === 'arrival') {
        if (day.attendance === 'absent') continue
        if (day.attendance !== 'present' || day.start === null || expected?.start == null) { missing++; continue }
        actual = day.start
        usual = expected.start
        if (actual - usual >= lateThreshold) lateCount++
      } else if (kind === 'absence') {
        if (day.scheduled !== true || (day.attendance !== 'present' && day.attendance !== 'absent')) { missing++; continue }
        actual = day.attendance === 'absent' ? 1 : 0
      } else {
        if (day.submission === 'excluded') continue
        if (day.submission !== 'submitted' && day.submission !== 'missing') { missing++; continue }
        actual = day.submission === 'missing' ? 1 : 0
      }
      samples++
      current += actual
      baseline += usual
      student.samples++
      student.current += actual
      student.baseline += usual
    }
    if (student.samples) students.push(student)
  }

  const value = !samples ? null : kind === 'arrival' ? (current - baseline) / samples : current
  const comparableBaseline = !samples ? null : kind === 'arrival' ? 0 : kind === 'study' ? baseline : null
  // Compute study change from the signed difference to match its additive impacts.
  const change = kind === 'arrival' ? value : kind === 'study' && samples && baseline > 0 ? (current - baseline) / baseline * 100 : null
  const contributors = students.map((student): BranchMetricContributor => {
    const arrival = kind === 'arrival'
    const delta = student.current - student.baseline
    return {
      studentId: student.studentId,
      studentName: student.studentName,
      current: arrival ? student.current / student.samples : student.current,
      baseline: arrival ? student.baseline / student.samples : kind === 'study' ? student.baseline : null,
      delta: arrival ? delta / student.samples : delta,
      impact: arrival ? delta / samples : kind === 'study' ? baseline > 0 ? delta / baseline * 100 : 0 : student.current,
      samples: student.samples,
    }
  }).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact) || (a.studentId < b.studentId ? -1 : a.studentId > b.studentId ? 1 : 0))
  return { value, baseline: comparableBaseline, change, samples, missing, lateCount, contributors }
}

/** Date-specific contributions use that date's own paired denominator. */
export function metricContributors(rows: CareRosterRow[], kind: BranchMetricKind, excludedIds: readonly string[] = [], lateThreshold = 60, date?: string): BranchMetricContributor[] {
  const excluded = new Set(excludedIds)
  return summarize(rows.filter(row => !excluded.has(row.student.studentId)), kind, lateThreshold, date).contributors
}

export function buildBranchOverview(rows: CareRosterRow[], excludedIds: readonly string[] = [], lateThreshold = 60): BranchOverview {
  const excluded = new Set(excludedIds)
  const included = rows.filter(row => !excluded.has(row.student.studentId))
  const dates = [...new Set(rows.flatMap(row => row.review.days.map(day => day.date)))].sort()
  const metric = (kind: BranchMetricKind): BranchOverviewMetric => ({
    kind, title: titles[kind], ...summarize(included, kind, lateThreshold),
    daily: dates.map(date => {
      const summary = summarize(included, kind, lateThreshold, date)
      return { date, value: summary.value, baseline: summary.baseline, samples: summary.samples, missing: summary.missing }
    }),
  })
  return { dates, totalCount: rows.length, includedCount: included.length, excludedCount: rows.length - included.length,
    metrics: { study: metric('study'), arrival: metric('arrival'), absence: metric('absence'), submission: metric('submission') } }
}
