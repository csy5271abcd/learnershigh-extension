import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
import fs from 'fs'
const O = 'D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/reviews/agent-review/round-1/도메인-전문가'
const names = (process.argv[2] ?? '배준서,탁예린,노은우,성하윤,구서아,염태윤,방시우,변지호,차민재,문가영,권하린').split(',')
const tabs = ['공부 시간','입실 시각','계획','사진 관찰']
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, colorScheme: 'light' })
await p.goto('http://localhost:5174/student-care/x?branchId=demo_large', { waitUntil: 'networkidle' })
await p.addStyleTag({ content: 'header[class*=header]{position:static!important}' })
await p.waitForTimeout(1500)
let out = ''
for (const n of names) {
  await p.fill('.x-search', n); await p.waitForTimeout(300)
  await p.locator('.x-list tbody tr').first().click(); await p.waitForTimeout(400)
  out += `\n##### ${n} badge: ${await p.locator('.x-list tbody tr').first().innerText()}\n`
  for (const t of tabs) {
    await p.locator('.x-tabs button', { hasText: t }).click(); await p.waitForTimeout(t === '사진 관찰' ? 2500 : 500)
    const panel = p.locator('.x-panel')
    await panel.screenshot({ path: `${O}/x-${n}-${t.replace(' ','')}.png` })
    out += `--- ${t}\n` + (await panel.innerText()).replace(/\n+/g, ' | ') + '\n'
  }
}
fs.writeFileSync(`${O}/x-detail-text.txt`, out)
await b.close()
