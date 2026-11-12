import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
import fs from 'fs'
const O = 'D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/reviews/agent-review/round-1/도메인-전문가'
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, colorScheme: 'light' })
const css = 'header[class*=header]{position:static!important}.z-overlay{position:static!important}.z-dialog{max-height:none!important;overflow:visible!important}'
let out = ''
// X branch
await p.goto('http://localhost:5174/student-care/x?branchId=demo_large', { waitUntil: 'networkidle' }); await p.addStyleTag({ content: css }); await p.waitForTimeout(1200)
await p.locator('.x-views button', { hasText: '학습관별' }).click(); await p.waitForTimeout(3500)
await p.screenshot({ path: `${O}/x-branch-full.png`, fullPage: true }); out += '\n#### X branch\n' + (await p.evaluate(() => document.querySelector('.x-page')?.innerText ?? '')).replace(/\n+/g,' | ')
// Z2 branch tab
await p.goto('http://localhost:5174/student-care/z2?branchId=demo_large', { waitUntil: 'networkidle' }); await p.addStyleTag({ content: css }); await p.waitForTimeout(1200)
await p.locator('.z-tabs button', { hasText: '학습관' }).click(); await p.waitForTimeout(3500)
await p.screenshot({ path: `${O}/z2-branch-full.png`, fullPage: true }); out += '\n#### Z2 branch\n' + (await p.evaluate(() => document.querySelector('.z-body')?.innerText ?? '')).replace(/\n+/g,' | ')
// Z2 details
for (const n of ['배준서','노은우','탁예린','성하윤','방시우','염태윤','문가영']) {
  await p.goto('http://localhost:5174/student-care/z2?branchId=demo_large', { waitUntil: 'networkidle' }); await p.addStyleTag({ content: css }); await p.waitForTimeout(2500)
  await p.locator(`[data-care-roster-row]`, { hasText: n }).first().click().catch(async()=>{ await p.locator(".z-body li, .z-body button", { hasText: n }).first().click() }); await p.waitForTimeout(2500)
  const d = p.locator(".z-dialog"); if (!(await d.count())) { out += "
({ path: `${O}/z2-${n}-detail.png` })
  out += `\n#### Z2 ${n}\n` + (await d.innerText()).replace(/\n+/g,' | ')
}
// Y rows
for (const id of ['demo_s302','demo_s304','demo_s303','demo_s306']) {
  await p.goto(`http://localhost:5174/student-care/y?branchId=demo_large&student=${id}`, { waitUntil: 'networkidle' }); await p.addStyleTag({ content: css }); await p.waitForTimeout(4000)
  const row = p.locator('[aria-expanded="true"], .y-open, tr.y-on').first()
  await p.screenshot({ path: `${O}/y-${id}-page.png`, fullPage: true })
  out += `\n#### Y ${id}\n` + (await p.evaluate(() => document.body.innerText)).replace(/\n+/g,' | ').slice(0, 200)
}
fs.writeFileSync(`${O}/more-text.txt`, out)
await b.close()
