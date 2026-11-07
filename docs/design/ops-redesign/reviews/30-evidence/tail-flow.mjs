import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const require=createRequire(new URL('../../../../../e2e/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const dir=new URL('./',import.meta.url).pathname.replace(/^\/(\w:)/,'$1');
const b=await chromium.launch({channel:'chrome',args:['--no-proxy-server']});
const records=[],errors=[],blocked=[];
for(const width of [1600,1280])for(const theme of ['light','dark'])for(const v of ['a','b','c','d']){
 const p=await b.newPage({viewport:{width,height:900},colorScheme:theme});p.setDefaultTimeout(12000);
 p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',async r=>{
  if(!['GET','HEAD','OPTIONS'].includes(r.request().method())){blocked.push(r.request().url());return r.abort();}
  if(r.request().url().includes('/api/admin/student-care/metrics?')){
   const res=await r.fetch(),body=await res.json();
   body.students.forEach((s,i)=>{const rev=s.review;rev.days.forEach(d=>Object.assign(d,{minutes:i===149?350:100,attendance:'PRESENT',scheduled:true}));rev.weekdayBaseline.forEach(d=>d.minutes=100);(rev.baselineDays??[]).forEach(d=>d.minutes=100);Object.assign(rev.current,{studyMinutes:i===149?2450:700,recordedDays:7});Object.assign(rev.baseline,{studyMinutes:2800,recordedDays:28});});
   return r.fulfill({response:res,json:body});
  }return r.continue();
 });
 try{
  await p.goto('http://localhost:5174/student-care/'+v);await p.getByRole('tab').first().waitFor();await p.waitForTimeout(700);
  if(v!=='d')await p.getByRole('tab',{name:v==='c'?'학습관 현황':'학습관별',exact:true}).click();
  if(v!=='d')await p.locator('.v5-bands th button').filter({hasText:'학습 시간'}).click();
  const root=v==='b'?p.getByRole('dialog'):v==='d'?p.locator('.v5-card').last():p.locator('.v5-inline-detail');
  const rail=root.locator('text.v5-rail-num').first();await rail.waitFor();await rail.scrollIntoViewIfNeeded();
  const rec={v,width,theme,rail:await rail.textContent(),rect:await rail.boundingBox(),role:await rail.getAttribute('role'),tab:await rail.getAttribute('tabindex')};
  await rail.click();await p.waitForTimeout(120);
  const result=v==='b'?p.getByRole('dialog'):root.locator('.v5-result').last();rec.resultHead=await result.locator(v==='b'?'.v5-overlay-bar':'.v5-result-head').allTextContents();rec.resultRows=await result.locator('tbody tr').count();rec.text=await result.innerText();
  rec.filterButtons=await result.locator('button').allTextContents();
  await p.screenshot({path:dir+`tail-${v}-${width}-${theme}.png`});
  if(v==='a'){
   for(let i=0;i<3;i++)await result.getByRole('button',{name:'비교',exact:true}).first().click();
   rec.comparison=await root.locator('.v5-line').evaluateAll(es=>es.map(e=>({label:e.getAttribute('aria-label'),points:e.querySelector('polyline')?.getAttribute('points'),rect:e.querySelector('text')?.getBoundingClientRect().toJSON()})));
   await root.locator('svg').first().screenshot({path:dir+`tail-compare-${v}-${width}-${theme}.png`});
  }records.push(rec);
 }catch(e){errors.push({v,width,theme,error:e.message});}await p.close();
}
await b.close();writeFileSync(dir+'tail-flow.json',JSON.stringify({records,errors,blocked},null,2));console.log(JSON.stringify({states:records.length,errors,blocked}));

