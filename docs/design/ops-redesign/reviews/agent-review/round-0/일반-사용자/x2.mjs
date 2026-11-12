import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
const p = await b.newPage({ viewport:{width:1600,height:1000}, colorScheme:'light' });
await p.goto('http://localhost:5174/student-care/x'); await p.waitForTimeout(2500);
await p.addStyleTag({content:'header[class*=header]{position:static!important}'});
await p.fill('.x-search','탁예린'); await p.waitForTimeout(300); await p.click('.x-list tbody tr'); 
await p.click('.x-tabs button:has-text("사진 관찰")'); await p.waitForTimeout(800);
const info = await p.evaluate(()=>[...document.querySelectorAll('.x-panel svg *')].filter(e=>e.getAttribute('aria-label')||e.getAttribute('role')||getComputedStyle(e).cursor==='pointer').slice(0,30).map(e=>e.tagName+' '+e.getAttribute('role')+' '+getComputedStyle(e).cursor+' '+e.getAttribute('aria-label')));
console.log(info.join('\n'));
// click 10/24 휴대폰 bar
const bar = p.locator('.x-panel svg').first();
const bb = await bar.boundingBox(); console.log(bb);
await p.mouse.move(bb.x+bb.width*0.48, bb.y+bb.height*0.55); await p.waitForTimeout(400);
await p.screenshot({path:'x-탁예린-bar-hover.png', clip:{x:bb.x-20,y:bb.y-60,width:bb.width+200,height:bb.height+120}});
await p.mouse.click(bb.x+bb.width*0.48, bb.y+bb.height*0.55); await p.waitForTimeout(600);
await p.locator('.x-panel').screenshot({path:'x-탁예린-bar-click.png'});
// counsel
await p.click('.x-tabs button:has-text("상담 기록")'); await p.waitForTimeout(500);
console.log(await p.locator('.x-panel').innerText());
await b.close();
