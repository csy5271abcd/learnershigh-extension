import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
const lum=c=>{const a=c.map(v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4});return .2126*a[0]+.7152*a[1]+.0722*a[2]};
const cr=(a,b)=>{const x=lum(a),y=lum(b);return ((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2)};
for (const scheme of ['light','dark']){
 const p = await b.newPage({ viewport:{width:1280,height:2400}, colorScheme:scheme });
 await p.goto('http://localhost:5174/student-care/x2'); await p.waitForTimeout(2500);
 await p.locator('input').first().fill('문가영'); await p.waitForTimeout(400); await p.locator('tr',{hasText:'문가영'}).first().click(); await p.waitForTimeout(1500);
 // sample pixel colors from screenshot at known spots instead
 await p.screenshot({path:`px-${scheme}.png`});
 const info=await p.evaluate(()=>{const out=[];document.querySelectorAll('dialog.x2d svg rect, dialog.x2d [class*=bar], dialog.x2d [class*=plan]').forEach(e=>{const cs=getComputedStyle(e);const r=e.getBoundingClientRect();if(r.width>20&&r.height>5)out.push([e.tagName,e.getAttribute('class'),cs.fill,cs.backgroundColor,Math.round(r.width),Math.round(r.height)])});return out.slice(0,14)});
 console.log(scheme,JSON.stringify(info));
 const bg=await p.evaluate(()=>{const c=document.querySelector('dialog.x2d section, dialog.x2d [class*=card]');return c?getComputedStyle(c).backgroundColor:null});
 console.log('card bg',bg);
 await p.close();
}
await b.close();
