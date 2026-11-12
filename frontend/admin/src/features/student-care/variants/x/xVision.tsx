// X 전용 사진 관찰 건수 그림(종류별 작은 그림 셋, 일간 7칸·주간 5칸).
import { useWidth } from '../z/useWidth.ts'
import { md } from '../shared/useCareData.ts'
import { eventDate, SUP_BEHAVIORS, SUP_LABEL, type SupEvent } from '../supervisor/supervisorClient.ts'
import { STATE, weeksOf, type NotationProps } from '../notation/kit.tsx'

const group = (ev: SupEvent[]) => { const m = new Map<string, SupEvent[]>(); for (const e of ev) { const k = eventDate(e); m.set(k, [...(m.get(k) ?? []), e]) } return m }

/** D6 종류별 건수(작은 그림 셋): 휴대폰 사용·엎드림·자리 비움을 칸 하나씩. 칸마다 막대 = 기간 한 칸의 건수(최근 7일이면 날마다 7개, 최근 5주면 주마다 5개),
 * 세 칸이 같은 눈금이고 막대 위에 건수를 적는다. 마지막 막대(최근 날·최근 7일)는 진하게, 앞 칸들의 평균보다 1.5배·2건 이상 늘면 빨강 */
export type VisionPick = (dates: string[], kind: (typeof SUP_BEHAVIORS)[number], label: string) => void

function VisionCountBars(p: NotationProps & { mode: 'day' | 'week'; onPick?: VisionPick; picked?: string | null }) {
  const { s, ev, mode, onPick, picked } = p
  const [ref, w] = useWidth<HTMLDivElement>()
  const buckets = mode === 'week' ? weeksOf(s) : s.days.map((d) => [d])
  const n = buckets.length
  const m = group(ev)
  const c = SUP_BEHAVIORS.map((b) => buckets.map((bk) => bk.reduce((a, d) => a + (m.get(d.date) ?? []).filter((e) => e.reason === b).length, 0)))
  const top = Math.max(mode === 'week' ? 4 : 2, ...c.flat())
  // 기간 안에 비몰입이 한 건도 없으면 빈 그림 대신 한 줄로(결석한 날 수도 함께)
  if (!c.flat().some(Boolean)) { const off = buckets.flat().filter((d) => d.attendance === 'absent').length
    // 최근 7일이 0건이면 빈 판 대신 최근 5주 그림을 이어서 보여 준다(그 앞에 무엇이 있었는지)
    if (mode === 'day') { const all = new Set(s.history35.map((d) => d.date)); if (ev.some((e) => all.has(eventDate(e)))) return <div ref={ref} className="xn-plot"><p className="xn-empty">최근 7일 비몰입 0건{off ? ` · 이 기간 결석 ${off}일` : ''} · 아래는 최근 5주</p><VisionCountBars {...p} mode="week" /></div> }
    return <div ref={ref} className="xn-plot"><p className="xn-empty">{mode === 'week' ? '최근 5주' : '최근 7일'} 비몰입 없음{off ? ` · 이 기간 결석 ${off}일` : ''}</p></div> }
  // 넓으면 세 칸 나란히, 좁으면(칸 이름·날짜가 겹칠 만큼) 위아래로 쌓는다
  const shownTypes = SUP_BEHAVIORS.filter((_, k) => c[k].some(Boolean)), zeroTypes = SUP_BEHAVIORS.filter((_, k) => !c[k].some(Boolean))
  const cols = w >= 760 ? Math.max(1, shownTypes.length) : 1, gap = 20, pw = (w - gap * (cols - 1)) / cols, PH = 190, T = 40, B = 54, H = PH * Math.ceil(shownTypes.length / cols)
  const Y = (v: number) => T + (1 - v / top) * (PH - T - B)
  const label = (bk: typeof buckets[number], g: number) => mode === 'week' ? (g === n - 1 ? '최근 7일' : `${md(bk[0].date)}~`) : `${md(bk[0].date)}`
  return (
    <div ref={ref} className="xn-plot">
      <svg width={w} height={H} role="img" aria-label={`종류별 ${mode === 'week' ? '최근 5주 주별' : '최근 7일 날짜별'} 비몰입 건수`}>
        {shownTypes.map((b, j) => {
          const k = SUP_BEHAVIORS.indexOf(b)
          const x0 = (j % cols) * (pw + gap), cw = pw / n, bw = Math.min(30, cw * 0.62)
          const prev = c[k].slice(0, n - 1).reduce((a, x) => a + x, 0) / (n - 1)
          return <g key={b} transform={`translate(0 ${Math.floor(j / cols) * PH})`}>
            <text x={x0} y={14} className="xn-tick xn-strong">{SUP_LABEL[b]}{prev > 0 && <tspan className="xn-tick" dx={8}>{mode === 'week' ? '지난 4주' : '앞 6일'} 평균 {Number.isInteger(prev) ? prev : prev.toFixed(1)}건</tspan>}</text>
            {buckets.map((bk, g) => {
              const v = c[k][g], last = g === n - 1, cx = x0 + cw * (g + 0.5)
              // 비몰입은 서버 판정 기준이 없어 빨강을 쓰지 않는다(최근 칸만 진하게, 앞 칸 평균은 점선)
              const more = false
              const off = mode === 'day' && bk[0].attendance !== 'present'
              const tip = `${SUP_LABEL[b]} · ${mode === 'week' ? (last ? '최근 7일' : `${md(bk[0].date)}–${md(bk[6].date)}`) : `${md(bk[0].date)} ${bk[0].dow}`} ${off ? STATE[bk[0].attendance] : `${v}건`}`
              // 막대(건수가 있는 칸)를 누르면 아래 기록이 그 날·그 종류의 건으로 좁혀지고 근거 사진이 열린다
              const pickKey = `${b}:${bk[0].date}`, can = !!onPick && v > 0
              const go = () => onPick!(bk.map((d) => d.date), b, `${mode === 'week' ? (last ? '최근 7일' : `${md(bk[0].date)}–${md(bk[6].date)}`) : `${md(bk[0].date)} ${bk[0].dow}`} ${SUP_LABEL[b]}`)
              return <g key={g} tabIndex={can ? 0 : -1} data-tip={tip} aria-label={tip} className={can ? 'xp-pick' : undefined} onClick={can ? go : undefined} onKeyDown={can ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go() } } : undefined}>
                <rect x={x0 + cw * g} y={T - 20} width={cw} height={PH - T - B + 20} className={picked === pickKey ? 'xn-hit xp-on' : 'xn-hit'} />
                <rect x={cx - bw / 2} y={Y(v)} width={bw} height={Math.max(v ? 2 : 0, Y(0) - Y(v))} rx={3} className={last ? (more ? 'xd-flag' : 'xd-now') : 'xd-old'} />
                {!off && <text x={cx} y={Y(v) - 6} textAnchor="middle" className={`xn-tick xn-halo${last ? ' xn-strong' : ''}${more ? ' xn-flag' : ''}`}>{v}</text>}
                <text x={cx} y={PH - B + 18} textAnchor="middle" className={`xn-tick${last ? ' xn-strong' : ''}${mode === 'day' ? ' xn-small' : ''}`}>{label(bk, g)}</text>
                {/* 결석·예정 없음은 다른 그림처럼 날짜 밑에 */}
                {off && <text x={cx} y={PH - B + 33} textAnchor="middle" className={`xn-tick xn-small${bk[0].attendance === 'absent' ? ' xn-flag' : ''}`}>{bk[0].attendance === 'absent' ? '결석' : '없음'}</text>}
              </g>
            })}
            <line x1={x0} x2={x0 + pw} y1={Y(0)} y2={Y(0)} className="xn-axis" />
            {/* 평소 = 앞 칸들의 평균(일간: 앞 6일, 주간: 지난 4주). 마지막 막대를 이 선과 비교한다 */}
            {prev > 0 && <line x1={x0} x2={x0 + pw} y1={Y(prev)} y2={Y(prev)} className="xd-usual" />}
          </g>
        })}
      </svg>
      {zeroTypes.length > 0 && <p className="xn-empty">{zeroTypes.map((b) => `${SUP_LABEL[b]} 0건`).join(' · ')}</p>}
    </div>
  )
}
export const VisionWeekBars = (p: NotationProps & { onPick?: VisionPick; picked?: string | null }) => <VisionCountBars {...p} mode="week" />
export const VisionDayBars = (p: NotationProps & { onPick?: VisionPick; picked?: string | null }) => <VisionCountBars {...p} mode="day" />
