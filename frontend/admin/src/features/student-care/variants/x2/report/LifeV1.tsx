// 생활 레포트(주간) 시안 1 · 변화 카드: 원본 주간 '이번주 나의 공부티어' 카드 꼴(검은 칸, 가운데 한 줄 큰 결론 + 노란 강조).
// 이번 주(월–고른 날) vs 지난주 같은 요일까지. 카드마다 결론 한 줄을 크게, 그 밑에 지난주 → 이번주 값.
//  입실 시각: "지난주보다 32분 늦어졌어요" / 결석: 날짜 칩 "11/5(목)" / 공부 시간: "+20분 (▲12%)" / 계획 달성률: "▲8%p" / 공부 중 흐트러짐: "+3회"
import './lifeV1.css'
import type { CareRow } from '../../shared/useCareData.ts'
import { eventDate, type SupEvent } from '../../supervisor/supervisorClient.ts'

type D = CareRow['history35'][number]
const DOW = ['일', '월', '화', '수', '목', '금', '토']

function Card({ title, line, tone, from, to }: { title: string; line: string; tone: 'bad' | 'good' | 'flat'; from: string; to: string }) {
  return <div className={`l1-card l1-${tone}`}><p className="pr-title">{title}</p><div className="l1-box"><strong>{line}</strong><div className="l1-ft"><span>지난주 <b>{from}</b></span><i>→</i><span>이번주 <b>{to}</b></span></div></div></div>
}

export function LifeV1({ s, ev, date }: { s: CareRow; ev: SupEvent[]; date: string }) {
  const t = new Date(`${date}T00:00:00Z`), back = (t.getUTCDay() + 6) % 7 // 월요일부터 며칠째
  const iso = (n: number) => new Date(t.getTime() + n * 864e5).toISOString().slice(0, 10)
  const by = new Map(s.history35.map((d) => [d.date, d]))
  const thisW = Array.from({ length: back + 1 }, (_, i) => by.get(iso(i - back))).filter((d): d is D => !!d)
  const lastW = Array.from({ length: back + 1 }, (_, i) => by.get(iso(i - back - 7))).filter((d): d is D => !!d)
  const came = (w: D[]) => w.filter((d) => d.attendance === 'present')
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
  const start = (w: D[]) => avg(came(w).flatMap((d) => (d.start === null ? [] : [d.start])))
  const study = (w: D[]) => came(w).reduce((a, d) => a + (d.minutes ?? 0), 0)
  const plan = (w: D[]) => { const p = w.reduce((a, d) => a + (d.planned ?? 0), 0); return p ? (w.reduce((a, d) => a + (d.planned ? d.actual ?? 0 : 0), 0) / p) * 100 : null }
  const focus = (w: D[]) => { const set = new Set(w.map((d) => d.date)); return ev.filter((e) => set.has(eventDate(e))).length }
  const mm = (m: number) => { const a = Math.round(Math.abs(m)), h = Math.floor(a / 60); return h ? `${h}시간${a % 60 ? ` ${a % 60}분` : ''}` : `${a}분` }
  const hhmm = (m: number | null) => (m === null ? '–' : `${Math.floor(m / 60) % 24}:${String(Math.round(m) % 60).padStart(2, '0')}`)
  const hasLast = lastW.some((d) => d.attendance !== 'unknown')

  const s0 = start(thisW), s1 = hasLast ? start(lastW) : null, ds = s0 !== null && s1 !== null ? s0 - s1 : null
  const t0 = study(thisW), t1 = hasLast ? study(lastW) : null, dt = t1 === null ? null : t0 - t1
  const p0 = plan(thisW), p1 = hasLast ? plan(lastW) : null
  const f0 = focus(thisW), f1 = hasLast ? focus(lastW) : null
  const absents = thisW.filter((d) => d.attendance === 'absent')

  return <div className="pr-grid">
    <div className="pr-col">
      <Card title="입실 시각" tone={ds === null || Math.abs(ds) < 10 ? 'flat' : ds > 0 ? 'bad' : 'good'} line={ds === null ? '지난주와 비교할 입실이 없어요' : Math.abs(ds) < 10 ? '지난주와 비슷한 시각에 왔어요' : `지난주보다 ${mm(ds)} ${ds > 0 ? '늦어졌어요' : '빨라졌어요'}`} from={hhmm(s1)} to={hhmm(s0)} />
      <div className="l1-card"><p className="pr-title">결석</p><div className="l1-box">
        <strong className={absents.length ? 'l1-y' : undefined}>{absents.length ? `이번 주 ${absents.length}일 빠졌어요` : '이번 주 빠진 날이 없어요'}</strong>
        {absents.length > 0 && <div className="l1-chips">{absents.map((d) => <em key={d.date}>{Number(d.date.slice(5, 7))}/{Number(d.date.slice(8))}({DOW[new Date(`${d.date}T00:00:00Z`).getUTCDay()]})</em>)}</div>}
      </div></div>
    </div>
    <div className="pr-col">
      <Card title="공부 시간" tone={dt === null || Math.abs(dt) < 10 ? 'flat' : dt > 0 ? 'good' : 'bad'} line={dt === null ? '지난주 기록이 없어요' : Math.abs(dt) < 10 ? '지난주와 비슷해요' : `${dt > 0 ? '+' : '−'}${mm(dt)}${t1 ? ` (${dt > 0 ? '▲' : '▼'}${Math.round((Math.abs(dt) / t1) * 100)}%)` : ''} ${dt > 0 ? '늘었어요' : '줄었어요'}`} from={t1 === null ? '–' : mm(t1)} to={mm(t0)} />
      <Card title="계획 달성률" tone={p0 === null || p1 === null || Math.abs(p0 - p1) < 3 ? 'flat' : p0 > p1 ? 'good' : 'bad'} line={p0 === null ? '이번 주 계획이 없어요' : p1 === null ? `${Math.round(p0)}% 달성했어요` : Math.abs(p0 - p1) < 3 ? `${Math.round(p0)}%, 지난주와 비슷해요` : `${Math.round(p0)}%, 지난주보다 ${p0 > p1 ? '▲' : '▼'}${Math.round(Math.abs(p0 - p1))}%p`} from={p1 === null ? '–' : `${Math.round(p1)}%`} to={p0 === null ? '–' : `${Math.round(p0)}%`} />
    </div>
    <div className="pr-col">
      <Card title="공부 중 흐트러짐" tone={f1 === null || Math.abs(f0 - f1) < 2 ? 'flat' : f0 > f1 ? 'bad' : 'good'} line={f1 === null ? `이번 주 ${f0}회` : Math.abs(f0 - f1) < 2 ? '지난주와 비슷해요' : `${f0 > f1 ? '+' : '−'}${Math.abs(f0 - f1)}회 ${f0 > f1 ? '늘었어요' : '줄었어요'}`} from={f1 === null ? '–' : `${f1}회`} to={`${f0}회`} />
      <p className="pr-note">이번 주 {thisW.length ? `${Number(thisW[0].date.slice(5, 7))}/${Number(thisW[0].date.slice(8))}` : ''}–{Number(date.slice(5, 7))}/{Number(date.slice(8))}을 지난주 같은 요일까지와 비교했어요.</p>
    </div>
  </div>
}

