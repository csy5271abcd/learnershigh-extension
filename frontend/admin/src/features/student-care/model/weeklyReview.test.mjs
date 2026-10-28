import {test} from 'node:test'
import assert from 'node:assert/strict'
import {studentCareApi} from '../api/studentCareApi.ts'
import {weeklyReview} from './weeklyReview.ts'
import {previewCareDays} from '../api/previewData.ts'

test('display7 and baseline28 are adjacent, disjoint and use35 explicit FE dates',async()=>{
 const input=await studentCareApi.detail('br_gangnam','stu_002')
 const s=weeklyReview(input)
 assert.equal(s.days.length,7);assert.equal(s.baselineDays.length,28)
 assert.equal(s.baselineFrom,'2026-09-20');assert.equal(s.baselineTo,'2026-10-17')
 assert.equal(s.days[0].date,'2026-10-18');assert.equal(s.days[6].date,'2026-10-24')
 assert.equal(new Set([...s.days,...s.baselineDays].map(d=>d.date)).size,35)
 const learning=s.metrics.find(m=>m.type==='STUDY_DROP')
 assert.equal(learning.current,1250)
 assert.equal(learning.before,s.baselineDays.reduce((n,d)=>n+(d.minutes??0),0)/4)
 assert.equal(s.recent.comparablePlanDays,2)
 assert.equal(s.days.find(d=>d.date==='2026-10-21').actual,250)
 assert.equal(s.days.find(d=>d.date==='2026-10-21').planned,null)
})
test('current week cannot change baseline; daily comparison aligns four same weekdays',async()=>{
 const input=await studentCareApi.detail('br_gangnam','stu_003')
 const records=previewCareDays(input.student.studentId,input.asOf)
 const a=weeklyReview(input,records)
 const changed=records.map(d=>d.date>=a.days[0].date?{...d,minutes:(d.minutes??0)*3,actual:(d.actual??0)*3}:d)
 const b=weeklyReview(input,changed)
 assert.equal(a.metrics.find(m=>m.type==='STUDY_DROP').before,b.metrics.find(m=>m.type==='STUDY_DROP').before)
 for(const day of a.weekdayBaseline){
  const weekday=new Date(day.date+'T00:00:00Z').getUTCDay()
  const refs=a.baselineDays.filter(d=>new Date(d.date+'T00:00:00Z').getUTCDay()===weekday&&d.minutes!==null)
  assert.equal(day.samples,4)
  assert.equal(day.minutes,refs.reduce((n,d)=>n+d.minutes,0)/4)
 }
})
test('unknown baseline is not synthesized as zero and zero observed learning stays zero',async()=>{
 const input=await studentCareApi.detail('br_gangnam','stu_008')
 const s=weeklyReview(input)
 assert.equal(s.metrics.find(m=>m.type==='STUDY_DROP').before,null)
 assert.equal(s.metrics.find(m=>m.type==='START_TIME_SHIFT').before,null)
 assert.equal(s.weekdayBaseline.every(d=>d.samples===0),true)
 const normal=weeklyReview(await studentCareApi.detail('br_gangnam','stu_002'))
 const day=normal.days.find(d=>d.date==='2026-10-20')
 assert.equal(day.minutes,0)
 assert.equal(day.scheduled,false)
 assert.equal(normal.metrics.find(m=>m.type==='SUBJECT_SHARE').beforeLabel,'수학 계획')
})
test('partial baseline cannot be divided by4 as though all28 days were observed; execution can exceed100%',async()=>{
 const input=await studentCareApi.detail('br_gangnam','stu_009')
 const records=previewCareDays('stu_009')
 const partial=records.map((d,i)=>i===0?{...d,minutes:null,actual:null,attendance:'unknown'}:i>=28&&d.planned!==null?{...d,actual:d.planned*1.2}:d)
 const s=weeklyReview(input,partial)
 assert.equal(s.metrics.find(m=>m.type==='STUDY_DROP').before,null)
 assert.ok(Math.abs(s.metrics.find(m=>m.type==='EXECUTION_GAP').current-120)<.001)
})
