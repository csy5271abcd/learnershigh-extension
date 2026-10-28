import {test} from 'node:test'
import assert from 'node:assert/strict'
import {loadCareHistory,loadCareHistoryPage} from './loadCareHistory.ts'
test('history follows the real roster of an unfamiliar branch rather than example IDs',async()=>{
 const ids=[]
 const student={studentId:'real-77',studentName:'서버 학생',branchId:'new-branch',className:null}
 const rows=await loadCareHistory({board:async()=>({students:[student]}),history:async(branch,id)=>{ids.push([branch,id]);return {student,items:[{eventId:'e1',content:'서버 기록',occurredOn:'2026-10-25',createdAt:'2026-10-25T10:00:00'}]}}},'new-branch')
 assert.deepEqual(ids,[['new-branch','real-77']]);assert.equal(rows[0].content,'서버 기록')
})
test('one failed student history rejects the whole view instead of hiding records',async()=>{
 const api={board:async()=>({students:[{studentId:'a'},{studentId:'b'}]}),history:async(_,id)=>{if(id==='b')throw Error('503 source');return {student:{studentId:id},items:[]}}}
 await assert.rejects(loadCareHistory(api,'new-branch'),/503 source/)
})

test('history page retains students with no history for individual empty states',async()=>{
 const students=[{studentId:'a',studentName:'상담 있음'},{studentId:'b',studentName:'상담 없음'}]
 const api={board:async()=>({students}),history:async(_,id)=>({student:students.find(s=>s.studentId===id),items:id==='a'?[{eventId:'e1',occurredOn:'2026-10-28',createdAt:'2026-10-28T01:00:00Z',content:'첫 줄\n두 번째 줄'}]:[]})}
 const data=await loadCareHistoryPage(api,'branch')
 assert.equal(data.students.length,2)
 assert.equal(data.rows.length,1)
 assert.equal(data.rows[0].content,'첫 줄\n두 번째 줄')
})
