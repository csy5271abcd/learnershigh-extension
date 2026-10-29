import { test } from 'node:test'
import assert from 'node:assert/strict'
import { caseTimeline } from './caseTimeline.ts'

const at='2026-10-20T03:00:00+09:00'
const event=(eventId,type,caseId='c1')=>({eventId,caseId,type,occurredOn:'2026-10-20',createdAt:at,content:type,noteChannel:null})

test('same-time events keep the recorded order instead of being re-sorted by date',()=>{
 // API order: newest first, ties broken by later record first.
 const apiRows=[event('e3','CONTINUED'),event('e2','RECHECKED'),event('x','NOTE','c2'),event('e1','REASON_CONFIRMED')]
 assert.deepEqual(caseTimeline(apiRows,'c1').map(e=>e.type),['REASON_CONFIRMED','RECHECKED','CONTINUED'])
})

test('case context events (entity sequence order) win over the flattened list',()=>{
 const events=[event('e1','REASON_CONFIRMED'),event('e2','ADJUSTMENT_STARTED')]
 assert.deepEqual(caseTimeline([event('e2','ADJUSTMENT_STARTED'),event('e1','REASON_CONFIRMED')],'c1',{events}).map(e=>e.eventId),['e1','e2'])
})
