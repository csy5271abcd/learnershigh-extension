import {test} from 'node:test'
import assert from 'node:assert/strict'
import {groupChartDays,planRate} from './chartPeriods.ts'
import {addDays} from './format.ts'
const days=Array.from({length:28},(_,i)=>({date:addDays('2026-10-24',i-27)}))
test('day/week/month regroup the same observations and keep partial month ranges explicit',()=>{
 assert.equal(groupChartDays(days,'2026-10-24','day').length,28)
 const weeks=groupChartDays(days,'2026-10-24','week')
 assert.equal(weeks.length,4)
 assert.equal(weeks[3].range,'10/18–10/24')
 const months=groupChartDays(days,'2026-10-24','month')
 assert.deepEqual(months.map(m=>m.days.length),[4,24])
 assert.deepEqual(months.map(m=>m.range),['9/27–9/30','10/1–10/24'])
 assert.equal(months.flatMap(m=>m.days).length,28)
})
test('plan groups use weighted planned minutes and preserve unavailable records',()=>{
 assert.equal(planRate([{planned:100,actual:50,off:false},{planned:300,actual:300,off:false}]),87.5)
 assert.equal(planRate([{planned:100,actual:200,off:false}]),100)
 assert.equal(planRate([{planned:100,actual:0,off:true}]),null)
 assert.equal(planRate([]),null)
})
