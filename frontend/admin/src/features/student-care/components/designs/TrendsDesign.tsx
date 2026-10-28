import { useState } from 'react'
import { attendanceLabel, submissionLabel, type CareSnapshot, type DailyCareRecord } from '../../model/careSnapshot.ts'
import { shortDate } from '../../model/format.ts'
import { formatMetricDelta, formatMetricValue } from '../../model/metricComparison.ts'
import { weekdayOf } from '../../model/mockMetrics.ts'
import { type ChartPeriod } from '../../model/chartPeriods.ts'
import { PeriodMetricPlot } from './PeriodMetricPlot.tsx'
import { MetricDailyDialog } from './MetricDailyDialog.tsx'
import './TrendsDesign.css'
const WEEKDAYS=['일','월','화','수','목','금','토']
/** 차트와 별개로 모든 날짜의 입실·제출 상태를 항상 읽을 수 있다. */
function DailyStatusStrip({ days }: { days: DailyCareRecord[] }) {
  const weeks: DailyCareRecord[][] = []
  for (let index = 0; index < days.length; index += 7) weeks.push(days.slice(index, index + 7))
  return <section className="sc-trends-daily" aria-label="날짜별 입실·계획 제출 기록">
    <header><h3>날짜별 기록</h3></header>
    {weeks.length === 0 && <p className="sc-trends-empty">날짜별 기록이 없습니다.</p>}
    {weeks.map(week => <div className="sc-trends-strip-scroll" key={week[0].date} role="region" tabIndex={0} aria-label={`${shortDate(week[0].date)}부터 주간 상태`}>
      <table><caption>{shortDate(week[0].date)} — {shortDate(week.at(-1)!.date)}</caption>
        <thead><tr><th scope="col">날짜</th>{week.map(day => <th scope="col" key={day.date}><time dateTime={day.date}>{shortDate(day.date)}</time><span>{WEEKDAYS[weekdayOf(day.date)]}</span></th>)}</tr></thead>
        <tbody><tr><th scope="row">입실</th>{week.map(day => <td key={day.date} className={`is-${day.attendance}`}>{attendanceLabel(day.attendance)}</td>)}</tr>
          <tr><th scope="row">계획</th>{week.map(day => <td key={day.date} className={`is-${day.submission}`}>{submissionLabel(day.submission)}</td>)}</tr>
        </tbody>
      </table>
    </div>)}
  </section>
}

/** 핵심 지표를 동시에 보는 Overview 시안. 수치와 날짜 기록은 공통 Snapshot만 사용한다. */
export function TrendsDesign({ snapshot }: { snapshot: CareSnapshot }) {
  const [period,setPeriod]=useState<ChartPeriod>('week')
  const [offset,setOffset]=useState(0)
  const [detailType,setDetailType]=useState<string | null>(null)
  const detailMetric=snapshot.metrics.find(metric=>metric.type===detailType)
  const end=snapshot.days.length-Math.min(offset,Math.ceil(snapshot.days.length/7)-1)*7
  const scope=period==='day'?snapshot.days.slice(Math.max(0,end-7),end):snapshot.days
  const from=scope[0].date,to=scope.at(-1)!.date
  return <section className="sc-design-trends" aria-label="기간별 학습 현황">
    <div className="sc-chart-period-toolbar"><div role="group" aria-label="차트 집계 단위">{([['day','일별'],['week','주별'],['month','월별']] as const).map(([value,label])=><button type="button" className="sc-button" key={value} aria-pressed={period===value} onClick={()=>{setPeriod(value);setOffset(0)}}>{label}</button>)}</div><span>{shortDate(from)}–{shortDate(to)}</span>{period==='day'&&<div><button type="button" className="sc-button" aria-label="차트 이전 7일" disabled={end<=7} onClick={()=>setOffset(offset+1)}>‹</button><button type="button" className="sc-button" aria-label="차트 다음 7일" disabled={offset===0} onClick={()=>setOffset(offset-1)}>›</button></div>}</div>
    <div className="sc-trends-grid">{snapshot.metrics.map(metric => {
      const held = snapshot.deferred && !['CONSECUTIVE_ABSENCE', 'PLAN_MISSING'].includes(metric.type)
      return <article className="sc-trends-card" key={metric.type}>
        <header><h4>{metric.label}</h4>{(held || metric.attention) && <span className={!held ? 'sc-trends-attention' : ''}>{held ? '학습 기록 부족' : '확인 필요'}</span>}</header>
        <dl className="sc-trends-values"><div><dt>{metric.currentLabel}</dt><dd>{held ? '—' : formatMetricValue(metric.current, metric.unit)}</dd></div><div><dt>{metric.beforeLabel}</dt><dd>{held ? '—' : formatMetricValue(metric.before, metric.unit)}</dd></div></dl>
        <p className="sc-trends-change">{held ? '—' : formatMetricDelta(metric)}</p>
        {!held && <div className="sc-trends-plot"><PeriodMetricPlot metric={metric} asOf={snapshot.asOf} period={period} from={from} to={to}/></div>}
        <button type="button" className="sc-trends-detail-trigger" aria-haspopup="dialog" aria-label={`${metric.label}${metric.view.kind === 'share' ? '' : ' 일별'} 상세 보기`} onClick={()=>setDetailType(metric.type)}>{metric.view.kind === 'share' ? '과목별 보기' : '일별 보기'} <span aria-hidden="true">↗</span></button>
      </article>
    })}</div>
    <DailyStatusStrip days={snapshot.days} />
    {detailMetric && <MetricDailyDialog key={detailMetric.type} metric={detailMetric} snapshot={snapshot} onClose={()=>setDetailType(null)}/>}
  </section>
}
