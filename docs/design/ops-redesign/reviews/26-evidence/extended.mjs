import {createRequire} from 'node:module';import{writeFileSync}from'node:fs';import{p34}from'../../../../../scripts/research/care-p34-probe.mjs';
const require=createRequire(new URL('../../../../../e2e/package.json',import.meta.url));const{chromium}=require('@playwright/test');
const dir=new URL('./',import.meta.url).pathname.replace(/^\/(\w:)/,'$1');const b=await chromium.launch({channel:'chrome',args:['--no-proxy-server']});const out=[];
for(const width of [1600,1280])for(const theme of ['light','dark']){
const ctx=await b.newContext({viewport:{width,height:900},colorScheme:theme});await ctx.route('**/*',r=>['GET','HEAD','OPTIONS'].includes(r.request().method())?r.continue():r.abort());const p=await ctx.newPage();
const snap=async(name)=>{await p.waitForTimeout(100);await p.screenshot({path:dir+`${name}-${width}-${theme}.png`});out.push({name,width,theme,layout:await p34(p),themeCheck:await p.evaluate(()=>({dark:matchMedia('(prefers-color-scheme: dark)').matches,background:getComputedStyle(document.body).backgroundColor}))});};
await p.goto('http://localhost:5174/student-care/c');await p.waitForTimeout(600);await p.getByRole('tab',{name:'학습관 현황',exact:true}).click();
for(const label of ['자리에 있음','고개 숙임','휴대폰 사용','읽기·쓰기']){
const s=p.locator('#c-metric-vision');
const day=s.locator('.v5-vision-row').first().locator('svg g[role=button]').last();if(await s.locator('.v5-result').count()===0)await day.click();
await s.getByRole('group',{name:'관찰 항목',exact:true}).getByRole('button',{name:label,exact:true}).click();
while(await s.locator('.v5-compare tbody tr').count()<3){await s.getByRole('button',{name:'비교',exact:true}).first().click();}
await p.evaluate(()=>{const el=document.querySelector('#c-metric-vision');scrollTo(0,el.getBoundingClientRect().top+scrollY-120)});await snap('c-fouraxes-'+label.replaceAll('·',''));
await s.locator('.v5-result').evaluate(el=>scrollTo(0,el.getBoundingClientRect().top+scrollY-560));await snap('c-fouraxes-result-'+label.replaceAll('·',''));
}
await p.locator('#c-metric-vision .v5-result tbody tr').last().scrollIntoViewIfNeeded();await snap('c-result-end');
await p.getByRole('button',{name:'학습 시간',exact:true}).first().click();await snap('c-result-jump-study');
for(const variant of ['a','b','c','d']){
await p.goto('http://localhost:5174/student-care/'+variant);await p.waitForTimeout(500);
await p.getByRole('button',{name:'관리 기준 설정',exact:true}).click();await snap(variant+'-settings');await p.getByRole('button',{name:'취소',exact:true}).click();
if(variant==='c')await p.getByRole('tab',{name:/전체 학생/}).click();if(variant==='d')await p.getByRole('button',{name:'전체 학생 150명',exact:true}).click();
await p.locator('[data-care-roster-row] button').first().click();await p.waitForTimeout(300);
const scrollBody=p.locator('.v5-overlay-body');const vision=p.getByRole('table',{name:'비전 관찰 7일(예시)',exact:true});await vision.scrollIntoViewIfNeeded();await snap(variant+'-detail-vision');
const textarea=p.locator('[data-care-detail-student] textarea').first();if(await textarea.count()){
await textarea.fill('저장하지 않는 관문 검토 입력');
if(variant==='a')await p.locator('[data-care-detail-student]').getByRole('button',{name:'접기',exact:true}).click();
if(variant==='b'||variant==='c')await p.getByRole('dialog').getByRole('button',{name:'닫기',exact:true}).click();
if(variant==='d')await p.getByRole('button',{name:/학습관으로/}).click();
await snap(variant+'-dirty');await p.getByRole('button',{name:'버리기',exact:true}).click();
}
}
await ctx.close();}
writeFileSync(dir+'extended.json',JSON.stringify(out,null,2));await b.close();console.log('states',out.length,'violations',out.filter(r=>r.layout.p3||r.layout.p4));
