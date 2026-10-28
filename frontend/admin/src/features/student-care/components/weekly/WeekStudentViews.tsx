import { useState, type ReactNode } from 'react'
import type { WeeklyReview, WeekDay } from '../../model/weeklyReviewTypes.ts'
import type { CareSnapshotMetric, DailyCareRecord } from '../../model/careSnapshot.ts'
import { formatMetricDelta, formatMetricValue } from '../../model/metricComparison.ts'
import { shortDate } from '../../model/format.ts'
import { missingRecordLabel } from '../../model/branchDistribution.ts'
import { clock, weekdayOf } from '../../model/mockMetrics.ts'
import './WeekStudentViews.css'

interface Props {
  snapshot: WeeklyReview
  design: 2 | 3 | 4
  onMetric: (metric: CareSnapshotMetric) => void
  onDay: (day: DailyCareRecord) => void
  expanded?: boolean
}
const week = ['일', '월', '화', '수', '목', '금', '토']
const dateLabel = (date: string) => `${shortDate(date)} ${week[weekdayOf(date)]}`
const duration = (value: number | null) => value === null ? '미기록' : formatMetricValue(value, 'minutes')
function status(day: WeekDay, kind: 'attendance' | 'submission') {
  if (kind === 'attendance') {
    if (day.attendance === 'present') return '입실'
    if(day.attendance==='unknown')return missingRecordLabel(day,'start')
    if (day.scheduled === false || day.attendance === 'excluded') return '입실 기록 없음'
    return { present: '입실', absent: '입실 기록 없음', unknown: '기록 없음', excluded: '입실 기록 없음' }[day.attendance]
  }
  return { submitted: '제출', missing: '미제출', unknown: '기록 없음', excluded: '제외' }[day.submission]
}
function stateClass(day: WeekDay, kind: 'attendance' | 'submission') {
  if (kind === 'attendance' && day.attendance === 'present') return 'ok'
  if (kind === 'attendance' && (day.scheduled === false)) return 'off'
  const state = day[kind]
  return state === 'present' || state === 'submitted' ? 'ok' : state === 'absent' || state === 'missing' ? 'warn' : 'off'
}

export function WeekStudentViews(props: Props) {
  const { snapshot, design } = props
  return <div className={`ww-student ww-student--${design}`}>
    <div className="ww-range"><strong>{shortDate(snapshot.days[0].date)}–{shortDate(snapshot.asOf)} · 최근 7일</strong><span>본인 비교 기준 {snapshot.asOf.slice(0,4)}년 {shortDate(snapshot.baselineFrom)}–{shortDate(snapshot.baselineTo)} · 28일</span></div>
    {design === 2 ? <MetricCards {...props} /> : design === 3 ? <CoordinatedWeek {...props} /> : <RecordBoard {...props} />}
  </div>
}

function MetricHeader({ metric, onMetric }: { metric: CareSnapshotMetric; onMetric: Props['onMetric'] }) {
  return <header className="ww-metric-head"><div><h4>{metric.label}{metric.attention && <span className="ww-attention">확인 필요</span>}</h4><strong className="ww-delta">{formatMetricDelta(metric)}</strong></div><button type="button" className="ww-detail" onClick={() => onMetric(metric)} aria-label={`${metric.label} 상세 보기`}>상세 <span aria-hidden="true">↗</span></button></header>
}
function Comparison({ metric }: { metric: CareSnapshotMetric }) {
  return <div className="ww-comparison"><span>{metric.beforeLabel} <b>{formatMetricValue(metric.before, metric.unit)}</b></span><span>{metric.currentLabel} <b>{formatMetricValue(metric.current, metric.unit)}</b></span></div>
}
function MetricCards(props: Props) {
  const { snapshot, onMetric } = props
  const flagged = snapshot.metrics.filter(metric => metric.attention)
  const normal = snapshot.metrics.filter(metric => !metric.attention)
  const card = (metric: CareSnapshotMetric) => <article key={metric.type} className={`ww-card ${metric.attention ? 'ww-card--attention' : ''}`}><MetricHeader metric={metric} onMetric={onMetric} /><Comparison metric={metric} />{metric.type === 'EXECUTION_GAP' && <p className="ww-coverage">달성률: 입실·계획·실제 기록 {snapshot.recent.comparablePlanDays}/7일</p>}<MetricVisual metric={metric} {...props} /></article>
  return <><div className="ww-attention-cards">{flagged.map(card)}</div>{normal.length > 0 && <><h4 className="ww-section-label">평소 흐름</h4><div className="ww-normal-cards">{normal.map(card)}</div></>}</>
}
function MetricVisual({ metric, ...props }: Props & { metric: CareSnapshotMetric }) {
  switch (metric.type) {
    case 'CONSECUTIVE_ABSENCE': return <StatusTable {...props} kinds={['attendance']} />
    case 'PLAN_MISSING': return <StatusTable {...props} kinds={['submission']} />
    case 'START_TIME_SHIFT': return <DailyChart snapshot={props.snapshot} kind="clock" />
    case 'EXECUTION_GAP': return <DailyChart snapshot={props.snapshot} kind="execution" />
    case 'SUBJECT_SHARE': return <SubjectPairs metric={metric} />
    default: return <DailyChart snapshot={props.snapshot} kind="study" />
  }
}

function StatusTable({ snapshot, kinds, onDay }: Pick<Props, 'snapshot' | 'onDay'> & { kinds: ('attendance' | 'submission')[] }) {
  return <div className="ww-status-wrap"><table className="ww-status-table"><thead><tr><th scope="col">기록</th>{snapshot.days.map(day => <th key={day.date} scope="col"><span>{shortDate(day.date)}</span><small>{week[weekdayOf(day.date)]}</small></th>)}</tr></thead><tbody>{kinds.map(kind => <tr key={kind}><th scope="row">{kind === 'attendance' ? '입실' : '계획'}</th>{snapshot.days.map(day => <td key={day.date}><button type="button" className={`ww-state ww-state--${stateClass(day, kind)}`} onClick={() => onDay(day)} aria-label={`${dateLabel(day.date)} ${status(day, kind)} 상세`}>{status(day, kind)}</button></td>)}</tr>)}</tbody></table></div>
}

const W = 560, L = 64, R = 14, TOP = 16, BOTTOM = 126, STEP = (W - L - R) / 7
const x = (index: number) => L + STEP * (index + .5)
function Legend({ kind }: { kind: 'study' | 'clock' | 'execution' }) {
  return <div className="ww-legend"><span><i className={kind === 'clock' ? 'ww-key ww-key--dot' : 'ww-key'} />{kind === 'execution' ? '실제' : kind === 'clock' ? '입실 시각' : '학습 시간'}</span><span title="표시한 최근7일 이전28일의 같은 요일 기록 평균"><i className="ww-key ww-key--baseline" />{kind === 'execution' ? '계획' : '요일 평균'}</span></div>
}
function DailyChart({ snapshot, kind, axis = true, presentation = 'columns' }: { snapshot: WeeklyReview; kind: 'study' | 'clock' | 'execution'; axis?: boolean; presentation?: 'columns' | 'trend' }) {
  const [activeIndex,setActiveIndex]=useState(0)
  const { days, weekdayBaseline } = snapshot
  const base = days.map(day => weekdayBaseline.find(item => item.date === day.date))
  const values = days.flatMap((day, i) => kind === 'clock' ? [day.start, base[i]?.start ?? null] : kind === 'execution' ? [day.planned, day.actual] : [day.minutes, base[i]?.minutes ?? null]).filter((v): v is number => v !== null)
  const low = kind === 'clock' ? Math.max(0, Math.floor((Math.min(...values, 18 * 60) - 30) / 60) * 60) : 0
  const high = kind === 'clock' ? Math.min(24 * 60, Math.ceil((Math.max(...values, 21 * 60) + 30) / 60) * 60) : Math.max(120, Math.ceil(Math.max(...values, 0) / 120) * 120)
  const y = (value: number) => BOTTOM - (value - low) / (high - low || 1) * (BOTTOM - TOP)
  const ticks = kind === 'clock' ? [low, (low + high) / 2, high] : [0, high / 2, high]
  const title = kind === 'clock' ? '날짜별 입실 시각' : kind === 'study' ? '날짜별 학습 시간' : '날짜별 계획과 실제 학습 시간'
  const trend = kind === 'study' && presentation === 'trend'
  const lineSegments = (items: (number | null)[], baseline = false): ReactNode[] => items.flatMap((value, i) => value !== null && i > 0 && items[i - 1] !== null ? [<line key={`line${i}`} x1={x(i - 1)} y1={y(items[i - 1]!)} x2={x(i)} y2={y(value)} className={baseline ? 'ww-svg-baseline' : 'ww-svg-line'} />] : [])
  const active=days[activeIndex]
  return <figure className="ww-chart"><Legend kind={kind} /><div className="ww-plot-box"><svg viewBox={`0 0 ${W} ${axis ? 188 : 136}`} role="img" aria-label={title}><title>{title} · {days.map((day, i) => `${dateLabel(day.date)} ${kind === 'clock' ? (day.start === null ? missingRecordLabel(day,'start') : clock(day.start)) : kind === 'execution' ? `계획 ${duration(day.planned)}, 실제 ${duration(day.actual)}` : `${duration(day.minutes)}, 같은 요일 평균 ${duration(base[i]?.minutes ?? null)}`}`).join('; ')}</title>
    {ticks.map(tick => <g key={tick}><line x1={L} x2={W - R} y1={y(tick)} y2={y(tick)} className="ww-svg-grid" /><text x={L - 8} y={y(tick) + 4} textAnchor="end">{kind === 'clock' ? clock(Math.round(tick)) : `${Number((tick / 60).toFixed(1))}h`}</text></g>)}
    {kind === 'clock' && <>{lineSegments(base.map(item => item?.start ?? null), true)}{lineSegments(days.map(day => day.start))}</>}
    {trend && <>{lineSegments(base.map(item => item?.minutes ?? null), true)}{lineSegments(days.map(day => day.minutes))}</>}
    {days.map((day, i) => {
      const current = kind === 'clock' ? day.start : kind === 'execution' ? day.actual : day.minutes
      const previous = kind === 'clock' ? base[i]?.start ?? null : kind === 'execution' ? day.planned : base[i]?.minutes ?? null
      return <g key={day.date}>
        <title>{dateLabel(day.date)} · {kind === 'clock' ? `입실 ${current === null ? '미기록' : clock(current)}, 같은 요일 평균 ${previous === null ? '미기록' : clock(previous)}` : `실제 ${duration(current)}, ${kind === 'execution' ? '계획' : '같은 요일 평균'} ${duration(previous)}`}</title>
        {kind === 'clock' || trend ? <>{previous !== null && <circle cx={x(i)} cy={y(previous)} r="4" className="ww-svg-base-dot" />}{current !== null && <circle cx={x(i)} cy={y(current)} r="5" className="ww-svg-dot" />}</> : <>{previous !== null && <rect x={x(i) - 19} y={y(previous)} width="16" height={Math.max(0, BOTTOM - y(previous))} rx="2" className="ww-svg-base-bar" />}{current !== null && <rect x={x(i) + 3} y={y(current)} width="16" height={Math.max(0, BOTTOM - y(current))} rx="2" className="ww-svg-bar" />}{current === 0 && <circle cx={x(i) + 11} cy={BOTTOM} r="2" className="ww-svg-dot" />}</>}
        {current === null && <text className="ww-svg-missing" x={x(i)} y={BOTTOM - 5} textAnchor="middle">—</text>}
        {axis && <><text x={x(i)} y="154" textAnchor="middle">{shortDate(day.date)}</text><text x={x(i)} y="178" textAnchor="middle">{week[weekdayOf(day.date)]}</text></>}
      </g>
    })}
  </svg><div className="ww-date-hits">{days.map((d,i)=><button type="button" key={d.date} aria-label={`${title} ${dateLabel(d.date)} 정확한 값`} onMouseEnter={()=>setActiveIndex(i)} onFocus={()=>setActiveIndex(i)} onClick={()=>setActiveIndex(i)} data-active={activeIndex===i}/>)}</div></div>
  <figcaption className="ww-readout"><b>{dateLabel(active.date)}</b>{kind==='clock'?<span>{active.start===null?missingRecordLabel(active,'start'):`입실 ${clock(active.start)}`} · 요일 평균 {base[activeIndex]?.start===null||base[activeIndex]?.start===undefined?'—':clock(base[activeIndex]!.start!)}</span>:kind==='execution'?<span>계획 {duration(active.planned)} · 실제 {duration(active.actual)}</span>:<span>학습 {duration(active.minutes)} · 요일 평균 {duration(base[activeIndex]?.minutes??null)}</span>}</figcaption></figure>
}

function SubjectPairs({ metric }: { metric: CareSnapshotMetric }) {
  if (metric.view.kind !== 'share') return null
  const maximum = Math.min(100, Math.max(10, Math.ceil(Math.max(...metric.view.subjects.flatMap(subject => [subject.plan, subject.actual]), 0) * 1.1 / 10) * 10))
  return <div className="ww-subjects"><div className="ww-legend"><span><i className="ww-key ww-key--baseline" />최근 7일 계획</span><span><i className="ww-key" />최근 7일 실제</span></div><div className="ww-subject-axis"><span>비중</span><span>0%</span><span>{maximum / 2}%</span><span>{maximum}%</span></div>{metric.view.subjects.map(subject => <div className="ww-subject" key={subject.name}><strong>{subject.name}</strong><div className="ww-subject-bars"><div><span className="ww-subject-plan" style={{ width: `${Math.min(100, Math.max(0, subject.plan) / maximum * 100)}%` }} /></div><div><span className="ww-subject-actual" style={{ width: `${Math.min(100, Math.max(0, subject.actual) / maximum * 100)}%` }} /></div></div><span className="ww-subject-values"><span title={`${subject.plan}%`}>{Number(subject.plan.toFixed(1))}%</span><b title={`${subject.actual}%`}>{Number(subject.actual.toFixed(1))}%</b></span></div>)}</div>
}

function CoordinatedWeek(props: Props) {
  const { snapshot, onMetric } = props
  const find = (type: CareSnapshotMetric['type']) => snapshot.metrics.find(metric => metric.type === type)
  const band = (type: CareSnapshotMetric['type'], title: string, content: ReactNode) => {
    const metric = find(type)
    return { attention: Boolean(metric?.attention), node: <section key={type} className={`ww-week-band ${metric?.attention ? 'ww-week-band--attention' : ''}`}><header><h4>{title}</h4>{metric && !props.expanded && <button type="button" className="ww-detail" onClick={() => onMetric(metric)} aria-label={`${title} 상세 보기`}>상세 ↗</button>}</header>{metric && <Comparison metric={metric} />}{type === 'EXECUTION_GAP' && <p className="ww-coverage">달성률: 입실·계획·실제 기록 {snapshot.recent.comparablePlanDays}/7일</p>}{content}</section> }
  }
  const subject = find('SUBJECT_SHARE')
  const statusAttention = Boolean(find('CONSECUTIVE_ABSENCE')?.attention || find('PLAN_MISSING')?.attention)
  const bands = [{ attention: statusAttention, node: <section key="status" className={`ww-week-band ${statusAttention ? 'ww-week-band--attention' : ''}`}><header><h4>입실·계획 제출</h4><div className="ww-inline-actions">{(['CONSECUTIVE_ABSENCE', 'PLAN_MISSING'] as const).map(type => { const m = find(type); return m && !props.expanded && <button type="button" key={type} className="ww-detail" onClick={() => onMetric(m)}>{type === 'PLAN_MISSING' ? '제출' : '입실'} 상세 ↗</button> })}</div></header><StatusTable {...props} kinds={['attendance', 'submission']} /></section> }, band('STUDY_DROP', '학습 시간', <DailyChart snapshot={snapshot} kind="study" presentation="trend" />), band('START_TIME_SHIFT', '입실 시각', <DailyChart snapshot={snapshot} kind="clock" />), band('EXECUTION_GAP', '계획과 실행', <DailyChart snapshot={snapshot} kind="execution" />)]
  if (subject) bands.push(band('SUBJECT_SHARE', '과목별 계획·실제', <SubjectPairs metric={subject} />))
  return <div className="ww-coordinated">{bands.sort((a, b) => Number(b.attention) - Number(a.attention)).map(item => item.node)}</div>
}

function RecordBoard(props: Props) {
  const { snapshot, onDay, onMetric } = props
  const maxMinutes = Math.ceil(Math.max(120, ...snapshot.days.flatMap(day => [day.minutes ?? 0, day.planned ?? 0, day.actual ?? 0]), ...snapshot.weekdayBaseline.map(day => day.minutes ?? 0)) / 60) * 60
  const starts = snapshot.days.flatMap(day => day.start === null ? [] : [day.start]).concat(snapshot.weekdayBaseline.flatMap(day => day.start === null ? [] : [day.start]))
  const startMin = Math.max(0, Math.floor((Math.min(...starts, 18 * 60) - 30) / 60) * 60)
  const startMax = Math.min(1440, Math.ceil((Math.max(...starts, 21 * 60) + 30) / 60) * 60)
  const subject = snapshot.metrics.find(metric => metric.type === 'SUBJECT_SHARE')
  const subjectSection = subject && <section className="ww-record-subject"><MetricHeader metric={subject} onMetric={onMetric} /><SubjectPairs metric={subject} /></section>
  const miniBar = (value: number | null, base = false) => value === null ? <span className="ww-mini-track ww-mini-track--missing" aria-label="미기록" /> : <span className={`ww-mini-track ${base ? 'ww-mini-track--plan' : ''}`}><i style={{ width: `${value / maxMinutes * 100}%` }} /></span>
  return <div className="ww-records">{subject?.attention && subjectSection}<header className="ww-records-header"><h4>날짜별 학습 기록</h4><span>최근 7일 {formatMetricValue(snapshot.metrics.find(m=>m.type==='STUDY_DROP')?.current??null,'minutes')} · 직전 4주 주평균 {formatMetricValue(snapshot.metrics.find(m=>m.type==='STUDY_DROP')?.before??null,'minutes')}</span></header><div className="ww-record-grid ww-record-grid--head"><span>날짜·입실·제출</span><span>학습 시간 <small>0–{duration(maxMinutes)}</small></span><span>입실 시각 <small>{clock(startMin)}–{clock(startMax)}</small></span><span>계획 / 실제 <small>0–{duration(maxMinutes)}</small></span></div>{snapshot.days.map(day => {
    const baseline = snapshot.weekdayBaseline.find(item => item.date === day.date)
    return <article className="ww-record-grid ww-record-row" key={day.date}><div className="ww-record-date"><button type="button" onClick={() => onDay(day)} aria-label={`${day.date} 날짜 상세 보기`}>{dateLabel(day.date)} <span aria-hidden="true">↗</span></button><div><span className={`ww-badge ww-state--${stateClass(day, 'attendance')}`}>{status(day, 'attendance')}</span><span className={`ww-badge ww-state--${stateClass(day, 'submission')}`}>{status(day, 'submission')}</span></div></div><div className="ww-record-cell"><span className="ww-mobile-label">학습 시간</span><b>{duration(day.minutes)}</b><div className="ww-record-track">{miniBar(day.minutes)}{baseline?.minutes !== null && baseline?.minutes !== undefined && <i className="ww-baseline-marker" style={{ left: `${Math.min(100, baseline.minutes / maxMinutes * 100)}%` }} title={`같은 요일 평균 ${duration(baseline.minutes)}`} />}</div></div><div className="ww-record-cell"><span className="ww-mobile-label">입실 시각</span><b>{day.start === null ? '미기록' : clock(day.start)}</b><div className="ww-clock-track">{baseline?.start !== null && baseline?.start !== undefined && <i className="ww-clock-base" style={{ left: `${(baseline.start - startMin) / (startMax - startMin) * 100}%` }} title={`같은 요일 평균 ${clock(baseline.start)}`} />}{day.start !== null && <i className="ww-clock-point" style={{ left: `${(day.start - startMin) / (startMax - startMin) * 100}%` }} />}</div></div><div className="ww-record-cell ww-record-execution"><span className="ww-mobile-label">계획 / 실제</span><div><span>계획 {duration(day.planned)}</span>{miniBar(day.planned, true)}</div><div><span>실제 {duration(day.actual)}</span>{miniBar(day.actual)}</div></div></article>
  })}<div className="ww-record-legend"><span><i className="ww-key" />실제</span><span><i className="ww-key ww-key--baseline" />계획 · 회색 눈금은 같은 요일 평균</span></div><div className="ww-record-metrics">{snapshot.metrics.filter(metric => metric.type !== 'SUBJECT_SHARE').map(metric => <button type="button" className={metric.attention ? 'ww-detail ww-detail--attention' : 'ww-detail'} key={metric.type} onClick={() => onMetric(metric)}>{metric.label} 상세 ↗</button>)}</div>{!subject?.attention && subjectSection}</div>
}
