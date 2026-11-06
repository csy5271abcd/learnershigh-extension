const {createRequire}=require('node:module');
const {chromium}=createRequire(process.cwd()+'/e2e/package.json')('@playwright/test');
const fs=require('node:fs/promises');
const O=__dirname,B='http://localhost:5174',root=B+'/api/admin/student-care';
(async()=>{
const browser=await chromium.launch({channel:'chrome',executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-proxy-server']});
const context=await browser.newContext({viewport:{width:1600,height:900},colorScheme:'light'}),p=await context.newPage();p.setDefaultTimeout(4500);
const records=[];const run=async(name,fn)=>{try{records.push({name,result:await fn()})}catch(e){records.push({name,error:e.message})}await fs.writeFile(O+'/interactions.json',JSON.stringify(records,null,2))};
const get=async(path)=>{const r=await p.request.get(root+path);if(!r.ok())throw Error(path+':'+r.status());return r.json()};
const wait=()=>p.waitForTimeout(300);
const load=async(variant='table')=>{await p.goto(B+'/student-care'+(variant==='old'?'':'/ops?wf='+variant));await p.getByRole('tab',{name:'학생별',exact:true}).waitFor();await p.locator(variant==='old'?'.rs-summary':'[data-care-roster-row]').first().waitFor();};
const select=async(name,variant)=>{if(variant==='old')await p.getByRole('button',{name:name+' 상세 펼치기',exact:true}).click();else await p.locator('[data-care-roster-row]').filter({has:p.locator('b',{hasText:new RegExp('^'+name+'$')})}).first().click();await wait()};
try{
 const board=await get('/board?branchId=demo_large'),metrics=await get('/metrics?branchId=demo_large');
 const sampleNames=['권유진','박예준','오시윤','강서윤','강하준','권하린','김시윤','강하린','강도현','김도현','최하준'];
 for(const name of sampleNames)await run('sample '+name,async()=>{
  const m=metrics.students.find(s=>s.student.studentName===name);const detail=await get('/students/'+m.student.studentId+'?branchId=demo_large');await fs.writeFile(O+'/detail-'+m.student.studentId+'.json',JSON.stringify(detail,null,2));
  const screen={};for(const variant of ['table','minimal','groups']){await load(variant);await p.getByRole('textbox',{name:'학생 검색',exact:true}).fill(name);await select(name,variant);screen[variant]={row:await p.locator('[data-care-roster-row]').first().innerText(),detail:await p.locator('.ops-detail').innerText(),barLabels:await p.locator('.ops-bar-box').evaluateAll(es=>es.map(e=>e.getAttribute('aria-label')))};}
  return {student:m.student,reviewEqual:JSON.stringify(m.review)===JSON.stringify(detail.review),summary:m.review.current,usualWeek:m.review.baseline.studyMinutes/4,days:m.review.days,signals:detail.signals,board:board.needsCheck.find(s=>s.studentId===m.student.studentId)||board.inAdjustment.find(s=>s.studentId===m.student.studentId),screen};
 });
 for(const variant of ['old','table','minimal','groups']){
 await run(variant+' branches/search/settings/link',async()=>{
  await load(variant);const counts=[];for(const [name,id]of[['분당점','demo_medium'],['수지점','demo_small'],['강남점','demo_large']]){await p.getByLabel('학습관',{exact:true}).selectOption(id);await wait();counts.push({name,rows:await p.locator(variant==='old'?'.rs-summary':'[data-care-roster-row]').count(),text:(await p.locator('main').innerText()).slice(0,210)});}
  const q=p.getByRole('textbox',{name:'학생 검색',exact:true});await q.fill('고2 B반');const byClass=await p.locator(variant==='old'?'.rs-summary':'[data-care-roster-row]').count();await q.fill('없는학생zz');const empty=await p.locator('main').innerText();await q.fill('');
  await p.getByRole('button',{name:'관리 기준 설정',exact:true}).click();await p.locator('#sc-setting-absenceDays').waitFor();const values=await p.getByRole('dialog').locator('input').evaluateAll(es=>es.map(e=>({id:e.id,value:e.value})));await p.getByRole('button',{name:'취소',exact:true}).click();const link=await p.getByRole('link',{name:/학부모 리포트 미리보기/}).getAttribute('href');return {counts,byClass,empty:empty.includes('조건에 맞는 학생이 없습니다.'),values,link};
 });
 await run(variant+' old/new detail hover/history',async()=>{
  await load(variant);await select('김도현',variant);if(variant==='old'){await p.getByRole('button',{name:/과거 관리 이력/}).click();await wait()}
  const detail=p.locator(variant==='old'?'.rs-detail':'.ops-detail');await fs.writeFile(O+'/'+variant+'-managed-detail.txt',await detail.innerText());await detail.screenshot({path:O+'/'+variant+'-managed-detail.png'});
  await p.getByRole('tab',{name:'관리 이력',exact:true}).click();await p.getByRole('combobox',{name:'이력 학생 선택',exact:true}).waitFor();await p.getByRole('combobox',{name:'이력 학생 선택',exact:true}).selectOption('demo_s014');await wait();const filtered=await p.locator('main').innerText();await p.locator('.sc-history-expand').first().click();const original=await p.getByRole('region',{name:'기록 원문',exact:true}).innerText();await p.getByRole('combobox',{name:'이력 학생 선택',exact:true}).selectOption('demo_s053');await wait();const noHistory=await p.locator('main').innerText();return {detail:await fs.readFile(O+'/'+variant+'-managed-detail.txt','utf8'),filtered,original,noHistory};
 });
 await run(variant+' branch exclude/restore/date/details',async()=>{
  await load(variant);await p.getByRole('tab',{name:'학습관별',exact:true}).click();await wait();const before=await p.locator('main').innerText();
  if(variant==='old'){
   await p.getByRole('button',{name:'학생 포함·제외',exact:true}).click();const controls=await p.locator('main input').evaluateAll(es=>es.map(e=>({type:e.type,label:e.getAttribute('aria-label')})));return {before,controls,buttons:await p.locator('main button').allTextContents()};
  }
  await p.getByRole('textbox',{name:'제외할 학생 이름'}).fill('권유진');await p.getByRole('button',{name:'권유진 제외',exact:true}).click();const after=await p.locator('main').innerText();await p.getByRole('button',{name:'권유진 복원',exact:true}).click();const restored=await p.locator('main').innerText();const dates=await p.locator('.ops-bt-head').innerText();const dateButtons=await p.locator('.ops-bt-head button').count();const overflow=await p.locator('.ops-bt').evaluate(e=>({width:e.clientWidth,scrollWidth:e.scrollWidth}));await p.getByRole('button',{name:'권유진',exact:true}).first().click();await wait();return {before,after,restoredEqual:before===restored,dates,dateButtons,overflow,tabAfter:await p.getByRole('tab',{selected:true}).innerText(),detail:await p.locator('.ops-detail h2').innerText()};
 });
 }
 // Browser-local response substitution only. No POST/PUT is forwarded to the backend.
 for(const variant of ['old','table'])await run(variant+' save request only (NO DB WRITE)',async()=>{
  await load(variant);await select('권유진',variant);const requests=[];await p.route('**/api/admin/student-care/**',async route=>{const r=route.request();if(['POST','PUT'].includes(r.method())){requests.push({url:r.url(),method:r.method(),body:r.postDataJSON()});await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({code:'REVIEW_WRITE_BLOCKED',message:'검수: DB 쓰기 차단'})});}else await route.continue()});
  await p.getByRole('textbox',{name:'기록자',exact:true}).fill('기능 심사');await p.getByRole('radio',{name:'면담',exact:true}).check();await p.getByRole('textbox',{name:'상담 내용',exact:true}).fill('기능 심사 요청 확인\n줄바꿈 원문');await p.getByRole('radio',{name:'계속 관리',exact:true}).check();await p.getByRole('button',{name:'저장',exact:true}).click();await wait();
  await p.getByRole('button',{name:'관리 기준 설정',exact:true}).click();await p.locator('#sc-setting-absenceDays').waitFor();await p.locator('#sc-setting-absenceDays').fill('2');await p.getByRole('dialog').getByRole('button',{name:'저장',exact:true}).click();await wait();const alerts=await p.getByRole('alert').allTextContents();await p.unroute('**/api/admin/student-care/**');return {requests,alerts,actualPersistence:'UNVERIFIED: restore command denied Docker pipe access'};
 });
}finally{await fs.writeFile(O+'/interactions.json',JSON.stringify(records,null,2));await browser.close()}
console.log(JSON.stringify(records.map(r=>({name:r.name,error:r.error,ok:!r.error}))))
})().catch(e=>{console.error(e);process.exitCode=1});
