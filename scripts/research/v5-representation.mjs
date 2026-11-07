// representation-v5.md의 핵심 표현을 실제 스냅숏 데이터(강남 150명)로 그려 확인한다.
// 사용: node scripts/research/v5-representation.mjs → docs/design/ops-redesign/wireframes-v5/repr-*.png
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const require = createRequire(new URL('../../e2e/package.json', import.meta.url))
const { chromium } = require('@playwright/test')
const { buildOpsRoster } = await import('../../frontend/admin/src/features/student-care/ops/opsModel.ts')
const snap = (n) => JSON.parse(readFileSync(new URL(`../../docs/design/ops-redesign/data-snapshot/${n}`, import.meta.url), 'utf8'))
const rows = buildOpsRoster(snap('board-demo_large.json'), snap('metrics-demo_large.json'))
const out = (f) => fileURLToPath(new URL(`../../docs/design/ops-redesign/wireframes-v5/${f}`, import.meta.url))
const md = (d) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`
const days = rows[0].days
const flagged = (r) => r.status === 'check' || r.status === 'recheck' || r.status === 'managed'
const C = { ink: '#1d2433', muted: '#667085', grid: '#e3e6eb', gray: '#c3c8d1', hi: '#e8590c', band: 'rgba(37,99,235,.10)', med: '#2563eb', fill: '#475467' }
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')

/** 날짜별 분포 점 그림. value(r,i) → 수 또는 null */
function swarm({ title, value, unit, lim, warn, width = 1100, height = 340 }) {
  const left = 56, right = 20, top = 44, bottom = 34, colW = (width - left - right) / 7, H = height - top - bottom
  const y = (v) => top + H / 2 - (Math.max(-lim, Math.min(lim, v)) / lim) * (H / 2 - 6)
  const f = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Math.round(v))}${unit}`
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" font-family="Pretendard,Malgun Gothic,sans-serif">`
  svg += `<text x="0" y="18" font-size="15" font-weight="700" fill="${C.ink}">${title}</text>`
  for (const t of [-lim, -lim / 2, 0, lim / 2, lim]) svg += `<line x1="${left}" x2="${width - right}" y1="${y(t)}" y2="${y(t)}" stroke="${t === 0 ? '#98a2b3' : C.grid}" stroke-width="${t === 0 ? 1.5 : 1}"/><text x="${left - 8}" y="${y(t) + 4}" font-size="11" text-anchor="end" fill="${C.muted}">${t === 0 ? '평소' : f(t)}</text>`
  days.forEach((d, i) => {
    const cx = left + colW * i + colW / 2
    const pts = rows.map((r) => ({ r, v: value(r, i) })).filter((p) => p.v !== null)
    const sorted = pts.map((p) => p.v).sort((a, b) => a - b), q = (p) => { const k = (sorted.length - 1) * p, lo = Math.floor(k), hi = Math.ceil(k); return sorted[lo] + (sorted[hi] - sorted[lo]) * (k - lo) }
    if (sorted.length) { svg += `<rect x="${cx - colW * 0.42}" y="${y(q(0.75))}" width="${colW * 0.84}" height="${Math.max(1, y(q(0.25)) - y(q(0.75)))}" fill="${C.band}" rx="3"/>` }
    // 겹치지 않게 같은 높이 구간의 점을 좌우로 펼친다
    const bins = new Map()
    const placed = pts.sort((a, b) => Number(flagged(a.r)) - Number(flagged(b.r))).map((p) => { const yy = y(p.v), key = Math.round(yy / 5); const n = bins.get(key) ?? 0; bins.set(key, n + 1); const off = (n % 2 ? 1 : -1) * Math.ceil(n / 2) * 5.2; return { ...p, x: cx + Math.max(-colW * 0.45, Math.min(colW * 0.45, off)), y: yy } })
    for (const p of placed) { const over = Math.abs(p.v) > lim; const hot = flagged(p.r) && warn(p.v); svg += over ? `<path d="M${p.x - 3.5},${p.y + (p.v > 0 ? 3 : -3)} L${p.x + 3.5},${p.y + (p.v > 0 ? 3 : -3)} L${p.x},${p.y + (p.v > 0 ? -3 : 3)} Z" fill="${hot ? C.hi : C.fill}"/>` : `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${hot ? 3.4 : 2.6}" fill="${hot ? C.hi : C.gray}" stroke="#fff" stroke-width="0.8"><title>${esc(p.r.student.studentName)} ${f(p.v)}</title></circle>` }
    if (sorted.length) { const m = q(0.5); svg += `<line x1="${cx - colW * 0.3}" x2="${cx + colW * 0.3}" y1="${y(m)}" y2="${y(m)}" stroke="${C.med}" stroke-width="2.5"/><text x="${cx}" y="${top - 8}" font-size="13" font-weight="700" text-anchor="middle" fill="${C.ink}">${f(m)}</text>` }
    // 기준을 넘은 관리 대상만 이름(열마다 3명, 나머지는 개수)
    const hot = placed.filter((p) => flagged(p.r) && warn(p.v)).sort((a, b) => Math.abs(b.v) - Math.abs(a.v))
    hot.slice(0, 3).forEach((p, k) => { svg += `<text x="${cx + colW * 0.47}" y="${p.y + 4 + k * 0}" font-size="11" text-anchor="end" fill="${C.hi}" dx="0" dy="${k * 12 - 0}">${esc(p.r.student.studentName)}</text>` })
    if (hot.length > 3) svg += `<text x="${cx + colW * 0.47}" y="${height - bottom + 28}" font-size="11" text-anchor="end" fill="${C.hi}">외 ${hot.length - 3}명</text>`
    svg += `<text x="${cx}" y="${height - bottom + 16}" font-size="12" text-anchor="middle" fill="${C.muted}">${md(d.date)} ${d.dow}</text>`
  })
  return svg + '</svg>'
}

/** 출결 행렬: 결석 1일 이상 학생만 */
function matrix() {
  const absentRows = rows.filter((r) => r.days.some((d) => d.attendance === 'absent'))
  const run = (r) => { let b = 0, c = 0; for (const d of r.days) { if (d.attendance === 'absent') { c++; b = Math.max(b, c) } else if (d.attendance !== 'off') c = 0 } return b }
  absentRows.sort((a, b) => run(b) - run(a) || b.days.filter((d) => d.attendance === 'absent').length - a.days.filter((d) => d.attendance === 'absent').length)
  const cw = 46, ch = 18, left = 120, top = 54
  const w = left + cw * 7 + 20, h = top + absentRows.length * (ch + 3) + 40
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" font-family="Pretendard,Malgun Gothic,sans-serif"><text x="0" y="18" font-size="15" font-weight="700" fill="${C.ink}">결석이 있는 학생 ${absentRows.length}명</text>`
  svg += `<g font-size="11" fill="${C.muted}"><rect x="210" y="8" width="12" height="12" rx="2" fill="${C.fill}"/><text x="226" y="18">결석</text><rect x="262" y="8" width="12" height="12" rx="2" fill="#fff" stroke="${C.gray}" stroke-dasharray="2 2"/><text x="278" y="18">기록 없음</text><line x1="336" x2="348" y1="20" y2="20" stroke="${C.hi}" stroke-width="2.5"/><text x="352" y="18">계획 미제출</text></g>`
  days.forEach((d, i) => { const n = rows.filter((r) => r.days[i].attendance === 'absent').length; svg += `<text x="${left + cw * i + cw / 2}" y="${top - 18}" font-size="11" text-anchor="middle" fill="${C.muted}">${md(d.date)} ${d.dow}</text><text x="${left + cw * i + cw / 2}" y="${top - 5}" font-size="12" font-weight="700" text-anchor="middle" fill="${C.ink}">${n}명</text>` })
  absentRows.forEach((r, k) => {
    const yy = top + k * (ch + 3)
    svg += `<text x="${left - 8}" y="${yy + 13}" font-size="12" text-anchor="end" fill="${run(r) >= 4 ? C.hi : C.ink}" font-weight="${run(r) >= 4 ? 700 : 400}">${esc(r.student.studentName)}</text>`
    r.days.forEach((d, i) => { const x = left + cw * i + 3
      svg += d.attendance === 'absent' ? `<rect x="${x}" y="${yy}" width="${cw - 6}" height="${ch}" rx="3" fill="${C.fill}"/>` : d.attendance === 'unknown' ? `<rect x="${x}" y="${yy}" width="${cw - 6}" height="${ch}" rx="3" fill="#fff" stroke="${C.gray}" stroke-dasharray="2 2"/>` : d.attendance === 'off' ? `<rect x="${x}" y="${yy}" width="${cw - 6}" height="${ch}" rx="3" fill="none"/>` : `<rect x="${x}" y="${yy}" width="${cw - 6}" height="${ch}" rx="3" fill="#eef0f3"/>`
      if (d.submission === 'missing') svg += `<line x1="${x}" x2="${x + cw - 6}" y1="${yy + ch + 1}" y2="${yy + ch + 1}" stroke="${C.hi}" stroke-width="2"/>` })
  })
  svg += `<text x="0" y="${h - 10}" font-size="12" fill="${C.muted}">결석 없음 ${rows.length - absentRows.length}명</text>`
  return svg + '</svg>'
}

/** 학생 한 명 7일 아령(평소 ○ – 실제 ●) */
function dumbbell(r) {
  const w = 760, h = 230, left = 50, top = 30, H = 150, colW = (w - left - 20) / 7
  const max = Math.max(60, ...r.days.map((d) => Math.max(d.minutes ?? 0, d.usualMinutes ?? 0)))
  const y = (m) => top + H - (m / max) * H
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" font-family="Pretendard,Malgun Gothic,sans-serif"><text x="0" y="16" font-size="15" font-weight="700" fill="${C.ink}">${esc(r.student.studentName)} 학습 시간 7일</text><g font-size="11" fill="${C.muted}"><circle cx="330" cy="12" r="4" fill="#fff" stroke="${C.fill}" stroke-width="1.5"/><text x="338" y="16">평소</text><circle cx="380" cy="12" r="4" fill="${C.fill}"/><text x="388" y="16">실제</text></g>`
  for (const t of [0, max / 2, max]) svg += `<line x1="${left}" x2="${w - 20}" y1="${y(t)}" y2="${y(t)}" stroke="${C.grid}"/><text x="${left - 6}" y="${y(t) + 4}" font-size="11" text-anchor="end" fill="${C.muted}">${Math.round(t / 60)}시간</text>`
  r.days.forEach((d, i) => { const cx = left + colW * i + colW / 2
    if (d.usualMinutes !== null && d.minutes !== null) { const down = d.minutes < d.usualMinutes * 0.7; svg += `<line x1="${cx}" x2="${cx}" y1="${y(d.usualMinutes)}" y2="${y(d.minutes)}" stroke="${down ? C.hi : C.gray}" stroke-width="3"/>` }
    if (d.usualMinutes !== null) svg += `<circle cx="${cx}" cy="${y(d.usualMinutes)}" r="5" fill="#fff" stroke="${C.fill}" stroke-width="1.5"/>`
    if (d.minutes !== null) svg += `<circle cx="${cx}" cy="${y(d.minutes)}" r="5" fill="${C.fill}"/>`
    if (d.attendance === 'absent') svg += `<text x="${cx}" y="${top + H - 6}" font-size="11" text-anchor="middle" fill="${C.hi}">결석</text>`
    svg += `<text x="${cx}" y="${top + H + 20}" font-size="12" text-anchor="middle" fill="${C.muted}">${md(d.date)} ${d.dow}</text>` })
  return svg + '</svg>'
}

const study = (r, i) => { const d = r.days[i]; return d.minutes !== null && d.usualMinutes ? ((d.minutes - d.usualMinutes) / d.usualMinutes) * 100 : null }
const start = (r, i) => { const d = r.days[i]; return d.start !== null && d.usualStart !== null ? d.start - d.usualStart : null }
const sample = rows.find((r) => r.student.studentName === '최예준') ?? rows[0]
const pages = {
  'repr-study.png': swarm({ title: '학습 시간 · 학생별 평소 대비 (점 하나 = 학생 한 명)', value: study, unit: '%', lim: 100, warn: (v) => v <= -30 }),
  'repr-start.png': swarm({ title: '입실 시각 · 학생별 평소 대비', value: start, unit: '분', lim: 120, warn: (v) => v >= 60 }),
  'repr-absence.png': matrix(),
  'repr-student.png': dumbbell(sample),
}
const b = await chromium.launch({ channel: 'chrome', args: ['--no-proxy-server'] })
const p = await b.newPage({ viewport: { width: 1200, height: 900 } })
for (const [f, svg] of Object.entries(pages)) { await p.setContent(`<body style="margin:16px;background:#fff">${svg}</body>`); await p.locator('svg').screenshot({ path: out(f) }) }
await b.close()
console.log(Object.keys(pages).join(' '))
