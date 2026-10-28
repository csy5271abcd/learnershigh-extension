import {test} from 'node:test'
import assert from 'node:assert/strict'
import {studentCareApi,diverseStudentCareApi} from './studentCareApi.ts'
import {diverseDays} from './diverseDays.ts'
import {weeklyReview} from '../model/weeklyReview.ts'

test('varied proposals keep arrival and learning feasible, with zero/missing and large spread',()=>{
 const days=diverseDays('stu_002').slice(-7)
 assert.equal(Math.max(...days.map(d=>d.minutes??0)),700)
 assert.equal(Math.min(...days.filter(d=>d.minutes>0).map(d=>d.minutes)),35)
 for(const d of days)if(d.start!==null)assert.ok(d.start+d.minutes<=1440)
 const incomplete=diverseDays('stu_008').slice(-7)
 assert.ok(incomplete.some(d=>d.minutes===null))
 assert.ok(incomplete.some(d=>d.minutes===0))
})
test('all35 days for every student fit within the calendar day',()=>{
 for(let i=1;i<=10;i++)for(const day of diverseDays(`stu_${String(i).padStart(3,'0')}`)){
  if(day.start!==null)assert.ok(day.start+day.minutes<=1440,`${i} ${day.date}: ${day.start}+${day.minutes}`)
 }
})
test('5-7 data and branch settings stay isolated from earlier comparison designs',async()=>{
 const old=await studentCareApi.detail('br_gangnam','stu_002')
 const varied=await diverseStudentCareApi.detail('br_gangnam','stu_002')
 assert.equal(weeklyReview(old).days[0].minutes,240)
 assert.equal(weeklyReview(varied).days[0].minutes,35)
 const original=await studentCareApi.settings('br_gangnam')
 const settings=await diverseStudentCareApi.settings('br_gangnam')
 await diverseStudentCareApi.updateSettings('br_gangnam',{...settings,absenceDays:7})
 assert.equal((await studentCareApi.settings('br_gangnam')).absenceDays,original.absenceDays)
 await diverseStudentCareApi.updateSettings('br_gangnam',settings)
})
