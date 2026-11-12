import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
for (const v of ['x','y','z2']) for (const w of [1280,1024]) for (const cs of ['light','dark']) {
  const p = await b.newPage({ viewport:{width:w,height:900}, colorScheme:cs });
  await p.goto('http://localhost:5174/student-care/'+v); await p.waitForTimeout(1800);
  const ov = await p.evaluate(()=>{ const de=document.documentElement; const wide=[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect(); return r.right>window.innerWidth+1 && r.width>0}).slice(0,4).map(e=>e.className.toString().slice(0,40)); return {sw:de.scrollWidth, cw:de.clientWidth, wide}; });
  const bg = await p.evaluate(()=>{ const whites=[...document.querySelectorAll('main *')].filter(e=>{const c=getComputedStyle(e).backgroundColor; return c==='rgb(255, 255, 255)'}).length; return whites; });
  console.log(v,w,cs,JSON.stringify(ov),'whiteBg:',bg);
  await p.screenshot({path:`${v}-${w}-${cs}.png`});
  await p.close();
}
// keyboard test on z2 and x
for (const v of ['x','z2','y']) {
  const p = await b.newPage({ viewport:{width:1600,height:1000} });
  await p.goto('http://localhost:5174/student-care/'+v); await p.waitForTimeout(1800);
  const seq=[];
  for (let i=0;i<40;i++){ await p.keyboard.press('Tab'); seq.push(await p.evaluate(()=>{const a=document.activeElement; const s=getComputedStyle(a); return a.tagName+':'+(a.innerText||a.getAttribute('aria-label')||a.placeholder||'').trim().slice(0,12)+(s.outlineStyle!=='none'||s.boxShadow!=='none'?'[f]':'[nofocus]')})); }
  console.log('KB',v, seq.join(' > '));
  await p.close();
}
await b.close();
