// Z′ 전용 사진 관찰: 사진을 먼저 본다. 비몰입 한 건 = 카드 하나(확정 사진 크게, 처음 감지·중간 작게), 최근 건부터.
// 위에 최근 7일 날짜별 건수 막대와 종류별 건수: 날짜 막대나 종류를 누르면 아래 카드가 그 건들로 좁혀진다(R03). 다시 누르면 푼다.
// 최근 7일 기록이 없으면 그 앞(최근 35일)의 기록을 이어서 보여 준다(빈 문구만 남기지 않는다).
import { useState } from 'react'
import type { CareRow } from '../shared/useCareData.ts'
import { md } from '../shared/useCareData.ts'
import { EVIDENCE_LABEL, eventDate, eventSeconds, eventStartMinute, evidenceSrc, SUP_BEHAVIORS, SUP_LABEL, type SupBehavior, type SupEvent } from '../supervisor/supervisorClient.ts'
import { clock, hm, STATE } from '../notation/kit.tsx'

const DOW = ['일', '월', '화', '수', '목', '금', '토']
const dow = (date: string) => DOW[new Date(`${date}T00:00:00Z`).getUTCDay()]

function Card({ e }: { e: SupEvent }) {
  const main = e.images.find((im) => im.selectionType === 'CONFIRMATION') ?? e.images[e.images.length - 1]
  const side = e.images.filter((im) => im !== main)
  const d = eventDate(e)
  return (
    <figure className="zp-card">
      <div className="zp-photos">
        {main ? <img className="zp-main" src={evidenceSrc(main.url)} alt={`${SUP_LABEL[e.reason]} ${EVIDENCE_LABEL[main.selectionType]}`} loading="lazy" /> : <span className="zp-none">사진 없음</span>}
        <div className="zp-side">{side.map((im) => <img key={im.selectionType} src={evidenceSrc(im.url)} alt={`${SUP_LABEL[e.reason]} ${EVIDENCE_LABEL[im.selectionType]}`} loading="lazy" data-tip={EVIDENCE_LABEL[im.selectionType]} />)}</div>
      </div>
      <figcaption><b>{SUP_LABEL[e.reason]}</b><span>{md(d)} {dow(d)} {clock(eventStartMinute(e))} · {hm(eventSeconds(e) / 60)}</span></figcaption>
    </figure>
  )
}

/** 최근 7일 날짜별 건수(누르면 그 날만) */
function DayCounts({ s, week, date, onDate }: { s: CareRow; week: SupEvent[]; date: string | null; onDate: (d: string | null) => void }) {
  const counts = s.days.map((d) => week.filter((e) => eventDate(e) === d.date).length)
  const top = Math.max(1, ...counts)
  return (
    <ol className="zp-days" aria-label="최근 7일 날짜별 비몰입 건수">
      {s.days.map((d, i) => {
        const n = counts[i], on = date === d.date, off = d.attendance !== 'present'
        const tip = `${md(d.date)} ${d.dow} · ${off && !n ? STATE[d.attendance] : `${n}건`}`
        return <li key={d.date}><button type="button" disabled={!n} aria-pressed={on} onClick={() => onDate(on ? null : d.date)} data-tip={tip} aria-label={tip}>
          <span className="zp-n">{off && !n ? '' : `${n}건`}</span>
          <span className="zp-bar"><i style={{ height: `${(n / top) * 100}%` }} /></span>
          <b>{md(d.date)}</b><span className={d.attendance === 'absent' ? 'zp-abs' : 'zp-dow'}>{off ? (d.attendance === 'off' ? '예정 없음' : STATE[d.attendance]) : d.dow}</span>
        </button></li>
      })}
    </ol>
  )
}

export function ZPhotos({ s, ev }: { s: CareRow; ev: SupEvent[] }) {
  const [more, setMore] = useState(0)
  const [date, setDate] = useState<string | null>(null)
  const [kind, setKind] = useState<SupBehavior | null>(null)
  const recent = new Set(s.days.map((d) => d.date)), all = new Set(s.history35.map((d) => d.date))
  const sorted = [...ev].filter((e) => all.has(eventDate(e))).sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  const week = sorted.filter((e) => recent.has(eventDate(e)))
  const counts = SUP_BEHAVIORS.map((b) => ({ b, n: week.filter((e) => e.reason === b).length }))
  const base = week.length ? week : sorted
  const list = base.filter((e) => (!date || eventDate(e) === date) && (!kind || e.reason === kind))
  const shown = list.slice(0, 6 + more)
  return (
    <div className="zp">
      {week.length ? <>
        <div className="zp-kinds" role="group" aria-label="종류별 건수 · 최근 7일">
          <span>최근 7일</span>
          {counts.map((x) => <button key={x.b} type="button" disabled={!x.n} aria-pressed={kind === x.b} onClick={() => { setKind(kind === x.b ? null : x.b); setMore(0) }}><b>{SUP_LABEL[x.b]}</b> {x.n}건</button>)}
        </div>
        <DayCounts s={s} week={kind ? week.filter((e) => e.reason === kind) : week} date={date} onDate={(d) => { setDate(d); setMore(0) }} />
      </> : <p className="zp-sum">최근 7일 0건{sorted.length ? ' · 그 앞의 기록' : ''}</p>}
      {(date || kind) && <p className="zp-sum">{date ? `${md(date)} ${dow(date)} ` : ''}{kind ? `${SUP_LABEL[kind]} ` : ''}{list.length}건 <button type="button" className="zp-more" onClick={() => { setDate(null); setKind(null) }}>전체 보기</button></p>}
      {shown.length > 0 && <div className="zp-grid">{shown.map((e) => <Card key={e.eventId} e={e} />)}</div>}
      {list.length > shown.length && <button type="button" className="zp-more" onClick={() => setMore(more + 6)}>{Math.min(6, list.length - shown.length)}건 더 보기</button>}
    </div>
  )
}
