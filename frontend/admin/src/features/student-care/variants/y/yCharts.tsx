// Y 전용 그림(데이터 분석 화면). 칸마다 '그 학생의 평소에서 얼마나 벗어났나'를 같은 꼴로 그린다: 가운데 세로선 = 평소, 막대 = 벗어난 방향과 크기.
// 결석·계획 미제출은 최근 7일 날짜별 점(어느 날인지 보이게). 펼친 줄은 지표마다 최근 5주(모든 주에 날짜·값).
import type { CareRow } from '../shared/useCareData.ts'
import { md } from '../shared/useCareData.ts'
import { EVIDENCE_LABEL, eventDate, evidenceSrc, SUP_LABEL, type SupEvent } from '../supervisor/supervisorClient.ts'
import { weekLabel, type Cell, type Day } from './yMetrics.ts'

/** 최근 7일 날짜별 점: 빨강 = 결석·미제출(서버 사유가 있을 때) / 진한 회색 = 결석·미제출(사유 없음), 연회색 = 입실·제출, 빈 원 = 예정 없음, 점선 = 기록 없음 */
export function DayDots({ days, bad, flag }: { days: Day[]; bad: (d: Day) => boolean; flag: boolean }) {
  const W = 7 * 11 + 2
  return (
    <svg width={W} height={14} className="yd" aria-hidden="true">
      {days.map((d, i) => { const cx = 6 + i * 11, b = bad(d)
        return d.attendance === 'unknown' ? <line key={d.date} x1={cx - 3.5} x2={cx + 3.5} y1={7} y2={7} className="yd-none" />
          : d.attendance === 'off' && !b ? <circle key={d.date} cx={cx} cy={7} r={3.5} className="yd-off" />
          : <circle key={d.date} cx={cx} cy={7} r={b ? 4.5 : 3.5} className={b ? (flag ? 'yd-flag' : 'yd-bad') : 'yd-ok'} /> })}
    </svg>
  )
}

/** 평소 대비 막대: 가운데 = 평소. 나쁜 쪽으로 벗어나면 막대가 그쪽으로, 끝을 넘으면 끝에 꺾쇠 */
export function Diverge({ cell, span, rightIsBad }: { cell: Cell; span: number; rightIsBad: boolean }) {
  const W = 100, c = W / 2, d = cell.dev
  const len = d === null ? 0 : (Math.min(Math.abs(d), span) / span) * (c - 4)
  const toRight = d !== null && d > 0, bad = d !== null && (toRight === rightIsBad) && Math.abs(d) > 0
  const over = d !== null && Math.abs(d) > span
  return (
    <svg viewBox={`0 0 ${W} 16`} preserveAspectRatio="none" className="yv" aria-hidden="true">
      <rect x={0} y={7} width={W} height={2} className="yv-track" />
      {d !== null && len > 0 && <rect x={toRight ? c : c - len} y={3} width={len} height={10} rx={3} className={cell.flag ? 'yv-flag' : bad ? 'yv-bad' : 'yv-good'} />}
      {over && <path d={toRight ? `M${W - 5} 3 l4 5 l-4 5` : `M5 3 l-4 5 l4 5`} className="yv-over" />}
      <rect x={c - 1} y={0} width={2} height={16} className="yv-mid" />
    </svg>
  )
}

/** 최근 5주 주별 막대: 모든 주에 날짜와 값, 최근 7일 진하게. 누를 수 있으면 그 주를 고른다 */
export function Trend5({ r, vals, text, flag, unit, picked, onPick }: { r: CareRow; vals: (number | null)[]; text: (v: number) => string; flag: boolean; unit: string; picked?: number | null; onPick?: (w: number) => void }) {
  const top = Math.max(1, ...vals.map((v) => Math.abs(v ?? 0)))
  return (
    <ol className="yt5" aria-label={`최근 5주 · ${unit}`}>
      {vals.map((v, w) => { const last = w === 4, label = weekLabel(r, w), can = !!onPick && !!v
        const body = <>
          <span className={`yt5-n${last ? ' yt5-strong' : ''}${last && flag ? ' y-flag' : ''}`}>{v === null ? '–' : text(v)}</span>
          <span className="yt5-bar">{v !== null && v !== 0 && <i className={last ? (flag ? 'yt5-flag' : 'yt5-now') : 'yt5-old'} style={{ height: `${(Math.abs(v) / top) * 100}%` }} />}</span>
          <span className={`yt5-d${last ? ' yt5-strong' : ''}`}>{label}</span>
        </>
        return <li key={w} data-tip={`${label} · ${v === null ? '기록 없음' : `${text(v)} ${unit}`}`}>{can ? <button type="button" aria-pressed={picked === w} onClick={() => onPick!(w)}>{body}</button> : <div>{body}</div>}</li> })}
    </ol>
  )
}

/** 비몰입 사진(확정 사진). dates를 주면 그 날짜들의 건만 */
export function YPhotos({ r, ev, dates, label }: { r: CareRow; ev: SupEvent[]; dates?: string[] | null; label?: string }) {
  const set = new Set(dates ?? r.history35.map((d) => d.date))
  const list = [...ev].filter((e) => set.has(eventDate(e))).sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  if (!list.length) return <p className="y-muted">{label ?? '최근 35일'} 비몰입 0건</p>
  return (
    <div className="yp">
      {list.slice(0, dates ? 12 : 6).map((e) => { const im = e.images.find((x) => x.selectionType === 'CONFIRMATION') ?? e.images[e.images.length - 1]
        return <figure key={e.eventId}>{im ? <img src={evidenceSrc(im.url)} alt={`${SUP_LABEL[e.reason]} ${EVIDENCE_LABEL[im.selectionType]}`} loading="lazy" /> : <span className="yp-none">사진 없음</span>}<figcaption><b>{SUP_LABEL[e.reason]}</b> {md(eventDate(e))}</figcaption></figure> })}
    </div>
  )
}
