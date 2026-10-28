import type {CareRosterRow} from '../api/loadCareRoster.ts'
import type {BranchMetricKind} from './branchOverview.ts'
import type {CareSettings} from './types.ts'
import {compactMinutes,displayClock} from './careDisplay.ts'

const signed=(n:number,unit:string)=>`${n>0?'+':n<0?'−':''}${Math.abs(Math.round(n))}${unit}`

/** Observed days only. A missing observation never becomes a healthy or absent day. */
export function studentPattern(row:CareRosterRow,kind:BranchMetricKind,settings:CareSettings){
 const cells=row.review.days.map(day=>{
  const base=row.review.weekdayBaseline.find(d=>d.date===day.date)
  if(kind==='submission'&&day.submission==='submitted')return {date:day.date,text:'제출',detail:'계획 제출',flag:false,value:null}
  if(day.attendance==='excluded'||day.scheduled===false&&day.attendance!=='present'||kind==='submission'&&day.scheduled===false&&day.submission!=='submitted')return {date:day.date,text:'—',detail:'등원 일정 없음',flag:false,value:null}
  if(kind==='absence')return {date:day.date,text:day.attendance==='absent'?'결석':day.attendance==='present'?'입실':'?',detail:day.attendance==='unknown'?'출결 미확인':day.attendance==='absent'?'결석':'입실',flag:day.scheduled===true&&day.attendance==='absent',value:null}
  if(kind==='submission')return {date:day.date,text:day.submission==='missing'?'미제출':day.submission==='submitted'?'제출':day.submission==='excluded'?'—':'?',detail:day.submission==='missing'?'계획 미제출':day.submission==='submitted'?'계획 제출':'계획 제출 여부 미확인',flag:day.submission==='missing',value:null}
  if(kind==='arrival'){
   const value=day.attendance==='present'&&day.start!==null&&base?.start!=null?day.start-base.start:null
   return {date:day.date,text:value===null?day.attendance==='absent'?'결석':'?':signed(value,''),detail:value===null?day.attendance==='absent'?'결석':'입실 시각 미확인':`입실 ${displayClock(day.start)} · 평소 ${displayClock(base!.start)} · ${signed(value,'분')}`,flag:value!==null&&value>=settings.startShiftMinutes,value}
  }
  if(day.attendance!=='present')return {date:day.date,text:day.attendance==='absent'?'결석':'?',detail:day.attendance==='absent'?'결석':'학습 기록 미확인',flag:false,value:null}
  const value=day.minutes!==null&&base?.minutes!=null&&base.minutes>0?(day.minutes-base.minutes)/base.minutes*100:null
  return {date:day.date,text:value===null?'?':signed(value,'%'),detail:`학습 ${compactMinutes(day.minutes)} · 평소 ${compactMinutes(base?.minutes??null)}`,flag:value!==null&&value<=-settings.studyDropPercent,value}
 })
 const observed=row.review.days.filter(day=>day.attendance==='present').flatMap(day=>{
  const base=row.review.weekdayBaseline.find(d=>d.date===day.date)
  return day.minutes!==null&&base?.minutes!=null?[{actual:day.minutes,usual:base.minutes}]:[]
 })
 const actual=observed.reduce((s,d)=>s+d.actual,0),usual=observed.reduce((s,d)=>s+d.usual,0)
 const change=usual>0?(actual-usual)/usual*100:null
 const count=cells.filter(c=>c.flag).length
 const affected=count>0
 const hasEvidence=kind==='study'||kind==='arrival'?cells.some(c=>c.value!==null):cells.some(c=>['입실','결석','제출','미제출'].includes(c.text))
 const summary=!hasEvidence?'—':kind==='study'?`${count}일 감소`:kind==='arrival'?`${count}일 지연`:`${count}일`
 return {row,cells,count,affected,summary,change,average:observed.length?actual/observed.length:null}
}
