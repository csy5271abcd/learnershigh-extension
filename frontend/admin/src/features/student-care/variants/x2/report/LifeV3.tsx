// 생활 레포트(주간) 시안 3 · 한 주 시간표: 원본 데일리 '학습 시간'(시간 격자) 꼴을 한 주로. 요일마다 한 줄, 지난주(옅은 막대)와 이번주(청록 막대)를
// 입실~공부 끝 구간으로 겹쳐 그린다. 막대가 오른쪽으로 밀리면 늦게 온 것, 짧아지면 공부가 준 것. 결석한 날은 빨간 줄.
// 오른쪽 3열: 변화 요약 숫자판(원본 시계판 숫자 꼴) — 입실 ±분, 공부 ±분(±%), 계획 달성률 ±%p, 결석 날짜.
import './lifeV3.css'
import type { CareRow } from '../../shared/useCareData.ts'

type D = CareRow['history35'][number]
const NAMES = ['월', '화', '수', '목', '금', '토', '일']

export function LifeV3({ s, date }: { s: CareRow; date: string }) {
  const end = new Date(`${date}T00:00:00Z`)
  const mon = new Date(end); mon.setUTCDate(end.getUTCDate() - ((end.getUTCDay() + 6) % 7))
  const pick = (offset: number, i: number): D | undefined => { const x = new Date(mon); x.setUTCDate(mon.getUTCDate() + offset + i); const k = x.toISOString().slice(0, 10); return s.history35.find((d) => d.date === k) }
  const today = (end.getUTCDay() + 6) % 7
  const rows = NAMES.map((n, i) => ({ n, i, now: i <= today ? pick(0, i) : undefined, last: pick(-7, i), future: i > today }))
  const span = (d?: D) => (d && d.attendance === 'present' && d.start !== null ? [d.start, d.start + (d.minutes ?? 0)] as const : null)
  const H0 = 6 * 60, H1 = 26 * 60, pct = (m: number) => ((Math.min(H1, Math.max(H0, m)) - H0) / (H1 - H0)) * 100
  const passed = rows.filter((r) => !r.future)
  const sum = (f: (r: (typeof rows)[number]) => number) => passed.reduce((a, r) => a + f(r), 0)
  const cnt = (f: (r: (typeof rows)[number]) => boolean) => passed.filter(f).length
  const startD = (() => { const pairs = passed.filter((r) => span(r.now) && span(r.last)); return pairs.length ? pairs.reduce((a, r) => a + span(r.now)![0] - span(r.last)![0], 0) / pairs.length : null })()
  const studyNow = sum((r) => (span(r.now) ? r.now!.minutes ?? 0 : 0)), studyLast = sum((r) => (span(r.last) ? r.last!.minutes ?? 0 : 0))
  const pr = (k: 'now' | 'last') => { const p = sum((r) => r[k]?.planned ?? 0); return p ? (sum((r) => (r[k]?.planned ? r[k]!.actual ?? 0 : 0)) / p) * 100 : null }
  const rNow = pr('now'), rLast = pr('last')
  const absent = passed.filter((r) => r.now?.attendance === 'absent')
  const sign = (v: number) => (v > 0 ? '+' : v < 0 ? '−' : '±')
  const hm = (m: number) => `${Math.floor(Math.abs(m) / 60)}:${String(Math.round(Math.abs(m)) % 60).padStart(2, '0')}`
  return <div className="pr-grid l3-grid">
    <div className="pr-col l3-wide">
      <p className="pr-title">한 주 시간표 · 지난주와 겹쳐 보기</p>
      <div className="l3-table">
        <div className="l3-axis"><span />{[6, 10, 14, 18, 22, 26].map((h) => <em key={h} style={{ left: `${pct(h * 60)}%` }}>{h % 24}시</em>)}</div>
        {rows.map((r) => <div key={r.n} className="l3-row"><b className={r.i === today ? 'l3-today' : undefined}>{r.n}</b>
          <div className="l3-lane">
            {[6, 10, 14, 18, 22, 26].map((h) => <i key={h} className="l3-tick" style={{ left: `${pct(h * 60)}%` }} />)}
            {span(r.last) && <i className="l3-last" style={{ left: `${pct(span(r.last)![0])}%`, width: `${pct(span(r.last)![1]) - pct(span(r.last)![0])}%` }} />}
            {span(r.now) && <i className={span(r.last) && span(r.now)![0] - span(r.last)![0] >= 30 ? 'l3-now l3-late' : 'l3-now'} style={{ left: `${pct(span(r.now)![0])}%`, width: `${Math.max(0.6, pct(span(r.now)![1]) - pct(span(r.now)![0]))}%` }} />}
            {r.now?.attendance === 'absent' && <span className="l3-abs">결석</span>}
            {r.future && <span className="l3-fut">아직</span>}
          </div></div>)}
        <p className="l3-key"><i className="last" />지난주 <i className="now" />이번주 <i className="late" />30분 넘게 늦게 온 날</p>
      </div>
    </div>
    <div className="pr-col">
      <p className="pr-title">지난주와 달라진 점</p>
      <div className="l3-board">
        <div><span>입실</span><b className={startD !== null && startD >= 30 ? 'y' : undefined}>{startD === null ? '--:--' : `${sign(startD)}${hm(startD)}`}</b><small>{startD === null ? '비교 전' : startD >= 0 ? '늦어짐' : '빨라짐'}</small></div>
        <div><span>공부</span><b className={studyNow < studyLast * 0.8 ? 'y' : undefined}>{sign(studyNow - studyLast)}{hm(studyNow - studyLast)}</b><small>{studyLast ? `${sign(studyNow - studyLast)}${Math.round((Math.abs(studyNow - studyLast) / studyLast) * 100)}%` : '–'}</small></div>
        <div><span>계획</span><b className={rNow !== null && rLast !== null && rNow < rLast - 3 ? 'y' : undefined}>{rNow === null ? '--' : `${Math.round(rNow)}%`}</b><small>{rNow !== null && rLast !== null ? `${sign(rNow - rLast)}${Math.round(Math.abs(rNow - rLast))}%p` : '–'}</small></div>
        <div><span>결석</span><b className={absent.length ? 'y' : undefined}>{cnt((r) => r.now?.attendance === 'absent')}일</b><small>{absent.length ? absent.map((r) => r.n).join('·') : '없음'}</small></div>
      </div>
    </div>
  </div>
}

