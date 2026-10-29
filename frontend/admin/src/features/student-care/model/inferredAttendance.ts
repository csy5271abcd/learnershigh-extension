import type {WeekDay,WeeklyReview} from './weeklyReviewTypes.ts'
export type AttendancePattern='present'|'regular'|'unexpected'
const weekday=(date:string)=>new Date(`${date}T12:00:00Z`).getUTCDay()
/** No entry is an absence; four matching weekdays without entry make it regular. */
export function inferredAttendance(review:Pick<WeeklyReview,'baselineDays'>,day:WeekDay):AttendancePattern{
 if(day.attendance==='present')return 'present'
 const refs=(review.baselineDays??[]).filter(old=>old.date<day.date&&weekday(old.date)===weekday(day.date))
 return refs.length===4&&refs.every(old=>old.attendance!=='present')?'regular':'unexpected'
}
