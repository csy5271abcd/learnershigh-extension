// 생활 레포트(시안 1 확정, 2026-11-12): 위 네 칸(출석률·평균 입실·계획 제출률·비몰입, 지난 7일 대비),
// 가운데 줄 입실 시각 꺾은선(학생 케어 입실 그림과 같은 꼴: 입실 실선, 같은 요일 평소 점선) · 7일 출석·계획 제출 도장,
// 아래 줄 이미지 인식 관찰(세 분류 + 일별 막대) · 최근 케어 기록. 위 '생활 요약' 칸은 사용자 요청으로 뺐다.
import type { ReactNode } from 'react'
import './lifeBase.css'
import './lifeV1.css'
import { clock, dur, md, sign, type CareRecord, type Life } from './lifeData.ts'
import { clock as clockKo, clockDomain, hm } from '../../notation/kit.tsx'
import { useWidth } from '../../z/useWidth.ts'
import { LATE_BANDS, lateBand } from '../x2Model.ts'
import { Ico } from './lifeIcons.tsx'
import { SUP_BEHAVIORS, SUP_LABEL } from '../../supervisor/supervisorClient.ts'

const ICON = { PHONE_USAGE: Ico.phone, LYING_DOWN: Ico.sleep, ABSENCE: Ico.away }

function Delta({ v, text, goodUp }: { v: number | null; text: string; goodUp: boolean }) {
  if (v === null) return <span className="lb-mute">비교 기록 없음</span>
  if (Math.round(v) === 0) return <span className="lb-mute">− 변화 없음</span>
  return <span className={(v > 0) === goodUp ? 'lb-up' : 'lb-dn'}>{v > 0 ? '▲' : '▼'} {text}</span>
}

function Stat({ k, v, sub, foot }: { k: string; v: string; sub: ReactNode; foot: ReactNode }) {
  return <section className="lb-card v1-stat"><span>{k}</span><b className="lb-c">{v}</b><em>{sub}</em><small className="lb-mute">{foot}</small></section>
}

export function LifeV1({ L, care }: { L: Life; care: CareRecord[] | null | 'error' }) {
  const { now } = L
  return <div className="lb lb-v1">
    <div className="v1-top">
      <Stat k="출석률" v={now.scheduled ? `${Math.round((now.present / now.scheduled) * 100)}%` : '–'} sub={`${now.present}/${now.scheduled}일`} foot={`늦은 입실 ${now.late.length}회 · 결석 ${now.absent.length}회`} />
      <Stat k="평균 입실 시각" v={now.avgStart === null ? '–' : clock(now.avgStart)} sub={<Delta v={L.dStart} text={L.dStart === null ? '' : `${sign(L.dStart)}${dur(L.dStart)}`} goodUp={false} />} foot="지난 7일 대비" />
      <Stat k="계획 제출률" v={L.submitRate === null ? '–' : `${L.submitRate}%`} sub={<Delta v={L.dSubmit} text={L.dSubmit === null ? '' : `${sign(L.dSubmit)}${Math.abs(L.dSubmit)}%p`} goodUp />} foot="지난 7일 대비" />
      <Stat k="비몰입" v={`${now.focus}건`} sub={<Delta v={L.dFocus} text={L.dFocus === null ? '' : `${sign(L.dFocus)}${Math.abs(L.dFocus)}건`} goodUp={false} />} foot={now.perHour === null ? '지난 7일 대비' : `공부 1시간당 ${now.perHour.toFixed(1)}건`} />
    </div>

    <div className="v1-mid">
      <StartChart L={L} />
      <section className="lb-card">
        <h3 className="lb-h">출석 · 계획 제출</h3>
        <div className="lb-in v1-stamp">
          <span /> {now.days.map((x) => <span key={x.date} className="v1-dh">{md(x.date)}<br /><small>({x.dow})</small></span>)}
          <span className="v1-rh">출석</span>{now.days.map((x) => { const a = x.d?.attendance
            return <i key={x.date} className={`v1-st ${a === 'present' ? (lateBand(x.late) ? `on late${lateBand(x.late)}` : 'on') : x.absent ? 'no' : 'off'}`}>{a === 'present' ? '✓' : x.absent ? '결석' : '–'}</i> })}
          <span className="v1-rh">계획</span>{now.days.map((x) => { const s = x.present ? x.d!.submission : undefined /* 결석한 날은 계획 미제출로 세지 않는다(학생 케어와 같음) */
            return <i key={x.date} className={`v1-st ${s === 'submitted' ? 'on' : s === 'missing' ? 'no' : 'off'}`}>{s === 'submitted' ? '✓' : s === 'missing' ? '미제출' : '–'}</i> })}
        </div>
        <p className="v1-say">{now.late.length ? <><b className="lb-v">늦은 입실 {now.late.length}회</b> {now.late.map((x) => `${md(x.date)}(${x.dow}) ${dur(x.late!)}`).join(' · ')}</> : '평소보다 크게 늦은 날이 없어요.'}</p>
        <p className="v1-say">{now.missing.length ? <><b className="lb-dn">계획 미제출 {now.missing.length}일</b> {now.missing.map((x) => `${md(x.date)}(${x.dow})`).join(' · ')}</> : '계획을 빠짐없이 제출했어요.'}</p>
      </section>
    </div>

    <div className="v1-bot">
      <section className="lb-card">
        <h3 className="lb-h">비몰입 기록 <small>(이미지 식별)</small></h3>
        <div className="v1-obs">
          <div className="lb-in v1-obs-list">{SUP_BEHAVIORS.map((k) => <div key={k}><span className="lb-c">{ICON[k]()}</span><span>{SUP_LABEL[k]}</span><b>{now.focusBy[k]}건</b></div>)}</div>
          <div className="lb-in v1-fb"><span>일별 비몰입</span>
            <div className="v1-fb-row">{now.days.map((x) => { const mx = Math.max(1, ...now.days.map((y) => y.focus))
              return <div key={x.date}><b>{x.present ? x.focus : ''}</b><i style={{ height: `${x.present ? Math.max(4, (x.focus / mx) * 100) : 0}%`, background: x.focus === mx && x.focus > 0 ? 'var(--v)' : 'var(--c)' }} /><small>{md(x.date)}<br />({x.dow})</small></div> })}</div></div>
        </div>
      </section>
      <section className="lb-card">
        <h3 className="lb-h">최근 케어 기록</h3>
        {care === 'error' ? <p className="lb-none">케어 기록을 불러오지 못했어요.</p> : care === null ? <p className="lb-none">불러오는 중</p> : !care.length ? <p className="lb-none">남긴 케어 기록이 없어요.</p>
          : <div className="v1-notes">{care.map((n) => <div key={n.id} className="lb-in"><span className="lb-mute">{Ico.cal(20)}</span><span>{md(n.date)} ({n.dow})</span><span className={`lb-tag ${n.channel === '면담' ? 'lb-c' : 'lb-v'}`}>{n.channel}</span><p>{n.topic}{n.next && <small className="lb-mute"> · {md(n.next)} 다시 확인</small>}</p></div>)}</div>}
      </section>
    </div>
  </div>
}

/** 입실 시각: 꺾은선 둘. 입실 = 청록 실선과 점(평소보다 10·30·60분 넘게 늦은 날은 옅은 주황·주황·빨강 점), 평소(같은 요일) = 점선과 속 빈 점.
 *  위로 갈수록 늦은 시각. 평소 선은 결석한 날에도 이어 그린다(그날 왔어야 할 시각). 값은 아래 요약 줄과 점에 마우스를 올리면 보인다 */
function StartChart({ L }: { L: Life }) {
  const [box, w] = useWidth<HTMLDivElement>()
  const days = L.now.days
  const pts = days.map((x) => ({ x, v: x.present && x.d!.start !== null ? x.d!.start : null, u: x.usual }))
  const [lo, hi] = clockDomain(pts.flatMap((p) => [p.v, p.u].filter((k): k is number => k !== null)), 30)
  const n = pts.length, PL = 72, PR = 12, T = 18, B = 52, H = 280, cw = (w - PL - PR) / n
  const X = (i: number) => PL + cw * (i + 0.5), Y = (m: number) => T + (1 - (m - lo) / (hi - lo)) * (H - T - B)
  const step = hi - lo > 300 ? 120 : 60
  const ticks = Array.from({ length: Math.floor((hi - lo) / step) + 1 }, (_, k) => lo + k * step)
  const line = (key: 'v' | 'u') => pts.map((p, i) => (p[key] === null ? '' : `${i > 0 && pts[i - 1][key] !== null ? 'L' : 'M'}${X(i)},${Y(p[key]!)}`)).join('')
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
  const came = pts.filter((p) => p.v !== null)
  const diff = mean(days.flatMap((x) => (x.late === null ? [] : [x.late])))
  const uavg = mean(came.flatMap((p) => (p.u === null ? [] : [p.u]))), last = came.length ? Math.max(...came.map((p) => p.v!)) : null
  const tick = (t: number) => (t % 1440 === 0 ? '자정' : clockKo(t).replace(':00', '시'))
  return <section className="lb-card">
    <h3 className="lb-h">입실 시각 <small>평소는 같은 요일 지난 4주</small></h3>
    <div className="v1-sh">
      <div><span>평소와 비교한 입실</span><b>{diff === null ? '비교할 입실 없음' : diff < 10 ? '평소대로' : `평균 ${hm(diff)} 늦게`}</b></div>
      <div><span>{L.lateMin}분 이상 늦은 날</span><b className={L.now.late.length ? 'lb-v' : undefined}>{L.now.late.length}일<small>/ 입실 {came.length}일</small></b></div>
    </div>
    <div ref={box} className="v1-plot">
      <svg width={w} height={H} role="img" aria-label="최근 7일 입실 시각과 같은 요일 평소">
        {ticks.map((t, k) => <g key={t}><line x1={PL} x2={w - PR} y1={Y(t)} y2={Y(t)} className={k ? 'v1-grid' : 'v1-base'} /><text x={PL - 10} y={Y(t) + 4} textAnchor="end" className="v1-axis">{tick(t)}</text></g>)}
        {pts.map((p, i) => <g key={p.x.date}>
          <title>{`${md(p.x.date)}(${p.x.dow}) ${p.v !== null ? `입실 ${clockKo(p.v)}` : p.x.absent ? '결석' : '기록 없음'}${p.u !== null ? ` · 평소 ${clockKo(p.u)}` : ''}`}</title>
          <rect x={PL + cw * i} y={0} width={cw} height={H} fill="transparent" />
          <text x={X(i)} y={H - B + 22} textAnchor="middle" className="v1-x">{p.x.dow}</text>
          <text x={X(i)} y={H - B + 40} textAnchor="middle" className={p.x.absent ? 'v1-x2 v1-bad' : 'v1-x2'}>{p.x.absent ? '결석' : md(p.x.date)}</text>
        </g>)}
        <path d={line('u')} className="v1-casing" /><path d={line('u')} className="v1-uline" />
        <path d={line('v')} className="v1-casing" /><path d={line('v')} className="v1-vline" />
        {pts.map((p, i) => p.u !== null && <circle key={`u${i}`} cx={X(i)} cy={Y(p.u)} r={6} className="v1-udot" />)}
        {pts.map((p, i) => p.v !== null && <circle key={`v${i}`} cx={X(i)} cy={Y(p.v)} r={lateBand(p.x.late) ? 7 : 6} className={lateBand(p.x.late) ? `v1-vdot late${lateBand(p.x.late)}` : 'v1-vdot'} />)}
      </svg>
    </div>
    <p className="v1-legend"><span><i className="v1-k-v" aria-hidden="true" />입실 시각</span><span><i className="v1-k-u" aria-hidden="true" />평소 입실 시각</span>{LATE_BANDS.map((x) => <span key={x.band}><i className={`v1-k-late late${x.band}`} aria-hidden="true" />{x.label}</span>)}</p>
    <dl className="v1-stats">
      <div><dt>평균 입실</dt><dd>{L.now.avgStart === null ? '–' : clockKo(L.now.avgStart)}<small> 입실한 날</small></dd></div>
      <div><dt>평소 평균 입실</dt><dd>{uavg === null ? '–' : clockKo(uavg)}</dd></div>
      <div><dt>가장 늦은 입실</dt><dd>{last === null ? '–' : clockKo(last)}</dd></div>
      <div><dt>결석</dt><dd className={L.now.absent.length ? 'lb-dn' : undefined}>{L.now.absent.length}일</dd></div>
    </dl>
  </section>
}
