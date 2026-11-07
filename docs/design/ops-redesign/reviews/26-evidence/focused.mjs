import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
const require=createRequire(new URL('../../../../../e2e/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const dir=new URL('./',import.meta.url).pathname.replace(/^\/(\w:)/,'$1');
const browser=await chromium.launch({channel:'chrome',args:['--no-proxy-server']});
const records=[],errors=[],blocked=[];
const actual=JSON.parse(readFileSync(dir+'audit.json','utf8')).records;
for(const width of [1600,1280])for(const theme of ['light','dark']){
 const ctx=await browser.newContext({viewport:{width,height:900},colorScheme:theme});
 await ctx.route('**/*',r=>['GET','HEAD','OPTIONS'].includes(r.request().method())?r.continue():(blocked.push(r.request().url()),r.abort()));
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://localhost:5174/student-care/d');await p.waitForTimeout(900);
 await p.evaluate(async()=>{
  const R=await import('/node_modules/.vite/deps/react.js'),D=await import('/node_modules/.vite/deps/react-dom_client.js');
  window.fixture={h:(R.default??R).createElement,createRoot:(D.default??D).createRoot,c:await import('/src/features/student-care/variants/shared/charts.tsx'),v:await import('/src/features/student-care/variants/shared/visionExample.ts')};
 });
 for(const test of ['day-wide','day-A-card','day-C-card','week-equal','rails-day','rails-week','vision-samples','vision-weighted','vision-states']){
  await p.evaluate(({test,width})=>{
   const{h,createRoot,c,v}=window.fixture;window.fixtureRoot?.unmount();document.querySelector('#review-root')?.remove();document.querySelector('main').style.display='none';
   const host=document.createElement('div');host.id='review-root';host.className='v5-page';host.style.cssText='position:absolute;top:70px;left:240px;width:calc(100% - 270px);padding:20px;background:var(--color-surface);z-index:100';document.body.append(host);
   const days=Array.from({length:7},(_,i)=>({date:`2026-10-${21+i}`,dow:['수','목','금','토','일','월','화'][i],attendance:'present',submission:'submitted',minutes:100,usualMinutes:100,start:1000,usualStart:1000}));
   const rows=Array.from({length:150},(_,i)=>({student:{studentId:'fake'+i,studentName:`학생${i}`,className:'합성반'},status:i<20?'check':'normal',days:structuredClone(days)}));
   const detail=(r)=>`실제 100분, 평소 100분, ${r.student.studentName}`;let content;
   const day=(extra={})=>h(c.DaySwarm,{rows,value:()=>0,detail,domain:[-100,100],baseline:0,format:x=>x+'%',warn:()=>true,label:test,height:test==='day-C-card'?190:220,onStudent:r=>{window.selected=r.student.studentName},...extra});
   host.style.width=`${width+40}px`;
   if(test.startsWith('day-'))content=day();
   if(test==='week-equal')content=h(c.WeekStrip,{rows,value:()=>0,detail,domain:[-100,100],format:x=>x+'%',baseline:0,label:test});
   if(test==='rails-day')content=day({value:()=>250});
   if(test==='rails-week')content=h(c.WeekStrip,{rows,value:()=>250,detail,domain:[-100,100],format:x=>x+'%',baseline:0,label:test});
   if(test.startsWith('vision-')){
    const n=test==='vision-states'?1:test==='vision-weighted'?2:150;rows.splice(n);
    rows.forEach((r,j)=>{r.vision=days.map((d,i)=>{const x=v.visionDay(r.student.studentId,d.date,100,1000);x.unsupportedAxes=[];x.failedPhotos=0;x.analyzedPhotos=test==='vision-weighted'?(j===0?2:100):j===0?1:20;x.photosReceived=x.analyzedPhotos;for(const a of v.VISION_AXES){const yes=test==='vision-weighted'?(j===0?1:10):j===0?1:10;x.axes[a]={yes,no:x.analyzedPhotos-yes,unknown:0};}return x;});});
    if(test==='vision-states')rows[0].vision.forEach((x,i)=>{if(i===0){x.photosReceived=0;x.analyzedPhotos=0;for(const a of v.VISION_AXES)x.axes[a]={yes:0,no:0,unknown:0};}if(i===1){x.analyzedPhotos=0;x.photosReceived=3;x.failedPhotos=3;}if(i===2)x.unsupportedAxes=['reading_or_writing'];if(i===3){x.analyzedPhotos=10;x.photosReceived=10;for(const a of v.VISION_AXES)x.axes[a]={yes:0,no:0,unknown:10};}if(i===4){x.analyzedPhotos=10;x.photosReceived=10;for(const a of v.VISION_AXES)x.axes[a]={yes:0,no:10,unknown:0};}});
    const pools=days.map((_,i)=>v.branchVisionDay(rows.map(r=>({studentId:r.student.studentId,day:r.vision[i]}))));
    content=test==='vision-states'?h(c.VisionMini,{s:rows[0]}):h(c.VisionSwarms,{rows,pools});
    window.expectedPools=pools;
   }
   window.fixtureRoot=createRoot(host);window.fixtureRoot.render(h('section',null,h('h2',null,'독립 합성 반례: '+test),content));
  },{test,width:actual.find(r=>r.state==='study-audit'&&r.width===width&&r.theme===theme&&r.variant===(test==='day-A-card'?'a':test==='day-C-card'||test.includes('week')?'c':'b')).plots[test==='day-C-card'?1:0].width});await p.waitForTimeout(250);
  const data=await p.locator('#review-root').evaluate(root=>({text:root.innerText,pools:window.expectedPools,charts:[...root.querySelectorAll('svg')].map(svg=>{
   const pts=[...svg.querySelectorAll('circle')];let overlapPairs=0;for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){const a=pts[i],b=pts[j];if(Math.hypot(+a.getAttribute('cx')- +b.getAttribute('cx'),+a.getAttribute('cy')- +b.getAttribute('cy'))<+a.getAttribute('r')+ +b.getAttribute('r')-0.01)overlapPairs++;}
   return{label:svg.getAttribute('aria-label'),width:svg.width.baseVal.value,height:svg.height.baseVal.value,points:pts.length,uniqueCenters:new Set(pts.map(e=>e.getAttribute('cx')+','+e.getAttribute('cy'))).size,overlapPairs,radii:[...new Set(pts.map(e=>e.getAttribute('r')))],hollow:pts.filter(e=>e.classList.contains('v5-dot-small')).length,paths:svg.querySelectorAll('path').length,uniquePaths:new Set([...svg.querySelectorAll('path')].map(e=>e.getAttribute('d'))).size,minY:Math.min(...pts.map(e=>+e.getAttribute('cy'))),maxY:Math.max(...pts.map(e=>+e.getAttribute('cy'))),outside:pts.filter(e=>+e.getAttribute('cy')<0||+e.getAttribute('cy')>svg.height.baseVal.value).length,text:svg.textContent};}),cells:[...root.querySelectorAll('[data-cell]')].map(e=>({label:e.getAttribute('aria-label'),tip:e.dataset.tip,cell:e.dataset.cell,height:e.querySelector('.v5-vision-yes')?.getBoundingClientRect().height,unknownBackground:e.querySelector('.v5-vision-unk')&&getComputedStyle(e.querySelector('.v5-vision-unk')).background,yesBackground:e.querySelector('.v5-vision-yes')&&getComputedStyle(e.querySelector('.v5-vision-yes')).background}))}));
  await p.screenshot({path:dir+`focused-${test}-${width}-${theme}.png`});
  if(test==='vision-samples')await p.locator('#review-root').screenshot({path:dir+`focused-${test}-${width}-${theme}-all.png`});
  if(test.startsWith('day-')){const g=p.locator('#review-root svg g[role=button]').first();await g.focus();await p.keyboard.press('ArrowDown');data.keyboard=await p.locator('#review-root [role=status]').allTextContents();await p.keyboard.press('Enter');data.opened=await p.evaluate(()=>window.selected);}
  records.push({test,width,theme,...data});
 }
 await ctx.close();
}
writeFileSync(dir+'focused.json',JSON.stringify({records,errors,blocked},null,2));await browser.close();console.log(JSON.stringify({states:records.length,errors,blocked,charts:records.filter(r=>r.theme==='light').map(({test,width,charts})=>({test,width,charts}))},null,2));
