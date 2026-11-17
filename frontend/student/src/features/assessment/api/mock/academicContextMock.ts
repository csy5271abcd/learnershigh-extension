import { cleanSubjectName, subjectNameProblem } from '../../model/subjectName.ts'
import type { AcademicContext, AcademicTermQuery, CreateStudentSubjectRequest, SubjectRef, UpdateAcademicContextRequest } from '../types.ts'
import { fixtureCurrentTerm } from './assessmentFixture.ts'
import { fail, respond, scenarioActive } from './mockRuntime.ts'
import { mockStore } from './mockStore.ts'
import {
  contextTermKey,
  loadStudentSubjects,
  newStudentSubjectId,
  saveStudentSubjects,
  storedSubjectIds,
  type StoredStudentSubject,
} from './studentSubjectStore.ts'

// §9 학업 정보 Mock. 소유 학생은 인증 정보에서 정한다는 계약에 맞춰 studentId를 받지 않는다.

/**
 * Sidebar 과목 수 검증용 과목 (화면 확인 전용, 학생 데이터·계약이 아니다). 앞 4개는 현재 학기 Fixture 과목 그대로 쓰고,
 * 나머지는 이 시나리오에서만 보이는 과목이다 (수행평가가 없어 건수 0).
 */
const scenarioExtraSubjects = [
  '공통수학2', '공통영어2', '한국사2', '정보', '음악', '미술', '체육', '기술·가정', '한문', '진로와 직업', '물리학', '화학', '생명과학',
  '지구과학', '확률과 통계', '미적분', '영어 독해와 작문', '문학', '화법과 언어', '세계사', '경제', '정치', '윤리와 사상', '인공지능 기초', '생활과 과학', '일본어',
]
const subjectScenarios = [0, 4, 9, 10, 15, 20, 30] as const

function withScenarioSubjects(context: AcademicContext): AcademicContext {
  const count = subjectScenarios.find((n) => scenarioActive(`subjects${n}`))
  if (count === undefined) return context
  const extras = scenarioExtraSubjects.map((name, index) => ({ subjectId: `subj_scn_${String(index + 1).padStart(2, '0')}`, name }))
  // 시나리오 수는 원래 과목에만 적용하고, 학생이 추가한 과목은 뒤에 붙인다 (예: subjects9 + 1개 추가 = 10개).
  const added = storedSubjectIds()
  const base = context.subjects.filter((subject) => !added.has(subject.subjectId))
  const studentAdded = context.subjects.filter((subject) => added.has(subject.subjectId))
  return { ...context, subjects: [...[...base, ...extras].slice(0, count), ...studentAdded] }
}

const isScenarioSubjectId = (subjectId: string) => subjectId.startsWith('subj_scn_')

function lockedError(): never {
  return fail(409, {
    code: 'ACADEMIC_CONTEXT_LOCKED',
    message: '지금은 학업 정보를 수정할 수 없어요. LearnersHigh 프로필에서 관리하는 정보예요.',
    details: {},
  })
}

function contextMismatch(): never {
  return fail(400, {
    code: 'VALIDATION_ERROR',
    message: '입력값을 확인해주세요.',
    details: { fields: [{ field: 'schoolId', reason: 'mismatch' }] },
  })
}

/** 이 학생의 다른 학기 학업 정보에 있는 과목 (기존 과목 후보, 학교 공식 카탈로그 아님) */
function otherTermSubject(target: AcademicContext, subjectId: string): SubjectRef | undefined {
  for (const context of mockStore.academicContexts) {
    if (context === target) continue
    const subject = context.subjects.find((item) => item.subjectId === subjectId)
    if (subject) return subject
  }
  return undefined
}

/** 저장소 기록을 먼저 바꾸고(실패하면 오류 응답), 그다음에만 Store를 바꾼다 — 저장 실패한 과목이 화면에 남지 않게 */
function persistOrFail(entries: StoredStudentSubject[]) {
  try {
    if (scenarioActive('subjectCreateError')) throw new Error('scenario')
    saveStudentSubjects(entries)
  } catch {
    fail(500, {
      code: 'INTERNAL_ERROR',
      message: '과목을 이 브라우저에 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.',
      details: {},
    })
  }
}

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
    const query = term ?? fixtureCurrentTerm
    const context = findContext(query)
    if (!context) {
      // 학기 없음 전용 Code가 계약에 없어 공통 404를 쓴다.
      fail(404, { code: 'NOT_FOUND', message: '해당 학기의 학업 정보가 없어요.', details: {} })
    }
    const isCurrent = query.academicYear === fixtureCurrentTerm.academicYear && query.semester === fixtureCurrentTerm.semester
    return isCurrent ? withScenarioSubjects(context) : context
  })
}

export function updateAcademicContextMock(request: UpdateAcademicContextRequest): Promise<void> {
  return respond(() => {
    // §9-2: 미승인 수정은 409 ACADEMIC_CONTEXT_LOCKED.
    if (scenarioActive('academicLocked')) lockedError()
    const context = findContext(request)
    if (!context || context.school.schoolId !== request.schoolId || context.grade !== request.grade) contextMismatch()
    // §9-2 subjectIds는 이미 있는 과목만 가리킨다: 이 학기 과목 + 이 학생의 다른 학기 과목(기존 과목 선택, 2026-10-28).
    // Sidebar 과목 수 시나리오 과목(subj_scn_)은 화면 확인용이라 저장 대상이 아니다.
    const requested = request.subjectIds.filter((subjectId) => !isScenarioSubjectId(subjectId))
    const known = new Set(context.subjects.map((subject) => subject.subjectId))
    const fromOtherTerms = requested.filter((subjectId) => !known.has(subjectId)).map((subjectId) => otherTermSubject(context, subjectId))
    if (fromOtherTerms.some((subject) => !subject)) {
      fail(400, {
        code: 'VALIDATION_ERROR',
        message: '입력값을 확인해주세요.',
        details: { fields: [{ field: 'subjectIds', reason: 'unknown' }] },
      })
    }
    const selected = new Set(requested)
    const added = fromOtherTerms as SubjectRef[]
    // 학생이 추가한 과목 기록을 이 학기 선택에 맞춘다 (해제한 추가 과목은 지우고, 다른 학기에서 고른 과목은 남긴다).
    const termKey = contextTermKey(context)
    const entries = loadStudentSubjects().filter((entry) => entry.termKey !== termKey || selected.has(entry.subjectId))
    // 학생이 직접 만든 과목을 다른 학기에서 가져와도 "직접 추가" 표시는 이어진다 (학교 개설 과목처럼 보이지 않게).
    for (const subject of added) {
      entries.push({ termKey, subjectId: subject.subjectId, name: subject.name, origin: subject.addedByStudent ? 'STUDENT_CREATED' : 'OTHER_TERM' })
    }
    persistOrFail(entries)
    // 과목 선택만 바꾼다. 과거 노트·파일·수행평가는 이동하거나 지우지 않는다 (§9-2).
    context.subjects = [
      ...context.subjects.filter((subject) => selected.has(subject.subjectId)),
      ...added.map((subject) => ({ subjectId: subject.subjectId, name: subject.name, ...(subject.addedByStudent ? { addedByStudent: true } : {}) })),
    ]
  })
}

/**
 * 학생이 이름을 직접 입력한 과목을 이 학기에 추가 (P-26 PROPOSED, 계약에 없음 → Mock 전용).
 * 같은 학교·학년도·학년·학기 안에서만 중복을 막고, 다른 학기에는 같은 이름을 따로 만들 수 있다. 다른 학기로 복제하지 않는다.
 */
export function createStudentSubjectMock(request: CreateStudentSubjectRequest): Promise<SubjectRef> {
  return respond(() => {
    if (scenarioActive('academicLocked')) lockedError()
    const context = findContext(request)
    if (!context || context.school.schoolId !== request.schoolId || context.grade !== request.grade) contextMismatch()
    const problem = subjectNameProblem(request.name, context.subjects)
    if (problem) {
      fail(400, {
        code: 'VALIDATION_ERROR',
        message: '입력값을 확인해주세요.',
        details: { fields: [{ field: 'name', reason: problem }] },
      })
    }
    const allIds = new Set(mockStore.academicContexts.flatMap((item) => item.subjects.map((subject) => subject.subjectId)))
    const subject: SubjectRef = { subjectId: newStudentSubjectId(allIds), name: cleanSubjectName(request.name), addedByStudent: true }
    persistOrFail([
      ...loadStudentSubjects(),
      { termKey: contextTermKey(context), subjectId: subject.subjectId, name: subject.name, origin: 'STUDENT_CREATED' },
    ])
    context.subjects.push(subject)
    return subject
  })
}
