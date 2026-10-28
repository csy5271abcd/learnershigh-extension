import type {CareBoard,SignalSummary} from '../../model/types.ts'
import {dateText} from '../../model/careDisplay.ts'

/** Existing care decisions, kept separate from the descriptive population distribution. */
export function BranchCareQueue({board,onOpenStudent}:{board:CareBoard;onOpenStudent:(id:string)=>void}){
 const groups=[
  {label:'상담 후 확인',students:board.inAdjustment.filter(s=>s.recheckDue).map(s=>({...s,date:s.recheckDate}))},
  {label:'상담 필요',students:board.needsCheck.map(s=>({...s,date:null}))},
 ]
 const reason=(s:SignalSummary)=>{
  const summary=s.summary.replaceAll('계획 달성률','계획 대비 진행률')
  if(s.type==='CONSECUTIVE_ABSENCE')return summary.replace(/^최근 7일 중 /,'').replace(/일 미입실$/,'일')
  if(s.type==='PLAN_MISSING')return summary.replace(/^최근 7일 중 /,'').replace(/일 미제출$/,'일')
  if(s.type==='EXECUTION_GAP')return summary.replace(/^최근 7일 계획 대비 진행률 /,'')
  return summary.replace(/^최근 7일 /,'')
 }
 const label=(s:SignalSummary)=>({CONSECUTIVE_ABSENCE:'결석',PLAN_MISSING:'계획 미제출',STUDY_DROP:'학습 시간 감소',EXECUTION_GAP:'계획 대비 진행률',SUBJECT_SHARE:'과목 비중',START_TIME_SHIFT:'입실 지연'}[s.type])
 if(groups.every(g=>g.students.length===0))return <section className="cm-care-queue cm-care-empty" aria-label="상담 필요"><h3>상담 필요 <span>0명</span></h3></section>
 return <div className="cm-care-groups">{groups.filter(g=>g.students.length>0).map(group=><section className="cm-care-queue" aria-label={group.label} key={group.label}>
  <h3>{group.label} <span>{group.students.length}명</span></h3>
  <ul>{group.students.map(student=><li key={student.studentId}><button type="button" aria-label={`${student.studentName} 상담 상세`} onClick={()=>onOpenStudent(student.studentId)}>
   <span className="cm-care-name"><b>{student.studentName}</b>{student.date&&<small>확인일 {dateText(student.date)}</small>}</span>
   <span className="cm-care-reasons">{student.date&&<small className="cm-care-history-label">상담 당시 사유</small>}{student.signals.map(signal=><span key={signal.type}><b>{label(signal)}</b> · {reason(signal)}</span>)}</span><span className="cm-care-arrow" aria-hidden="true">→</span>
  </button></li>)}</ul>
 </section>)}</div>
}
