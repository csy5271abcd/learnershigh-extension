// 실제 학교 평가계획서를 실행 중인 로컬 분석기(127.0.0.1:8765)에 순차로 보내 분석 미리보기 결과를 받는다.
// usage: node analyze-real-plans.mjs <tokenFile> <outDir(저장소 밖)> <rel1> [rel2 ...]   (rel = references/curriculum-plan 기준 경로)
//        node analyze-real-plans.mjs <tokenFile> <outDir> --errors   (손상·미지원·토큰 없음 시험)
// - 원본은 읽기만 한다. 결과는 메모리 미리보기이며 DB에 저장하지 않는다(Backend 미호출).
// - 토큰은 파일에서 읽어 Header로만 보내고 출력·저장하지 않는다. 결과 원본(원문 인용 포함)은 저장소 밖 outDir에만 쓴다.
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const [tokenFile, outDir, ...rest] = process.argv.slice(2)
const ROOT = 'C:/learnershigh-extension/references/curriculum-plan/'
const URL_ = 'http://127.0.0.1:8765/analyze-preview'
const token = readFileSync(tokenFile, 'utf8').trim()
mkdirSync(outDir, { recursive: true })

async function analyze(bytes, name, type, withToken = true) {
  const form = new FormData()
  form.append('file', new Blob([bytes], { type }), name)
  const started = Date.now()
  const response = await fetch(URL_, { method: 'POST', body: form, headers: withToken ? { 'X-Analysis-Token': token } : {} })
  const json = await response.json().catch(() => null)
  return { status: response.status, ms: Date.now() - started, json }
}
const typeOf = (rel) => (rel.endsWith('.pdf') ? 'application/pdf' : rel.endsWith('.hwpx') ? 'application/hwp+zip' : 'application/x-hwp')

if (rest[0] === '--errors') {
  const cases = [
    ['corrupt.pdf', Buffer.from('%PDF-1.4\nthis is not a real pdf body\n'), 'application/pdf', true],
    ['corrupt.hwp', Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.alloc(2048, 7)]), 'application/x-hwp', true],
    ['plain-zip.hwpx', Buffer.from('504b0506000000000000000000000000000000000000', 'hex'), 'application/hwp+zip', true],
    ['no-token.pdf', Buffer.from('%PDF-1.4\n'), 'application/pdf', false],
  ]
  const out = []
  for (const [name, bytes, type, withToken] of cases) {
    const r = await analyze(bytes, name, type, withToken)
    out.push({ case: name, status: r.status, ok: r.json?.ok, resultStatus: r.json?.status, errors: r.json?.errors })
    console.log(name, r.status, r.json?.status, JSON.stringify(r.json?.errors ?? []).slice(0, 160))
  }
  writeFileSync(join(outDir, 'error-cases.json'), JSON.stringify(out, null, 2) + '\n', 'utf8')
} else {
  for (const rel of rest) {
    const bytes = readFileSync(ROOT + rel)
    const sha = createHash('sha256').update(bytes).digest('hex')
    const r = await analyze(bytes, basename(rel), typeOf(rel))
    const file = join(outDir, `${sha.slice(0, 12)}.json`)
    writeFileSync(file, JSON.stringify({ rel, sizeBytes: bytes.length, sha256: sha, httpStatus: r.status, ms: r.ms, response: r.json }, null, 1) + '\n', 'utf8')
    console.log(sha.slice(0, 12), r.status, r.json?.status, `${r.ms}ms`, `${(bytes.length / 1024) | 0}KB`)
  }
}
