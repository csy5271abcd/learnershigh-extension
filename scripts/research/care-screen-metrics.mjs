// 학생 케어 화면의 복잡도 실측. 기존 화면과 개선안을 같은 조건으로 잰다.
// 전제: admin FE(5174)와 care backend(8081, care-demo DB 150/50/10명)가 떠 있어야 한다.
// 사용: node scripts/research/care-screen-metrics.mjs <path> <outDir> [widths] [themes]
//   예) node scripts/research/care-screen-metrics.mjs student-care out 1600 light
//       node scripts/research/care-screen-metrics.mjs student-care/ops out 1600,850,390 light,dark
//   (Git Bash 경로 변환을 피하려고 앞 슬래시를 생략한다)
// 측정값 (우회 방지: plan.md 5장)
//  - text: main 안 보이는 텍스트 글자 수(공백 제외). hiddenText: title 속성·툴팁·닫힌 details·aria-hidden 등 화면 밖 텍스트 글자 수
//  - firstScreenText: 첫 900px 안 텍스트 글자 수
//  - controls: 조작 요소 수(보조 지표). toggles: 펼침·접기·포함·제외 등 상태 전환 조작 수
//  - height: 문서 높이. innerScroll: main 안 내부 스크롤 영역의 (scrollHeight - clientHeight) 합. travel: (height + innerScroll) ÷ 900
//  - minFont: 보이는 텍스트의 최소 글자 크기(px)
//  - overflow: 문서 가로 넘침 여부
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const require = createRequire(new URL('../../e2e/package.json', import.meta.url))
const { chromium } = require('@playwright/test')
const [routeArg = 'student-care', outDir = 'care-metrics', widthArg = '1600', themeArg = 'light'] = process.argv.slice(2)
const route = '/' + routeArg.replace(/^\/+/, '')
const widths = widthArg.split(',').map(Number)
const themes = themeArg.split(',')
mkdirSync(outDir, { recursive: true })

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
  // P3·P4(plan-v5): 페이지 말고 실제로 스크롤되는 영역 수, 그중 가로로 스크롤되는 영역 수
  let scrollAreas = 0, hScrollAreas = 0
  for (const el of main.querySelectorAll('*')) {
    if (!visible(el)) continue
    const cs = getComputedStyle(el)
    const v = /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1
    const h = /(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1
    if (v || h) scrollAreas++
    if (h) hScrollAreas++
  }
  const height = document.documentElement.scrollHeight
  return { text, hiddenText, firstScreenText, controls: controls.length, toggles: toggles.length, height, innerScroll, travel: +((height + innerScroll) / 900).toFixed(1), scrollAreas, hScrollAreas, minFont: minFont === Infinity ? null : minFont, overflow: document.documentElement.scrollWidth > innerWidth + 1 }
}

const browser = await chromium.launch({ channel: 'chrome', args: ['--no-proxy-server'] })
const out = []
const errors = []
for (const theme of themes) for (const width of widths) {
  const page = await (await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme })).newPage()
  page.on('pageerror', (e) => errors.push(`${theme}/${width}: ${e.message}`))
  for (const branch of ['강남점', '분당점', '수지점']) {
    await page.goto(`http://localhost:5174${route}`)
    await page.waitForSelector('[role=tab]', { timeout: 30000 })
    await page.selectOption('select', { label: branch })
    await page.waitForTimeout(2500)
    const chosen = await page.$eval('select', (el) => el.options[el.selectedIndex].text)
    if (chosen !== branch) throw new Error(`지점 선택 실패: ${chosen} != ${branch}`)
    const expected = { 강남점: 150, 분당점: 50, 수지점: 10 }[branch]
    // 실제 명부 행 수로 인원을 확인한다(로딩 완료 포함). 기존 화면은 tr.rs-summary, 개선안은 [data-care-roster-row]
    await page.waitForFunction((n) => document.querySelectorAll('[data-care-roster-row], tr.rs-summary').length === n, expected, { timeout: 30000 })
      .catch(async () => { throw new Error(`${branch} 명부 행 ${await page.$$eval('[data-care-roster-row], tr.rs-summary', (e) => e.length)}개, 기대 ${expected}개`) })
    const tabs = await page.$$eval('[role=tab]', (els) => els.map((e) => e.textContent.trim()))
    for (const tab of tabs) {
      await page.click(`[role=tab]:has-text("${tab}")`)
      await page.waitForTimeout(2500)
      await page.evaluate(() => scrollTo(0, 0))
      const m = await page.evaluate(probe)
      const row = { route, theme, width, branch, tab, ...m }
      out.push(row)
      console.log(JSON.stringify(row))
      if (width === 1600 && theme === 'light') await page.screenshot({ path: path.join(outDir, `${route.replaceAll('/', '_')}-${branch}-${tab}.png`) })
      // 학생 상세: 첫 문제 학생을 열었을 때의 부담도 잰다(선택 후 렌더링으로 초기 수치를 줄이는 우회 방지)
      if (tab === '학생별') {
        const opener = await page.$('[data-care-open-student]') ?? await page.$('tr:has-text("상담 필요") button[aria-label$="상세 펼치기"]')
        if (!opener) throw new Error(`${branch} 학생별: 첫 문제 학생 상세를 여는 요소를 찾지 못함(data-care-open-student 필요)`)
        {
          const who = (await opener.getAttribute('data-care-open-student')) ?? (await opener.getAttribute('aria-label')).replace(/ 상세 (펼치기|접기)$/, '')
          await opener.click()
          // 그 학생의 상세가 실제로 열리고 로딩이 끝났는지 확인한다. 개선안은 [data-care-detail-student], 기존 화면은 .rs-detail h2
          await page.waitForFunction((name) => [...document.querySelectorAll('[data-care-detail-student], .rs-detail h2')].some((e) => (e.getAttribute('data-care-detail-student') ?? e.textContent).includes(name)) && !document.querySelector('.rs-detail [role=status]'), who, { timeout: 30000 })
            .catch(() => { throw new Error(`${branch}: ${who} 상세가 열리지 않음`) })
          await page.waitForTimeout(800); await page.evaluate(() => scrollTo(0, 0))
          const d = await page.evaluate(probe)
          const drow = { route, theme, width, branch, tab: '학생 상세(첫 문제 학생)', ...d }
          out.push(drow); console.log(JSON.stringify(drow))
          if (width === 1600 && theme === 'light') await page.screenshot({ path: path.join(outDir, `${route.replaceAll('/', '_')}-${branch}-detail.png`), fullPage: true })
        }
      }
    }
  }
  await page.context().close()
}
writeFileSync(path.join(outDir, `${route.replaceAll('/', '_')}-metrics.json`), JSON.stringify({ route, widths, themes, errors, rows: out }, null, 2))
console.log('pageerrors', errors.length)
await browser.close()
if (errors.length) { console.error(errors.join(' | ')); process.exit(1) }
