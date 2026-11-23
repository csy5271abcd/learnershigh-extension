// HWP·HWPX 확정 준비 상태 점검표(읽기 전용) 브라우저 확인. adapter-e2e.mjs 실행 뒤 같은 Schema에서 실행한다(합성 자료).
// usage: node readiness-check.mjs <chrome.exe> <adapter-e2e 결과 json> <B run 폴더> <shot dir>
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'file:///C:/learnershigh-extension/e2e/node_modules/playwright/index.mjs'

const [chrome, adapterResult, runDir, shotDir] = process.argv.slice(2)
const revisions = JSON.parse(readFileSync(adapterResult, 'utf8')).summary.revisions
const results = []
const check = (name, ok, detail) => {
  results.push(ok)
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail !== undefined ? ' :: ' + JSON.stringify(detail).slice(0, 200) : ''}`)
}
const browser = await chromium.launch({ executablePath: chrome })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const puts = []
page.on('request', (request) => { if (request.method() === 'PUT') puts.push(request.url()) })
for (const [format, file] of [['HWP', join(runDir, 'synthetic', 'synthetic-plan.hwp')], ['HWPX', join(runDir, 'synthetic', 'synthetic-plan.hwpx')]]) {
  const { planId, revisionId } = revisions[format]
  await page.goto(`http://localhost:5174/assessment/evaluation-plans/${planId}/revisions/${revisionId}`)
  await page.getByTestId('multiformat-readiness').waitFor()
  const states = async () => Object.fromEntries(await page.getByTestId('readiness-item').evaluateAll((items) => items.map((li) => [li.dataset.key, li.dataset.state])))
  const initial = await states()
  check(`${format}: 처음 — 원본·해시·과목·항목 '아직', 원문 대조·확인·근거 저장 '승인 대기', analysisId '충족'`,
    initial.source === 'unmet' && initial.hash === 'unmet' && initial.subject === 'unmet' && initial.fields === 'unmet'
      && initial.manual === 'blocked' && initial.attest === 'blocked' && initial.store === 'blocked' && initial.analysis === 'met' && initial.auth === 'server', initial)
  await page.getByTestId('review-local-pdf').setInputFiles(file)
  await page.waitForTimeout(800)
  await page.locator('[data-testid=review-field-row][data-field-path="performanceEvaluation.items[0].weightPercent"]').getByRole('checkbox').check()
  await page.getByTestId('review-subject-id-0').fill('subj_14')
  const filled = await states()
  check(`${format}: 원본 선택·해시 일치·과목·항목·위치 '충족'이어도 승인 대기 3개는 그대로`,
    filled.source === 'met' && filled.hash === 'met' && filled.subject === 'met' && filled.fields === 'met' && filled.locator === 'met'
      && filled.manual === 'blocked' && filled.attest === 'blocked' && filled.store === 'blocked', filled)
  check(`${format}: 확인 체크·확정 버튼 비활성, PUT 없음`, (await page.getByTestId('review-attest').isDisabled()) && (await page.getByTestId('review-confirm').isDisabled()) && puts.length === 0, null)
  await page.getByTestId('multiformat-readiness').screenshot({ path: `${shotDir}/${format.toLowerCase()}-readiness.png` })
}
await browser.close()
console.log(JSON.stringify({ pass: results.filter(Boolean).length, fail: results.filter((ok) => !ok).length }))
