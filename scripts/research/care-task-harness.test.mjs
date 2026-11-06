// 조작 기록기 회귀 시험: read()가 화면에 보이지 않는 텍스트를 돌려주면 안 된다.
// 사용: node --test scripts/research/care-task-harness.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { start } from './care-task-harness.mjs'

const html = `<!doctype html><meta charset="utf-8"><main style="font:16px sans-serif">
<p>VISIBLE_TEXT</p>
<div style="height:40px;overflow:hidden"><p style="margin-top:80px">CLIPPED_SECRET</p></div>
<p style="opacity:0">TRANSPARENT_SECRET</p>
<div style="opacity:0.05"><span>PARENT_TRANSPARENT_SECRET</span></div>
<div style="position:relative"><p>COVERED_SECRET</p><div style="position:absolute;inset:0;background:#fff"></div></div>
<label>값 <input value="42"></label>
<div style="height:30px;overflow:auto"><p style="margin:0">SCROLL_TOP_VISIBLE</p><p style="margin-top:60px">SCROLL_HIDDEN_SECRET</p></div>
<div style="width:100px;overflow:hidden;white-space:nowrap">PARTVIS_SECRETTAILXXXXXXXXXXXXXXXXXXXXX</div>
<div style="position:relative;white-space:nowrap"><span>COVERLEFT_HIDDENRIGHT</span><div style="position:absolute;top:0;bottom:0;left:90px;width:400px;background:#fff"></div></div>
<label>먼 값 <input value="OFFSCREEN_INPUT_SECRET" style="position:absolute;left:2000px"></label>
<p style="margin-top:2000px">BELOW_FOLD_SECRET</p>
</main>`
const url = 'data:text/html;charset=utf-8,' + encodeURIComponent(html)

test('read() returns only text a person can see now', async () => {
  const log = path.join(tmpdir(), `harness-${Date.now()}.json`)
  const t = await start(url, log)
  t.question('T1')
  const text = await t.read()
  await t.end()
  assert.match(text, /VISIBLE_TEXT/)
  assert.match(text, /SCROLL_TOP_VISIBLE/)
  assert.match(text, /\[입력 값: 42\]/)
  assert.match(text, /PARTVIS/)
  assert.doesNotMatch(text, /TAILXXXX/)
  assert.match(text, /COVERL/)
  assert.doesNotMatch(text, /HIDDENRIGHT/)
  for (const hidden of ['OFFSCREEN_INPUT_SECRET', 'CLIPPED_SECRET', 'TRANSPARENT_SECRET', 'PARENT_TRANSPARENT_SECRET', 'COVERED_SECRET', 'BELOW_FOLD_SECRET', 'SCROLL_HIDDEN_SECRET']) assert.doesNotMatch(text, new RegExp(hidden))
  const saved = JSON.parse(readFileSync(log, 'utf8'))
  assert.equal(saved.reads.length, 1)
  assert.equal(saved.reads[0].question, 'T1')
})
