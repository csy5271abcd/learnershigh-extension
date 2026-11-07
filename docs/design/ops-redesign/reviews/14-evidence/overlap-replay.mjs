// 개선안 화면의 글자 겹침 검사. 보이는 텍스트 조각(줄 단위 사각형)끼리 서로 다른 요소에서 겹치면 실패로 센다.
// 문서 가로 넘침 검사로는 칸 안 글자 겹침을 잡지 못한다는 최종 채점(F12-01·02) 반영.
// 사용: node scripts/research/care-overlap-check.mjs  (겹침이 있으면 종료 코드 1)
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'

const require = createRequire(new URL('../../../../../e2e/package.json', import.meta.url))
const { chromium } = require('@playwright/test')

const probe = () => {
  const boxes = []
  const tw = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  const clipped = (el, r) => { for (let e = el; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (/(hidden|auto|scroll|clip)/.test(cs.overflowX + cs.overflowY)) { const c = e.getBoundingClientRect(); if (r.right <= c.left + 1 || r.left >= c.right - 1 || r.bottom <= c.top + 1 || r.top >= c.bottom - 1) return true } } return false }
  // 가림 판정: 그 지점의 요소 쌓임(elementsFromPoint)에서 글자 요소보다 위에 있는, 글자 요소의 조상이 아닌 불투명 배경 요소가 있으면 가려진 것이다.
  // 위에 있는 요소가 배경 없는 글자이면 가림이 아니라 겹침이다(13차 심사의 반례: 맨 위 글자만 보고 겹침을 빼던 결함 수정).
  const opaque = (e) => { const m = getComputedStyle(e).backgroundColor.match(/rgba?\(([^)]+)\)/); if (!m) return false; const v = m[1].split(',').map(Number); return v.length < 4 || v[3] > 0.5 }
  const occluded = (el, x, y) => {
    const stack = document.elementsFromPoint(x, y)
    const idx = stack.findIndex((e) => e === el || el.contains(e))
    if (idx < 0) return true
    return stack.slice(0, idx).some((e) => !e.contains(el) && opaque(e))
  }
  // 화면 밖이면 그 위치가 화면 가운데 오도록 세로로 옮긴 뒤 판정한다(가림은 보이는 위치에서만 알 수 있음)
  const atView = (r, sy, fn) => {
    let y = r.top + r.height / 2 + sy - scrollY
    if (y < 80 || y > innerHeight - 1) { scrollBy(0, y - innerHeight / 2); y = r.top + r.height / 2 + sy - scrollY }
    const x = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1)
    return fn(x, y)
  }
  while (tw.nextNode()) {
    const t = tw.currentNode, el = t.parentElement
    if (!el || !t.textContent.trim()) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none' || el.closest('[hidden],[aria-hidden="true"],.lh-visually-hidden,.sc-visually-hidden')) continue
    range.selectNodeContents(t)
    for (const r of range.getClientRects()) if (r.width > 1 && r.height > 1 && !clipped(el, r)) boxes.push({ el, r, sy: scrollY, text: t.textContent.trim().slice(0, 20) })
  }
  const hits = []
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j]
    if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue
    const ay = a.r.top + a.sy, by = b.r.top + b.sy
    const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), h = Math.min(ay + a.r.height, by + b.r.height) - Math.max(ay, by)
    if (!(w > 1 && h > 2)) continue
    const cx = Math.max(a.r.left, b.r.left) + w / 2, cyDoc = Math.max(ay, by) + h / 2
    const pt = { left: cx, top: cyDoc - a.sy, width: 0, height: 0 }
    // 두 글자 모두 그 지점에서 가려지지 않았을 때만 실제 겹침이다
    if (atView(pt, a.sy, (x, y) => occluded(a.el, x, y) || occluded(b.el, x, y))) continue
    hits.push(`${a.text} ↔ ${b.text} (${w.toFixed(1)}×${h.toFixed(1)})`)
  }
  scrollTo(0, 0)
  return hits
}

// 검사기 자체 시험: 실제 겹침(양성)은 잡고, 불투명 고정 칸 아래로 지나간 글자(음성)는 빼야 한다
const selfTest = async (p) => {
  const plant = (kind) => p.evaluate((kind) => {
    const box = document.createElement('div'); box.id = 'overlap-selftest'
    box.style.cssText = 'position:relative;height:40px;background:transparent'
    if (kind === 'positive') box.innerHTML = '<span style="position:absolute;left:30px;top:10px">12시간 34분</span><span style="position:absolute;left:60px;top:10px">56시간 78분</span>'
    else box.innerHTML = '<span style="position:absolute;left:30px;top:10px">12시간 34분</span><span style="position:absolute;left:20px;top:0;width:140px;height:40px;background:rgb(255,255,255)"></span><span style="position:absolute;left:180px;top:10px">고정 칸</span>'
    document.querySelector('main').prepend(box)
  }, kind)
  const clear = () => p.evaluate(() => document.getElementById('overlap-selftest')?.remove())
  await plant('positive'); const pos = (await p.evaluate(probe)).filter((h) => h.includes('12시간')).length; await clear()
  await plant('negative'); const neg = (await p.evaluate(probe)).filter((h) => h.includes('12시간')).length; await clear()
  return { positiveDetected: pos, negativeDetected: neg, ok: pos > 0 && neg === 0 }
}

const browser = await chromium.launch({ channel: 'chrome', args: ['--no-proxy-server'] })
const out = []
for (const theme of ['light', 'dark']) for (const width of [1600, 850, 390]) {
  const p = await (await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme })).newPage()
  await p.context().route('**/*',r=>['GET','HEAD','OPTIONS'].includes(r.request().method())?r.continue():r.fulfill({status:503,json:{message:'review write blocked'}}));
  const errs = []; p.on('pageerror', (e) => errs.push(e.message))
  await p.goto('http://localhost:5174/student-care/ops'); await p.waitForSelector('[data-care-roster-row]'); await p.waitForTimeout(2500)
  const states = []
  const st = await selfTest(p)
  out.push({ theme, width, state: '검사기 자체 시험(양성 1·음성 1)', ok: st.ok, sample: [JSON.stringify(st)] })
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
writeFileSync(new URL('./overlap-check.json', import.meta.url), JSON.stringify(out, null, 2))
const bad = out.filter((r) => r.overlaps > 0 || r.ok === false)
for (const r of bad) console.log(JSON.stringify(r))
const screens = out.filter((r) => r.overlaps !== undefined && r.state !== 'pageerror').length
console.log(`화면 상태 ${screens}개 겹침 검사, 보조 검사 ${out.length - screens}건(지표 이름 고정·콘솔 오류·검사기 자체 시험), 실패 ${bad.length}건`)
process.exit(bad.length ? 1 : 0)
