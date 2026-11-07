import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { p34, selfTest } from '../../../../../scripts/research/care-p34-probe.mjs';
const require=createRequire(new URL('../../../../../e2e/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const dir=new URL('./',import.meta.url).pathname.replace(/^\/(\w:)/,'$1');
const src=readFileSync(new URL('../../../../../scripts/research/care-screen-metrics.mjs',import.meta.url),'utf8');
const probe=Function(src.slice(src.indexOf('const probe ='),src.indexOf('const browser ='))+';return probe')();
const browser=await chromium.launch({channel:'chrome',args:['--no-proxy-server']});
const records=[], errors=[], blocked=[];
writeFileSync(dir+'probe-selftest.json',JSON.stringify(await selfTest(browser),null,2));
for(const width of [1600,1280]) for(const theme of ['light','dark']) for(const variant of ['original','a','b','c','d']){
 const ctx=await browser.newContext({viewport:{width,height:900},colorScheme:theme});
 await ctx.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():(blocked.push(route.request().url()),route.abort()));
 const p=await ctx.newPage(); p.on('pageerror',e=>errors.push({variant,width,theme,message:e.message}));
 const stem=`${variant}-${width}-${theme}`;
 const snap=async(state)=>{
  await p.waitForTimeout(250); const metrics=await p.evaluate(probe); const layout=await p34(p);
  const extra=await p.evaluate(()=>{const d=document.querySelector('[data-care-detail-student]'); const main=document.querySelector('main');return {roster:document.querySelectorAll('[data-care-roster-row],tr.rs-summary').length,detailWidth:d?.getBoundingClientRect().width,mainWidth:main?.getBoundingClientRect().width,svg:[...document.querySelectorAll('main svg[role=img]')].map(e=>({label:e.getAttribute('aria-label'),y:e.getBoundingClientRect().y,height:e.getBoundingClientRect().height,circles:e.querySelectorAll('circle').length,focusablePoints:e.querySelectorAll('circle[tabindex],path[tabindex]').length})),dialogs:[...document.querySelectorAll('[role=dialog]')].filter(e=>e.getBoundingClientRect().width).map(e=>e.getAttribute('aria-label'))}});
  records.push({variant,width,theme,state,...metrics,layout,...extra});
  await p.screenshot({path:dir+`${stem}-${state}.png`});
  writeFileSync(dir+`${stem}-${state}.txt`,await p.locator('body').innerText());
 };
 try{
 await p.goto('http://localhost:5174/student-care'+(variant==='original'?'':'/'+variant));
 await p.waitForTimeout(1100); await p.locator('[role=tab]').first().waitFor();
 if(variant==='c') await p.getByRole('tab',{name:/전체 학생/}).click();
 if(variant==='d') await p.getByRole('button',{name:/^전체 학생 150명$/}).click();
 await snap('roster');
 if(variant==='original') await p.locator('tr.rs-summary button[aria-label$="상세 펼치기"]').first().click();
 else await p.locator('[data-care-roster-row] button').first().click();
 await p.waitForTimeout(600); await snap('detail');
 if(variant!=='original') {await p.locator('[data-care-detail-student]').screenshot({path:dir+`${stem}-detail-all.png`});}
 await p.goto('http://localhost:5174/student-care'+(variant==='original'?'':'/'+variant));await p.waitForTimeout(800);
 if(variant!=='d') await p.getByRole('tab',{name:variant==='c'?'학습관 현황':'학습관별',exact:true}).click();
 await p.evaluate(()=>scrollTo(0,0));await snap('branch');
 if(variant!=='original'){
 const section=variant==='d'?p.locator('.v5-card').last():p.locator(`#${variant}-metric-study`);
 await section.locator('svg g[role=button]').first().click(); await snap('result');
 await p.getByRole('button',{name:'비교',exact:true}).first().click();
 await p.getByRole('button',{name:'비교',exact:true}).first().click();
 await p.getByRole('button',{name:'비교',exact:true}).first().click();
 await snap('compare');
 if(variant==='b') await p.getByRole('dialog').getByRole('button',{name:'닫기',exact:true}).click();
 const vision=variant==='d'?p.getByRole('group',{name:'지표 고르기'}).getByRole('button',{name:'비전 관찰',exact:true}):p.locator(`#${variant}-metric-vision`);
 if(variant==='d') {await vision.click();} else {await vision.scrollIntoViewIfNeeded();}
 await snap('vision');
 for(const label of ['자리 비움','읽기·쓰기','휴대폰 사용','자세']){
  const b=p.getByRole('group',{name:'비전 관찰 항목'}).getByRole('button',{name:label,exact:false});
  if(await b.count()){await b.click();await snap('vision-'+label.replaceAll('·',''));}
 }
 }
 }catch(e){errors.push({variant,width,theme,message:e.message});console.log('ERROR',stem,e.message.slice(0,180));}
 writeFileSync(dir+'measurements.json',JSON.stringify({records,errors,blocked},null,2));
 console.log(stem,records.filter(r=>r.variant===variant&&r.width===width&&r.theme===theme).map(r=>`${r.state}:${r.text}/P${r.layout.p3},${r.layout.p4}`).join(' '));
 await ctx.close();
}
await browser.close();
