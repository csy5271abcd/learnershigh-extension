// api-contract.md §65 Admin Student Care. 이 파일 밖에서 JSON Shape을 새로 만들지 않는다.

export type SignalType =
  | 'CONSECUTIVE_ABSENCE'
  | 'PLAN_MISSING'
  | 'STUDY_DROP'
  | 'EXECUTION_GAP'
  | 'SUBJECT_SHARE'
  | 'START_TIME_SHIFT'

export type CareReason = 'EXPECTED_CHANGE' | 'RECORD_ISSUE' | 'ADJUSTMENT_NEEDED'
export type CareStatus = 'IN_ADJUSTMENT' | 'CLOSED'
export type CloseType = 'EXPECTED_CHANGE' | 'RECORD_ISSUE' | 'AFTER_RECHECK'
export type Decision = 'CLOSE' | 'CONTINUE' | 'REVISE'
export type EventType =
  | 'REASON_CONFIRMED'
  | 'ADJUSTMENT_STARTED'
  | 'RECHECKED'
  | 'CONTINUED'
  | 'REVISED'
  | 'CLOSED'
  | 'NOTE'
export type NoteChannel = 'MEETING' | 'CALL' | 'MESSAGE' | 'OTHER'
export type MetricUnit = 'DAYS' | 'MINUTES' | 'PERCENT' | 'CLOCK_MINUTES'
export type Trend = 'IMPROVED' | 'SAME' | 'WORSENED'
export type ComparisonResult = 'IMPROVED' | 'NO_CHANGE' | 'WORSENED' | 'MIXED'

export interface Branch {
  branchId: string
  name: string
  studentCount: number
}

export interface SignalSummary {
  type: SignalType
  label: string
  summary: string
}

export interface NeedsCheckCard {
  studentId: string
  studentName: string
  className: string
  signals: SignalSummary[]
}

export interface InAdjustmentCard {
  caseId: string
  studentId: string
  studentName: string
  className: string
  signals: SignalSummary[]
  goal: string
  recheckDate: string
  recheckDue: boolean
}

export interface DeferredStudent {
  studentId: string
  studentName: string
  className: string
  validDays: number
}

export interface CareBoard {
  asOf: string
  branch: { branchId: string; name: string }
  needsCheck: NeedsCheckCard[]
  inAdjustment: InAdjustmentCard[]
  deferred: DeferredStudent[]
}

export interface StudentRef {
  studentId: string
  studentName: string
  className: string
  branchId: string
}

export interface SignalDetail extends SignalSummary {
  evidence: string[]
  question: string
}

export interface PlanSuggestion {
  goal: string
  action: string
  loadLimit: string | null
  recheckDate: string
}

export interface CareEvent {
  eventId: string
  caseId: string
  type: EventType
  occurredOn: string
  createdAt: string
  content: string
  noteChannel: NoteChannel | null
}

export interface ComparisonRow {
  type: SignalType
  label: string
  before: number
  now: number | null
  target: number | null
  unit: MetricUnit
  trend: Trend
}

export interface CareCase {
  caseId: string
  studentId: string
  branchId: string
  status: CareStatus
  reason: CareReason
  closeType: CloseType | null
  openedOn: string
  closedOn: string | null
  baseline: {
    type: SignalType
    label: string
    summary: string
    value: number
    target: number | null
    unit: MetricUnit
  }[]
  plan: { goal: string; action: string; loadLimit: string | null; agreedWithStudent: boolean } | null
  recheckDate: string | null
  recheckDue: boolean
  comparison: { rows: ComparisonRow[]; result: ComparisonResult; resultLabel: string } | null
  events: CareEvent[]
}

export interface StudentCareDetail {
  asOf: string
  student: StudentRef
  signals: SignalDetail[]
  deferred: { validDays: number } | null
  dailyStudy: { date: string; minutes: number }[]
  usualDailyMinutes: number
  planSuggestion: PlanSuggestion | null
  activeCase: CareCase | null
}

export interface StudentHistory {
  student: StudentRef
  items: CareEvent[]
}

export interface CareSettings {
  absenceDays: number
  planMissingDays: number
  studyDropPercent: number
  executionRatePercent: number
  subjectShareGapPoints: number
  startShiftMinutes: number
  minValidDays: number
  cooldownDays: number
}

export interface CareSummary {
  asOf: string
  needsCheckCount: number
  deferredCount: number
  inAdjustmentCount: number
  recheckDueCount: number
  signalCounts: { type: SignalType; label: string; count: number }[]
  closedLast30Days: { expectedChange: number; recordIssue: number; afterRecheck: number }
}

export interface PlanInput {
  goal: string
  action: string
  loadLimit: string
  recheckDate: string
  agreedWithStudent: boolean
}

export interface OpenCaseInput {
  branchId: string
  studentId: string
  reason: CareReason
  memo?: string
  plan?: PlanInput
}

export interface DecisionInput {
  decision: Decision
  recheckDate?: string
  plan?: PlanInput
}
