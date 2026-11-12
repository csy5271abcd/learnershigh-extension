// 생활 레포트 수치. 같은 학생·같은 기간의 숫자가 화면마다 같도록 계산은 여기 한 곳.
// 기간: 고른 날짜까지 최근 7일, 비교: 그 앞 7일.
// 데일리·주간·월간 레포트에 이미 있는 공부 시간·순공·계획 달성률·자습 비율·과목은 넣지 않는다.
// 생활 탭에만 있는 것: 출결(결석·늦은 입실), 입실 시각 변화, 계획 제출, 이미지 인식 관찰(휴대폰 사용·엎드림·자리 비움), 케어 기록.
import type { CareRow } from '../../shared/useCareData.ts'
import { eventDate, eventStartMinute, SUP_BEHAVIORS, type SupBehavior, type SupEvent } from '../../supervisor/supervisorClient.ts'
import type { StudentHistory } from '../../../model/types.ts'
import { usualStartAt } from '../x2Model.ts'

type D = CareRow['history35'][number]
const DOW = ['일', '월', '화', '수', '목', '금', '토']
/** 늦은 입실 기본값(분). 실제로는 학생 케어 관리 기준(startShiftMinutes)을 넘겨받아 학생 케어 화면과 같은 기준을 쓴다 */
export const LATE_DEFAULT = 30

const iso = (t: number) => new Date(t).toISOString().slice(0, 10)
const pad = (n: number) => String(n).padStart(2, '0')
export const md = (date: string) => `${pad(Number(date.slice(5, 7)))}/${pad(Number(date.slice(8, 10)))}`
export const dowOf = (date: string) => DOW[new Date(`${date}T00:00:00Z`).getUTCDay()]
export const clock = (m: number) => `${pad(Math.floor(m / 60) % 24)}:${pad(Math.round(m) % 60)}`
export const dur = (m: number) => { const a = Math.round(Math.abs(m)), h = Math.floor(a / 60); return h ? `${h}시간${a % 60 ? ` ${a % 60}분` : ''}` : `${a}분` }
export const sign = (v: number) => (v > 0 ? '+' : v < 0 ? '−' : '±')
export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : null)

export interface LifeDay { date: string; dow: string; d: D | undefined; present: boolean; absent: boolean; usual: number | null; late: number | null; focus: number; focusBy: Record<SupBehavior, number> }

const zero = (): Record<SupBehavior, number> => ({ PHONE_USAGE: 0, LYING_DOWN: 0, ABSENCE: 0 })

function windowOf(s: CareRow, ev: SupEvent[], end: string, back: number, lateMin: number) {
  const t = Date.parse(`${end}T00:00:00Z`) - back * 7 * 864e5
  const by = new Map(s.history35.map((d) => [d.date, d]))
  const days: LifeDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = iso(t - (6 - i) * 864e5), d = by.get(date)
    const present = d?.attendance === 'present'
    // 학부모 레포트는 '예정 없음'도 결석으로 보인다(2026-11-12 사용자). 출석률·결석 수도 같은 기준으로 센다
    const absent = d?.attendance === 'absent' || d?.attendance === 'off'
    // 평소 입실은 학생 케어와 같은 함수(그 요일 평소, 없으면 직전 같은 요일 평균). 결석한 날도 '왔어야 할 시각'으로 둔다
    const u = present || absent ? usualStartAt(s, d!, s.history35.indexOf(d!)) : null
    const late = present && d!.start !== null && u !== null ? d!.start - u : null
    const mine = ev.filter((e) => eventDate(e) === date), focusBy = zero()
    for (const e of mine) focusBy[e.reason] += 1
    return { date, dow: dowOf(date), d, present, absent, usual: u, late, focus: mine.length, focusBy }
  })
  const present = days.filter((x) => x.present)
  const starts = present.flatMap((x) => (x.d!.start === null ? [] : [x.d!.start]))
  // 계획 제출은 학생 케어와 같이 입실한 날만 센다(결석한 날을 미제출로 두 번 세지 않음)
  const subKnown = present.filter((x) => x.d!.submission === 'submitted' || x.d!.submission === 'missing')
  const focusBy = zero()
  for (const x of days) for (const k of SUP_BEHAVIORS) focusBy[k] += x.focusBy[k]
  const focus = days.reduce((a, x) => a + x.focus, 0)
  const study = present.reduce((a, x) => a + (x.d!.minutes ?? 0), 0)
  // 하루 중 비몰입 시각(시 단위, 한국 시각)
  const hours = new Map<number, number>()
  const dates = new Set(days.map((x) => x.date))
  for (const e of ev) if (dates.has(eventDate(e))) { const h = Math.floor(eventStartMinute(e) / 60); hours.set(h, (hours.get(h) ?? 0) + 1) }
  return {
    days, from: days[0].date, to: days[6].date,
    recorded: days.some((x) => x.d && x.d.attendance !== 'unknown'),
    present: present.length,
    scheduled: days.filter((x) => x.present || x.absent).length,
    absent: days.filter((x) => x.absent),
    late: days.filter((x) => x.late !== null && x.late >= lateMin),
    avgStart: starts.length ? starts.reduce((a, b) => a + b, 0) / starts.length : null,
    usualStart: present.find((x) => x.d!.usualStart !== null)?.d!.usualStart ?? null,
    submitted: subKnown.filter((x) => x.d!.submission === 'submitted').length,
    submitKnown: subKnown.length,
    missing: subKnown.filter((x) => x.d!.submission === 'missing'),
    focus, focusBy, hours,
    /** 공부 1시간당 관찰 건수(관리 화면의 '시간당 n건' 기준과 같은 단위) */
    perHour: study > 0 ? focus / Math.max(0.5, study / 60) : null,
  }
}

export type LifeWindow = ReturnType<typeof windowOf>

export function lifeData(s: CareRow, ev: SupEvent[], date: string, lateMin = LATE_DEFAULT) {
  const now = windowOf(s, ev, date, 0, lateMin), prev = windowOf(s, ev, date, 1, lateMin)
  const has = prev.recorded
  const dStart = has && now.avgStart !== null && prev.avgStart !== null ? now.avgStart - prev.avgStart : null
  const submitRate = pct(now.submitted, now.submitKnown), submitPrev = has ? pct(prev.submitted, prev.submitKnown) : null
  const dSubmit = submitRate !== null && submitPrev !== null ? submitRate - submitPrev : null
  const dFocus = has ? now.focus - prev.focus : null
  const dLate = has ? now.late.length - prev.late.length : null
  return { now, prev, has, dStart, submitRate, dSubmit, dFocus, dLate, lateMin }
}

export type Life = ReturnType<typeof lifeData>

const CH: Record<string, string> = { MEETING: '면담', CALL: '통화', MESSAGE: '메시지', OTHER: '기타' }
/** 케어 기록(학생 케어 상담 이력). 레포트는 지금 보내므로 고른 날짜 뒤 기록도 최근 3건에 넣는다(2026-11-12 사용자: 11/12 상담이 11/10 레포트에서 빠짐).
 *  학부모에게는 상담 내용 원문을 보이지 않고 '무엇 때문에 어떤 방식으로' 만 보인다 */
export function careRecords(h: StudentHistory | null | undefined, date: string) {
  if (!h) return null
  const cases = new Map((h.cases ?? []).map((c) => [c.caseId, c]))
  return h.items.filter((it) => it.noteChannel).sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt)).slice(0, 3).map((it) => {
    const c = cases.get(it.caseId), why = c?.baseline.map((b) => b.label).join('·') ?? ''
    return { id: it.eventId, date: it.occurredOn, dow: dowOf(it.occurredOn), channel: CH[it.noteChannel!] ?? '기타', topic: why ? `${why} 관련 ${CH[it.noteChannel!] ?? '상담'}` : `생활 점검 ${CH[it.noteChannel!] ?? '상담'}`, next: c?.recheckDate && c.recheckDate > date ? c.recheckDate : null }
  })
}
export type CareRecord = NonNullable<ReturnType<typeof careRecords>>[number]
