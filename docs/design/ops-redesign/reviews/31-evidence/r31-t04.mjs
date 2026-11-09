// 31차 독립 검토(Claude): T04 비교선(A·C). 같은 값 3명·근접·결측·극단에서 이름 충돌, 선 분리, 각 선 식별/선택. 읽기 전용.
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const require=createRequire(new URL('../../../../../e2e/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const dir=new URL('./',import.meta.url).pathname.replace(/^\/(\w:)/,'$1');
const b=await chromium.launch({channel:'chrome',args:['--no-proxy-server']});
const records=[],errors=[],blocked=[];
// 학생 0..2 의 7일 학습 분(평소 100). null = 기록 없음
const CASES={
  equal3:[[100,100,100,100,100,100,100],[100,100,100,100,100,100,100],[100,100,100,100,100,100,100]],
  near3:[[60,62,61,60,62,61,60],[61,61,62,61,61,62,61],[62,60,60,62,60,60,62]],
  gaps:[[50,50,50,null,50,50,null],[60,null,60,60,60,null,60],[70,70,70,70,70,70,70]],
  extreme:[[0,0,350,350,0,350,0],[350,350,0,0,350,0,350],[0,10,20,30,40,50,60]],
};
for(const [width,theme] of [[1600,'light'],[1280,'light'],[1280,'dark'],[1600,'dark']])for(const v of ['a','c'])for(const [test,vals] of Object.entries(CASES)){
  const p=await b.newPage({viewport:{width,height:900},colorScheme:theme});p.setDefaultTimeout(7000);
  p.on('pageerror',e=>errors.push({v,test,error:e.message}));
  let names=[];
  await p.route('**/*',async r=>{
    if(!['GET','HEAD','OPTIONS'].includes(r.request().method())){blocked.push(r.request().url());return r.abort();}
    if(!r.request().url().includes('/api/admin/student-care/metrics?'))return r.continue();
    const res=await r.fetch(),body=await res.json();
    body.students.forEach((s,i)=>{const rev=s.review;
      rev.days.forEach((d,k)=>Object.assign(d,{minutes:i<3?vals[i][k]:100,attendance:'PRESENT',scheduled:true}));
      rev.weekdayBaseline.forEach(d=>Object.assign(d,{minutes:100,samples:4}));
    });
    names=body.students.slice(0,3).map(s=>s.studentName??s.student?.studentName??s.name);
    return r.fulfill({response:res,json:body});
  });
  const rec={v,width,theme,test};
  try{
    await p.goto('http://localhost:5174/student-care/'+v);await p.getByRole('tab').first().waitFor();await p.waitForTimeout(400);
    await p.getByRole('tab',{name:v==='c'?'학습관 현황':'학습관별',exact:true}).click();
    await p.locator('.v5-bands th button').filter({hasText:'학습 시간'}).click();
    const root=p.locator('.v5-inline-detail');
    await root.locator('svg g[role=button]').first().click();await p.waitForTimeout(150);
    const result=root.locator('.v5-result').last();
    rec.names=names;
    for(const n of names){const tr=result.locator('tbody tr').filter({has:p.getByRole('button',{name:n,exact:true})}).first();await tr.getByRole('button',{name:'비교',exact:true}).click();await p.waitForTimeout(80);}
    const svg=root.locator('svg[aria-label^="학습 시간"]').first();
    rec.legend=await root.locator('.v5-key-line').allInnerTexts();
    rec.lines=await svg.evaluate(s=>[...s.querySelectorAll('.v5-line')].map(g=>({label:g.getAttribute('aria-label'),polylines:[...g.querySelectorAll('polyline')].map(pl=>pl.getAttribute('points')),circles:[...g.querySelectorAll('circle')].map(c=>({tip:c.getAttribute('data-tip'),tab:c.getAttribute('tabindex'),cy:+c.getAttribute('cy')})),texts:[...g.querySelectorAll('text')].length})));
    rec.svgNameTexts=await svg.evaluate((s,ns)=>[...s.querySelectorAll('text')].filter(t=>ns.some(n=>t.textContent.includes(n))).length,names);
    // 같은 좌표 원 겹침(선 사이)
    const all=rec.lines.flatMap((l,li)=>l.circles.map(c=>({li,tip:c.tip,cy:c.cy})));
    rec.identicalPolylines=rec.lines.length===3&&rec.lines.every(l=>JSON.stringify(l.polylines)===JSON.stringify(rec.lines[0].polylines));
    // 마우스로 보이는 맨 위 원의 안내 확인(첫 날짜): elementFromPoint
    rec.topAtFirst=await svg.evaluate(s=>{const cs=[...s.querySelectorAll('.v5-line circle')];if(!cs.length)return null;const r=cs[0].getBoundingClientRect();const el=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return el?.getAttribute('data-tip')??el?.tagName});
    // 범례 항목에 마우스: 선 강조 여부(클래스/스타일 변화)
    if(rec.legend.length){const before=await svg.evaluate(s=>[...s.querySelectorAll('.v5-line')].map(g=>getComputedStyle(g).opacity+'|'+g.getAttribute('class')).join(';'));await root.locator('.v5-key-line').first().hover();await p.waitForTimeout(80);const after=await svg.evaluate(s=>[...s.querySelectorAll('.v5-line')].map(g=>getComputedStyle(g).opacity+'|'+g.getAttribute('class')).join(';'));rec.legendHoverChanges=before!==after;rec.legendFocusable=await root.locator('.v5-key-line').first().evaluate(e=>e.tabIndex>=0||!!e.closest('button'));}
    // 키보드로 선 원에 닿는가
    rec.focusableCircles=rec.lines.reduce((a,l)=>a+l.circles.filter(c=>c.tab!==null).length,0);
    // 이름 사각형 충돌(범례)
    rec.legendRects=await root.locator('.v5-key-line').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]}));
    let coll=0;for(let i=0;i<rec.legendRects.length;i++)for(let j=i+1;j<rec.legendRects.length;j++){const[a,b2]=[rec.legendRects[i],rec.legendRects[j]];if(a[0]<b2[0]+b2[2]&&b2[0]<a[0]+a[2]&&a[1]<b2[1]+b2[3]&&b2[1]<a[1]+a[3])coll++}
    rec.legendCollisions=coll;
    await svg.scrollIntoViewIfNeeded();
    await root.locator('.v5-plot').first().screenshot({path:dir+`r31-t04-${v}-${test}-${width}-${theme}.png`});
    // 해제: 빼기 한 명
    await result.getByRole('button',{name:'빼기',exact:true}).first().click();await p.waitForTimeout(80);
    rec.afterRemove={legend:await root.locator('.v5-key-line').allInnerTexts(),lines:await svg.locator('.v5-line').count()};
  }catch(e){errors.push({v,width,theme,test,error:e.message.split('\n')[0]});}
  records.push(rec);await p.close();
}
await b.close();
writeFileSync(dir+'r31-t04.json',JSON.stringify({records,errors,blocked},null,2));
console.log(JSON.stringify({states:records.length,errors,blocked:blocked.length}));
