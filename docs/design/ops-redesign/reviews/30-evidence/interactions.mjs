import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const require=createRequire(new URL('../../../../../e2e/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const dir=new URL('./',import.meta.url).pathname.replace(/^\/(\w:)/,'$1');
const b=await chromium.launch({channel:'chrome',args:['--no-proxy-server']});
const records=[],errors=[],blocked=[],loadRetries=[];
for(const width of [1600,1280])for(const theme of ['light','dark'])for(const v of ['a','b','c','d']){
 const p=await b.newPage({viewport:{width,height:900},colorScheme:theme});p.setDefaultTimeout(15000);
 p.on('pageerror',e=>errors.push({v,width,theme,message:e.message}));
 await p.route('**/*',r=>['GET','HEAD','OPTIONS'].includes(r.request().method())?r.continue():(blocked.push(r.request().url()),r.abort()));
 const load=async()=>{for(let n=0;n<3;n++){await p.goto('http://localhost:5174/student-care/'+v);try{await p.getByRole('tab').first().waitFor({timeout:15000});if(v!=='d')await p.getByRole('tab',{name:v==='c'?'학습관 현황':'학습관별',exact:true}).click();return;}catch(e){loadRetries.push({v,width,theme,n,text:await p.locator('body').innerText()});if(n===2)throw e;}}};
 const tips=()=>p.locator('[role=status]').allTextContents();
 const open=async(m)=>{await p.locator('.v5-bands th button').filter({hasText:m}).click();await p.waitForTimeout(150);return v==='b'?p.getByRole('dialog'):v==='d'?p.locator('.v5-card').last():p.locator('.v5-inline-detail')};
 try{
 await load();const r={v,width,theme};
 const trend=p.locator('.v5-trend').first().locator('g').first();await trend.focus();r.trendFocus=await tips();await trend.click();r.trendClick=await p.locator('.v5-result,[role=dialog]').allTextContents();
 await load();await p.locator('.v5-bands tbody').nth(1).locator('button.v5-band-over').click();r.bandCount=await p.locator('.v5-bandlist li').count();r.chosen=await p.locator('.v5-bandlist button').first().innerText();await p.locator('.v5-bandlist button').first().click();const detail=p.locator('[data-care-detail-student]');r.opened=await detail.getAttribute('data-care-detail-student');
 await detail.locator('.v5-cbar').first().focus();r.barFocus=await tips();await detail.locator('.v5-trend').first().locator('g').first().focus();r.weekFocus=await tips();await detail.getByRole('table',{name:'최근 7일 출결과 계획 제출'}).locator('[data-cell="0,0"]').focus();await p.keyboard.press('ArrowDown');r.week7=await tips();
 await load();const plan=await open('계획 제출');const pd=plan.locator('svg g[role=button]').first();await pd.focus();r.planFocus=await tips();await p.screenshot({path:dir+`${v}-plan-tip-${width}-${theme}.png`});
 await load();const att=await open('결석');const miss=att.getByRole('button',{name:/결석 없이 계획 미제출/});r.missLabel=await miss.innerText();await miss.click();r.missButtons=await att.locator('p.v5-wrap button').count();
 await load();const vis=await open('휴대폰 사용 관찰');const head=vis.locator('text.v5-head-num').first();await head.hover();r.visionHeadHover=await tips();r.headTab=await head.evaluate(e=>e.getAttribute('tabindex'));await p.screenshot({path:dir+`${v}-vision-head-tip-${width}-${theme}.png`});const day=vis.locator('svg g[role=button]').first();await day.focus();r.visionDayFocus=await tips();await p.screenshot({path:dir+`${v}-vision-day-tip-${width}-${theme}.png`});
 records.push(r);
 }catch(e){errors.push({v,width,theme,message:e.message})}await p.close();
}
await b.close();writeFileSync(dir+'interactions.json',JSON.stringify({records,errors,blocked,loadRetries},null,2));console.log(JSON.stringify({states:records.length,errors,blocked}));



