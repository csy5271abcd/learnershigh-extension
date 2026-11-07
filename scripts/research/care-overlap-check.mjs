// 개선안 화면의 글자 겹침 검사. 보이는 텍스트 조각(줄 단위 사각형)끼리 서로 다른 요소에서 겹치면 실패로 센다.
// 문서 가로 넘침 검사로는 칸 안 글자 겹침을 잡지 못한다는 최종 채점(F12-01·02) 반영.
// 사용: node scripts/research/care-overlap-check.mjs  (겹침이 있으면 종료 코드 1)
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'

const require = createRequire(new URL('../../e2e/package.json', import.meta.url))
const { chromium } = require('@playwright/test')

const probe = () => {
  const boxes = []
  const tw = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  const clipped = (el, r) => { for (let e = el; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (/(hidden|auto|scroll|clip)/.test(cs.overflowX + cs.overflowY)) { const c = e.getBoundingClientRect(); if (r.right <= c.left + 1 || r.left >= c.right - 1 || r.bottom <= c.top + 1 || r.top >= c.bottom - 1) return true } } return false }
  while (tw.nextNode()) {
    const t = tw.currentNode, el = t.parentElement
    if (!el || !t.textContent.trim()) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none' || el.closest('[hidden],[aria-hidden="true"],.lh-visually-hidden,.sc-visually-hidden')) continue
    range.selectNodeContents(t)
    // 다른 요소(예: 고정된 첫 열의 배경)에 덮여 실제로 보이지 않는 글자 조각은 겹침 판정에서 뺀다
    const visibleAt = (r) => { const x = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1), y = Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1); const hit = document.elementFromPoint(x, y); return !hit || hit === el || el.contains(hit) || hit.contains(el) }
    for (const r of range.getClientRects()) if (r.width > 1 && r.height > 1 && !clipped(el, r) && (r.bottom < 0 || r.top > innerHeight || visibleAt(r))) boxes.push({ el, r, sy: scrollY, text: t.textContent.trim().slice(0, 20) })
  }
  const hits = []
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j]
    if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue
    const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top)
    if (!(w > 1 && h > 2)) continue
    // 겹친 영역의 가운데에서 맨 위 요소가 둘 중 하나뿐이면, 다른 쪽은 배경에 가려진 것(고정 열 아래로 스크롤된 칸)이지 글자 겹침이 아니다
    // 사각형은 수집 당시 스크롤 위치 기준이므로, 지금 스크롤 위치로 바꿔서 잰다
    let x = Math.max(a.r.left, b.r.left) + w / 2, y = Math.max(a.r.top, b.r.top) + h / 2 + a.sy - scrollY
    // 화면 밖이면 그 위치가 보이도록 세로로 옮긴 뒤 다시 잰다(가림 여부는 화면 안에서만 알 수 있음)
    // 화면 밖이거나 앱 머리글(고정) 아래에 깔린 위치면 화면 가운데로 옮긴 뒤 다시 잰다(가림 여부는 보이는 위치에서만 알 수 있음)
    let probeTop = y >= 0 && y < innerHeight ? document.elementFromPoint(x, y) : null
    if (!probeTop || !document.querySelector('main').contains(probeTop)) { const dy = y - innerHeight / 2; scrollBy(0, dy); y -= dy; probeTop = null }
    const top = probeTop ?? (x >= 0 && y >= 0 && x < innerWidth && y < innerHeight ? document.elementFromPoint(x, y) : null)
    const owns = (box) => top && (top === box.el || box.el.contains(top) || top.contains(box.el))
    if (top && owns(a) !== owns(b)) continue
    hits.push(`${a.text} ↔ ${b.text} (${w.toFixed(1)}×${h.toFixed(1)})`)
  }
  return hits
}

const browser = await chromium.launch({ channel: 'chrome', args: ['--no-proxy-server'] })
const out = []
for (const theme of ['light', 'dark']) for (const width of [1600, 850, 390]) {
  const p = await (await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme })).newPage()
  const errs = []; p.on('pageerror', (e) => errs.push(e.message))
  await p.goto('http://localhost:5174/student-care/ops'); await p.waitForSelector('[data-care-roster-row]'); await p.waitForTimeout(2500)
  const states = []
  states.push(['학생별+상세', await p.evaluate(probe)])
  await p.click('[role=tab]:has-text("학습관별")'); await p.waitForTimeout(1200)
  states.push(['학습관 초기', await p.evaluate(probe)])
  await p.click('button[aria-label="10/22 결석 학생 보기"]'); await p.waitForTimeout(600)
  states.push(['학습관 10/22 결석', await p.evaluate(probe)])
  await p.click('button[aria-label="10/22 학습 시간 학생별 보기"]'); await p.waitForTimeout(600)
  await p.locator('.ops-pin').nth(0).click(); await p.locator('.ops-pin').nth(0).click(); await p.waitForTimeout(500)
  states.push(['학습관 10/22 학습+비교 2명', await p.evaluate(probe)])
  // 표를 오른쪽 끝까지 넘겨도 지표 이름 칸이 보이는지
  const sticky = await p.evaluate(() => { const s = document.querySelector('.ops-bt'); s.scrollLeft = s.scrollWidth; const h = document.querySelector('.ops-bt-row:nth-child(2) > span:first-child').getBoundingClientRect(); const c = s.getBoundingClientRect(); return h.left >= c.left - 1 && h.right <= c.right + 1 })
  await p.click('button[aria-label="10/22 입실 시각 학생별 보기"]'); await p.waitForTimeout(600)
  states.push(['학습관 10/22 입실+비교', await p.evaluate(probe)])
  await p.click('[role=tab]:has-text("관리 이력")'); await p.waitForTimeout(2000)
  states.push(['관리 이력', await p.evaluate(probe)])
  for (const [state, hits] of states) out.push({ theme, width, state, overlaps: hits.length, sample: hits.slice(0, 3) })
  out.push({ theme, width, state: '학습관 표 지표 이름 고정', ok: sticky })
  out.push({ theme, width, state: 'pageerror', overlaps: errs.length, sample: errs.slice(0, 2) })
  await p.context().close()
}
await browser.close()
writeFileSync(new URL('../../docs/design/ops-redesign/overlap-check.json', import.meta.url), JSON.stringify(out, null, 2))
const bad = out.filter((r) => r.overlaps > 0 || r.ok === false)
for (const r of bad) console.log(JSON.stringify(r))
console.log(`검사 ${out.length}건, 실패 ${bad.length}건`)
process.exit(bad.length ? 1 : 0)
