import { readFileSync } from 'node:fs'
import { expect, type APIRequestContext } from '@playwright/test'

// Assessment E2E 공용 도우미. 데이터 초기화 API를 쓰지 않는다 — 실행마다 고유한 파일(원문 끝 주석)로 새 문서를 만든다.
export const API = 'http://127.0.0.1:18090'
export const STUDENT = 'http://localhost:5191'
export const ADMIN = 'http://localhost:5192'
export const PLANS = `${API}/api/admin/assessment/evaluation-plans`
export const ADMIN_ID = 'adm_plan_operator'
export const STUDENT_ID = 'stu_001'

const basePdf = readFileSync(new URL('../../backend/src/test/resources/assessment/analyzer-v21_1/synthetic-e2e.pdf', import.meta.url))

/** 합성 PDF + 고유 주석 → 실행마다 다른 SHA (서버는 같은 문서에 같은 원문을 막는다) */
export function uniquePdf(tag: string): Buffer {
  return Buffer.concat([basePdf, Buffer.from(`\n% e2e ${tag} ${Date.now()} ${Math.random()}\n`)])
}

export const runTag = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`

export interface Doc {
  planId: string
  revisionId: string
  analysisId: string
  fileName: string
  bytes: Buffer
}

export async function registerAndAnalyze(request: APIRequestContext, year: number, fileName: string, bytes: Buffer): Promise<Doc> {
  const created = await request.post(PLANS, {
    headers: { 'X-Assessment-Admin-Id': ADMIN_ID },
    multipart: { file: { name: fileName, mimeType: 'application/pdf', buffer: bytes }, schoolId: 'school_001', academicYear: String(year), grade: '1', semester: '2' },
  })
  expect(created.status()).toBe(201)
  const plan = await created.json()
  const analysis = await request.post(`${PLANS}/${plan.planId}/revisions/${plan.documentRevisionId}/analysis`, { headers: { 'X-Assessment-Admin-Id': ADMIN_ID } })
  expect(analysis.status()).toBe(201)
  return { planId: plan.planId, revisionId: plan.documentRevisionId, analysisId: (await analysis.json()).analysisId, fileName, bytes }
}

export async function confirmEvaluation(request: APIRequestContext, doc: Doc, subjectId: string, fields: { fieldPath: string; value: string | number | null; pdfPageNumber: number | null }[]) {
  const response = await request.put(`${PLANS}/${doc.planId}/revisions/${doc.revisionId}/review`, {
    headers: { 'X-Assessment-Admin-Id': 'adm_gangnam' },
    data: { analysisId: doc.analysisId, decision: 'CONFIRM', reviewedSubjects: [{ subjectId, confirmedFields: fields }] },
  })
  expect(response.status()).toBe(200)
}
