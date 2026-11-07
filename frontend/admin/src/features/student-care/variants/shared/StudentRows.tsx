// 학생 한 명의 지표 요약(best-practice-v5.md 3장): 지표마다 한 줄 = 기준과 비교하는 막대 + 최근 5주 작은 추이선 + 숫자 하나.
// 막대: 진한 막대 = 최근 7일, 회색 띠 = 평소, 세로 눈금 = 관리 기준. 날짜별 값은 아래 "날짜별"에서.
import { hours, clock, type OpsDay } from './model.ts'
import { md, type CareRow } from './useCareData.ts'
import { sumVision } from './visionExample.ts'
import type { Thresholds } from './bands.ts'

interface CompareBar { value: number; usual: number | null; limit: number | null; max: number; min?: number; bad: boolean; label: string; over?: boolean }

/** 기준과 비교하는 막대. min이 음수면 가운데 0에서 양쪽으로 그린다(입실: 왼쪽 일찍, 오른쪽 늦게) */
function Bar({ b }: { b: CompareBar }) {
  const lo = b.min ?? 0, span = b.max - lo
  const pos = (v: number) => `${Math.max(0, Math.min(100, ((v - lo) / span) * 100))}%`
  const zero = lo < 0 ? ((0 - lo) / span) * 100 : 0
  const a = Math.min(0, b.value), z = Math.max(0, b.value)
  return (
    <span className="v5-cbar" role="img" tabIndex={0} aria-label={b.label} data-tip={b.label}>
      {lo < 0 && <span className="v5-cbar-zero" style={{ left: `${zero}%` }} />}
      {b.usual !== null && <span className="v5-cbar-usual" style={{ left: pos(Math.min(0, b.usual)), width: `calc(${pos(Math.max(0, b.usual))} - ${pos(Math.min(0, b.usual))})` }} />}
      <span className={`v5-cbar-value${b.bad ? ' v5-cbar-bad' : ''}`} style={{ left: pos(lo < 0 ? a : 0), width: `calc(${pos(lo < 0 ? z : b.value)} - ${pos(lo < 0 ? a : 0)})` }} />
      {b.limit !== null && <span className="v5-cbar-limit" style={{ left: pos(b.limit) }} />}
      {b.over && <span className="v5-cbar-over">▶</span>}
    </span>
  )
}

/** 최근 5주 주별 값의 작은 추이선(마지막 = 최근 7일). 값이 없는 주는 선을 끊고, 점마다 초점·마우스로 값 */
function Weeks({ values, label, unit, ends }: { values: (number | null)[]; label: string; unit: (v: number) => string; ends: string[] }) {
  const w = 120, h = 30, vs = values.flatMap((v) => v ?? []), max = Math.max(1, ...vs), min = Math.min(0, ...vs)
  const xAt = (i: number) => 6 + (i * (w - 12)) / Math.max(1, values.length - 1)
  const pts = values.map((v, i) => v === null ? null : [xAt(i), h - 5 - ((v - min) / (max - min || 1)) * (h - 10)] as const)
  const segs: string[][] = []; let cur: string[] = []
  pts.forEach((p) => { if (p) cur.push(p.join(',')); else if (cur.length) { segs.push(cur); cur = [] } }); if (cur.length) segs.push(cur)
  return (
    <svg width={w} height={h} className="v5-trend" role="group" aria-label={`${label} 최근 5주`}>
      {segs.map((s, k) => <polyline key={k} points={s.join(' ')} />)}
      {values.map((v, i) => { const text = `${ends[i]} 끝난 주 ${v === null ? '기록 없음' : unit(v)}`
        return <g key={i} tabIndex={0} role="img" aria-label={`${label} ${text}`} data-tip={text}><rect x={xAt(i) - 9} y={0} width={18} height={h} fill="transparent" />{pts[i] ? <circle cx={pts[i]![0]} cy={pts[i]![1]} r={i === values.length - 1 ? 3 : 2} /> : <line x1={xAt(i) - 3} x2={xAt(i) + 3} y1={h - 5} y2={h - 5} className="v5-trend-gap" />}</g> })}
    </svg>
  )
}

const weeksOf = (days: OpsDay[]) => Array.from({ length: Math.ceil(days.length / 7) }, (_, k) => days.slice(Math.max(0, days.length - (k + 1) * 7), days.length - k * 7)).reverse()

export function StudentRows({ s, t, executionRate }: { s: CareRow; t: Thresholds; executionRate: number }) {
  const w = s.week, weeks = weeksOf(s.history35)
  const ends = weeks.map((x) => md(x[x.length - 1].date))
  const studyWeeks = weeks.map((x) => x.some((d) => d.minutes !== null) ? x.reduce((a, d) => a + (d.minutes ?? 0), 0) : null)
  const startWeeks = weeks.map((x) => { const v = x.flatMap((d) => d.start ?? []); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null })
  const absentWeeks = weeks.map((x) => x.some((d) => d.attendance === 'absent' || d.attendance === 'present') ? x.filter((d) => d.attendance === 'absent').length : null)
  const missWeeks = weeks.map((x) => x.some((d) => d.submission === 'missing' || d.submission === 'submitted') ? x.filter((d) => d.submission === 'missing').length : null)
  const studyPct = w.minutes !== null && w.usualWeek ? Math.round(((w.minutes - w.usualWeek) / w.usualWeek) * 100) : null
  const shifts = s.days.flatMap((d) => d.start !== null && d.usualStart !== null ? [d.start - d.usualStart] : [])
  const shift = shifts.length ? Math.round(shifts.reduce((a, b) => a + b, 0) / shifts.length) : null
  const attKnown = s.days.some((d) => d.attendance === 'absent' || d.attendance === 'present'), subKnown = s.days.some((d) => d.submission === 'missing' || d.submission === 'submitted')
  const absent = s.days.filter((d) => d.attendance === 'absent').length
  const missing = s.days.filter((d) => d.submission === 'missing').length
  const phone = sumVision(s.vision).axes.phone_interaction
  const rows: { name: string; bar: CompareBar | null; trend: React.ReactNode; num: string; bad: boolean }[] = [
    { name: '학습 시간', bad: studyPct !== null && studyPct <= -t.studyDropPercent,
      bar: w.minutes === null ? null : { value: w.minutes, usual: w.usualWeek, limit: w.usualWeek ? w.usualWeek * (1 - t.studyDropPercent / 100) : null, max: Math.max(w.minutes, (w.usualWeek ?? 0) * 1.3, 60), bad: studyPct !== null && studyPct <= -t.studyDropPercent, label: `최근 7일 ${hours(w.minutes)}, 평소 주 ${hours(w.usualWeek)}, 기준 평소의 ${100 - t.studyDropPercent}%` },
      trend: <Weeks values={studyWeeks} ends={ends} label="주별 학습 시간" unit={(v) => hours(v)} />, num: `${hours(w.minutes)}${studyPct !== null ? ` · ${studyPct > 0 ? '+' : studyPct < 0 ? '−' : ''}${Math.abs(studyPct)}%` : ''}` },
    { name: '입실 시각', bad: shift !== null && shift >= t.startShiftMinutes,
      bar: shift === null ? null : { value: Math.max(-t.startShiftMinutes * 1.5, Math.min(t.startShiftMinutes * 1.5, shift)), usual: null, limit: t.startShiftMinutes, min: -t.startShiftMinutes * 1.5, max: t.startShiftMinutes * 1.5, over: Math.abs(shift) > t.startShiftMinutes * 1.5, bad: shift >= t.startShiftMinutes, label: `최근 7일 평균 평소보다 ${Math.abs(shift)}분 ${shift >= 0 ? '늦게' : '일찍'}, 기준 ${t.startShiftMinutes}분 늦음` },
      trend: <Weeks values={startWeeks} ends={ends} label="주별 평균 입실 시각" unit={(v) => clock(v)} />, num: shift === null ? '입실 기록 없음' : `평소보다 ${Math.abs(shift)}분 ${shift >= 0 ? '늦게' : '일찍'}` },
    { name: '결석', bad: attKnown && absent >= t.absenceDays,
      bar: !attKnown ? null : { value: absent, usual: null, limit: t.absenceDays, max: 7, bad: absent >= t.absenceDays, label: `최근 7일 결석 ${absent}일, 기준 ${t.absenceDays}일` },
      trend: <Weeks values={absentWeeks} ends={ends} label="주별 결석" unit={(v) => `${v}일`} />, num: attKnown ? `${absent}일 / 등원 예정 ${w.scheduled}일` : '기록 없음' },
    { name: '계획 미제출', bad: subKnown && missing >= t.planMissingDays,
      bar: !subKnown ? null : { value: missing, usual: null, limit: t.planMissingDays, max: 7, bad: missing >= t.planMissingDays, label: `최근 7일 계획 미제출 ${missing}일, 기준 ${t.planMissingDays}일` },
      trend: <Weeks values={missWeeks} ends={ends} label="주별 계획 미제출" unit={(v) => `${v}일`} />, num: subKnown ? `${missing}일 / 대상 ${w.submitKnown}일` : '기록 없음' },
    { name: '진행률', bad: w.executionRate !== null && w.executionRate < executionRate,
      bar: w.executionRate === null ? null : { value: Math.min(w.executionRate, 150), usual: null, limit: executionRate, max: 150, over: w.executionRate > 150, bad: w.executionRate < executionRate, label: `최근 7일 진행률 ${Math.round(w.executionRate)}%, 기준 ${executionRate}%` },
      trend: null, num: w.executionRate === null ? (w.comparablePlanDays ? '실제 기록 없음' : '계획 없음') : `${Math.round(w.executionRate)}%` },
    { name: '휴대폰 사용 (예시)', bad: false,
      bar: phone.analyzed ? { value: (phone.yes / phone.analyzed) * 100, usual: null, limit: null, max: 100, bad: false, label: `분석 사진 ${phone.analyzed}장 중 휴대폰 사용 관찰 ${phone.yes}장` } : null,
      trend: null, num: phone.analyzed ? `${Math.round((phone.yes / phone.analyzed) * 100)}% · 사진 ${phone.analyzed}장` : '분석 사진 없음' },
  ]
  return (
    <div>
      <p className="v5-key"><span className="v5-key-cbar" />최근 7일 <span className="v5-key-cusual" />평소 <span className="v5-key-climit" />관리 기준</p>
      <table className="v5-srows" aria-label={`${s.student.studentName} 지표 요약`}>
        <thead><tr><th scope="col">지표</th><th scope="col">최근 7일과 기준</th><th scope="col">최근 5주</th><th scope="col"><span className="lh-visually-hidden">값</span></th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.name} className={r.bad ? 'v5-srow-bad' : ''}><th scope="row">{r.name}</th><td>{r.bar ? <Bar b={r.bar} /> : <span className="v5-muted">—</span>}</td><td>{r.trend}</td><td className={r.bad ? 'v5-late' : ''}>{r.num}</td></tr>)}</tbody>
      </table>
      <p className="v5-muted">최근 7일 {md(s.days[0].date)}–{md(s.days[6].date)}</p>
    </div>
  )
}
