import {test} from 'node:test'
import assert from 'node:assert/strict'
import {studentCareApi as original} from './originalPreviewApi.ts'
import {studentCareApi as current} from './studentCareApi.ts'
test('original1 retains its earlier fixture policy and messages independently of new proposals',async()=>{
 assert.equal((await original.settings('br_gangnam')).absenceDays,5)
 assert.equal((await current.settings('br_gangnam')).absenceDays,1)
 const old=await original.detail('br_gangnam','stu_004')
 const next=await current.detail('br_gangnam','stu_004')
 assert.ok(old.signals.find(s=>s.type==='EXECUTION_GAP').summary.includes('최근 2주'))
 assert.ok(next.signals.find(s=>s.type==='EXECUTION_GAP').summary.includes('최근 7일'))
})
