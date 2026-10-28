import type {WeekDay, WeekdayBaseline} from './weeklyReviewTypes.ts'

export function attendanceText(day:Pick<WeekDay,'attendance'|'minutes'|'scheduled'>):string {
 if(day.attendance==='present')return '입실'
 if(day.attendance==='absent')return '결석'
 if(day.minutes===null)return '미확인'
 if(day.attendance==='excluded'||day.scheduled===false)return '—'
 return '미확인'
}
export function submissionText(day:Pick<WeekDay,'submission'|'scheduled'>):string {
 if(day.submission==='submitted')return '제출'
 if(day.scheduled===false||day.submission==='excluded')return '—'
 return day.submission==='missing'?'미제출':'미확인'
}
export function executionPercent(day:Pick<WeekDay,'submission'|'planned'|'actual'> & {attendance?:WeekDay['attendance']}):number|null {
 if(day.attendance&&day.attendance!=='present')return null
 return day.submission==='submitted'&&day.planned!==null&&day.planned>0&&day.actual!==null?day.actual/day.planned*100:null
}
export function relativeStarts(days:Pick<WeekDay,'date'|'attendance'|'start'>[],baseline:Pick<WeekdayBaseline,'date'|'start'>[]):(number|null)[]{
 return days.map(day=>{const usual=baseline.find(item=>item.date===day.date)?.start;return day.attendance==='present'&&day.start!==null&&usual!==null&&usual!==undefined?day.start-usual:null})
}
export function subjectDifference(plan:number,actual:number):number{return Math.round((actual-plan)*10)/10}
// Orange is reserved for outliers; blue is reserved for the branch mean.
export const studentColors=['#18886e','#9569d7','#cf4f9c','#1997a3','#789b28','#b75069','#a86bc4','#6c9b6b','#ca66c3','#738394','#5f9b9d','#9272ac'] as const
export function studentColor(id:string):string{
 const numeric=id.match(/\d+$/)?.[0]
 const index=numeric?Math.max(0,Number(numeric)-1):Array.from(id).reduce((n,c)=>Math.imul(n,31)+c.charCodeAt(0),0)>>>0
 return `color-mix(in srgb, ${studentColors[index%studentColors.length]} 80%, var(--color-text-primary))`
}
export const compactMinutes=(v:number|null)=>v===null?'—':v===0?'0분':`${Math.floor(Math.round(v)/60)}시간${Math.round(v)%60?` ${Math.round(v)%60}분`:''}`
export const displayClock=(v:number|null)=>v===null?'—':`${String(Math.floor(Math.round(v)/60)).padStart(2,'0')}:${String(Math.round(v)%60).padStart(2,'0')}`
export const dateText=(date:string)=>`${Number(date.slice(5,7))}/${Number(date.slice(8))}`
export const weekdayText=(date:string)=>'일월화수목금토'[new Date(date+'T12:00:00Z').getUTCDay()]
