// 5173 결과물 뷰어에서 새 한글 버전(PDF·PNG) 표시 확인 + 캡처. 쓰기 없음.
import { readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'file:///C:/learnershigh-extension/e2e/node_modules/playwright/index.mjs'
const [chrome, outDir] = process.argv.slice(2)
const data = JSON.parse(readFileSync('artifact-improvement.json', 'utf8')).results.filter((r) => r.versionId && r.sid === 'stu_demo_041')
const browser = await chromium.launch({ executablePath: chrome })
const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: 'ko-KR' })).newPage()
const results = []
for (const r of data) {
  await page.goto(`http://localhost:5173/assessment/artifacts/${r.artifactId}/viewer?v=${r.versionId}&devStudent=${r.sid}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(5000)
  const info = await page.evaluate(() => ({ canvas: document.querySelectorAll('canvas, iframe, embed, object').length, img: [...document.images].filter((i) => i.complete && i.naturalWidth > 0).length, text: document.body.innerText.slice(0, 4000) }))
  const ok = (info.canvas + info.img) > 0 && info.text.includes(`v${r.versionNumber}`)
  results.push({ file: r.fileName, versionNumber: r.versionNumber, rendered: info.canvas + info.img, ok })
  console.log(ok ? 'PASS' : 'FAIL', r.fileName, `v${r.versionNumber}`, info)
  await page.screenshot({ path: `${outDir}/student-artifact-${r.fileName.endsWith('.png') ? 'png' : 'pdf'}-korean.png` })
}
await browser.close()
writeFileSync(`${outDir}/e2e-artifacts.json`, JSON.stringify(results, null, 2) + '\n')
