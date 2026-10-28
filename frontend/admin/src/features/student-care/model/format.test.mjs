import { test } from 'node:test'
import assert from 'node:assert/strict'
import { followUpLabel, RECHECK_CHOICES, metric, comparisonMetric } from './format.ts'
test('due follow-ups share the attention state; future checks remain scheduled',()=>{
 assert.equal(followUpLabel('2026-10-23','2026-10-24'),'확인 필요')
 assert.equal(followUpLabel('2026-10-24','2026-10-24'),'확인 필요')
 assert.equal(followUpLabel('2026-10-25','2026-10-24'),'확인 예정')
 assert.deepEqual(RECHECK_CHOICES.map(choice=>choice.days),[3,7,14,28])
 assert.equal(RECHECK_CHOICES.at(-1).label,'4주 후')
})

test('negative personal arrival deviations use a single sign and positive durations are preserved',()=>{
 assert.equal(metric(-15,'MINUTES'),'−15분')
 assert.equal(metric(-75,'MINUTES'),'−1시간 15분')
 assert.equal(metric(90,'MINUTES'),'1시간 30분')
 assert.equal(comparisonMetric(-15,'MINUTES','START_TIME_SHIFT'),'15분 빠름')
 assert.equal(comparisonMetric(90,'MINUTES','START_TIME_SHIFT'),'90분 늦음')
 assert.equal(comparisonMetric(0,'MINUTES','START_TIME_SHIFT'),'평소와 같음')
 assert.equal(comparisonMetric(1200,'CLOCK_MINUTES','START_TIME_SHIFT'),'20:00')
})
