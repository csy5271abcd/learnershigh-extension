import {useState} from 'react'
import { studentCareApi } from '../api/studentCareApi.ts'
import { buildCareSnapshot } from '../model/careSnapshot.ts'
import { formatMetricDelta, formatMetricValue } from '../model/metricComparison.ts'
import { followUpLabel } from '../model/format.ts'
import { loadFailure, useRemote } from '../model/useRemote.ts'
import './branch-overview-v2.css'

interface Props { branchId: string; version: number; onOpenStudent: (studentId: string) => void }

/** 같은 지표는 같은 열과 눈금에 놓고, 학생 간 절대 순위 대신 본인의 변화를 표시한다. */
export function BranchOverview({ branchId, version, onOpenStudent }: Props) {
  const [selected,setSelected]=useState('STUDY_DROP')
  const remote = useRemote(`branch-metrics/${branchId}`, async () => {
    const board = await studentCareApi.board(branchId)
    const details = await Promise.all(board.students.map(student => studentCareApi.detail(branchId, student.studentId)))
    return { board, details }
  }, version)
  if (loadFailure(remote)) return <div className="sc-state" role="alert"><p>불러오지 못했습니다</p><button type="button" className="sc-button" onClick={remote.reload}>다시 시도</button></div>
  if (!remote.data) return <p className="sc-state" role="status">불러오는 중</p>
  const { board, details } = remote.data
  const rows = details.map(detail => {
    const active = board.inAdjustment.find(item => item.studentId === detail.student.studentId)
    const snapshot = buildCareSnapshot(detail)
    return { detail, snapshot, rank: active?.recheckDue ? 0 : board.needsCheck.some(item => item.studentId === detail.student.studentId) ? 1 : active ? 2 : detail.deferred ? 3 : 4 }
  }).sort((a,b) => a.rank - b.rank || a.detail.student.studentName.localeCompare(b.detail.student.studentName,'ko'))
  const columns=[['STUDY_DROP','학습 시간'],['CONSECUTIVE_ABSENCE','입실'],['START_TIME_SHIFT','입실 시각'],['EXECUTION_GAP','계획 달성률'],['SUBJECT_SHARE','과목별 학습 비율'],['PLAN_MISSING','계획 제출률']] as const
  const metrics=rows.map(row=>row.snapshot.metrics.find(metric=>metric.type===selected)!)
  const unit=metrics[0]?.unit??'minutes'
  const available=metrics.flatMap(metric=>[metric.before,metric.current].filter((value):value is number=>value!==null))
  const minimum=unit==='clock'&&available.length?Math.max(0,Math.floor(Math.min(...available)/60)*60-30):0
  const maximum=unit==='percent'?100:unit==='clock'?(available.length?Math.min(1440,Math.ceil(Math.max(...available)/60)*60+30):1440):(unit==='count'||unit==='days')?Math.ceil(Math.max(...available,1)):Math.ceil(Math.max(...available,1)/120)*120
  const position=(value:number)=>(value-minimum)/(maximum-minimum)*100
  const subject=selected==='SUBJECT_SHARE'
  return <section className="sc-branch-metrics" aria-label="학습관 학생별 비교" aria-busy={remote.status === 'loading'}>
    <div className="sc-branch-chart-select" role="group" aria-label="비교 항목">{columns.map(([key,label])=><button type="button" className="sc-button" key={key} aria-pressed={selected===key} onClick={()=>setSelected(key)}>{label}</button>)}</div>
    <header className="sc-branch-compact-head"><h2>{columns.find(([key])=>key===selected)![1]} <span>{rows.length}명</span></h2><span>{selected==='EXECUTION_GAP'?'최근 14일':'최근 7일'}</span></header>
    <div className="sc-branch-comparison-key"><span><i/>{subject?'계획':selected==='EXECUTION_GAP'?'이전 14일':'이전 3주 평균'}</span><span><i/>{subject?'실제':selected==='EXECUTION_GAP'?'최근 14일':'최근 7일'}</span></div>
    {rows.length === 0 ? <p className="sc-state">등록된 학생이 없습니다</p> : <div className="sc-branch-chart" role="region" aria-label="전체 학생 비교 차트">
      <div className="sc-branch-chart-axis"><span>{formatMetricValue(minimum,unit)}</span><span>{formatMetricValue(maximum,unit)}</span></div>
      {rows.map(({detail,snapshot,rank},index)=>{
        const metric=metrics[index]
        const held=snapshot.deferred&&!['CONSECUTIVE_ABSENCE','PLAN_MISSING'].includes(selected)
        const before=held?null:metric.before,current=held?null:metric.current
        return <div className={`sc-branch-chart-row${metric.attention&&!held?' is-attention':''}`} key={detail.student.studentId}>
          <button type="button" className="sc-branch-chart-name" onClick={()=>onOpenStudent(detail.student.studentId)}>{detail.student.studentName}{rank<=1&&<small>{rank===0?followUpLabel(detail.activeCase!.recheckDate!,detail.asOf):'확인 필요'}</small>}</button>
          <div className={`sc-branch-chart-track${unit==='clock'?' is-clock':''}`} aria-hidden="true">{before!==null&&<i className="is-before" style={{left:`${position(before)}%`}}/>}{current!==null&&<i className="is-current" style={unit==='clock'?{left:`${position(current)}%`}:{width:`${position(current)}%`}}/>}</div>
          <strong title={`${metric.beforeLabel}: ${formatMetricValue(before,unit)}`}>{metric.attention&&!held&&<span aria-label="확인 필요">! </span>}{formatMetricValue(current,unit)}<small className="sc-branch-before-value">{subject?'계획':'이전'} {formatMetricValue(before,unit)}</small></strong>
          <small className="sc-branch-chart-delta">{held?'학습 기록 부족':formatMetricDelta(metric)}{subject&&metric.view.kind==='share'&&<span>{metric.view.worst}</span>}</small>
        </div>
      })}
    </div>}
  </section>
}
