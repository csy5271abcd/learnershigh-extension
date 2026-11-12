import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
const OUT = 'D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/reviews/agent-review/시니어-디자이너/'
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } })
for (const v of ['x', 'y', 'z2']) {
  await p.goto(`http://localhost:5174/student-care/${v}`)
  await p.waitForTimeout(4000)
  await p.addStyleTag({ content: 'header[class*=header]{position:static!important}' })
  await p.screenshot({ path: OUT + `orient-${v}.png`, fullPage: true })
  const txt = await p.evaluate(() => document.body.innerText.slice(0, 2500))
  console.log('=====', v, '\n', txt)
}
await b.close()
