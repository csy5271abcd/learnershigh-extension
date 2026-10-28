import type { CareSnapshotMetric } from './careSnapshot.ts'
import type { MetricView } from './mockMetrics.ts'
import type { ComparisonUnit } from './metricComparison.ts'
import type { SignalType, StudentRef } from './types.ts'
import type { WeeklyReview, WeekDay } from './weeklyReviewTypes.ts'

/** api-contract.md §65 direct JSON DTOs; no FE scenario values belong here. */
export interface ServerPeriodSummary {
 calendarDays:number; recordedDays:number; attendanceDays:number; scheduledAbsenceDays:number
 submissionDays:number; submissionRecordedDays:number; studyMinutes:number|null; minutesPerAttendance:number|null
 averageStartMinutes:number|null; startSamples:number; plannedMinutes:number|null; actualMinutes:number|null
 executionRate:number|null; comparablePlanDays:number
}
export interface ServerWeeklyReview {
 from:string; to:string; baselineFrom:string; baselineTo:string
 days:{date:string;attendance:'PRESENT'|'ABSENT'|'UNSCHEDULED'|'UNKNOWN';submission:'SUBMITTED'|'MISSING'|'UNKNOWN';scheduled:boolean|null;minutes:number|null;startMinutes:number|null;plannedMinutes:number|null;actualMinutes:number|null}[]
 current:ServerPeriodSummary; baseline:ServerPeriodSummary
 weekdayBaseline:{date:string;minutes:number|null;startMinutes:number|null;samples:number;startSamples:number}[]
 subjects:{name:string;plannedMinutes:number;actualMinutes:number;plannedShare:number|null;actualShare:number|null}[]
}
export interface CareBranchMetricsResponse {
 asOf:string; branch:{branchId:string;name:string}; students:{student:StudentRef;review:ServerWeeklyReview}[]
 dailyAverages:{date:string;minutes:number|null;samples:number}[]
}

export function fromServerReview(review:ServerWeeklyReview,asOf=review.to,signals:{type:SignalType}[]=[],deferred=false):WeeklyReview {
 const days:WeekDay[]=review.days.map(day=>({date:day.date,attendance:({PRESENT:'present',ABSENT:'absent',UNSCHEDULED:'excluded',UNKNOWN:'unknown'} as const)[day.attendance],submission:({SUBMITTED:'submitted',MISSING:'missing',UNKNOWN:'unknown'} as const)[day.submission],scheduled:day.scheduled,minutes:day.minutes,start:day.startMinutes,planned:day.plannedMinutes,actual:day.actualMinutes}))
 const c=review.current,b=review.baseline
 const metric=(type:SignalType,label:string,unit:ComparisonUnit,current:number|null,before:number|null,view:MetricView,beforeLabel='직전 28일 평균'):CareSnapshotMetric=>({type,label,unit,current,before,view,beforeLabel,currentLabel:'최근 7일',attention:signals.some(s=>s.type===type)})
 const rate=(s:ServerPeriodSummary)=>s.submissionRecordedDays?s.submissionDays/s.submissionRecordedDays*100:null
 const weekly=(value:number|null,usual:number|null,unit:'count'|'minutes'):MetricView=>({kind:'weekly',weeks:value===null?[]:[{label:'최근 7일',value,from:review.from,to:review.to}],usual:usual??0,unit})
 const subjects=review.subjects.flatMap(s=>s.plannedShare===null||s.actualShare===null?[]:[{name:s.name,plan:s.plannedShare,actual:s.actualShare}])
 const worst=subjects.reduce<(typeof subjects)[number]|null>((a,s)=>!a||Math.abs(s.actual-s.plan)>Math.abs(a.actual-a.plan)?s:a,null)
 const baselineStudy=b.recordedDays===28&&b.studyMinutes!==null?b.studyMinutes/4:null
 const baselineAttend=b.recordedDays===28?b.attendanceDays/4:null
 const metrics:CareSnapshotMetric[]=[
  metric('CONSECUTIVE_ABSENCE','입실 기록 없음','days',days.some(d=>d.attendance!=='unknown')?c.attendanceDays:null,baselineAttend,weekly(days.some(d=>d.attendance!=='unknown')?c.attendanceDays:null,baselineAttend,'count'),'직전 4주 주평균'),
  metric('STUDY_DROP','공부 시간','minutes',c.studyMinutes,baselineStudy,weekly(c.studyMinutes,baselineStudy,'minutes'),'직전 4주 주평균'),
  metric('PLAN_MISSING','계획 제출','percent',rate(c),rate(b),{kind:'dateList',days:days.filter(d=>d.submission!=='unknown').map(d=>({date:d.date,state:d.submission==='submitted'?'ok':'miss'}))}),
  metric('START_TIME_SHIFT','입실 시각','clock',c.averageStartMinutes,b.averageStartMinutes,{kind:'line',usual:b.averageStartMinutes??0,days:days.map(d=>({date:d.date,value:d.start,late:false}))}),
  metric('EXECUTION_GAP','계획 대비 달성','percent',c.executionRate,b.executionRate,{kind:'planActual',days:days.flatMap(d=>d.planned===null||d.actual===null?[]:[{date:d.date,planned:d.planned,actual:d.actual,off:d.attendance!=='present'}])}),
  metric('SUBJECT_SHARE','과목 계획','percent',worst?.actual??null,worst?.plan??null,{kind:'share',subjects,worst:worst?.name??''},worst?`${worst.name} 계획`:'계획 비중'),
 ]
 let run=0,longestMissingRun=0
 for(const day of days){run=day.scheduled!==false&&day.submission==='missing'?run+1:0;longestMissingRun=Math.max(run,longestMissingRun)}
 const paired=days.filter(d=>d.attendance==='present'&&d.planned!==null&&d.planned>0&&d.actual!==null)
 return {asOf,days,baselineDays:[],baselineFrom:review.baselineFrom,baselineTo:review.baselineTo,metrics,deferred,
  weekdayBaseline:review.weekdayBaseline.map(d=>({date:d.date,minutes:d.minutes,start:d.startMinutes,samples:d.samples,startSamples:d.startSamples})),
  recent:{attended:c.attendanceDays,notEntered:c.scheduledAbsenceDays,missingPlans:days.filter(d=>d.scheduled!==false&&d.submission==='missing').length,minutes:c.studyMinutes,minutesPerVisit:c.minutesPerAttendance,validDays:days.filter(d=>d.attendance==='present'&&d.minutes!==null&&d.minutes>=30).length,longestMissingRun,planGapMinutes:paired.length?paired.reduce((n,d)=>n+d.actual!-d.planned!,0):null,comparablePlanDays:c.comparablePlanDays}}
}
