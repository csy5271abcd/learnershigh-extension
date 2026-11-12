import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
const p = await b.newPage({ viewport:{width:1600,height:1000}, colorScheme:'light' });
await p.goto('http://localhost:5174/student-care/z2'); await p.waitForTimeout(3000);
await p.click('button:has-text("학습관")'); await p.waitForTimeout(1500);
const t = p.getByText('3일 이상').first(); await t.click(); await p.waitForTimeout(800);
await p.screenshot({path:'z2-branch-click-3days.png', fullPage:true});
console.log((await p.locator('main').innerText()).slice(0,900));
// keyboard: tab through today list
await p.click('button:has-text("오늘")'); await p.waitForTimeout(800);
for(let i=0;i<8;i++) await p.keyboard.press('Tab');
console.log('focused', await p.evaluate(()=>document.activeElement.outerHTML.slice(0,120)));
await p.screenshot({path:'z2-focus.png'});
await b.close();
