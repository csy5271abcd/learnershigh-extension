import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
const p = await b.newPage({ viewport:{width:1280,height:1400}, colorScheme:'light' });
for (let k=0;k<3;k++){
 await p.goto('http://localhost:5174/student-care/x2'); await p.waitForTimeout(2500);
 const names=await p.$$eval('tbody tr',r=>r.map(x=>x.children[1]?.innerText.trim()));
 console.log(k,names.slice(0,12).join(','), names.length);
 const idx=names.indexOf('탁예린'); console.log('탁예린 idx',idx);
}
// all pages find 탁예린
const names=[];
for(let pg=1;pg<=8;pg++){ await p.locator('button',{hasText:new RegExp('^'+pg+'$')}).first().click().catch(()=>{}); await p.waitForTimeout(300); names.push(...await p.$$eval('tbody tr',r=>r.map(x=>x.children[1]?.innerText.trim()))); }
console.log(names.length,names.indexOf('탁예린'),names.indexOf('문가영'),names.indexOf('변지호'),names.indexOf('구서아'));
// 변지호 in list?
await p.goto('http://localhost:5174/student-care/x2'); await p.waitForTimeout(2000);
await p.locator('tr',{hasText:'변지호'}).first().click().catch(e=>console.log('noRow'));
// keyboard: tab focus into list
await p.goto('http://localhost:5174/student-care/x2'); await p.waitForTimeout(2000);
const rowTab = await p.evaluate(()=>{const r=document.querySelector('tbody tr');return {tabindex:r.getAttribute('tabindex'),role:r.getAttribute('role'),btns:r.querySelectorAll('button,a').length, cursor:getComputedStyle(r).cursor}});
console.log(rowTab);
await p.locator('tbody tr').first().focus().catch(()=>{});
await p.keyboard.press('Enter'); await p.waitForTimeout(800);
console.log('open by Enter', await p.locator('dialog.x2d[open]').count());
await p.keyboard.press('Escape'); await p.waitForTimeout(500);
console.log('after esc', await p.locator('dialog.x2d[open]').count());
await b.close();
