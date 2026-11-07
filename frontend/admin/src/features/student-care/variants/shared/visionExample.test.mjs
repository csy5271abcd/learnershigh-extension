import { test } from 'node:test'
import assert from 'node:assert/strict'
import { visionDay, sumVision, VISION_AXES } from './visionExample.ts'

test('no record means no photos', () => {
  for (const m of [null, 0]) {
    const d = visionDay('s1', '2026-10-27', m, null)
    assert.equal(d.photosReceived, 0)
    assert.equal(d.coverage.firstCaptureAt, null)
    for (const a of VISION_AXES) assert.deepEqual(d.axes[a], { yes: 0, no: 0, unknown: 0 })
  }
})

test('counts add up on every axis and are deterministic', () => {
  for (let i = 0; i < 300; i++) {
    const id = `demo_s${i}`, minutes = 30 + (i * 37) % 400
    const d = visionDay(id, '2026-10-2' + (i % 7 + 1), minutes, 18 * 60)
    assert.equal(d.analyzedPhotos + d.failedPhotos, d.photosReceived)
    assert.equal(Object.values(d.failures).reduce((a, b) => a + b, 0), d.failedPhotos)
    for (const a of VISION_AXES) {
      const c = d.axes[a]
      assert.ok(c.yes >= 0 && c.no >= 0 && c.unknown >= 0)
      assert.equal(c.yes + c.no + c.unknown, d.analyzedPhotos)
    }
    assert.equal(d.coverage.expectedPhotos, null)
    assert.deepEqual(visionDay(id, d.date, minutes, 18 * 60), d)
  }
})

test('sum keeps axes independent', () => {
  const days = [visionDay('a', '2026-10-26', 200, 1100), visionDay('a', '2026-10-27', 120, 1100)]
  const s = sumVision(days)
  for (const a of VISION_AXES) assert.equal(s.axes[a].yes + s.axes[a].no + s.axes[a].unknown, s.axes[a].analyzed)
  for (const a of VISION_AXES) assert.equal(s.axes[a].analyzed + s.axes[a].unsupportedPhotos, s.analyzed)
})

// 수작업 고정 예제: 생성기와 독립적으로 학습관 집계 정답을 손으로 계산해 대조한다
const fixed = (studentId, analyzed, phoneYes, opts = {}) => ({ studentId, day: {
  studentId, date: '2026-10-27', source: 'example', photosReceived: analyzed + (opts.failed ?? 0), analyzedPhotos: analyzed, failedPhotos: opts.failed ?? 0, failures: {},
  unsupportedAxes: opts.unsupported ?? [],
  axes: { person_visible: { yes: analyzed, no: 0, unknown: 0 }, head_down: { yes: 0, no: analyzed, unknown: 0 },
    phone_interaction: { yes: phoneYes, no: analyzed - phoneYes - (opts.unknown ?? 0), unknown: opts.unknown ?? 0 },
    reading_or_writing: opts.unsupported?.includes('reading_or_writing') ? { yes: 0, no: 0, unknown: analyzed } : analyzed ? { yes: 1, no: analyzed - 1, unknown: 0 } : { yes: 0, no: 0, unknown: 0 } },
  coverage: {}, ratioMeaning: 'photo_sample_ratio' } })

test('branch photo share is pooled, student distribution is per student', async () => {
  const { branchVisionDay } = await import('./visionExample.ts')
  const r = branchVisionDay([fixed('a', 2, 1), fixed('b', 100, 10)]).phone_interaction
  assert.equal(r.yes, 11); assert.equal(r.analyzed, 102)
  assert.ok(Math.abs(r.photoShare - 11 / 102) < 1e-12)
  assert.equal(r.students, 2)
  assert.ok(Math.abs(r.median - 0.3) < 1e-12) // 학생 비율 0.5와 0.1의 중앙값 — 사진 기준 비율과 다르다
})

test('zero analyzed, failures only, unsupported axis and exclusion', async () => {
  const { branchVisionDay } = await import('./visionExample.ts')
  const none = branchVisionDay([fixed('z', 0, 0, { failed: 3 })]).phone_interaction
  assert.equal(none.photoShare, null); assert.equal(none.students, 0); assert.equal(none.median, null)
  const r = branchVisionDay([fixed('a', 10, 2, { unsupported: ['reading_or_writing'] }), fixed('b', 10, 1)])
  assert.equal(r.reading_or_writing.analyzed, 10); assert.equal(r.reading_or_writing.students, 1)
  assert.equal(r.phone_interaction.analyzed, 20)
  const ex = branchVisionDay([fixed('a', 10, 2), fixed('b', 10, 8)], new Set(['b'])).phone_interaction
  assert.equal(ex.yes, 2); assert.equal(ex.students, 1)
  const restored = branchVisionDay([fixed('a', 10, 2), fixed('b', 10, 8)], new Set()).phone_interaction
  assert.equal(restored.yes, 10)
})

test('unknown-heavy and ties keep raw counts', async () => {
  const { branchVisionDay } = await import('./visionExample.ts')
  const r = branchVisionDay([fixed('a', 10, 3, { unknown: 6 }), fixed('b', 20, 6)]).phone_interaction
  assert.deepEqual(r.shares.map((s) => s.share), [0.3, 0.3])
  assert.equal(r.analyzed, 30)
})

test('R01: unsupported photos leave the axis denominator in both student and branch totals', async () => {
  const { branchVisionDay, sumVision } = await import('./visionExample.ts')
  const sup = fixed('a', 10, 0), uns = fixed('b', 10, 0, { unsupported: ['reading_or_writing'] })
  // 지원 학생 10장 중 읽기·쓰기 1장, 미지원 학생 10장 → 사진 기준 1/10, 미지원 10장·1명은 따로 센다
  const br = branchVisionDay([sup, uns]).reading_or_writing
  assert.equal(br.yes, 1); assert.equal(br.analyzed, 10); assert.equal(br.unsupportedPhotos, 10); assert.equal(br.unsupportedStudents, 1)
  // 같은 정의를 학생 기간 합에 적용: 한 학생이 지원 날 10장 + 미지원 날 10장
  const mixed = sumVision([sup.day, { ...uns.day, studentId: 'a' }]).axes.reading_or_writing
  assert.equal(mixed.yes, 1); assert.equal(mixed.analyzed, 10); assert.equal(mixed.unsupportedPhotos, 10); assert.equal(mixed.unknown, 0)
  // 전부 미지원이면 분모 0 → 비율 없음
  const all = sumVision([uns.day]).axes.reading_or_writing
  assert.equal(all.analyzed, 0); assert.equal(all.unsupportedPhotos, 10)
})

test('R01: no photos carries no attendance field (no record and 0 minutes both give 0 photos)', () => {
  const noRecord = visionDay('s', '2026-10-27', null, 1100), zero = visionDay('s', '2026-10-27', 0, 1100)
  assert.equal(noRecord.photosReceived, 0); assert.equal(zero.photosReceived, 0)
  assert.equal(Object.keys(noRecord).includes('attendance'), false)
})
