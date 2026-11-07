const fs=require('fs'),assert=require('assert/strict'),{createRequire}=require('module');
const {chromium}=createRequire(process.cwd()+'/e2e/package.json')('@playwright/test');
const O=__dirname;
const quant=(a,q)=>{a.sort((x,y)=>x-y);const x=(a.length-1)*q;return a[Math.floor(x)]+(a[Math.ceil(x)]-a[Math.floor(x)])*(x-Math.floor(x))};
const sign=v=>{const r=Number(v.toFixed(0));return (r<0?'−':r>0?'+':'')+Math.abs(r)};
const stats=a=>a.length?{n:a.length,q1:quant([...a],.25),median:quant([...a],.5),q3:quant([...a],.75)}:null;
function expected(students){return students[0].review.days.map((day,i)=>{
 const study=[],start=[];
 for(const {review:r} of students){const d=r.days[i],b=r.weekdayBaseline[i];
  if(d.minutes!==null&&(d.attendance==='PRESENT'||d.minutes!==0)&&b.samples>0&&b.minutes)study.push((d.minutes-b.minutes)/b.minutes*100);
  if(d.startMinutes!==null&&b.startSamples>0&&b.startMinutes!==null)start.push(d.startMinutes-b.startMinutes);
 }
 const a=stats(study),b=stats(start);
 return {date:day.date,study:a,start:b,studyText:a?`${sign(a.median)}% (${sign(a.q1)}~${sign(a.q3)}%)`:null,startText:b?[`${sign(b.median)}분`,`${sign(b.q1)}~${sign(b.q3)}분`]:null};
})}
(async()=>{const b=await chromium.launch({channel:'chrome',args:['--no-proxy-server']});const c=await b.newContext({viewport:{width:1600,height:900}});const p=await c.newPage();const out={branches:[],errors:[],writes:[]};
await c.route('**/*',r=>{if(['GET','HEAD','OPTIONS'].includes(r.request().method()))return r.continue();out.writes.push(r.request().url());return r.fulfill({status:503,json:{message:'review write blocked'}})});
p.on('pageerror',e=>out.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')out.errors.push(m.text())});
for(const branch of ['demo_large','demo_medium','demo_small']){
 const api=await(await p.request.get('http://localhost:5174/api/admin/student-care/metrics?branchId='+branch)).json();
 const e=expected(api.students);
 await p.goto('http://localhost:5174/student-care/ops?branchId='+branch);await p.locator('[data-care-roster-row]').first().waitFor();await p.getByRole('tab',{name:'학습관별',exact:true}).click();
 const read=async()=>({study:await p.locator('.ops-bt-row').nth(2).locator('[role=cell]').allTextContents(),start:await p.locator('.ops-bt-row').nth(3).locator('[role=cell]').allTextContents()});
 const screen=await read();
 for(let i=0;i<7;i++){assert(screen.study[i].includes(e[i].studyText));for(const t of e[i].startText||[])assert(screen.start[i].includes(t))}
 const row={branch,count:api.students.length,expected:e,screen};
 if(branch==='demo_large'){
  await p.screenshot({path:O+'/distribution-1600.png',fullPage:true});
  await p.getByRole('textbox',{name:'제외할 학생 이름'}).fill('권유진');await p.getByRole('button',{name:'권유진 제외',exact:true}).click();
  row.excludedExpected=expected(api.students.filter(s=>s.student.studentName!=='권유진'));row.excludedScreen=await read();
  for(let i=0;i<7;i++){assert(row.excludedScreen.study[i].includes(row.excludedExpected[i].studyText));for(const t of row.excludedExpected[i].startText||[])assert(row.excludedScreen.start[i].includes(t))}
  await p.getByRole('button',{name:'권유진 복원',exact:true}).click();row.restored=await read();assert.deepEqual(row.restored,screen);
 }
 out.branches.push(row);
}
out.checks='3 branches × 7 dates × 2 indicators = 42 comparisons; 14 exclusion comparisons; restore exact equality';
fs.writeFileSync(O+'/distribution.json',JSON.stringify(out,null,2));await b.close();console.log(out.checks);
})().catch(e=>{console.error(e);process.exitCode=1});
