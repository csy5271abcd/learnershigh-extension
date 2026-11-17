// Admin 평가계획서 "등록 → 같은 바이트 로컬 분석 → 분석 후보 수신"을 기존 API로 수행 (Admin 화면 자동 분석 흐름과 같은 순서).
// usage: node admin-plan-register-import.mjs <tokenFile> <planFile> <grade> <semester> <outJson>
// - 대상: 시연 DB의 예시고등학교(school_001). 운영 권한이 있는 개발 관리자(adm_demo_gangnam)만 사용. 권한 우회 없음.
// - 합성 평가계획서만 등록한다(실제 학교 문서는 공식 DB 반입 승인 전이라 등록하지 않음 — 미리보기로만 분석).
// - 같은 SHA-256 문서가 이미 이 슬롯에 있으면 새로 등록하지 않고 기존 Revision에 수신 여부만 확인한다(재실행 안전).
// - 분석 후보는 DRAFT(검토 전)로만 저장된다. 확정은 관리자 검토 화면에서 사람이 한다(이 스크립트는 확정하지 않음).
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'

const [tokenFile, planFile, grade, semester, outJson] = process.argv.slice(2)
const API = 'http://localhost:18080'
const AD = { 'X-Assessment-Admin-Id': 'adm_demo_gangnam' }
const token = readFileSync(tokenFile, 'utf8').trim()
const bytes = readFileSync(planFile)
const sha = createHash('sha256').update(bytes).digest('hex')
const type = planFile.endsWith('.pdf') ? 'application/pdf' : planFile.endsWith('.hwpx') ? 'application/hwp+zip' : 'application/x-hwp'
const out = { planFile: basename(planFile), sha256: sha, sizeBytes: bytes.length, slot: { schoolId: 'school_001', academicYear: 2026, grade: Number(grade), semester: Number(semester) }, steps: [] }
const step = (name, status, detail) => {
  out.steps.push({ name, status, detail })
  console.log(name, status, JSON.stringify(detail ?? '').slice(0, 300))
}

const existing = await (await fetch(`${API}/api/admin/assessment/evaluation-plans?schoolId=school_001&academicYear=2026&grade=${grade}&semester=${semester}`, { headers: AD })).json()
let planId
let revisionId
for (const plan of existing.items ?? []) {
  const detail = await (await fetch(`${API}/api/admin/assessment/evaluation-plans/${plan.planId}`, { headers: AD })).json()
  const match = (detail.revisions ?? []).find((r) => (r.file?.sha256 ?? r.sha256) === sha)
  if (match) {
    planId = plan.planId
    revisionId = match.revisionId ?? match.documentRevisionId
  }
}
if (planId) step('1-등록', 'REUSED', { planId, revisionId })
else {
  const form = new FormData()
  form.append('file', new Blob([bytes], { type }), basename(planFile))
  for (const [k, v] of Object.entries({ schoolId: 'school_001', academicYear: '2026', grade, semester })) form.append(k, v)
  const response = await fetch(`${API}/api/admin/assessment/evaluation-plans`, { method: 'POST', headers: AD, body: form })
  const body = await response.json().catch(() => null)
  step('1-등록', response.status, body)
  if (response.status >= 300) {
    writeFileSync(outJson, JSON.stringify(out, null, 2) + '\n', 'utf8')
    process.exit(2)
  }
  planId = body.planId
  revisionId = body.documentRevisionId ?? body.revisionId ?? body.currentRevision?.revisionId
}

const analysisForm = new FormData()
analysisForm.append('file', new Blob([bytes], { type }), basename(planFile))
const analysisResponse = await fetch('http://127.0.0.1:8765/analyze-preview', { method: 'POST', headers: { 'X-Analysis-Token': token }, body: analysisForm })
const analysis = await analysisResponse.json()
step('2-분석', analysisResponse.status, { status: analysis.status, version: analysis.analyzerVersion, llmCalls: analysis.analysisMode?.llmCalls, summary: analysis.summary, importable: analysis.backendImport?.importable, variant: analysis.backendImport?.variant })

const importResponse = await fetch(`${API}/api/admin/assessment/evaluation-plans/${planId}/revisions/${revisionId}/analysis-imports`, {
  method: 'POST',
  headers: { ...AD, 'Content-Type': 'application/json' },
  body: JSON.stringify(analysis.backendImport.payload),
})
const imported = await importResponse.json().catch(() => null)
step('3-분석 후보 수신', importResponse.status, imported)
out.planId = planId
out.revisionId = revisionId
out.reviewUrl = `http://localhost:5174/assessment/evaluation-plans/${planId}/revisions/${revisionId}`
writeFileSync(outJson, JSON.stringify(out, null, 2) + '\n', 'utf8')
console.log('review:', out.reviewUrl)
