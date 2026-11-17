/** Explicit local-only UI example. Preserves any existing case; never resets stored history. */
import assert from 'node:assert/strict';
import { BRANCHES } from './generate-care-seed.mjs';
const origin=process.env.CARE_DEMO_API_ORIGIN??'http://127.0.0.1:5174';
const localUrl=new URL(origin);
assert.ok(['127.0.0.1','localhost'].includes(localUrl.hostname)&&localUrl.protocol==='http:'&&!localUrl.username&&!localUrl.password,'Local demo only');
const base=origin+'/api/admin/student-care';
async function get(path){const r=await fetch(base+path);assert.equal(r.status,200);return r.json()}
// 2026-11-16(A22): 원천 Seed(generate-care-seed.mjs)가 210명·AS_OF 11-11로 바뀐 뒤에도 맞도록, 인원·학생·날짜를 하드코딩하지 않고 그 Seed와 API에서 읽는다.
const branches=(await get('/branches')).items;
assert.deepEqual(branches.map(b=>[b.branchId,b.studentCount]),BRANCHES.map(b=>[b.id,b.count]));
const branchId='demo_large',query='?branchId='+branchId;
// 예시 대상: 강남점에서 '입실 시각 변화' 신호가 있고 관리 중이 아닌 학생 중 ID 순 첫 번째(같은 Seed면 항상 같은 학생)
const board=await get('/board'+query);
const shifted=board.needsCheck.filter(s=>s.signals.some(x=>x.type==='START_TIME_SHIFT')).map(s=>s.studentId).sort();
const existing=[];
for(const id of [...new Set([...shifted,...board.inAdjustment.map(s=>s.studentId)])]){const h=await get('/students/'+id+'/history'+query);if(h.items.some(item=>item.content.includes('[화면 확인용 예시]')))existing.push(id)}
if(existing.length){console.log('Existing example retained ('+existing.join(',')+'). No writes.');}
else{
 assert.ok(shifted.length>0,'Seed must contain a START_TIME_SHIFT student in '+branchId);
 const studentId=shifted[0],path='/students/'+studentId;
 const detail=await get(path+query);
 assert.equal(detail.activeCase,null,'Existing management must not be overwritten');
 assert.ok(detail.signals.some(s=>s.type==='START_TIME_SHIFT'));
 // 재점검일 = 화면 기준 오늘 + 7일 (API today — 고정 날짜 Profile을 그대로 따른다)
 const recheckDate=new Date(Date.parse(detail.today+'T00:00:00Z')+7*86400000).toISOString().slice(0,10);
 const body={branchId,studentId,channel:'MEETING',reason:'ADJUSTMENT_NEEDED',recheckDate,memo:'[화면 확인용 예시]\n최근 입실이 평소보다 늦어지는 이유를 확인했습니다.\n다음 주 입실 패턴과 학습 계획을 다시 확인하기로 했습니다.'};
 const response=await fetch(base+'/cases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal(response.status,201);
 const saved=await response.json();assert.equal(saved.baseline.find(b=>b.type==='START_TIME_SHIFT').unit,'MINUTES');
 console.log('Created one explicitly labeled local synthetic example through the existing API ('+studentId+', recheck '+recheckDate+').');
}
