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

/** 부록 F: 글자가 없는 1쪽 합성 PDF(학년·학기 근거가 원문에도 없는 '미분류' 원본 시험용). 실행마다 다른 SHA */
export function blankPdf(tag: string): Buffer {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << >> >>',
  ]
  let body = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body))
    body += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = Buffer.byteLength(body)
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) body += `${String(offset).padStart(10, '0')} 00000 n \n`
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n% e2e ${tag} ${Date.now()} ${Math.random()}\n`
  return Buffer.from(body, 'latin1')
}

/**
 * A27-UX 부록 K: 학생 홈 '학교 평가계획서 원본 · 3개년' 첫 칸(올해·현재 학기)이 서버 §10-1-3 응답과 같은지.
 * 공급자는 학교알리미 수집 원본으로 연결됐다 — '확인되지 않음'(미연결) 문구는 더 나오지 않는다.
 */
export async function expectOfficialSlotMatchesServer(
  page: import('@playwright/test').Page,
  request: import('@playwright/test').APIRequestContext,
  studentId = 'stu_001',
  academicYear = 2026,
  semester = 2,
) {
  const { expect } = await import('@playwright/test')
  const slot = page.getByTestId('home-official-slot').first()
  // 학교알리미 작업 줄은 서버에 하나라 앞 작업(수집·서버 분석)이 끝나야 이 학교 확인이 시작될 수 있다
  await expect(page.locator('[data-testid="official-ensure-status"][data-state="RUNNING"]')).toHaveCount(0, { timeout: 240_000 })
  const server = await (await request.get('http://127.0.0.1:18090/api/student/assessment/evaluation-plans/official', {
    headers: { 'X-Assessment-Student-Id': studentId },
    params: { academicYear: String(academicYear), semester: String(semester) },
  })).json()
  expect(server.sourceConnected).toBe(true)
  await expect(slot.getByTestId('official-document')).toHaveCount(server.documents.length, { timeout: 30_000 })
  await expect(slot).not.toContainText('공식 원본이 아직 확인되지 않았어요')
  return server as { documents: { fileName: string }[] }
}
