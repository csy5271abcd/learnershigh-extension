// 공부 시간 표시법 2차 5종. 익숙한 막대·꺾은선·분포를 쓰되, 그림마다 비교 기준을 하나 이상 함께 그린다. 코드는 그림마다 따로다.
import { useWidth } from '../z/useWidth.ts'
import { md } from '../shared/useCareData.ts'
import { absentRuns, day, dropDay, hm, hourTicks, STATE, weeksOf, type NotationProps } from '../notation/kit.tsx'

/** A1 나란히 막대(최근 7일): 날짜마다 왼쪽 회색 = 같은 요일 평소, 오른쪽 = 그날 공부(기준만큼 줄면 빨강). 첫 묶음에 '평소'·'실제'를 바로 적는다 */
export function StudyOverlapBars({ s, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const days = s.days
  const { top, ticks } = hourTicks(Math.max(60, ...days.flatMap((d) => [d.minutes ?? 0, d.usualMinutes ?? 0])), 4)
  // 칸이 좁으면 날짜와 요일을 두 줄로 쓴다
  // 오른쪽 여백에 '평소'·'실제' 이름을 마지막 묶음의 두 막대 높이에 맞춰 적는다
  const L = 60, T = 30, RG = 52, cw = (w - L - RG) / 7, two = cw < 70, B = two ? 68 : 52, H = 276 + (two ? 16 : 0)
  const last = days.map((d, i) => (d.usualMinutes !== null && d.attendance === 'present' && d.minutes !== null ? i : -1)).filter((i) => i >= 0).pop() ?? -1
  const y = (v: number) => T + (1 - v / top) * (H - T - B)
  return (
    <div ref={ref} className="n2-plot">
      <svg width={w} height={H} role="img" aria-label="최근 7일 공부 시간과 같은 요일 평소">
        {ticks.map((t) => <g key={t}><line x1={L} x2={w - RG} y1={y(t)} y2={y(t)} className="n2-grid" /><text x={L - 10} y={y(t) + 4} textAnchor="end" className="n2-tick">{t / 60}시간</text></g>)}
        {days.map((d, i) => {
          const cx = L + cw * (i + 0.5), bw = Math.min(26, cw * 0.3)
          const studied = d.attendance === 'present' && d.minutes !== null
          const flag = dropDay(d, th.drop)
          const tip = `${day(d)} · ${studied ? `공부 ${hm(d.minutes!)}` : STATE[d.attendance]}${d.usualMinutes ? ` · 같은 요일 평소 ${hm(d.usualMinutes)}` : ''}`
          return (
            <g key={d.date} tabIndex={0} data-tip={tip} aria-label={tip}>
              {d.usualMinutes !== null && <rect x={cx - bw - 2} y={y(d.usualMinutes)} width={bw} height={y(0) - y(d.usualMinutes)} rx={3} className="a1-usual" />}
              {studied && <rect x={cx + 2} y={y(d.minutes!)} width={bw} height={Math.max(2, y(0) - y(d.minutes!))} rx={3} className={flag ? 'a1-now-flag' : 'a1-now'} />}
              <text x={cx} y={H - B + 20} textAnchor="middle" className={`n2-tick n2-strong${d.attendance === 'absent' ? ' n2-flag' : ''}`}>{two ? md(d.date) : `${md(d.date)} ${d.dow}`}</text>
              {two && <text x={cx} y={H - B + 36} textAnchor="middle" className={`n2-tick n2-strong${d.attendance === 'absent' ? ' n2-flag' : ''}`}>{d.dow}</text>}
              {!studied && <text x={cx} y={H - B + (two ? 54 : 38)} textAnchor="middle" className={`n2-tick${d.attendance === 'absent' ? ' n2-flag' : ''}`}>{STATE[d.attendance]}</text>}
            </g>
          )
        })}
        <line x1={L} x2={w - RG} y1={y(0)} y2={y(0)} className="n2-axis" />
        {last >= 0 && (() => {
          let yu = y(days[last].usualMinutes!) + 4, ya = y(days[last].minutes!) + 4
          if (Math.abs(yu - ya) < 16) { const m = (yu + ya) / 2; yu = m - 8; ya = m + 8 }
          // 마지막 묶음 바로 오른쪽에 적는다(다음 칸이 비었을 때). 마지막 날이면 오른쪽 여백
          const nx = last === days.length - 1 ? w - RG + 10 : L + cw * (last + 0.5) + Math.min(26, cw * 0.3) + 10
          return <><text x={nx} y={yu} className="n2-tick">평소</text><text x={nx} y={ya} className="n2-tick n2-strong c1-name">실제</text></>
        })()}
      </svg>
    </div>
  )
}

/** A2 35일 막대 + 평소 하루 선: 날짜마다 막대 하나(지난 4주 회색, 최근 7일 진하게), 가로선은 지난 4주 공부한 날의 하루 평균. 최근 막대들이 선 아래로 내려앉았는지가 보인다 */
export function StudyBars35({ s, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const days = s.history35
  const past = days.slice(0, 28).filter((d) => d.attendance === 'present' && d.minutes !== null)
  const avg = past.length ? past.reduce((a, d) => a + d.minutes!, 0) / past.length : null
  const { top, ticks } = hourTicks(Math.max(60, ...days.map((d) => d.minutes ?? 0)), 4)
  const H = 268, L = 60, R = 70, B = 48, T = 30, cw = (w - L - R) / 35
  const y = (v: number) => T + (1 - v / top) * (H - T - B)
  return (
    <div ref={ref} className="n2-plot">
      <svg width={w} height={H} role="img" aria-label="최근 35일 하루 공부 시간">
        <text x={L + cw * 31.5} y={18} textAnchor="middle" className="n2-tick n2-strong">{cw >= 20 ? `최근 7일 · ${md(days[28].date)}–${md(days[34].date)}` : `${md(days[28].date)}–${md(days[34].date)}`}</text>
        {ticks.map((t) => <g key={t}><line x1={L} x2={w - R} y1={y(t)} y2={y(t)} className="n2-grid" /><text x={L - 10} y={y(t) + 4} textAnchor="end" className="n2-tick">{t / 60}시간</text></g>)}
        <rect x={L + cw * 28} y={T - 4} width={cw * 7} height={H - T - B + 4} className="a2-recent" />
        {days.map((d, i) => {
          const v = d.attendance === 'present' ? d.minutes : null
          const tip = `${day(d)} · ${v !== null ? `공부 ${hm(v)}` : STATE[d.attendance]}`
          return <g key={d.date}>
            {v !== null && <rect x={L + cw * i + cw * 0.15} y={y(v)} width={cw * 0.7} height={Math.max(1.5, y(0) - y(v))} rx={2} className={i < 28 ? 'a2-old' : dropDay(d, th.drop) ? 'a2-flag' : 'a2-now'} tabIndex={i >= 28 ? 0 : -1} data-tip={tip} aria-label={i >= 28 ? tip : undefined} />}
            {(i >= 28 ? cw >= 20 : d.dow === '월' && (i < 26 || cw >= 20)) && <text x={L + cw * (i + 0.5)} y={H - B + 18} textAnchor="middle" className={`n2-tick${i >= 28 ? ' n2-strong' : ''}${d.attendance === 'absent' ? ' n2-flag' : ''}`}>{i >= 28 ? d.dow : md(d.date)}</text>}
            {d.attendance === 'absent' && <rect x={L + cw * i + cw * 0.15} y={y(0) - 4} width={cw * 0.7} height={4} rx={2} className="n2-absent" />}
          </g>
        })}
        {/* 날짜 눈금: 날마다 짧은 눈금, 월요일은 긴 눈금. 최근 7일은 날짜(일)를 작게 적는다 */}
        {days.map((d, i) => <line key={`tk${i}`} x1={L + cw * (i + 0.5)} x2={L + cw * (i + 0.5)} y1={y(0)} y2={y(0) + (d.dow === '월' ? 7 : 4)} className="n2-daytick" />)}
        {cw >= 14 && cw < 20 && days.slice(28).map((d, k) => <text key={`dn${k}`} x={L + cw * ((28 + k) + 0.5)} y={y(0) + 18} textAnchor="middle" className={`n2-tick n2-small${d.attendance === 'absent' ? ' n2-flag' : ''}`}>{Number(d.date.slice(8))}</text>)}
        {cw < 14 && <text x={L + cw * 31.5} y={H - B + 18} textAnchor="middle" className="n2-tick n2-strong">최근 7일</text>}
        {absentRuns(days, 0).map(([a, b]) => <text key={a} x={L + cw * ((a + b + 1) / 2)} y={H - B + 36} textAnchor="middle" className="n2-tick n2-flag">결석</text>)}
        {avg !== null && <g tabIndex={0} data-tip={`지난 4주 공부한 날 하루 평균 ${hm(avg)}`}>
          <line x1={L} x2={w - R} y1={y(avg)} y2={y(avg)} className="a2-avg" />
          <text x={w - R + 6} y={y(avg) + 4} className="n2-tick n2-strong">평소 하루</text>
        </g>}
        <line x1={L} x2={w - R} y1={y(0)} y2={y(0)} className="n2-axis" />
      </svg>
    </div>
  )
}

/** A3 주 합계 가로 막대(5주): 주마다 한 줄, 막대 = 그 주 공부 시간 합. 세로선 = 지난 4주 평균. 최근 7일 줄이 선에 못 미친 만큼이 한 주 동안 준 시간이다 */
export function StudyWeekRows({ s, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const weeks = weeksOf(s)
  const totals = weeks.map((wk) => wk.reduce((a, d) => a + (d.attendance === 'present' ? d.minutes ?? 0 : 0), 0))
  const avg = totals.slice(0, 4).reduce((a, b) => a + b, 0) / 4
  const { top, ticks } = hourTicks(Math.max(60, ...totals, avg), 5)
  const L = 112, R = 24, rowH = 34, T = 26, H = T + rowH * 5 + 30
  const x = (v: number) => L + (v / top) * (w - L - R)
  const flag = avg > 0 && 100 - (totals[4] / avg) * 100 >= th.drop
  return (
    <div ref={ref} className="n2-plot">
      <svg width={w} height={H} role="img" aria-label="최근 5주 주별 공부 시간 합계">
        {ticks.map((t) => <g key={t}><line x1={x(t)} x2={x(t)} y1={T - 6} y2={H - 26} className="n2-grid" /><text x={x(t)} y={H - 8} textAnchor="middle" className="n2-tick">{t / 60}시간</text></g>)}
        {weeks.map((wk, i) => {
          const y0 = T + rowH * i, absent = wk.filter((d) => d.attendance === 'absent').length
          const tip = `${md(wk[0].date)}~${md(wk[6].date)} · 합계 ${hm(totals[i])}${absent ? ` · 결석 ${absent}일` : ''}`
          return <g key={i} tabIndex={0} data-tip={tip} aria-label={tip}>
            <text x={L - 12} y={y0 + rowH / 2 + 4} textAnchor="end" className={`n2-tick${i === 4 ? ' n2-strong' : ''}`}>{i === 4 ? '최근 7일' : `${md(wk[0].date)}~${md(wk[6].date)}`}</text>
            <rect x={L} y={y0 + 6} width={Math.max(2, x(totals[i]) - L)} height={rowH - 12} rx={4} className={i < 4 ? 'a3-old' : flag ? 'a3-flag' : 'a3-now'} />
          </g>
        })}
        <g tabIndex={0} data-tip={`지난 4주 주평균 ${hm(avg)}`}>
          <line x1={x(avg)} x2={x(avg)} y1={T - 8} y2={T + rowH * 5} className="a3-avg" />
          <text x={x(avg)} y={T - 12} textAnchor="middle" className="n2-tick n2-strong">4주 평균</text>
        </g>
      </svg>
    </div>
  )
}

/** A4 35일 꺾은선: 공부한 날을 점으로 찍고 이어진 날끼리 선으로 잇는다(결석·예정 없는 날은 선이 끊긴다). 최근 7일 구간만 굵고 진하다 */
export function StudyLine35({ s, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const days = s.history35
  const { top, ticks } = hourTicks(Math.max(60, ...days.map((d) => d.minutes ?? 0)), 4)
  const H = 240, L = 60, R = 16, B = 48, T = 12, cw = (w - L - R) / 35
  const X = (i: number) => L + cw * (i + 0.5), Y = (v: number) => T + (1 - v / top) * (H - T - B)
  const val = (i: number) => days[i].attendance === 'present' ? days[i].minutes : null
  const segs: [number, number][] = []
  for (let i = 1; i < 35; i++) if (val(i) !== null && val(i - 1) !== null) segs.push([i - 1, i])
  return (
    <div ref={ref} className="n2-plot">
      <svg width={w} height={H} role="img" aria-label="최근 35일 하루 공부 시간 흐름">
        {ticks.map((t) => <g key={t}><line x1={L} x2={w - R} y1={Y(t)} y2={Y(t)} className="n2-grid" /><text x={L - 10} y={Y(t) + 4} textAnchor="end" className="n2-tick">{t / 60}시간</text></g>)}
        <line x1={X(27.5)} x2={X(27.5)} y1={T} y2={H - B} className="a4-split" />
        <text x={X(31)} y={T + 12} textAnchor="middle" className="n2-tick n2-strong">최근 7일</text>
        {segs.map(([a, b]) => <line key={a} x1={X(a)} x2={X(b)} y1={Y(val(a)!)} y2={Y(val(b)!)} className={b >= 28 ? 'a4-seg-now' : 'a4-seg-old'} />)}
        {days.map((d, i) => {
          const v = val(i), tip = `${day(d)} · ${v !== null ? `공부 ${hm(v)}` : STATE[d.attendance]}`
          return <g key={d.date}>
            {v !== null && <circle cx={X(i)} cy={Y(v)} r={i >= 28 ? 5 : 3} className={i < 28 ? 'a4-pt-old' : dropDay(d, th.drop) ? 'a4-pt-flag' : 'a4-pt-now'} tabIndex={i >= 28 ? 0 : -1} data-tip={tip} aria-label={i >= 28 ? tip : undefined} />}
            {d.dow === '월' && i < 28 && <text x={X(i)} y={H - B + 18} textAnchor="middle" className="n2-tick">{md(d.date)}</text>}
            {i >= 28 && cw >= 22 && <text x={X(i)} y={H - B + 18} textAnchor="middle" className={`n2-tick${d.attendance === 'absent' ? ' n2-flag' : ''}`}>{d.dow}</text>}
          </g>
        })}
        {absentRuns(days).map(([a, b]) => <text key={a} x={(X(a) + X(b)) / 2} y={H - B + 36} textAnchor="middle" className="n2-tick n2-flag">결석</text>)}
        <line x1={L} x2={w - R} y1={Y(0)} y2={Y(0)} className="n2-axis" />
      </svg>
    </div>
  )
}

/** A5 학습관 속 위치: 학습관 학생들의 이번 주 하루 평균 공부 시간 분포(30분 구간 막대, 세로 = 학생 수). 이 학생의 평소(회색 선)와 이번 주(색 선)를 같은 축에 세운다 */
export function StudyPeerHistogram({ s, rows, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const mean = (r: typeof s, key: 'now' | 'usual') => {
    const ds = r.days.filter((d) => d.usualMinutes !== null)
    if (!ds.length) return null
    return ds.reduce((a, d) => a + (key === 'usual' ? d.usualMinutes! : d.attendance === 'present' ? d.minutes ?? 0 : 0), 0) / ds.length
  }
  const vals = rows.map((r) => mean(r, 'now')).filter((v): v is number => v !== null)
  const maxH = Math.max(2, Math.ceil(Math.max(...vals, mean(s, 'usual') ?? 0) / 60))
  const nb = maxH * 2
  const bins = Array.from({ length: nb }, (_, b) => vals.filter((v) => Math.min(nb - 1, Math.floor(v / 30)) === b).length)
  const maxC = Math.max(...bins, 1), cStep = maxC > 20 ? 10 : maxC > 8 ? 5 : 2
  const H = 264, L = 56, R = 16, T = 48, B = 40
  const X = (v: number) => L + (v / (nb * 30)) * (w - L - R), Y = (c: number) => T + (1 - c / (Math.ceil(maxC / cStep) * cStep)) * (H - T - B)
  const me = mean(s, 'now'), usual = mean(s, 'usual')
  const flag = me !== null && usual ? 100 - (me / usual) * 100 >= th.drop : false
  const close = me !== null && usual !== null && Math.abs(X(me) - X(usual)) < 64
  return (
    <div ref={ref} className="n2-plot">
      <svg width={w} height={H} role="img" aria-label="학습관 학생의 이번 주 하루 평균 공부 시간 분포와 이 학생">
        {Array.from({ length: Math.ceil(maxC / cStep) + 1 }, (_, k) => k * cStep).map((c) => <g key={c}><line x1={L} x2={w - R} y1={Y(c)} y2={Y(c)} className="n2-grid" /><text x={L - 10} y={Y(c) + 4} textAnchor="end" className="n2-tick">{c}명</text></g>)}
        {bins.map((c, b) => c > 0 && <rect key={b} x={X(b * 30) + 1.5} y={Y(c)} width={X(30) - X(0) - 3} height={Y(0) - Y(c)} rx={2} className="a5-bin" tabIndex={-1} data-tip={`하루 ${hm(b * 30)}~${hm(b * 30 + 30)} · ${c}명`} />)}
        {Array.from({ length: maxH + 1 }, (_, h) => <text key={h} x={X(h * 60)} y={H - 16} textAnchor="middle" className="n2-tick">{h}시간</text>)}
        <line x1={L} x2={w - R} y1={Y(0)} y2={Y(0)} className="n2-axis" />
        {usual !== null && <g tabIndex={0} data-tip={`${s.student.studentName} 평소 하루 ${hm(usual)}`}><line x1={X(usual)} x2={X(usual)} y1={T - 8} y2={Y(0)} className="a5-usual" /><text x={X(usual)} y={close ? T - 30 : T - 14} textAnchor="middle" className="n2-tick">평소</text></g>}
        {me !== null && <g tabIndex={0} data-tip={`${s.student.studentName} 이번 주 하루 ${hm(me)}`}><line x1={X(me)} x2={X(me)} y1={T - 8} y2={Y(0)} className={flag ? 'a5-me-flag' : 'a5-me'} /><text x={X(me)} y={T - 14} textAnchor="middle" className={`n2-tick n2-strong${flag ? ' n2-flag' : ''}`}>이번 주</text></g>}
      </svg>
    </div>
  )
}

/** A7 주별 공부 시간(5주 세로 막대): 주(7일 묶음)마다 막대 하나 = 그 주 공부 시간 합, 막대 위에 값, 아래에 주 시작일과 그 주 결석 일수.
 * 마지막(최근 7일)만 진하게, 지난 4주 평균보다 관리 기준만큼 줄면 빨강. 35일 날짜 막대보다 칸이 좁은 자리에서 흐름을 읽게 한다 */
export function StudyWeekCols({ s, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const weeks = weeksOf(s)
  const sum = weeks.map((wk) => wk.reduce((a, d) => a + (d.attendance === 'present' && d.minutes ? d.minutes : 0), 0))
  const absent = weeks.map((wk) => wk.filter((d) => d.attendance === 'absent').length)
  const avg = sum.slice(0, 4).reduce((a, b) => a + b, 0) / 4
  const fell = avg > 0 && 100 - (sum[4] / avg) * 100 >= th.drop
  const { top, ticks } = hourTicks(Math.max(60, ...sum), 4)
  const H = 262, L = 56, R = 8, T = 40, B = 50, cw = (w - L - R) / 5, bw = Math.min(46, cw * 0.5)
  const Y = (v: number) => T + (1 - v / top) * (H - T - B)
  return (
    <div ref={ref} className="n2-plot">
      <svg width={w} height={H} role="img" aria-label="최근 5주 주별 공부 시간">
        {ticks.map((t) => <g key={t}><line x1={L} x2={w - R} y1={Y(t)} y2={Y(t)} className="n2-grid" /><text x={L - 8} y={Y(t) + 4} textAnchor="end" className="n2-tick">{t / 60}시간</text></g>)}
        {weeks.map((wk, g) => {
          const cx = L + cw * (g + 0.5), recent = g === 4, v = sum[g]
          const tip = `${recent ? '최근 7일' : `${md(wk[0].date)}–${md(wk[6].date)}`} · 공부 ${hm(v)}${absent[g] ? ` · 결석 ${absent[g]}일` : ''}`
          return <g key={g} tabIndex={0} data-tip={tip} aria-label={tip}>
            <rect x={cx - bw / 2} y={Y(v)} width={bw} height={Math.max(v ? 2 : 0, Y(0) - Y(v))} rx={4} className={recent ? (fell ? 'a7-flag' : 'a7-now') : 'a7-old'} />
            {/* 칸이 좁으면 '16시간'·'46분'을 두 줄로 */}
            {(() => { const cls = `n2-tick${recent ? ' n2-strong' : ''}${recent && fell ? ' n2-flag' : ''}`, h = Math.floor(v / 60), mm = Math.round(v % 60)
              return cw >= 84 || !h || !mm ? <text x={cx} y={Y(v) - 7} textAnchor="middle" className={cls}>{hm(v)}</text>
                : <text x={cx} y={Y(v) - 25} textAnchor="middle" className={cls}><tspan x={cx}>{h}시간</tspan><tspan x={cx} dy={18}>{mm}분</tspan></text> })()}
            <text x={cx} y={H - B + 18} textAnchor="middle" className={`n2-tick${recent ? ' n2-strong' : ''}`}>{recent ? '최근 7일' : `${md(wk[0].date)}~`}</text>
            {absent[g] > 0 && <text x={cx} y={H - B + 36} textAnchor="middle" className="n2-tick n2-flag">결석 {absent[g]}일</text>}
          </g>
        })}
        <line x1={L} x2={w - R} y1={Y(0)} y2={Y(0)} className="n2-axis" />
      </svg>
    </div>
  )
}
