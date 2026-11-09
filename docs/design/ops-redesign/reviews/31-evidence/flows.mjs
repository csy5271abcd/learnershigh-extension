import {createRequire} from 'node:module';import{writeFileSync}from'node:fs';
const require=createRequire(new URL('../../../../../e2e/package.json',import.meta.url));const{chromium}=require('@playwright/test');const dir=new URL('./',import.meta.url).pathname.replace(/^\/(\w:)/,'$1');
const b=await chromium.launch({channel:'chrome',args:['--no-proxy-server']});const records=[],errors=[],blocked=[];
for(const width of [1600,1280])for(const theme of ['light','dark'])for(const test of ['actual','equal','extreme','plan-off','plan-unknown']){
 const p=await b.newPage({viewport:{width,height:900},colorScheme:theme});p.setDefaultTimeout(6000);p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',async r=>{
  if(!['GET','HEAD','OPTIONS'].includes(r.request().method())){blocked.push(r.request().url());return r.abort();}
  if(test!=='actual'&&r.request().url().includes('/api/admin/student-care/metrics?')){
   const res=await r.fetch(),body=await res.json();
   for(const s of body.students){const rev=s.review;
    if(test.startsWith('plan-')){rev.days.forEach(d=>{d.submission=test==='plan-off'?'MISSING':'UNKNOWN';d.scheduled=test==='plan-off'?false:null;d.attendance=test==='plan-off'?'UNSCHEDULED':'UNKNOWN';});}
    else{for(const d of rev.days)Object.assign(d,{minutes:test==='equal'?100:350,attendance:'PRESENT',startMinutes:1000,scheduled:true});for(const d of rev.weekdayBaseline)d.minutes=100;for(const d of rev.baselineDays??[])d.minutes=100;Object.assign(rev.current,{studyMinutes:test==='equal'?700:2450,recordedDays:7});Object.assign(rev.baseline,{studyMinutes:2800,recordedDays:28});}
   }
   return r.fulfill({response:res,json:body});
  }return r.continue();
 });
 try{
  await p.goto('http://localhost:5174/student-care/c');await p.waitForTimeout(800);await p.getByRole('tab',{name:'학습관 현황',exact:true}).click();
  const metric=test.startsWith('plan-')?'계획 제출':'학습 시간';await p.locator('.v5-bands th button').filter({hasText:metric}).click();
  let root=p.locator('.v5-inline-detail');const rec={test,width,theme,bins:await root.locator('.v5-bin').evaluateAll(es=>es.map(e=>({label:e.getAttribute('aria-label'),disabled:e.disabled}))),counts:[]};
  for(let i=0;i<await root.locator('.v5-bin').count();i++){const bin=root.locator('.v5-bin').nth(i);if(await bin.isDisabled())continue;await bin.click();rec.counts.push({i,n:await root.locator('.v5-c-week .v5-bandlist li').count(),text:await root.locator('.v5-c-week .v5-bandlist li').first().innerText()});await bin.click();}
  await root.screenshot({path:dir+`flow-${test}-${width}-${theme}.png`});
  if(test==='actual'){
   await p.locator('.v5-bands th button').filter({hasText:'휴대폰 사용 관찰'}).click();root=p.locator('.v5-inline-detail');rec.phoneBins=await root.locator('.v5-bin').allTextContents();
   await root.locator('svg g[role=button]').first().click();const axes=root.getByRole('group',{name:'관찰 항목'}).first();rec.options=await axes.getByRole('button').allTextContents();await axes.getByRole('button',{name:'고개 숙임',exact:true}).click();rec.afterAxisTitle=await root.locator('.v5-c-week .v5-axis-name').innerText();rec.afterAxisBins=await root.locator('.v5-bin').allTextContents();
   await root.screenshot({path:dir+`flow-c-axis-${width}-${theme}.png`});
  }
  if(test.startsWith('plan-')){const g=root.locator('svg g[role=button]').first();await g.focus();rec.aria=await g.getAttribute('aria-label');rec.tip=await g.getAttribute('data-tip');rec.visible=await root.innerText();await p.screenshot({path:dir+`flow-${test}-focus-${width}-${theme}.png`});}
  records.push(rec);
 }catch(e){errors.push({test,width,theme,message:e.message});}await p.close();
}
await b.close();writeFileSync(dir+'flows.json',JSON.stringify({records,errors,blocked},null,2));console.log(JSON.stringify({states:records.length,errors,blocked}));


