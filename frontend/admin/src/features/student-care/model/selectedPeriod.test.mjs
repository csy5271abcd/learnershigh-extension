import {test} from 'node:test'
import assert from 'node:assert/strict'
import {studentCareApi} from '../api/studentCareApi.ts'
import {selectedPeriodSnapshot} from './selectedPeriod.ts'
import {addDays} from './format.ts'

test('calendar period changes actual attendance, totals, and equal-length comparison',async()=>{
 const input=await studentCareApi.detail('br_gangnam','stu_002')
 const seven=selectedPeriodSnapshot(input,7),fourteen=selectedPeriodSnapshot(input,14),month=selectedPeriodSnapshot(input,28)
 assert.equal(seven.days.length,7);assert.equal(fourteen.days.length,14);assert.equal(month.days.length,28)
 assert.equal(seven.recent.attended,5);assert.equal(fourteen.recent.attended,10)
 assert.equal(seven.metrics.find(m=>m.type==='STUDY_DROP').current,1250)
 assert.equal(fourteen.metrics.find(m=>m.type==='STUDY_DROP').current,2510)
 assert.equal(seven.metrics.find(m=>m.type==='STUDY_DROP').before,1260)
 assert.equal(month.metrics.find(m=>m.type==='STUDY_DROP').before,null)
 assert.equal(seven.recent.minutesPerVisit,250)
})
test('selected period preserves missing days, excludes weekends explicitly, and does not fabricate subject history',async()=>{
 const result=selectedPeriodSnapshot(await studentCareApi.detail('br_gangnam','stu_002'),14,true)
 assert.equal(result.days.length,14)
 assert.equal(result.days.filter(day=>day.attendance==='excluded').length,4)
 assert.ok(result.metrics.find(m=>m.type==='SUBJECT_SHARE').currentLabel.includes('최근 7일 자료'))
 const planned=result.days.filter(day=>day.attendance==='present'&&day.planned!==null)
 assert.equal(result.recent.comparablePlanDays,planned.length)
})
test('known no-entry dates yield zero learning rather than missing records',async()=>{
 const input=await studentCareApi.detail('br_gangnam','stu_002')
 input.dailyStudy=Array.from({length:28},(_,index)=>({date:addDays(input.asOf,index-27),minutes:0}))
 const result=selectedPeriodSnapshot(input,7)
 assert.equal(result.recent.attended,0)
 assert.equal(result.metrics.find(m=>m.type==='STUDY_DROP').current,0)
 assert.equal(result.recent.minutesPerVisit,null)
})
