import { test } from 'node:test'
import assert from 'node:assert/strict'
import { quantile, branchDistribution, missingRecordLabel } from './branchDistribution.ts'

test('missing source and confirmed absence of entry are separate labels',()=>{
 assert.equal(missingRecordLabel({date:'2026-10-18',minutes:null,start:null,attendance:'unknown'},'start'),'기록 없음')
 assert.equal(missingRecordLabel({date:'2026-10-18',minutes:0,start:null,attendance:'absent'},'start'),'입실 기록 없음')
 assert.equal(missingRecordLabel({date:'2026-10-18',minutes:0,start:null,attendance:'unknown'},'start'),'입실 기록 없음')
 assert.equal(missingRecordLabel({date:'2026-10-18',minutes:60,start:null,attendance:'present'},'start'),'입실 시각 기록 없음')
})

test('quartiles interpolate at (n-1)p without mutating observations', () => {
  const values = [40, 10, 30, 20]
  assert.equal(quantile(values, .25), 17.5)
  assert.equal(quantile(values, .75), 32.5)
  assert.deepEqual(values, [40, 10, 30, 20])
  assert.equal(quantile([], .25), null)
})

const students = values => values.map((value, i) => ({ id: String(i), name: `학생${i}`, days: [{ date: '2026-10-18', minutes: value, start: value }] }))
test('null is excluded, observed zero is included and IDs identify outliers', () => {
  const [day] = branchDistribution(students([0, 10, 10, 10, 10, 100, null]), 'minutes')
  assert.equal(day.count, 6)
  assert.equal(day.mean, 140 / 6)
  assert.equal(day.q25, 10)
  assert.equal(day.q75, 10)
  assert.deepEqual(day.outliers.map(value => value.id), ['0', '5'])
})
test('fewer than four observations do not receive outlier labels', () => {
  const [day] = branchDistribution(students([0, 0, 100, null]), 'minutes')
  assert.equal(day.count, 3)
  assert.equal(day.q25, 0)
  assert.equal(day.q75, 50)
  assert.deepEqual(day.outliers, [])
})
test('observations exactly on either 1.5 IQR fence remain within the range', () => {
  const [day] = branchDistribution(students([-3, -2, 1, 1, 2, 3, 3, 6, 7]), 'minutes')
  assert.equal(day.q25, 1)
  assert.equal(day.q75, 3)
  assert.deepEqual(day.outliers.map(point => point.value), [-3, 7])
})
test('all dates remain sorted and empty dates never become zero', () => {
  const rows = [{ id: 'one', name: '하나', days: [{ date: '2026-10-19', minutes: 0, start: null }, { date: '2026-10-18', minutes: null, start: null }] }]
  const minutes = branchDistribution(rows, 'minutes')
  assert.deepEqual(minutes.map(day => day.date), ['2026-10-18', '2026-10-19'])
  assert.equal(minutes[0].mean, null)
  assert.equal(minutes[1].mean, 0)
  assert.ok(branchDistribution(rows, 'start').every(day => day.mean === null && day.count === 0))
})
