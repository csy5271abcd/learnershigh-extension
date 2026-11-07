// 개선안 학습관별 탭에서 목록·비교를 연 상태의 비용을 잰다(최종 채점 12차 지적: 초기 비용과 연 상태 비용 구분).
// 측정 함수는 care-screen-metrics.mjs와 같다. 사용: node scripts/research/care-open-state-metrics.mjs
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'
const require = createRequire(new URL('../../e2e/package.json', import.meta.url))
const { chromium } = require('@playwright/test')
const probe = () => {
  const main = document.querySelector('main') || document.body
  const hiddenBy = (el) => el.closest('[hidden],[aria-hidden="true"],.sc-visually-hidden,.lh-visually-hidden,details:not([open]) > :not(summary)')
  const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !hiddenBy(el) }
  let text = 0, firstScreenText = 0, hiddenText = 0, minFont = Infinity
  const w = document.createTreeWalker(main, NodeFilter.SHOW_TEXT)
  while (w.nextNode()) {
    const t = w.currentNode, el = t.parentElement
    const n = t.textContent.replace(/\s/g, '').length
    if (!el || !n) continue
    if (!visible(el)) { hiddenText += n; continue }
    text += n
    minFont = Math.min(minFont, parseFloat(getComputedStyle(el).fontSize))
    if (el.getBoundingClientRect().top + scrollY < 900) firstScreenText += n
  }
  for (const el of main.querySelectorAll('[title],[role=tooltip],[data-tooltip]')) hiddenText += ((el.getAttribute('title') || el.getAttribute('data-tooltip') || (el.getAttribute('role') === 'tooltip' && !visible(el) ? el.textContent : '')) || '').replace(/\s/g, '').length
  let innerScroll = 0
  for (const el of main.querySelectorAll('*')) {
    const cs = getComputedStyle(el)
    if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1) innerScroll += el.scrollHeight - el.clientHeight
  }
  const controls = [...main.querySelectorAll('button,a[href],input,select,textarea,summary,[role=button],[role=tab],[tabindex="0"]')].filter(visible)
  const toggles = controls.filter((el) => el.hasAttribute('aria-expanded') || el.hasAttribute('aria-pressed') || el.matches('input[type=checkbox],summary') || /펼치기|접기|제외|복원|더 보기|모두 보기/.test(el.textContent || ''))
  const height = document.documentElement.scrollHeight
  return { text, hiddenText, firstScreenText, controls: controls.length, toggles: toggles.length, height, innerScroll, travel: +((height + innerScroll) / 900).toFixed(1), minFont: minFont === Infinity ? null : minFont, overflow: document.documentElement.scrollWidth > innerWidth + 1 }
}

const browser = await chromium.launch({ channel: 'chrome', args: ['--no-proxy-server'] })
const out = []
for (const width of [1600, 850, 390]) {
  const p = await (await browser.newContext({ viewport: { width, height: 900 } })).newPage()
  await p.goto('http://localhost:5174/student-care/ops'); await p.waitForSelector('[data-care-roster-row]'); await p.waitForTimeout(2000)
  await p.click('[role=tab]:has-text("학습관별")'); await p.waitForTimeout(1000)
  const m = async (state) => { await p.evaluate(() => scrollTo(0, 0)); out.push({ width, state, ...(await p.evaluate(probe)) }) }
  await m('학습관 초기')
  await p.click('button[aria-label="10/22 결석 학생 보기"]'); await p.waitForTimeout(500); await m('10/22 결석 목록')
  await p.click('button[aria-label="10/22 학습 시간 학생별 보기"]'); await p.waitForTimeout(500); await m('10/22 학습 시간 목록(150명)')
  await p.locator('.ops-pin').nth(0).click(); await p.locator('.ops-pin').nth(0).click(); await p.waitForTimeout(400); await m('학습 시간 목록 + 비교 2명')
  await p.click('button[aria-label="학습 시간 7일 변화 학생 보기"]'); await p.waitForTimeout(500); await m('학습 시간 7일 감소 목록 + 비교 2명')
  await p.context().close()
}
await browser.close()
writeFileSync(new URL('../../docs/design/ops-redesign/open-state-metrics.json', import.meta.url), JSON.stringify(out, null, 2))
for (const r of out) console.log(r.width, r.state, r.text, r.controls, r.travel, r.overflow)
