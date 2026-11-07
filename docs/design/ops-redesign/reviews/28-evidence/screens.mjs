import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {p34,selfTest} from '../../../../../scripts/research/care-p34-probe.mjs';
const require=createRequire(new URL('../../../../../e2e/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const dir=new URL('./',import.meta.url).pathname.replace(/^\/(\w:)/,'$1');
const src=readFileSync(new URL('../../../../../scripts/research/care-screen-metrics.mjs',import.meta.url),'utf8');
const probe=Function(src.slice(src.indexOf('const probe ='),src.indexOf('const browser ='))+';return probe')();
const b=await chromium.launch({channel:'chrome',args:['--no-proxy-server']});
const records=[],errors=[],blocked=[];
writeFileSync(dir+'selftest.json',JSON.stringify(await selfTest(b),null,2));
for(const width of [1600,1280])for(const theme of ['light','dark'])for(const v of ['original','a','b','c','d']){
 const p=await b.newPage({viewport:{width,height:900},colorScheme:theme});p.setDefaultTimeout(6000);
 p.on('pageerror',e=>errors.push({v,width,theme,error:e.message}));
 await p.route('**/*',r=>['GET','HEAD','OPTIONS'].includes(r.request().method())?r.continue():(blocked.push(r.request().url()),r.abort()));
 const snap=async(state,locator)=>{
  await p.waitForTimeout(120);
  const stem=`${v}-${width}-${theme}-${state}`;
  const info=await p.evaluate(()=>({roster:document.querySelectorAll('[data-care-roster-row],tr.rs-summary').length,detailWidth:document.querySelector('[data-care-detail-student]')?.getBoundingClientRect().width,mainWidth:document.querySelector('main')?.getBoundingClientRect().width,plots:[...document.querySelectorAll('.v5-card svg')].map(s=>({label:s.getAttribute('aria-label'),width:s.getBoundingClientRect().width,height:s.getBoundingClientRect().height})),bands:[...document.querySelectorAll('.v5-band')].map(e=>({label:e.getAttribute('aria-label'),text:e.textContent,rect:(()=>{let r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})()})),trends:[...document.querySelectorAll('.v5-trend')].map(e=>({label:e.getAttribute('aria-label'),tab:e.getAttribute('tabindex'),tip:e.getAttribute('data-tip')}))}));
  records.push({v,width,theme,state,...await p.evaluate(probe),layout:await p34(p),...info});
  await (locator??p).screenshot({path:dir+stem+'.png'});writeFileSync(dir+stem+'.txt',await p.locator('body').innerText());
 };
 const load=async()=>{await p.goto('http://localhost:5174/student-care'+(v==='original'?'':'/'+v));await p.locator('[role=tab]').first().waitFor();await p.waitForTimeout(950)};
 try{
  await load();if(v==='c')await snap('queue');
  if(v==='c')await p.getByRole('tab',{name:/전체 학생/}).click();
  if(v==='d')await p.getByRole('button',{name:'전체 학생 150명',exact:true}).click();
  await snap('roster');
  if(v==='original')await p.locator('tr.rs-summary button[aria-label$="상세 펼치기"]').first().click();
  else await p.locator('[data-care-roster-row] button').first().click();
  await p.waitForTimeout(400);await snap('detail');
  if(v!=='original'){
   const detail=p.locator('[data-care-detail-student]');await snap('detail-all',detail);
   await detail.getByRole('button',{name:'날짜별 보기',exact:true}).click();await snap('byday',detail);
   const vision=detail.getByRole('table',{name:'비전 관찰 7일(예시)',exact:true});
   await vision.locator('[data-cell="0,0"]').focus();await p.keyboard.press('ArrowRight');await snap('vision-focus');
  }
  await load();if(v!=='d')await p.getByRole('tab',{name:v==='c'?'학습관 현황':'학습관별',exact:true}).click();
  if(v==='original'){await p.getByText('학습관 지표 불러오는 중',{exact:true}).waitFor({state:'hidden'});await p.waitForTimeout(800)}
  await p.evaluate(()=>scrollTo(0,0));await snap('branch');
  if(v!=='original'){
   const bands=p.locator('.v5-bands');await bands.locator('tbody tr').nth(1).getByRole('button',{name:/기준 넘음/}).click();await snap('band-result');
   if(v==='b')await p.getByRole('dialog',{name:'단계별 학생',exact:true}).getByRole('button',{name:'닫기',exact:true}).click(); else await p.getByRole('region',{name:'단계별 학생',exact:true}).getByRole('button',{name:'접기',exact:true}).click();
   for(const metric of ['absence','study','start','plan','vision']){
    if(v==='d')await p.getByRole('group',{name:'지표 고르기'}).getByRole('button',{name:{absence:'결석',study:'학습 시간',start:'입실 시각',plan:'계획 제출',vision:'비전 관찰'}[metric],exact:true}).click();
    if(v!=='d')await p.locator('.v5-bands th button').filter({hasText:{absence:'결석',study:'학습 시간',start:'입실 시각',plan:'계획 제출',vision:'휴대폰 사용 관찰'}[metric]}).click();
    const section=v==='b'?p.getByRole('dialog'):v==='d'?p.locator('.v5-card').last():p.locator('.v5-inline-detail');
    await section.scrollIntoViewIfNeeded();await snap('metric-'+metric,section);
    if(metric==='study'){
     const day=section.locator('svg g[role=button]').first();await day.focus();await snap('day-focus');await p.keyboard.press('ArrowDown');await snap('point-focus');
     await day.click();await snap('result');
     for(let i=0;i<3;i++)await p.getByRole('button',{name:'비교',exact:true}).first().click();await snap('compare');
     if(v==='b')await p.getByRole('dialog').getByRole('button',{name:'닫기',exact:true}).click();
    }
    if(v==='b'&&await p.getByRole('dialog').count())await p.getByRole('dialog').getByRole('button',{name:'닫기',exact:true}).click();
   }
  }
 }catch(e){errors.push({v,width,theme,error:e.message});console.log('ERROR',v,width,theme,e.message.slice(0,150))}
 await p.close();writeFileSync(dir+'screens.json',JSON.stringify({records,errors,blocked},null,2));console.log(v,width,theme,records.filter(x=>x.v===v&&x.width===width&&x.theme===theme).length);
}
await b.close();console.log(JSON.stringify({states:records.length,errors,blocked}));
