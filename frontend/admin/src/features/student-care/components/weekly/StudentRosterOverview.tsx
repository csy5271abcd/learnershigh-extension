import { useState } from 'react'
import { studentCareApi } from '../../api/studentCareApi.ts'
import { loadFailure, useRemote } from '../../model/useRemote.ts'
import { weeklyReview } from '../../model/weeklyReview.ts'
import { formatMetricValue } from '../../model/metricComparison.ts'
import { shortDate } from '../../model/format.ts'
import type { WeekDay } from '../../model/weeklyReviewTypes.ts'
function DayRecord({day,max}:{day:WeekDay;max:number}){
 const entered=day.attendance==='present',submitted=day.submission==='submitted'
 const enter=entered?'●':day.attendance==='absent'?'×':day.attendance==='excluded'?'–':'?'
 const plan=submitted?'✓':day.submission==='missing'?'×':'?'
 const h=day.minutes===null?null:Math.floor(day.minutes/60),m=day.minutes===null?null:Math.round(day.minutes%60)
 return <div className="wk-roster-day">
  <b>{h===null?'미기록':h?`${h}시간`:`${m}분`}{h!==null&&h>0&&m!==0&&<small>{m}분</small>}</b>
  <span className="wk-roster-day-track" data-missing={day.minutes===null}><i style={{width:`${(day.minutes??0)/max*100}%`}}/></span>
  <span className="wk-roster-day-states"><i data-alert={day.attendance==='absent'} aria-label={entered?'입실':day.attendance==='excluded'?'입실 기록 없음':day.attendance==='absent'?'미입실':'입실 미기록'}>{enter}</i><span>/</span><i data-alert={day.submission==='missing'} aria-label={submitted?'계획 제출':day.submission==='missing'?'계획 미제출':'제출 미기록'}>{plan}</i></span>
 </div>
}
export function StudentRosterOverview({branchId,version,onOpenStudent}:{branchId:string;version:number;onOpenStudent:(id:string)=>void}){
 const [query,setQuery]=useState('')
 const remote=useRemote(branchId,async()=>{const board=await studentCareApi.board(branchId);const details=await Promise.all(board.students.map(s=>studentCareApi.detail(branchId,s.studentId)));return {board,details}},version)
 const rows=(remote.data?.details??[]).map(detail=>({detail,snapshot:weeklyReview(detail),priority:detail.activeCase?.recheckDue?0:!detail.activeCase&&detail.signals.length?1:detail.activeCase?2:detail.deferred?3:4})).sort((a,b)=>a.priority-b.priority||a.detail.student.studentName.localeCompare(b.detail.student.studentName,'ko'))
 const shown=rows.filter(r=>`${r.detail.student.studentName} ${r.detail.student.className}`.includes(query.trim()))
 const max=Math.max(60,...rows.flatMap(r=>r.snapshot.days.map(d=>d.minutes??0)))
 if(loadFailure(remote))return <p role="alert">명부를 불러오지 못했습니다. <button onClick={remote.reload}>다시 시도</button></p>
 if(!remote.data)return <p role="status">불러오는 중</p>
 return <section className="wk-roster" aria-label="전체 학생 지표">
  <header><div><h2>전체 학생 <span>{rows.length}명</span></h2><p>최근 7일 {rows[0]&&`${shortDate(rows[0].snapshot.days[0].date)}–${shortDate(rows[0].snapshot.asOf)}`} · 확인 필요 {rows.filter(r=>r.priority<2).length}명</p></div><input className="sc-input" type="search" aria-label="전체 학생 검색" placeholder="이름 또는 반 검색" value={query} onChange={e=>setQuery(e.target.value)}/></header>
  <p className="wk-roster-key">날짜별 학습 시간 · 아래 기호는 입실 / 계획 제출　● 입실　✓ 제출　× 미입실·미제출　– 입실 기록 없음　? 미기록</p>
  <div className="wk-roster-scroll"><table><thead><tr><th>학생</th>{rows[0]?.snapshot.days.map(d=><th key={d.date} className="wk-roster-date">{shortDate(d.date)}<small>{'일월화수목금토'[new Date(d.date+'T00:00:00Z').getUTCDay()]}</small></th>)}<th>7일 학습 합계</th><th>입실일 평균<small>학습 시간</small></th><th>7일 평균<small>입실 시각</small></th><th>계획 달성률</th><th>과목 비중 차이<small>계획 대비 최대 %p</small></th></tr></thead><tbody>{shown.map(row=>{
   const s=row.snapshot, find=(type:string)=>s.metrics.find(m=>m.type===type)
   const subject=find('SUBJECT_SHARE')?.view
   const largest=subject?.kind==='share'?[...subject.subjects].sort((a,b)=>Math.abs(b.actual-b.plan)-Math.abs(a.actual-a.plan))[0]:null
   return <tr key={row.detail.student.studentId} className={row.detail.signals.length||row.detail.activeCase?'wk-roster-alert':''} onClick={()=>onOpenStudent(row.detail.student.studentId)}>
    <th><button type="button" onClick={e=>{e.stopPropagation();onOpenStudent(row.detail.student.studentId)}} aria-label={`${row.detail.student.studentName} 지표 보기`}><strong>{row.detail.student.studentName} <span aria-hidden="true">↗</span></strong><small>{row.detail.student.className}</small>{row.priority<2?<em>{row.priority===0?'경과 확인':'상담 필요'}</em>:row.detail.activeCase?.recheckDate?<small>다음 확인 {shortDate(row.detail.activeCase.recheckDate)}</small>:row.detail.deferred?<small>기록 부족</small>:null}</button></th>
    {s.days.map(d=><td className="wk-roster-day-cell" key={d.date}><DayRecord day={d} max={max}/></td>)}
    <td><b>{formatMetricValue(find('STUDY_DROP')?.current??null,'minutes')}</b><small>본인 직전 4주 {formatMetricValue(find('STUDY_DROP')?.before??null,'minutes')}</small></td><td>{formatMetricValue(s.recent.minutesPerVisit,'minutes')}</td><td>{formatMetricValue(find('START_TIME_SHIFT')?.current??null,'clock')}</td>
    <td><b>{formatMetricValue(find('EXECUTION_GAP')?.current??null,'percent')}</b><span className="wk-roster-rate"><i style={{width:`${Math.min(100,find('EXECUTION_GAP')?.current??0)}%`}}/></span><small>입실·계획 기록 {s.recent.comparablePlanDays}일</small></td>
    <td><b className="wk-subject-gap" data-attention={row.detail.signals.some(signal=>signal.type==='SUBJECT_SHARE')}>{largest&&largest.actual>largest.plan&&'+'}{largest?`${largest.actual-largest.plan}%p`:'미기록'}</b>{largest&&<small>{largest.name} · 계획 {largest.plan}% / 실제 {largest.actual}%</small>}</td>
   </tr>
  })}</tbody></table></div>{!shown.length&&<p>조건에 맞는 학생이 없습니다.</p>}
 </section>
}
