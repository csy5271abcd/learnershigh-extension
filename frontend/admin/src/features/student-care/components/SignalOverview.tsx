import { useState } from 'react'
import type { SignalSummary } from '../model/types.ts'
import { useCareDesign } from '../model/CareDesignContext.ts'
import { weeklyReview } from '../model/weeklyReview.ts'
import type { CareSnapshotMetric, DailyCareRecord } from '../model/careSnapshot.ts'
import { WeekStudentViews } from './weekly/WeekStudentViews.tsx'
import { RecordDialog } from './baseline/RecordDialog.tsx'
interface Props {
 serverReview?:import('../model/serverWeeklyReview.ts').ServerWeeklyReview;careDays?:import('../model/weeklyReviewTypes.ts').WeekDay[];studentId:string;studentName:string;asOf:string;signals:(SignalSummary & {evidence?:string[]})[];deferred:boolean;dailyStudy:{date:string;minutes:number}[];usualDailyMinutes:number;excludeWeekend:boolean;onExcludeWeekendChange:(value:boolean)=>void
}
export function SignalOverview(props:Props){
 const design=useCareDesign()
 const [detail,setDetail]=useState<CareSnapshotMetric|DailyCareRecord|null>(null)
 const snapshot=weeklyReview({...props,student:{studentId:props.studentId}})
 return <section className="wk-overview" aria-label="학습 현황">
  <WeekStudentViews design={design>=5?4:design as 2|3|4} snapshot={snapshot} onMetric={setDetail} onDay={setDetail}/>
  {detail&&<RecordDialog key={'date' in detail?detail.date:detail.type} name={props.studentName} item={detail} snapshot={snapshot} onClose={()=>setDetail(null)}/>}
 </section>
}
