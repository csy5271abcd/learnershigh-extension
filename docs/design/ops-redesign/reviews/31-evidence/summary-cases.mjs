import{createRequire}from'node:module';import{writeFileSync}from'node:fs';
const require=createRequire(new URL('../../../../../e2e/package.json',import.meta.url));const{chromium}=require('@playwright/test');const dir=new URL('./',import.meta.url).pathname.replace(/^\/(\w:)/,'$1');
const b=await chromium.launch({channel:'chrome',args:['--no-proxy-server']});const records=[],errors=[],blocked=[];
for(const width of [1600,1280])for(const theme of ['light','dark']){
 const p=await b.newPage({viewport:{width,height:900},colorScheme:theme});p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>['GET','HEAD','OPTIONS'].includes(r.request().method())?r.continue():(blocked.push(r.request().url()),r.abort()));await p.goto('http://localhost:5174/student-care/d');await p.waitForTimeout(700);
 await p.evaluate(async()=>{const R=await import('/node_modules/.vite/deps/react.js'),D=await import('/node_modules/.vite/deps/react-dom_client.js');window.f={h:(R.default??R).createElement,createRoot:(D.default??D).createRoot,br:await import('/src/features/student-care/variants/shared/BranchRows.tsx'),sr:await import('/src/features/student-care/variants/shared/StudentRows.tsx'),bd:await import('/src/features/student-care/variants/shared/bands.ts'),c:await import('/src/features/student-care/variants/shared/charts.tsx'),v:await import('/src/features/student-care/variants/shared/visionExample.ts'),mp:await import('/src/features/student-care/variants/shared/MetricPanel.tsx')};});
 for(const test of ['bands-none','bands-one','trend-gap','student-early','student-missing','student-extreme','calendar-subject','plan-zero','plan-none','student-partial','student-noactual','student-gap','student-early-extreme','progress-null']){
  await p.evaluate(({test,width})=>{
   const{h,createRoot,br,sr,bd,c,v,mp}=window.f;window.fr?.unmount();document.querySelector('#review-root')?.remove();document.querySelector('main').style.display='none';const host=document.createElement('section');host.id='review-root';host.className='v5-page v5-card';host.style.cssText=`position:absolute;top:70px;left:240px;width:${width-280}px;padding:20px;background:var(--color-surface);z-index:100`;document.body.append(host);
   const days=Array.from({length:35},(_,i)=>({date:new Date(Date.UTC(2026,8,23+i)).toISOString().slice(0,10),dow:['수','목','금','토','일','월','화'][i%7],attendance:'present',submission:'submitted',minutes:100,usualMinutes:100,start:1000,usualStart:1000,planned:100,actual:100}));
   const row={student:{studentId:'s',studentName:'합성학생',className:'합성반'},days:structuredClone(days.slice(-7)),history35:structuredClone(days),week:{minutes:700,usualWeek:700,scheduled:7,submitKnown:7,comparablePlanDays:7,executionRate:100},subjects:[],weekdayAbsence:null,status:'check',vision:days.slice(-7).map(d=>v.visionDay('s',d.date,100,1000))};
   const t={absenceDays:3,planMissingDays:3,studyDropPercent:30,startShiftMinutes:60};let content;window.caseResult={};
   if(test.startsWith('bands')||test==='trend-gap'){
    const rows=Array.from({length:150},(_,i)=>({...structuredClone(row),student:{...row.student,studentId:'s'+i,studentName:'학생'+i}}));
    if(test==='bands-none')rows.forEach(r=>{r.days.forEach(d=>Object.assign(d,{attendance:'unknown',submission:'unknown',minutes:null,usualMinutes:null,start:null,usualStart:null}));r.week.minutes=null;r.week.usualWeek=null;r.vision=r.days.map(d=>v.visionDay(r.student.studentId,d.date,null,null));});
    if(test==='bands-one')rows[0].week.minutes=0;
    if(test==='trend-gap')rows.forEach(r=>{r.vision.forEach((d,i)=>{if(i===3){d.analyzedPhotos=0;d.photosReceived=0;for(const a of v.VISION_AXES)d.axes[a]={yes:0,no:0,unknown:0};}})});
    window.caseResult.values=Object.fromEntries(['absence','study','start','plan','vision'].map(m=>[m,{groups:Object.fromEntries(Object.entries(bd.bandGroups(m,rows,t)).map(([k,v])=>[k,v.length])),trend:bd.dailyOver(m,rows,t)}]));
    content=h(br.BranchRows,{rows,t,onBand:(metric,band)=>window.caseResult.clicked={metric,band},onMetric:()=>{}});
   }else if(test==='plan-zero'||test==='plan-none'){
    const included=Array.from({length:150},(_,i)=>{const r=structuredClone(row);r.student.studentId='plan'+i;if(test==='plan-none')r.days.forEach(d=>d.submission='unknown');return r});
    content=h(mp.MetricPanel,{metric:'plan',m:{days:row.days.map(d=>({...d,submitKnown:test==='plan-none'?0:150,submitted:test==='plan-none'?0:150})),included},studyDropPercent:30,startShiftMinutes:60});
   }
   else if(test==='progress-null'){row.days.forEach(d=>{d.planned=null;d.actual=null;d.submission='unknown'});content=h(c.Progress7,{days:row.days});}
   else if(test==='calendar-subject'){
    row.days[0].submission='missing';row.history35[28].submission='missing';row.history35[29].attendance='absent';row.history35[30].attendance='off';row.history35[31].attendance='unknown';row.subjects=[{name:'기록 없음 과목',plannedShare:null,actualShare:null,plannedMinutes:null,actualMinutes:null},{name:'실제만 있는 과목',plannedShare:null,actualShare:100,plannedMinutes:null,actualMinutes:700}];content=h('div',null,h(c.Month35,{s:row}),h(c.SubjectDumbbell,{s:row}));
   }else{
    if(test==='student-early'){row.days.forEach(d=>d.start=940);row.history35.forEach(d=>d.start=940);}
    if(test==='student-missing'){row.days.forEach(d=>Object.assign(d,{attendance:'unknown',submission:'unknown',minutes:null,start:null,actual:null}));row.history35.forEach(d=>Object.assign(d,{attendance:'unknown',submission:'unknown',minutes:null,start:null,actual:null}));row.week={minutes:null,usualWeek:700,scheduled:0,submitKnown:0,comparablePlanDays:0,executionRate:null};}
    if(test==='student-noactual'){row.days.forEach(d=>d.actual=null);row.history35.slice(-7).forEach(d=>d.actual=null);row.week.executionRate=null;row.week.comparablePlanDays=0;}
    if(test==='student-gap'){row.history35.slice(14,21).forEach(d=>Object.assign(d,{minutes:null,start:null,attendance:'unknown',submission:'unknown'}));}
    if(test==='student-partial'){row.history35.slice(29).forEach(d=>Object.assign(d,{minutes:null,start:null,attendance:'unknown',submission:'unknown'}));row.days=structuredClone(row.history35.slice(-7));row.week.minutes=100;row.week.scheduled=1;row.week.submitKnown=1;row.week.recorded=1;row.week.comparablePlanDays=1;}
    if(test==='student-early-extreme'){row.days.forEach(d=>d.start=700);row.history35.forEach(d=>d.start=700);}
    if(test==='student-extreme'){row.week.minutes=2450;row.week.executionRate=300;row.days.forEach(d=>Object.assign(d,{start:1300,minutes:350,actual:300}));row.history35.slice(-7).forEach(d=>Object.assign(d,{start:1300,minutes:350,actual:300}));}
    content=h(sr.StudentRows,{s:row,t,executionRate:70});
   }
   window.fr=createRoot(host);window.fr.render(h('div',null,h('h2',null,'합성 반례: '+test),content));
  },{test,width});await p.waitForTimeout(150);
  const data=await p.locator('#review-root').evaluate(el=>({text:el.innerText,result:window.caseResult,rects:[...el.querySelectorAll('.v5-cbar')].map(e=>({label:e.getAttribute('aria-label'),tab:e.tabIndex,tip:e.dataset.tip,value:e.querySelector('.v5-cbar-value')?.style.width,limit:e.querySelector('.v5-cbar-limit')?.style.left})),trends:[...el.querySelectorAll('.v5-trend')].map(e=>({label:e.getAttribute('aria-label'),points:[...e.querySelectorAll('polyline')].map(p=>p.getAttribute('points'))})),cells:[...el.querySelectorAll('[data-cell]')].map(e=>({label:e.getAttribute('aria-label'),css:e.className})),plots:[...el.querySelectorAll('svg')].map(e=>({label:e.getAttribute('aria-label'),bars:[...e.querySelectorAll('rect.v5-bar-missing')].map(r=>r.getAttribute('height'))}))}));
  await p.screenshot({path:dir+`${test}-${width}-${theme}.png`});records.push({test,width,theme,...data});
 }await p.close();
}
writeFileSync(dir+'summary-cases.json',JSON.stringify({records,errors,blocked},null,2));await b.close();console.log(JSON.stringify({states:records.length,errors,blocked}));


