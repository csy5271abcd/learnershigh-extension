import { browser, page, audit } from './lib.mjs';
const b=await browser();
for (const scheme of ['light','dark']){
const p=await page(b,1600,scheme,'/student-care/z2');
await p.click('.z-tabs button:has-text("학습관")'); await p.waitForTimeout(1500);
console.log(scheme,'audit', (await audit(p,'.z-page')).slice(0,12).join('\n '));
await p.screenshot({path:`z2-1600-${scheme}-branch-full.png`,fullPage:true});
const txt=await p.evaluate(()=>document.querySelector('.z-body').innerText.replace(/\s+/g,' ').slice(0,1500)); if(scheme==='light') console.log(txt);
await p.close();}
// keyboard X: tab focus into tabs
const p=await page(b,1600,'light','/student-care/x');
await p.locator('.x-tabs button').first().focus(); await p.keyboard.press('ArrowRight'); 
console.log('X arrow moves focus to:', await p.evaluate(()=>document.activeElement.textContent));
await p.keyboard.press('Tab'); console.log('X tab next:', await p.evaluate(()=>document.activeElement.outerHTML.slice(0,80)));
await b.close();
