// 학생 한 명의 지표 요약(best-practice-v5.md 3장): 지표마다 한 줄 = 기준과 비교하는 막대 + 최근 5주 작은 추이선 + 숫자 하나.
// 막대: 진한 막대 = 최근 7일, 회색 띠 = 평소, 세로 눈금 = 관리 기준. 날짜별 값은 아래 "날짜별"에서.
import { hours, clock, type OpsDay } from './model.ts'
import { md, type CareRow } from './useCareData.ts'
import { sumVision } from './visionExample.ts'
import type { Thresholds } from './bands.ts'

interface CompareBar { value: number; usual: number | null; limit: number | null; max: number; bad: boolean; label: string }

function Bar({ b }: { b: CompareBar }) {
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / b.max) * 100))}%`
  return (
    <span className="v5-cbar" role="img" aria-label={b.label} data-tip={b.label}>
      {b.usual !== null && <span className="v5-cbar-usual" style={{ width: pct(b.usual) }} />}
      <span className={`v5-cbar-value${b.bad ? ' v5-cbar-bad' : ''}`} style={{ width: pct(b.value) }} />
      {b.limit !== null && <span className="v5-cbar-limit" style={{ left: pct(b.limit) }} />}
    </span>
  )
}

/** 최근 5주 주별 값의 작은 추이선(마지막 주 = 최근 7일) */
function Weeks({ values, label, unit }: { values: (number | null)[]; label: string; unit: (v: number) => string }) {
  const w = 110, h = 28, vs = values.map((v) => v ?? 0), max = Math.max(1, ...vs), min = Math.min(0, ...vs)
  const pts = values.map((v, i) => v === null ? null : [4 + (i * (w - 8)) / Math.max(1, values.length - 1), h - 4 - ((v - min) / (max - min || 1)) * (h - 8)] as const)
  return (
    <svg width={w} height={h} className="v5-trend" role="img" aria-label={`${label} 최근 5주: ${values.map((v) => v === null ? '없음' : unit(v)).join(', ')}`}>
      <polyline points={pts.filter(Boolean).map((p) => p!.join(',')).join(' ')} />
      {pts[pts.length - 1] && <circle cx={pts[pts.length - 1]![0]} cy={pts[pts.length - 1]![1]} r={2.5} />}
    </svg>
  )
}

const weeksOf = (days: OpsDay[]) => Array.from({ length: Math.ceil(days.length / 7) }, (_, k) => days.slice(Math.max(0, days.length - (k + 1) * 7), days.length - k * 7)).reverse()

export function StudentRows({ s, t, executionRate }: { s: CareRow; t: Thresholds; executionRate: number }) {
  const w = s.week, weeks = weeksOf(s.history35)
  const studyWeeks = weeks.map((x) => x.some((d) => d.minutes !== null) ? x.reduce((a, d) => a + (d.minutes ?? 0), 0) : null)
  const startWeeks = weeks.map((x) => { const v = x.flatMap((d) => d.start ?? []); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null })
  const absentWeeks = weeks.map((x) => x.filter((d) => d.attendance === 'absent').length)
  const missWeeks = weeks.map((x) => x.filter((d) => d.submission === 'missing').length)
  const studyPct = w.minutes !== null && w.usualWeek ? Math.round(((w.minutes - w.usualWeek) / w.usualWeek) * 100) : null
  const shifts = s.days.flatMap((d) => d.start !== null && d.usualStart !== null ? [d.start - d.usualStart] : [])
  const shift = shifts.length ? Math.round(shifts.reduce((a, b) => a + b, 0) / shifts.length) : null
  const absent = s.days.filter((d) => d.attendance === 'absent').length
  const missing = s.days.filter((d) => d.submission === 'missing').length
  const phone = sumVision(s.vision).axes.phone_interaction
  const rows: { name: string; bar: CompareBar | null; trend: React.ReactNode; num: string; bad: boolean }[] = [
    { name: '학습 시간', bad: studyPct !== null && studyPct <= -t.studyDropPercent,
      bar: w.minutes === null ? null : { value: w.minutes, usual: w.usualWeek, limit: w.usualWeek ? w.usualWeek * (1 - t.studyDropPercent / 100) : null, max: Math.max(w.minutes, (w.usualWeek ?? 0) * 1.3, 60), bad: studyPct !== null && studyPct <= -t.studyDropPercent, label: `최근 7일 ${hours(w.minutes)}, 평소 주 ${hours(w.usualWeek)}, 기준 평소의 ${100 - t.studyDropPercent}%` },
      trend: <Weeks values={studyWeeks} label="주별 학습 시간" unit={(v) => hours(v)} />, num: `${hours(w.minutes)}${studyPct !== null ? ` · ${studyPct > 0 ? '+' : studyPct < 0 ? '−' : ''}${Math.abs(studyPct)}%` : ''}` },
    { name: '입실 시각', bad: shift !== null && shift >= t.startShiftMinutes,
      bar: shift === null ? null : { value: Math.max(0, shift), usual: null, limit: t.startShiftMinutes, max: Math.max(t.startShiftMinutes * 1.5, shift), bad: shift >= t.startShiftMinutes, label: `최근 7일 평균 평소보다 ${shift}분 ${shift >= 0 ? '늦음' : '이름'}, 기준 ${t.startShiftMinutes}분` },
      trend: <Weeks values={startWeeks} label="주별 평균 입실 시각" unit={(v) => clock(v)} />, num: shift === null ? '입실 기록 없음' : `평소보다 ${Math.abs(shift)}분 ${shift >= 0 ? '늦음' : '이름'}` },
    { name: '결석', bad: absent >= t.absenceDays,
      bar: { value: absent, usual: null, limit: t.absenceDays, max: 7, bad: absent >= t.absenceDays, label: `최근 7일 결석 ${absent}일, 기준 ${t.absenceDays}일` },
      trend: <Weeks values={absentWeeks} label="주별 결석" unit={(v) => `${v}일`} />, num: `${absent}일 / 등원 예정 ${w.scheduled}일` },
    { name: '계획 미제출', bad: missing >= t.planMissingDays,
      bar: { value: missing, usual: null, limit: t.planMissingDays, max: 7, bad: missing >= t.planMissingDays, label: `최근 7일 계획 미제출 ${missing}일, 기준 ${t.planMissingDays}일` },
      trend: <Weeks values={missWeeks} label="주별 계획 미제출" unit={(v) => `${v}일`} />, num: `${missing}일` },
    { name: '진행률', bad: w.executionRate !== null && w.executionRate < executionRate,
      bar: w.executionRate === null ? null : { value: Math.min(w.executionRate, 150), usual: null, limit: executionRate, max: 150, bad: w.executionRate < executionRate, label: `최근 7일 진행률 ${Math.round(w.executionRate)}%, 기준 ${executionRate}%` },
      trend: null, num: w.executionRate === null ? '계획 없음' : `${Math.round(w.executionRate)}%` },
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
