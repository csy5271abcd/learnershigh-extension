import {test} from 'node:test'
import assert from 'node:assert/strict'
import {inferredAttendance} from './inferredAttendance.ts'
import {buildBranchOverview} from './branchOverview.ts'
const day=(date,attendance='excluded',minutes=0)=>({date,attendance,minutes,start:null,submission:'missing',scheduled:false,planned:null,actual:null})
const refs=['2026-09-28','2026-10-05','2026-10-12','2026-10-19'].map(d=>day(d))
test('four same weekdays without entry establish a regular pattern',()=>{assert.equal(inferredAttendance({baselineDays:refs},day('2026-10-26')),'regular')})
test('one prior visit makes the current absence unexpected',()=>{assert.equal(inferredAttendance({baselineDays:[day(refs[0].date,'present',100),...refs.slice(1)]},day('2026-10-26','absent')),'unexpected')})
test('a day without an entry record is an absence, not a separate state',()=>{assert.equal(inferredAttendance({baselineDays:[day(refs[0].date,'unknown',null),...refs.slice(1)]},day('2026-10-26')),'regular');assert.equal(inferredAttendance({baselineDays:[day(refs[0].date,'present',100),...refs.slice(1)]},day('2026-10-26','unknown',null)),'unexpected')})
test('mixed groups count every nonentry but retain unexpected count for red markers',()=>{const row=(id,history)=>({student:{studentId:id,studentName:id},review:{days:[day('2026-10-26')],baselineDays:history,weekdayBaseline:[]}});const regular=row('regular',refs),unexpected=row('unexpected',[day(refs[0].date,'present',100),...refs.slice(1)]);const white=buildBranchOverview([regular]).metrics.absence.daily[0];assert.equal(white.value,1);assert.equal(white.unexpected,0);const red=buildBranchOverview([regular,unexpected]).metrics.absence.daily[0];assert.equal(red.value,2);assert.equal(red.unexpected,1)})
