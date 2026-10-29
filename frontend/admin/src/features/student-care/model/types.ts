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
export type Decision = 'CLOSE' | 'CONTINUE'
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
  /** V2 FE 미리보기 명부. 실제 board API 계약에는 아직 없는 화면용 데이터. */
  students: StudentRef[]
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
}

export interface CareEvent {
  eventId: string
  actorName?: string | null
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
  recheckDate: string | null
  recheckDue: boolean
  comparison: { rows: ComparisonRow[]; result: ComparisonResult; resultLabel: string } | null
  events: CareEvent[]
}

export interface StudentCareDetail {
  /** 서버 업무일. 관찰일 asOf와 별개로 상대 확인일 계산에 사용한다. */
  today?: string
  serverReview?: import('./serverWeeklyReview.ts').ServerWeeklyReview
  /** FE 자료 공급자 간 명시적 일별 기록. 실제 HTTP 응답은 review를 사용한다. */
  careDays?: import('./weeklyReviewTypes.ts').WeekDay[]
  asOf: string
  student: StudentRef
  signals: SignalDetail[]
  deferred: { validDays: number } | null
  dailyStudy: { date: string; minutes: number }[]
  usualDailyMinutes: number
  activeCase: CareCase | null
}

export interface StudentHistory {
  student: StudentRef
  items: CareEvent[]
  cases?: CareCase[]
}

export interface CareSettingsValues {
  absenceDays: number
  planMissingDays: number
  studyDropPercent: number
  executionRatePercent: number
  subjectShareGapPoints: number
  startShiftMinutes: number
  minValidDays: number
  cooldownDays: number
}

export type CareSettingKey = keyof CareSettingsValues

/** GET / PUT settings 응답. `ranges`는 서버가 정한 각 값의 허용 범위다 (65-9). */
export interface CareSettings extends CareSettingsValues {
  ranges: Record<CareSettingKey, { min: number; max: number }>
}

export interface OpenCaseInput {
  actorName?: string
  branchId: string
  studentId: string
  channel: NoteChannel
  memo: string
  reason: CareReason
  recheckDate?: string
}

export interface DecisionInput {
  actorName?: string
  decision: Decision
  recheckDate?: string
}
