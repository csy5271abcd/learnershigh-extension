import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
for (const v of ['x','y','z2']) for (const cs of ['light','dark']) {
  const p = await b.newPage({ viewport:{width:1600,height:1000}, colorScheme:cs });
  await p.goto('http://localhost:5174/student-care/'+v); await p.waitForTimeout(1800);
  const r = await p.evaluate(()=>{
    const parse=c=>{const m=c.match(/[\d.]+/g); return m?m.map(Number):null};
    const lum=([r,g,bb])=>{const f=x=>{x/=255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4)}; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(bb)};
    const bgOf=e=>{while(e){const c=getComputedStyle(e).backgroundColor; const a=parse(c); if(a && (a.length<4||a[3]>0.5)) return a; e=e.parentElement} return [255,255,255]};
    const out=[]; const seen=new Set();
    for (const e of document.querySelectorAll('main *')) {
      if (!e.childNodes.length || ![...e.childNodes].some(n=>n.nodeType===3 && n.textContent.trim())) continue;
      const s=getComputedStyle(e); const fs=parseFloat(s.fontSize); const fg=parse(s.color); const bg=bgOf(e);
      const L1=lum(fg),L2=lum(bg); const cr=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
      const need = fs>=18.66 || (fs>=14 && +s.fontWeight>=700) ? 3 : 4.5;
      if (cr<need) { const k=s.color+bg+fs; if(seen.has(k)) continue; seen.add(k); out.push(`${e.textContent.trim().slice(0,14)}|${fs}px|${cr.toFixed(2)}|${s.color} on ${bg}`); }
    }
    return out.slice(0,12);
  });
  console.log('==',v,cs); console.log(r.join('\n'));
  await p.close();
}
await b.close();
