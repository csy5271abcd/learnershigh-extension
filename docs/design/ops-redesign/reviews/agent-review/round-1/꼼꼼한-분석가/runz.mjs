import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
import fs from 'fs'
const audit = fs.readFileSync('audit.js', 'utf8')
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const board = JSON.parse(fs.readFileSync('board.json', 'utf8'))
const idOf = Object.fromEntries(board.students.map(s => [s.studentName, s.studentId]))
const names = '문가영 배준서 성하윤 노은우 차민재 구서아 변지호 염태윤 탁예린 방시우 권유진 장수빈 권하린 강도현'.split(' ')
const log = []; const L = (...a) => { const s = a.join(' '); log.push(s); console.log(s) }
const prep = async (p) => { await p.addStyleTag({ content: 'header[class*=header]{position:static!important}' }); await p.addScriptTag({ content: audit }) }
for (const [w, cs] of [[1600, 'light'], [1280, 'dark'], [1024, 'light']]) {
  const p = await b.newPage({ viewport: { width: w, height: 1000 }, colorScheme: cs })
  const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) }); p.on('pageerror', e => errs.push('PAGEERR ' + e.message))
  await p.goto('http://localhost:5174/student-care/z2?branchId=demo_large', { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('.z-roster', { timeout: 60000 }); await p.waitForTimeout(5000)
  await prep(p)
  await p.screenshot({ path: `z2/roster-${w}-${cs}.png`, fullPage: true })
  L(`[${w} ${cs}] ROSTER`, JSON.stringify(await p.evaluate(() => { const a = window.__audit(document.querySelector('.z-roster')); return { o: a.overlaps.length, c: a.clipped.slice(0, 6), low: a.lowContrast.slice(0, 8) } })))
  L(`[${w} ${cs}] sw`, await p.evaluate(() => document.documentElement.scrollWidth))
  const full = w === 1600 && cs === 'light' ? names : ['문가영', '배준서', '성하윤', '탁예린', '구서아']
  for (const n of full) {
    const btn = p.locator(`#z-row-${idOf[n]}`)
    if (!(await btn.count())) { L('NOROW', n); continue }
    L(`[${w} ${cs}] ROWTEXT ${n}`, (await btn.innerText()).replace(/\s+/g, ' '))
    await btn.click(); await p.waitForSelector('.z-dialog'); await p.waitForTimeout(1200)
    for (const per of ['일간', '주간']) {
      const segs = p.locator('.z-dialog .zz-seg button', { hasText: per }); if (await segs.count()) { await segs.first().click(); await p.waitForTimeout(400) }
      await p.addStyleTag({ content: '.z-overlay{position:static!important}.z-dialog{max-height:none!important;overflow:visible!important}' })
      await p.waitForTimeout(300)
      await p.locator('.z-dialog').screenshot({ path: `z2/${n}-${per}-${w}-${cs}.png` })
      const a = await p.evaluate(() => ({ ...window.__audit(document.querySelector('.z-dialog')), marks: window.__marks(document.querySelector('.z-dialog')) }))
      if (a.overlaps.length || a.clipped.length || a.lowContrast.length || a.marks.length) L(`[${w} ${cs}] ${n} ${per} AUDIT`, JSON.stringify(a))
      const titles = await p.evaluate(() => [...document.querySelectorAll('.z-dialog .zz-card-head h3, .z-dialog .zz-sub, .z-dialog summary')].map(x => x.innerText.replace(/\s+/g, ' ')))
      L(`[${w} ${cs}] ${n} ${per} TITLES`, titles.join(' | '))
    }
    await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForSelector('.z-roster'); await p.waitForTimeout(3000)
    await prep(p)
  }
  // Esc / keyboard check
  const first = p.locator('.z2r-rows button').first()
  await first.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(800)
  const opened = await p.locator('.z-dialog').count()
  await p.keyboard.press('Escape'); await p.waitForTimeout(500)
  L(`[${w} ${cs}] kbd open`, opened, 'after esc', await p.locator('.z-dialog').count(), 'focus', await p.evaluate(() => document.activeElement?.id))
  await p.locator('.z-tabs button', { hasText: '학습관' }).click(); await p.waitForTimeout(2500)
  await p.screenshot({ path: `z2/branch-${w}-${cs}.png`, fullPage: true })
  L(`[${w} ${cs}] BRANCH`, JSON.stringify(await p.evaluate(() => { const a = window.__audit(document.querySelector('.z-body')); return { o: a.overlaps, c: a.clipped.slice(0, 6), low: a.lowContrast.slice(0, 8), m: window.__marks(document.querySelector('.z-body')) } })))
  L(`[${w} ${cs}] errs`, errs.slice(0, 5).join(' | '))
  await p.close()
}
fs.writeFileSync('z2/audit-log.txt', log.join('\n'))
await b.close()
