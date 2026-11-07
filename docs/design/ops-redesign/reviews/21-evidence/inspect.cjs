const { chromium } = require('../../../../../e2e/node_modules/@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const out = __dirname;
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', args: ['--no-proxy-server'] });
  const result = { observations: [], blocked: [], errors: [] };
  try {
    for (const width of [1600, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: 'light', serviceWorkers: 'block' });
      await context.route('**/*', async route => {
        if (['GET','HEAD','OPTIONS'].includes(route.request().method())) return route.continue();
        result.blocked.push({ method: route.request().method(), url: route.request().url() });
        return route.abort('blockedbyclient');
      });
      const page = await context.newPage();
      page.on('pageerror', e => result.errors.push(e.message));
      for (const [name, url] of [['original', '/student-care'], ['ops', '/student-care/ops']]) {
        await page.goto('http://localhost:5174' + url);
        await page.waitForFunction(() => document.querySelectorAll('[data-care-roster-row], tr.rs-summary').length === 150);
        async function capture(state) {
          await page.waitForTimeout(500);
          const observation = await page.evaluate(() => {
            const areas = [...document.querySelectorAll('main *')].flatMap(e => {
              const r = e.getBoundingClientRect(), s = getComputedStyle(e);
              if (!r.width || !r.height || s.display === 'none' || s.visibility === 'hidden') return [];
              const x = /(auto|scroll)/.test(s.overflowX) && e.scrollWidth > e.clientWidth + 1;
              const y = /(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 1;
              return x || y ? [{ class: e.className, x, y, clientWidth: e.clientWidth, scrollWidth: e.scrollWidth, clientHeight: e.clientHeight, scrollHeight: e.scrollHeight, inViewport: r.bottom > 0 && r.top < innerHeight, rect: {x:r.x,y:r.y,width:r.width,height:r.height} }] : [];
            });
            return { text: document.querySelector('main').innerText, areas, pageScroll: document.documentElement.scrollHeight > innerHeight, documentHeight: document.documentElement.scrollHeight, tabs: [...document.querySelectorAll('[role=tab]')].map(e => e.textContent), rows: document.querySelectorAll('[data-care-roster-row], tr.rs-summary').length };
          });
          const file = `${name}-${width}-${state}.png`;
          await page.screenshot({ path: path.join(out, file) });
          result.observations.push({name, width, state, file, ...observation});
        }
        await capture('students');
        if (name === 'original') {
          await page.locator('tr.rs-summary button[aria-label$="상세 펼치기"]').first().click();
          await page.waitForSelector('.rs-detail h2');
          await capture('detail');
        }
        await page.getByRole('tab', { name:'학습관별', exact:true }).click();
        await page.waitForTimeout(1000);
        await capture('branch');
        if (name === 'ops') {
          await page.getByRole('button', {name:'10/22 학습 시간 학생별 보기', exact:true}).click();
          await capture('branch-open');
        }
      }
      await context.close();
    }
  } finally {
    fs.writeFileSync(path.join(out, 'inspection.json'), JSON.stringify(result, null, 2));
    await browser.close();
  }
  console.log(JSON.stringify({states:result.observations.length, blocked:result.blocked.length, errors:result.errors}));
}
main().catch(e => {console.error(e);process.exitCode=1;});
