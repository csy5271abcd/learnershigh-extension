import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
for (const [w,cs] of [[1600,'light'],[1024,'dark']]) {
const p = await b.newPage({ viewport:{width:w,height:1000}, colorScheme:cs });
await p.goto('http://localhost:5174/student-care/y'); await p.waitForTimeout(3500);
await p.addStyleTag({content:'header[class*=header]{position:static!important}'});
console.log(w, 'scrollW', await p.evaluate(()=>[document.documentElement.scrollWidth, document.querySelector('.y-page table')?.scrollWidth, document.querySelector('.y-page table')?.parentElement.clientWidth]));
for (const n of (w===1600?['문가영','배준서','성하윤','차민재','구서아','권유진']:['문가영'])) {
  await p.fill('.y-search', n); await p.waitForTimeout(300);
  await p.click(`.y-page tbody tr:has-text("${n}")`); await p.waitForTimeout(800);
  await p.locator('.y-page section').first().screenshot({path:`y-${w}-${cs}-${n}.png`});
  await p.click(`.y-page tbody tr:has-text("${n}")`);
}
if (w===1600){ await p.fill('.y-search',''); await p.click('button:has-text("결석")'); await p.waitForTimeout(400); await p.screenshot({path:'y-sort-absent.png'}); 
 await p.hover('.y-page tbody tr:nth-child(1) td:nth-child(4)'); await p.waitForTimeout(400); await p.screenshot({path:'y-hover.png', clip:{x:250,y:180,width:1350,height:400}});}
else await p.screenshot({path:`y-${w}-${cs}-first.png`});
}
await b.close();
