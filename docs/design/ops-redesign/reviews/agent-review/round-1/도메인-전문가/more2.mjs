import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
import fs from 'fs'
const O = 'D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/reviews/agent-review/round-1/도메인-전문가'
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, colorScheme: 'light' })
const css = 'header[class*=header]{position:static!important}.z-overlay{position:static!important}.z-dialog{max-height:none!important;overflow:visible!important}'
let out = ''
const save = () => fs.writeFileSync(`${O}/more-text.txt`, out)
await p.goto('http://localhost:5174/student-care/x?branchId=demo_large', { waitUntil: 'networkidle' }); await p.addStyleTag({ content: css }); await p.waitForTimeout(1200)
await p.locator('.x-views button', { hasText: '학습관별' }).click(); await p.waitForTimeout(3500)
out += '\n#### X branch\n' + (await p.evaluate(() => document.querySelector('.x-page')?.innerText ?? '')).replace(/\n+/g,' | '); save()
await p.goto('http://localhost:5174/student-care/z2?branchId=demo_large', { waitUntil: 'networkidle' }); await p.addStyleTag({ content: css }); await p.waitForTimeout(1200)
await p.locator('.z-tabs button', { hasText: '학습관' }).click(); await p.waitForTimeout(3500)
out += '\n#### Z2 branch\n' + (await p.evaluate(() => document.querySelector('.z-body')?.innerText ?? '')).replace(/\n+/g,' | '); save()
for (const n of ['배준서','노은우','탁예린','성하윤','방시우','염태윤','문가영','구서아']) {
  try {
    await p.goto('http://localhost:5174/student-care/z2?branchId=demo_large', { waitUntil: 'networkidle' }); await p.addStyleTag({ content: css }); await p.waitForTimeout(2500)
    await p.locator('[data-care-roster-row]', { hasText: n }).first().click({ timeout: 5000 }); await p.waitForTimeout(2500)
    const d = p.locator('.z-dialog'); await d.screenshot({ path: `${O}/z2-${n}-detail.png`, timeout: 8000 })
    out += `\n#### Z2 ${n}\n` + (await d.innerText()).replace(/\n+/g,' | ')
  } catch (e) { out += `\n#### Z2 ${n} FAIL ${String(e).slice(0,120)}` }
  save()
}
for (const id of ['demo_s302','demo_s304','demo_s303','demo_s306','demo_s308']) {
  await p.goto(`http://localhost:5174/student-care/y?branchId=demo_large&student=${id}`, { waitUntil: 'networkidle' }); await p.addStyleTag({ content: css }); await p.waitForTimeout(5000)
  await p.screenshot({ path: `${O}/y-${id}-page.png`, fullPage: true })
  out += `\n#### Y ${id}\n` + (await p.evaluate(() => { const e = document.querySelector('[aria-expanded="true"]')?.closest('tr, li, section, div'); return (e?.parentElement?.innerText ?? 'no expanded') })).replace(/\n+/g,' | ').slice(0, 3000)
  save()
}
await b.close()
