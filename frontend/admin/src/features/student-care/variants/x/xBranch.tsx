// X 학습관별 페이지(R01): 학습관 전체 학생의 경향을 원본 콘솔 카드 짜임으로 본다. X 전용 코드.
// 카드마다 날짜(최근 7일) 또는 주(최근 5주) 칸의 막대. 막대를 누르면 그 칸에 해당하는 학생이 카드 안에 펼쳐지고(G27·G29),
// 이름을 누르면 학생별 상세로 간다. 판정 이름은 서버 사유 이름 그대로, 빨강은 쓰지 않는다(이 화면은 판정이 아니라 경향).
import { useMemo, useState } from 'react'
import type { CareRow } from '../shared/useCareData.ts'
import { md } from '../shared/useCareData.ts'
import { useWidth } from '../z/useWidth.ts'
import { eventDate, SUP_LABEL, type SupState } from '../supervisor/supervisorClient.ts'
import { hm, weeksOf } from '../notation/kit.tsx'
import { ViewSwitch, type Period } from './xSwitch.tsx'

type Day = CareRow['days'][number]
interface Member { r: CareRow; text: string; sort: number }
interface Cell { key: string; line1: string; line2?: string; value: number | null; base?: number | null; text: string; members: Member[]; tip: string }
interface Th { drop: number; shift: number; rate: number }

const signalLabel = (rows: CareRow[], types: string[], fallback: string) => rows.flatMap((r) => r.signals).find((x) => types.includes(x.type))?.label ?? fallback

/** 칸 나누기: 일간은 날짜 7칸(학생마다 같은 날짜 순서), 주간은 5주 */
function slots(rows: CareRow[], period: Period): { key: string; line1: string; line2?: string; pick: (r: CareRow) => Day[] }[] {
  const first = rows[0]
  if (!first) return []
  if (period === 'd') return first.days.map((d, i) => ({ key: d.date, line1: md(d.date), line2: d.dow, pick: (r) => [r.days[i]].filter(Boolean) }))
  return weeksOf(first).map((wk, g) => ({ key: wk[0].date, line1: g === 4 ? '최근 7일' : `${md(wk[0].date)}~`, pick: (r) => weeksOf(r)[g] ?? [] }))
}

/** 카드 그림: 막대(값) + 선택적 기준 눈금. 칸을 누르면 고른다 */
function Bars({ cells, unit, picked, onPick, label }: { cells: Cell[]; unit: (v: number) => string; picked: string | null; onPick: (c: Cell) => void; label: string }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const n = cells.length, L = 52, R = 40, cw = (w - L - R) / Math.max(1, n), bw = Math.min(30, cw * 0.42)
  const top = Math.max(1, ...cells.flatMap((c) => [c.value ?? 0, c.base ?? 0])) * 1.15
  const T = 24, B = 44, H = 220, y = (v: number) => T + (1 - v / top) * (H - T - B)
  const ticks = [0, top / 2, top].map((t) => Math.round(t))
  const lastBase = cells.map((c) => c.base != null).lastIndexOf(true)
  return (
    <div ref={ref} className="xn-plot">
      <svg width={w} height={H} role="img" aria-label={label}>
        {ticks.map((t, i) => <g key={i}><line x1={L} x2={w - R} y1={y(t)} y2={y(t)} className="xn-grid" /><text x={L - 8} y={y(t) + 4} textAnchor="end" className="xn-tick">{unit(t)}</text></g>)}
        {cells.map((c, i) => {
          const cx = L + cw * (i + 0.5), on = picked === c.key, can = c.members.length > 0
          const go = () => onPick(c)
          return <g key={c.key} tabIndex={0} data-tip={c.tip} aria-label={c.tip} className={can ? 'xp-pick' : undefined} onClick={can ? go : undefined} onKeyDown={can ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go() } } : undefined}>
            <rect x={L + cw * i} y={T - 18} width={cw} height={H - T - B + 18} className={on ? 'xn-hit xp-on' : 'xn-hit'} />
            {c.value !== null && <rect x={cx - bw / 2} y={y(c.value)} width={bw} height={Math.max(c.value ? 2 : 0, y(0) - y(c.value))} rx={3} className="xp-now" />}
            {c.base != null && <rect x={cx - bw / 2 - 6} y={y(c.base) - 1.5} width={bw + 12} height={3} rx={1.5} className="xp-tick-base" />}
            {i === lastBase && <text x={cx + bw / 2 + 10} y={y(c.base!) + 4} className="xn-tick xn-small xn-halo">평소</text>}
            <text x={cx} y={(c.value === null ? y(0) : Math.min(y(c.value), c.base != null ? y(c.base) - 2 : y(c.value))) - 7} textAnchor="middle" className="xn-tick xn-small xn-halo xn-strong">{c.text}</text>
            <text x={cx} y={H - B + 18} textAnchor="middle" className="xn-tick xn-strong">{c.line1}</text>
            {c.line2 && <text x={cx} y={H - B + 34} textAnchor="middle" className="xn-tick">{c.line2}</text>}
          </g>
        })}
        <line x1={L} x2={w - R} y1={y(0)} y2={y(0)} className="xn-axis" />
      </svg>
    </div>
  )
}

function Card({ title, sub, cells, unit, onStudent, label, empty }: { title: string; sub: string; cells: Cell[]; unit: (v: number) => string; onStudent: (id: string) => void; label: string; empty: string }) {
  const [picked, setPicked] = useState<string | null>(null)
  const cell = cells.find((c) => c.key === picked) ?? null
  return (
    <section className="xb-card" aria-label={title}>
      <header><h3>{title}</h3><p>{sub}</p></header>
      <Bars cells={cells} unit={unit} picked={picked} onPick={(c) => setPicked(picked === c.key ? null : c.key)} label={label} />
      {cell ? <div className="xb-list">
        <p><b>{cell.line1}{cell.line2 ? ` ${cell.line2}` : ''}</b> {cell.members.length}명 <button type="button" className="xe-more" onClick={() => setPicked(null)}>접기</button></p>
        <ul>{[...cell.members].sort((a, b) => b.sort - a.sort).map((m) => <li key={m.r.student.studentId}><button type="button" onClick={() => onStudent(m.r.student.studentId)}><b>{m.r.student.studentName}</b><span>{m.r.student.className}</span></button><em>{m.text}</em></li>)}</ul>
      </div> : <p className="xb-hint">{cells.some((c) => c.members.length) ? '막대를 누르면 그 칸의 학생이 나옵니다' : empty}</p>}
    </section>
  )
}

export function XBranch({ rows, sup, th, onStudent }: { rows: CareRow[]; sup: SupState; th: Th; onStudent: (id: string) => void }) {
  const [period, setPeriod] = useState<Period>('d')
  const evBy = sup.status === 'ready' ? sup.byStudent : null
  const cards = useMemo(() => {
    const ss = slots(rows, period)
    const label = (x: { line1: string; line2?: string }) => `${x.line1}${x.line2 ? ` ${x.line2}` : ''}`
    const count = (f: (d: Day) => boolean, text: (k: number) => string) => ss.map((x) => {
      const members = rows.flatMap((r) => { const k = x.pick(r).filter(f).length; return k ? [{ r, text: text(k), sort: k }] : [] })
      return { key: x.key, line1: x.line1, line2: x.line2, value: members.length, text: `${members.length}명`, members, tip: `${label(x)} · ${members.length}명` }
    })
    const absent = count((d) => d.attendance === 'absent', (k) => period === 'd' ? '결석' : `결석 ${k}일`)
    const missing = count((d) => d.submission === 'missing', (k) => period === 'd' ? '미제출' : `미제출 ${k}일`)
    const late = count((d) => d.attendance === 'present' && d.start !== null && d.usualStart !== null && d.start - d.usualStart >= th.shift, (k) => period === 'd' ? '늦음' : `늦은 날 ${k}일`)
    // 공부 시간: 그 칸에 입실한 학생의 하루 평균과, 같은 학생들의 같은 요일 평소 평균(일간). 평소보다 기준 이상 준 학생을 펼친다
    const study: Cell[] = ss.map((x) => {
      const ds = rows.flatMap((r) => x.pick(r).filter((d) => d.attendance === 'present' && d.minutes !== null).map((d) => ({ r, d })))
      const avg = ds.length ? ds.reduce((a, { d }) => a + d.minutes!, 0) / ds.length : null
      const us = ds.filter(({ d }) => d.usualMinutes), base = period === 'd' && us.length ? us.reduce((a, { d }) => a + d.usualMinutes!, 0) / us.length : null
      const by = new Map<CareRow, { m: number; u: number }>()
      for (const { r, d } of us) { const o = by.get(r) ?? { m: 0, u: 0 }; o.m += d.minutes!; o.u += d.usualMinutes!; by.set(r, o) }
      const members = [...by.entries()].flatMap(([r, o]) => { const drop = 100 - (o.m / o.u) * 100; return drop >= th.drop ? [{ r, text: `평소보다 ${Math.round(drop)}% 적게`, sort: drop }] : [] })
      return { key: x.key, line1: x.line1, line2: x.line2, value: avg, base, text: avg === null ? '–' : hm(avg), members, tip: `${label(x)} · 입실한 학생 ${ds.length}명 하루 평균 ${avg === null ? '없음' : hm(avg)}${base !== null ? ` · 같은 요일 평소 ${hm(base)}` : ''} · 평소보다 ${th.drop}% 이상 적은 학생 ${members.length}명` }
    })
    // 계획: 계획을 낸 학생의 실제 ÷ 계획(합). 기준보다 낮은 학생을 펼친다
    const plan: Cell[] = ss.map((x) => {
      const per = rows.flatMap((r) => { const ds = x.pick(r).filter((d) => (d.planned ?? 0) > 0); if (!ds.length) return []; const p = ds.reduce((a, d) => a + d.planned!, 0), a = ds.reduce((s, d) => s + (d.actual ?? 0), 0); return [{ r, p, a }] })
      const p = per.reduce((s, o) => s + o.p, 0), a = per.reduce((s, o) => s + o.a, 0), rate = p ? (a / p) * 100 : null
      const members = per.flatMap((o) => { const v = (o.a / o.p) * 100; return v < th.rate ? [{ r: o.r, text: `계획의 ${Math.floor(v)}%`, sort: 100 - v }] : [] })
      return { key: x.key, line1: x.line1, line2: x.line2, value: rate, text: rate === null ? '–' : `${Math.floor(rate)}%`, members, tip: `${label(x)} · 계획 낸 학생 ${per.length}명 · 실제 ÷ 계획 ${rate === null ? '없음' : `${Math.floor(rate)}%`} · ${th.rate}% 미만 ${members.length}명` }
    })
    const vision: Cell[] | null = evBy && ss.map((x) => {
      const members = rows.flatMap((r) => { const set = new Set(x.pick(r).map((d) => d.date)); const evs = (evBy.get(r.student.studentId) ?? []).filter((e) => set.has(eventDate(e))); if (!evs.length) return []; const kinds = [...new Set(evs.map((e) => SUP_LABEL[e.reason]))].join('·'); return [{ r, text: `${evs.length}건 · ${kinds}`, sort: evs.length }] })
      const total = members.reduce((s, m) => s + m.sort, 0)
      return { key: x.key, line1: x.line1, line2: x.line2, value: total, text: `${total}건`, members, tip: `${label(x)} · 비몰입 ${total}건 · ${members.length}명` }
    })
    return { absent, missing, late, study, plan, vision }
  }, [rows, period, th, evBy])
  const n = (v: number) => `${v}`
  const reasons = useMemo(() => { const m = new Map<string, number>(); for (const r of rows) for (const x of r.signals) m.set(x.label, (m.get(x.label) ?? 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]) }, [rows])
  return (
    <div className="xb">
      <section className="xb-head" aria-label="학습관 요약">
        <p><b>전체 {rows.length}명</b>{reasons.map(([l, k]) => <span key={l}>{l} <b>{k}명</b></span>)}</p>
        <ViewSwitch value={period} onChange={setPeriod} title="날짜별 · 최근 7일" titleW="주별 · 최근 5주" daily={null} weekly={null} className="xb-switch" />
      </section>
      <div className="xb-grid">
        <Card title={signalLabel(rows, ['CONSECUTIVE_ABSENCE', 'WEEKDAY_ABSENCE'], '미입실')} sub={period === 'd' ? '날짜별 결석한 학생 수' : '주별 한 번 이상 결석한 학생 수'} cells={cards.absent} unit={(v) => `${v}명`} onStudent={onStudent} label="결석한 학생 수" empty="결석한 학생 없음" />
        <Card title={signalLabel(rows, ['PLAN_MISSING'], '계획 미제출')} sub={period === 'd' ? '날짜별 계획을 내지 않은 학생 수' : '주별 한 번 이상 계획을 내지 않은 학생 수'} cells={cards.missing} unit={(v) => `${v}명`} onStudent={onStudent} label="계획 미제출 학생 수" empty="계획을 내지 않은 학생 없음" />
        <Card title="공부 시간" sub={period === 'd' ? '입실한 학생의 하루 평균 · 눈금은 같은 학생들의 같은 요일 평소' : '입실한 날 하루 평균'} cells={cards.study} unit={(v) => `${Math.round(v / 60)}시간`} onStudent={onStudent} label="학습관 하루 평균 공부 시간" empty="평소보다 크게 준 학생 없음" />
        <Card title={signalLabel(rows, ['START_TIME_SHIFT'], '등원 시간 늦어짐')} sub={`평소보다 ${th.shift}분 이상 늦게 입실한 학생 수`} cells={cards.late} unit={(v) => `${v}명`} onStudent={onStudent} label="늦게 입실한 학생 수" empty="늦게 입실한 학생 없음" />
        <Card title={signalLabel(rows, ['EXECUTION_GAP'], '계획 미달성')} sub="계획을 낸 학생 전체의 실제 ÷ 계획" cells={cards.plan} unit={(v) => `${v}%`} onStudent={onStudent} label="계획 대비 실제" empty="계획보다 크게 모자란 학생 없음" />
        {cards.vision ? <Card title="비몰입(사진 관찰)" sub="비몰입 건수 · 휴대폰 사용·엎드림·자리 비움" cells={cards.vision} unit={n} onStudent={onStudent} label="비몰입 건수" empty="비몰입 없음" />
          : <section className="xb-card"><header><h3>비몰입(사진 관찰)</h3></header><p className="x-muted">{sup.status === 'error' ? '사진 관찰 서버에 연결하지 못했습니다' : '불러오는 중'}</p></section>}
      </div>
    </div>
  )
}
