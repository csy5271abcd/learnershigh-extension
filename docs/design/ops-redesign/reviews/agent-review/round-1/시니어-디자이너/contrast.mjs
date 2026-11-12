// 글자(작은 글자 4.5:1)와 SVG 그림 요소(3:1) 대비 계산. 화면 전체 스캔, 기준 미달 조합만 출력
import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
const [v, scheme, step] = process.argv.slice(2);
const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, colorScheme: scheme });
await p.goto('http://localhost:5174/student-care/' + v, { waitUntil: 'load' });
await p.waitForTimeout(3000);
if (step === 'detail') {
  if (v === 'x') { await p.click('.x-tabs button:has-text("사진 관찰")'); await p.waitForTimeout(800) }
  if (v === 'z2') { await p.fill('.z-search', '탁예린'); await p.click('button[data-care-roster-row]'); await p.waitForTimeout(1000) }
  if (v === 'y') { await p.click('.y-table tbody tr'); await p.waitForTimeout(800) }
}
if (step === 'branch') {
  if (v === 'x') await p.click('.x-views button:has-text("학습관별")');
  if (v === 'z2') await p.click('.z-tabs button:has-text("학습관")');
  await p.waitForTimeout(1500);
}
const res = await p.evaluate(() => {
  const parse = (c) => { const m = c.match(/[\d.]+/g); if (!m) return null; return m.map(Number) };
  const lum = ([r, g, b]) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) };
  const bgOf = (el) => { while (el) { const c = parse(getComputedStyle(el).backgroundColor); if (c && (c.length < 4 || c[3] > 0.5)) return c.slice(0, 3); el = el.parentElement } return [255, 255, 255] };
  const out = new Map();
  const root = document.querySelector('main') || document.body;
  for (const el of root.querySelectorAll('*')) {
    const st = getComputedStyle(el); if (st.visibility === 'hidden' || st.display === 'none') continue;
    const r = el.getBoundingClientRect(); if (!r.width) continue;
    const inSvg = el.closest('svg');
    if (el.tagName === 'text' || (!inSvg && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))) {
      const fg = parse(el.tagName === 'text' ? (st.fill.startsWith('rgb') ? st.fill : st.color) : st.color)?.slice(0, 3); if (!fg) continue;
      const bg = bgOf(inSvg ? inSvg : el); const k = ratio(fg, bg);
      const fs = parseFloat(st.fontSize); const need = fs >= 18.66 || (fs >= 14 && +st.fontWeight >= 700) ? 3 : 4.5;
      if (k < need) { const t = el.textContent.trim().slice(0, 20); const key = `text ${fg}/${bg}`; const o = out.get(key) ?? { k: k.toFixed(2), need, fs, n: 0, ex: t, cls: (el.getAttribute('class') || el.tagName) }; o.n++; out.set(key, o) }
    } else if (inSvg && ['rect', 'line', 'circle', 'path', 'polyline'].includes(el.tagName)) {
      const c = st.fill !== 'none' && !st.fill.startsWith('url') ? st.fill : st.stroke; const fg = parse(c)?.slice(0, 3); if (!fg || c === 'none') continue;
      const op = parseFloat(st.opacity) * parseFloat(st.fillOpacity || 1); const bg = bgOf(inSvg);
      const mix = fg.map((x, i) => x * op + bg[i] * (1 - op)); const k = ratio(mix, bg);
      if (k < 3) { const key = `mark ${fg}/${bg}/${op}`; const o = out.get(key) ?? { k: k.toFixed(2), need: 3, n: 0, cls: el.getAttribute('class') || el.tagName }; o.n++; out.set(key, o) }
    }
  }
  return [...out.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 25);
});
console.log(`== ${v} ${scheme} ${step || 'top'}`);
for (const [k, o] of res) console.log(o.k, '/', o.need, 'x' + o.n, o.cls, '|', o.ex ?? '', '|', k);
await b.close();
