// 입실 시각 표시법 2차 5종. 세로·가로 모두 시각 눈금(몇 시)을 두고, 같은 요일 평소나 지난 4주를 함께 그린다. 코드는 그림마다 따로다.
import { useWidth } from '../z/useWidth.ts'
import { md } from '../shared/useCareData.ts'
import { absentRuns, clock, clockDomain, clockTick, day, hm, lateDay, sameWeekdayMean, STATE, type NotationProps } from '../notation/kit.tsx'

/** B1 날짜별 시각 점(최근 7일): 세로는 하루 시각(위가 이른 시각), 날짜마다 회색 가로 막대 = 같은 요일 평소 입실, 점 = 그날 입실. 점이 막대보다 아래면 늦게 온 것이고 그 거리가 늦은 시간이다 */
export function StartDots7({ s, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const days = s.days
  const dom = clockDomain(days.flatMap((d) => [d.start, d.usualStart].filter((v): v is number => v !== null)), 30)
  const H = 270, L = 64, B = 52, T = 14, cw = (w - L - 12) / 7
  const Y = (m: number) => T + ((m - dom[0]) / (dom[1] - dom[0])) * (H - T - B)
  const step = dom[1] - dom[0] > 8 * 60 ? 120 : 60
  const marks = Array.from({ length: Math.floor((dom[1] - dom[0]) / step) + 1 }, (_, i) => dom[0] + i * step)
  return (
    <div ref={ref} className="n2-plot">
      <svg width={w} height={H} role="img" aria-label="최근 7일 입실 시각과 같은 요일 평소">
        {marks.map((m) => <g key={m}><line x1={L} x2={w - 12} y1={Y(m)} y2={Y(m)} className="n2-grid" /><text x={L - 10} y={Y(m) + 4} textAnchor="end" className="n2-tick">{clockTick(m)}</text></g>)}
        {days.map((d, i) => {
          const cx = L + cw * (i + 0.5), late = lateDay(d, th.shift)
          const tip = `${day(d)} · ${d.start !== null ? `입실 ${clock(d.start)}` : STATE[d.attendance]}${d.usualStart !== null ? ` · 같은 요일 평소 ${clock(d.usualStart)}` : ''}${d.start !== null && d.usualStart !== null ? ` (${d.start >= d.usualStart ? `${hm(d.start - d.usualStart)} 늦음` : `${hm(d.usualStart - d.start)} 이름`})` : ''}`
          return <g key={d.date} tabIndex={0} data-tip={tip} aria-label={tip}>
            {d.usualStart !== null && <rect x={cx - Math.min(28, cw * 0.32)} y={Y(d.usualStart) - 3} width={Math.min(56, cw * 0.64)} height={6} rx={3} className="b1-usual" />}
            {d.start !== null && <circle cx={cx} cy={Y(d.start)} r={7} className={late ? 'b1-flag' : 'b1-now'} />}
            <text x={cx} y={H - B + 20} textAnchor="middle" className={`n2-tick n2-strong${d.attendance === 'absent' ? ' n2-flag' : ''}`}>{md(d.date)} {d.dow}</text>
            {d.start === null && <text x={cx} y={H - B + 38} textAnchor="middle" className={`n2-tick${d.attendance === 'absent' ? ' n2-flag' : ''}`}>{STATE[d.attendance]}</text>}
          </g>
        })}
      </svg>
    </div>
  )
}

/** B2 35일 입실 꺾은선: 세로는 하루 시각(위로 갈수록 늦은 시각). 입실한 날을 점으로 찍고 이어진 날끼리 잇는다. 최근 7일 구간만 굵고, 같은 요일 평소보다 기준만큼 늦은 점은 빨강 */
export function StartLine35({ s, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const days = s.history35
  const usual = days.map((d, i) => d.usualStart ?? sameWeekdayMean(s, i, 'start'))
  const late = days.map((d, i) => d.start !== null && usual[i] !== null && d.start - usual[i]! >= th.shift)
  const dom = clockDomain(days.flatMap((d) => d.start === null ? [] : [d.start]), 20)
  const H = 258, L = 60, R = 16, B = 48, T = 30, cw = (w - L - R) / 35
  const X = (i: number) => L + cw * (i + 0.5), Y = (m: number) => T + (1 - (m - dom[0]) / (dom[1] - dom[0])) * (H - T - B)
  const step = dom[1] - dom[0] > 8 * 60 ? 120 : 60
  const marks = Array.from({ length: Math.floor((dom[1] - dom[0]) / step) + 1 }, (_, i) => dom[0] + i * step)
  return (
    <div ref={ref} className="n2-plot">
      <svg width={w} height={H} role="img" aria-label="최근 35일 입실 시각 흐름">
        <text x={L + cw * 31.5} y={18} textAnchor="middle" className="n2-tick n2-strong">{cw >= 20 ? `최근 7일 · ${md(days[28].date)}–${md(days[34].date)}` : `${md(days[28].date)}–${md(days[34].date)}`}</text>
        {marks.map((m) => <g key={m}><line x1={L} x2={w - R} y1={Y(m)} y2={Y(m)} className="n2-grid" /><text x={L - 10} y={Y(m) + 4} textAnchor="end" className="n2-tick">{clockTick(m)}</text></g>)}
        <rect x={L + cw * 28} y={T - 4} width={cw * 7} height={H - T - B + 4} className="b2-recent" />
        {days.map((d, i) => i > 0 && d.start !== null && days[i - 1].start !== null && <line key={`l${i}`} x1={X(i - 1)} x2={X(i)} y1={Y(days[i - 1].start!)} y2={Y(d.start)} className={i >= 28 ? 'b2-seg-now' : 'b2-seg-old'} />)}
        {days.map((d, i) => {
          const tip = `${day(d)} · ${d.start !== null ? `입실 ${clock(d.start)}` : STATE[d.attendance]}${usual[i] !== null ? ` · 같은 요일 평소 ${clock(usual[i]!)}` : ''}`
          return <g key={d.date}>
            {d.start !== null && <circle cx={X(i)} cy={Y(d.start)} r={i >= 28 ? 5 : 3} className={late[i] ? 'b2-pt-flag' : i >= 28 ? 'b2-pt-now' : 'b2-pt-old'} tabIndex={i >= 28 ? 0 : -1} data-tip={tip} aria-label={i >= 28 ? tip : undefined} />}
            {(i >= 28 ? cw >= 20 : d.dow === '월' && (i < 26 || cw >= 20)) && <text x={X(i)} y={H - B + 18} textAnchor="middle" className={`n2-tick${i >= 28 ? ' n2-strong' : ''}${d.attendance === 'absent' ? ' n2-flag' : ''}`}>{i >= 28 ? d.dow : md(d.date)}</text>}
            {d.attendance === 'absent' && <rect x={L + cw * i + cw * 0.15} y={H - B - 4} width={cw * 0.7} height={4} rx={2} className="n2-absent" />}
          </g>
        })}
        <line x1={L} x2={w - R} y1={H - B} y2={H - B} className="n2-axis" />
        {/* 날짜 눈금: 날마다 짧은 눈금, 월요일은 긴 눈금. 최근 7일은 날짜(일)를 작게 적는다 */}
        {days.map((d, i) => <line key={`tk${i}`} x1={X(i)} x2={X(i)} y1={(H - B)} y2={(H - B) + (d.dow === '월' ? 7 : 4)} className="n2-daytick" />)}
        {cw >= 14 && cw < 20 && days.slice(28).map((d, k) => <text key={`dn${k}`} x={X((28 + k))} y={(H - B) + 18} textAnchor="middle" className={`n2-tick n2-small${d.attendance === 'absent' ? ' n2-flag' : ''}`}>{Number(d.date.slice(8))}</text>)}
        {cw < 14 && <text x={L + cw * 31.5} y={H - B + 18} textAnchor="middle" className="n2-tick n2-strong">최근 7일</text>}
        {absentRuns(days, 0).map(([a, b]) => <text key={a} x={(X(a) + X(b)) / 2} y={H - B + 36} textAnchor="middle" className="n2-tick n2-flag">결석</text>)}
      </svg>
    </div>
  )
}

/** B3 요일별 범위 막대: 요일마다 한 줄, 회색 막대 = 지난 4주 그 요일 입실의 가장 이른~가장 늦은 시각, 세로 굵은 선 = 최근 7일 그 요일 입실. 선이 막대 밖 오른쪽이면 평소보다 늦은 것이다 */
export function StartWeekdayRange({ s, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const recent = s.history35.slice(28)
  const rowsData = recent.map((r, k) => { const past = [0, 1, 2, 3].map((wk) => s.history35[wk * 7 + k].start).filter((v): v is number => v !== null); return { r, lo: past.length ? Math.min(...past) : null, hi: past.length ? Math.max(...past) : null } })
  const dom = clockDomain(s.history35.flatMap((d) => d.start === null ? [] : [d.start]), 20)
  const L = 96, R = 16, rowH = 32, T = 8, H = T + rowH * 7 + 30
  const X = (m: number) => L + ((m - dom[0]) / (dom[1] - dom[0])) * (w - L - R)
  const step = dom[1] - dom[0] > 8 * 60 ? 120 : 60
  const marks = Array.from({ length: Math.floor((dom[1] - dom[0]) / step) + 1 }, (_, i) => dom[0] + i * step)
  return (
    <div ref={ref} className="n2-plot">
      <svg width={w} height={H} role="img" aria-label="요일별 지난 4주 입실 범위와 최근 입실">
        {marks.map((m) => <g key={m}><line x1={X(m)} x2={X(m)} y1={T} y2={H - 26} className="n2-grid" /><text x={X(m)} y={H - 8} textAnchor="middle" className="n2-tick">{clockTick(m)}</text></g>)}
        {rowsData.map(({ r, lo, hi }, i) => {
          const y0 = T + rowH * i, late = lateDay(r, th.shift)
          const tip = `${r.dow}요일 · 지난 4주 ${lo !== null ? `${clock(lo)}~${clock(hi!)}` : '기록 없음'} · ${md(r.date)} ${r.start !== null ? `입실 ${clock(r.start)}` : STATE[r.attendance]}`
          return <g key={r.date} tabIndex={0} data-tip={tip} aria-label={tip}>
            <text x={L - 12} y={y0 + rowH / 2 + 4} textAnchor="end" className={`n2-tick${r.attendance === 'absent' ? ' n2-flag' : ''}`}>{r.dow} {md(r.date)}</text>
            {lo !== null && <rect x={X(lo) - 3} y={y0 + 9} width={Math.max(6, X(hi!) - X(lo) + 6)} height={rowH - 18} rx={(rowH - 18) / 2} className="b3-range" />}
            {r.start !== null ? <rect x={X(r.start) - 2.5} y={y0 + 4} width={5} height={rowH - 8} rx={2} className={late ? 'b3-flag' : 'b3-now'} />
              : r.attendance === 'absent' && <text x={w - R} y={y0 + rowH / 2 + 4} textAnchor="end" className="n2-tick n2-flag">결석</text>}
          </g>
        })}
      </svg>
    </div>
  )
}

/** B4 입실 시각 분포(30분 구간 막대, 세로 = 일수): 지난 4주는 회색, 최근 7일은 그 위에 색으로 쌓는다. 최근 날들이 평소 무리와 떨어진 칸에 쌓였는지가 보인다 */
export function StartHistogram({ s, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const items = s.history35.map((d, i) => ({ d, recent: i >= 28 })).filter((x) => x.d.start !== null)
  const dom = clockDomain(items.map((x) => x.d.start!), 30)
  const nb = Math.round((dom[1] - dom[0]) / 30)
  const bin = (m: number) => Math.min(nb - 1, Math.floor((m - dom[0]) / 30))
  const counts = Array.from({ length: nb }, (_, b) => ({ old: items.filter((x) => !x.recent && bin(x.d.start!) === b).length, now: items.filter((x) => x.recent && bin(x.d.start!) === b) }))
  const maxC = Math.max(2, ...counts.map((c) => c.old + c.now.length)), cStep = maxC > 12 ? 5 : 2, cTop = Math.ceil(maxC / cStep) * cStep
  const H = 240, L = 52, R = 16, T = 12, B = 34
  const X = (m: number) => L + ((m - dom[0]) / (dom[1] - dom[0])) * (w - L - R), Y = (c: number) => T + (1 - c / cTop) * (H - T - B)
  const bw = X(dom[0] + 30) - X(dom[0])
  return (
    <div ref={ref} className="n2-plot">
      <svg width={w} height={H} role="img" aria-label="최근 35일 입실 시각 분포">
        {Array.from({ length: cTop / cStep + 1 }, (_, k) => k * cStep).map((c) => <g key={c}><line x1={L} x2={w - R} y1={Y(c)} y2={Y(c)} className="n2-grid" /><text x={L - 10} y={Y(c) + 4} textAnchor="end" className="n2-tick">{c}일</text></g>)}
        {counts.map((c, b) => {
          const x0 = X(dom[0] + b * 30) + 1.5
          return <g key={b}>
            {c.old > 0 && <rect x={x0} y={Y(c.old)} width={bw - 3} height={Y(0) - Y(c.old)} className="b4-old" tabIndex={-1} data-tip={`${clock(dom[0] + b * 30)}~ · 지난 4주 ${c.old}일`} />}
            {c.now.map((x, k) => <rect key={x.d.date} x={x0} y={Y(c.old + k + 1) + 1} width={bw - 3} height={Y(0) - Y(1) - 2} rx={2} className={lateDay(x.d, th.shift) ? 'b4-flag' : 'b4-now'} tabIndex={0} data-tip={`${day(x.d)} 입실 ${clock(x.d.start!)}`} aria-label={`${day(x.d)} 입실 ${clock(x.d.start!)}`} />)}
          </g>
        })}
        {Array.from({ length: Math.floor((dom[1] - dom[0]) / 60) + 1 }, (_, h) => dom[0] + h * 60).map((m) => <text key={m} x={X(m)} y={H - 12} textAnchor="middle" className="n2-tick">{clockTick(m)}</text>)}
        <line x1={L} x2={w - R} y1={Y(0)} y2={Y(0)} className="n2-axis" />
      </svg>
    </div>
  )
}

/** B5 주별 늦은 날 수(5주 기둥, 세로 = 일): 그 주에 같은 요일 평소보다 기준만큼 늦게 온 날이 며칠인지. 기둥 위 굵은 가로선은 그 주에 입실한 날 수라, 온 날 중 몇 날이 늦었는지가 함께 보인다 */
export function StartLateWeeks({ s, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const weeks = Array.from({ length: 5 }, (_, k) => s.history35.slice(k * 7, k * 7 + 7).map((d, j) => ({ d, i: k * 7 + j })))
  const lateCount = weeks.map((wk) => wk.filter(({ d, i }) => { const u = d.usualStart ?? sameWeekdayMean(s, i, 'start'); return d.start !== null && u !== null && d.start - u >= th.shift }).length)
  const came = weeks.map((wk) => wk.filter(({ d }) => d.start !== null).length)
  const H = 240, L = 48, R = 80, T = 12, B = 40, cw = (w - L - R) / 5, bw = Math.min(72, cw * 0.5)
  const Y = (c: number) => T + (1 - c / 7) * (H - T - B)
  return (
    <div ref={ref} className="n2-plot">
      <svg width={w} height={H} role="img" aria-label="최근 5주 주별 늦게 온 날 수">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((c) => <g key={c}><line x1={L} x2={w - R} y1={Y(c)} y2={Y(c)} className="n2-grid" />{c % 1 === 0 && <text x={L - 10} y={Y(c) + 4} textAnchor="end" className="n2-tick">{c}일</text>}</g>)}
        {weeks.map((wk, k) => {
          const cx = L + cw * (k + 0.5)
          const tip = `${md(wk[0].d.date)}~${md(wk[6].d.date)} · 입실 ${came[k]}일 중 늦음 ${lateCount[k]}일`
          return <g key={k} tabIndex={0} data-tip={tip} aria-label={tip}>
            {lateCount[k] > 0 && <rect x={cx - bw / 2} y={Y(lateCount[k])} width={bw} height={Y(0) - Y(lateCount[k])} rx={4} className={k === 4 ? 'b5-now' : 'b5-old'} />}
            <line x1={cx - bw / 2 - 6} x2={cx + bw / 2 + 6} y1={Y(came[k])} y2={Y(came[k])} className="b5-came" />
            <text x={cx} y={H - B + 20} textAnchor="middle" className={`n2-tick${k === 4 ? ' n2-strong' : ''}`}>{k === 4 ? '최근 7일' : `${md(wk[0].d.date)}~`}</text>
            {k === 4 && <text x={cx + bw / 2 + 10} y={Y(came[k]) + 4} className="n2-tick">입실한 날</text>}
            {k === 4 && lateCount[k] > 0 && <text x={cx + bw / 2 + 10} y={(Y(lateCount[k]) + Y(0)) / 2 + 4} className="n2-tick n2-flag">늦은 날</text>}
          </g>
        })}
        <line x1={L} x2={w - R} y1={Y(0)} y2={Y(0)} className="n2-axis" />
      </svg>
    </div>
  )
}

/** B6 최근 7일 입실 시각 꺾은선 + 같은 요일 평소(회색 꺾은선): 가로 = 날짜, 세로 = 시각(위로 갈수록 늦은 시각). 두 선 끝에 '평소'·'입실'을 바로 적고,
 * 결석·예정 없음인 날은 선을 끊고 날짜 밑에 적는다. 평소보다 관리 기준 이상 늦은 날의 점은 빨강 */
export function StartWeekLines({ s, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const days = s.days
  const vals = days.flatMap((d) => [d.start, d.usualStart].filter((v): v is number => v !== null))
  const [lo, hi] = clockDomain(vals, 20)
  const L = 56, R = 52, T = 14, cw = (w - L - R) / 7, two = cw < 70, B = two ? 64 : 48, H = 250 + (two ? 16 : 0)
  const X = (i: number) => L + cw * (i + 0.5), Y = (m: number) => T + (1 - (m - lo) / (hi - lo)) * (H - T - B)
  const step = hi - lo > 300 ? 120 : 60
  const ticks = Array.from({ length: Math.floor((hi - lo) / step) + 1 }, (_, k) => lo + k * step)
  const seg = (key: 'start' | 'usualStart', cls: string) => days.map((d, i) => i > 0 && d[key] !== null && days[i - 1][key] !== null && <line key={`${key}${i}`} x1={X(i - 1)} x2={X(i)} y1={Y(days[i - 1][key]!)} y2={Y(d[key]!)} className={cls} />)
  const lastU = days.map((d, i) => [d.usualStart, i] as const).filter(([v]) => v !== null).pop()
  const lastS = days.map((d, i) => [d.start, i] as const).filter(([v]) => v !== null).pop()
  return (
    <div ref={ref} className="n2-plot">
      <svg width={w} height={H} role="img" aria-label="최근 7일 입실 시각과 같은 요일 평소">
        {ticks.map((t) => <g key={t}><line x1={L} x2={w - R} y1={Y(t)} y2={Y(t)} className="n2-grid" /><text x={L - 10} y={Y(t) + 4} textAnchor="end" className="n2-tick">{clockTick(t)}</text></g>)}
        {seg('usualStart', 'b6-usual')}
        {seg('start', 'b6-now')}
        {days.map((d, i) => {
          const late = lateDay(d, th.shift), came = d.attendance === 'present' && d.start !== null
          const tip = `${day(d)} · ${came ? `입실 ${clock(d.start!)}` : STATE[d.attendance]}${d.usualStart !== null ? ` · 같은 요일 평소 ${clock(d.usualStart)}` : ''}`
          return <g key={d.date} tabIndex={0} data-tip={tip} aria-label={tip}>
            {d.usualStart !== null && <circle cx={X(i)} cy={Y(d.usualStart)} r={3.5} className="b6-usual-pt" />}
            {came && <circle cx={X(i)} cy={Y(d.start!)} r={5} className={late ? 'b2-pt-flag' : 'b2-pt-now'} />}
            <text x={X(i)} y={H - B + 20} textAnchor="middle" className={`n2-tick n2-strong${d.attendance === 'absent' ? ' n2-flag' : ''}`}>{two ? md(d.date) : `${md(d.date)} ${d.dow}`}</text>
            {two && <text x={X(i)} y={H - B + 36} textAnchor="middle" className={`n2-tick n2-strong${d.attendance === 'absent' ? ' n2-flag' : ''}`}>{d.dow}</text>}
            {!came && <text x={X(i)} y={H - B + (two ? 54 : 38)} textAnchor="middle" className={`n2-tick${d.attendance === 'absent' ? ' n2-flag' : ''}`}>{STATE[d.attendance]}</text>}
          </g>
        })}
        {/* 선 이름은 오른쪽 여백 한 줄에 모은다. 입실 선이 결석으로 일찍 끝나도 이름은 같은 자리(선과 같은 파랑)이고, 마지막 값의 높이에 맞춘다(두 이름이 가까우면 벌린다) */}
        {(() => {
          const yu = lastU ? Y(lastU[0]!) : null, ys = lastS ? Y(lastS[0]!) : null
          let lu = yu, ls = ys
          if (lu !== null && ls !== null && Math.abs(lu - ls) < 18) { const mid = (lu + ls) / 2, up = ls <= lu; ls = mid + (up ? -9 : 9); lu = mid + (up ? 9 : -9) }
          const gx = w - R + 10
          return <>
            {lu !== null && <text x={gx} y={lu + 4} className="n2-tick">평소</text>}
            {ls !== null && <text x={gx} y={ls + 4} className="n2-tick n2-strong b6-name">입실</text>}
          </>
        })()}
      </svg>
    </div>
  )
}

/** B7 주별 입실(5주): 주마다 그 주 평균 입실 시각 점(위로 갈수록 늦은 시각)과 값, 점끼리 잇는 선. 아래에 주 시작일과 늦은 날 수(같은 요일 평소보다 기준 이상).
 * 마지막(최근 7일)만 진하게. 35일 점보다 칸이 좁은 자리에서 늦어지는 흐름을 읽게 한다 */
export function StartWeekCols({ s, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const days = s.history35
  const usual = days.map((d, i) => d.usualStart ?? sameWeekdayMean(s, i, 'start'))
  const weeks = Array.from({ length: 5 }, (_, g) => days.slice(g * 7, g * 7 + 7).map((d, k) => ({ d, u: usual[g * 7 + k] })))
  const mean = weeks.map((wk) => { const v = wk.filter(({ d }) => d.start !== null).map(({ d }) => d.start!); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null })
  const lateN = weeks.map((wk) => wk.filter(({ d, u }) => d.start !== null && u !== null && d.start - u >= th.shift).length)
  const [lo, hi] = clockDomain(mean.filter((v): v is number => v !== null), 30)
  const H = 250, L = 56, R = 8, T = 26, B = 50, cw = (w - L - R) / 5
  const X = (g: number) => L + cw * (g + 0.5), Y = (m: number) => T + (1 - (m - lo) / (hi - lo)) * (H - T - B)
  const step = hi - lo > 300 ? 120 : 60
  const ticks = Array.from({ length: Math.floor((hi - lo) / step) + 1 }, (_, k) => lo + k * step)
  return (
    <div ref={ref} className="n2-plot">
      <svg width={w} height={H} role="img" aria-label="최근 5주 주별 평균 입실 시각">
        {ticks.map((t) => <g key={t}><line x1={L} x2={w - R} y1={Y(t)} y2={Y(t)} className="n2-grid" /><text x={L - 8} y={Y(t) + 4} textAnchor="end" className="n2-tick">{clockTick(t)}</text></g>)}
        {mean.map((v, g) => g > 0 && v !== null && mean[g - 1] !== null && <line key={`l${g}`} x1={X(g - 1)} x2={X(g)} y1={Y(mean[g - 1]!)} y2={Y(v)} className={g === 4 ? 'b2-seg-now' : 'b2-seg-old'} />)}
        {weeks.map((wk, g) => {
          const v = mean[g], recent = g === 4, late = lateN[g] > 0
          const tip = `${recent ? '최근 7일' : `${md(wk[0].d.date)}–${md(wk[6].d.date)}`} · ${v !== null ? `평균 입실 ${clock(v)}` : '입실한 날 없음'}${lateN[g] ? ` · 늦은 날 ${lateN[g]}일` : ''}`
          return <g key={g} tabIndex={0} data-tip={tip} aria-label={tip}>
            {v !== null && <><circle cx={X(g)} cy={Y(v)} r={recent ? 6 : 4.5} className={recent ? (late ? 'b2-pt-flag' : 'b2-pt-now') : 'b2-pt-old'} />
              <text x={X(g)} y={Y(v) - 11} textAnchor="middle" className={`n2-tick${recent ? ' n2-strong' : ''}`}>{clock(v)}</text></>}
            <text x={X(g)} y={H - B + 18} textAnchor="middle" className={`n2-tick${recent ? ' n2-strong' : ''}`}>{recent ? '최근 7일' : `${md(wk[0].d.date)}~`}</text>
            {late && <text x={X(g)} y={H - B + 36} textAnchor="middle" className="n2-tick n2-flag">늦은 날 {lateN[g]}일</text>}
          </g>
        })}
      </svg>
    </div>
  )
}
