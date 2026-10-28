import { ApiError } from './apiError.ts'
import { isMockDataSource } from './dataSource.ts'
import { getUniversityExamDocumentMock, listUniversityExamDocumentsMock } from './mock/universityExamMock.ts'
import type { UniversityExamDocument, UniversityExamFileState } from './types.ts'

// 대학별 기출 PDF (P-25 PROPOSED). §27 대학 자료 목록을 쪽 수·문항 위치·원문 파일까지 넓힌 제안이며 계약에 없다.
// Stage 2에서 서버 계약(문서 상세·파일 Stream·권한·이용 허락)이 정해지기 전까지 Mock + 개발 서버 전용 파일 경로로만 동작한다.

function httpNotConnected(): Promise<never> {
  return Promise.reject(new ApiError(503, { code: 'INTERNAL_ERROR', message: 'Assessment 서버 연결 전이에요. (Stage 2)', details: {} }))
}

/** 제안: GET /api/student/assessment/university-resources (+ 문서 메타데이터·문항 인덱스) */
export function listUniversityExamDocuments(): Promise<{ items: UniversityExamDocument[] }> {
  return isMockDataSource ? listUniversityExamDocumentsMock() : httpNotConnected()
}

/** 제안: GET /api/student/assessment/university-resources/{resourceId} */
export function getUniversityExamDocument(documentId: string): Promise<UniversityExamDocument> {
  return isMockDataSource ? getUniversityExamDocumentMock(documentId) : httpNotConnected()
}

/** 개발 서버 전용 원문 경로 (vite.config.ts `universityExamPdfDevServer`). 허용 목록(Manifest)에 있는 문서 ID만 받는다. */
const devFileBase = '/__dev/university-exams'

/**
 * 원문 PDF 주소. 개발 서버 + Mock에서만 있다. 배포 빌드에는 원문을 넣지 않으므로 null (= "배포 환경에서는 제공하지 않음").
 * 실제 서비스는 서버가 권한·이용 허락을 확인한 뒤 Stream 또는 짧은 수명의 주소를 주어야 한다 (§48 File Contract, P-25).
 */
export function universityExamFileUrl(documentId: string): string | null {
  if (!import.meta.env.DEV || !isMockDataSource) return null
  return `${devFileBase}/files/${encodeURIComponent(documentId)}.pdf`
}

/** 원문 파일 상태 (개발 서버가 Manifest의 크기·SHA-256과 실제 파일을 비교). 확인할 수 없으면 UNKNOWN */
export async function getUniversityExamFileStates(): Promise<Record<string, UniversityExamFileState>> {
  if (!import.meta.env.DEV || !isMockDataSource) return {}
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
