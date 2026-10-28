import { addDays } from '../model/format.ts'
import type { Branch, CareSettings, CareSettingsValues, SignalDetail, SignalType, StudentRef } from '../model/types.ts'
import type { WeekDay } from '../model/weeklyReviewTypes.ts'

/** FE 검토용 고정 시나리오. 실제 학생 기록·운영 기준으로 사용하지 않는다. */
export const PREVIEW_AS_OF = '2026-10-24'
export const PREVIEW_DEFAULTS: Readonly<CareSettingsValues> = Object.freeze({
  absenceDays: 1, planMissingDays: 2, studyDropPercent: 30, executionRatePercent: 60,
  subjectShareGapPoints: 20, startShiftMinutes: 60, minValidDays: 3, cooldownDays: 7,
})
export const PREVIEW_RANGES: CareSettings['ranges'] = {
  absenceDays: { min: 1, max: 14 }, planMissingDays: { min: 1, max: 7 },
  studyDropPercent: { min: 10, max: 90 }, executionRatePercent: { min: 10, max: 100 },
  subjectShareGapPoints: { min: 5, max: 60 }, startShiftMinutes: { min: 30, max: 300 },
  minValidDays: { min: 1, max: 7 }, cooldownDays: { min: 0, max: 30 },
}
// Identity는 MockExistingStudentClient와 일치한다. 학습 수치는 FE 검토용 예시다.
const roster = [
  ['stu_001', 'br_gangnam', '김서준', '고3 A반'], ['stu_002', 'br_gangnam', '최학생', '고3 A반'],
  ['stu_003', 'br_gangnam', '한유진', '고3 A반'], ['stu_004', 'br_gangnam', '정예준', '고3 A반'],
  ['stu_005', 'br_gangnam', '윤서연', '고3 A반'], ['stu_006', 'br_gangnam', '이학생', '고3 A반'],
  ['stu_007', 'br_gangnam', '오시윤', '고2 B반'], ['stu_008', 'br_gangnam', '장하준', '고2 B반'],
  ['stu_009', 'br_gangnam', '박민지', '고2 B반'], ['stu_010', 'br_gangnam', '이도현', '고2 B반'],
  ['stu_101', 'br_bundang', '강하늘', '고3 A반'], ['stu_102', 'br_bundang', '서지우', '고3 A반'],
  ['stu_103', 'br_bundang', '문지호', '고3 A반'],
]
export const PREVIEW_STUDENTS: StudentRef[] = roster.map(([studentId, branchId, studentName, className]) => ({ studentId, branchId, studentName, className }))
export const PREVIEW_BRANCHES: Branch[] = [
  { branchId: 'br_gangnam', name: '러너스하이 강남점', studentCount: PREVIEW_STUDENTS.filter(s => s.branchId === 'br_gangnam').length },
  { branchId: 'br_bundang', name: '러너스하이 분당점', studentCount: PREVIEW_STUDENTS.filter(s => s.branchId === 'br_bundang').length },
]
export interface PreviewScenario {
  absence: number
  missing: number
  recentMinutes: number[]
  usualDailyMinutes: number
  execution: number
  subjectPlan: number
  subjectActual: number
  usualStart: number
  recentStart: number
}
const ordinary: PreviewScenario = {
  absence: 0, missing: 0, recentMinutes: [240, 260, 0, 250, 270, 230, 0], usualDailyMinutes: 180,
  execution: 88, subjectPlan: 30, subjectActual: 28, usualStart: 1150, recentStart: 1160,
}
const scenarios: Record<string, Partial<PreviewScenario>> = {
  stu_001: { absence: 6, missing: 4, recentMinutes: [240, 0, 0, 0, 0, 0, 0] },
  stu_002: { missing: 4 },
  stu_003: { recentMinutes: [120, 110, 0, 130, 100, 130, 0] },
  stu_004: { execution: 53 }, stu_005: { subjectActual: 10 }, stu_006: { recentStart: 1300 },
  stu_007: { recentMinutes: [140, 150, 0, 140, 140, 135, 0] },
  stu_008: { recentMinutes: [0, 0, 0, 180, 0, 210, 0] },
  stu_102: { recentMinutes: [100, 95, 0, 110, 100, 100, 0] },
}
export function previewScenario(studentId: string): PreviewScenario {
  return { ...ordinary, ...scenarios[studentId] }
}
const labels: Record<SignalType, string> = {
  CONSECUTIVE_ABSENCE: '미입실', PLAN_MISSING: '계획 미제출', STUDY_DROP: '학습 시간 감소',
  EXECUTION_GAP: '계획 달성률 낮음', SUBJECT_SHARE: '수학 학습 비율 차이', START_TIME_SHIFT: '입실 시각 지연',
}
export function previewSignals(studentId: string, settings: CareSettingsValues, records=previewCareDays(studentId)): { signals: SignalDetail[]; validDays: number; deferred: boolean } {
  const raw = previewScenario(studentId)
  const recent=records.slice(-7),previous=records.slice(0,-7)
  const validDays = recent.filter(day=>day.attendance==='present'&&day.minutes!==null&&day.minutes>=30).length
  const signals: SignalDetail[] = []
  const push = (type: SignalType, summary: string) => signals.push({ type, label: labels[type], summary, evidence: [summary, '예시 데이터'] })
  const missed=recent.filter(day=>day.scheduled===true&&day.attendance==='absent').length
  const missing=recent.filter(day=>day.submission==='missing').length
  const absent = missed >= settings.absenceDays
  if (absent) push('CONSECUTIVE_ABSENCE', `최근 7일 등원 예정일 중 ${missed}일 미입실`)
  if (missing >= settings.planMissingDays) push('PLAN_MISSING', `최근 7일 중 ${missing}일 미제출`)
  if (!absent && validDays >= settings.minValidDays) {
    const week = recent.reduce((n,d)=>n+(d.minutes??0),0)
    const usual=previous.every(d=>d.minutes!==null)?previous.reduce((n,d)=>n+d.minutes!,0)/4:null
    const drop = usual&&usual>0?(1-week/usual)*100:null
    if (recent.every(d=>d.minutes!==null)&&drop!==null&&drop >= settings.studyDropPercent) push('STUDY_DROP', `직전 4주 주평균 대비 ${Math.round(drop)}% 감소 · 최근 7일 ${Math.round(week / 60 * 10) / 10}시간`)
    const paired=recent.filter(d=>d.attendance==='present'&&d.planned!==null&&d.planned>0&&d.actual!==null)
    const execution=paired.length?paired.reduce((n,d)=>n+d.actual!,0)/paired.reduce((n,d)=>n+d.planned!,0)*100:null
    if (execution!==null && execution < settings.executionRatePercent) push('EXECUTION_GAP', `최근 7일 계획 달성률 ${Math.round(execution!)}%`)
    if (raw.subjectPlan - raw.subjectActual >= settings.subjectShareGapPoints) push('SUBJECT_SHARE', `수학 계획 ${raw.subjectPlan}% → 실제 ${raw.subjectActual}%`)
    const historical=previous.filter(d=>d.attendance==='present'&&d.start!==null).map(d=>d.start!)
    const usualStart=historical.length?historical.reduce((a,b)=>a+b,0)/historical.length:null
    const toClock=(m:number)=>`${String(Math.floor(Math.round(m)/60)).padStart(2,'0')}:${String(Math.round(m)%60).padStart(2,'0')}`
    const recentStarts=recent.filter(d=>d.attendance==='present'&&d.start!==null).map(d=>d.start!)
    const recentStart=recentStarts.length?recentStarts.reduce((a,b)=>a+b,0)/recentStarts.length:null
    if (historical.length>=3&&recentStarts.length>=3&&usualStart!==null&&recentStart!==null&&recentStart-usualStart>=settings.startShiftMinutes) push('START_TIME_SHIFT', `직전 28일 평균 ${toClock(usualStart)} → 최근 ${toClock(recentStart!)}`)
  }
  return { signals, validDays, deferred: !absent && validDays < settings.minValidDays }
}
/** 설정·상담으로 신호를 숨겨도 예시 차트 원본은 바뀌지 않도록 하는 정적 입력. */
export function previewScenarioSignals(studentId: string): SignalDetail[] {
  return previewSignals(studentId, { ...PREVIEW_DEFAULTS, absenceDays: 2, studyDropPercent: 10, subjectShareGapPoints: 5, startShiftMinutes: 30 }).signals
}
export function previewDailyStudy(studentId: string) {
  const raw = previewScenario(studentId)
  return Array.from({ length: 14 }, (_, index) => ({
    date: addDays(PREVIEW_AS_OF, index - 13),
    minutes: index < 7 ? [240, 260, 0, 250, 270, 240, 0][index] : raw.recentMinutes[index - 7],
  }))
}

/** 35개의 명시적 FE 예시 날짜. 운영 API에 등원 일정이나 과거 기록이 추가된다는 뜻이 아니다. */
export function previewCareDays(studentId: string, asOf = PREVIEW_AS_OF): WeekDay[] {
  const raw = previewScenario(studentId)
  const weights = [1.25,1.35,0,1.4,1.45,1.55,0]
  const weekVariation = [.95,1,1.058,1]
  const lastPreviousWeek = [240,260,0,250,270,240,0]
  return Array.from({length:35},(_,i)=>{
    const date=addDays(asOf,i-34), current=i>=28, day=i%7
    const newStudent=studentId==='stu_008'
    const available=!newStudent || current&&raw.recentMinutes[day]>0
    const minutes=!available?null:current?raw.recentMinutes[day]:i>=21?lastPreviousWeek[day]:Math.round(raw.usualDailyMinutes*weights[day]*weekVariation[Math.floor(i/7)])
    const scheduled=newStudent?null:![2,6].includes(day)
    const present=minutes!==null&&minutes>0
    const missing=current&&day<raw.missing
    const start=present?(current?raw.recentStart:raw.usualStart+(Math.floor(i/7)-1)*5):null
    const submitted=available?!missing:null
    const planned=present&&submitted?minutes/(current?raw.execution/100:.88):null
    return {date,scheduled,
      attendance:!available?'unknown':present?'present':scheduled===false?'excluded':'absent',
      submission:submitted===null?'unknown':submitted?'submitted':'missing',
      minutes,start,planned,actual:minutes}
  })
}
