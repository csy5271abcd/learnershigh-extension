import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const require=createRequire(new URL('../../../../../e2e/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const dir=new URL('./',import.meta.url);
const b=await chromium.launch({channel:'chrome',args:['--no-proxy-server']});
const records=[],errors=[],blocked=[];
for(const width of [1600,1280])for(const theme of ['light','dark'])for(const v of ['a','b','c','d'])for(const test of ['study-one','start-both']){
 const p=await b.newPage({viewport:{width,height:900},colorScheme:theme});p.setDefaultTimeout(7000);
 p.on('pageerror',e=>errors.push({v,width,theme,test,error:e.message}));
 await p.route('**/*',async r=>{
  if(!['GET','HEAD','OPTIONS'].includes(r.request().method())){blocked.push(r.request().url());return r.abort();}
  if(r.request().url().includes('/api/admin/student-care/metrics?')){
   const res=await r.fetch(),body=await res.json();
   body.students.forEach((s,i)=>{const rev=s.review;
    rev.days.forEach(d=>Object.assign(d,{minutes:test==='study-one'&&i===149?350:100,startMinutes:test==='start-both'?(i<3?700:i>=146?1300:1000):1000,attendance:'PRESENT',scheduled:true}));
    rev.weekdayBaseline.forEach(d=>Object.assign(d,{minutes:100,startMinutes:1000,samples:4,startSamples:4}));
    (rev.baselineDays??[]).forEach(d=>Object.assign(d,{minutes:100,startMinutes:1000}));
    Object.assign(rev.current,{studyMinutes:test==='study-one'&&i===149?2450:700,recordedDays:7});Object.assign(rev.baseline,{studyMinutes:2800,recordedDays:28});
   });return r.fulfill({response:res,json:body});
  }return r.continue();
 });
 try{
  await p.goto('http://localhost:5174/student-care/'+v);await p.getByRole('tab').first().waitFor();await p.waitForTimeout(500);
  if(v!=='d')await p.getByRole('tab',{name:v==='c'?'학습관 현황':'학습관별',exact:true}).click();
  const metric=test==='study-one'?'학습 시간':'입실 시각';
  if(v==='d')await p.getByRole('group',{name:'지표 고르기'}).getByRole('button',{name:metric,exact:true}).click();
  else await p.locator('.v5-bands th button').filter({hasText:metric}).click();
  const root=()=>v==='b'?p.getByRole('dialog'):v==='d'?p.locator('.v5-card').last():p.locator('.v5-inline-detail');
  const result=()=>v==='b'?p.getByRole('dialog'):root().locator('.v5-result').last();
  const rec={v,width,theme,test,actions:[]};
  for(const dirName of test==='study-one'?['위쪽']:['위쪽','아래쪽'])for(const method of ['mouse','keyboard']){
   const control=root().getByRole('button',{name:new RegExp('10/21 '+dirName+' 범위 밖')});
   await control.waitFor();rec.controlLabel=await control.getAttribute('aria-label');
   if(method==='mouse')await control.click();else{await control.focus();await p.keyboard.press('Enter');}
   await p.waitForTimeout(100);
   const head=await result().locator(v==='b'?'.v5-overlay-bar':'.v5-result-head').innerText();
   const rows=await result().locator('tbody tr').allTextContents();
   rec.actions.push({dir:dirName,method,head,rows});
   if(method==='mouse')await p.screenshot({path:new URL(`tail-${test}-${v}-${width}-${theme}-${dirName}.png`,dir).pathname.replace(/^\/(\w:)/,'$1')});
   // B replaces metric contents with a date list. Return via its header button.
   if(v==='b'){
    const names=await result().getByRole('button').allTextContents();rec.bButtons=names;
    const btn=result().getByRole('button',{name:/돌아|날짜 목록|지표|그래프/}).first();
    if(await btn.count())await btn.click();else await result().getByRole('button',{name:'닫기',exact:true}).click();
    if(!await p.getByRole('dialog').count())await p.locator('.v5-bands th button').filter({hasText:metric}).click();
   }else await result().getByRole('button',{name:'접기',exact:true}).click();
  }
  const day=root().locator('svg g[role=button]').first();await day.click();rec.allRows=await result().locator('tbody tr').count();
  records.push(rec);
 }catch(e){errors.push({v,width,theme,test,error:e.message});}
 await p.close();writeFileSync(new URL('tails.json',dir),JSON.stringify({records,errors,blocked},null,2));
}
await b.close();console.log(JSON.stringify({states:records.length,errors,blocked}));
