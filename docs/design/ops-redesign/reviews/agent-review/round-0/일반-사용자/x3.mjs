import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
for (const [w,cs] of [[1024,'dark'],[1280,'light']]) {
const p = await b.newPage({ viewport:{width:w,height:1000}, colorScheme:cs });
await p.goto('http://localhost:5174/student-care/x'); await p.waitForTimeout(3000);
console.log(w, await p.evaluate(()=>document.documentElement.scrollWidth));
await p.screenshot({path:`x-${w}-${cs}-first.png`});
await p.fill('.x-search','배준서'); await p.waitForTimeout(300); await p.click('.x-list tbody tr');
await p.click('button:has-text("주간")'); await p.waitForTimeout(600);
await p.locator('.x-panel').screenshot({path:`x-${w}-${cs}-배준서-주간.png`});
await p.click('.x-tabs button:has-text("계획")'); await p.waitForTimeout(600);
await p.locator('.x-panel').screenshot({path:`x-${w}-${cs}-배준서-계획.png`});
}
await b.close();
