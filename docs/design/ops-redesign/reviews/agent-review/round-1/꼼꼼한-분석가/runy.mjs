import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
import fs from 'fs'
const audit = fs.readFileSync('audit.js', 'utf8')
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const names = '문가영 배준서 성하윤 노은우 차민재 구서아 변지호 염태윤 탁예린 방시우 권유진 장수빈 권하린 강도현'.split(' ')
const log = []; const L = (...a) => { const s = a.join(' '); log.push(s); console.log(s) }
for (const [w, cs] of [[1600, 'light'], [1280, 'dark'], [1024, 'light']]) {
  const p = await b.newPage({ viewport: { width: w, height: 1000 }, colorScheme: cs })
  const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) }); p.on('pageerror', e => errs.push('PAGEERR ' + e.message))
  await p.goto('http://localhost:5174/student-care/y?branchId=demo_large', { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('.y-table tbody tr', { timeout: 60000 }); await p.waitForTimeout(5000)
  await p.addStyleTag({ content: 'header[class*=header]{position:static!important}' })
  await p.addScriptTag({ content: audit })
  L(`[${w} ${cs}] sw`, await p.evaluate(() => document.documentElement.scrollWidth + '/' + document.documentElement.clientWidth), 'table', await p.evaluate(() => { const t = document.querySelector('.y-table'); return t.scrollWidth + '/' + t.clientWidth + ' card ' + t.parentElement.clientWidth }))
  await p.locator('.yb').screenshot({ path: `y/trend-d-${w}-${cs}.png` })
  L(`[${w} ${cs}] TREND`, JSON.stringify(await p.evaluate(() => window.__audit(document.querySelector('.yb')))))
  await p.locator('.yb .y-seg button', { hasText: '주간' }).click(); await p.waitForTimeout(500)
  await p.locator('.yb').screenshot({ path: `y/trend-w-${w}-${cs}.png` })
  await p.locator('.yb .y-seg button', { hasText: '일간' }).click(); await p.waitForTimeout(300)
  await p.locator('.y-toolbar').screenshot({ path: `y/toolbar-${w}-${cs}.png` })
  await p.locator('.y-table thead').screenshot({ path: `y/thead-${w}-${cs}.png` })
  const full = w === 1600 && cs === 'light' ? names : ['문가영', '배준서', '성하윤', '구서아']
  for (const n of full) {
    await p.fill('.y-search', n); await p.waitForTimeout(300)
    const row = p.locator('.y-table tbody tr').first(); if (!(await row.count())) { L('NOROW', n); continue }
    const cells = await row.evaluate(tr => [...tr.children].map(c => (c.getAttribute('data-tip') || c.innerText).replace(/\s+/g, ' ')))
    L(`[${w} ${cs}] ROW ${n}`, cells.join(' || '))
    await row.click(); await p.waitForTimeout(800)
    await p.locator('.y-table tbody').screenshot({ path: `y/${n}-${w}-${cs}.png` })
    const a = await p.evaluate(() => ({ ...window.__audit(document.querySelector('.y-table tbody')), marks: window.__marks(document.querySelector('.y-table tbody')) }))
    if (a.overlaps.length || a.clipped.length || a.lowContrast.length || a.marks.length) L(`[${w} ${cs}] ${n} AUDIT`, JSON.stringify(a))
    const wk = await p.evaluate(() => [...document.querySelectorAll('.y-week')].map(x => x.querySelector('h4').innerText.replace(/\s+/g, ' ') + ': ' + [...x.querySelectorAll('li')].map(li => li.getAttribute('data-tip')).join(' / ')))
    L(`[${w} ${cs}] WEEKS ${n}`, wk.join(' || '))
    await row.click(); await p.waitForTimeout(200)
  }
  await p.fill('.y-search', '')
  await p.waitForTimeout(300)
  const cell = p.locator('.yb-table tbody tr').nth(2).locator('td button').nth(1)
  const tip = await cell.getAttribute('data-tip'); await cell.click(); await p.waitForTimeout(500)
  const cnt = await p.locator('.y-table > tbody > tr:not(.y-detail)').count()
  L(`[${w} ${cs}] trend pick`, tip, '-> rows', cnt, await p.locator('.y-picked').innerText().catch(() => ''))
  await p.screenshot({ path: `y/trendpick-${w}-${cs}.png` })
  L(`[${w} ${cs}] errs`, errs.slice(0, 5).join(' | '))
  await p.close()
}
fs.writeFileSync('y/audit-log.txt', log.join('\n'))
await b.close()
