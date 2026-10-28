import {test} from 'node:test'
import assert from 'node:assert/strict'
import {attendanceText,submissionText,executionPercent,relativeStarts,subjectDifference} from './careDisplay.ts'
test('confirmed absence is short, unverified schedule is not converted into absence',()=>{
 assert.equal(attendanceText({attendance:'absent',minutes:0,scheduled:true}),'결석')
 assert.equal(attendanceText({attendance:'unknown',minutes:0,scheduled:null}),'미확인')
 assert.equal(attendanceText({attendance:'unknown',minutes:null,scheduled:null}),'미확인')
 assert.equal(attendanceText({attendance:'unknown',minutes:null,scheduled:false}),'미확인')
})

test('a factual submitted plan survives off-day display and unknown is not a missing plan',()=>{
 assert.equal(submissionText({submission:'submitted',scheduled:false}),'제출')
 assert.equal(submissionText({submission:'missing',scheduled:false}),'—')
 assert.equal(submissionText({submission:'unknown',scheduled:null}),'미확인')
})
test('morning and evening students are compared with their own weekday baseline',()=>{
 const days=[{date:'2026-10-18',attendance:'present',start:610},{date:'2026-10-19',attendance:'present',start:1150},{date:'2026-10-20',attendance:'absent',start:null}]
 assert.deepEqual(relativeStarts(days,[{date:days[0].date,start:600},{date:days[1].date,start:1140}]),[10,10,null])
})
test('unsubmitted plans are not zero percent, overachievement is not clipped',()=>{
 assert.equal(executionPercent({submission:'missing',planned:null,actual:0}),null)
 assert.equal(executionPercent({submission:'submitted',planned:100,actual:150}),150)
})
test('10 versus 90 percent has an explicit eighty point difference',()=>assert.equal(subjectDifference(10,90),80))
