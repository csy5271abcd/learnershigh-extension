// 최종 시안 X·Y·Z′ 캡처와 글자 겹침 측정. node fshot.mjs <out> [variants=x,y,z2] [widths=1600,1280] [schemes=light,dark] [students=...]
import fs from 'node:fs/promises'
import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
const [out, vArg, widthsArg, schemesArg, studentsArg] = process.argv.slice(2)
await fs.mkdir(out, { recursive: true })
const variants = (vArg ?? 'x,y,z2').split(',')
const widths = (widthsArg ?? '1600,1280').split(',').map(Number)
const schemes = (schemesArg ?? 'light,dark').split(',')
const students = (studentsArg ?? '권유진,장수빈,강도현').split(',')
const browser = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const report = []

async function measure(page, sel) {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel)
    if (!root) return { overlaps: ['(없음)'], outside: [] }
    const rects = []
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue
      const el = n.parentElement
      if (el.closest('select, option')) continue
      const range = document.createRange(); range.selectNodeContents(n)
      // 넘침을 잘라 보이지 않게 한 칸(말줄임)은 보이는 부분만 잰다
      let clip = null
      for (let a = el; a && a !== root.parentElement; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.overflow === 'hidden' || cs.overflowX === 'hidden') { clip = a.getBoundingClientRect(); break } }
      for (const r0 of range.getClientRects()) {
        if (r0.width <= 0) continue
        const r = clip ? new DOMRect(Math.max(r0.left, clip.left), r0.top, Math.max(0, Math.min(r0.right, clip.right) - Math.max(r0.left, clip.left)), r0.height) : r0
        if (r.width > 0) rects.push({ t: n.textContent.trim(), r, el })
      }
    }
    const overlaps = []
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i].r, b = rects[j].r
      if (rects[i].el !== rects[j].el && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overlaps.push(`${rects[i].t} × ${rects[j].t}`)
    }
    // 글자와 기준선·막대가 겹치는지(눈금 격자·날짜 눈금·축은 빼고). 막대 안 흰 글자(n2-inbar)는 의도라 뺀다
    const shapes = [...root.querySelectorAll('svg line, svg rect, svg circle')].filter((e) => !/(^|[\s-])(grid|daytick|axis|hit|track)(\s|$)|recent|band|usual/.test(e.getAttribute('class') ?? '') && e.getBoundingClientRect().width > 0)
    for (const t of rects) {
      if (t.el.closest('.n2-inbar') || !t.el.closest('svg')) continue
      for (const sh of shapes) { const b = sh.getBoundingClientRect(); const a = t.r; if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) { overlaps.push(`${t.t} × ${sh.getAttribute('class') ?? sh.tagName}`); break } }
    }
    const box = root.getBoundingClientRect()
    const outside = rects.filter((x) => x.r.right > box.right + 1 || x.r.left < box.left - 1).map((x) => x.t)
    return { overlaps: [...new Set(overlaps)], outside }
  }, sel)
}
const imgsDone = (page) => page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 15000 }).catch(() => {})
async function shot(page, sel, file, key) {
  // 기간: 파일 이름이 -w 로 끝나지 않으면 일간으로 맞춘다(일간·주간 선택은 화면 안에서 유지되므로)
  if (!file.endsWith('-w')) { const d = page.locator(`${sel} .vs-seg button, ${sel} .xs-seg button`, { hasText: '일간' }).first(); if (await d.count()) await d.click({ force: true }) }
  await imgsDone(page)
  // 앱 머리줄(고정)이 요소 캡처 위에 겹쳐 찍히지 않게
  await page.addStyleTag({ content: 'header[class*=header]{position:static!important}' })
  await page.waitForTimeout(400)
  const el = await page.$(sel)
  if (!el) { console.log('missing', sel, file); return }
  await el.screenshot({ path: `${out}/${file}.png` })
  report.push({ file, ...key, ...(await measure(page, sel)) })
}

for (const scheme of schemes) for (const width of widths) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, colorScheme: scheme, deviceScaleFactor: 1 })
  for (const v of variants) for (const name of students) {
    const key = { v, name, width, scheme }
    const tag = `${v}-${name}-${width}-${scheme}`
    if (v === 'x') {
      await page.goto('http://localhost:5174/student-care/x', { waitUntil: 'domcontentloaded', timeout: 180000 })
      await page.waitForSelector('.x-list tbody tr', { timeout: 60000 })
      await page.fill('.x-search', name); await page.waitForTimeout(300); await page.locator('.x-list tbody tr', { hasText: name }).first().click()
      for (const [tab, label] of [['study', '공부 시간'], ['start', '입실 시각'], ['plan', '계획'], ['vision', '사진 관찰']]) {
        await page.getByRole('tab', { name: label, exact: true }).click()
        if (tab === 'vision') { await page.waitForSelector('.xe-log, .x-panel [role=alert]', { timeout: 60000 }); const row = page.locator('.xe-table tbody tr').first(); if (await row.count()) await row.click() }
        await shot(page, '.x-panel', `${tag}-${tab}`, { ...key, tab })
        if (await page.locator('.x-panel .xs-seg button', { hasText: '주간' }).count()) { for (const b of await page.locator('.x-panel .xs-seg button', { hasText: '주간' }).all()) await b.click({ force: true }); await shot(page, '.x-panel', `${tag}-${tab}-w`, { ...key, tab: `${tab}-w` }) }
      }
    } else if (v === 'y') {
      await page.goto('http://localhost:5174/student-care/y', { waitUntil: 'domcontentloaded', timeout: 180000 })
      await page.waitForSelector('.y-table tbody tr', { timeout: 120000 })
      await page.waitForFunction(() => !document.querySelector('.y-toolbar [role=status]'), null, { timeout: 120000 }).catch(() => {})
      if (name === students[0]) { await page.waitForTimeout(500); await page.addStyleTag({ content: 'header[class*=header]{position:static!important}' }); await page.screenshot({ path: `${out}/y-table-${width}-${scheme}.png` }); report.push({ file: `y-table-${width}-${scheme}`, ...key, name: 'table', ...(await measure(page, '.y-card')) }) }
      await page.locator('.y-table tbody tr', { hasText: name }).first().click()
      await page.waitForSelector('.y-detail .y-rows', { timeout: 30000 }); await page.waitForFunction(() => !document.querySelector('.y-detail')?.innerText.includes('불러오는 중'), null, { timeout: 120000 }).catch(() => {})
      await page.addStyleTag({ content: '.y-table thead th{position:static!important} header[class*=header]{position:static!important}' })
      await shot(page, '.y-detail', tag, key)
    } else {
      await page.goto('http://localhost:5174/student-care/z2', { waitUntil: 'domcontentloaded', timeout: 180000 })
      await page.waitForSelector('[id^="z-row-"]', { timeout: 60000 })
      await page.locator('[id^="z-row-"]', { hasText: name }).first().click()
      await page.waitForSelector('.z2-detail', { timeout: 30000 })
      await page.waitForSelector('.zp, .z2-detail .zz-note[role=alert]', { timeout: 60000 })
      await page.evaluate(() => document.querySelectorAll('.z2-detail details').forEach((d) => { d.open = true }))
      await page.addStyleTag({ content: '.z-overlay{position:static!important;overflow:visible!important}.z-dialog{max-height:none!important;overflow:visible!important}.z-detail-nav{position:static!important}' })
      await page.waitForTimeout(400)
      await shot(page, '.z2-detail', tag, key)
    }
  }
  await page.close()
}
await browser.close()
await fs.writeFile(`${out}/measure.json`, JSON.stringify(report, null, 1))
const bad = report.filter((r) => r.overlaps.length || r.outside.length)
for (const r of bad) console.log(r.file, 'overlap', r.overlaps.length, r.overlaps.slice(0, 4).join(' | '), 'outside', r.outside.slice(0, 3).join(' | '))
console.log('shots', report.length, 'with problems', bad.length)
