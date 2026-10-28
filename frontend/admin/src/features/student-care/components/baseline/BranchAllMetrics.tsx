import { useState } from 'react'
import { studentCareApi } from '../../api/studentCareApi.ts'
import { loadFailure, useRemote } from '../../model/useRemote.ts'
import { selectedPeriodSnapshot, type CarePeriod } from '../../model/selectedPeriod.ts'
import { formatMetricValue } from '../../model/metricComparison.ts'
import { shortDate } from '../../model/format.ts'
import type { CareSnapshotMetric } from '../../model/careSnapshot.ts'
import { RecordDialog } from './RecordDialog.tsx'
import { BranchVisual } from './BranchVisual.tsx'

export function BranchAllMetrics({branchId,version,onOpenStudent}:{branchId:string;version:number;onOpenStudent:(id:string)=>void}) {
  const [period,setPeriod]=useState<CarePeriod>(7)
  const [weekend,setWeekend]=useState(false)
  const [query,setQuery]=useState('')
  const remote=useRemote(branchId,async()=>{const board=await studentCareApi.board(branchId);const details=await Promise.all(board.students.map(s=>studentCareApi.detail(branchId,s.studentId)));return {board,details}},version)
  const rows=(remote.data?.details??[]).map(detail=>({detail,snapshot:selectedPeriodSnapshot(detail,period,weekend),priority:detail.activeCase?.recheckDue?0:!detail.activeCase&&detail.signals.length?1:2})).sort((a,b)=>a.priority-b.priority||a.detail.student.studentName.localeCompare(b.detail.student.studentName,'ko'))
  const [detail,setDetail]=useState<{row:typeof rows[number];metric:CareSnapshotMetric}|null>(null)
  const shown=rows.filter(r=>`${r.detail.student.studentName} ${r.detail.student.className}`.includes(query.trim()))
  const learningMax=Math.max(60,...rows.flatMap(r=>r.snapshot.days.map(d=>d.minutes??0)))
  const starts=rows.flatMap(r=>r.snapshot.days.flatMap(d=>d.start===null?[]:[d.start]))
  const clockBounds={min:starts.length?Math.min(...starts)-30:0,max:Math.max(60,...starts)+30}
  return <section aria-label="학습관 전체 지표">
    <header className="bl-period-bar"><div><h3>전체 학생 {rows.length}명</h3>{rows[0]&&<span>{shortDate(rows[0].snapshot.days[0].date)}–{shortDate(rows[0].snapshot.asOf)}</span>}</div><div className="bl-period-controls"><input className="sc-input" type="search" aria-label="학습관 학생 검색" placeholder="이름 또는 반 검색" value={query} onChange={e=>setQuery(e.target.value)}/><div className="sc-period" role="group" aria-label="학습관 조회 기간">{([7,14,28] as const).map(n=><button className="sc-period__button" type="button" key={n} aria-pressed={period===n} onClick={()=>setPeriod(n)}>{n}일</button>)}</div><label><input type="checkbox" checked={weekend} onChange={e=>setWeekend(e.target.checked)}/>주말 제외</label></div></header>
    {loadFailure(remote)?<p role="alert">학생 기록을 불러오지 못했습니다. <button onClick={remote.reload}>다시 시도</button></p>:!remote.data?<p role="status">불러오는 중</p>:!rows.length?<p>등록된 학생이 없습니다</p>:<div className="bl-branch-scroll"><table className="bl-branch-table"><thead><tr><th>학생</th>{rows[0].snapshot.metrics.map(m=><th key={m.type}>{m.label}</th>)}</tr></thead><tbody>{shown.map(row=><tr key={row.detail.student.studentId}><th><button onClick={()=>onOpenStudent(row.detail.student.studentId)}><strong>{row.detail.student.studentName}</strong><small>{row.detail.student.className}</small>{row.priority<2&&<span className="sc-badge">확인 필요 · {row.priority===0?'재확인':'신규'}</span>}{row.detail.activeCase&&!row.detail.activeCase.recheckDue&&row.detail.activeCase.recheckDate&&<small>다음 확인 {shortDate(row.detail.activeCase.recheckDate)}</small>}</button></th>{row.snapshot.metrics.map(m=><td key={m.type}><button aria-label={`${row.detail.student.studentName} ${m.label} 상세`} onClick={()=>setDetail({row,metric:m})}><strong>{formatMetricValue(m.current,m.unit)}</strong>{m.type==='SUBJECT_SHARE'?<small>최근 7일 · 계획 대비</small>:<small>{period}일</small>}<BranchVisual metric={m} snapshot={row.snapshot} maxMinutes={learningMax} clockBounds={clockBounds}/></button></td>)}</tr>)}</tbody></table>{!shown.length&&<p>조건에 맞는 학생이 없습니다</p>}</div>}
    {detail&&<RecordDialog name={detail.row.detail.student.studentName} item={detail.metric} snapshot={detail.row.snapshot} onClose={()=>setDetail(null)}/>}
  </section>
}
