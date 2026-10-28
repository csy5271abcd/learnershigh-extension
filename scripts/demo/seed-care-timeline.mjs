/** Explicit synthetic history, using the real domain API and a separate loopback seed server.
 * Never calls reset, updates source records, or changes the interactive server's clock.
 */
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

const note=(date,channel,content)=>({date,channel,content});
export const histories=[
 {id:'006',date:'2026-10-20',check:'2026-10-27',channel:'MEETING',memo:'하루에 끝내기 어려운 분량을 계획하고 있어 실제 학습량과 차이가 컸음. 우선순위 과목 두 개부터 마치고 남은 분량을 다음 날로 나누기로 함.',notes:[note('2026-10-23','MESSAGE','계획 분량을 줄여 작성하고 있다고 답함. 제출 기록만으로 완료 여부를 단정하지 않고 다음 면담에서 실제 진행 상황을 함께 확인하기로 함.'),note('2026-10-28','MEETING','최근 기록에서 계획 대비 진행률이 회복된 것을 함께 확인함. 학생도 나눠서 계획하는 방식이 유지 가능하다고 답하여 이번 관리는 종료하기로 함.')],decision:'CLOSE'},
 {id:'003',date:'2026-10-26',check:'2026-10-28',channel:'MEETING',memo:'입실은 하고 있으나 계획 제출을 빠뜨리는 날이 반복됨. 입실 후 첫 학습을 시작하기 전에 계획을 제출하고, 어려운 날에는 실제 가능한 분량으로 작성하기로 함.',notes:[note('2026-10-27','MESSAGE','제출 방법은 알고 있으나 바로 공부를 시작하다 잊는다고 답함. 다음 입실 때 제출 여부를 함께 확인하기로 함.')],decision:'CONTINUE',next:'2026-11-04'},
 {id:'016',date:'2026-10-25',check:'2026-10-28',channel:'CALL',memo:'최근 학습량과 계획 대비 진행률이 함께 낮아짐. 학생은 학교 과제와 병행하기 어렵다고 설명함. 학습관에서는 당일 가능한 과목과 분량부터 정하고 다음 점검에서 유지 여부를 확인하기로 함.',notes:[note('2026-10-28','MEETING','학습량이 아직 평소 수준으로 돌아오지 않았음. 당장 이전 분량을 요구하기보다 현재 계획을 실제로 마칠 수 있는지 며칠 더 확인하기로 함.')],decision:'CONTINUE',next:'2026-11-02'},
 {id:'027',date:'2026-10-26',check:'2026-11-02',channel:'MEETING',memo:'전체 학습량보다 수학 계획 비중과 실제 비중의 차이가 큼. 수학을 마지막 순서에 두면 다음 날로 미룬다고 답함. 입실 후 첫 학습에 수학 문제 풀이를 배치하고 진행 상황을 다시 보기로 함.',notes:[note('2026-10-28','MESSAGE','수학부터 시작하는 방식으로 바꿔보겠다고 답함. 과목 비중만으로 학습 성과를 판단하지 않고 실제 진행한 내용을 다음 면담에서 확인할 예정임.')]},
 {id:'014',date:'2026-10-25',check:'2026-10-28',channel:'CALL',memo:'예정된 입실일에 결석이 이어져 학생에게 연락함. 이번 주 입실 가능 일정을 다시 확인하고, 다음 연락 때 실제 입실 여부와 학습 계획을 함께 점검하기로 함.',notes:[note('2026-10-27','CALL','통화가 연결되지 않아 입실 가능한 날짜를 알려달라는 문자를 남김.'),note('2026-10-28','MESSAGE','아직 일정 답변이 없어 관리 종료하지 않음. 다음 연락에서 미입실 이유와 이후 일정을 직접 확인할 예정임.')],decision:'CONTINUE',next:'2026-10-30'},
 {id:'019',date:'2026-10-26',channel:'MEETING',reason:'EXPECTED_CHANGE',memo:'학교 시험 대비로 별도 종이에 계획을 작성해 온라인 제출을 하지 않았다고 설명함. 작성한 계획을 함께 확인했고, 다음 입실부터 시스템에도 제출하기로 안내함. 이번 건은 추가 관리 없이 종료함.'},
 {id:'030',date:'2026-10-25',channel:'CALL',reason:'RECORD_ISSUE',memo:'학생은 계획을 제출했다고 답했으나 조회 기록과 일치하지 않음. 제출한 날짜와 화면을 확인해 원본 기록 확인을 요청함. 학습 태도 문제로 단정하지 않으며, 기록 정정 여부는 별도로 확인하기로 함.'},
 {id:'062',date:'2026-10-25',check:'2026-10-28',channel:'CALL',memo:'최근 입실이 본인의 평소 시간보다 늦어지고 있음. 학생은 하교 후 일정이 바뀌었다고 설명함. 다른 학생의 입실 시각과 비교하지 않고 새 일정에서도 학습 시간이 확보되는지 확인하기로 함.',notes:[note('2026-10-28','MEETING','변경된 일정이 이번 주에도 이어지고 있음. 늦은 시각 자체보다 학습량과 계획 수행에 영향을 주는지 추가로 확인하기로 함.')],decision:'CONTINUE',next:'2026-11-04'},
 {id:'065',date:'2026-10-26',check:'2026-11-01',channel:'MESSAGE',memo:'계획 미제출이 여러 날 확인되어 작성 시점을 문의함. 학생과 다음 입실 때 직접 제출 과정을 확인하기로 약속함.',notes:[note('2026-10-28','MEETING','계획을 저장한 뒤 제출 단계까지 완료하지 않은 것을 함께 확인함. 오늘은 제출까지 진행했고, 이후에도 이어지는지는 다음 점검에서 확인하기로 함.')]},
 {id:'070',date:'2026-10-25',check:'2026-10-28',channel:'MEETING',memo:'계획한 분량에 비해 실제 학습이 적어 진행 중 막히는 부분을 확인함. 오래 걸리는 문제를 표시해 두고 다음 과목으로 넘어가는 순서를 정하기로 함.',notes:[note('2026-10-28','CALL','최근 학습량이 계속 낮게 나타나 학생과 다시 통화함. 계획 분량을 조정하되 실제 완료한 내용을 다음 면담에서 확인하기로 함.')],decision:'CONTINUE',next:'2026-11-03'},
 {id:'092',date:'2026-10-25',check:'2026-10-28',channel:'MEETING',memo:'입실 후 공부는 하고 있으나 계획 제출 누락이 반복됨. 제출 여부를 직접 확인하는 습관부터 잡고, 다음 점검 때 누락 날짜를 함께 보며 원인을 확인하기로 함.',notes:[note('2026-10-28','MESSAGE','최근에도 미제출 날짜가 남아 있음. 작성이 어려운 항목을 다음 입실 때 함께 확인하기로 하여 관리를 이어감.')],decision:'CONTINUE',next:'2026-11-01'},
 {id:'100',date:'2026-10-28',check:'2026-11-04',channel:'MEETING',memo:'최근 수학의 계획 비중과 실제 학습 비중이 다르게 나타남. 다른 과목에 시간이 더 걸렸다고 설명하여 하루 계획에서 과목별 우선순위를 다시 정함. 다음 주 실제 비중과 진행한 분량을 함께 확인하기로 함.'},
];

export async function seedTimeline(origin='http://127.0.0.1:8082'){
 const url=new URL(origin);
 assert.ok(url.protocol==='http:'&&url.hostname==='127.0.0.1'&&url.port==='8082'&&url.pathname==='/'&&!url.username&&!url.password,'Use the dedicated loopback seed server on port 8082');
 const base=origin.replace(/\/$/,'');
 async function request(path,method='GET',body){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});const text=await r.text();assert.ok(r.ok,`${method} ${path}: ${r.status} ${text}`);return text?JSON.parse(text):null;}
 const api='/api/admin/student-care';
 const branches=(await request(api+'/branches')).items;
 assert.deepEqual(branches.map(b=>[b.branchId,b.studentCount]),[['demo_large',60],['demo_medium',30],['demo_small',10]]);
 const clock=date=>request('/api/test/clock','PUT',{date});
 const branch=id=>+id<=60?'demo_large':+id<=90?'demo_medium':'demo_small';
 let created=0,actions=0;
 try{
  for(const h of histories){
   const branchId=branch(h.id),studentId='demo_s'+h.id,q='?branchId='+branchId;
   const history=()=>request(api+'/students/'+studentId+'/history'+q);
   let items=(await history()).items;
   let opening=items.find(e=>e.type==='REASON_CONFIRMED'&&e.content.endsWith(h.memo));
   let caseId=opening?.caseId;
   if(!opening){
    assert.equal(items.length,0,`Preserve existing unrelated history for ${studentId}; inspect before seeding`);
    await clock(h.date);
    const c=await request(api+'/cases','POST',{branchId,studentId,reason:h.reason??'ADJUSTMENT_NEEDED',channel:h.channel,memo:h.memo,recheckDate:h.check??null});
    caseId=c.caseId;assert.ok(caseId);created++;
   }
   for(const n of h.notes??[]){
    items=(await history()).items;
    if(items.some(e=>e.caseId===caseId&&e.type==='NOTE'&&e.content.endsWith(n.content)))continue;
    await clock(n.date);await request(api+'/cases/'+caseId+'/notes'+q,'POST',{channel:n.channel,content:n.content});actions++;
   }
   if(h.decision){
    items=(await history()).items;
    if(!items.some(e=>e.caseId===caseId&&e.type==='RECHECKED'&&e.occurredOn==='2026-10-28')){
     await clock('2026-10-28');await request(api+'/cases/'+caseId+'/decisions'+q,'POST',{decision:h.decision,recheckDate:h.next??null});actions++;
    }
   }
  }
 }finally{await clock('2026-10-28');}
 return {created,actions,cases:histories.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(await seedTimeline()));
