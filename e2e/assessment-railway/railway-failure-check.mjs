// A19: 원격(Railway) 분석기 실패 경로 — Backend를 잘못된 토큰 또는 짧은 Backend 제한으로 띄운 상태에서 합성 문서 1건만 보낸다.
// 원격 분석기의 설정·Flag는 바꾸지 않는다. 확인: Backend 오류 응답, 분석 상태 NOT_REQUESTED 유지, Run 미생성, 학생 비공개.
// 사용: node railway-failure-check.mjs <manifest.json> <demo-roster.json> <label> <out.json>
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const API = process.env.A19_API ?? 'http://127.0.0.1:19194'
const PLANS = `${API}/api/admin/assessment/evaluation-plans`
const op = { 'X-Assessment-Admin-Id': 'adm_plan_operator' }
const manifest = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const roster = JSON.parse(readFileSync(process.argv[3], 'utf8'))
if (manifest.synthetic !== true) throw new Error('합성 manifest만')
const item = manifest.items.find((i) => i.id === 'SYN-G1-HWPX')
const bytes = readFileSync(join(manifest.dir, item.file))
if (createHash('sha256').update(bytes).digest('hex') !== item.sha256) throw new Error('SHA 불일치 — 전송 거절')
const school = roster.students.find((s) => s.studentId === 'stu_demo_001').school.schoolId
const g1 = roster.students.find((s) => s.school.schoolId === school && s.grade === 1).studentId

const form = new FormData()
form.append('file', new Blob([bytes], { type: 'application/hwp+zip' }), `synthetic-a19-g1-fail-${process.argv[4]}-${Date.now().toString(36)}.hwpx`)
for (const [k, v] of Object.entries({ schoolId: school, academicYear: '2026', grade: '1', semester: '1' })) form.append(k, v)
const plan = await (await fetch(PLANS, { method: 'POST', headers: op, body: form })).json()
const t0 = performance.now()
const res = await fetch(`${PLANS}/${plan.planId}/revisions/${plan.documentRevisionId}/analysis`, { method: 'POST', headers: op })
const ms = Math.round(performance.now() - t0)
const body = await res.json().catch(() => ({}))
const detail = await (await fetch(`${PLANS}/${plan.planId}`, { headers: op })).json()
const analysis = await fetch(`${PLANS}/${plan.planId}/revisions/${plan.documentRevisionId}/analysis`, { headers: op })
const student = await fetch(`${API}/api/student/assessment/evaluation-plans/${plan.planId}`, { headers: { 'X-Assessment-Student-Id': g1 } })
const out = { label: process.argv[4], planId: plan.planId, revisionId: plan.documentRevisionId, status: res.status, code: body.code, details: body.details, ms,
  revisionAnalysisStatus: detail.revisions?.[0]?.analysisStatus, reviewStatus: detail.revisions?.[0]?.reviewStatus, analysisGet: analysis.status, studentG1: student.status,
  bodyHasToken: /token/i.test(JSON.stringify(body)) && /a19-intentionally-wrong-token/.test(JSON.stringify(body)) }
writeFileSync(process.argv[5], JSON.stringify(out, null, 1))
console.log(JSON.stringify(out))
