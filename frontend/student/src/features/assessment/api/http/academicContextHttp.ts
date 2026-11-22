import type { AcademicContext, AcademicTermQuery } from '../types.ts'
import { assessmentHttp } from './assessmentHttpClient.ts'

// §9-1 학업 Context HTTP Adapter. 현재 Backend 원천은 Mock(MockAcademicContextProvider, OD-A04 미결)이다.
// Backend는 academicYear·semester를 둘 다 요구한다. "학기 생략 = 현재 학기"는 계약에 없어(C-2) 날짜로 추측하지 않는다:
// 부록 O §9-2: 학기를 고르지 않았으면 서버 현재 학기(GET /api/student/assessment/current-term, KST 달력)로 조회한다 — 설정 불필요.

let serverTerm: Promise<AcademicTermQuery> | null = null

/** 서버와 같은 규칙(KST 달력: 3~8월 1학기, 9~2월 2학기, 1·2월은 전년도). 서버 현재 학기 API 가 없거나 실패할 때만 쓴다 */
export function calendarTerm(now: Date = new Date()): AcademicTermQuery {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric' }).formatToParts(now)
  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  if (month <= 2) return { academicYear: year - 1, semester: 2 }
  return { academicYear: year, semester: month <= 8 ? 1 : 2 }
}

function currentTerm(): Promise<AcademicTermQuery> {
  serverTerm ??= assessmentHttp<AcademicTermQuery>('/api/student/assessment/current-term').then(
    (term) => ({ academicYear: term.academicYear, semester: term.semester }),
    () => {
      // 인증 실패 등은 학적 조회가 그대로 다시 알려 준다. 현재 학기만 같은 규칙의 달력 값으로 정한다(추측 아님 — 서버 규칙과 동일)
      serverTerm = null
      return calendarTerm()
    },
  )
  return serverTerm
}

export async function getAcademicContextHttp(term?: AcademicTermQuery): Promise<AcademicContext> {
  const query = term ?? (await currentTerm())
  return assessmentHttp('/api/student/assessment/academic-context', {
    query: { academicYear: query.academicYear, semester: query.semester },
  })
}
