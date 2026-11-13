// 대표 학생 보강본 화면 확인 (실제 5173·5174, 쓰기 없음). 노트 최신 Revision·PDF·PNG 새 버전·관리자 열람·전환 패널 이름.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'file:///C:/learnershigh-extension/e2e/node_modules/playwright/index.mjs'
const [chrome, outDir] = process.argv.slice(2)
const data = JSON.parse(readFileSync('demo-enrichment.json', 'utf8')).results
const manifest = JSON.parse(readFileSync('../assessment-15schools-60students-seed-202611/SEED-MANIFEST.json', 'utf8'))
const admins = { stu_demo_001: 'adm_demo_a01', stu_demo_026: 'adm_demo_b01', stu_demo_041: 'adm_demo_c01' }
const results = []
const check = (name, ok, detail) => { results.push({ name, pass: Boolean(ok), detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail !== undefined ? ' :: ' + JSON.stringify(detail).slice(0, 160) : ''}`) }
const browser = await chromium.launch({ executablePath: chrome })
const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' })).newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
const noteValues = () => page.evaluate(() => [...document.querySelectorAll('[aria-label="노트 본문"] textarea, input[placeholder="노트 제목"]')].map((e) => e.value).join(' '))
for (const r of data) {
  const aId = manifest.students[r.sid].note.assessmentId
  await page.goto(`http://localhost:5173/assessment/school-assessments/${aId}?devStudent=${r.sid}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4000)
  const text = await page.locator('body').innerText()
  check(`${r.sid}: 전환 패널 새 이름 ${r.name} · ${r.school}`, text.includes(`시연 학생: ${r.name} · ${r.school}`))
  check(`${r.sid}: 노트 최신 v${r.note.to} 보강 본문`, text.includes(`v${r.note.to}`) && (await noteValues()).includes(r.topic.slice(0, 12)))
  await page.screenshot({ path: join(outDir, `enrich-${r.sid}-student-note.png`) })
  for (const f of r.files.filter((x) => x.versionId)) {
    await page.goto(`http://localhost:5173/assessment/artifacts/${f.artifactId}/viewer?v=${f.versionId}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(4000)
    const shown = await page.evaluate(() => document.querySelectorAll('canvas, iframe, embed, object').length + [...document.images].filter((i) => i.complete && i.naturalWidth > 0).length)
    const t = await page.locator('body').innerText()
    check(`${r.sid}: 학생 뷰어 ${f.fileName} ${f.version}`, shown > 0 && t.includes(f.fileName), shown)
    await page.screenshot({ path: join(outDir, `enrich-${r.sid}-viewer-${f.fileName.endsWith('.png') ? 'png' : 'pdf'}.png`) })
  }
  // 관리자(담당 지점) 같은 노트·결과물
  await page.goto(`http://localhost:5174/assessment/students/${r.sid}/school/${aId}?devAdmin=${admins[r.sid]}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3500)
  await page.getByRole('tab', { name: '관리자 기록 도구' }).or(page.getByRole('button', { name: '관리자 기록 도구' })).first().click().catch(() => {})
  await page.waitForTimeout(2500)
  const at = await page.locator('body').innerText()
  check(`${admins[r.sid]}: ${r.sid} 노트 v${r.note.to} 보강 본문`, at.includes(r.topic) || at.includes(r.topic.slice(0, 12)))
  check(`${admins[r.sid]}: ${r.sid} 결과물 새 파일 이름 표시`, r.files.filter((x) => x.versionId).every((f) => at.includes(f.fileName)), r.files.map((f) => f.fileName))
  await page.screenshot({ path: join(outDir, `enrich-${r.sid}-admin-record.png`) })
}
writeFileSync(join(outDir, 'e2e-enrichment.json'), JSON.stringify({ at: new Date().toISOString(), results, pageErrors: errors }, null, 2) + '\n')
console.log(`== enrichment: ${results.filter((x) => x.pass).length}/${results.length} PASS · pageErrors ${errors.length}`)
await browser.close()
