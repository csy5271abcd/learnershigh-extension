import type {CareRosterRow} from '../api/loadCareRoster.ts'
import {quantile} from './branchDistribution.ts'

export type PersonalDistributionKind='study'|'arrival'
export interface PersonalPoint {id:string;name:string;value:number;actual:number;usual:number}
export function personalDistribution(rows:CareRosterRow[],kind:PersonalDistributionKind,excluded:readonly string[]=[],threshold?:number){
 const dates=[...new Set(rows.flatMap(r=>r.review.days.map(d=>d.date)))].sort()
 return dates.map(date=>{
  const points=rows.filter(r=>!excluded.includes(r.student.studentId)).flatMap(row=>{
   const d=row.review.days.find(d=>d.date===date),base=row.review.weekdayBaseline.find(d=>d.date===date)
   if(!d||!base||d.attendance!=='present')return []
   const actual=kind==='study'?d.minutes:d.attendance==='present'?d.start:null,usual=kind==='study'?base.minutes:base.start
   if(actual===null||usual===null||kind==='study'&&usual<=0)return []
   const value=kind==='study'?(actual-usual)/usual*100:actual-usual
   return [{id:row.student.studentId,name:row.student.studentName,value,actual,usual}]
  })
  const values=points.map(p=>p.value),q25=quantile(values,.25),q75=quantile(values,.75)
  const fence=q25===null||q75===null?null:kind==='study'?q25-1.5*(q75-q25):q75+1.5*(q75-q25)
  const outside=points.length<4||fence===null?[]:points.filter(p=>kind==='study'?p.value<Math.min(0,fence):p.value>Math.max(0,fence))
  // Operational change markers are independent of today's peer distribution.
  // A whole-group shift must remain visible even when the IQR shifts with it.
  const changed=threshold===undefined?[]:points.filter(p=>kind==='study'?p.value<=-threshold:p.value>=threshold)
  return {date,points,q25,q75,mean:points.length?values.reduce((s,v)=>s+v,0)/points.length:null,outside,changed}
 })
}
