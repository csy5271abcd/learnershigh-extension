import { ApiError } from '../apiError.ts'
import type { AcademicContext, AcademicTermQuery } from '../types.ts'
import { assessmentHttp } from './assessmentHttpClient.ts'

// §9-1 학업 Context HTTP Adapter. 현재 Backend 원천은 Mock(MockAcademicContextProvider, OD-A04 미결)이다.
// Backend는 academicYear·semester를 둘 다 요구한다. "학기 생략 = 현재 학기"는 계약에 없어(C-2) 날짜로 추측하지 않는다:
// 개발 서버에서만 VITE_ASSESSMENT_DEV_CURRENT_TERM(예: 2026-2)을 현재 학기로 쓰고, 없으면 이유를 담은 오류로 끝낸다.

function devCurrentTerm(): AcademicTermQuery | null {
  if (!import.meta.env.DEV) return null
  const raw: unknown = import.meta.env.VITE_ASSESSMENT_DEV_CURRENT_TERM
  const match = typeof raw === 'string' ? /^(\d{4})-([12])$/.exec(raw.trim()) : null
  return match ? { academicYear: Number(match[1]), semester: Number(match[2]) } : null
}

export function getAcademicContextHttp(term?: AcademicTermQuery): Promise<AcademicContext> {
  const query = term ?? devCurrentTerm()
  if (!query) {
    return Promise.reject(
      new ApiError(503, {
        code: 'INTERNAL_ERROR',
        message: '현재 학기를 정하는 기준이 아직 서버 계약에 없어요. 학기를 골라 조회해야 해요. (C-2)',
        details: {},
      }),
    )
  }
  return assessmentHttp('/api/student/assessment/academic-context', {
    query: { academicYear: query.academicYear, semester: query.semester },
  })
}
