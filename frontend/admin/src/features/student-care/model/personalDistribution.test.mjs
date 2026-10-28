import {test} from 'node:test'
import assert from 'node:assert/strict'
import {personalDistribution} from './personalDistribution.ts'
const date='2026-10-21'
const row=(id,minutes,start=600,usualStart=600)=>({student:{studentId:id,studentName:id},review:{days:[{date,scheduled:true,attendance:'present',minutes,start}],weekdayBaseline:[{date,minutes:100,start:usualStart}]}})
test('large learning increases are not shown as concerning outliers; drops are',()=>{
 const days=personalDistribution([0,0,0,0,-80,500].map((v,i)=>row('s'+i,100+v)),'study')
 assert.deepEqual(days[0].outside.map(d=>d.id),['s4'])
})
test('arrival compares own routine; morning/evening routine is not an outlier',()=>{
 const data=[row('a',100,480,480),row('b',100,1080,1080),row('c',100),row('d',100),row('late',100,700)]
 const d=personalDistribution(data,'arrival')[0]
 assert.equal(d.q25,0);assert.equal(d.q75,0)
 assert.deepEqual(d.outside.map(p=>p.id),['late'])
})
test('absence is kept in attendance rather than disguised as a short visit or midnight arrival',()=>{
 const r=row('absent',0,null);r.review.days[0].attendance='absent'
 assert.equal(personalDistribution([r],'study')[0].points.length,0)
 assert.equal(personalDistribution([r],'arrival')[0].points.length,0)
})

test('whole-group shifts remain highlighted even when no cross-sectional outlier exists',()=>{
 const rows=Array.from({length:60},(_,i)=>row('s'+i,50,700))
 const late=personalDistribution(rows,'arrival',[],60)[0]
 assert.equal(late.outside.length,0)
 assert.equal(late.changed.length,60)
 const study=personalDistribution(rows,'study',[],30)[0]
 assert.equal(study.outside.length,0)
 assert.equal(study.changed.length,60)
})

test('heterogeneous stable personal routines and positive study growth are not highlighted',()=>{
 const short=row('short',180,480,480),long=row('long',600,1140,1140)
 short.review.weekdayBaseline[0].minutes=180;long.review.weekdayBaseline[0].minutes=600
 assert.equal(personalDistribution([short,long],'study',[],30)[0].changed.length,0)
 assert.equal(personalDistribution([short,long],'arrival',[],60)[0].changed.length,0)
 long.review.days[0].minutes=900
 assert.equal(personalDistribution([short,long],'study',[],30)[0].changed.length,0)
})

test('an actual visit on an unscheduled day remains a real study and arrival observation',()=>{
 const r=row('extra',120,620);r.review.days[0].scheduled=false
 assert.equal(personalDistribution([r],'study',[],30)[0].points[0].actual,120)
 assert.equal(personalDistribution([r],'arrival',[],60)[0].points[0].actual,620)
})
