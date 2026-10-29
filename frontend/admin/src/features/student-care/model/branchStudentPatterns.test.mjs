import {test} from 'node:test'
import assert from 'node:assert/strict'
import {studentPattern} from './branchStudentPatterns.ts'
const settings={studyDropPercent:30,startShiftMinutes:60}
const row=(values)=>({student:{studentId:'s1',studentName:'학생'},review:{days:values.map((v,i)=>({date:`2026-10-${21+i}`,scheduled:true,attendance:'present',submission:'submitted',minutes:100,start:600,...v})),weekdayBaseline:values.map((_,i)=>({date:`2026-10-${21+i}`,minutes:100,start:600}))}})
test('repeated study drops remain visible even if one long day offsets the weekly change',()=>{
 const p=studentPattern(row([40,40,40,40,500].map(minutes=>({minutes}))),'study',settings)
 assert.ok(p.change>0)
 assert.equal(p.count,4)
 assert.equal(p.affected,true)
 assert.equal(p.summary,'4일 감소')
})
test('unknown days never count; off days are not plan failures and absences are judged from 28-day history',()=>{
 const unknown=row([{attendance:'unknown',submission:'unknown',minutes:null,start:null}])
 for(const kind of ['study','arrival','absence','submission'])assert.equal(studentPattern(unknown,kind,settings).count,0)
 // A recorded non-entry without four matching baseline weekdays is an absence even if the source marks it unscheduled.
 const off=row([{scheduled:false,attendance:'absent',submission:'missing',minutes:0,start:null}])
 for(const kind of ['study','arrival','submission'])assert.equal(studentPattern(off,kind,settings).count,0)
 assert.equal(studentPattern(off,'absence',settings).count,1)
})
test('morning and evening students are evaluated against their own clocks',()=>{
 const morning=row([{start:700},{start:700}]),evening=row([{start:1180},{start:1180}])
 evening.review.weekdayBaseline.forEach(d=>d.start=1080)
 assert.deepEqual(studentPattern(morning,'arrival',settings).cells.map(c=>c.value),[100,100])
 assert.deepEqual(studentPattern(evening,'arrival',settings).cells.map(c=>c.value),[100,100])
})
test('large positive study changes are not marked as problems',()=>{
 assert.equal(studentPattern(row([{minutes:900},{minutes:100}]),'study',settings).affected,false)
})

test('no comparable observations are not summarized as zero changed days',()=>{
 const r=row([{attendance:'unknown',submission:'unknown',minutes:null,start:null}])
 for(const kind of ['study','arrival','absence','submission'])assert.equal(studentPattern(r,kind,settings).summary,'—')
})

test('a factual submitted plan is retained independently of an unscheduled non-entry',()=>{
 const r=row([{scheduled:false,attendance:'excluded',submission:'submitted',minutes:0,start:null}])
 const result=studentPattern(r,'submission',settings)
 assert.equal(result.cells[0].text,'제출')
 assert.equal(result.count,0)
})

test('missing comparison records do not use the no-schedule dash',()=>{
 const r=row([{minutes:null},{scheduled:false,attendance:'excluded'}])
 assert.deepEqual(studentPattern(r,'study',settings).cells.map(c=>c.text),['?','—'])
})
