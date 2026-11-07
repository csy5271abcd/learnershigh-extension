// plan-v5 P3(스크롤은 한 곳만)·P4(잘림 없음) 검사 함수와 자체 시험.
// 사용: import { p34, selfTest } from './care-p34-probe.mjs' → await p34(page), await selfTest(browser)

/** 브라우저 안에서 실행. 활성 화면(맨 위 aria-modal 대화상자, 없으면 문서)을 기준으로 잰다 */
export const p34Probe = () => {
  const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('[hidden],[aria-hidden="true"]') }
  const dialogs = [...document.querySelectorAll('[role=dialog][aria-modal="true"], [role=alertdialog][aria-modal="true"], dialog[open]')].filter(visible)
  // 맨 위 창: 문서 순서상 마지막(겹친 창은 나중에 열린 것이 뒤에 붙는다) 중 가장 높은 z-index
  const z = (el) => { for (let e = el; e; e = e.parentElement) { const v = parseInt(getComputedStyle(e).zIndex, 10); if (!Number.isNaN(v)) return v } return 0 }
  const active = dialogs.sort((a, b) => z(a) - z(b) || (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)).at(-1) ?? null
  const root = active ?? document.body
  const scrolls = (el) => { const cs = getComputedStyle(el); return { v: /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1, h: /(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1 } }
  const areas = []
  for (const el of root.querySelectorAll('*')) { if (!visible(el)) continue; const s = scrolls(el); if (s.v || s.h) areas.push({ el, ...s }) }
  if (active) { const s = scrolls(active); if (s.v || s.h) areas.unshift({ el: active, ...s }) }
  const nested = areas.filter((a) => areas.some((b) => b !== a && b.el.contains(a.el))).length
  // 배경 잠금: 활성 창이 있을 때 문서를 스크롤해 보고 되돌린다
  let backgroundLocked = null
  // overflow:hidden은 스크립트 스크롤을 막지 않으므로, 사용자가 문서를 스크롤할 수 없는지(html·body가 hidden/clip이거나 넘칠 내용이 없음)로 판정한다
  if (active) { const lockedBy = (e) => /(hidden|clip)/.test(getComputedStyle(e).overflowY); backgroundLocked = lockedBy(document.documentElement) || lockedBy(document.body) || document.documentElement.scrollHeight <= innerHeight + 1 }
  // 잘림: 글자 조각 사각형이 자신 또는 조상의 hidden/clip 영역 밖으로 나가거나, 말줄임 처리된 요소
  const clipped = []
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), range = document.createRange()
  while (tw.nextNode()) {
    const t = tw.currentNode, el = t.parentElement
    if (!el || !t.textContent.trim() || !visible(el) || el.closest('.lh-visually-hidden,.sc-visually-hidden')) continue
    const cs = getComputedStyle(el)
    if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) { clipped.push(t.textContent.trim().slice(0, 20)); continue }
    range.selectNodeContents(t)
    const r = range.getBoundingClientRect()
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const s = getComputedStyle(e)
      if (/(hidden|clip)/.test(s.overflowX + s.overflowY)) {
        const c = e.getBoundingClientRect()
        if (r.left < c.left - 1 || r.right > c.right + 1 || r.top < c.top - 1 || r.bottom > c.bottom + 1) { clipped.push(t.textContent.trim().slice(0, 20)); break }
      }
    }
  }
  const generalViolations = active ? 0 : areas.length
  const modalViolations = active ? (backgroundLocked ? 0 : 1) + Math.max(0, areas.length - 1) + nested : 0
  return {
    active: active ? (active.getAttribute('aria-label') || active.id || active.className || 'dialog') : null,
    scrollAreas: areas.length, hScroll: areas.filter((a) => a.h).length, nested, backgroundLocked,
    p3: generalViolations + modalViolations, p4: clipped.length + areas.filter((a) => a.h).length, clipped: clipped.slice(0, 5),
  }
}

export const p34 = (page) => page.evaluate(p34Probe)

const fixture = (body) => `<!doctype html><html><head><style>body{margin:0;font:14px sans-serif}.long{height:3000px}</style></head><body>${body}</body></html>`
const cases = [
  ['잠금 모달 한 곳 스크롤(통과)', fixture('<div class="long">page</div><div role="dialog" aria-modal="true" style="position:fixed;inset:40px;overflow:auto"><div class="long">modal</div></div><style>html{overflow:hidden}</style>'), (r) => r.p3 === 0 && r.active],
  ['미잠금 모달(위반)', fixture('<div class="long">page</div><div role="dialog" aria-modal="true" style="position:fixed;inset:40px;overflow:auto"><div class="long">modal</div></div>'), (r) => r.p3 > 0],
  ['일반 화면 중첩 스크롤(위반)', fixture('<main><div style="height:200px;overflow:auto"><div class="long">inner</div></div></main>'), (r) => r.p3 > 0],
  ['포털 대화상자(대상 포함)', fixture('<main><p>main</p></main><div id="portal"><div role="dialog" aria-modal="true" aria-label="portal" style="position:fixed;inset:40px"><p>x</p></div></div>'), (r) => r.active === 'portal'],
  ['숨김 잘림(위반)', fixture('<main><div style="width:60px;overflow:hidden;white-space:nowrap">아주 긴 글자 값 12시간 34분</div></main>'), (r) => r.p4 > 0],
  ['조상 잘림(위반)', fixture('<main><div style="width:80px;height:20px;overflow:hidden"><div><span style="display:inline-block;width:200px">긴 값이 잘리는 칸 99시간</span></div></div></main>'), (r) => r.p4 > 0],
  ['겹친 창(맨 위 창 선택)', fixture('<style>html{overflow:hidden}</style><div role="dialog" aria-modal="true" aria-label="bottom" style="position:fixed;inset:10px;z-index:10"><p>a</p></div><div role="dialog" aria-modal="true" aria-label="top" style="position:fixed;inset:60px;z-index:20"><p>b</p></div>'), (r) => r.active === 'top'],
  ['미저장 확인창(alertdialog)이 학생 창 위에 있으면 맨 위로 선택', fixture('<style>html{overflow:hidden}</style><div role="dialog" aria-modal="true" aria-label="student" style="position:fixed;inset:10px;z-index:50;overflow:auto"><div class="long">s</div></div><div role="alertdialog" aria-modal="true" aria-label="confirm" style="position:fixed;inset:200px;z-index:60"><button>계속</button></div>'), (r) => r.active === 'confirm' && r.p3 === 0],
  ['미잠금 alertdialog(위반)', fixture('<div class="long">page</div><div role="alertdialog" aria-modal="true" aria-label="confirm" style="position:fixed;inset:200px"><button>계속</button></div>'), (r) => r.active === 'confirm' && r.p3 > 0],
  ['정상 화면(통과)', fixture('<main><p>값 3시간 12분</p><table><tr><td>권유진</td><td>결석</td></tr></table></main>'), (r) => r.p3 === 0 && r.p4 === 0],
]

export async function selfTest(browser) {
  const p = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage()
  const out = []
  for (const [name, html, ok] of cases) { await p.setContent(html); const r = await p34(p); out.push({ name, ok: !!ok(r), result: { ...r, clipped: r.clipped } }) }
  await p.context().close()
  return out
}
