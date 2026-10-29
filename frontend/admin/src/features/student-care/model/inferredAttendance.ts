import type {WeekDay,WeeklyReview} from './weeklyReviewTypes.ts'
export type AttendancePattern='present'|'regular'|'unexpected'|'unavailable'
const weekday=(date:string)=>new Date(`${date}T12:00:00Z`).getUTCDay()
const observed=(day:WeekDay)=>day.attendance!=='unknown'||day.minutes===0
/** Four observed matching weekdays are required; unavailable data is not an absence. */
export function inferredAttendance(review:Pick<WeeklyReview,'baselineDays'>,day:WeekDay):AttendancePattern{
 if(day.attendance==='present')return 'present'
 if(!observed(day))return 'unavailable'
 const refs=(review.baselineDays??[]).filter(old=>old.date<day.date&&weekday(old.date)===weekday(day.date))
 return refs.length===4&&refs.every(old=>observed(old)&&old.attendance!=='present')?'regular':'unexpected'
}
