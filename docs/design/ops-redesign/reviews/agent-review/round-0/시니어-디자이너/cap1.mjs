import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
const out = process.argv[2] ?? '.'
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const errs = []
for (const scheme of ['light','dark']) for (const w of [1600,1280,1024]) for (const v of ['x','y','z2']) {
  const p = await b.newPage({ viewport: { width: w, height: 1000 }, colorScheme: scheme })
  p.on('console', m => { if (m.type()==='error') errs.push(`${v} ${w} ${scheme}: ${m.text()}`) })
  await p.goto(`http://localhost:5174/student-care/${v}`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(1500)
  await p.addStyleTag({ content: 'header[class*=header]{position:static!important}' })
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  await p.screenshot({ path: `${out}/${v}-${w}-${scheme}.png`, fullPage: true })
  console.log(v, w, scheme, 'hoverflow', ov)
  await p.close()
}
console.log(errs.join('\n'))
await b.close()
