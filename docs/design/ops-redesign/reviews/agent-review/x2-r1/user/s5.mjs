import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
const p = await b.newPage({ viewport:{width:1280,height:900}, colorScheme:'light' });
await p.goto('http://localhost:5174/student-care/x2',{waitUntil:'domcontentloaded'});await p.waitForTimeout(4000);
await p.getByText('탁예린').first().click(); await p.waitForTimeout(2000);
// click banner chip
const chip = p.locator('.x2d-body').getByText('계획 미달성').first();
await chip.click(); await p.waitForTimeout(800);
await p.screenshot({path:'04-chip-click.png'});
// photo tab
await p.getByText('사진 관찰',{exact:true}).click(); await p.waitForTimeout(2000);
await p.screenshot({path:'05-photo-tab.png'});
console.log(await p.innerText('.x2d-body'));
await p.getByRole('button',{name:/^상담$/}).or(p.getByText('상담',{exact:true})).first().click().catch(e=>console.log('err',e.message)); await p.waitForTimeout(1500);
await p.screenshot({path:'06-counsel-tab.png'});
console.log('---COUNSEL---\n'+await p.innerText('.x2d-body'));
console.log(await p.evaluate(()=>[...document.querySelectorAll('.x2d-body button, .x2d-body input, .x2d-body textarea, .x2d-body select')].map(e=>e.tagName+':'+(e.innerText||e.placeholder||e.getAttribute('aria-label')||e.name||'')).join('\n')));
await b.close();
