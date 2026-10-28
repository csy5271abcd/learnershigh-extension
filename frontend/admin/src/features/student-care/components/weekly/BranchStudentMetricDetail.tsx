import type {CareRosterRow} from '../../api/loadCareRoster.ts'
import type {BranchMetricKind} from '../../model/branchOverview.ts'
import {compactMinutes,dateText,displayClock,weekdayText} from '../../model/careDisplay.ts'

export function BranchStudentMetricDetail({row,kind,onClose}:{row:CareRosterRow;kind:BranchMetricKind;onClose:()=>void}){
 const label=kind==='study'?'학습 시간':kind==='arrival'?'입실 시각':kind==='absence'?'출결':'계획 제출'
 return <section className="bov-student-detail" aria-label={`${row.student.studentName} ${label} 기록`}>
  <header><h4>{row.student.studentName} <span>{label}</span></h4><button type="button" onClick={onClose}>닫기</button></header>
  <table><thead><tr><th>날짜</th><th>{label}</th>{(kind==='study'||kind==='arrival')&&<><th>평소</th><th>차이</th></>}</tr></thead><tbody>{row.review.days.map(day=>{
   const base=row.review.weekdayBaseline.find(d=>d.date===day.date),applicable=day.attendance==='present'||day.scheduled!==false&&day.attendance!=='excluded'
   let actual:string,usual='—',difference='—'
   if(kind==='submission'&&day.submission==='submitted')actual='제출'
   else if(!applicable)actual='—'
   else if(kind==='absence')actual=day.attendance==='present'?'입실':day.attendance==='absent'?'결석':'미확인'
   else if(kind==='submission'&&day.scheduled===false&&day.submission!=='submitted')actual='—'
   else if(kind==='submission')actual=day.submission==='submitted'?'제출':day.submission==='missing'?'미제출':'미확인'
   else if(day.attendance!=='present')actual=day.attendance==='absent'?'결석':'미확인'
   else if(kind==='study'){
    actual=compactMinutes(day.minutes);usual=compactMinutes(base?.minutes??null)
    if(day.minutes!==null&&base?.minutes!=null){const delta=day.minutes-base.minutes;difference=`${delta>0?'+':delta<0?'−':''}${Math.round(Math.abs(delta))}분`}
   }else{
    actual=displayClock(day.start);usual=displayClock(base?.start??null)
    if(day.start!==null&&base?.start!=null){const delta=day.start-base.start;difference=`${delta>0?'+':delta<0?'−':''}${Math.round(Math.abs(delta))}분`}
   }
   return <tr key={day.date}><th>{dateText(day.date)} <small>{weekdayText(day.date)}</small></th><td>{actual}</td>{(kind==='study'||kind==='arrival')&&<><td>{usual}</td><td>{difference}</td></>}</tr>
  })}</tbody></table>
 </section>
}
