import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
const p = await b.newPage({ viewport:{width:1280,height:900}, colorScheme:'light' });
await p.goto('http://localhost:5174/student-care/x2',{waitUntil:'domcontentloaded'});await p.waitForTimeout(4000);
await p.getByText('탁예린').first().click(); await p.waitForTimeout(2000);
await p.getByText('상담',{exact:true}).first().click(); await p.waitForTimeout(800);
// try saving empty
await p.getByRole('button',{name:'저장'}).click(); await p.waitForTimeout(800);
await p.screenshot({path:'07-save-empty.png'});
await p.getByRole('textbox',{name:'기록자'}).fill('검토 선생님');
await p.locator('input[value=CALL]').check({force:true});
await p.locator('textarea').fill('검토용 테스트 상담: 늦은 입실 원인 확인, 보호자 통화 예정');
await p.getByRole('radio',{name:'계속 관리'}).check({force:true});
await p.screenshot({path:'08-filled.png'});
await p.getByRole('button',{name:'저장'}).click(); await p.waitForTimeout(1500);
await p.screenshot({path:'09-saved.png'});
console.log(await p.innerText('.x2d-body'));
// close and see list
await p.keyboard.press('Escape'); await p.waitForTimeout(600);
console.log('after esc dialog?', await p.locator('.x2d-body').count());
await p.screenshot({path:'10-after-esc.png'});
await b.close();
