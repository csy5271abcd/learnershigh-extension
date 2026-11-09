// Z′ 오늘 탭 명부(최종 시안, 사용 흐름 우선). Z와 같은 순서(오늘 점검 → 먼저 확인 → 이번 주 확인 → 참고 → 관리 중 → 특이 없음·기록 부족)로 나눈다.
// 학생 한 줄 = 이름 · 사유마다 '서버 사유 이름 + 그 값(단위 포함)'. 그림은 학생을 열면 상세에서 본다.
// 명부는 훑어보고 고르는 곳이라 막대·눈금을 두지 않는다. 특이 없음·기록 부족은 이름만.
import type { CareRow } from '../shared/useCareData.ts'
import { md, matchQuery } from '../shared/useCareData.ts'
import { TIER_TITLE, tileFor, type Tier, type Tile, type VisionSummary } from '../z/zModel.ts'
import { reasons } from './reasons.ts'

interface Props {
  rows: CareRow[]
  vision: Map<string, VisionSummary>
  query: string
  th: { shift: number; rate: number }
  onQuery: (q: string) => void
  onOpen: (r: CareRow, list: CareRow[]) => void
}

const ORDER: Tier[] = ['recheck', 'first', 'week', 'note', 'managed', 'normal', 'deferred']

export function RosterZ2({ rows, vision, query, th, onQuery, onOpen }: Props) {
  const tiles = rows.filter(matchQuery(query)).map((r) => tileFor(r, vision.get(r.student.studentId) ?? null))
  const by = new Map<Tier, Tile[]>(ORDER.map((k) => [k, tiles.filter((t) => t.tier === k).sort((a, b) => a.order - b.order || b.rank - a.rank || a.row.student.studentName.localeCompare(b.row.student.studentName, 'ko'))]))
  const order = ORDER.flatMap((k) => by.get(k)!.map((t) => t.row))
  const open = (r: CareRow) => onOpen(r, order)
  const days = rows[0].days

  const card = (k: Tier) => {
    const list = by.get(k)!
    if (!list.length) return null
    if (k === 'normal' || k === 'deferred') return (
      <section key={k} className="z-card z2r-card" aria-labelledby={`z-g-${k}`}>
        <h3 id={`z-g-${k}`} className="z-card-title">{TIER_TITLE[k]}<em>{list.length}명</em></h3>
        <ul className="z2r-names">{list.map((t) => <li key={t.row.student.studentId}><button type="button" id={`z-row-${t.row.student.studentId}`} data-care-roster-row={t.row.student.studentId} data-tip={[t.row.student.className, t.tip].filter(Boolean).join(' · ')} onClick={() => open(t.row)}>{t.row.student.studentName}</button></li>)}</ul>
      </section>
    )
    return (
      <section key={k} className={`z-card z2r-card z2r-${k}`} aria-labelledby={`z-g-${k}`}>
        <h3 id={`z-g-${k}`} className="z-card-title">{TIER_TITLE[k]}<em>{list.length}명</em></h3>
        <ul className="z2r-rows">
          {list.map((t) => {
            const r = t.row, s = r.student
            const rs = reasons(r, th)
            const said = rs.map((x) => `${x.label}${x.value ? ` ${x.value}` : ''}`).join(', ') || t.why
            return (
              <li key={s.studentId}>
                <button type="button" id={`z-row-${s.studentId}`} data-care-roster-row={s.studentId} onClick={() => open(r)} aria-label={`${s.studentName} ${s.className}, ${said}`}>
                  <span className="z2r-who"><b>{s.studentName}</b><span>{s.className}</span></span>
                  <span className="z2r-rs">{rs.length ? rs.map((x) => <span key={x.label} className="z2r-r"><b>{x.label}</b>{x.value && <span>{x.value}</span>}</span>) : <span className="z2r-r"><b>{t.why}</b></span>}</span>
                  <span className="z2r-go" aria-hidden="true">›</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    )
  }
  return (
    <div className="z-roster">
      <div className="z-toolbar">
        <span className="z-muted">최근 7일 {md(days[0].date)}–{md(days[6].date)} · 전체 {rows.length}명</span>
        <input className="z-search" type="search" aria-label="학생 검색" placeholder="이름 또는 반 검색" value={query} onChange={(e) => onQuery(e.target.value)} />
      </div>
      {!tiles.length ? <p className="sc-state">검색 결과가 없습니다.</p> : <>
        {card('recheck')}
        {card('first')}
        {card('week')}
        {card('note')}
        {card('managed')}
        <div className="z-card-pair">{card('normal')}{card('deferred')}</div>
      </>}
    </div>
  )
}
