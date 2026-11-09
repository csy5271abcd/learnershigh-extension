// Z안 오늘 탭 명부. 관리자가 볼 순서대로 먼저 확인 → 이번 주 확인 → 참고로 나누고, 학생은 이름·큰 숫자 하나·사유의 타일로 보인다.
// 관리 중은 점검일과 함께, 특이 없음·기록 부족은 이름만 촘촘히 둔다. 전원 명부(F05)는 유지한다.
import type { CareRow } from '../shared/useCareData.ts'
import { md, matchQuery } from '../shared/useCareData.ts'
import { TIER_TITLE, tileFor, type Tier, type Tile, type VisionSummary } from './zModel.ts'

interface Props {
  rows: CareRow[]
  vision: Map<string, VisionSummary>
  query: string
  onQuery: (q: string) => void
  onOpen: (r: CareRow, list: CareRow[]) => void
}

const ORDER: Tier[] = ['recheck', 'first', 'week', 'note', 'managed', 'normal', 'deferred']

function TileButton({ t, onOpen }: { t: Tile; onOpen: () => void }) {
  const s = t.row.student
  return (
    <li>
      <button type="button" id={`z-row-${s.studentId}`} data-care-roster-row={s.studentId} className={`z-tile z-tile-${t.tier}`} onClick={onOpen} data-tip={t.tip || undefined} aria-label={`${s.studentName} ${s.className}${t.tip ? `, ${t.tip}` : ''}`}>
        <span className="z-tile-who"><b>{s.studentName}</b><span>{s.className}</span></span>
        <span className={`z-tile-val${t.strong ? ' z-tile-strong' : ''}`}>{t.value}<small>{t.unit}</small></span>
        <span className="z-tile-why">{t.why}</span>
        {t.more.length > 0 && <span className="z-tile-sub">{t.more.map((m) => <span key={m} className="z-tile-more">{m}</span>)}</span>}
      </button>
    </li>
  )
}

export function Roster({ rows, vision, query, onQuery, onOpen }: Props) {
  const tiles = rows.filter(matchQuery(query)).map((r) => tileFor(r, vision.get(r.student.studentId) ?? null))
  const by = new Map<Tier, Tile[]>(ORDER.map((k) => [k, tiles.filter((t) => t.tier === k).sort((a, b) => a.order - b.order || b.rank - a.rank || a.row.student.studentName.localeCompare(b.row.student.studentName, 'ko'))]))
  const order = ORDER.flatMap((k) => by.get(k)!.map((t) => t.row))
  const open = (r: CareRow) => onOpen(r, order)
  const card = (k: Tier) => {
    const list = by.get(k)!
    if (!list.length) return null
    const compact = k === 'normal' || k === 'deferred'
    return (
      <section key={k} className={`z-card z-tier z-tier-${k}`} aria-labelledby={`z-g-${k}`}>
        <h3 id={`z-g-${k}`} className="z-card-title">{TIER_TITLE[k]}<em>{list.length}명</em></h3>
        {compact
          ? <ul className="z-names">{list.map((t) => <li key={t.row.student.studentId}><button type="button" id={`z-row-${t.row.student.studentId}`} data-care-roster-row={t.row.student.studentId} className="z-name-chip" data-tip={[t.row.student.className, t.tip].filter(Boolean).join(' · ')} onClick={() => open(t.row)}>{t.row.student.studentName}</button></li>)}</ul>
          : <ul className="z-tiles">{list.map((t) => <TileButton key={t.row.student.studentId} t={t} onOpen={() => open(t.row)} />)}</ul>}
      </section>
    )
  }
  return (
    <div className="z-roster">
      <div className="z-toolbar">
        <span className="z-muted">최근 7일 {md(rows[0].days[0].date)}–{md(rows[0].days[6].date)} · 전체 {rows.length}명</span>
        <input className="z-search" type="search" aria-label="학생 검색" placeholder="이름 또는 반 검색" value={query} onChange={(e) => onQuery(e.target.value)} />
      </div>
      {!tiles.length ? <p className="sc-state">검색 결과가 없습니다.</p> : <>
        {card('recheck')}
        {card('first')}
        {card('week')}
        <div className="z-card-pair">{card('note')}{card('managed')}</div>
        <div className="z-card-pair">{card('normal')}{card('deferred')}</div>
      </>}
    </div>
  )
}
