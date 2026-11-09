// 31차 독립 검토(Claude): T02 계획 제출 혼합 상태(대상 아님/미상/알려진 대상) 반례. 읽기 전용.
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const require=createRequire(new URL('../../../../../e2e/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const dir=new URL('./',import.meta.url).pathname.replace(/^\/(\w:)/,'$1');
const b=await chromium.launch({channel:'chrome',args:['--no-proxy-server']});
const records=[],errors=[],blocked=[];
// 학생 i의 상태: off(대상 아님) / unk(미상) / sub(제출) / miss(미제출)
const CASES={
  'off75-unk75':i=>i<75?'off':'unk',
  'off149-unk1':i=>i<149?'off':'unk',
  'off1-unk149':i=>i<1?'off':'unk',
  'all-unk':()=>'unk',
  'all-off':()=>'off',
  'sub1-unk149':i=>i<1?'sub':'unk',
  'miss1-unk149':i=>i<1?'miss':'unk',
  'sub75-unk75':i=>i<75?'sub':'unk',
};
const apply={off:d=>Object.assign(d,{submission:'MISSING',scheduled:false,attendance:'UNSCHEDULED'}),unk:d=>Object.assign(d,{submission:'UNKNOWN',scheduled:null,attendance:'UNKNOWN'}),sub:d=>Object.assign(d,{submission:'SUBMITTED',scheduled:true,attendance:'PRESENT'}),miss:d=>Object.assign(d,{submission:'MISSING',scheduled:true,attendance:'PRESENT'})};
for(const [width,theme] of [[1280,'light']])for(const v of ['a','b','c','d'])for(const [test,fn] of Object.entries(CASES)){
  const p=await b.newPage({viewport:{width,height:900},colorScheme:theme});p.setDefaultTimeout(7000);
  p.on('pageerror',e=>errors.push({v,test,error:e.message}));
  await p.route('**/*',async r=>{
    if(!['GET','HEAD','OPTIONS'].includes(r.request().method())){blocked.push(r.request().url());return r.abort();}
    if(!r.request().url().includes('/api/admin/student-care/metrics?'))return r.continue();
    const res=await r.fetch(),body=await res.json();
    body.students.forEach((s,i)=>s.review.days.forEach(d=>apply[fn(i)](d)));
    return r.fulfill({response:res,json:body});
  });
  const rec={v,width,theme,test};
  try{
    await p.goto('http://localhost:5174/student-care/'+v);await p.getByRole('tab').first().waitFor();await p.waitForTimeout(400);
    if(v!=='d')await p.getByRole('tab',{name:v==='c'?'학습관 현황':'학습관별',exact:true}).click();
    const row=p.locator('.v5-bands tr').filter({hasText:'계획 제출'}).first();
    rec.bandRow=(await row.innerText()).replace(/\s+/g,' ');
    const tp=row.locator('svg [data-tip]').first();
    rec.trendTip=await tp.count()?await tp.getAttribute('data-tip'):null;
    if(v==='d')await p.getByRole('group',{name:'지표 고르기'}).getByRole('button',{name:'계획 제출',exact:true}).click();
    else await p.locator('.v5-bands th button').filter({hasText:'계획 제출'}).click();
    await p.waitForTimeout(150);
    const svg=p.locator('svg[aria-label="날짜별 계획 미제출 인원"]').last();
    rec.days=await svg.evaluate(s=>[...s.querySelectorAll(':scope > g[role=button]')].map(g=>({aria:g.getAttribute('aria-label'),tip:g.getAttribute('data-tip'),text:g.textContent,bar:!!g.querySelector('.v5-bar-missing')})));
    const g0=svg.locator(':scope > g[role=button]').first();await g0.focus();await p.waitForTimeout(80);
    await p.screenshot({path:dir+`r31-t02e-${test}-${v}-${width}-${theme}.png`});
    await p.keyboard.press('Enter');await p.waitForTimeout(150);
    const res=v==='b'?p.getByRole('dialog').last():p.locator('.v5-result').last();
    rec.resultHead=await res.count()?(await res.locator(v==='b'?'.v5-overlay-bar':'.v5-result-head').first().innerText()).replace(/\n/g,' '):null;
    rec.resultRows=await res.count()?await res.locator('tbody tr').count():null;
    rec.resultText=await res.count()?(await res.innerText()).slice(0,200).replace(/\n/g,' '):null;
  }catch(e){errors.push({v,width,theme,test,error:e.message.split('\n')[0]});}
  records.push(rec);await p.close();
}
await b.close();
writeFileSync(dir+'r31-t02-enter.json',JSON.stringify({records,errors,blocked},null,2));
console.log(JSON.stringify({states:records.length,errors,blocked:blocked.length}));
