// 31차 독립 검토(Claude): T01 범위 밖 집단 선택 + D 방향 상태 잔존 반례. 읽기 전용(GET 외 차단).
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const require=createRequire(new URL('../../../../../e2e/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const dir=new URL('./',import.meta.url).pathname.replace(/^\/(\w:)/,'$1');
const b=await chromium.launch({channel:'chrome',args:['--no-proxy-server']});
const records=[],errors=[],blocked=[];
function patch(test){return async r=>{
  if(!['GET','HEAD','OPTIONS'].includes(r.request().method())){blocked.push(r.request().url());return r.abort();}
  if(!r.request().url().includes('/api/admin/student-care/metrics?'))return r.continue();
  const res=await r.fetch(),body=await res.json();
  body.students.forEach((s,i)=>{const rev=s.review;
    rev.days.forEach(d=>Object.assign(d,{minutes:test==='study-one'&&i===149?350:100,startMinutes:test==='start-both'?(i<3?700:i>=146?1300:1000):1000,attendance:'PRESENT',scheduled:true}));
    rev.weekdayBaseline.forEach(d=>Object.assign(d,{minutes:100,startMinutes:1000,samples:4,startSamples:4}));
    (rev.baselineDays??[]).forEach(d=>Object.assign(d,{minutes:100,startMinutes:1000}));
    Object.assign(rev.current,{studyMinutes:test==='study-one'&&i===149?2450:700,recordedDays:7});Object.assign(rev.baseline,{studyMinutes:2800,recordedDays:28});
  });return r.fulfill({response:res,json:body});
}}
for(const width of [1600,1280])for(const theme of ['light','dark'])for(const v of ['a','b','c','d'])for(const test of ['study-one','start-both']){
  const p=await b.newPage({viewport:{width,height:900},colorScheme:theme});p.setDefaultTimeout(7000);
  p.on('pageerror',e=>errors.push({v,width,theme,test,error:e.message}));
  await p.route('**/*',patch(test));
  const rec={v,width,theme,test,actions:[]};
  try{
    await p.goto('http://localhost:5174/student-care/'+v);await p.getByRole('tab').first().waitFor();await p.waitForTimeout(400);
    if(v!=='d')await p.getByRole('tab',{name:v==='c'?'학습관 현황':'학습관별',exact:true}).click();
    const metric=test==='study-one'?'학습 시간':'입실 시각';
    if(v==='d')await p.getByRole('group',{name:'지표 고르기'}).getByRole('button',{name:metric,exact:true}).click();
    else await p.locator('.v5-bands th button').filter({hasText:metric}).click();
    const root=()=>v==='b'?p.getByRole('dialog'):v==='d'?p.locator('.v5-card').last():p.locator('.v5-inline-detail');
    const result=()=>v==='b'?p.getByRole('dialog'):root().locator('.v5-result').last();
    // ▲ 글자와 머리 숫자 겹침 측정
    rec.overlap=await root().locator('svg').first().evaluate(svg=>{const heads=[...svg.querySelectorAll('.v5-head-num')].map(e=>e.getBoundingClientRect());const rails=[...svg.querySelectorAll('.v5-rail-num')].map(e=>e.getBoundingClientRect());let n=0;for(const a of rails)for(const h of heads)if(a.left<h.right&&h.left<a.right&&a.top<h.bottom&&h.top<a.bottom)n++;return{rails:rails.length,heads:heads.length,overlaps:n}});
    for(const dirName of test==='study-one'?['위쪽']:['위쪽','아래쪽'])for(const method of ['mouse','keyboard']){
      const control=root().getByRole('button',{name:new RegExp('10/21 '+dirName+' 범위 밖')});
      await control.waitFor();
      const a={dir:dirName,method,label:await control.getAttribute('aria-label'),tabindex:await control.getAttribute('tabindex')};
      if(method==='mouse')await control.click();else{await control.focus();await p.keyboard.press('Enter');}
      await p.waitForTimeout(150);
      a.head=(await result().locator(v==='b'?'.v5-overlay-bar':'.v5-result-head').first().innerText()).replace(/\n/g,' ');
      a.rows=await result().locator('tbody tr').allTextContents();
      if(method==='mouse')await p.screenshot({path:dir+`r31-t01-${test}-${v}-${width}-${theme}-${dirName==='위쪽'?'up':'down'}.png`});
      // 이름 → 학생 상세 (첫 방향·마우스만)
      if(method==='mouse'&&dirName==='위쪽'){
        const nameBtn=result().locator('tbody tr').first().getByRole('button').first();
        a.nameBtn=await nameBtn.innerText();await nameBtn.click();await p.waitForTimeout(250);
        a.detailHeadings=(await p.locator('h2,h3').allInnerTexts()).filter(t=>t.includes(a.nameBtn.trim().split(/\s/)[0])).slice(0,3);
        a.detailOpened=a.detailHeadings.length>0;
        await p.keyboard.press('Escape');await p.waitForTimeout(200);
        // 복귀: 각 안을 처음 상태로
        await p.goto('http://localhost:5174/student-care/'+v);await p.getByRole('tab').first().waitFor();await p.waitForTimeout(300);
        if(v!=='d')await p.getByRole('tab',{name:v==='c'?'학습관 현황':'학습관별',exact:true}).click();
        if(v==='d')await p.getByRole('group',{name:'지표 고르기'}).getByRole('button',{name:metric,exact:true}).click();
        else await p.locator('.v5-bands th button').filter({hasText:metric}).click();
      }else{
        if(v==='b'){await result().getByRole('button',{name:'닫기',exact:true}).first().click();if(!await p.getByRole('dialog').count())await p.locator('.v5-bands th button').filter({hasText:metric}).click();}
        else await result().getByRole('button',{name:'접기',exact:true}).click();
      }
      rec.actions.push(a);
    }
    await root().locator('svg g[role=button]').first().click();await p.waitForTimeout(100);
    rec.allRows=await result().locator('tbody tr').count();
    rec.allHead=(await result().locator(v==='b'?'.v5-overlay-bar':'.v5-result-head').first().innerText()).replace(/\n/g,' ');
    // D 전용: ▲ 고른 뒤 첫 화면 작은 추이선 날짜(계획 제출)를 누르면 방향이 남는가
    if(v==='d'&&width===1280&&theme==='light'){
      await root().locator('svg g[role=button]').first().click();await p.waitForTimeout(100); // 접기(같은 날짜 다시)
      const control=root().getByRole('button',{name:/10\/21 위쪽 범위 밖/});await control.click();await p.waitForTimeout(150);
      const before=(await result().locator('.v5-result-head').innerText()).replace(/\n/g,' ');
      const planRow=p.locator('.v5-bands tr').filter({hasText:'계획 제출'}).first();
      const pts=planRow.locator('[role=button],[tabindex="0"]');
      rec.dStale={before,trendControls:await pts.count()};
      const pt=planRow.locator('svg [role=button], svg [tabindex="0"]').nth(3);
      if(await pt.count()){await pt.click();await p.waitForTimeout(150);
        const card=p.locator('.v5-card').last();
        rec.dStale.after=(await card.locator('.v5-result-head').innerText()).replace(/\n/g,' ');
        rec.dStale.afterRows=await card.locator('.v5-result tbody tr').count();
        await p.screenshot({path:dir+`r31-t01-d-stale-${width}-${theme}.png`});}
      // 입실 시각 추이선 날짜도
      const startRow=p.locator('.v5-bands tr').filter({hasText:'입실 시각'}).first();
      const pt2=startRow.locator('svg [role=button], svg [tabindex="0"]').nth(0);
      if(await pt2.count()){await pt2.click();await p.waitForTimeout(150);const card=p.locator('.v5-card').last();
        rec.dStale.startAfter=(await card.locator('.v5-result-head').innerText()).replace(/\n/g,' ');
        rec.dStale.startRows=await card.locator('.v5-result tbody tr').count();}
    }
    records.push(rec);
  }catch(e){errors.push({v,width,theme,test,error:e.message.split('\n')[0]});records.push(rec);}
  await p.close();
}
await b.close();
writeFileSync(dir+'r31-t01.json',JSON.stringify({records,errors,blocked},null,2));
console.log(JSON.stringify({states:records.length,errors,blocked:blocked.length}));
