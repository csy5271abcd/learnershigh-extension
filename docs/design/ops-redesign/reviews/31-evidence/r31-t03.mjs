// 31차 독립 검토(Claude): T03 평균 입실 시각 반올림. (1) 실제 StudentRows 컴포넌트 여러 경계값 (2) 실제 화면에서 소수 평소 시각. 읽기 전용.
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const require=createRequire(new URL('../../../../../e2e/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const dir=new URL('./',import.meta.url).pathname.replace(/^\/(\w:)/,'$1');
const b=await chromium.launch({channel:'chrome',args:['--no-proxy-server']});
const records=[],errors=[],blocked=[];
const guard=r=>['GET','HEAD','OPTIONS'].includes(r.request().method())?r.continue():(blocked.push(r.request().url()),r.abort());
// 주마다 7일 값. 평균과 기대 표기
const CASES=[
  {name:'16:59.571', week:[1019,1019,1019,1019,1019,1019,1023], expected:'17:00'},
  {name:'15:59.5', week:[959,960,959,960,959,960,959.5], expected:'16:00'},
  {name:'17:59.43', week:[1079,1079,1079,1079,1080,1079,1081].map(x=>x-0.43+0.43), expected:null},
  {name:'09:00.49', week:[540,540,541,540,540,540,540.43], expected:'09:00'},
];
for(const width of [1600,1280])for(const theme of ['light','dark'])for(const c of CASES){
  const p=await b.newPage({viewport:{width,height:900},colorScheme:theme});p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',guard);
  await p.goto('http://localhost:5174/student-care/d');await p.waitForTimeout(500);
  try{
    const calc=await p.evaluate(async(week)=>{
      const R=await import('/node_modules/.vite/deps/react.js'),D=await import('/node_modules/.vite/deps/react-dom_client.js'),{StudentRows}=await import('/src/features/student-care/variants/shared/StudentRows.tsx'),{TipLayer}=await import('/src/features/student-care/variants/shared/charts.tsx'),{visionDay}=await import('/src/features/student-care/variants/shared/visionExample.ts');const h=(R.default??R).createElement;
      const days=Array.from({length:35},(_,i)=>({date:new Date(Date.UTC(2026,8,23+i)).toISOString().slice(0,10),dow:'화',attendance:'present',submission:'submitted',minutes:100,usualMinutes:100,start:week[i%7],usualStart:1000,planned:100,actual:100}));
      const row={student:{studentId:'s',studentName:'시각 반올림',className:'합성반'},status:'normal',days:days.slice(-7),history35:days,week:{minutes:700,usualWeek:700,recorded:7,scheduled:7,submitKnown:7,executionRate:100},subjects:[],vision:days.slice(-7).map(d=>visionDay('s',d.date,100,Math.round(d.start)))};
      document.querySelector('main').style.display='none';const host=document.createElement('section');host.id='rounding';host.className='v5-page v5-card';host.style.cssText='position:absolute;top:70px;left:240px;right:40px;background:var(--color-surface);padding:20px';document.body.append(host);(D.default??D).createRoot(host).render(h(TipLayer,null,h(StudentRows,{s:row,t:{absenceDays:3,planMissingDays:3,studyDropPercent:30,startShiftMinutes:60,minValidDays:3},executionRate:70})));
      return{mean:week.reduce((a,x)=>a+x,0)/7};
    },c.week);
    await p.waitForTimeout(150);
    const pts=p.locator('#rounding g[aria-label^="주별 평균 입실 시각"]');
    const labels=await pts.evaluateAll(es=>es.map(e=>e.getAttribute('aria-label')));
    const last=pts.last();await last.hover();await p.waitForTimeout(60);const hoverTip=await p.locator('#rounding [role=status]').innerText().catch(()=>null);
    await last.focus();await p.waitForTimeout(60);const focusTip=await p.locator('#rounding [role=status]').innerText().catch(()=>null);
    const m=Math.round(calc.mean),exp=c.expected??`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
    records.push({kind:'component',width,theme,case:c.name,mean:calc.mean,expected:exp,labels,hoverTip,focusTip,ok:[labels.at(-1),hoverTip,focusTip].every(t=>t&&t.includes(exp))});
    if(width===1280&&theme==='light')await p.screenshot({path:dir+`r31-t03-${c.name.replace(':','')}-${width}-${theme}.png`});
  }catch(e){errors.push({case:c.name,width,theme,error:e.message.split('\n')[0]});}
  await p.close();
}
// (2) 실제 화면: 평소 입실(weekdayBaseline) 1019.6분 → 결과 표 '평소' 17:00 기대(옛 식이면 16:00)
for(const v of ['a','b','c','d'])for(const [width,theme] of [[1280,'light'],[1600,'dark']]){
  const p=await b.newPage({viewport:{width,height:900},colorScheme:theme});p.setDefaultTimeout(7000);p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',async r=>{
    if(!['GET','HEAD','OPTIONS'].includes(r.request().method())){blocked.push(r.request().url());return r.abort();}
    if(!r.request().url().includes('/api/admin/student-care/metrics?'))return r.continue();
    const res=await r.fetch(),body=await res.json();
    body.students.forEach(s=>{s.review.days.forEach(d=>Object.assign(d,{startMinutes:1019,attendance:'PRESENT',scheduled:true}));s.review.weekdayBaseline.forEach(d=>Object.assign(d,{startMinutes:1019.6,startSamples:4}));});
    return r.fulfill({response:res,json:body});
  });
  try{
    await p.goto('http://localhost:5174/student-care/'+v);await p.getByRole('tab').first().waitFor();await p.waitForTimeout(400);
    if(v!=='d')await p.getByRole('tab',{name:v==='c'?'학습관 현황':'학습관별',exact:true}).click();
    if(v==='d')await p.getByRole('group',{name:'지표 고르기'}).getByRole('button',{name:'입실 시각',exact:true}).click();
    else await p.locator('.v5-bands th button').filter({hasText:'입실 시각'}).click();
    const root=v==='b'?p.getByRole('dialog'):v==='d'?p.locator('.v5-card').last():p.locator('.v5-inline-detail');
    await root.locator('svg g[role=button]').first().click();await p.waitForTimeout(150);
    const res=v==='b'?p.getByRole('dialog').last():root.locator('.v5-result').last();
    const rows=await res.locator('tbody tr').allTextContents();
    records.push({kind:'real',v,width,theme,firstRows:rows.slice(0,2),all17:rows.length>0&&rows.every(t=>t.includes('16:59')&&t.includes('17:00')),rows:rows.length});
    await p.screenshot({path:dir+`r31-t03-real-${v}-${width}-${theme}.png`});
  }catch(e){errors.push({v,width,theme,error:e.message.split('\n')[0]});}
  await p.close();
}
await b.close();
writeFileSync(dir+'r31-t03.json',JSON.stringify({records,errors,blocked},null,2));
console.log(JSON.stringify({states:records.length,errors,blocked:blocked.length}));
