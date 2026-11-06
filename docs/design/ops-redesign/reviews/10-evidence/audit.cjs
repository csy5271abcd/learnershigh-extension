const {createRequire}=require('node:module');
const {chromium}=createRequire(process.cwd()+'/e2e/package.json')('@playwright/test');
const fs=require('node:fs/promises');
const path=require('node:path');
const OUT=__dirname, base='http://localhost:5174';
const probe=()=>{
 const main=document.querySelector('main'), visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&!e.closest('[hidden],.sc-visually-hidden,[aria-hidden="true"]')};
 let text=0,minFont=100,clipped=[]; const w=document.createTreeWalker(main,NodeFilter.SHOW_TEXT);
 while(w.nextNode()){const t=w.currentNode,e=t.parentElement,n=t.textContent.replace(/\s/g,'').length;if(!n||!visible(e))continue;text+=n;minFont=Math.min(minFont,parseFloat(getComputedStyle(e).fontSize));const r=document.createRange();r.selectNodeContents(t);const a=r.getBoundingClientRect(),b=e.getBoundingClientRect(),s=getComputedStyle(e);if((a.width>b.width+2||a.height>b.height+2)&&s.overflow!=='visible')clipped.push({text:t.textContent.trim(),width:a.width,box:b.width,overflow:s.overflow});}
 let internal=0;for(const e of main.querySelectorAll('*'))if(/auto|scroll/.test(getComputedStyle(e).overflowY)&&e.scrollHeight>e.clientHeight+1)internal+=e.scrollHeight-e.clientHeight;
 const rows=[...document.querySelectorAll('[data-care-roster-row]')];
 const detail=document.querySelector('.ops-detail');
 return {text,minFont,height:document.documentElement.scrollHeight,internal,travel:(document.documentElement.scrollHeight+internal)/900,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,rows:rows.length,firstScreenRows:rows.filter(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=900}).length,firstScreenReasons:[...document.querySelectorAll('.ops-list .ops-row-check')].filter(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=900}).length,detailY:detail?.getBoundingClientRect().top+scrollY,clipped:clipped.slice(0,25)};
};
(async()=>{
 const browser=await chromium.launch({channel:'chrome',executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-proxy-server']});
 const results=[],errors=[];
 try{
 for(const theme of ['light','dark'])for(const width of [1600,850,390])for(const variant of ['old','table','minimal','groups']){
  const context=await browser.newContext({viewport:{width,height:900},colorScheme:theme});const p=await context.newPage();p.on('pageerror',e=>errors.push({theme,width,variant,error:e.message}));p.on('console',e=>{if(e.type()==='error')errors.push({theme,width,variant,consoleError:e.text()})});
  await p.goto(base+'/student-care'+(variant==='old'?'':'/ops?wf='+variant));await p.getByRole('tab',{name:'학생별',exact:true}).waitFor();await p.waitForTimeout(450);
  const name=`${variant}-${width}-${theme}`;
  await fs.writeFile(path.join(OUT,name+'-students.txt'),await p.locator('main').innerText());
  await p.screenshot({path:path.join(OUT,name+'-students.png')});
  results.push({name,tab:'students',...await p.evaluate(probe)});
  if(variant!=='old'&&width<1600){await p.locator('.ops-detail').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(OUT,name+'-detail.png')});await p.evaluate(()=>scrollTo(0,0));}
  for(const tab of ['학습관별','관리 이력']){
   await p.getByRole('tab',{name:tab,exact:true}).click();await p.waitForTimeout(tab==='관리 이력'?650:150);
   results.push({name,tab,...await p.evaluate(probe)});
   await fs.writeFile(path.join(OUT,name+'-'+(tab==='학습관별'?'branch':'history')+'.txt'),await p.locator('main').innerText());
   if(variant==='old'||variant==='table')await p.screenshot({path:path.join(OUT,name+'-'+(tab==='학습관별'?'branch':'history')+'.png')});
  }
  await context.close();
 }
 await fs.writeFile(path.join(OUT,'layout-results.json'),JSON.stringify({results,errors},null,2));
 console.log(JSON.stringify({runs:results.length,errors,students:results.filter(r=>r.tab==='students')}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
