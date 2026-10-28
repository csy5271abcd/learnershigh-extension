import { buildCareSnapshot, type CareSnapshot, type DailyCareRecord, type SnapshotInput } from './careSnapshot.ts'
import { addDays } from './format.ts'

export type CarePeriod=7|14|28
const sum=(days:DailyCareRecord[],key:'minutes'|'planned'|'actual')=>days.some(day=>day[key]!==null)?days.reduce((total,day)=>total+(day[key]??0),0):null
const average=(values:number[])=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null
const learning=(days:DailyCareRecord[])=>{const present=days.filter(day=>day.attendance==='present');const value=sum(present,'minutes');return value===null&&!present.length&&days.some(day=>day.attendance==='absent')?0:value}

/** 달력 기간 안의 실제 입실 기록을 집계. 없는 이전 기간을 생성하지 않는다. */
export function selectedPeriodSnapshot(input:SnapshotInput,period:CarePeriod,excludeWeekend=false):CareSnapshot {
 const full=buildCareSnapshot(input,28,excludeWeekend)
 const from=addDays(input.asOf,1-period),beforeFrom=addDays(from,-period)
 const days=full.days.filter(day=>day.date>=from)
 const previous=full.days.filter(day=>day.date>=beforeFrom&&day.date<from)
 const beforeComplete=previous.length===period
 const present=days.filter(day=>day.attendance==='present')
 const oldPresent=previous.filter(day=>day.attendance==='present')
 const rate=(records:DailyCareRecord[])=>{const paired=records.filter(day=>day.attendance==='present'&&day.planned!==null&&day.actual!==null&&day.planned>0);const plan=sum(paired,'planned');return plan?paired.reduce((total,day)=>total+Math.min(day.actual!,day.planned!),0)/plan*100:null}
 const submission=(records:DailyCareRecord[])=>{const known=records.filter(day=>day.submission==='submitted'||day.submission==='missing');return known.length?known.filter(day=>day.submission==='submitted').length/known.length*100:null}
 const attendance=(records:DailyCareRecord[])=>records.some(day=>day.attendance==='present'||day.attendance==='absent')?records.filter(day=>day.attendance==='present').length:null
 const metrics=full.metrics.map(metric=>{
  let current:number|null=null,before:number|null=null
  switch(metric.type){
   case 'CONSECUTIVE_ABSENCE':current=attendance(days);before=attendance(previous);break
   case 'STUDY_DROP':current=learning(days);before=learning(previous);break
   case 'START_TIME_SHIFT':current=average(present.flatMap(day=>day.start===null?[]:[day.start]));before=average(oldPresent.flatMap(day=>day.start===null?[]:[day.start]));break
   case 'EXECUTION_GAP':current=rate(days);before=rate(previous);break
   case 'PLAN_MISSING':current=submission(days);before=submission(previous);break
   case 'SUBJECT_SHARE':return {...metric,currentLabel:`${metric.view.kind==='share'?metric.view.worst:''} 실제 · 최근 7일 자료`}
  }
  return {...metric,current,before:beforeComplete?before:null,currentLabel:`최근 ${period}일`,beforeLabel:beforeComplete?`직전 ${period}일`:'비교 기록 없음'}
 })
 const paired=present.filter(day=>day.planned!==null&&day.actual!==null)
 const minutes=sum(present,'minutes')??0
 let run=0,longestMissingRun=0
 for(const day of days){run=day.submission==='missing'?run+1:0;longestMissingRun=Math.max(run,longestMissingRun)}
 return {...full,days,metrics,recent:{attended:present.length,notEntered:days.filter(day=>day.attendance==='absent').length,missingPlans:days.filter(day=>day.submission==='missing').length,minutes,minutesPerVisit:present.length?minutes/present.length:null,validDays:present.filter(day=>day.minutes!==null&&day.minutes>=30).length,longestMissingRun,planGapMinutes:paired.length?paired.reduce((total,day)=>total+day.actual!-day.planned!,0):null,comparablePlanDays:paired.length}}
}
