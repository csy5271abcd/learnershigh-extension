// 과업 시험용 조작 기록기. 시험관은 이 함수로만 화면을 조작한다(Playwright page 객체는 노출하지 않는다).
// 사용 예:
//   import { start } from './care-task-harness.mjs'
//   const t = await start('http://localhost:5174/student-care', 'logs/original.json')
//   await t.clickText('학습관별'); await t.scroll(900); console.log(await t.read()); await t.shot('q1.png'); await t.end()
// 기록 내용
//  - 명시적 조작(click, fill, select, scroll)과 조작 때문에 생긴 자동 이동(문서·내부 스크롤 위치 변화)을 구분해 남긴다
//  - 저장 요청(POST/PUT/PATCH/DELETE)의 주소·본문·응답 코드를 남긴다(업무 과업 채점용)
//  - read(): 지금 뷰포트에 보이고 다른 요소에 가려지지 않은 텍스트와 입력값만 돌려준다
import { createRequire } from 'node:module'
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const require = createRequire(new URL('../../e2e/package.json', import.meta.url))
const { chromium } = require('@playwright/test')

const positions = () => {
  const inner = []
  for (const el of document.querySelectorAll('main *')) {
    const cs = getComputedStyle(el)
    if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX) && (el.scrollTop || el.scrollLeft)) inner.push([el.tagName + '.' + (el.className || ''), el.scrollTop, el.scrollLeft])
  }
  return { x: scrollX, y: scrollY, inner: JSON.stringify(inner) }
}

export async function start(url, logFile) {
  // --no-proxy-server: 이 환경의 프록시 설정 때문에 기본 실행이 시간 초과되는 문제를 피한다(3차 심사 관찰)
  const browser = await chromium.launch({ channel: 'chrome', args: ['--no-proxy-server'] })
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 }, colorScheme: 'light' })).newPage()
  const log = []
  const reads = []
  let question = null
  const writes = []
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('requestfinished', async (req) => {
    // 설정 조회 응답은 저장 뒤 서버 값 확인(Q10)에 쓰므로 본문까지 남긴다
    if (req.method() === 'GET' && /\/settings\?/.test(req.url())) { const res = await req.response(); writes.push({ question, method: 'GET', url: req.url(), body: await res?.text().catch(() => null), status: res?.status() ?? null, at: new Date().toISOString() }); return }
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method())) return
    const res = await req.response()
    writes.push({ question, method: req.method(), url: req.url(), body: req.postData(), status: res?.status() ?? null, at: new Date().toISOString() })
  })
  const act = async (kind, target, fn) => {
    const before = await page.evaluate(positions)
    await fn()
    const after = await page.evaluate(positions)
    const moved = before.x !== after.x || before.y !== after.y || before.inner !== after.inner
    log.push({ question, kind, target: String(target).slice(0, 160), autoMove: kind !== 'scroll' && moved, before, after, at: new Date().toISOString() })
  }
  await page.goto(url)
  await page.waitForTimeout(2500)
  return {
    // 문항을 시작할 때 부른다. 이후 조작·읽기·저장 요청이 이 문항 번호로 기록된다
    question: (id) => { question = id },
    click: (selector) => act('click', selector, async () => { await page.click(selector); await page.waitForTimeout(800) }),
    clickText: (text) => act('click', `text=${text}`, async () => { await page.getByText(text, { exact: true }).first().click(); await page.waitForTimeout(800) }),
    fill: (selector, value) => act('fill', `${selector} = ${value}`, async () => { await page.fill(selector, String(value)); await page.waitForTimeout(500) }),
    select: (selector, value) => act('select', `${selector} = ${value}`, async () => { await page.selectOption(selector, value); await page.waitForTimeout(1500) }),
    scroll: (dy, selector) => act('scroll', `${selector ?? 'window'} ${dy}`, async () => { if (selector) await page.locator(selector).first().evaluate((el, d) => el.scrollBy(0, d), dy); else await page.mouse.wheel(0, dy); await page.waitForTimeout(400) }),
    read: async () => { const text = await page.evaluate(() => {
      const out = []
      // 글자 단위로 판정한다. 뷰포트·overflow 영역 안에 완전히 들어오고, 조상이 투명하지 않고, 그 글자 위치에서 다른 요소에 가려지지 않은 글자만 남긴다.
      // 그래서 일부만 잘리거나 일부만 덮인 문자열은 보이는 부분만 돌려준다(3·4차 심사 반례).
      const transparent = (el) => { for (let e = el; e; e = e.parentElement) if (parseFloat(getComputedStyle(e).opacity) < 0.1) return true; return false }
      const clipRects = (el) => { const rects = [{ left: 0, top: 0, right: innerWidth, bottom: innerHeight }]
        for (let e = el; e && e !== document.documentElement; e = e.parentElement) { const cs = getComputedStyle(e); if (/(hidden|auto|scroll|clip)/.test(cs.overflowX + cs.overflowY)) rects.push(e.getBoundingClientRect()) }
        return rects }
      const inside = (r, clips) => clips.every((c) => r.left >= c.left - 0.5 && r.right <= c.right + 0.5 && r.top >= c.top - 0.5 && r.bottom <= c.bottom + 0.5)
      const uncovered = (el, x, y) => { const hit = document.elementFromPoint(x, y); return !!hit && (hit === el || el.contains(hit) || hit.contains(el)) }
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      const range = document.createRange()
      while (w.nextNode()) {
        const t = w.currentNode, el = t.parentElement
        if (!el || !t.textContent.trim()) continue
        const cs = getComputedStyle(el)
        if (cs.visibility === 'hidden' || cs.display === 'none' || el.closest('[hidden],[aria-hidden="true"]') || transparent(el)) continue
        range.selectNodeContents(t)
        const whole = range.getBoundingClientRect()
        if (whole.width === 0 || whole.bottom < 0 || whole.top > innerHeight || whole.right < 0 || whole.left > innerWidth) continue
        const clips = clipRects(el)
        let visible = ''
        const str = t.textContent
        for (let i = 0; i < str.length; i++) {
          if (/\s/.test(str[i])) { visible += visible && !visible.endsWith(' ') ? ' ' : ''; continue }
          range.setStart(t, i); range.setEnd(t, i + 1)
          const r = range.getBoundingClientRect()
          if (r.width === 0 || !inside(r, clips) || !uncovered(el, r.left + r.width / 2, r.top + r.height / 2)) { if (visible && !visible.endsWith(' ')) visible += ' '; continue }
          visible += str[i]
        }
        if (visible.trim()) out.push(visible.trim())
      }
      for (const el of document.querySelectorAll('input:not([type=hidden]),select,textarea')) {
        const r = el.getBoundingClientRect()
        if (r.width === 0 || !inside(r, clipRects(el)) || transparent(el) || !uncovered(el, r.left + r.width / 2, r.top + r.height / 2)) continue
        const label = el.labels?.[0]?.textContent?.trim() || el.getAttribute('aria-label') || el.name || el.id
        const value = el.type === 'checkbox' || el.type === 'radio' ? (el.checked ? '선택됨' : '선택 안 됨') : el.value
        out.push(`[입력 ${label}: ${value}]`)
      }
      return out.join(' ')
    }); reads.push({ question, chars: text.length, text, at: new Date().toISOString() }); return text },
    shot: async (file) => { mkdirSync(path.dirname(file), { recursive: true }); await page.screenshot({ path: file }) },
    end: async () => {
      const counts = log.reduce((acc, e) => ({ ...acc, [e.kind]: (acc[e.kind] ?? 0) + 1 }), {})
      const autoMoves = log.filter((e) => e.autoMove).length
      mkdirSync(path.dirname(logFile), { recursive: true })
      writeFileSync(logFile, JSON.stringify({ url, counts, total: log.length, autoMoves, writes, errors, log, reads }, null, 2))
      await browser.close()
      return { counts, total: log.length, autoMoves, writes: writes.length, errors }
    },
  }
}
