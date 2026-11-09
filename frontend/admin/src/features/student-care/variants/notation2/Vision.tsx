// 사진 관찰 표시법 2차 5종. 이미지 인식 감독관 API의 비몰입 이벤트(휴대폰 사용·엎드림·자리 비움, 시각·지속·근거 사진 3장)를 쓴다. 코드는 그림마다 따로다.
import { useWidth } from '../z/useWidth.ts'
import { md } from '../shared/useCareData.ts'
import { EVIDENCE_LABEL, eventDate, eventSeconds, eventStartMinute, evidenceSrc, SUP_BEHAVIORS, SUP_LABEL, type SupEvent } from '../supervisor/supervisorClient.ts'
import { absentRuns, clock, clockTick, day, dropDay, hm, STATE, weeksOf, type NotationProps } from '../notation/kit.tsx'

const group = (ev: SupEvent[]) => { const m = new Map<string, SupEvent[]>(); for (const e of ev) { const k = eventDate(e); m.set(k, [...(m.get(k) ?? []), e]) } return m }

/** D1 근거 사진 카드(최근 7일): 비몰입 한 건 = 카드 하나. 큰 사진은 비몰입이 확정된 순간, 작은 두 장은 처음 보인 때와 중간. 긴 순서로 6건 */
export function VisionCards({ s, ev }: NotationProps) {
  const recent = new Set(s.days.map((d) => d.date))
  const list = ev.filter((e) => recent.has(eventDate(e))).sort((a, b) => eventSeconds(b) - eventSeconds(a)).slice(0, 6)
  if (!list.length) return <p className="n2-empty">최근 7일 비몰입 없음</p>
  return (
    <div className="d1-grid">
      {list.map((e) => {
        const d = s.days.find((x) => x.date === eventDate(e))!
        const main = e.images.find((im) => im.selectionType === 'CONFIRMATION') ?? e.images[e.images.length - 1]
        const side = e.images.filter((im) => im !== main)
        return (
          <figure key={e.eventId} className="d1-card">
            <div className="d1-photos">
              {main && <img className="d1-main" src={evidenceSrc(main.url)} alt={`${SUP_LABEL[e.reason]} ${EVIDENCE_LABEL[main.selectionType]}`} loading="lazy" />}
              <div className="d1-side">{side.map((im) => <img key={im.selectionType} src={evidenceSrc(im.url)} alt={`${SUP_LABEL[e.reason]} ${EVIDENCE_LABEL[im.selectionType]}`} loading="lazy" data-tip={EVIDENCE_LABEL[im.selectionType]} />)}</div>
            </div>
            <figcaption><b>{SUP_LABEL[e.reason]}</b><span>{md(d.date)} {d.dow} {clock(eventStartMinute(e))} · {hm(eventSeconds(e) / 60)}</span></figcaption>
          </figure>
        )
      })}
    </div>
  )
}

/** D2 종류별 작은 막대 줄(35일): 종류마다 한 줄, 날짜마다 그날 건수만큼 칸을 쌓은 막대(칸 하나 = 한 번). 세 줄이 같은 날짜 열을 공유해, 어느 날 무엇이 몇 번인지 한 번에 본다 */
export function VisionTypeRows({ s, ev, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const m = group(ev)
  const days = s.history35
  const counts = SUP_BEHAVIORS.map((b) => days.map((d) => (m.get(d.date) ?? []).filter((e) => e.reason === b).length))
  const maxN = Math.max(2, ...counts.flat())
  const L = 84, R = 12, unit = 7, gap = 1.5, rowH = maxN * (unit + gap) + 14, H = rowH * 3 + 44
  const cw = (w - L - R) / 35, bw = Math.min(14, cw * 0.62)
  return (
    <div ref={ref} className="n2-plot">
      <svg width={w} height={H} role="img" aria-label="최근 35일 종류별 비몰입 건수">
        <rect x={L + cw * 28} y={0} width={cw * 7} height={rowH * 3} className="d2-recent" />
        {SUP_BEHAVIORS.map((b, r) => {
          const base = rowH * (r + 1) - 6
          return <g key={b}>
            <text x={0} y={base - 4} className="n2-tick n2-strong">{SUP_LABEL[b]}</text>
            <line x1={L} x2={w - R} y1={base} y2={base} className="n2-axis" />
            {days.map((d, i) => Array.from({ length: counts[r][i] }, (_, k) => <rect key={`${d.date}-${k}`} x={L + cw * (i + 0.5) - bw / 2} y={base - (k + 1) * (unit + gap)} width={bw} height={unit} rx={1.5} className={i < 28 ? 'd2-old' : dropDay(d, th.drop) ? 'd2-flag' : 'd2-now'} />))}
          </g>
        })}
        {days.map((d, i) => { const n = SUP_BEHAVIORS.map((b, r) => counts[r][i] ? `${SUP_LABEL[b]} ${counts[r][i]}번` : '').filter(Boolean); const tip = `${day(d)} · ${d.attendance !== 'present' ? STATE[d.attendance] : n.length ? n.join(', ') : '비몰입 없음'}`; return <g key={d.date}>
          <rect x={L + cw * i} y={0} width={cw} height={rowH * 3} className="n2-hit" tabIndex={i >= 28 ? 0 : -1} data-tip={tip} aria-label={i >= 28 ? tip : undefined} />
          {d.dow === '월' && i < 26 && <text x={L + cw * (i + 0.5)} y={rowH * 3 + 18} textAnchor="middle" className="n2-tick">{md(d.date)}</text>}
        </g> })}
        <text x={L + cw * 31.5} y={rowH * 3 + 18} textAnchor="middle" className="n2-tick n2-strong">최근 7일</text>
        {absentRuns(days).map(([a, b]) => <text key={a} x={L + cw * ((a + b + 1) / 2)} y={rowH * 3 + 36} textAnchor="middle" className="n2-tick n2-flag">결석</text>)}
      </svg>
    </div>
  )
}

/** D3 종류별 건수, 최근 7일과 평소(나란히 가로 막대): 종류마다 두 줄, 위 회색 = 지난 4주의 한 주 평균 건수, 아래 = 최근 7일 건수.
 * 막대 끝에 값을 바로 적고(0건도 적는다), 평소의 1.5배 이상이면서 2건 이상 늘면 빨강 */
export function VisionWeekVsUsual({ s, ev }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const recent = new Set(s.days.map((d) => d.date)), past = new Set(s.history35.slice(0, 28).map((d) => d.date))
  const rowsData = SUP_BEHAVIORS.map((b) => ({ b, now: ev.filter((e) => e.reason === b && recent.has(eventDate(e))).length, usual: ev.filter((e) => e.reason === b && past.has(eventDate(e))).length / 4 }))
  const maxV = Math.max(4, ...rowsData.flatMap((r) => [r.now, r.usual])), step = maxV > 20 ? 10 : maxV > 8 ? 4 : 2, top = Math.ceil(maxV / step) * step
  const L = 96, R = 96, rowH = 52, T = 8, H = T + rowH * 3 + 28
  const X = (v: number) => L + (v / top) * (w - L - R)
  const n = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(1)}건`
  return (
    <div ref={ref} className="n2-plot">
      <svg width={w} height={H} role="img" aria-label="종류별 최근 7일 비몰입 건수와 지난 4주의 한 주 평균">
        {Array.from({ length: top / step + 1 }, (_, k) => k * step).map((v) => <g key={v}><line x1={X(v)} x2={X(v)} y1={T} y2={H - 24} className="n2-grid" /><text x={X(v)} y={H - 8} textAnchor="middle" className="n2-tick">{v}건</text></g>)}
        {rowsData.map((r, i) => {
          const y0 = T + rowH * i, more = r.now >= r.usual * 1.5 && r.now - r.usual >= 2
          const tip = `${SUP_LABEL[r.b]} · 최근 7일 ${n(r.now)} · 지난 4주 한 주 평균 ${n(r.usual)}`
          return <g key={r.b} tabIndex={0} data-tip={tip} aria-label={tip}>
            <text x={L - 12} y={y0 + rowH / 2 + 2} textAnchor="end" className="n2-tick n2-strong">{SUP_LABEL[r.b]}</text>
            <rect x={L} y={y0 + 8} width={Math.max(r.usual ? 2 : 0, X(r.usual) - L)} height={14} rx={3} className="d3-usual" />
            <text x={X(r.usual) + 8} y={y0 + 19} className="n2-tick">4주 평균 {n(r.usual)}</text>
            <rect x={L} y={y0 + 26} width={Math.max(r.now ? 2 : 0, X(r.now) - L)} height={14} rx={3} className={more ? 'd3-flag' : 'd3-now'} />
            <text x={X(r.now) + 8} y={y0 + 37} className={`n2-tick n2-strong${more ? ' n2-flag' : ''}`}>최근 7일 {n(r.now)}</text>
          </g>
        })}
        <line x1={L} x2={L} y1={T} y2={H - 24} className="n2-axis" />
      </svg>
    </div>
  )
}

/** D4 시간대 막대(1시간 구간, 35일): 비몰입이 시작된 시각을 1시간 칸에 모은 막대. 지난 4주는 회색, 최근 7일은 그 위에 빨강으로 쌓아, 그 학생이 주로 몇 시에 흐트러지는지 본다 */
export function VisionHourBars({ s, ev }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const recent = new Set(s.days.map((d) => d.date))
  const starts = ev.map(eventStartMinute)
  if (!starts.length) return <div ref={ref} className="n2-plot"><p className="n2-empty">최근 35일 비몰입 없음</p></div>
  const lo = Math.floor(Math.min(...starts) / 60), hi = Math.ceil((Math.max(...starts) + 1) / 60)
  const hours = Array.from({ length: Math.max(3, hi - lo) }, (_, k) => lo + k)
  const c = hours.map((h) => ({ old: ev.filter((e) => !recent.has(eventDate(e)) && Math.floor(eventStartMinute(e) / 60) === h).length, now: ev.filter((e) => recent.has(eventDate(e)) && Math.floor(eventStartMinute(e) / 60) === h).length }))
  const maxC = Math.max(2, ...c.map((x) => x.old + x.now)), step = maxC > 20 ? 10 : maxC > 8 ? 4 : 2, top = Math.ceil(maxC / step) * step
  const H = 230, L = 52, R = 16, T = 12, B = 34, cw = (w - L - R) / hours.length
  const Y = (v: number) => T + (1 - v / top) * (H - T - B)
  return (
    <div ref={ref} className="n2-plot">
      <svg width={w} height={H} role="img" aria-label="비몰입이 시작된 시각 분포">
        {Array.from({ length: top / step + 1 }, (_, k) => k * step).map((v) => <g key={v}><line x1={L} x2={w - R} y1={Y(v)} y2={Y(v)} className="n2-grid" /><text x={L - 10} y={Y(v) + 4} textAnchor="end" className="n2-tick">{v}번</text></g>)}
        {hours.map((h, k) => {
          const x0 = L + cw * k + 3, bw = cw - 6, tip = `${h}시대 · 지난 4주 ${c[k].old}번 · 최근 7일 ${c[k].now}번`
          return <g key={h} tabIndex={0} data-tip={tip} aria-label={tip}>
            {c[k].old > 0 && <rect x={x0} y={Y(c[k].old)} width={bw} height={Y(0) - Y(c[k].old)} className="d4-old" />}
            {c[k].now > 0 && <rect x={x0} y={Y(c[k].old + c[k].now)} width={bw} height={Y(c[k].old) - Y(c[k].old + c[k].now)} className="d4-now" />}
            <text x={L + cw * k} y={H - 12} textAnchor="middle" className="n2-tick">{clockTick(h * 60)}</text>
          </g>
        })}
        <line x1={L} x2={w - R} y1={Y(0)} y2={Y(0)} className="n2-axis" />
      </svg>
    </div>
  )
}

/** D5 공부 시간 대비 비몰입 비율(35일 꺾은선, 세로 = %): 그날 비몰입 시간 ÷ 공부 시간. 공부 시간이 기준만큼 줄어든 날의 점은 빨강이라, 비몰입이 많았던 날과 공부가 줄어든 날이 겹치는지 본다 */
export function VisionShareLine({ s, ev, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const m = group(ev)
  const days = s.history35
  const share = days.map((d) => d.attendance === 'present' && d.minutes ? ((m.get(d.date) ?? []).reduce((a, e) => a + eventSeconds(e) / 60, 0) / d.minutes) * 100 : null)
  const maxV = Math.max(10, ...share.map((v) => v ?? 0)), step = maxV > 40 ? 10 : 5, top = Math.ceil(maxV / step) * step
  const H = 230, L = 52, R = 16, B = 48, T = 12, cw = (w - L - R) / 35
  const X = (i: number) => L + cw * (i + 0.5), Y = (v: number) => T + (1 - v / top) * (H - T - B)
  return (
    <div ref={ref} className="n2-plot">
      <svg width={w} height={H} role="img" aria-label="최근 35일 공부 시간 대비 비몰입 비율">
        {Array.from({ length: top / step + 1 }, (_, k) => k * step).filter((_, k, a) => a.length <= 6 || k % 2 === 0).map((v) => <g key={v}><line x1={L} x2={w - R} y1={Y(v)} y2={Y(v)} className="n2-grid" /><text x={L - 10} y={Y(v) + 4} textAnchor="end" className="n2-tick">{v}%</text></g>)}
        <rect x={L + cw * 28} y={T - 4} width={cw * 7} height={H - T - B + 4} className="d5-recent" />
        {share.map((v, i) => i > 0 && v !== null && share[i - 1] !== null && <line key={`l${i}`} x1={X(i - 1)} x2={X(i)} y1={Y(share[i - 1]!)} y2={Y(v)} className={i >= 28 ? 'd5-seg-now' : 'd5-seg-old'} />)}
        {days.map((d, i) => {
          const v = share[i], tip = `${day(d)} · ${v !== null ? `공부 ${hm(d.minutes!)} 중 비몰입 ${hm(((v / 100) * d.minutes!))} (${Math.round(v)}%)` : STATE[d.attendance]}`
          return <g key={d.date}>
            {v !== null && <circle cx={X(i)} cy={Y(v)} r={i >= 28 ? 5 : 3} className={i < 28 ? 'd5-pt-old' : dropDay(d, th.drop) ? 'd5-pt-flag' : 'd5-pt-now'} tabIndex={i >= 28 ? 0 : -1} data-tip={tip} aria-label={i >= 28 ? tip : undefined} />}
            {d.dow === '월' && i < 26 && <text x={X(i)} y={H - B + 18} textAnchor="middle" className="n2-tick">{md(d.date)}</text>}
          </g>
        })}
        <text x={L + cw * 31.5} y={H - B + 18} textAnchor="middle" className="n2-tick n2-strong">최근 7일</text>
        {absentRuns(days).map(([a, b]) => <text key={a} x={(X(a) + X(b)) / 2} y={H - B + 36} textAnchor="middle" className="n2-tick n2-flag">결석</text>)}
        <line x1={L} x2={w - R} y1={Y(0)} y2={Y(0)} className="n2-axis" />
      </svg>
    </div>
  )
}

/** D6 종류별 건수(작은 그림 셋): 휴대폰 사용·엎드림·자리 비움을 칸 하나씩. 칸마다 막대 = 기간 한 칸의 건수(최근 7일이면 날마다 7개, 최근 5주면 주마다 5개),
 * 세 칸이 같은 눈금이고 막대 위에 건수를 적는다. 마지막 막대(최근 날·최근 7일)는 진하게, 앞 칸들의 평균보다 1.5배·2건 이상 늘면 빨강 */
function VisionCountBars({ s, ev, mode }: NotationProps & { mode: 'day' | 'week' }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const buckets = mode === 'week' ? weeksOf(s) : s.days.map((d) => [d])
  const n = buckets.length
  const m = group(ev)
  const c = SUP_BEHAVIORS.map((b) => buckets.map((bk) => bk.reduce((a, d) => a + (m.get(d.date) ?? []).filter((e) => e.reason === b).length, 0)))
  const top = Math.max(mode === 'week' ? 4 : 2, ...c.flat())
  // 기간 안에 비몰입이 한 건도 없으면 빈 그림 대신 한 줄로(결석한 날 수도 함께)
  if (!c.flat().some(Boolean)) { const off = buckets.flat().filter((d) => d.attendance === 'absent').length; return <div ref={ref} className="n2-plot"><p className="n2-empty">{mode === 'week' ? '최근 5주' : '최근 7일'} 비몰입 없음{off ? ` · 이 기간 결석 ${off}일` : ''}</p></div> }
  // 넓으면 세 칸 나란히, 좁으면(칸 이름·날짜가 겹칠 만큼) 위아래로 쌓는다
  const shownTypes = SUP_BEHAVIORS.filter((_, k) => c[k].some(Boolean)), zeroTypes = SUP_BEHAVIORS.filter((_, k) => !c[k].some(Boolean))
  const cols = w >= 760 ? Math.max(1, shownTypes.length) : 1, gap = 20, pw = (w - gap * (cols - 1)) / cols, PH = 190, T = 40, B = 54, H = PH * Math.ceil(shownTypes.length / cols)
  const Y = (v: number) => T + (1 - v / top) * (PH - T - B)
  const label = (bk: typeof buckets[number], g: number) => mode === 'week' ? (g === n - 1 ? '최근 7일' : `${md(bk[0].date)}~`) : `${md(bk[0].date)}`
  return (
    <div ref={ref} className="n2-plot">
      <svg width={w} height={H} role="img" aria-label={`종류별 ${mode === 'week' ? '최근 5주 주별' : '최근 7일 날짜별'} 비몰입 건수`}>
        {shownTypes.map((b, j) => {
          const k = SUP_BEHAVIORS.indexOf(b)
          const x0 = (j % cols) * (pw + gap), cw = pw / n, bw = Math.min(30, cw * 0.62)
          const prev = c[k].slice(0, n - 1).reduce((a, x) => a + x, 0) / (n - 1)
          return <g key={b} transform={`translate(0 ${Math.floor(j / cols) * PH})`}>
            <text x={x0} y={14} className="n2-tick n2-strong">{SUP_LABEL[b]}{prev > 0 && <tspan className="n2-tick" dx={8}>{mode === 'week' ? '지난 4주' : '앞 6일'} 평균 {Number.isInteger(prev) ? prev : prev.toFixed(1)}건</tspan>}</text>
            {buckets.map((bk, g) => {
              const v = c[k][g], last = g === n - 1, cx = x0 + cw * (g + 0.5)
              // 비몰입은 서버 판정 기준이 없어 빨강을 쓰지 않는다(최근 칸만 진하게, 앞 칸 평균은 점선)
              const more = false
              const off = mode === 'day' && bk[0].attendance !== 'present'
              const tip = `${SUP_LABEL[b]} · ${mode === 'week' ? (last ? '최근 7일' : `${md(bk[0].date)}–${md(bk[6].date)}`) : `${md(bk[0].date)} ${bk[0].dow}`} ${off ? STATE[bk[0].attendance] : `${v}건`}`
              return <g key={g} tabIndex={last ? 0 : -1} data-tip={tip} aria-label={last ? tip : undefined}>
                <rect x={cx - bw / 2} y={Y(v)} width={bw} height={Math.max(v ? 2 : 0, Y(0) - Y(v))} rx={3} className={last ? (more ? 'd6-flag' : 'd6-now') : 'd6-old'} />
                {!off && <text x={cx} y={Y(v) - 6} textAnchor="middle" className={`n2-tick n2-halo${last ? ' n2-strong' : ''}${more ? ' n2-flag' : ''}`}>{v}</text>}
                <text x={cx} y={PH - B + 18} textAnchor="middle" className={`n2-tick${last ? ' n2-strong' : ''}${mode === 'day' ? ' n2-small' : ''}`}>{label(bk, g)}</text>
                {/* 결석·예정 없음은 다른 그림처럼 날짜 밑에 */}
                {off && <text x={cx} y={PH - B + 33} textAnchor="middle" className={`n2-tick n2-small${bk[0].attendance === 'absent' ? ' n2-flag' : ''}`}>{bk[0].attendance === 'absent' ? '결석' : '없음'}</text>}
              </g>
            })}
            <line x1={x0} x2={x0 + pw} y1={Y(0)} y2={Y(0)} className="n2-axis" />
            {/* 평소 = 앞 칸들의 평균(일간: 앞 6일, 주간: 지난 4주). 마지막 막대를 이 선과 비교한다 */}
            {prev > 0 && <line x1={x0} x2={x0 + pw} y1={Y(prev)} y2={Y(prev)} className="d6-usual" />}
          </g>
        })}
      </svg>
      {zeroTypes.length > 0 && <p className="n2-empty">{zeroTypes.map((b) => `${SUP_LABEL[b]} 0건`).join(' · ')}</p>}
    </div>
  )
}
export const VisionWeekBars = (p: NotationProps) => <VisionCountBars {...p} mode="week" />
export const VisionDayBars = (p: NotationProps) => <VisionCountBars {...p} mode="day" />
