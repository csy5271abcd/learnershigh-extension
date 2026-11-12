import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
const fn = (sel)=>{
 const parse=s=>s.match(/[\d.]+/g).map(Number);
 const L=c=>{const [r,g,b]=c.slice(0,3).map(v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4});return 0.2126*r+0.7152*g+0.0722*b};
 return [...document.querySelectorAll(sel)].slice(0,3).map(e=>{const cs=getComputedStyle(e);let fg=cs.fill&&e instanceof SVGElement?cs.fill:cs.color;let n=e,bg='rgba(0, 0, 0, 0)';while(n&&n.nodeType===1){const c=getComputedStyle(n).backgroundColor;if(!c.startsWith('rgba(0, 0, 0, 0)')&&!/, 0\)$/.test(c)){bg=c;break}n=n.parentElement||n.parentNode}
 if(fg.startsWith('rgb')){const a=L(parse(fg)),bb=L(parse(bg));return [e.textContent.slice(0,15),fg,bg,cs.fontSize,((Math.max(a,bb)+0.05)/(Math.min(a,bb)+0.05)).toFixed(2)]} return [fg]})};
for (const cs of ['light','dark']) for (const [v,sels] of [['y',['.y-page thead small, .y-page thead th span','.y-why']],['x',['.xa-none','.x-cls','.xn-tick']],['z2',['.z-roster small, [class*=cls]']]]) {
 const p = await b.newPage({ viewport:{width:1600,height:1000}, colorScheme:cs });
 await p.goto('http://localhost:5174/student-care/'+v); await p.waitForTimeout(2500);
 for (const s of sels) console.log(cs,v,s, JSON.stringify(await p.evaluate(fn, s)));
}
await b.close();
