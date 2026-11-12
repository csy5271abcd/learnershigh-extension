// Z′ 전용 그림. 학생 상세에서 '그 학생의 관리 사유'마다 그 사유를 만든 값 하나를 크게 보여 준다(다른 시안과 코드를 나누지 않는다).
// 빨강은 서버 사유가 있고 그 칸 값이 같은 기준을 넘을 때만. 이름은 그림에 직접, 결석은 날짜 밑.
import type { ReactNode } from 'react'
import type { CareRow } from '../shared/useCareData.ts'
import { md } from '../shared/useCareData.ts'
import { useWidth } from '../z/useWidth.ts'
import { clock, clockDomain, clockTick, dropDay, hm, lateDay, STATE, weeksOf } from '../notation/kit.tsx'

type Day = CareRow['days'][number]
const has = (s: CareRow, t: string) => s.signals.some((x) => x.type === t)

/** 날짜 칸 아래 글자(날짜·요일·결석) */
function DayAxis({ d, x, y }: { d: Day; x: number; y: number }): ReactNode {
  const off = d.attendance !== 'present'
  return <>
    <text x={x} y={y} textAnchor="middle" className={`zz-tick${off && d.attendance === 'absent' ? ' zz-flag' : ' zz-strong'}`}>{md(d.date)}</text>
    <text x={x} y={y + 16} textAnchor="middle" className={`zz-tick${d.attendance === 'absent' ? ' zz-flag' : ''}`}>{d.dow}</text>
    {/* 상태는 셋째 줄: 좁은 칸에서 '토 결석일 결석'처럼 옆 날짜와 이어 읽히지 않게 */}
    {off && <text x={x} y={y + 32} textAnchor="middle" className={`zz-tick zz-small${d.attendance === 'absent' ? ' zz-flag' : ''}`}>{d.attendance === 'off' ? '예정 없음' : STATE[d.attendance]}</text>}
  </>
}

/** 최근 5주 주별 일수 막대(결석·계획 미제출이 언제부터 늘었는지) */
export function WeekDays({ s, pick, unitWord }: { s: CareRow; pick: (d: Day) => boolean; unitWord: string }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  // 기록이 하나도 없는 주(연동 누락·등록 전)는 0일이 아니라 '기록 없음'
  const weeks = weeksOf(s), n = weeks.map((wk) => wk.some((d) => d.attendance !== 'unknown') ? wk.filter(pick).length : null)
  // 5주 모두 0이면 빈 그림 대신 한 줄(빈 판을 남기지 않는다). 기록이 전혀 없으면 그렇게 적는다
  if (n.every((x) => x === null)) return <p className="zz-zero">최근 5주 기록 없음</p>
  if (n.every((x) => !x)) return <p className="zz-zero">최근 5주 {unitWord} 0일{n.some((x) => x === null) ? ' · 기록 없는 주 있음' : ''}</p>
  const top = Math.max(3, ...n.map((x) => x ?? 0))
  const H = 150, L = 40, T = 24, B = 32, cw = (w - L) / 5, bw = Math.min(40, cw * 0.42), Y = (v: number) => T + (1 - v / top) * (H - T - B)
  return (
    <div ref={ref} className="zz-plot">
      <svg width={w} height={H} role="img" aria-label={`최근 5주 주별 ${unitWord} 일수`}>
        {[0, top].map((t) => <g key={t}><line x1={L} x2={w} y1={Y(t)} y2={Y(t)} className="zz-grid" /><text x={L - 8} y={Y(t) + 4} textAnchor="end" className="zz-tick">{t}일</text></g>)}
        {weeks.map((wk, g) => { const cx = L + cw * (g + 0.5), recent = g === 4, v = n[g], tip = `${recent ? '최근 7일' : `${md(wk[0].date)}–${md(wk[6].date)}`} · ${v === null ? '기록 없음' : `${unitWord} ${v}일`}`
          return <g key={g} tabIndex={0} data-tip={tip} aria-label={tip}>
            {v !== null && <rect x={cx - bw / 2} y={Y(v)} width={bw} height={Math.max(v ? 2 : 0, Y(0) - Y(v))} rx={4} className={recent && v ? 'zz-bar-flag' : 'zz-bar-old'} />}
            <text x={cx} y={(v === null ? Y(0) : Y(v)) - 7} textAnchor="middle" className={`zz-tick zz-halo${recent ? ' zz-strong' : ''}`}>{v === null ? '기록 없음' : `${v}일`}</text>
            <text x={cx} y={H - B + 18} textAnchor="middle" className={`zz-tick${recent ? ' zz-strong' : ''}`}>{recent ? '최근 7일' : `${md(wk[0].date)}~`}</text>
          </g> })}
        <line x1={L} x2={w} y1={Y(0)} y2={Y(0)} className="zz-axis" />
      </svg>
    </div>
  )
}

/** 날짜(또는 과목)마다 한 줄: 위 회색 = 기준(같은 요일 평소·계획), 아래 = 실제. 두 막대는 겹치지 않고 위아래로, 실제 값은 막대 끝에.
 * 기준 이름은 기준이 있는 첫 줄 회색 막대 끝 위에 한 번만 적는다(범례 없이, 값 글자와 다른 높이). 결석·예정 없음 줄은 막대 대신 그 말을 적는다 */
function PairRows({ rows, baseWord, label }: { rows: { key: string; head: ReactNode; base: number | null; val: number | null; flag: boolean; off?: string; offFlag?: boolean; tip: string }[]; baseWord: string; label: string }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const top = Math.max(60, ...rows.flatMap((r) => [r.base ?? 0, r.val ?? 0]))
  const L = 92, R = 120, RH = 34, T = 18, H = T + RH * rows.length + 6, X = (v: number) => L + (Math.min(v, top) / top) * (w - L - R)
  const firstBase = rows.findIndex((r) => r.base !== null && r.base > 0)
  return (
    <div ref={ref} className="zz-plot">
      <svg width={w} height={H} role="img" aria-label={label}>
        {rows.map((r, i) => { const y0 = T + RH * i
          return <g key={r.key} tabIndex={0} data-tip={r.tip} aria-label={r.tip}>
            {/* 줄 경계: 한 날짜(과목)의 기준·실제 짝을 한 묶음으로 읽히게 */}
            {i > 0 && <line x1={8} x2={w - 8} y1={y0 - 1} y2={y0 - 1} className="zz-grid" />}
            <text x={L - 12} y={y0 + 21} textAnchor="end" className={`zz-tick zz-strong${r.offFlag ? ' zz-flag' : ''}`}>{r.head}</text>
            {r.base !== null && r.base > 0 && <rect x={L} y={y0 + 4} width={X(r.base) - L} height={10} rx={4} className="zz-base" />}
            {i === firstBase && <text x={X(r.base!)} y={y0 + 1} textAnchor="end" className="zz-tick zz-small">{baseWord}</text>}
            {r.val !== null && <><rect x={L} y={y0 + 17} width={Math.max(r.val ? 3 : 0, X(r.val) - L)} height={10} rx={4} className={r.flag ? 'zz-bar-flag' : 'zz-bar'} />
              <text x={X(r.val) + 8} y={y0 + 28} className={`zz-tick${r.flag ? ' zz-flag' : ' zz-strong'}`}>{hm(r.val)}</text></>}
            {r.val === null && r.off && <text x={L} y={y0 + 27} className={`zz-tick${r.offFlag ? ' zz-flag' : ''}`}>{r.off}</text>}
          </g> })}
      </svg>
    </div>
  )
}

/** 최근 7일 날짜별 공부(같은 요일 평소와) 또는 계획·실제 */
export function DayFill({ s, kind, th }: { s: CareRow; kind: 'study' | 'plan'; th: { drop: number; rate: number } }) {
  const sigStudy = has(s, 'STUDY_DROP'), sigPlan = has(s, 'EXECUTION_GAP')
  const rows = s.days.map((d) => {
    const head = `${md(d.date)} ${d.dow}`, off = d.attendance === 'present' ? (kind === 'plan' && !(d.planned ?? 0) ? '계획 없음' : undefined) : (d.attendance === 'off' ? '예정 없음' : STATE[d.attendance])
    if (kind === 'study') { const val = d.attendance === 'present' ? d.minutes : null
      return { key: d.date, head, base: d.usualMinutes, val, flag: sigStudy && dropDay(d, th.drop), off, offFlag: d.attendance === 'absent', tip: `${head} · ${val !== null ? `공부 ${hm(val)}` : off}${d.usualMinutes ? ` · 같은 요일 평소 ${hm(d.usualMinutes)}` : ''}` } }
    const p = d.planned ?? 0, val = p > 0 ? d.actual ?? 0 : null
    return { key: d.date, head, base: p > 0 ? p : null, val, flag: sigPlan && p > 0 && ((d.actual ?? 0) / p) * 100 < th.rate, off, offFlag: d.attendance === 'absent', tip: `${head} · ${val !== null ? `계획 ${hm(p)} · 실제 ${hm(val)}` : off}` }
  })
  return <PairRows rows={rows} baseWord={kind === 'study' ? '평소' : '계획'} label={kind === 'study' ? '최근 7일 공부 시간과 같은 요일 평소' : '최근 7일 계획 시간과 실제 시간'} />
}

interface StartCol { key: string; usual: number | null; start: number | null; late: boolean; tip: string; axis: (x: number) => ReactNode }
/** 입실 시각: 칸마다 평소(회색 눈금)와 입실(점), 늦은 만큼 세로 선. '평소'는 마지막 평소 눈금 오른쪽에 한 번 */
function StartCols({ cols, label }: { cols: StartCol[]; label: string }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const vals = cols.flatMap((c) => [c.start, c.usual].filter((v): v is number => v !== null))
  const [lo, hi] = clockDomain(vals.length ? vals : [18 * 60], 20)
  const H = 264, L = 56, R = 40, T = 22, B = 60, cw = (w - L - R) / cols.length, Y = (m: number) => T + (1 - (m - lo) / (hi - lo)) * (H - T - B)
  const step = hi - lo > 300 ? 120 : 60, ticks = Array.from({ length: Math.floor((hi - lo) / step) + 1 }, (_, k) => lo + k * step)
  const lastUsual = cols.map((c) => c.usual !== null).lastIndexOf(true)
  return (
    <div ref={ref} className="zz-plot">
      <svg width={w} height={H} role="img" aria-label={label}>
        {ticks.map((t) => <g key={t}><line x1={L} x2={w - R} y1={Y(t)} y2={Y(t)} className="zz-grid" /><text x={L - 8} y={Y(t) + 4} textAnchor="end" className="zz-tick">{clockTick(t)}</text></g>)}
        {cols.map((c, i) => { const cx = L + cw * (i + 0.5), tw = Math.min(24, cw * 0.32)
          return <g key={c.key} tabIndex={0} data-tip={c.tip} aria-label={c.tip}>
            {c.usual !== null && <rect x={cx - tw} y={Y(c.usual) - 3} width={tw * 2} height={6} rx={3} className="zz-usual" />}
            {i === lastUsual && <text x={cx + tw + 6} y={Y(c.usual!) + 4} className="zz-tick zz-small">평소</text>}
            {c.start !== null && c.usual !== null && <line x1={cx} x2={cx} y1={Y(c.usual)} y2={Y(c.start)} className={c.late ? 'zz-gap-flag' : 'zz-gap'} />}
            {c.start !== null && <circle cx={cx} cy={Y(c.start)} r={6} className={c.late ? 'zz-dot-flag' : 'zz-dot'} />}
            {c.axis(cx)}
          </g> })}
      </svg>
    </div>
  )
}

/** 최근 7일 입실 시각(같은 요일 평소와) */
export function DayStart({ s, th }: { s: CareRow; th: { shift: number } }) {
  const sig = has(s, 'START_TIME_SHIFT')
  return <StartCols label="최근 7일 입실 시각과 같은 요일 평소" cols={s.days.map((d) => { const came = d.attendance === 'present' && d.start !== null
    return { key: d.date, usual: d.usualStart, start: came ? d.start : null, late: sig && lateDay(d, th.shift), tip: `${md(d.date)} ${d.dow} · ${came ? `입실 ${clock(d.start!)}` : STATE[d.attendance]}${d.usualStart !== null ? ` · 같은 요일 평소 ${clock(d.usualStart)}` : ''}`, axis: (x: number) => <DayAxis d={d} x={x} y={222} /> } })} />
}
/** 최근 5주 주별 입실 시각 평균(입실한 날만)과 같은 날들의 평소 평균 */
export function WeekStart({ s, th }: { s: CareRow; th: { shift: number } }) {
  const sig = has(s, 'START_TIME_SHIFT')
  const mean = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
  return <StartCols label="최근 5주 주별 평균 입실 시각과 평소" cols={weeksOf(s).map((wk, g) => {
    const came = wk.filter((d) => d.attendance === 'present' && d.start !== null)
    const start = mean(came.map((d) => d.start!)), usual = mean(came.flatMap((d) => d.usualStart === null ? [] : [d.usualStart]))
    const label = g === 4 ? '최근 7일' : `${md(wk[0].date)}~`, none = wk.every((d) => d.attendance === 'unknown')
    return { key: wk[0].date, usual, start, late: g === 4 && sig && start !== null && usual !== null && start - usual >= th.shift,
      tip: `${label} · ${start !== null ? `입실 평균 ${clock(start)}` : none ? '기록 없음' : '입실한 날 없음'}${usual !== null ? ` · 평소 ${clock(usual)}` : ''}`,
      axis: (x: number) => <><text x={x} y={222} textAnchor="middle" className={`zz-tick${g === 4 ? ' zz-strong' : ''}`}>{label}</text>{(none || start === null) && <text x={x} y={238} textAnchor="middle" className="zz-tick zz-small">{none ? '기록 없음' : '입실 없음'}</text>}</> }
  })} />
}

/** 최근 5주 주별 공부(지난 4주 평균과) 또는 계획·실제 합 */
export function WeekFill({ s, kind, th }: { s: CareRow; kind: 'study' | 'plan'; th: { drop: number; rate: number } }) {
  const sig = has(s, kind === 'study' ? 'STUDY_DROP' : 'EXECUTION_GAP')
  const weeks = weeksOf(s), known = weeks.map((wk) => wk.some((d) => d.attendance !== 'unknown'))
  const sum = weeks.map((wk, g) => known[g] ? wk.reduce((a, d) => a + (d.attendance === 'present' && d.minutes ? d.minutes : 0), 0) : null)
  const past = sum.slice(0, 4).filter((v): v is number => v !== null), avg = past.length ? past.reduce((a, b) => a + b, 0) / past.length : null
  const rows = weeks.map((wk, g) => {
    const head = g === 4 ? '최근 7일' : `${md(wk[0].date)}~`
    if (!known[g]) return { key: wk[0].date, head, base: null, val: null, flag: false, off: '기록 없음', tip: `${head} · 기록 없음` }
    if (kind === 'study') return { key: wk[0].date, head, base: avg, val: sum[g], flag: g === 4 && sig && avg !== null && avg > 0 && 100 - (sum[g]! / avg) * 100 >= th.drop, tip: `${head} · 공부 ${hm(sum[g]!)}${avg !== null ? ` · 지난 4주 한 주 평균 ${hm(avg)}` : ''}` }
    const p = wk.reduce((a, d) => a + (d.planned ?? 0), 0), a = wk.reduce((x, d) => x + (d.planned ? d.actual ?? 0 : 0), 0)
    return { key: wk[0].date, head, base: p || null, val: p ? a : null, flag: g === 4 && sig && p > 0 && (a / p) * 100 < th.rate, off: p ? undefined : '계획 없음', tip: `${head} · ${p ? `계획 ${hm(p)} · 실제 ${hm(a)}` : '계획 없음'}` }
  })
  return <PairRows rows={rows} baseWord={kind === 'study' ? '4주 평균' : '계획'} label={kind === 'study' ? '최근 5주 주별 공부 시간과 지난 4주 평균' : '최근 5주 주별 계획 시간과 실제 시간'} />
}

/** 과목별 계획·실제(최근 7일) */
export function SubjectFill({ s, th }: { s: CareRow; th: { rate: number } }) {
  const subs = s.subjects.filter((x) => x.plannedMinutes > 0).sort((a, b) => b.plannedMinutes - a.plannedMinutes)
  if (!subs.length) return null
  const sig = has(s, 'EXECUTION_GAP') || has(s, 'SUBJECT_SHARE')
  return <PairRows rows={subs.map((x) => ({ key: x.name, head: x.name, base: x.plannedMinutes, val: x.actualMinutes, flag: sig && (x.actualMinutes / x.plannedMinutes) * 100 < th.rate, tip: `${x.name} · 계획 ${hm(x.plannedMinutes)} · 실제 ${hm(x.actualMinutes)}` }))} baseWord="계획" label="최근 7일 과목별 계획 시간과 실제 시간" />
}
