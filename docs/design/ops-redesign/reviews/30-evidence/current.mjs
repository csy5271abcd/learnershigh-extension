import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const require=createRequire(new URL('../../../../../e2e/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const dir=new URL('./',import.meta.url).pathname.replace(/^\/(\w:)/,'$1');
const b=await chromium.launch({channel:'chrome',args:['--no-proxy-server']});
const records=[],errors=[],blocked=[];
for(const width of [1600,1280])for(const theme of ['light','dark']){
 const p=await b.newPage({viewport:{width,height:900},colorScheme:theme});
 p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>['GET','HEAD','OPTIONS'].includes(r.request().method())?r.continue():(blocked.push(r.request().url()),r.abort()));
 await p.goto('http://localhost:5174/student-care/d');await p.waitForTimeout(800);
 await p.evaluate(async()=>{const R=await import('/node_modules/.vite/deps/react.js'),D=await import('/node_modules/.vite/deps/react-dom_client.js');window.f={h:(R.default??R).createElement,createRoot:(D.default??D).createRoot,c:await import('/src/features/student-care/variants/shared/charts.tsx'),bd:await import('/src/features/student-care/variants/shared/bands.ts'),sr:await import('/src/features/student-care/variants/shared/StudentRows.tsx'),mp:await import('/src/features/student-care/variants/shared/MetricPanel.tsx'),v:await import('/src/features/student-care/variants/shared/visionExample.ts')};});
 for(const test of ['equal','extreme-study','extreme-start','one-tail','vision-samples','vision-weighted','vision-states','vision-failed','vision-unsupported','partial','zero-study','early-extreme','plan-unknown','progress-unknown']){
  await p.evaluate(({test,width})=>{
   const {h,createRoot,c,bd,sr,mp,v}=window.f;window.fr?.unmount();document.querySelector('#review-root')?.remove();document.querySelector('main').style.display='none';
   const host=document.createElement('section');host.id='review-root';host.className='v5-page v5-card';host.style.cssText=`position:absolute;top:70px;left:240px;width:${width-280}px;padding:20px;background:var(--color-surface);z-index:100`;document.body.append(host);
   const days=Array.from({length:35},(_,i)=>({date:new Date(Date.UTC(2026,8,23+i)).toISOString().slice(0,10),dow:['수','목','금','토','일','월','화'][i%7],attendance:'present',submission:'submitted',minutes:100,usualMinutes:100,start:1000,usualStart:1000,planned:100,actual:100}));
   const base={student:{studentId:'s',studentName:'합성학생',className:'합성반'},status:'normal',days:structuredClone(days.slice(-7)),history35:structuredClone(days),week:{minutes:700,usualWeek:700,recorded:7,scheduled:7,submitKnown:7,comparablePlanDays:7,executionRate:100},subjects:[],weekdayAbsence:null,vision:days.slice(-7).map(d=>v.visionDay('s',d.date,100,1000))};
   const rows=Array.from({length:150},(_,i)=>({...structuredClone(base),student:{...base.student,studentId:'s'+i,studentName:'학생'+i}}));
   const t={absenceDays:3,planMissingDays:3,studyDropPercent:30,startShiftMinutes:60,minValidDays:3};let content;window.extra={};
   if(['equal','extreme-study','extreme-start','one-tail'].includes(test)){
    const val=(r)=>test==='extreme-study'?250:test==='extreme-start'?300:test==='one-tail'&&r.student.studentId==='s149'?250:0;
    content=h(c.DayRange,{rows,value:val,domain:test==='extreme-start'?[-120,120]:[-100,100],baseline:0,format:x=>x+'%',warn:x=>x<=-30,height:220,label:test,onDay:i=>window.clicked=i});
   }else if(test.startsWith('vision-')){
    rows.forEach((r,j)=>r.vision.forEach(x=>{x.unsupportedAxes=[];x.failedPhotos=0;x.analyzedPhotos=j===0?1:20;x.photosReceived=x.analyzedPhotos;for(const a of v.VISION_AXES)x.axes[a]={yes:j===0?1:10,no:j===0?0:10,unknown:0};if(test==='vision-failed'){x.analyzedPhotos=0;x.photosReceived=3;x.failedPhotos=3;for(const a of v.VISION_AXES)x.axes[a]={yes:0,no:0,unknown:0};}}));
    if(test==='vision-weighted'){rows.splice(2);rows.forEach((r,j)=>r.vision.forEach(x=>{x.analyzedPhotos=j===0?2:100;x.photosReceived=x.analyzedPhotos;for(const a of v.VISION_AXES)x.axes[a]={yes:j===0?1:10,no:j===0?1:90,unknown:0};}));}
    if(test==='vision-unsupported')rows.forEach(r=>r.vision.forEach(x=>x.unsupportedAxes=[...v.VISION_AXES]));
    if(test==='vision-states'){const r=rows[0];r.vision.forEach((x,i)=>{if(i===0){x.photosReceived=0;x.analyzedPhotos=0;for(const a of v.VISION_AXES)x.axes[a]={yes:0,no:0,unknown:0};}if(i===1){x.analyzedPhotos=0;x.photosReceived=3;x.failedPhotos=3;}if(i===2)x.unsupportedAxes=['reading_or_writing'];if(i===3){x.analyzedPhotos=10;x.photosReceived=10;for(const a of v.VISION_AXES)x.axes[a]={yes:0,no:0,unknown:10};}if(i===4){x.analyzedPhotos=10;x.photosReceived=10;for(const a of v.VISION_AXES)x.axes[a]={yes:0,no:10,unknown:0};}});content=h(c.VisionMini,{s:r});}
    else {const pools=base.days.map((_,i)=>v.branchVisionDay(rows.map(r=>({studentId:r.student.studentId,day:r.vision[i]}))));content=h(c.VisionSwarms,{rows,pools,onDay:()=>{}});}
   }else if(test==='plan-unknown'){content=h(mp.MetricPanel,{metric:'plan',m:{days:base.days.map(d=>({...d,submitKnown:0,submitted:0})),included:rows},studyDropPercent:30,startShiftMinutes:60,onDay:()=>{}});}
   else if(test==='progress-unknown'){base.days.forEach(d=>{d.planned=null;d.actual=null;});content=h(c.Progress7,{days:base.days});}
   else{
    if(test==='partial'){base.history35.slice(29).forEach(d=>Object.assign(d,{minutes:null,start:null,attendance:'unknown',submission:'unknown'}));base.days=structuredClone(base.history35.slice(-7));Object.assign(base.week,{minutes:100,recorded:1,scheduled:1,submitKnown:1});window.extra.groups=Object.fromEntries(['absence','plan','study','start'].map(m=>[m,Object.fromEntries(Object.entries(bd.bandGroups(m,[base],t)).map(([k,v])=>[k,v.length]))]));}
    if(test==='zero-study'){base.days.forEach(d=>d.minutes=0);base.week.minutes=0;}
    if(test==='early-extreme'){base.days.forEach(d=>d.start=700);}
    content=h(sr.StudentRows,{s:base,t,executionRate:70});
   }
   window.fr=createRoot(host);window.fr.render(h('div',null,h('h2',null,'현행 합성 반례: '+test),content));
  },{test,width});await p.waitForTimeout(200);
  const root=p.locator('#review-root');const day=root.locator('svg g[role=button]').first();if(await day.count())await day.focus();
  const data=await root.evaluate(el=>({text:el.innerText,extra:window.extra,svg:[...el.querySelectorAll('svg')].map(s=>({label:s.getAttribute('aria-label'),circles:[...s.querySelectorAll('circle')].map(e=>({cx:e.getAttribute('cx'),cy:e.getAttribute('cy'),r:e.getAttribute('r')})),text:s.textContent})),labels:[...el.querySelectorAll('[aria-label]')].map(e=>e.getAttribute('aria-label')),tips:[...el.querySelectorAll('[data-tip]')].map(e=>e.dataset.tip),positions:[...el.querySelectorAll('.v5-cbar,.v5-progress-col')].map(e=>({text:e.textContent,label:e.getAttribute('aria-label'),rect:e.getBoundingClientRect().toJSON(),bad:e.querySelector('.v5-cbar-bad')!==null,partial:e.querySelector('.v5-cbar-partial')!==null})),trendpoints:[...el.querySelectorAll('.v5-trend g')].map(e=>({label:e.getAttribute('aria-label'),class:e.querySelector('circle')?.getAttribute('class')}))}));
  await root.screenshot({path:dir+`current-${test}-${width}-${theme}.png`});records.push({test,width,theme,...data});
 }
 await p.close();
}
await b.close();writeFileSync(dir+'current.json',JSON.stringify({records,errors,blocked},null,2));console.log(JSON.stringify({states:records.length,errors,blocked}));
