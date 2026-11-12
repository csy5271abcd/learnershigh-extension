import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
import { mkdirSync } from 'node:fs';
mkdirSync('stu', { recursive: true });
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
const [v, scheme = 'light', w = '1600', names = '문가영,배준서,성하윤,노은우,차민재,구서아,변지호,염태윤,탁예린,방시우,권유진,장수빈'] = process.argv.slice(2);
const p = await b.newPage({ viewport: { width: +w, height: 1000 }, colorScheme: scheme, deviceScaleFactor: 1 });
const errs = []; p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) });
await p.goto('http://localhost:5174/student-care/' + v, { waitUntil: 'load' });
await p.addStyleTag({ content: 'header[class*=header]{position:static!important}.z-overlay{position:static!important}.z-dialog{max-height:none!important;overflow:visible!important}' });
await p.waitForTimeout(3000);
const tag = `${v}-${scheme}-${w}`;
for (const n of names.split(',')) {
  try {
    if (v === 'x') {
      await p.fill('.x-search', n); await p.waitForTimeout(200);
      await p.click('.x-list tbody tr'); await p.waitForTimeout(300);
      const tabs = await p.$$('.x-tabs button');
      for (let i = 0; i < tabs.length - 1; i++) {
        await tabs[i].click(); await p.waitForTimeout(500);
        await p.locator('.x-panel').screenshot({ path: `stu/${tag}-${n}-tab${i}-d.png` });
        const wk = p.locator('.xs-seg button', { hasText: '주간' }).first();
        if (await wk.count()) { await wk.click(); await p.waitForTimeout(300); await p.locator('.x-panel').screenshot({ path: `stu/${tag}-${n}-tab${i}-w.png` }); await p.locator('.xs-seg button', { hasText: '일간' }).first().click() }
      }
    } else if (v === 'z2') {
      await p.fill('.z-search', n); await p.waitForTimeout(300);
      await p.click('button[data-care-roster-row]'); await p.waitForTimeout(800);
      await p.locator('.z-dialog').screenshot({ path: `stu/${tag}-${n}-d.png` });
      const wk = p.locator('.zz-seg button', { hasText: '주간' }).first();
      if (await wk.count()) { await wk.click(); await p.waitForTimeout(300); await p.locator('.z-dialog').screenshot({ path: `stu/${tag}-${n}-w.png` }) }
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    } else if (v === 'y') {
      await p.fill('.y-search', n); await p.waitForTimeout(300);
      await p.click('.y-table tbody tr'); await p.waitForTimeout(600);
      await p.locator('.y-card').screenshot({ path: `stu/${tag}-${n}.png` });
      await p.click('.y-table tbody tr'); await p.waitForTimeout(200);
    }
  } catch (e) { console.log('ERR', n, String(e).slice(0, 200)) }
}
console.log('errors', errs.slice(0, 5));
await b.close();
