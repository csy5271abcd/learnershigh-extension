import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
import { mkdirSync } from 'node:fs';
mkdirSync('br', { recursive: true });
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
for (const [scheme, w] of [['light', 1600], ['dark', 1280], ['light', 1024]]) {
  const p = await b.newPage({ viewport: { width: w, height: 1000 }, colorScheme: scheme });
  for (const v of ['x', 'z2', 'y']) {
    await p.goto('http://localhost:5174/student-care/' + v, { waitUntil: 'load' });
    await p.addStyleTag({ content: 'header[class*=header]{position:static!important}' });
    await p.waitForTimeout(3000);
    const tag = `${v}-${scheme}-${w}`;
    if (v === 'x') await p.click('.x-views button:has-text("학습관별")');
    if (v === 'z2') await p.click('.z-tabs button:has-text("학습관")');
    if (v === 'y') { await p.locator('.yb').screenshot({ path: `br/${tag}-flow-d.png` }); await p.click('.yb .y-seg button:has-text("주간")'); await p.waitForTimeout(400); await p.locator('.yb').screenshot({ path: `br/${tag}-flow-w.png` }); continue }
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `br/${tag}.png`, fullPage: true });
    const wk = p.locator('button:has-text("주간")').first();
    if (await wk.count()) { await wk.click(); await p.waitForTimeout(500); await p.screenshot({ path: `br/${tag}-w.png`, fullPage: true }) }
  }
  await p.close();
}
await b.close();
