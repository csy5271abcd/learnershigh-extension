// 생활 레포트(주간) 시안 2 · 지난주·이번주 겹쳐 보기: 원본 주간 '출석 도장 줄'과 '공부시간/순공시간 요일 막대' 꼴.
// 1열 도장 두 줄(지난주/이번주, 결석 빨강·입실 시각) · 2열 요일별 입실 시각 짝 점(지난주 흰, 이번주 청록) · 3열 요일별 공부 시간 짝 막대 + 계획 달성률 두 막대.
// 그림마다 위에 변화 한 줄(입실 +n분, 공부 +n분(+n%), 달성률 ±n%p).
import './lifeV2.css'
import type { CareRow } from '../../shared/useCareData.ts'

type D = CareRow['history35'][number]

export function LifeV2({ s, date }: { s: CareRow; date: string }) {
  const dayMs = 864e5, t = Date.parse(`${date}T00:00:00Z`), mon = t - ((new Date(t).getUTCDay() + 6) % 7) * dayMs
  const by = new Map(s.history35.map((d) => [d.date, d]))
  const isoAt = (ms: number) => new Date(ms).toISOString().slice(0, 10)
  const cols = ['월', '화', '수', '목', '금', '토', '일'].map((name, i) => ({ name, now: isoAt(mon + i * dayMs) <= date ? by.get(isoAt(mon + i * dayMs)) : undefined, last: by.get(isoAt(mon + (i - 7) * dayMs)), future: isoAt(mon + i * dayMs) > date }))
  const upto = cols.filter((c) => !c.future)
  const pres = (d?: D) => d?.attendance === 'present'
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
  const startNow = mean(upto.flatMap((c) => (pres(c.now) && c.now!.start !== null ? [c.now!.start] : []))), startLast = mean(upto.flatMap((c) => (pres(c.last) && c.last!.start !== null ? [c.last!.start] : [])))
  const stNow = upto.reduce((a, c) => a + (pres(c.now) ? c.now!.minutes ?? 0 : 0), 0), stLast = upto.reduce((a, c) => a + (pres(c.last) ? c.last!.minutes ?? 0 : 0), 0)
  const rate = (pick: (c: (typeof cols)[number]) => D | undefined) => { const p = upto.reduce((a, c) => a + (pick(c)?.planned ?? 0), 0); return p ? (upto.reduce((a, c) => a + (pick(c)?.planned ? pick(c)!.actual ?? 0 : 0), 0) / p) * 100 : null }
  const rNow = rate((c) => c.now), rLast = rate((c) => c.last)
  const mm = (m: number) => { const a = Math.round(Math.abs(m)), h = Math.floor(a / 60); return h ? `${h}시간${a % 60 ? ` ${a % 60}분` : ''}` : `${a}분` }
  const clock = (m: number) => `${Math.floor(m / 60) % 24}:${String(Math.round(m) % 60).padStart(2, '0')}`
  const stamp = (d: D | undefined, future: boolean) => future ? <i className="l2-st l2-fut" /> : <i className={`l2-st ${d?.attendance === 'present' ? 'on' : d?.attendance === 'absent' ? 'no' : ''}`}>{d?.attendance === 'present' ? '✔' : d?.attendance === 'absent' ? '결' : d?.attendance === 'off' ? '쉼' : ''}</i>

  // 입실 짝 점 그림(시각 축은 세로, 위가 늦은 시각)
  const vals = cols.flatMap((c) => [pres(c.now) ? c.now!.start : null, pres(c.last) ? c.last!.start : null]).filter((v): v is number => v !== null)
  const lo = vals.length ? Math.floor((Math.min(...vals) - 30) / 60) * 60 : 1080, hi = vals.length ? Math.max(lo + 120, Math.ceil((Math.max(...vals) + 30) / 60) * 60) : 1260
  const Y = (m: number) => 14 + (1 - (m - lo) / (hi - lo)) * 150
  const mx = Math.max(60, ...cols.flatMap((c) => [pres(c.now) ? c.now!.minutes ?? 0 : 0, pres(c.last) ? c.last!.minutes ?? 0 : 0]))
  const dStart = startNow !== null && startLast !== null ? startNow - startLast : null, dStudy = stNow - stLast
  return <div className="pr-grid">
    <div className="pr-col">
      <p className="pr-title">출석</p>
      <div className="pr-card l2-stamps">
        <div className="l2-srow l2-head"><span />{cols.map((c) => <span key={c.name}>{c.name}</span>)}</div>
        <div className="l2-srow"><span>지난주</span>{cols.map((c) => <span key={c.name}>{stamp(c.last, false)}</span>)}</div>
        <div className="l2-srow"><span>이번주</span>{cols.map((c) => <span key={c.name}>{stamp(c.now, c.future)}<small>{pres(c.now) && c.now!.start !== null ? clock(c.now!.start) : ''}</small></span>)}</div>
      </div>
      <p className="l2-say">{upto.some((c) => c.now?.attendance === 'absent') ? <>이번 주 <b className="y">{upto.filter((c) => c.now?.attendance === 'absent').map((c) => `${c.name}요일`).join(', ')}</b>에 빠졌어요</> : '이번 주 빠진 날이 없어요'}</p>
    </div>
    <div className="pr-col">
      <p className="pr-title">입실 시각</p>
      <p className="l2-say">{dStart === null ? '지난주와 비교할 입실이 없어요' : Math.abs(dStart) < 10 ? '지난주와 비슷한 시각에 왔어요' : <>지난주보다 <b className={dStart > 0 ? 'y' : 'c'}>{mm(dStart)} {dStart > 0 ? '늦어졌어요' : '빨라졌어요'}</b></>}</p>
      <div className="pr-card pr-black"><svg viewBox="0 0 330 190" className="l2-svg" role="img" aria-label="요일별 입실 시각, 지난주와 이번주">
        {[lo, (lo + hi) / 2, hi].map((v) => <g key={v}><line x1="40" x2="326" y1={Y(v)} y2={Y(v)} stroke="#3c3f45" strokeDasharray="3 4" /><text x="34" y={Y(v) + 4} textAnchor="end" fontSize="10" fill="#8a8e98">{clock(v)}</text></g>)}
        {cols.map((c, i) => { const x = 60 + i * 42, a = pres(c.last) ? c.last!.start : null, b = pres(c.now) ? c.now!.start : null
          return <g key={c.name}>{a !== null && b !== null && <line x1={x} x2={x} y1={Y(a)} y2={Y(b)} stroke={b > a + 30 ? '#FBE15A' : '#4ef0ff'} strokeWidth="3" />}
            {a !== null && <circle cx={x} cy={Y(a)} r="5" fill="#000" stroke="#e5e6ea" strokeWidth="2" />}{b !== null && <circle cx={x} cy={Y(b)} r="6" fill={a !== null && b > a + 30 ? '#FBE15A' : '#4ef0ff'} />}
            <text x={x} y="184" textAnchor="middle" fontSize="12" fill="#fff">{c.name}</text></g> })}
      </svg></div>
      <p className="l2-key"><i className="o" />지난주 <i className="f" />이번주</p>
    </div>
    <div className="pr-col">
      <p className="pr-title">공부 시간 · 계획 달성률</p>
      <p className="l2-say">{Math.abs(dStudy) < 10 ? '공부 시간은 지난주와 비슷해요' : <>공부 시간 <b className={dStudy > 0 ? 'c' : 'y'}>{dStudy > 0 ? '+' : '−'}{mm(dStudy)}{stLast ? ` (${dStudy > 0 ? '+' : '−'}${Math.round((Math.abs(dStudy) / stLast) * 100)}%)` : ''}</b></>}</p>
      <div className="pr-card pr-black l2-bars">{cols.map((c) => <div key={c.name}><div className="l2-pair"><i className="w" style={{ height: `${((pres(c.last) ? c.last!.minutes ?? 0 : 0) / mx) * 100}%` }} /><i className="c" style={{ height: `${((pres(c.now) ? c.now!.minutes ?? 0 : 0) / mx) * 100}%` }} /></div><span>{c.name}</span></div>)}</div>
      <div className="pr-card pr-light l2-rate"><div><span>계획 달성률</span><b>{rNow === null ? '–' : `${Math.round(rNow)}%`}</b>{rNow !== null && rLast !== null && <em className={rNow >= rLast ? 'up' : 'down'}>{rNow >= rLast ? '▲' : '▼'} {Math.round(Math.abs(rNow - rLast))}%p</em>}</div>
        <div className="l2-two"><span>지난주</span><i><b style={{ width: `${Math.min(100, rLast ?? 0)}%` }} /></i><span>이번주</span><i><b className="c" style={{ width: `${Math.min(100, rNow ?? 0)}%` }} /></i></div></div>
    </div>
  </div>
}

