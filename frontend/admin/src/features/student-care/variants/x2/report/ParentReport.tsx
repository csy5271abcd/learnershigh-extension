// 학부모 리포트(원본 서비스 util/daily_report 화면을 확장 쪽에 옮긴 것, 화면만). 2026-11-12 사용자: "원본 레포트를 extension report에 구현해 화면만".
// 원본과 같은 짜임: 위 밑줄 탭(데일리·주간·월간 레포트) + 날짜, 3열 어두운 칸. 여기에 신규 '생활 레포트' 탭과 선생님 코멘트 자리의 상담 첨부를 붙인다.
// 자료는 학생 케어(최근 35일 출결·입실·공부·계획)와 이미지 인식(비몰입 기록)뿐이다. 원본에만 있는 값은 이렇게 바꿔 그린다:
//  - 순공 시간 = 공부 시간 − 그날 비몰입이 이어진 시간(이미지 인식). 수업 시간은 기록이 없어 0(모두 자습).
//  - 오늘의 학습(할 일 목록) = 과목별 할 일 기록이 없어 '계획 시간 · 실제 시간' 한 줄.
//  - 공부 티어·학습 만족도 = 기록이 없어 칸은 두되 '기록 없음'.
import { useMemo, useState, type ReactElement } from 'react'
import type { CareRow } from '../../shared/useCareData.ts'
import { eventDate, eventSeconds, type SupEvent } from '../../supervisor/supervisorClient.ts'
import { LifeTab } from './LifeTab.tsx'
import './parentReport.css'

type Day = CareRow['history35'][number]
type Tab = 'daily' | 'weekly' | 'monthly' | 'life'
const DOW = ['일', '월', '화', '수', '목', '금', '토']
const pad = (n: number) => String(n).padStart(2, '0')
const dot = (date: string) => date.replaceAll('-', '. ') + '.'
const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10)
const dowOf = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay()
/** 원본 시계 글꼴 칸: 00:00:00 */
const hms = (min: number) => { const s = Math.round(min * 60); return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}` }
const hhmm = (min: number) => `${pad(Math.floor(min / 60) % 24)}:${pad(Math.round(min) % 60)}:00`

export interface Attached { id: string; text: string }

export function ParentReport({ s, ev, asOf, attached }: { s: CareRow; ev: SupEvent[]; asOf: string; attached: Attached[] }) {
  const [tab, setTab] = useState<Tab>('daily')
  const first = s.history35[0]?.date ?? asOf
  // 처음 날짜는 마지막으로 입실한 날(원본 리포트도 공부한 날의 레포트를 연다)
  const [date, setDate] = useState(() => [...s.history35].reverse().find((d) => d.attendance === 'present')?.date ?? asOf)
  const byDate = useMemo(() => new Map(s.history35.map((d) => [d.date, d])), [s])
  // 날짜별 비몰입 분(이미지 인식)
  const nonfocus = useMemo(() => { const m = new Map<string, number>(); for (const e of ev) { const k = eventDate(e); m.set(k, (m.get(k) ?? 0) + eventSeconds(e) / 60) } return m }, [ev])
  const pure = (d: Day | undefined) => (d && d.attendance === 'present' && d.minutes ? Math.max(0, d.minutes - (nonfocus.get(d.date) ?? 0)) : 0)
  const study = (d: Day | undefined) => (d && d.attendance === 'present' && d.minutes ? d.minutes : 0)
  const move = (n: number) => { const t = addDays(date, n); if (t >= first && t <= asOf) setDate(t) }

  return (
    <div className="pr">
      <header className="pr-head">
        <nav className="pr-tabs" role="tablist">
          {([['daily', '데일리 레포트'], ['weekly', '주간 레포트'], ['monthly', '월간 레포트'], ['life', '생활 레포트']] as [Tab, string][]).map(([k, l]) =>
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={k === 'life' ? 'pr-new' : undefined} onClick={() => setTab(k)}>{l}</button>)}
        </nav>
        <div className="pr-date">
          <button type="button" aria-label="이전 날짜" disabled={date <= first} onClick={() => move(-1)}>‹</button>
          <b>{dot(date)}</b>
          <button type="button" aria-label="다음 날짜" disabled={date >= asOf} onClick={() => move(1)}>›</button>
        </div>
      </header>
      {tab === 'daily' && <Daily s={s} d={byDate.get(date)} date={date} study={study} pure={pure} ev={ev} attached={attached} />}
      {tab === 'weekly' && <Weekly date={date} byDate={byDate} study={study} pure={pure} />}
      {tab === 'monthly' && <Monthly date={date} byDate={byDate} study={study} pure={pure} first={first} asOf={asOf} />}
      {tab === 'life' && <LifeTab s={s} ev={ev} date={date} />}
    </div>
  )
}

function Gauge({ pct, size = 220 }: { pct: number; size?: number }) {
  const a = Math.PI * (1 - Math.min(1, Math.max(0, pct / 100))), x = 100 + 80 * Math.cos(a), y = 96 - 80 * Math.sin(a)
  return <svg viewBox="0 0 200 110" width={size} aria-hidden="true"><path d="M20,96 A80,80 0 0 1 180,96" fill="none" stroke="#1b1c1f" strokeWidth="22" />{pct > 0 && <path d={`M20,96 A80,80 0 0 1 ${x.toFixed(1)},${y.toFixed(1)}`} fill="none" stroke="#4ef0ff" strokeWidth="22" />}</svg>
}
const Title = ({ children }: { children: string }) => <p className="pr-title">{children}</p>

function Daily({ s, d, date, study, pure, ev, attached }: { s: CareRow; d: Day | undefined; date: string; study: (d?: Day) => number; pure: (d?: Day) => number; ev: SupEvent[]; attached: Attached[] }) {
  const came = d?.attendance === 'present'
  const st = study(d), pu = pure(d), eff = st ? Math.round((pu / st) * 100) : 0
  const plan = d?.planned ?? 0, act = d?.actual ?? 0
  const todays = ev.filter((e) => eventDate(e) === date)
  return <div className="pr-grid">
    <div className="pr-col">
      <div className="pr-pills"><span>시작</span><b>{came && d?.start != null ? hhmm(d.start) : '--:--:--'}</b><i>〜</i><span>종료</span><b className="pr-dark">{came && d?.start != null ? hhmm(d.start + st) : '--:--:--'}</b></div>
      <div className="pr-todo">
        <h3>{s.student.studentName} 오늘의 학습</h3>
        <div className="pr-todo-count"><span>○ 계획 <b>{plan ? 1 : 0}</b></span><span>◎ 진행 <b>{plan && act < plan ? 1 : 0}</b></span><span className="pr-cyan">✔ 완료 <b>{plan && act >= plan ? 1 : 0}</b></span></div>
        <div className="pr-todo-list">
          {!came ? <p className="pr-none">{d?.attendance === 'absent' ? '결석한 날이에요' : d?.attendance === 'off' ? '등원 예정이 없는 날이에요' : '기록이 없어요'}</p>
            : plan ? <div className="pr-todo-row"><span className={act >= plan ? 'pr-check on' : 'pr-check'}>✔</span><div><b>오늘 계획한 공부</b><small>계획 {hms(plan)}</small></div><em>{hms(act)}</em></div>
            : <p className="pr-none">계획을 내지 않은 날이에요</p>}
        </div>
      </div>
    </div>
    <div className="pr-col"><Title>학습 시간</Title><Timeline start={came ? d?.start ?? null : null} minutes={st} events={todays} /></div>
    <div className="pr-col">
      <Title>오늘의 학습 결과</Title>
      <div className="pr-result">
        <div className="pr-clock"><span>⏳<small>공부시간</small></span><div><small>전체</small><b>{hms(st)}</b></div><div><small>자습</small><b>{hms(st)}</b></div><div><small>수업</small><b>{hms(0)}</b></div></div>
        <div className="pr-clock"><span>▣<small>순공시간</small></span><div><small>전체</small><b>{hms(pu)}</b></div><div><small>자습</small><b>{hms(pu)}</b></div><div><small>수업</small><b>{hms(0)}</b></div></div>
        <div className="pr-eff"><p>순공효율(%)</p><Gauge pct={eff} size={200} /><b>{eff}%</b></div>
      </div>
      <Title>학습 만족도와 평가</Title>
      <div className="pr-comment">
        <div className="pr-stars">☆☆☆☆☆ <small>학생 평가 기록 없음</small></div>
        <div className="pr-teacher">
          <p className="pr-teacher-h">선생님 코멘트</p>
          {attached.length ? attached.map((a) => <p key={a.id} className="pr-attach"><b>[상담]</b> {a.text}</p>) : <p className="pr-none-dark">선생님 코멘트가 없어요</p>}
        </div>
      </div>
    </div>
  </div>
}

/** 원본 '학습 시간' 칸: 6시–26시 시간 줄, 공부한 구간을 칠하고 비몰입 구간은 빨간 줄 */
function Timeline({ start, minutes, events }: { start: number | null; minutes: number; events: SupEvent[] }) {
  const H0 = 6, H1 = 26, row = 22
  const kst = (iso: string) => { const t = new Date(iso).getTime() / 60000 + 540; return ((t % 1440) + 1440) % 1440 }
  return <div className="pr-time" style={{ height: (H1 - H0 + 1) * row }}>
    {Array.from({ length: H1 - H0 + 1 }, (_, i) => <div key={i} className="pr-time-row" style={{ top: i * row, height: row }}><span>{H0 + i}</span></div>)}
    {start !== null && minutes > 0 && (() => {
      const out: ReactElement[] = []; let m = start, left = minutes
      while (left > 0) { const h = Math.floor(m / 60), into = m % 60, take = Math.min(60 - into, left), r = h - H0; if (r >= 0 && r <= H1 - H0) out.push(<i key={m} className="pr-time-on" style={{ top: r * row + 1, left: `calc(34px + (100% - 34px) * ${into / 60})`, width: `calc((100% - 34px) * ${take / 60})`, height: row - 2 }} />); m += take; left -= take }
      return out })()}
    {events.map((e) => { let m = kst(e.startedAt); if (m < H0 * 60) m += 1440; const len = Math.max(2, eventSeconds(e) / 60), r = Math.floor(m / 60) - H0; return r >= 0 && r <= H1 - H0 ? <i key={e.eventId} className="pr-time-off" title="비몰입" style={{ top: r * row + row - 5, left: `calc(34px + (100% - 34px) * ${(m % 60) / 60})`, width: `calc((100% - 34px) * ${Math.min(len, 60 - (m % 60)) / 60})` }} /> : null })}
  </div>
}

function weekOf(date: string) { const mon = addDays(date, -((dowOf(date) + 6) % 7)); return Array.from({ length: 7 }, (_, i) => addDays(mon, i)) }

function Weekly({ date, byDate, study, pure }: { date: string; byDate: Map<string, Day>; study: (d?: Day) => number; pure: (d?: Day) => number }) {
  const wk = weekOf(date), prev = weekOf(addDays(date, -7))
  const sum = (ds: string[], f: (d?: Day) => number) => ds.reduce((a, x) => a + f(byDate.get(x)), 0)
  const st = sum(wk, study), pu = sum(wk, pure), rate = st ? Math.round((pu / st) * 100) : 0
  const pst = sum(prev, study), ppu = sum(prev, pure), prate = pst ? Math.round((ppu / pst) * 100) : 0
  const plan = wk.reduce((a, x) => a + (byDate.get(x)?.planned ?? 0), 0), act = wk.reduce((a, x) => a + (byDate.get(x)?.planned ? byDate.get(x)?.actual ?? 0 : 0), 0)
  const five = [4, 3, 2, 1, 0].map((k) => { const w = weekOf(addDays(date, -7 * k)); const known = w.some((x) => byDate.has(x)); return known ? sum(w, pure) : null })
  const max = Math.max(60, ...wk.flatMap((x) => [study(byDate.get(x))]))
  return <div className="pr-grid">
    <div className="pr-col">
      <div className="pr-card pr-gauge"><Gauge pct={rate} /><div className="pr-gauge-num"><small>순공률</small><b>{rate}%</b><span>지난주 대비 <em className={rate >= prate ? 'up' : 'down'}>{rate >= prate ? '▲' : '▼'} {Math.abs(rate - prate)}%</em></span></div></div>
      <div className="pr-card pr-stamps">{wk.map((x) => { const d = byDate.get(x), today = x === date; return <div key={x}><span className={today ? 'pr-yellow' : undefined}>{DOW[dowOf(x)]}</span><i className={d?.attendance === 'present' ? (today ? 'st on today' : 'st on') : d?.attendance === 'absent' ? 'st no' : 'st'}>{d?.attendance === 'present' ? '✔' : d?.attendance === 'absent' ? '결' : d?.attendance === 'off' ? '쉼' : '–'}</i></div> })}</div>
      <div className="pr-card pr-black"><p className="pr-legend"><i className="w" />공부시간 <i className="c" />순공시간</p><div className="pr-bars">{wk.map((x) => { const d = byDate.get(x); return <div key={x}><div className="pr-pair"><i className="w" style={{ height: `${(study(d) / max) * 100}%` }} /><i className="c" style={{ height: `${(pure(d) / max) * 100}%` }} /></div><span>{DOW[dowOf(x)]}</span></div> })}</div></div>
    </div>
    <div className="pr-col">
      <Title>이번주 나의 공부티어</Title>
      <div className="pr-card pr-tier"><p>공부 티어 기록 없음</p><small>원본 티어 규칙이 확장 자료에 없어 비워 둡니다</small></div>
      <Title>최근 5주 간 순공시간 비교</Title>
      <div className="pr-card pr-black"><Five vals={five} labels={['4주전', '3주전', '2주전', '1주전', '이번주']} /></div>
    </div>
    <div className="pr-col">
      <Title>학습 계획 달성률</Title>
      <Achieve plan={plan} act={act} />
      <Title>자습 비율</Title>
      <SelfRatio st={st} pu={pu} />
      <Title>주간 평균 학습 만족도</Title>
      <div className="pr-card pr-black pr-stars">☆☆☆☆☆ <small>학생 평가 기록 없음</small></div>
    </div>
  </div>
}

function Five({ vals, labels }: { vals: (number | null)[]; labels: string[] }) {
  const mx = Math.max(60, ...vals.map((v) => v ?? 0))
  return <div className="pr-five">{vals.map((v, i) => <div key={i}><div className="pr-five-bar">{v === null ? <em>기록 없음</em> : <i className={i === vals.length - 1 ? 'c' : 'w'} style={{ height: `${(v / mx) * 100}%` }}><b>{Math.round(v / 60)}</b></i>}</div><span>{labels[i]}</span></div>)}</div>
}

function Achieve({ plan, act }: { plan: number; act: number }) {
  const r = plan ? Math.round((act / plan) * 1000) / 10 : 0
  return <div className="pr-card pr-light"><div className="pr-ach"><b>{r}%</b><div><span>○ 학습계획 <em>{hms(plan).slice(0, 5)}</em></span><span className="on">✔ 학습완료 <em>{hms(Math.min(act, plan)).slice(0, 5)}</em></span></div></div><div className="pr-track"><i style={{ width: `${Math.min(100, r)}%` }} /></div></div>
}

function SelfRatio({ st, pu }: { st: number; pu: number }) {
  return <div className="pr-card pr-self"><div className="pr-pie" aria-hidden="true" /><table><thead><tr><th /><th>순공<br />시간</th><th>공부<br />시간</th></tr></thead><tbody>
    <tr><td>전체</td><td>{hms(pu)}</td><td>{hms(st)}</td></tr><tr className="y"><td>■ 자습</td><td>{hms(pu)}</td><td>{hms(st)}</td></tr><tr className="c"><td>■ 수업</td><td>{hms(0)}</td><td>{hms(0)}</td></tr></tbody></table></div>
}

function Monthly({ date, byDate, study, pure, first, asOf }: { date: string; byDate: Map<string, Day>; study: (d?: Day) => number; pure: (d?: Day) => number; first: string; asOf: string }) {
  const y = Number(date.slice(0, 4)), m = Number(date.slice(5, 7)), last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const days = Array.from({ length: last }, (_, i) => `${date.slice(0, 7)}-${pad(i + 1)}`)
  const lead = (dowOf(days[0]) + 6) % 7
  const st = days.reduce((a, x) => a + study(byDate.get(x)), 0), pu = days.reduce((a, x) => a + pure(byDate.get(x)), 0), rate = st ? Math.round((pu / st) * 100) : 0
  const best = days.reduce((b, x) => (pure(byDate.get(x)) > pure(byDate.get(b)) ? x : b), days[0])
  const plan = days.reduce((a, x) => a + (byDate.get(x)?.planned ?? 0), 0), act = days.reduce((a, x) => a + (byDate.get(x)?.planned ? byDate.get(x)?.actual ?? 0 : 0), 0)
  const lvl = (v: number) => (v <= 0 ? '' : v < 60 ? 'l1' : v < 180 ? 'l2' : v < 300 ? 'l3' : v < 600 ? 'l4' : 'l5')
  return <div className="pr-grid">
    <div className="pr-col">
      <div className="pr-card pr-month">
        <div className="pr-gauge-num"><small>순공률</small><b>{rate}%</b></div>
        <div className="pr-cal">{['월', '화', '수', '목', '금', '토', '일'].map((x) => <span key={x} className="h">{x}</span>)}{Array.from({ length: lead }, (_, i) => <span key={`l${i}`} />)}
          {days.map((x) => { const out = x < first || x > asOf; return <span key={x} className={out ? 'out' : lvl(pure(byDate.get(x)))}>{Number(x.slice(8))}</span> })}</div>
        <p className="pr-cal-key"><i className="l1" />1h 미만 <i className="l2" />3h 미만 <i className="l3" />5h 미만 <i className="l4" />10h 미만 <i className="l5" />10h 이상</p>
        <div className="pr-best"><p>가장 많이 공부한 날</p><b>{Number(best.slice(5, 7))}월 {Number(best.slice(8))}일</b><span>{hms(pure(byDate.get(best)))}</span></div>
      </div>
    </div>
    <div className="pr-col">
      <Title>이번달 나의 공부티어</Title>
      <div className="pr-card pr-tier"><p>공부 티어 기록 없음</p><small>원본 티어 규칙이 확장 자료에 없어 비워 둡니다</small></div>
      <Title>최근 5개월 순공시간 비교</Title>
      <div className="pr-card pr-black"><Five vals={[4, 3, 2, 1, 0].map((k) => { const mm = new Date(Date.UTC(y, m - 1 - k, 1)), ym = mm.toISOString().slice(0, 7), ds = [...byDate.keys()].filter((x) => x.startsWith(ym)); return ds.length ? ds.reduce((a, x) => a + pure(byDate.get(x)), 0) : null })} labels={['4개월전', '3개월전', '2개월전', '1개월전', '이번달']} /></div>
    </div>
    <div className="pr-col">
      <Title>학습 계획 달성률</Title>
      <Achieve plan={plan} act={act} />
      <Title>자습 비율</Title>
      <SelfRatio st={st} pu={pu} />
      <Title>월간 평균 학습 만족도</Title>
      <div className="pr-card pr-black pr-stars">☆☆☆☆☆ <small>학생 평가 기록 없음</small></div>
    </div>
  </div>
}



