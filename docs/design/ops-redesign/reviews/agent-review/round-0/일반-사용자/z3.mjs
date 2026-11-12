import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
for (const [w,cs] of [[1600,'light'],[1024,'dark'],[1280,'dark']]) {
const p = await b.newPage({ viewport:{width:w,height:1000}, colorScheme:cs });
await p.goto('http://localhost:5174/student-care/z2'); await p.waitForTimeout(3500);
if (w!==1600) await p.screenshot({path:`z2-${w}-${cs}-list.png`});
await p.locator('main :is(button,a,li,[role=button],tr):has-text("탁예린")').last().click(); await p.waitForTimeout(1500);
const d = p.locator('.z-dialog');
const info = await d.evaluate(el=>({sh:el.scrollHeight, ch:el.clientHeight, sw:el.scrollWidth, cw:el.clientWidth}));
console.log(w,cs,info, 'docW', await p.evaluate(()=>document.documentElement.scrollWidth));
for (let i=0;i<4;i++){ await d.evaluate((el,i)=>el.scrollTop=i*800, i); await p.waitForTimeout(1200); await p.screenshot({path:`z2-${w}-${cs}-탁예린-s${i}.png`}); }
// photo images loaded?
console.log(await d.evaluate(el=>[...el.querySelectorAll('img')].slice(0,4).map(i=>[i.complete,i.naturalWidth,i.src.slice(-60)])));
// tab key focus test
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
console.log('dialog after esc', await p.locator('.z-dialog').count());
// 학습관 tab
await p.click('button:has-text("학습관")'); await p.waitForTimeout(1500);
await p.screenshot({path:`z2-${w}-${cs}-branch.png`, fullPage:true});
await p.click('button:has-text("관리 이력")'); await p.waitForTimeout(1200);
await p.screenshot({path:`z2-${w}-${cs}-history.png`});
}
await b.close();
