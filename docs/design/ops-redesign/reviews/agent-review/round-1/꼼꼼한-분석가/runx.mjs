import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
import fs from 'fs'
const audit = fs.readFileSync('audit.js', 'utf8')
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const names = '문가영 배준서 성하윤 노은우 차민재 구서아 변지호 염태윤 탁예린 방시우 권유진 장수빈 권하린 강도현'.split(' ')
const log = []
const L = (...a) => { const s = a.join(' '); log.push(s); console.log(s) }
for (const [w, cs] of [[1600, 'light'], [1280, 'dark'], [1024, 'light']]) {
  const p = await b.newPage({ viewport: { width: w, height: 1000 }, colorScheme: cs })
  const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) }); p.on('pageerror', e => errs.push('PAGEERR ' + e.message))
  await p.goto('http://localhost:5174/student-care/x?branchId=demo_large', { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('.x-list tbody tr', { timeout: 60000 })
  await p.waitForTimeout(4000)
  await p.addStyleTag({ content: 'header[class*=header]{position:static!important}' })
  await p.addScriptTag({ content: audit })
  const full = w === 1600 && cs === 'light' ? names : ['문가영', '배준서', '성하윤', '탁예린', '구서아']
  for (const n of full) {
    await p.fill('.x-search', n); await p.waitForTimeout(200)
    const row = p.locator('.x-list tbody tr').first(); if (!(await row.count())) { L('NOROW', n); continue }
    await row.click(); await p.waitForTimeout(300)
    for (const tab of ['공부 시간', '입실 시각', '계획', '사진 관찰']) {
      await p.locator('.x-tabs button', { hasText: tab }).click(); await p.waitForTimeout(250)
      for (const per of ['일간', '주간']) {
        const sw = p.locator('.xs-seg button', { hasText: per }).first(); if (await sw.count()) { await sw.click(); await p.waitForTimeout(300) }
        const f = `x/${n}-${tab.replace(' ', '')}-${per}-${w}-${cs}.png`
        await p.locator('.x-panel').screenshot({ path: f })
        const a = await p.evaluate(() => { const r = window.__audit(document.querySelector('.x-panel')); return { ...r, marks: window.__marks(document.querySelector('.x-panel')) } })
        if (a.overlaps.length || a.clipped.length || a.lowContrast.length || a.marks.length) L(`[${w} ${cs}] ${n} ${tab} ${per}`, JSON.stringify(a))
      }
      await p.locator('.xs-seg button', { hasText: '일간' }).first().click().catch(() => {})
    }
  }
  await p.fill('.x-search', '')
  // list audit
  const la = await p.evaluate(() => window.__audit(document.querySelector('.x-list')))
  L(`[${w} ${cs}] LIST`, JSON.stringify({ clipped: la.clipped.slice(0, 5), low: la.lowContrast.slice(0, 8) }))
  const nameW = await p.evaluate(() => [...document.querySelectorAll('.x-list tbody tr td:nth-child(2)')].slice(0, 3).map(td => td.getBoundingClientRect().width + 'x' + td.getBoundingClientRect().height))
  L(`[${w} ${cs}] name cell`, nameW.join(','))
  await p.locator('.x-list').screenshot({ path: `x/list-${w}-${cs}.png` })
  // branch view
  await p.locator('.x-views button', { hasText: '학습관별' }).click(); await p.waitForTimeout(1500)
  await p.screenshot({ path: `x/branch-${w}-${cs}.png`, fullPage: true })
  const ba = await p.evaluate(() => ({ ...window.__audit(document.querySelector('.x-page')), marks: window.__marks(document.querySelector('.x-page')) }))
  L(`[${w} ${cs}] BRANCH`, JSON.stringify(ba))
  L(`[${w} ${cs}] errs`, errs.slice(0, 5).join(' | '), 'sw', await p.evaluate(() => document.documentElement.scrollWidth))
  await p.close()
}
fs.writeFileSync('x/audit-log.txt', log.join('\n'))
await b.close()
