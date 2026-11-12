import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
const p = await b.newPage({ viewport:{width:1600,height:1000}, colorScheme:'light' });
await p.goto('http://localhost:5174/student-care/z2'); await p.waitForTimeout(2000);
for (const name of ['탁예린','구서아','성하윤','배준서']) {
  await p.getByText(name,{exact:true}).first().click(); await p.waitForTimeout(1200);
  await p.addStyleTag({content:'.z-overlay{position:static!important}.z-dialog{max-height:none!important;overflow:visible!important}'});
  await p.waitForTimeout(300);
  const d = await p.$('.z-dialog'); if (d) await d.screenshot({path:`z-${name}-dialog-el.png`});
  if (name!=='탁예린' && name!=='구서아') console.log('=====',name, (await p.evaluate(()=>document.querySelector('.z-dialog')?.innerText||'')).slice(0,1200));
  await p.reload(); await p.waitForTimeout(1800);
}
// photo bar click inside 탁예린
await p.getByText('탁예린',{exact:true}).first().click(); await p.waitForTimeout(1200);
const nine = p.locator('.z-dialog').getByText('9건',{exact:true}).first();
await nine.scrollIntoViewIfNeeded(); await nine.click(); await p.waitForTimeout(800);
await p.screenshot({path:'z-tak-photo-click.png'});
console.log('after photo click', (await p.evaluate(()=>{const t=document.querySelector('.z-dialog')?.innerText||''; const i=t.indexOf('사진 관찰'); return t.slice(i,i+600)})));
// weekly toggle
await p.locator('.z-dialog').getByText('주간',{exact:true}).first().click(); await p.waitForTimeout(600);
await p.locator('.z-dialog').getByText('주간',{exact:true}).first().scrollIntoViewIfNeeded();
await p.screenshot({path:'z-tak-weekly.png'});
// Esc close & focus
await p.keyboard.press('Escape'); await p.waitForTimeout(500);
console.log('dialog after esc', await p.$$eval('.z-dialog', e=>e.length), 'focused:', await p.evaluate(()=>document.activeElement?.outerHTML.slice(0,120)));
// tabs
const tabs = await p.$$eval('button, [role=tab]', els=>els.map(e=>e.innerText.trim()).filter(t=>t==='학습관'||t==='관리 이력'||t==='오늘'));
console.log('tabs', tabs);
for (const tab of ['학습관','관리 이력']) {
  await p.getByRole('button',{name:tab,exact:true}).or(p.getByRole('tab',{name:tab,exact:true})).first().click(); await p.waitForTimeout(1500);
  await p.screenshot({path:`z-tab-${tab.replace(' ','')}.png`, fullPage:true});
  console.log('=== tab',tab); console.log((await p.evaluate(()=>document.querySelector('main')?.innerText||document.body.innerText)).slice(0,1800));
}
await b.close();
