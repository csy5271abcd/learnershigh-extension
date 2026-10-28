import { fromServerReview, type ServerWeeklyReview } from './serverWeeklyReview.ts'
import { previewCareDays } from '../api/previewData.ts'
import { buildCareSnapshot, type SnapshotInput } from './careSnapshot.ts'
import { addDays } from './format.ts'
import type { WeeklyReview, WeekDay } from './weeklyReviewTypes.ts'

const average=(values:number[])=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null
const total=(days:WeekDay[])=>days.some(d=>d.minutes!==null)?days.reduce((n,d)=>n+(d.minutes??0),0):null
const count=(days:WeekDay[])=>days.some(d=>d.attendance!=='unknown')?days.filter(d=>d.attendance==='present').length:null
const submission=(days:WeekDay[])=>{const known=days.filter(d=>d.submission==='submitted'||d.submission==='missing');return known.length?known.filter(d=>d.submission==='submitted').length/known.length*100:null}
const execution=(days:WeekDay[])=>{const known=days.filter(d=>d.attendance==='present'&&d.planned!==null&&d.actual!==null&&d.planned>0);const plan=known.reduce((n,d)=>n+d.planned!,0);return plan?known.reduce((n,d)=>n+d.actual!,0)/plan*100:null}
const clock=(days:WeekDay[])=>average(days.filter(d=>d.attendance==='present'&&d.start!==null).map(d=>d.start!))
const weekday=(date:string)=>new Date(`${date}T00:00:00Z`).getUTCDay()

/** 고정28/7. 관찰 주를 기준 평균에 섞지 않으며 자료는 FE 예시다. */
export function weeklyReview(input:SnapshotInput & {careDays?:WeekDay[];serverReview?:ServerWeeklyReview}, records?:WeekDay[]):WeeklyReview {
  if(input.serverReview)return fromServerReview(input.serverReview,input.asOf,input.signals,Boolean(input.deferred))
  records ??= input.careDays??previewCareDays(input.student.studentId,input.asOf)
  const baselineFrom=addDays(input.asOf,-34),baselineTo=addDays(input.asOf,-7),from=addDays(input.asOf,-6)
  const byDate=new Map(records.map(d=>[d.date,d]))
  const complete=(start:string,length:number):WeekDay[]=>Array.from({length},(_,i)=>{
    const date=addDays(start,i)
    return byDate.get(date)??{date,attendance:'unknown',submission:'unknown',minutes:null,start:null,planned:null,actual:null,scheduled:null}
  })
  const days=complete(from,7), baselineDays=complete(baselineFrom,28)
  const original=buildCareSnapshot(input,7)
  const baselineTotal=baselineDays.every(d=>d.minutes!==null)?total(baselineDays):null,currentTotal=total(days)
  const baselineCount=baselineDays.every(d=>d.attendance!=='unknown')?count(baselineDays):null
  const metrics=original.metrics.map(metric=>{
    let current:number|null=null,before:number|null=null
    switch(metric.type){
      case 'CONSECUTIVE_ABSENCE':current=count(days);before=baselineCount===null?null:baselineCount/4;break
      case 'STUDY_DROP':current=currentTotal;before=baselineTotal===null?null:baselineTotal/4;break
      case 'PLAN_MISSING':current=submission(days);before=submission(baselineDays);break
      case 'START_TIME_SHIFT':current=clock(days);before=clock(baselineDays);break
      case 'EXECUTION_GAP':current=execution(days);before=execution(baselineDays);break
      case 'SUBJECT_SHARE':return {...metric,beforeLabel:`${metric.view.kind==='share'?metric.view.worst:''} 계획`,currentLabel:`최근 7일 실제`}
    }
    return {...metric,current,before,currentLabel:'최근 7일',beforeLabel:metric.type==='STUDY_DROP'||metric.type==='CONSECUTIVE_ABSENCE'?'직전 4주 주평균':'직전 28일 평균'}
  })
  const present=days.filter(d=>d.attendance==='present')
  const paired=present.filter(d=>d.planned!==null&&d.planned>0&&d.actual!==null)
  let run=0,longestMissingRun=0
  for(const d of days){run=d.submission==='missing'?run+1:0;longestMissingRun=Math.max(run,longestMissingRun)}
  return {...original,days,baselineDays,baselineFrom,baselineTo,metrics,
    weekdayBaseline:days.map(d=>{const refs=baselineDays.filter(b=>weekday(b.date)===weekday(d.date));const learning=refs.filter(b=>b.minutes!==null);return {date:d.date,minutes:average(learning.map(b=>b.minutes!)),start:clock(refs),samples:learning.length}}),
    recent:{attended:present.length,notEntered:days.filter(d=>d.attendance==='absent').length,missingPlans:days.filter(d=>d.submission==='missing').length,minutes:currentTotal??0,minutesPerVisit:present.length?(currentTotal??0)/present.length:null,validDays:present.filter(d=>d.minutes!==null&&d.minutes>=30).length,longestMissingRun,planGapMinutes:paired.length?paired.reduce((n,d)=>n+d.actual!-d.planned!,0):null,comparablePlanDays:paired.length}}
}
