// 시안 X′ 학습관별. 한 행에 지표 하나(x-handoff.md 4장).
// - 맨 위: 서버가 정한 관리 사유별 학생 수(누르면 학생별 명단을 그 사유로 거른다). 화면이 다시 센 수와 섞지 않는다.
// - 행마다 제목은 화면이 센 것의 이름 그대로(서버 사유 이름을 빌리지 않는다). 막대를 누르면 그 칸의 학생이 행 안에 펼쳐지고,
//   이름을 누르면 학생 겹창이 열린다.
// - 공부 시간은 학습관 평균이 아니라 학생별 변화량: 평소보다 늘어난 학생(위)·줄어든 학생(아래) 수.
// - 평소 값이 없는 칸(주별 첫 주 등)은 0이 아니라 '평소 값 없음'.
import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import type { CareRow } from '../shared/useCareData.ts'
import { useWidth } from '../z/useWidth.ts'
import { eventDate, type SupState } from '../supervisor/supervisorClient.ts'
import { hm } from '../notation/kit.tsx'
import { rateText, slotsOf, usualStartAt, visionIn, type Day, type Period, type Slot } from './x2Model.ts'
import { Key } from './x2Charts.tsx'

interface Member { r: CareRow; text: string; sort: number; up?: boolean }
interface Cell { key: string; line1: string; line2?: string; value: number | null; up?: number; down?: number; label: string; members: Member[]; aria: string }
interface Th { drop: number; shift: number; rate: number }

/** 학습관 칸: 첫 학생의 날짜 순서로 칸을 나누고, 학생마다 같은 번호의 날을 고른다 */
function grid(rows: CareRow[], period: Period): Slot[] { return rows[0] ? slotsOf(rows[0], period) : [] }
const pick = (r: CareRow, sl: Slot, period: Period) => slotsOf(r, period).find((x) => x.key === sl.key)?.days ?? []

/** 보기 좋은 눈금: 1·2·5 배수 간격, 눈금 4개 안팎 */
function nice(max: number, floor = 4) {
  const m = Math.max(floor, max), step = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500].find((x) => m / x <= 4) ?? 1000
  const top = Math.ceil(m / step) * step
  return { top, ticks: Array.from({ length: top / step + 1 }, (_, k) => k * step) }
}

type Side = 'up' | 'down'

function Bars({ cells, unit, picked, onPick, label, diverge, percent }: { cells: Cell[]; unit: (v: number) => string; picked: string | null; onPick: (c: Cell, side?: Side) => void; label: string; diverge?: boolean; percent?: boolean }) {
  const [hov, setHov] = useState<number | null>(null)
  const [ref, w] = useWidth<HTMLDivElement>()
  const n = cells.length, L = 52, R = 8, cw = (w - L - R) / Math.max(1, n), bw = Math.min(44, cw * 0.4)
  const H = diverge ? 240 : 200, T = 30, B = 46
  const sc = percent ? nice(Math.max(100, ...cells.map((c) => c.value ?? 0)), 100) : nice(Math.max(...cells.flatMap((c) => diverge ? [c.up ?? 0, c.down ?? 0] : [c.value ?? 0])))
  const top = sc.top
  const zero = diverge ? T + (H - T - B) / 2 : H - B
  const y = (v: number) => diverge ? zero - (v / top) * ((H - T - B) / 2) : T + (1 - v / top) * (H - T - B)
  const ticks = diverge ? [top, 0, -top] : sc.ticks
  return (
    <div ref={ref} className="x2c-plot">
      <svg width={w} height={H} role="img" aria-label={label}>
        {hov !== null && <rect x={L + cw * hov + 2} y={4} width={cw - 4} height={H - 4 - B + 40} rx={6} className="x2-bg" />}
        {(() => { const [k, side] = (picked ?? '').split('|'), h = cells.findIndex((c) => c.key === k); if (h < 0) return null
          // 공부 시간 변화: 누른 쪽(늘어남 위 / 줄어듦 아래) 반만 칠한다
          return side ? <rect x={L + cw * h + 2} y={side === 'up' ? 4 : zero} width={cw - 4} height={side === 'up' ? zero - 4 : H - 4 - B + 40 - (zero - 4)} rx={6} className="x2-bg x2-bg-on" />
            : <rect x={L + cw * h + 2} y={4} width={cw - 4} height={H - 4 - B + 40} rx={6} className="x2-bg x2-bg-on" /> })()}
        {ticks.map((t, i) => <g key={i}><line x1={L} x2={w - R} y1={y(t)} y2={y(t)} className="x2c-grid" /><text x={L - 8} y={y(t) + 4} textAnchor="end" className="x2c-axis-text">{unit(Math.abs(t))}</text></g>)}
        {cells.map((c, i) => {
          const cx = L + cw * (i + 0.5), can = !diverge && c.members.length > 0, on = picked === c.key
          const press = (side?: Side) => ({ tabIndex: 0, role: 'button', onClick: () => onPick(c, side), onKeyDown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(c, side) } } })
          return <g key={c.key} className={can ? 'x2c-col x2c-can' : 'x2c-col'} {...(can ? press() : {})} aria-pressed={can ? on : undefined} aria-label={diverge ? undefined : c.aria} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}>
            {diverge ? <>
              {/* 위(늘어난 학생)·아래(줄어든 학생)를 따로 누른다 */}
              <rect x={L + cw * i + 2} y={4} width={cw - 4} height={zero - 4} className={c.up ? 'x2-hit x2c-can' : 'x2-hit'} {...(c.up ? { ...press('up'), 'aria-pressed': picked === `${c.key}|up`, 'aria-label': `${c.line1} 늘어난 학생 ${c.up}명` } : {})} />
              <rect x={L + cw * i + 2} y={zero} width={cw - 4} height={H - 4 - B + 40 - (zero - 4)} className={c.down ? 'x2-hit x2c-can' : 'x2-hit'} {...(c.down ? { ...press('down'), 'aria-pressed': picked === `${c.key}|down`, 'aria-label': `${c.line1} 줄어든 학생 ${c.down}명` } : {})} />
            </> : <rect x={L + cw * i + 2} y={4} width={cw - 4} height={H - 4 - B + 40} rx={6} className="x2-hit" />}
            {diverge ? <>
              {c.up ? <rect x={cx - bw / 2} y={y(c.up)} width={bw} height={zero - y(c.up)} rx={3} className="x2c-bar" pointerEvents="none" /> : null}
              {c.down ? <rect x={cx - bw / 2} y={zero} width={bw} height={y(-c.down) - zero} rx={3} className="x2c-bar x2c-down" pointerEvents="none" /> : null}
              {c.value !== null && c.up ? <text x={cx} y={y(c.up) - 6} textAnchor="middle" pointerEvents="none" className="x2c-val2">{c.up}명</text> : null}
              {c.value !== null && c.down ? <text x={cx} y={y(-c.down) + 14} textAnchor="middle" pointerEvents="none" className="x2c-val2">{c.down}명</text> : null}
              {c.label && <text x={cx} y={T - 12} textAnchor="middle" className="x2c-val">{c.label}</text>}
            </> : <>
              {c.value !== null && <rect x={cx - bw / 2} y={y(c.value)} width={bw} height={Math.max(c.value ? 2 : 0, zero - y(c.value))} rx={3} className="x2c-bar" />}
              <text x={cx} y={(c.value === null ? zero : y(c.value)) - 8} textAnchor="middle" className={c.value === null ? 'x2c-val2' : 'x2c-val'}>{c.label}</text>
            </>}
            <text x={cx} y={H - B + 18} textAnchor="middle" className="x2c-x">{c.line1}</text>
            {c.line2 && <text x={cx} y={H - B + 35} textAnchor="middle" className="x2c-x2">{c.line2}</text>}
          </g>
        })}
        <line x1={L} x2={w - R} y1={zero} y2={zero} className="x2c-base" />
      </svg>
    </div>
  )
}

function Row({ title, sub, legend, cells, unit, label, empty, diverge, percent, onStudent }: { title: string; sub: string; legend?: ReactNode; cells: Cell[]; unit: (v: number) => string; label: string; empty: string; diverge?: boolean; percent?: boolean; onStudent: (r: CareRow, list: CareRow[]) => void }) {
  const [picked, setPicked] = useState<string | null>(null)
  const [pk, side] = (picked ?? '').split('|')
  const cell = cells.find((c) => c.key === pk) ?? null
  const members = cell ? [...cell.members].filter((m) => !side || m.up === (side === 'up')).sort((a, b) => b.sort - a.sort) : []
  const any = cells.some((c) => c.members.length)
  return (
    <section className="x2b-row" aria-label={title}>
      <header className="x2f-head">
        <h3>{title}</h3>
        {sub && <p className="x2f-note">{sub}</p>}
        {legend && <p className="x2f-legend">{legend}</p>}
      </header>
      <Bars cells={cells} unit={unit} picked={picked} onPick={(c, sd) => { const k = sd ? `${c.key}|${sd}` : c.key; setPicked(picked === k ? null : k) }} label={label} diverge={diverge} percent={percent} />
      {cell ? <div className="x2b-list">
        <p><b>{cell.line1}{cell.line2 ? ` ${cell.line2}` : ''}</b> {side ? (side === 'up' ? '늘어난 학생 ' : '줄어든 학생 ') : ''}{members.length}명 <button type="button" className="x2-link" onClick={() => setPicked(null)}>접기</button></p>
        {/* 공부 시간 변화는 줄어든 학생과 늘어난 학생을 나눠 보인다(1회차 검토: 섞여 나와 줄어든 학생을 못 찾았다) */}
        {(!side && members.some((m) => m.up !== undefined) ? [['줄어든 학생', members.filter((m) => m.up === false)], ['늘어난 학생', members.filter((m) => m.up === true)]] as [string, Member[]][] : [['', members]] as [string, Member[]][]).map(([h, ms]) => ms.length > 0 && <div key={h} className="x2b-group">
          {h && <h4>{h} {ms.length}명</h4>}
          <ul>{ms.map((m) => <li key={m.r.student.studentId}><button type="button" onClick={() => onStudent(m.r, ms.map((x) => x.r))}><b>{m.r.student.studentName}</b><span>{m.r.student.className}</span><em className={m.up === false ? 'x2b-down' : undefined}>{m.text}</em></button></li>)}</ul>
        </div>)}
      </div> : <p className="x2b-hint">{any ? diverge ? '위·아래 막대를 누르면 늘어난·줄어든 학생이 나옵니다' : '막대를 누르면 그 칸의 학생 목록이 나옵니다' : empty}</p>}
    </section>
  )
}

export function BranchX2({ rows, sup, th, perHour, period, onPeriod, onReason, onStudent }: { rows: CareRow[]; sup: SupState; th: Th; perHour: number; period: Period; onPeriod: (p: Period) => void; onReason: (label: string) => void; onStudent: (r: CareRow, list: CareRow[]) => void }) {
  const evBy = sup.status === 'ready' ? sup.byStudent : null
  const c = useMemo(() => {
    const ss = grid(rows, period)
    const lab = (x: Slot) => `${x.line1}${x.line2 ? ` ${x.line2}` : ''}`
    const count = (f: (d: Day, idx: number, r: CareRow) => boolean | null, text: (k: number) => string): Cell[] => ss.map((x) => {
      let known = false
      const members = rows.flatMap((r) => { const ds = pick(r, x, period); let k = 0; for (const { d, idx } of ds) { const v = f(d, idx, r); if (v !== null) known = true; if (v) k++ } return k ? [{ r, text: text(k), sort: k }] : [] })
      return { key: x.key, line1: x.line1, line2: x.line2, value: known ? members.length : null, label: known ? `${members.length}명` : '평소 값 없음', members, aria: `${lab(x)} ${known ? `${members.length}명` : '평소 값 없음'}` }
    })
    const absent = count((d) => d.attendance === 'absent', (k) => (period === 'd' ? '결석' : `결석 ${k}일`))
    const missing = count((d) => d.attendance === 'present' ? d.submission === 'missing' : false, (k) => (period === 'd' ? '입실, 계획 없음' : `${k}일`))
    const late = count((d, idx, r) => { if (d.attendance !== 'present' || d.start === null) return false; const u = usualStartAt(r, d, idx); return u === null ? null : d.start - u >= th.shift }, (k) => (period === 'd' ? `평소보다 ${th.shift}분 이상 늦게` : `늦은 날 ${k}일`))
    // 공부 시간 변화: 학생마다 그 칸 공부 합 − 평소(일간: 같은 요일 평소, 주별: 그 앞 주들 평균)
    const study: Cell[] = ss.map((x, g) => {
      const ch = rows.flatMap((r) => {
        const sl = slotsOf(r, period), me = sl.find((k) => k.key === x.key); if (!me) return []
        const sum = (k: Slot) => k.days.some(({ d }) => d.attendance !== 'unknown') ? k.days.reduce((a, { d }) => a + (d.attendance === 'present' && d.minutes ? d.minutes : 0), 0) : null
        const now = sum(me); if (now === null) return []
        let usual: number | null
        if (period === 'd') { const d = me.days[0].d; usual = d.attendance === 'present' ? d.usualMinutes : null }
        else { const prev = sl.slice(0, g).map(sum).filter((v): v is number => v !== null); usual = prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : null }
        return usual ? [{ r, now, usual, diff: now - usual, pct: ((now - usual) / usual) * 100 }] : []
      })
      const up = ch.filter((o) => o.pct >= th.drop), down = ch.filter((o) => o.pct <= -th.drop), net = ch.reduce((a, o) => a + o.diff, 0)
      const members = [...down, ...up].map((o) => ({ r: o.r, up: o.pct > 0, sort: Math.abs(o.pct), text: `평소 ${hm(o.usual)} → ${hm(o.now)}` }))
      // 2026-11-12 사용자: 순변화 합은 의미 없음 → 머리 글자 없이 늘어난·줄어든 학생 수만
      const label = ch.length ? '' : '평소 값 없음'
      return { key: x.key, line1: x.line1, line2: x.line2, value: ch.length ? net : null, up: up.length, down: down.length, label, members, aria: `${lab(x)} 늘어난 학생 ${up.length}명, 줄어든 학생 ${down.length}명` }
    })
    const plan: Cell[] = ss.map((x) => {
      const per = rows.flatMap((r) => { const ds = pick(r, x, period).filter(({ d }) => (d.planned ?? 0) > 0); if (!ds.length) return []; const p = ds.reduce((a, { d }) => a + d.planned!, 0), a = ds.reduce((s, { d }) => s + (d.actual ?? 0), 0); return [{ r, p, a }] })
      const p = per.reduce((s, o) => s + o.p, 0), a = per.reduce((s, o) => s + o.a, 0), rate = p ? Math.floor((a / p) * 100) : null
      const members = per.flatMap((o) => { const v = (o.a / o.p) * 100; return v < th.rate ? [{ r: o.r, text: `${hm(o.a)} / 계획 ${hm(o.p)} · ${Math.floor(v)}%`, sort: 100 - v }] : [] })
      return { key: x.key, line1: x.line1, line2: x.line2, value: rate, label: rate === null ? '계획 없음' : `${rate}%`, members, aria: `${lab(x)} 계획 달성률 ${rate ?? '없음'}%, ${th.rate}% 미만 ${members.length}명` }
    })
    const vision: Cell[] | null = evBy && ss.map((x) => {
      const members = rows.flatMap((r) => { const ds = pick(r, x, period).map(({ d }) => d); const v = visionIn(evBy.get(r.student.studentId) ?? [], ds); return v.perHour !== null && v.n > 0 && v.perHour >= perHour ? [{ r, text: `${v.n}건 · 공부 ${hm(v.minutes)}`, sort: v.perHour }] : [] })
      const n = rows.reduce((a, r) => a + (evBy.get(r.student.studentId) ?? []).filter((e) => pick(r, x, period).some(({ d }) => d.date === eventDate(e))).length, 0)
      return { key: x.key, line1: x.line1, line2: x.line2, value: members.length, label: `${members.length}명`, members, aria: `${lab(x)} 비몰입 식별 횟수 기준 초과 학생 ${members.length}명, 전체 비몰입 ${n}건` }
    })
    const seen = evBy ? rows.filter((r) => (evBy.get(r.student.studentId) ?? []).length > 0).length : 0
    return { absent, missing, late, study, plan, vision, seen }
  }, [rows, period, th, evBy, perHour])
  const reasons = useMemo(() => { const m = new Map<string, number>(); for (const r of rows) for (const x of r.signals) m.set(x.label, (m.get(x.label) ?? 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]) }, [rows])
  const people = (v: number) => `${v}명`
  return (
    <div className="x2b">
      <section className="x2b-top" aria-label="관리 사유별 학생 수">
        <h3>관리 사유별 학생 수</h3>
        <ul>{reasons.map(([l, k]) => <li key={l}><button type="button" onClick={() => onReason(l)}>{l}<b>{k}명</b></button></li>)}</ul>
      </section>
      <div className="x2b-bar">
        <div className="x2-seg" role="group" aria-label="그림 기간">
          <button type="button" aria-pressed={period === 'd'} onClick={() => onPeriod('d')}>날짜별 · 최근 7일</button>
          <button type="button" aria-pressed={period === 'w'} onClick={() => onPeriod('w')}>주별 · 최근 5주</button>
        </div>
      </div>
      <Row title="공부 시간 변화" sub={period === 'd' ? `같은 요일 평소 대비 ±${th.drop}% 이상` : `앞 주들 평균 대비 ±${th.drop}% 이상`} legend={<><Key kind="bar">늘어남</Key><Key kind="down">줄어듦</Key></>} cells={c.study} unit={people} label="학생별 공부 시간 변화" empty="평소와 크게 달라진 학생 없음" diverge onStudent={onStudent} />
      <Row title="계획 달성률" sub={`누르면 ${th.rate}% 미만 학생`} cells={c.plan} unit={(v) => `${v}%`} percent label="계획 달성률" empty="계획보다 크게 모자란 학생 없음" onStudent={onStudent} />
      <Row title="결석한 학생" sub={period === 'd' ? '예정 없는 날 제외' : '주에 한 번 이상'} cells={c.absent} unit={people} label="결석한 학생 수" empty="결석한 학생 없음" onStudent={onStudent} />
      <Row title="계획 미제출" sub={period === 'd' ? '' : '주에 한 번 이상'} cells={c.missing} unit={people} label="계획 미제출 학생 수" empty="계획 미제출 학생 없음" onStudent={onStudent} />
      <Row title="늦게 입실한 학생" sub={`같은 요일 평소보다 ${th.shift}분 이상`} cells={c.late} unit={people} label="늦게 입실한 학생 수" empty="늦게 입실한 학생 없음" onStudent={onStudent} />
      {c.vision ? <Row title="비몰입 식별 횟수 기준 초과" sub={`공부 1시간당 ${rateText(perHour)}건 이상 · 기록 있는 학생 ${c.seen}/${rows.length}명`} cells={c.vision} unit={people} label="비몰입 식별 횟수 기준 초과 학생 수" empty={c.seen ? `기록이 있는 학생 ${c.seen}명 중 기준 초과 학생 없음` : '사진 관찰 기록이 있는 학생이 없습니다'} onStudent={onStudent} />
        : <section className="x2b-row"><header className="x2f-head"><h3>비몰입 식별 횟수 기준 초과</h3></header><p className={sup.status === 'error' ? 'x2-error' : 'x2-empty'}>{sup.status === 'error' ? '사진 관찰 서버에 연결하지 못했습니다' : '불러오는 중'}</p></section>}
    </div>
  )
}



