// 학습관 현황 첫 화면(best-practice-v5.md 3장): 지표마다 한 줄 = 단계별 학생 수 막대 + 7일 작은 추이선 + 숫자 하나.
// 단계 칸을 누르면 그 학생 목록, 지표 이름을 누르면 날짜별 자세히. 다수(정상)는 흐리게, 기준 넘음만 진하게.
import { md, type CareRow } from './useCareData.ts'
import { METRIC_KEYS, METRIC_LABEL, type MetricKey } from './branch.ts'
import { bandGroups, dailyOver, weekValue, weekText, BAND_LABEL, VISION_BAND_LABEL, type Band, type Thresholds } from './bands.ts'

const ORDER: Band[] = ['over', 'watch', 'ok', 'none']

/** 7일 작은 추이선. 숫자는 쓰지 않고 칸 안내로만 */
function Trend({ values, dates, unit }: { values: (number | null)[]; dates: string[]; unit: string }) {
  const w = 120, h = 30, max = Math.max(1, ...values.map((v) => v ?? 0))
  const pts = values.map((v, i) => v === null ? null : [4 + (i * (w - 8)) / 6, h - 4 - (v / max) * (h - 8)] as const)
  const line = pts.filter(Boolean).map((p) => p!.join(',')).join(' ')
  const last = [...pts].reverse().find(Boolean)
  return (
    <svg width={w} height={h} className="v5-trend" role="img" aria-label={`최근 7일: ${values.map((v, i) => `${md(dates[i])} ${v === null ? '없음' : `${Math.round(v)}${unit}`}`).join(', ')}`}>
      <polyline points={line} />
      {last && <circle cx={last[0]} cy={last[1]} r={2.5} />}
    </svg>
  )
}

interface Props { rows: CareRow[]; t: Thresholds; selected?: { metric: MetricKey; band: Band | null } | null; onBand: (metric: MetricKey, band: Band) => void; onMetric: (metric: MetricKey) => void }

export function BranchRows({ rows, t, selected, onBand, onMetric }: Props) {
  const dates = rows[0]?.days.map((d) => d.date) ?? []
  return (
    <table className="v5-bands" aria-label="학습관 지표별 학생 단계">
      <thead><tr><th scope="col">지표</th><th scope="col">학생 단계</th><th scope="col">최근 7일 추이</th><th scope="col">기준 넘음</th></tr></thead>
      <tbody>{METRIC_KEYS.map((m) => {
        const g = bandGroups(m, rows, t), total = rows.length || 1, vision = m === 'vision'
        const labels = vision ? VISION_BAND_LABEL : BAND_LABEL
        return (
          <tr key={m} className={selected?.metric === m ? 'v5-bands-sel' : ''}>
            <th scope="row"><button type="button" className="v5-link" onClick={() => onMetric(m)}>{METRIC_LABEL[m]}{vision ? ' (예시)' : ''}</button></th>
            <td>
              <div className="v5-bandbar" role="group" aria-label={`${METRIC_LABEL[m]} 단계별 학생 수`}>
                {ORDER.map((b) => g[b].length ? (
                  <button key={b} type="button" className={`v5-band v5-band-${vision && b !== 'none' ? `v-${b}` : b}`} style={{ flexGrow: g[b].length }} aria-pressed={selected?.metric === m && selected.band === b}
                    aria-label={`${labels[b]} ${g[b].length}명 보기`} data-tip={`${labels[b]} ${g[b].length}명`} onClick={() => onBand(m, b)}>
                    {g[b].length / total >= 0.08 && <span>{g[b].length}</span>}
                  </button>) : null)}
              </div>
            </td>
            <td><Trend values={dailyOver(m, rows, t)} dates={dates} unit={vision ? '%' : '명'} /></td>
            <td className="v5-bands-num">{vision ? <span className="v5-muted">참고</span> : <b className={g.over.length ? 'v5-late' : ''}>{g.over.length}명</b>}</td>
          </tr>)
      })}</tbody>
    </table>
  )
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
