import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
const p = await b.newPage({ viewport:{width:1280,height:900}, colorScheme:'light' });
await p.goto('http://localhost:5174/student-care/x2',{waitUntil:'domcontentloaded'});await p.waitForTimeout(4000);
await p.addStyleTag({content:'header[class*=header]{position:static!important}'});
await p.getByText('학습관별',{exact:true}).click(); await p.waitForTimeout(2500);
// click gray bar (줄어듦) at 11/5: displayed (332,505)*1.22
await p.mouse.move(405,615); await p.waitForTimeout(500);
await p.screenshot({path:'12-hover-gray.png'});
await p.mouse.click(405,615); await p.waitForTimeout(1200);
await p.screenshot({path:'13-click-gray.png'});
const t = await p.innerText('body'); console.log(t.slice(t.indexOf('공부 시간 변화'), t.indexOf('공부 시간 변화')+1500));
await b.close();
