import { diverseDays } from './diverseDays.ts'
import { ApiError } from './apiClient.ts'
import { addDays, monthDay } from '../model/format.ts'
import {
  PREVIEW_AS_OF, PREVIEW_BRANCHES, PREVIEW_DEFAULTS, PREVIEW_RANGES, PREVIEW_STUDENTS,
  previewDailyStudy, previewScenario, previewSignals, previewCareDays,
} from './previewData.ts'
import type {
  CareBoard, CareCase, CareEvent, CareSettings, CareSettingsValues, DecisionInput, MetricUnit,
  NoteChannel, OpenCaseInput, SignalDetail, SignalType, StudentCareDetail, StudentHistory,
} from '../model/types.ts'

/** V2 FE 전용 메모리 어댑터. 네트워크·실제 API·DB에 읽기/쓰기를 보내지 않는다. 새로고침 시 초기화. */
function createPreviewApi(recordsOf = previewCareDays) {
const branchSettings = new Map<string, CareSettingsValues>()
const cases = new Map<string, CareCase>()
let sequence = 0
const copy = <T,>(value: T): T => structuredClone(value)
const fail = (status: number, code: string, message: string): never => { throw new ApiError(status, code, message, []) }
function branchOf(branchId: string) {
  return PREVIEW_BRANCHES.find(branch => branch.branchId === branchId) ?? fail(404, 'BRANCH_NOT_FOUND', '학습관을 찾을 수 없습니다.')
}
function studentOf(branchId: string, studentId: string) {
  branchOf(branchId)
  return PREVIEW_STUDENTS.find(student => student.branchId === branchId && student.studentId === studentId) ?? fail(404, 'STUDENT_NOT_FOUND', '학생을 찾을 수 없습니다.')
}
const settingsOf = (branchId: string) => branchSettings.get(branchId) ?? { ...PREVIEW_DEFAULTS }
const activeOf = (branchId: string, studentId: string) => [...cases.values()].find(item => item.branchId === branchId && item.studentId === studentId && item.status === 'IN_ADJUSTMENT') ?? null
function caseOf(branchId: string, caseId: string) {
  branchOf(branchId)
  const item = cases.get(caseId)
  if (!item || item.branchId !== branchId) return fail(404, 'CARE_CASE_NOT_FOUND', '상담 기록을 찾을 수 없습니다.')
  return item
}
function evaluated(branchId: string, studentId: string) {
  const settings = settingsOf(branchId)
  const result = previewSignals(studentId, settings, recordsOf(studentId))
  const latestClosed = [...cases.values()].filter(item => item.branchId === branchId && item.studentId === studentId && item.closedOn).at(-1)
  const hidden = latestClosed?.closedOn && latestClosed.closedOn > addDays(PREVIEW_AS_OF, -settings.cooldownDays)
    ? new Set(latestClosed.baseline.map(signal => signal.type)) : new Set<SignalType>()
  return { ...result, signals: result.signals.filter(signal => !hidden.has(signal.type)) }
}
function baselineOf(studentId: string, signals: SignalDetail[], settings: CareSettingsValues): CareCase['baseline'] {
  const raw = previewScenario(studentId)
  const records=recordsOf(studentId),recent=records.slice(-7),previous=records.slice(0,-7)
  const starts=previous.filter(day=>day.attendance==='present'&&day.start!==null).map(day=>day.start!)
  const previousStart=starts.length?starts.reduce((a,b)=>a+b,0)/starts.length:null
  const paired=recent.filter(day=>day.attendance==='present'&&day.planned!==null&&day.planned>0&&day.actual!==null)
  const execution=paired.length?paired.reduce((n,day)=>n+day.actual!,0)/paired.reduce((n,day)=>n+day.planned!,0)*100:raw.execution
  const recentStarts=recent.filter(day=>day.attendance==='present'&&day.start!==null).map(day=>day.start!)
  const values: Record<SignalType, { value: number; target: number | null; unit: MetricUnit }> = {
    CONSECUTIVE_ABSENCE: { value: recent.filter(day=>day.scheduled===true&&day.attendance==='absent').length, target: null, unit: 'DAYS' },
    PLAN_MISSING: { value: recent.filter(day=>day.submission==='missing').length, target: null, unit: 'DAYS' },
    STUDY_DROP: { value: recent.reduce((n,day)=>n+(day.minutes??0),0), target: previous.every(day=>day.minutes!==null)?previous.reduce((n,day)=>n+day.minutes!,0)/4:null, unit: 'MINUTES' },
    EXECUTION_GAP: { value: execution, target: settings.executionRatePercent, unit: 'PERCENT' },
    SUBJECT_SHARE: { value: raw.subjectActual, target: raw.subjectPlan, unit: 'PERCENT' },
    START_TIME_SHIFT: { value: recentStarts.length?recentStarts.reduce((a,b)=>a+b,0)/recentStarts.length:raw.recentStart, target: previousStart, unit: 'CLOCK_MINUTES' },
  }
  return signals.map(signal => ({ type: signal.type, label: signal.label, summary: signal.summary, ...values[signal.type] }))
}
function event(item: CareCase, type: CareEvent['type'], content: string, noteChannel: NoteChannel | null = null, occurredOn = PREVIEW_AS_OF): CareEvent {
  const id = ++sequence
  const result: CareEvent = { eventId: `preview_event_${id}`, caseId: item.caseId, type, occurredOn, createdAt: `${occurredOn}T09:${String(Math.floor(id / 60) % 60).padStart(2, '0')}:${String(id % 60).padStart(2, '0')}+09:00`, content, noteChannel }
  item.events.push(result)
  return result
}
function caseView(item: CareCase): CareCase {
  const result = copy(item)
  result.recheckDue = result.status === 'IN_ADJUSTMENT' && result.recheckDate !== null && result.recheckDate <= PREVIEW_AS_OF
  result.comparison = result.recheckDue ? {
    rows: result.baseline.map(signal => ({ type: signal.type, label: signal.label, before: signal.value, now: signal.value, target: signal.target, unit: signal.unit, trend: 'SAME' })),
    result: 'NO_CHANGE', resultLabel: '변화 없음',
  } : null
  return result
}
function checkDate(date?: string) {
  const parsed = date ? new Date(`${date}T00:00:00Z`) : null
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !parsed || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date || date <= PREVIEW_AS_OF || date > addDays(PREVIEW_AS_OF, 28)) {
    throw new ApiError(422, 'INVALID_RECHECK_DATE', '다음 확인일은 기준일 다음 날부터 28일 이내로 선택해 주세요.', [{ field: 'recheckDate', reason: '날짜 범위를 확인해 주세요.' }])
  }
  return date
}
function checkMemo(channel: NoteChannel, content: string, required: boolean) {
  if (!['MEETING', 'CALL', 'MESSAGE'].includes(channel) || content.length > 1000 || (required && !content.trim())) {
    return fail(400, 'VALIDATION_ERROR', '상담 방식과 내용(최대 1000자)을 확인해 주세요.')
  }
}
const channelLabel: Record<NoteChannel, string> = { MEETING: '면담', CALL: '통화', MESSAGE: '문자', OTHER: '기타' }

// 점검 전·점검일 사례를 즉시 검토할 수 있는 명시적 예시. 실제 상담 이력 아님.
for (const [studentId, dueDays] of [['stu_005', -1], ['stu_006', 7]] as const) {
  const student = PREVIEW_STUDENTS.find(item => item.studentId === studentId)!
  const openedOn = addDays(PREVIEW_AS_OF, -7)
  const item: CareCase = { caseId: `preview_seed_${studentId}`, studentId, branchId: student.branchId, status: 'IN_ADJUSTMENT', reason: 'ADJUSTMENT_NEEDED', closeType: null, openedOn, closedOn: null, baseline: baselineOf(studentId, previewSignals(studentId, PREVIEW_DEFAULTS, recordsOf(studentId)).signals, PREVIEW_DEFAULTS), recheckDate: addDays(PREVIEW_AS_OF, dueDays), recheckDue: false, comparison: null, events: [] }
  event(item, 'REASON_CONFIRMED', '상담 · 면담 — 예시 상담 기록', 'MEETING', openedOn)
  event(item, 'ADJUSTMENT_STARTED', `계속 관리 · 다음 확인 ${monthDay(item.recheckDate!)}`, null, openedOn)
  cases.set(item.caseId, item)
}

return {
  branches: async () => copy(PREVIEW_BRANCHES),
  board: async (branchId: string): Promise<CareBoard> => {
    const branch = branchOf(branchId)
    const students = PREVIEW_STUDENTS.filter(student => student.branchId === branchId)
    const result: CareBoard = { asOf: PREVIEW_AS_OF, branch: { branchId, name: branch.name }, students: copy(students), needsCheck: [], inAdjustment: [], deferred: [] }
    for (const student of students) {
      const current = evaluated(branchId, student.studentId)
      const active = activeOf(branchId, student.studentId)
      if (active) {
        const view = caseView(active)
        result.inAdjustment.push({ ...student, caseId: active.caseId, signals: active.baseline.map(({ type, label, summary }) => ({ type, label, summary })), recheckDate: active.recheckDate!, recheckDue: view.recheckDue })
      } else if (current.signals.length) result.needsCheck.push({ ...student, signals: current.signals })
      else if (current.deferred) result.deferred.push({ ...student, validDays: current.validDays })
    }
    result.needsCheck.sort((a, b) => b.signals.length - a.signals.length || a.studentName.localeCompare(b.studentName, 'ko'))
    result.inAdjustment.sort((a, b) => Number(b.recheckDue) - Number(a.recheckDue) || a.recheckDate.localeCompare(b.recheckDate))
    return result
  },
  detail: async (branchId: string, studentId: string): Promise<StudentCareDetail> => {
    const student = studentOf(branchId, studentId)
    const current = evaluated(branchId, studentId)
    const active = activeOf(branchId, studentId)
    return copy({ asOf: PREVIEW_AS_OF, careDays: recordsOf(studentId), student, signals: current.signals, deferred: current.deferred && current.signals.length === 0 ? { validDays: current.validDays } : null, dailyStudy: previewDailyStudy(studentId), usualDailyMinutes: previewScenario(studentId).usualDailyMinutes, activeCase: active ? caseView(active) : null })
  },
  history: async (branchId: string, studentId: string): Promise<StudentHistory> => {
    const student = studentOf(branchId, studentId)
    const items = [...cases.values()].filter(item => item.branchId === branchId && item.studentId === studentId).flatMap(item => item.events).reverse().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return copy({ student, items, cases:[...cases.values()].filter(item=>item.branchId===branchId&&item.studentId===studentId).map(caseView) })
  },
  openCase: async (input: OpenCaseInput): Promise<CareCase> => {
    const { branchId, studentId, channel, memo, reason } = input
    studentOf(branchId, studentId)
    checkMemo(channel, memo, false)
    if (!['EXPECTED_CHANGE', 'RECORD_ISSUE', 'ADJUSTMENT_NEEDED'].includes(reason)) fail(400, 'VALIDATION_ERROR', '상담 결과를 선택해 주세요.')
    if (activeOf(branchId, studentId)) fail(409, 'ACTIVE_CARE_CASE_EXISTS', '이미 관리 중인 학생입니다.')
    const signals = evaluated(branchId, studentId).signals
    if (!signals.length) fail(409, 'STUDENT_NOT_FLAGGED', '현재 확인이 필요한 항목가 없습니다.')
    const managing = reason === 'ADJUSTMENT_NEEDED'
    const recheckDate = managing ? checkDate(input.recheckDate) : null
    const item: CareCase = { caseId: `preview_case_${++sequence}`, studentId, branchId, status: managing ? 'IN_ADJUSTMENT' : 'CLOSED', reason, closeType: managing ? null : reason === 'RECORD_ISSUE' ? 'RECORD_ISSUE' : 'EXPECTED_CHANGE', openedOn: PREVIEW_AS_OF, closedOn: managing ? null : PREVIEW_AS_OF, baseline: baselineOf(studentId, signals, settingsOf(branchId)), recheckDate, recheckDue: false, comparison: null, events: [] }
    event(item, 'REASON_CONFIRMED', `상담 · ${channelLabel[channel]}${memo.trim() ? ` — ${memo.trim()}` : ''}`, channel)
    event(item, managing ? 'ADJUSTMENT_STARTED' : 'CLOSED', managing ? `계속 관리 · 다음 확인 ${monthDay(recheckDate!)}` : `${reason === 'RECORD_ISSUE' ? '기록 오류' : '이상 없음'} · 관리 종료`)
    item.events.forEach(e=>{e.actorName=input.actorName??null})
    cases.set(item.caseId, item)
    return caseView(item)
  },
  decide: async (branchId: string, caseId: string, input: DecisionInput): Promise<CareCase> => {
    const item = caseOf(branchId, caseId)
    if (item.status !== 'IN_ADJUSTMENT') fail(409, 'INVALID_STATE_TRANSITION', '이미 종료된 관리입니다.')
    if (!caseView(item).recheckDue) fail(409, 'RECHECK_NOT_DUE', '아직 다음 확인일 전입니다.')
    if (!['CLOSE', 'CONTINUE'].includes(input.decision)) fail(400, 'VALIDATION_ERROR', '관리 결과를 선택해 주세요.')
    const next = input.decision === 'CONTINUE' ? checkDate(input.recheckDate) : null
    const previousEvents=item.events.length
    event(item, 'RECHECKED', '학습 확인 · 변화 없음')
    if (input.decision === 'CLOSE') {
      item.status = 'CLOSED'; item.closeType = 'AFTER_RECHECK'; item.closedOn = PREVIEW_AS_OF; item.recheckDate = null
      event(item, 'CLOSED', '관리 종료')
    } else {
      item.recheckDate = next
      event(item, 'CONTINUED', `계속 관리 · 다음 확인 ${monthDay(next!)}`)
    }
    item.events.slice(previousEvents).forEach(e=>{e.actorName=input.actorName??null})
    return caseView(item)
  },
  addNote: async (branchId: string, caseId: string, channel: NoteChannel, content: string, actorName?:string): Promise<CareEvent> => {
    const item = caseOf(branchId, caseId)
    checkMemo(channel, content, true)
    const saved=event(item, 'NOTE', `상담 · ${channelLabel[channel]} — ${content.trim()}`, channel)
    saved.actorName=actorName??null
    return copy(saved)
  },
  settings: async (branchId: string): Promise<CareSettings> => {
    branchOf(branchId)
    return copy({ ...settingsOf(branchId), ranges: PREVIEW_RANGES })
  },
  updateSettings: async (branchId: string, values: CareSettingsValues): Promise<CareSettings> => {
    branchOf(branchId)
    const fields = (Object.keys(PREVIEW_RANGES) as (keyof CareSettingsValues)[]).filter(key => !Number.isInteger(values[key]) || values[key] < PREVIEW_RANGES[key].min || values[key] > PREVIEW_RANGES[key].max).map(key => ({ field: key, reason: '허용 범위 안의 정수로 입력해 주세요.' }))
    if (fields.length) throw new ApiError(422, 'INVALID_CARE_SETTINGS', '관리 기준의 입력값을 확인해 주세요.', fields)
    branchSettings.set(branchId, copy(values))
    return copy({ ...values, ranges: PREVIEW_RANGES })
  },
}

}
export const studentCareApi = createPreviewApi()
export const diverseStudentCareApi = createPreviewApi(diverseDays)
