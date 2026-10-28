/** Explicit local-only UI example. Preserves any existing case; never resets stored history. */
import assert from 'node:assert/strict';
const origin=process.env.CARE_DEMO_API_ORIGIN??'http://127.0.0.1:5174';
const localUrl=new URL(origin);
assert.ok(['127.0.0.1','localhost'].includes(localUrl.hostname)&&localUrl.protocol==='http:'&&!localUrl.username&&!localUrl.password,'Local demo only');
const base=origin+'/api/admin/student-care';
async function get(path){const r=await fetch(base+path);assert.equal(r.status,200);return r.json()}
const branches=(await get('/branches')).items;
assert.deepEqual(branches.map(b=>[b.branchId,b.studentCount]),[['demo_large',60],['demo_medium',30],['demo_small',10]]);
const path='/students/demo_s035',query='?branchId=demo_large';
const history=await get(path+'/history'+query);
if(history.items.some(item=>item.content.includes('[화면 확인용 예시]'))){console.log('Existing example retained. No writes.');}
else{
 const detail=await get(path+query);
 assert.equal(detail.activeCase,null,'Existing management must not be overwritten');
 assert.ok(detail.signals.some(s=>s.type==='START_TIME_SHIFT'));
 const body={branchId:'demo_large',studentId:'demo_s035',channel:'MEETING',reason:'ADJUSTMENT_NEEDED',recheckDate:'2026-11-04',memo:'[화면 확인용 예시]\n최근 입실이 평소보다 늦어지는 이유를 확인했습니다.\n다음 주 입실 패턴과 학습 계획을 다시 확인하기로 했습니다.'};
 const response=await fetch(base+'/cases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal(response.status,201);
 const saved=await response.json();assert.equal(saved.baseline.find(b=>b.type==='START_TIME_SHIFT').unit,'MINUTES');
 console.log('Created one explicitly labeled local synthetic example through the existing API.');
}
