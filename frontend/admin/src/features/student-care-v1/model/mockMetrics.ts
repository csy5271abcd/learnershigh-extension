import { addDays, hoursMinutes, shortDate } from './format.ts'
import type { SignalSummary, SignalType } from './types.ts'

/*
 * FE 시연용 Mock. API(StudentCareDetail)는 최근 14일 공부 시간만 주므로, 지표별 날짜 값은 여기서 만든다.
 * - 학생마다 등원 패턴(주 2~6회, 요일)이 다르고, 과거에도 가끔 빠지거나 늦은 날이 있다.
 * - 판정은 "그 학생의 과거 대비 얼마나 달라졌나"를 기준으로 한다 (큰 변화 / 약간 변화 / 평소 수준).
 * - 특이사항 근거 수치(summary / evidence)와 API 최근 7일 공부 시간 합 · 평소 값에 맞춘다.
 * 실제 데이터 연동 시 이 파일을 지운다.
 */

/** ok 정상, off 안 온 날(평소 범위), miss 최근 이상, missOld 과거에 빠진 날, skip 주말 제외로 판단하지 않는 날 */
export type DayState = 'ok' | 'off' | 'miss' | 'missOld' | 'skip'
export type ChangeLevel = 'big' | 'some' | 'none'

export type MetricView =
  /** 주 단위 합계 (공부 시간, 등원 횟수). 마지막 주가 최근 7일 */
  | {
      kind: 'weekly'
      weeks: { label: string; value: number; from: string; to: string }[]
      usual: number
      unit: 'minutes' | 'count'
      /** 출결: 클릭해서 보는 일별 상세 */
      calendar?: DayDetail[]
      /** 공부 시간: 접어 둔 일별 (화면 기간 전체, 최근부터) */
      daily?: { date: string; minutes: number; came: boolean; skip: boolean }[]
    }
  /** 온 날짜만 나열 (계획 제출) */
  | { kind: 'dateList'; days: { date: string; state: DayState }[] }
  | { kind: 'line'; days: { date: string; value: number | null; late: boolean }[]; usual: number }
  | { kind: 'planActual'; days: { date: string; planned: number; actual: number; off: boolean }[] }
  /** 최근 7일 과목별 계획 비중 vs 실제 비중 */
  | { kind: 'share'; subjects: { name: string; plan: number; actual: number }[]; worst: string }
  | { kind: 'strip'; days: { date: string; state: DayState }[]; labels: Partial<Record<DayState, string>> }

export interface DayDetail {
  date: string
  came: boolean
  /** 평소 최대 공백보다 길어진 날 */
  longGap: boolean
  /** 주말 제외로 판단하지 않는 날 */
  skip: boolean
  minutes: number
  start: number | null
  planned: number
  submitted: boolean
}

export interface MetricSeries {
  type: SignalType
  label: string
  view: MetricView
  level: ChangeLevel
  /** 과거 대비 변화 핵심 (짧게) */
  change: string
  /** 최근 값 · 이 학생 평소 (작게) */
  detail: string
}

export interface StudentPattern {
  attendPerWeek: number
  attendLabel: string
}

type Signal = SignalSummary & { evidence?: string[] }

export const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(Math.round(minutes % 60)).padStart(2, '0')}`

export const weekdayOf = (date: string) => {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

function seedOf(text: string) {
  let hash = 7
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) % 100003
  return hash
}

/** 0 ~ 1 고정 난수 (학생 + 용도 + 날짜마다 같은 값) */
function random(seed: number, index: number) {
  const x = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453
  return x - Math.floor(x)
}

const textOf = (signal?: Signal) => (signal ? [signal.summary, ...(signal.evidence ?? [])].join(' ') : '')
const numbers = (text: string, pattern: RegExp) => [...text.matchAll(pattern)].map((match) => Number(match[1]))
const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0)
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)
const level = (big: boolean, some: boolean): ChangeLevel => (big ? 'big' : some ? 'some' : 'none')

export function buildMockMetrics(
  studentId: string,
  asOf: string,
  signals: Signal[],
  dailyStudy: { date: string; minutes: number }[],
  usualDailyMinutes: number,
  period: number,
  excludeWeekend = false,
): { pattern: StudentPattern; metrics: MetricSeries[] } {
  const find = (type: SignalType) => signals.find((signal) => signal.type === type)
  const seed = seedOf(studentId)
  // 판정 기준(과거)은 화면 기간과 상관없이 28일로 고정하고, 화면에는 마지막 period일만 보여 준다.
  const TOTAL = 28
  const dates = Array.from({ length: TOTAL }, (_, index) => addDays(asOf, index - TOTAL + 1))
  const recentFrom = TOTAL - 7
  const isRecent = (index: number) => index >= recentFrom
  const past = (index: number) => !isRecent(index)
  // 주말 제외: 토 · 일은 결석 · 공백 · 평균 계산에서 뺀다. 주말이 공백을 늘려 기준이 느슨해지는 것을 막는다.
  const counted = (index: number) => !excludeWeekend || ![0, 6].includes(weekdayOf(dates[index]))

  // 등원: 요일을 정하지 않고 학생마다 빈도만 다르다 (주 2~6회, 날짜는 불규칙). 판정은 이 학생의 지난 기록과 비교한다.
  const absenceDays = numbers(textOf(find('CONSECUTIVE_ABSENCE')), /(\d+)일째/g)[0] ?? 0
  const perWeek = absenceDays ? 6 : [2, 3, 4, 5, 6, 3][Math.floor(random(seed, 42) * 6)]
  const cameList = dates.map((_, index) => index < TOTAL - absenceDays && random(seed + 1, index) < perWeek / 7)
  const gapLimit = Math.ceil(7 / perWeek) + 1
  for (let index = 0, gap = 0; index < TOTAL - absenceDays; index++) {
    gap = cameList[index] ? 0 : gap + 1
    if (gap > gapLimit) {
      cameList[index] = true
      gap = 0
    }
  }
  const came = (index: number) => cameList[index] && counted(index)
  const offDay = (index: number) => !came(index)

  let lastCame = -1
  let pastMaxGap = 0
  for (let index = 0, gap = 0; index < TOTAL; index++) {
    if (!counted(index)) continue
    if (came(index)) lastCame = index
    gap = came(index) ? 0 : gap + 1
    if (past(index)) pastMaxGap = Math.max(pastMaxGap, gap)
  }
  // 마지막 등원 뒤 판단하는 날 수 (주말 제외면 평일만)
  const daysSinceCame = dates.filter((_, index) => index > lastCame && counted(index)).length
  const gapIndex = (index: number) => dates.filter((_, i) => i > lastCame && i <= index && counted(i)).length
  const pastPerWeek = Math.round((dates.filter((_, index) => past(index) && came(index)).length / 3) * 10) / 10
  const recentCount = dates.filter((_, index) => isRecent(index) && came(index)).length
  // ok 온 날, off 안 온 날(평소 범위), miss 평소 최대 공백보다 길어진 날
  const state = (index: number): DayState =>
    !counted(index) ? 'skip' : came(index) ? 'ok' : index > lastCame && gapIndex(index) > pastMaxGap ? 'miss' : 'off'
  const attendPerWeek = Math.max(pastPerWeek, 1)

  // 공부 시간: 오는 날에만, 하루하루 들쭉날쭉. 최근 7일 합 = API 값, 그 이전 주 합 ≈ 평소 주간
  const apiRecent = sum(dailyStudy.slice(-7).map((day) => day.minutes))
  const generatedWeek = usualDailyMinutes * 7
  const weight = dates.map((_, index) => (came(index) ? 0.55 + random(seed + 3, index) * 0.9 : 0))
  const studyDays = dates.map((date, index) => {
    const week = isRecent(index)
      ? dates.map((_, i) => i).filter(isRecent)
      : Array.from({ length: 7 }, (_, i) => Math.floor(index / 7) * 7 + i)
    const weekWeight = sum(week.map((i) => weight[i])) || 1
    const total = isRecent(index) ? apiRecent : generatedWeek
    return { date, value: Math.round(((total * weight[index]) / weekWeight) / 5) * 5 }
  })
  const studyIn = (from: number, to: number) => sum(studyDays.slice(from, to).filter((_, i) => counted(from + i)).map((day) => day.value))
  const recentStudy = studyIn(recentFrom, TOTAL)
  // 주말 제외면 평소도 지난 3주 평일 합으로 다시 잡는다
  const usualWeek = excludeWeekend ? Math.round(studyIn(0, recentFrom) / 3) : usualDailyMinutes * 7
  const studyDrop = usualWeek ? Math.round((1 - recentStudy / usualWeek) * 100) : 0

  // 입실 시각: "평소 19:10 등원 → 최근 21:43"
  const startSignal = find('START_TIME_SHIFT')
  const times = [...textOf(startSignal).matchAll(/(\d{1,2}):(\d{2})/g)].map((m) => Number(m[1]) * 60 + Number(m[2]))
  const usualStart = times[0] ?? 18 * 60 + 40 + (seed % 40)
  const recentStart = times[1] ?? usualStart
  const startValues = dates.map((_, index) => {
    if (!came(index)) return null
    const base = isRecent(index) ? recentStart : usualStart
    const spike = past(index) && random(seed + 5, index) < 0.1 ? 50 : 0
    return Math.round(base + spike + (random(seed + 7, index) - 0.5) * 40)
  })
  const pastStart = average(startValues.flatMap((value, index) => (value !== null && past(index) ? [value] : [])))
  const recentStartAvg = average(startValues.flatMap((value, index) => (value !== null && isRecent(index) ? [value] : [])))
  const startDays = dates.map((date, index) => {
    const value = startValues[index]
    return { date, value, late: value !== null && isRecent(index) && value - pastStart >= 40 }
  })
  const startShift = Math.round(recentStartAvg - pastStart)

  // 계획 대비 달성: 실제 = 공부 시간, 계획 = 실제 ÷ 달성률. "최근 2주 계획 달성률 50%"
  const executionSignal = find('EXECUTION_GAP')
  const rate = (executionSignal && numbers(textOf(executionSignal), /(\d+)%/g).at(-1)) || 86
  const planDays = dates.map((date, index) => {
    if (offDay(index)) return { date, planned: 0, actual: 0, off: true }
    const actual = studyDays[index].value
    const base = executionSignal && index >= TOTAL - 14 ? rate : 88
    const dayRate = Math.max(15, Math.min(100, base + (random(seed + 9, index) - 0.5) * 30)) / 100
    const planned = Math.round((actual ? actual / dayRate : usualDailyMinutes * 1.3) / 10) * 10
    return { date, planned, actual, off: false }
  })
  const rateOf = (days: typeof planDays) => {
    const planned = sum(days.map((day) => day.planned))
    return planned ? Math.round((sum(days.map((day) => Math.min(day.actual, day.planned))) / planned) * 100) : 0
  }
  const recentRate = rateOf(planDays.slice(-14))
  const pastRate = rateOf(planDays.slice(0, -14))

  // 과목 계획 (최근 7일 합계): 과목별 계획 비중 vs 실제 비중. "수학 계획 30% → 실제 12%"
  const subjectSignal = find('SUBJECT_SHARE')
  const flagged = textOf(subjectSignal).match(/(\S+) 계획 (\d+)% → 실제 (\d+)%/)
  const names = ['국어', '영어', '수학', '과학', '사회']
  const raw = names.map((_, i) => 0.6 + random(seed + 21, i))
  const toShares = (values: number[]) => {
    const total = sum(values)
    const shares = values.map((value) => Math.round((value / total) * 100))
    shares[shares.length - 1] += 100 - sum(shares)
    return shares
  }
  const planShares = toShares(raw)
  let actualShares = toShares(raw.map((value, i) => value * (0.85 + random(seed + 23, i) * 0.3)))
  if (flagged) {
    const at = names.indexOf(flagged[1]) >= 0 ? names.indexOf(flagged[1]) : 2
    names[at] = flagged[1]
    planShares[at] = Number(flagged[2])
    const others = planShares.map((share, i) => (i === at ? 0 : share))
    const rest = toShares(others.map((share) => share || 0.0001)).map((share, i) => (i === at ? 0 : share))
    const spread = 100 - Number(flagged[3])
    actualShares = rest.map((share, i) => (i === at ? Number(flagged[3]) : Math.round((share / 100) * spread)))
    actualShares[at === names.length - 1 ? 0 : names.length - 1] += 100 - sum(actualShares)
    const restPlan = toShares(others.map((share) => share || 0.0001)).map((share) => Math.round((share / 100) * (100 - planShares[at])))
    restPlan.forEach((share, i) => {
      if (i !== at) planShares[i] = share
    })
    planShares[at === names.length - 1 ? 0 : names.length - 1] += 100 - sum(planShares)
  }
  const subjects = names.map((name, i) => ({ name, plan: planShares[i], actual: actualShares[i] }))
  const worstSubject = subjects.reduce((a, b) => (Math.abs(b.plan - b.actual) > Math.abs(a.plan - a.actual) ? b : a))
  const subjectGap = Math.abs(worstSubject.plan - worstSubject.actual)

  // 계획 제출: "최근 7일 중 4일 미제출" (온 날 기준). 과거에도 가끔 미제출
  const missingCount = numbers(textOf(find('PLAN_MISSING')), /(\d+)일 미제출/g)[0] ?? 0
  const recentAttendIdx = dates.map((_, index) => index).filter((index) => isRecent(index) && !offDay(index))
  const recentMissing = new Set(
    [...recentAttendIdx].sort((a, b) => random(seed + 13, a) - random(seed + 13, b)).slice(0, missingCount),
  )
  const submitStates = dates.map((_, index): DayState =>
    offDay(index) ? 'off' : recentMissing.has(index) ? 'miss' : past(index) && random(seed + 17, index) < 0.1 ? 'missOld' : 'ok',
  )
  const submitRate = (from: number, to: number) => {
    const days = submitStates.slice(from, to).filter((value) => value !== 'off')
    return days.length ? Math.round((days.filter((value) => value === 'ok').length / days.length) * 100) : 100
  }
  const recentSubmit = submitRate(recentFrom, TOTAL)
  const pastSubmit = submitRate(0, recentFrom)

  const gapLonger = daysSinceCame > pastMaxGap
  const attendLabel = `주 평균 ${pastPerWeek}회 · 최대 ${pastMaxGap}일 비움${excludeWeekend ? ' (평일 기준)' : ''}`
  const shown = <T,>(days: T[]) => days.slice(TOTAL - period)
  // 주 단위: 기준일부터 7일씩 거꾸로 묶는다
  const weekly = (value: (index: number) => number) =>
    Array.from({ length: period / 7 }, (_, w) => {
      const to = TOTAL - 1 - (period / 7 - 1 - w) * 7
      const from = to - 6
      return {
        from: dates[from],
        to: dates[to],
        label: `${shortDate(dates[from])}~${shortDate(dates[to])}`,
        value: sum(Array.from({ length: 7 }, (_, i) => (counted(from + i) ? value(from + i) : 0))),
      }
    })
  // 온 날만
  const cameOnly = <T,>(days: T[]) => shown(days).filter((_, i) => came(TOTAL - period + i))

  const metrics: MetricSeries[] = [
    {
      type: 'CONSECUTIVE_ABSENCE',
      label: '출결',
      view: {
        kind: 'weekly',
        weeks: weekly((index) => (came(index) ? 1 : 0)),
        usual: pastPerWeek,
        unit: 'count',
        calendar: shown(
          dates.map((date, index) => ({
            date,
            skip: !counted(index),
            came: came(index),
            longGap: state(index) === 'miss',
            minutes: studyDays[index].value,
            start: startValues[index],
            planned: planDays[index].planned,
            submitted: submitStates[index] === 'ok',
          })),
        ),
      },
      level: level(
        daysSinceCame >= 7 || (gapLonger && daysSinceCame >= pastMaxGap * 2),
        gapLonger || recentCount < pastPerWeek * 0.5,
      ),
      change: gapLonger ? `${daysSinceCame}일째 결석` : '평소처럼 등원',
      detail: `최근 7일 ${recentCount}회 · 평소 주 ${pastPerWeek}회, 최대 ${pastMaxGap}일 비움${excludeWeekend ? ' (평일 기준)' : ''}`,
    },
    {
      type: 'STUDY_DROP',
      label: '공부 시간',
      view: {
        kind: 'weekly',
        weeks: weekly((index) => studyDays[index].value),
        usual: usualWeek,
        unit: 'minutes',
        // 일별 보기: 화면 기간 전체, 최근 날짜부터
        daily: shown(dates.map((date, index) => ({ date, minutes: studyDays[index].value, came: came(index), skip: !counted(index) })))
          .filter((day) => !day.skip)
          .reverse(),
      },
      level: level(studyDrop >= 40, studyDrop >= 20),
      change: studyDrop >= 5 ? `${studyDrop}% 감소` : '평소만큼',
      detail: `최근 7일 ${hoursMinutes(recentStudy)} · 평소 주 ${hoursMinutes(usualWeek)}${excludeWeekend ? ' (평일 기준)' : ''}`,
    },
    {
      type: 'START_TIME_SHIFT',
      label: '입실 시각',
      view: { kind: 'line', days: cameOnly(startDays), usual: Math.round(pastStart) },
      level: level(startShift >= 60, startShift >= 30),
      change: startShift >= 10 ? `${startShift >= 90 ? `${Math.floor(startShift / 60)}시간 ${startShift % 60}분` : `${startShift}분`} 늦어짐` : '평소 시각',
      detail: `최근 평균 ${clock(recentStartAvg)} · 평소 ${clock(pastStart)}`,
    },
    {
      type: 'EXECUTION_GAP',
      label: '계획 대비 달성',
      view: { kind: 'planActual', days: cameOnly(planDays) },
      level: level(pastRate - recentRate >= 25, pastRate - recentRate >= 10),
      change: pastRate - recentRate >= 5 ? `${pastRate}% → ${recentRate}%` : `${recentRate}% 유지`,
      detail: `최근 14일 달성률 · 이전 14일 ${pastRate}%`,
    },
    {
      type: 'SUBJECT_SHARE',
      label: '과목 계획',
      view: { kind: 'share', subjects, worst: worstSubject.name },
      level: level(subjectGap >= 15, subjectGap >= 8),
      change:
        subjectGap >= 5
          ? `${worstSubject.name} ${subjectGap}%p ${worstSubject.actual < worstSubject.plan ? '부족' : '초과'}`
          : '계획한 비중대로',
      detail: '최근 7일 · 과목별 계획 비중 대비 실제 공부 비중',
    },
    {
      type: 'PLAN_MISSING',
      label: '계획 제출',
      view: {
        kind: 'dateList',
        // 안 온 날은 제출 대상이 아니므로 빼고 온 날만 나열한다.
        days: shown(dates.map((date, index) => ({ date, state: submitStates[index] }))).filter((day) => day.state !== 'off'),
      },
      level: level(pastSubmit - recentSubmit >= 40, pastSubmit - recentSubmit >= 20),
      change: pastSubmit - recentSubmit >= 10 ? `${pastSubmit}% → ${recentSubmit}%` : `${recentSubmit}% 제출`,
      detail: `최근 7일 제출률 · 지난 3주 ${pastSubmit}%`,
    },
  ]

  return { pattern: { attendPerWeek, attendLabel }, metrics }
}
