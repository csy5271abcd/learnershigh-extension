import{createRequire}from'node:module';import{writeFileSync}from'node:fs';
const require=createRequire(new URL('../../../../../e2e/package.json',import.meta.url));const{chromium}=require('@playwright/test');
const dir=new URL('./',import.meta.url).pathname.replace(/^\/(\w:)/,'$1');const b=await chromium.launch({channel:'chrome',args:['--no-proxy-server']});const records=[],errors=[],blocked=[];
for(const width of [1600,1280])for(const theme of ['light','dark'])for(const test of ['axes','boundaries']){
 const p=await b.newPage({viewport:{width,height:900},colorScheme:theme});p.setDefaultTimeout(12000);p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',async r=>{if(!['GET','HEAD','OPTIONS'].includes(r.request().method())){blocked.push(r.request().url());return r.abort();}if(test==='boundaries'&&r.request().url().includes('/api/admin/student-care/metrics?')){const res=await r.fetch(),body=await res.json();body.students.forEach((s,i)=>{s.review.days.forEach(d=>Object.assign(d,{startMinutes:1000+[-30,-10,10,30,60][i%5],attendance:'PRESENT',scheduled:true}));s.review.weekdayBaseline.forEach(d=>Object.assign(d,{startMinutes:1000,startSamples:4}));});return r.fulfill({response:res,json:body});}return r.continue();});
 try{
  await p.goto('http://localhost:5174/student-care/c');await p.getByRole('tab',{name:'학습관 현황',exact:true}).click();await p.locator('.v5-bands th button').filter({hasText:test==='axes'?'휴대폰 사용 관찰':'입실 시각'}).click();
  const root=p.locator('.v5-inline-detail'),rec={test,width,theme,cases:[]};
  if(test==='axes')for(const axis of ['자리에 있음','고개 숙임','휴대폰 사용','읽기·쓰기']){
   await root.getByRole('group',{name:'관찰 항목'}).first().getByRole('button',{name:axis,exact:true}).click();
   const item={axis,title:await root.locator('.v5-c-week .v5-axis-name').innerText(),bins:await root.locator('.v5-bin').allTextContents()};
   await root.locator('.v5-bin:not([disabled])').first().click();item.student=await root.locator('.v5-c-week .v5-bandlist li').first().innerText();await root.locator('.v5-bin:not([disabled])').first().click();rec.cases.push(item);
  }else rec.bins=await root.locator('.v5-bin').allTextContents();
  await root.screenshot({path:dir+`axes-${test}-${width}-${theme}.png`});records.push(rec);
 }catch(e){errors.push({test,width,theme,message:e.message});}await p.close();
}await b.close();writeFileSync(dir+'axes.json',JSON.stringify({records,errors,blocked},null,2));console.log(JSON.stringify({states:records.length,errors,blocked}));
