// 학습관 현황 첫 화면(best-practice-v5.md 3장): 지표마다 한 줄 = 단계별 학생 수 막대 + 7일 작은 추이선 + 숫자 하나.
// 단계 칸을 누르면 그 학생 목록, 지표 이름을 누르면 날짜별 자세히. 다수(정상)는 흐리게, 기준 넘음만 진하게.
import { md, type CareRow } from './useCareData.ts'
import { METRIC_KEYS, METRIC_LABEL, type MetricKey } from './branch.ts'
import { bandGroups, dailyOver, weekValue, weekText, BAND_LABEL, type Band, type Thresholds } from './bands.ts'

const ORDER: Band[] = ['over', 'watch', 'ok', 'none']
const DAILY_LABEL: Record<MetricKey, string> = { absence: '그날 결석', plan: '그날 계획 미제출', study: '그날 기준 넘음', start: '그날 기준 넘음', vision: '그날 사진 비율' }

/** 7일 작은 추이선: 값이 없는 날은 선을 끊는다. 점마다 마우스·초점으로 그날 값과 대상 인원, 누르면 그날 자세히 */
function Trend({ values, dates, unit, label, onDay }: { values: { v: number | null; base: number }[]; dates: string[]; unit: string; label: string; onDay?: (i: number) => void }) {
  const w = 150, h = 32, max = Math.max(1, ...values.map((x) => x.v ?? 0))
  const xAt = (i: number) => 6 + (i * (w - 12)) / 6
  const pts = values.map((x, i) => x.v === null ? null : [xAt(i), h - 5 - (x.v / max) * (h - 10)] as const)
  const segs: string[][] = []; let cur: string[] = []
  pts.forEach((p) => { if (p) cur.push(p.join(',')); else if (cur.length) { segs.push(cur); cur = [] } }); if (cur.length) segs.push(cur)
  return (
    <svg width={w} height={h} className="v5-trend" role="group" aria-label={label}>
      {segs.map((s, k) => <polyline key={k} points={s.join(' ')} />)}
      {values.map((x, i) => { const p = pts[i], text = `${md(dates[i])} ${x.v === null ? '값 없음' : `${Math.round(x.v)}${unit}`} (대상 ${x.base}명)`
        return <g key={i} role="button" tabIndex={0} aria-label={`${label} ${text}`} data-tip={text} onClick={() => onDay?.(i)} onKeyDown={(e) => { if (onDay && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onDay(i) } }} className="v5-day-hit">
          <rect x={xAt(i) - 9} y={0} width={18} height={h} fill="transparent" />
          {p ? <circle cx={p[0]} cy={p[1]} r={i === 6 ? 3 : 2} /> : <line x1={xAt(i) - 3} x2={xAt(i) + 3} y1={h - 5} y2={h - 5} className="v5-trend-gap" />}
        </g> })}
    </svg>
  )
}

interface Props { rows: CareRow[]; t: Thresholds; selected?: { metric: MetricKey; band: Band | null } | null; onBand: (metric: MetricKey, band: Band) => void; onMetric: (metric: MetricKey, day?: number) => void; detail?: (metric: MetricKey) => React.ReactNode }

export function BranchRows({ rows, t, selected, onBand, onMetric, detail }: Props) {
  const dates = rows[0]?.days.map((d) => d.date) ?? []
  return (<>
    <p className="v5-key"><span className="v5-key-over" />기준 넘음 <span className="v5-key-watch" />주의 <span className="v5-key-ok" />정상</p>
    <table className="v5-bands" aria-label="학습관 지표별 학생 단계">
      <thead><tr><th scope="col">지표</th><th scope="col">최근 7일 학생 단계</th><th scope="col">날마다</th><th scope="col">최근 7일</th></tr></thead>
      {METRIC_KEYS.map((m) => {
        const g = bandGroups(m, rows, t), total = rows.length || 1, vision = m === 'vision', daily = dailyOver(m, rows, t)
        const photo = (() => { let y = 0, n = 0; for (const r of rows) for (const v of r.vision) if (v.analyzedPhotos && !v.unsupportedAxes.includes('phone_interaction')) { y += v.axes.phone_interaction.yes; n += v.analyzedPhotos } return n ? Math.round((y / n) * 100) : null })()
        return (
          <tbody key={m}>
          <tr className={selected?.metric === m ? 'v5-bands-sel' : ''}>
            <th scope="row"><button type="button" className="v5-link" onClick={() => onMetric(m)}>{vision ? '휴대폰 사용 관찰 (예시)' : METRIC_LABEL[m]}</button></th>
            <td>
              {vision ? <span className="v5-muted">관리 기준 없음 · 이름을 누르면 학생별 비율</span> :
              <div className="v5-bandbar" role="group" aria-label={`${METRIC_LABEL[m]} 단계별 학생 수, 전체 ${rows.length}명`}>
                {ORDER.map((b) => g[b].length ? (
                  <button key={b} type="button" className={`v5-band v5-band-${b}`} style={{ flexGrow: g[b].length }} aria-pressed={selected?.metric === m && selected.band === b}
                    aria-label={`${BAND_LABEL[b]} ${g[b].length}명 보기`} data-tip={`${BAND_LABEL[b]} ${g[b].length}명 / 전체 ${rows.length}명`} onClick={() => onBand(m, b)}>
                    {(g[b].length / total >= 0.08 || b === 'none') && <span>{b === 'none' ? `기록 부족 ${g[b].length}` : g[b].length}</span>}
                  </button>) : null)}
              </div>}
            </td>
            <td><span className="v5-trend-name">{DAILY_LABEL[m]}</span><Trend values={daily} dates={dates} unit={vision ? '%' : '명'} label={DAILY_LABEL[m]} onDay={(i) => onMetric(m, i)} /></td>
            <td className="v5-bands-num">{vision ? <span data-tip="사진 합산 비율(예시)">사진 {photo === null ? '—' : `${photo}%`}</span> : g.none.length === rows.length ? <span className="v5-muted">기록 부족</span> : <span>기준 넘음 <b className={g.over.length ? 'v5-late' : ''}>{g.over.length}명</b></span>}</td>
          </tr>
          {detail && selected?.metric === m && selected.band === null && <tr className="v5-bands-detail"><td colSpan={4}>{detail(m)}</td></tr>}
          </tbody>)
      })}
    </table>
  </>)
}

/** 단계를 누르면 나오는 학생 목록: 이름 · 7일 값 한 마디. 이름을 누르면 학생 상세 */
export function BandList({ metric, band, rows, t, onOpen }: { metric: MetricKey; band: Band; rows: CareRow[]; t: Thresholds; onOpen: (r: CareRow) => void }) {
  const list = bandGroups(metric, rows, t)[band]
  if (!list.length) return <p className="v5-muted">해당 학생 없음</p>
  return (
    <ul className="v5-bandlist">
      {list.map((r) => <li key={r.student.studentId}><button type="button" className="v5-link" onClick={() => onOpen(r)}>{r.student.studentName}</button> <span className="v5-muted">{r.student.className}</span> <span>{weekText(metric, weekValue(metric, r))}</span></li>)}
    </ul>
  )
}
