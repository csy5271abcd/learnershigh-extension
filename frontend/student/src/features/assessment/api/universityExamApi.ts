import { ApiError } from './apiError.ts'
import { getUniversityExamContent, listUniversityExamContent } from '../content/enrichmentContent.ts'
import type { UniversityExamDocument, UniversityExamFileState } from './types.ts'

// 대학별 기출 PDF (P-25 PROPOSED). §27 대학 자료 목록을 쪽 수·문항 위치·원문 파일까지 넓힌 제안이며 계약에 없다.
// 2026-11-11: 메타데이터는 정적 참고자료(content/enrichmentContent.ts)에서 읽는다. dataSource(mock|http)와 무관하다.
// 원문 PDF는 계속 개발 서버 전용 경로로만 열린다(배포 빌드에는 없음, API-OD-A11).

/** 제안: GET /api/student/assessment/university-resources (+ 문서 메타데이터·문항 인덱스) */
export function listUniversityExamDocuments(): Promise<{ items: UniversityExamDocument[] }> {
  return Promise.resolve({ items: listUniversityExamContent() })
}

/** 제안: GET /api/student/assessment/university-resources/{resourceId} */
export function getUniversityExamDocument(documentId: string): Promise<UniversityExamDocument> {
  const document = getUniversityExamContent(documentId)
  return document
    ? Promise.resolve(document)
    : Promise.reject(new ApiError(404, { code: 'UNIVERSITY_RESOURCE_NOT_FOUND', message: '대학 자료를 찾을 수 없어요.', details: { resourceId: documentId } }))
}

/** 개발 서버 전용 원문 경로 (vite.config.ts `universityExamPdfDevServer`). 허용 목록(Manifest)에 있는 문서 ID만 받는다. */
const devFileBase = '/__dev/university-exams'

/**
 * 원문 PDF 주소. 개발 서버(mock·http 모두)에서만 있다. 배포 빌드에는 원문을 넣지 않으므로 null (= "배포 환경에서는 제공하지 않음").
 * 실제 서비스는 서버가 권한·이용 허락을 확인한 뒤 Stream 또는 짧은 수명의 주소를 주어야 한다 (§48 File Contract, P-25).
 */
export function universityExamFileUrl(documentId: string): string | null {
  if (!import.meta.env.DEV) return null
  return `${devFileBase}/files/${encodeURIComponent(documentId)}.pdf`
}

/** 원문 파일 상태 (개발 서버가 Manifest의 크기·SHA-256과 실제 파일을 비교). 확인할 수 없으면 UNKNOWN */
export async function getUniversityExamFileStates(): Promise<Record<string, UniversityExamFileState>> {
  if (!import.meta.env.DEV) return {}
  try {
    const response = await fetch(`${devFileBase}/status`, { cache: 'no-store' })
    if (!response.ok) return {}
    const body = (await response.json()) as { documents?: { documentId: string; state: string }[] }
    const states: Record<string, UniversityExamFileState> = {}
    for (const item of body.documents ?? []) {
      states[item.documentId] = item.state === 'AVAILABLE' || item.state === 'MISSING' || item.state === 'CHANGED' ? item.state : 'UNKNOWN'
    }
    return states
  } catch {
    return {}
  }
}
