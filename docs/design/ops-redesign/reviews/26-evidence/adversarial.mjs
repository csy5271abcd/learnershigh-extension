import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const require=createRequire(new URL('../../../../../e2e/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const dir=new URL('./',import.meta.url).pathname.replace(/^\/(\w:)/,'$1');
const b=await chromium.launch({channel:'chrome',args:['--no-proxy-server']});
const out=[];
for(const width of [1600,1280]) for(const theme of ['light','dark']){
 const ctx=await b.newContext({viewport:{width,height:900},colorScheme:theme});const p=await ctx.newPage();
 await ctx.route('**/*',r=>['GET','HEAD','OPTIONS'].includes(r.request().method())?r.continue():r.abort());
 await p.goto('http://localhost:5174/student-care/d'); await p.waitForTimeout(700);
 await p.evaluate(async()=>{
  const React=await import('/node_modules/.vite/deps/react.js');const dom=await import('/node_modules/.vite/deps/react-dom_client.js');const createRoot=(dom.default ?? dom).createRoot;
  const charts=await import('/src/features/student-care/variants/shared/charts.tsx');
  const v=await import('/src/features/student-care/variants/shared/visionExample.ts');
  window.fixture={React:React.default ?? React,createRoot,charts,v};
 });
 for(const test of ['equal150','extremes','vision1','absence7']){
 await p.evaluate(({test})=>{
  const {React:{createElement:h},createRoot,charts:c,v}=window.fixture;
  window.fixtureRoot?.unmount();document.querySelector('#review-root')?.remove();
  document.querySelector('main').style.display='none';
  const host=document.createElement('div');host.id='review-root';host.className='v5-page';host.style.cssText='position:absolute;top:70px;left:240px;width:calc(100% - 270px);padding:20px;background:var(--color-surface);z-index:100';document.body.append(host);
  const days=Array.from({length:7},(_,i)=>({date:`2026-10-${21+i}`,dow:['수','목','금','토','일','월','화'][i],attendance:'present',submission:'submitted',minutes:0,usualMinutes:100,start:1000,usualStart:1000}));
  const rows=Array.from({length:150},(_,i)=>({student:{studentId:'fake'+i,studentName:`학생${i}`,className:'합성반'},status:i<10?'check':'normal',days:structuredClone(days)}));
  let content;
  if(test==='equal150') content=h(c.DaySwarm,{rows,value:r=>r.days[0].minutes,domain:[-100,100],baseline:0,format:x=>x+'%',warn:()=>false,label:'150명 모두 같은 값'});
  if(test==='extremes'){
   rows[0].days.forEach(d=>{d.minutes=250;d.start=1300});rows[1].days.forEach(d=>{d.minutes=-99;d.start=1000});
   content=h('div',null,h(c.DaySwarm,{rows,value:(r,i)=>r.days[i].minutes,domain:[-100,100],baseline:0,format:x=>x+'%',warn:x=>x< -30,label:'학습 +250%'}),h(c.DaySwarm,{rows,value:(r,i)=>r.days[i].start-1000,domain:[-120,120],baseline:0,format:x=>x+'분',warn:x=>x>30,label:'입실 +300분'}),h(c.WeekStrip,{rows,value:r=>r.days[0].minutes,domain:[-100,100],format:x=>x+'%',warn:x=>x< -30,label:'C 주간 극단',baseline:0}));
  }
  if(test==='vision1'){
   rows.forEach((r,i)=>{r.vision=days.map(d=>{const day=v.visionDay(r.student.studentId,d.date,100,1000);day.analyzedPhotos=i===0?1:20;day.photosReceived=day.analyzedPhotos;for(const a of v.VISION_AXES)day.axes[a]={yes:i===0?1:10,no:i===0?0:10,unknown:0};return day;});});
   content=h(c.VisionSwarms,{rows,pools:days.map((_,i)=>v.branchVisionDay(rows.map(r=>({studentId:r.student.studentId,day:r.vision[i]}))))});
  }
  if(test==='absence7'){rows[0].days.forEach(d=>{d.attendance='absent';d.submission='missing'});content=h(c.AttendanceMatrix,{rows});}
  window.fixtureRoot=createRoot(host);window.fixtureRoot.render(h('section',null,h('h2',null,'독립 합성 반례: '+test),content));
 },{test});await p.waitForTimeout(300);
 const measurement=await p.locator('#review-root').evaluate(root=>[...root.querySelectorAll('svg')].map(svg=>{const pts=[...svg.querySelectorAll('circle')];const keys=pts.map(e=>e.getAttribute('cx')+','+e.getAttribute('cy'));const unique=new Set(keys);let overlaps=0;for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){const a=pts[i],b=pts[j];if(Math.hypot(+a.getAttribute('cx')- +b.getAttribute('cx'),+a.getAttribute('cy')- +b.getAttribute('cy'))<+a.getAttribute('r')+ +b.getAttribute('r'))overlaps++;}return {label:svg.getAttribute('aria-label'),points:pts.length,uniqueCenters:unique.size,overlapPairs:overlaps,triangles:svg.querySelectorAll('path').length,hollowPoints:pts.filter(e=>getComputedStyle(e).fill==='none').length,focusable:svg.querySelectorAll('[tabindex="0"]').length};}));
 await p.screenshot({path:dir+`synthetic-${test}-${width}-${theme}.png`});out.push({test,width,theme,measurement});
 }
 await ctx.close();
}
writeFileSync(dir+'adversarial.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out.filter(x=>x.theme==='light'),null,2));await b.close();



