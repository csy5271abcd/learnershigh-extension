// Assessment E2E 전용 Stub 분석기 (계정 B 분석기 대체 아님, 127.0.0.1 전용).
// 실제 문서를 분석하지 않는다. Backend가 보낸 원문 파일 이름의 표식으로 응답을 고른다:
//   *contract03*  → Envelope PARTIAL + 합성 analysis-import-0.3 payload (backend/src/test/resources/assessment/contract03)
//   *noresult*    → Envelope NO_ASSESSMENTS_EXTRACTED + payload FAILED (실제 분석기 v21.1이 평가계획서가 아닌 문서에 보내는 모양)
//   그 밖         → Envelope OK_REVIEW_REQUIRED + 계정 B v21.1 0.2 결과 Fixture
// payload의 source.sha256은 받은 원문 SHA로 바꾼다(서버의 원문 일치 검사를 통과시키기 위해 — 내용은 합성 Fixture 그대로).
// A8: Backend가 multipart contract=0.3을 보내면(0.3 Gate ON) 모든 응답을 0.3으로 답한다(계정 B B6 규칙): 0.2 Fixture에는
// contractVersion·analyzer.profile만 붙이고, '결과 없음'은 0.3 FAILED(failureReason 코드)로 보낸다. 0.2 요청에는 이전 그대로.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'

const port = Number(process.argv[2] ?? 18768)
const token = process.env.E2E_ANALYZER_TOKEN ?? 'e2e-stub-token-not-a-secret-0123456789'
const resources = fileURLToPath(new URL('../../backend/src/test/resources/assessment/', import.meta.url))
const payload02 = readFileSync(`${resources}analyzer-v21_1/analysis-import.json`, 'utf8')
const payload03 = readFileSync(`${resources}contract03/synthetic-0.3.analysis-import.json`, 'utf8')

function field(body, name) {
  const at = body.indexOf(`name="${name}"\r\n\r\n`)
  if (at < 0) return null
  const start = at + `name="${name}"\r\n\r\n`.length
  return body.subarray(start, body.indexOf('\r\n', start)).toString('utf8')
}

function as03(payloadJson) {
  const payload = JSON.parse(payloadJson)
  if (payload.contractVersion === '0.3') return payloadJson
  return JSON.stringify({ contractVersion: '0.3', ...payload, analyzer: { ...payload.analyzer, profile: 'e2e-stub-0.3' } })
}

function filePart(body, contentType) {
  const boundary = Buffer.from(`--${contentType.split('boundary=')[1]}`)
  const nameAt = body.indexOf('name="file"')
  const header = body.subarray(nameAt, body.indexOf('\r\n\r\n', nameAt)).toString('utf8')
  const start = body.indexOf('\r\n\r\n', nameAt) + 4
  const end = body.indexOf(Buffer.concat([Buffer.from('\r\n'), boundary]), start)
  const fileName = /filename="([^"]*)"/.exec(header)?.[1] ?? ''
  return { bytes: body.subarray(start, end), fileName }
}

function envelope(status, sha, payload) {
  return JSON.stringify({
    service: { name: 'e2e-stub-analyzer' }, requestId: 'e2e', ok: true, status, analyzerVersion: 'e2e-stub',
    analyzerChannel: 'DEFAULT', source: { sha256: sha },
    backendImport: { contract: 'AnalysisImportRequest', variant: 'OFFICIAL_PDF', importable: true, blockers: [], payload: JSON.parse(payload) },
    warnings: ['E2E Stub(합성 결과)'], errors: [], elapsedMs: 1,
  })
}

createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json' }).end('{"ok":true,"stub":true}')
    return
  }
  if (request.method !== 'POST' || request.url !== '/analyze-preview' || request.headers['x-analysis-token'] !== token) {
    response.writeHead(401).end()
    return
  }
  const chunks = []
  request.on('data', (chunk) => chunks.push(chunk))
  request.on('end', () => {
    const raw = Buffer.concat(chunks)
    const { bytes, fileName } = filePart(raw, request.headers['content-type'] ?? '')
    const requested03 = field(raw, 'contract') === '0.3'
    const sha = createHash('sha256').update(bytes).digest('hex')
    let body
    if (fileName.includes('noresult')) {
      const failed = {
        analyzer: { name: 'curriculum-analysis', version: 'e2e-stub/backend-adapter-0.2' }, source: { sha256: sha, pageCount: 2 },
        status: 'FAILED', failureReason: requested03 ? 'NO_ASSESSMENTS_EXTRACTED' : '평가 목록을 만들지 못함(합성)', subjects: [], warnings: [],
      }
      body = envelope('NO_ASSESSMENTS_EXTRACTED', sha, requested03 ? as03(JSON.stringify(failed)) : JSON.stringify(failed))
    } else {
      const contract03 = fileName.includes('contract03')
      const source = contract03 ? payload03 : payload02
      const original = JSON.parse(source).source.sha256
      const swapped = source.split(original).join(sha)
      body = envelope(contract03 ? 'PARTIAL' : 'OK_REVIEW_REQUIRED', sha, requested03 ? as03(swapped) : swapped)
    }
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }).end(body)
  })
}).listen(port, '127.0.0.1', () => console.log(`e2e stub analyzer on ${port}`))
