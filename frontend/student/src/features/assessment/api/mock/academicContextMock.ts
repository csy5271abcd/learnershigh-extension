import type { AcademicContext, AcademicTermQuery, UpdateAcademicContextRequest } from '../types.ts'
import { fixtureCurrentTerm } from './assessmentFixture.ts'
import { fail, respond, scenarioActive } from './mockRuntime.ts'
import { mockStore } from './mockStore.ts'

// §9 학업 정보 Mock. 소유 학생은 인증 정보에서 정한다는 계약에 맞춰 studentId를 받지 않는다.

function findContext(term: AcademicTermQuery): AcademicContext | undefined {
  return mockStore.academicContexts.find(
    (context) => context.academicYear === term.academicYear && context.semester === term.semester,
  )
}

export function getAcademicContextMock(term?: AcademicTermQuery): Promise<AcademicContext> {
  return respond(() => {
    if (scenarioActive('contextError')) {
      // §6 / §53: 기존 학생 컨텍스트 연동 장애. 빈 학업 정보로 바꾸지 않는다.
      fail(503, {
        code: 'EXISTING_STUDENT_UNAVAILABLE',
        message: '기존 LearnersHigh 학생 정보 연동에 일시적인 문제가 있어요.',
        details: {},
      })
    }
    const context = findContext(term ?? fixtureCurrentTerm)
    if (!context) {
      // 학기 없음 전용 Code가 계약에 없어 공통 404를 쓴다.
      fail(404, { code: 'NOT_FOUND', message: '해당 학기의 학업 정보가 없어요.', details: {} })
    }
    return context
  })
}

export function updateAcademicContextMock(request: UpdateAcademicContextRequest): Promise<void> {
  return respond(() => {
    if (scenarioActive('academicLocked')) {
      // §9-2: 미승인 수정은 409 ACADEMIC_CONTEXT_LOCKED.
      fail(409, {
        code: 'ACADEMIC_CONTEXT_LOCKED',
        message: '지금은 학업 정보를 수정할 수 없어요. LearnersHigh 프로필에서 관리하는 정보예요.',
        details: {},
      })
    }
    const context = findContext(request)
    if (!context || context.school.schoolId !== request.schoolId || context.grade !== request.grade) {
      fail(400, {
        code: 'VALIDATION_ERROR',
        message: '입력값을 확인해주세요.',
        details: { fields: [{ field: 'schoolId', reason: 'mismatch' }] },
      })
    }
    const known = new Set(context.subjects.map((subject) => subject.subjectId))
    const unknown = request.subjectIds.filter((subjectId) => !known.has(subjectId))
    if (unknown.length > 0) {
      fail(400, {
        code: 'VALIDATION_ERROR',
        message: '입력값을 확인해주세요.',
        details: { fields: [{ field: 'subjectIds', reason: 'unknown' }] },
      })
    }
    // 과목 선택만 바꾼다. 과거 노트·파일·수행평가는 이동하거나 지우지 않는다 (§9-2).
    const selected = new Set(request.subjectIds)
    context.subjects = context.subjects.filter((subject) => selected.has(subject.subjectId))
  })
}
