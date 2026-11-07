import { test } from 'node:test'
import assert from 'node:assert/strict'
import { packColumn, packFit } from './pack.ts'

const overlaps = (pts, r) => { for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) if ((pts[i].x - pts[j].x) ** 2 + (pts[i].y - pts[j].y) ** 2 < (2 * r) ** 2 - 0.01) return true; return false }

test('150 equal values in a 1280px-wide column (about 125px) get distinct, non-overlapping spots', () => {
  const items = Array.from({ length: 150 }, (_, i) => ({ item: i, y: 100 }))
  const { points, r } = packFit(items, 60, 58, 2.6)
  assert.ok(points.every((p) => p.packed), `unpacked at r=${r}`)
  assert.equal(new Set(points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)).size, 150)
  assert.equal(overlaps(points, r), false)
  // 값 위치에서 너무 멀리 가지 않음
  assert.ok(points.every((p) => Math.abs(p.y - 100) <= 40.01))
})

test('spread values keep their y and do not overlap', () => {
  const items = Array.from({ length: 150 }, (_, i) => ({ item: i, y: (i * 7) % 220 }))
  const pts = packColumn(items, 80, 70, 2.6)
  assert.ok(pts.every((p) => p.packed))
  assert.equal(overlaps(pts, 2.6), false)
})
