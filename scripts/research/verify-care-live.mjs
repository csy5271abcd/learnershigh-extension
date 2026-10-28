import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createDataset} from '../demo/generate-care-seed.mjs';

const base='http://127.0.0.1:5174/api/admin/student-care';
async function get(path){const response=await fetch(base+path);assert.equal(response.status,200,path);return response.json()}
const {students}=createDataset(),branches=(await get('/branches')).items;
assert.deepEqual(branches.map(b=>b.studentCount).sort((a,b)=>a-b),[10,30,60]);
const flagged=new Map(),observed=[];
for(const branch of branches){
 const board=await get(`/board?branchId=${branch.branchId}`),metrics=await get(`/metrics?branchId=${branch.branchId}`);
 assert.equal(board.students.length,branch.studentCount);assert.equal(metrics.students.length,branch.studentCount);
 assert.deepEqual(board.students.map(s=>s.studentId).sort(),metrics.students.map(r=>r.student.studentId).sort());
 for(const item of board.needsCheck)flagged.set(item.studentId,item.signals.map(s=>s.type));
 for(const item of board.inAdjustment)flagged.set(item.studentId,item.signals.map(s=>s.type));
 for(const row of metrics.students){assert.equal(row.review.days.length,7);assert.equal(row.review.from,'2026-10-21');assert.equal(row.review.to,'2026-10-27');assert.equal(row.review.baselineFrom,'2026-09-23');assert.equal(row.review.baselineTo,'2026-10-20')}
 const first=metrics.students[0],detail=await get(`/students/${first.student.studentId}?branchId=${branch.branchId}`);
 assert.deepEqual(detail.review,first.review);
 observed.push({branch:branch.name,count:board.students.length,needsCheck:board.needsCheck.length,managed:board.inAdjustment.length});
}
const healthy=students.filter(s=>s.scenario.startsWith('healthy_'));
assert.equal(healthy.length,45);assert.deepEqual(healthy.filter(s=>flagged.has(s.id)),[]);
for(const [scenario,type] of [['persistent_late','START_TIME_SHIFT'],['persistent_drop','STUDY_DROP'],['scheduled_absence','CONSECUTIVE_ABSENCE'],['missed_plans','PLAN_MISSING'],['subject_shift','SUBJECT_SHARE']]){
 for(const student of students.filter(s=>s.scenario===scenario)){
  // Board managed rows retain the opening snapshot; detail signals are current.
  const detail=await get(`/students/${student.id}?branchId=${student.branchId}`);
  if(detail.signals.some(s=>s.type===type))continue;
  // These two explicit closed examples exercise the existing cooldown rule.
  assert.ok(['demo_s019','demo_s030'].includes(student.id),`${student.id} ${scenario} missing ${type}`);
  const history=await get(`/students/${student.id}/history?branchId=${student.branchId}`);
  assert.ok(history.items.some(e=>e.type==='CLOSED'&&e.occurredOn>='2026-10-25'));
 }
}
const result={source:'Live localhost API backed by persisted synthetic care-demo DB; no writes',checkedAt:new Date().toISOString(),students:100,branches:observed,healthyScenarioStudents:45,healthyScenarioFalseFlags:0,persistentAndScheduledScenarios:'asserted against generated scenario identities',detailAndBulkReview:'identical for one student per branch',display:'2026-10-21..27',baseline:'2026-09-23..10-20'};
writeFileSync('docs/design/student-care-api-check-2026-10-28.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
