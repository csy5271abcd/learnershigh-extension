import { useEffect, useRef } from 'react'
import type { CareSnapshot, CareSnapshotMetric } from '../../model/careSnapshot.ts'
import { shortDate } from '../../model/format.ts'
import { DateMatrix } from './RecordDesigns.tsx'
import { PeriodMetricPlot } from './PeriodMetricPlot.tsx'
import { DailyMetricChart } from './DailyMetricChart.tsx'

interface Props { metric: CareSnapshotMetric; snapshot: CareSnapshot; onClose: () => void }

/** 요약을 유지한 채 선택 지표의 날짜 근거만 연다. 과목별 일별 원본은 아직 없다. */
export function MetricDailyDialog({ metric, snapshot, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const days = snapshot.days
  const from = days[0].date, to = days.at(-1)!.date
  const subject = metric.view.kind === 'share'
  useEffect(() => { dialog.current?.showModal() }, [])
  return <dialog ref={dialog} className="sc-metric-dialog" aria-labelledby="sc-metric-daily-title" onClose={onClose}>
    <header className="sc-metric-dialog__head">
      <h2 id="sc-metric-daily-title">{metric.label}{!subject && ' · 일별'}</h2>
      <button type="button" className="sc-button" onClick={() => dialog.current?.close()} autoFocus>닫기</button>
    </header>
    {subject ? <>
      <p className="sc-metric-dialog__availability">최근 7일 · 일별 과목 기록 없음</p>
      <PeriodMetricPlot metric={metric} asOf={snapshot.asOf} period="week" from={from} to={to}/>
    </> : <>
      <p className="sc-metric-dialog__range">{shortDate(from)}–{shortDate(to)} · {days.length}일 전체</p>
      <div className="sc-metric-dialog__chart">
        {metric.view.kind === 'planActual'||metric.view.kind === 'line'||(metric.view.kind === 'weekly'&&metric.view.unit === 'minutes')
          ? <DailyMetricChart metric={metric} days={days}/>
          : <PeriodMetricPlot metric={metric} asOf={snapshot.asOf} period="day" from={from} to={to}/>}
      </div>
      <details className="sc-daily-related"><summary>날짜별 기록표</summary><DateMatrix snapshot={snapshot} showPlan={metric.view.kind === 'planActual'}/></details>
    </>}
  </dialog>
}
