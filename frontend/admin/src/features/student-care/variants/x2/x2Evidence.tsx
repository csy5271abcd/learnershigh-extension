// X′ 비몰입 기록(X의 xEvidence를 옮겨 와 막대에서 고른 날짜를 종류와 상관없이 좁히게 고침).
// 사진 관찰 기록 전체 보기. 이미지 인식 레포의 감독관 학생 상세(비몰입 이력과 근거 이미지)와 같은 짜임이다:
// 비몰입 한 건 = 한 줄(날짜·시각·종류·지속), 최근 건부터. 처음에는 가장 최근 건, 줄을 고르면 그 건의 근거 사진(처음 감지·중간·비몰입 확정, 서버가 고른 최대 3장)을 크게 본다.
// 종류·기간 거르기는 보기 조건일 뿐 판정을 바꾸지 않는다. 판정은 이미지 인식 서버 그대로.
import { useState } from 'react'
import { md } from '../shared/useCareData.ts'
import { EVIDENCE_LABEL, eventDate, eventSeconds, eventStartMinute, evidenceSrc, SUP_BEHAVIORS, SUP_LABEL, type SupBehavior } from '../supervisor/supervisorClient.ts'
import { clock, hm, type NotationProps } from '../notation/kit.tsx'

const PAGE = 10
const DOW = ['일', '월', '화', '수', '목', '금', '토']
const dow = (date: string) => DOW[new Date(`${date}T00:00:00Z`).getUTCDay()]
const time = (iso: string | null) => (iso ? clock(Math.floor(((new Date(iso).getTime() / 60000 + 540) % 1440))) : '')

/** period를 주면 기록 기간이 화면의 일간(최근 7일)·주간(최근 35일)을 따라가고, 기록 안의 기간 바꾸기는 숨긴다 */
/** 사진 관찰 막대에서 고른 칸(그 날짜들·그 종류). 있으면 기록을 그 건들로 좁히고, '전체 기록'으로 푼다 */
export interface VisionFocus { dates: string[]; label: string }

export function EvidenceLog({ s, ev, period, focus, onClear }: Pick<NotationProps, 's' | 'ev'> & { period?: 'd' | 'w'; focus?: VisionFocus | null; onClear?: () => void }) {
  const [own, setRange] = useState<'7' | '35'>('35')
  const range = period ? (period === 'd' ? '7' : '35') : own
  const [kind, setKind] = useState<SupBehavior | 'all'>('all')
  const [shown, setShown] = useState(PAGE)
  const [openId, setOpenId] = useState<number | null>(null)
  const week = new Set(s.days.map((d) => d.date)), all35 = new Set(s.history35.map((d) => d.date))
  // 최근 7일을 보는데 0건이면 그 앞(최근 35일) 기록을 이어서 보여 준다(빈 판만 남기지 않는다)
  const weekEmpty = range === '7' && !ev.some((e) => week.has(eventDate(e)))
  const dates = range === '7' && !weekEmpty ? week : all35
  const inRange = ev.filter((e) => dates.has(eventDate(e)))
  const fset = focus ? new Set(focus.dates) : null
  const base = fset ? ev.filter((e) => fset.has(eventDate(e))) : inRange
  const list = (fset ? ev.filter((e) => fset.has(eventDate(e)) && (kind === 'all' || e.reason === kind)) : inRange.filter((e) => kind === 'all' || e.reason === kind)).sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  // 고른 줄이 없으면 가장 최근 건의 사진을 보여 준다
  const open = list.find((e) => e.eventId === openId) ?? list[0] ?? null
  const reset = () => { setShown(PAGE); setOpenId(null) }

  return (
    <div className="xe-log">
      <div className="xe-filters">
        {!period && !focus && <div className="xe-seg" role="group" aria-label="기간">
          {(['35', '7'] as const).map((r) => <button key={r} type="button" aria-pressed={range === r} onClick={() => { setRange(r); reset() }}>{r === '7' ? '최근 7일' : '최근 35일'}</button>)}
        </div>}
        <div className="xe-seg" role="group" aria-label="종류">
          <button type="button" aria-pressed={kind === 'all'} onClick={() => { setKind('all'); reset() }}>전체 {base.length}</button>
          {SUP_BEHAVIORS.map((b) => <button key={b} type="button" aria-pressed={kind === b} onClick={() => { setKind(b); reset() }}>{SUP_LABEL[b]} {base.filter((e) => e.reason === b).length}</button>)}
        </div>
      </div>
      {!focus && weekEmpty && inRange.length > 0 && <p className="xe-empty">최근 7일 0건 · 그 앞의 기록(최근 35일)</p>}
      {focus && <p className="xe-focus"><b>{focus.label}</b> {list.length}건 <button type="button" className="xe-more" onClick={onClear}>기간 전체 보기</button></p>}
      {!list.length ? <p className="xe-empty">{inRange.length ? '이 종류의 비몰입이 없습니다' : `${range === '7' ? '최근 7일' : '최근 35일'} 비몰입이 없습니다`}</p> : (
        <div className="xe-body">
          <table className="xe-table">
            <thead><tr><th scope="col">날짜</th><th scope="col">시작</th><th scope="col">종류</th><th scope="col">지속</th><th scope="col">확정 사진</th></tr></thead>
            <tbody>
              {list.slice(0, shown).map((e) => {
                const d = eventDate(e), on = e === open
                return (
                  <tr key={e.eventId} className={on ? 'xe-on' : undefined} tabIndex={0} aria-selected={on}
                    onClick={() => setOpenId(e.eventId)} onKeyDown={(k) => { if (k.key === 'Enter' || k.key === ' ') { k.preventDefault(); setOpenId(e.eventId) } }}>
                    <td>{md(d)} {dow(d)}</td>
                    <td>{clock(eventStartMinute(e))}</td>
                    <td className="xe-kind">{SUP_LABEL[e.reason]}</td>
                    <td>{hm(eventSeconds(e) / 60)}{e.endedAt ? '' : ' 이상'}</td>
                    <td className="xe-thumbs">{(() => { const im = e.images.find((x) => x.selectionType === 'CONFIRMATION') ?? e.images[0]; return im ? <img src={evidenceSrc(im.url)} alt="" loading="lazy" /> : null })()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {open ? (
            <section className="xe-detail" aria-label="근거 사진">
              <header><b>{SUP_LABEL[open.reason]}</b><span>{md(eventDate(open))} {dow(eventDate(open))} {clock(eventStartMinute(open))}부터 {hm(eventSeconds(open) / 60)}</span></header>
              <div className="xe-photos">
                {open.images.map((im) => (
                  <figure key={im.selectionType}>
                    <img src={evidenceSrc(im.url)} alt={`${SUP_LABEL[open.reason]} ${EVIDENCE_LABEL[im.selectionType]}`} />
                    <figcaption><b>{EVIDENCE_LABEL[im.selectionType]}</b> {time(im.capturedAt)}</figcaption>
                  </figure>
                ))}
                {!open.images.length && <p className="xe-empty">연결된 사진이 없습니다</p>}
              </div>
            </section>
          ) : null}
        </div>
      )}
      {list.length > shown && <button type="button" className="xe-more" onClick={() => setShown(shown + PAGE)}>{Math.min(PAGE, list.length - shown)}건 더 보기 <span>{shown} / {list.length}</span></button>}
    </div>
  )
}


