import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
const p = await b.newPage({ viewport:{width:1600,height:1000}, colorScheme:'light' });
await p.goto('http://localhost:5174/student-care/x'); await p.waitForTimeout(2000);
await p.addStyleTag({content:'header[class*=header]{position:static!important}'});
const panel = async (name)=>{ const el = await p.$('.x-detail, [class*=detail]'); };
// select 구서아
await p.getByText('구서아', {exact:false}).first().click(); await p.waitForTimeout(800);
const right = p.locator('main').first();
await p.screenshot({path:'x-gusoa-1600.png'});
for (const tab of ['입실 시각','계획','사진 관찰','상담 기록']) {
  await p.getByRole('tab',{name:tab}).or(p.getByText(tab,{exact:true})).first().click(); await p.waitForTimeout(700);
  await p.screenshot({path:`x-gusoa-tab-${tab.replace(' ','')}.png`});
}
// back to 탁예린 and tabs
await p.getByText('탁예린').first().click(); await p.waitForTimeout(800);
for (const tab of ['공부 시간','입실 시각','계획','사진 관찰','상담 기록']) {
  await p.getByText(tab,{exact:true}).first().click(); await p.waitForTimeout(700);
  await p.screenshot({path:`x-tak-tab-${tab.replace(' ','')}.png`});
}
console.log(await p.evaluate(()=>[...document.querySelectorAll('textarea,input,button,select,[role=tab]')].map(e=>e.tagName+':'+(e.getAttribute('aria-label')||e.placeholder||e.innerText||'').slice(0,30)).join(' | ')));
await b.close();
