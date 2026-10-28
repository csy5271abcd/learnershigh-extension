import type {
  ChangeSchoolAssessmentStatusResponse,
  CreateSchoolAssessmentRequest,
  ListSchoolAssessmentsQuery,
  PageResponse,
  SchoolAssessment,
  SchoolAssessmentStatus,
} from '../types.ts'
import type { SchoolAssessmentRecord } from './assessmentFixture.ts'
import { fail, mockNow, nextMockId, respond, scenarioActive } from './mockRuntime.ts'
import { mockStore } from './mockStore.ts'

// §12·13 학교 수행평가 Mock.

const statusOrder: Record<SchoolAssessmentStatus, number> = { BEFORE_START: 0, IN_PROGRESS: 1, COMPLETED: 2 }
const statuses = Object.keys(statusOrder) as SchoolAssessmentStatus[]
const datePattern = /^\d{4}-\d{2}-\d{2}$/

/** Store Record → §12 응답 Shape. 응답에 없는 필드(학기·설명)는 내보내지 않는다. */
function toResponse(record: SchoolAssessmentRecord): SchoolAssessment {
  return {
    assessmentId: record.assessmentId,
    title: record.title,
    subjectId: record.subjectId,
    status: record.status,
    deadlineDate: record.deadlineDate,
    createdAt: record.createdAt,
    evaluationItemRef: record.evaluationItemRef,
  }
}

function subjectName(record: SchoolAssessmentRecord): string {
  const context = mockStore.academicContexts.find(
    (item) => item.academicYear === record.academicYear && item.semester === record.semester,
  )
  return context?.subjects.find((subject) => subject.subjectId === record.subjectId)?.name ?? ''
}

function compare(sort: ListSchoolAssessmentsQuery['sort']) {
  return (a: SchoolAssessmentRecord, b: SchoolAssessmentRecord): number => {
    if (sort === 'title,asc') return a.title.localeCompare(b.title, 'ko')
    if (sort === 'createdAt,desc') return b.createdAt.localeCompare(a.createdAt)
    // deadlineDate,asc — 날짜 미정은 뒤로 보낸다.
    if (a.deadlineDate === b.deadlineDate) return a.createdAt.localeCompare(b.createdAt)
    if (a.deadlineDate === null) return 1
    if (b.deadlineDate === null) return -1
    return a.deadlineDate.localeCompare(b.deadlineDate)
  }
}

export function listSchoolAssessmentsMock(query: ListSchoolAssessmentsQuery): Promise<PageResponse<SchoolAssessment>> {
  return respond(() => {
    if (scenarioActive('listError')) {
      fail(500, { code: 'INTERNAL_ERROR', message: '일시적인 서버 오류가 발생했어요.', details: {} })
    }
    const keyword = query.query?.trim().toLocaleLowerCase('ko') ?? ''
    const matched = scenarioActive('empty')
      ? []
      : mockStore.schoolAssessments
          .filter((record) => record.academicYear === query.academicYear && record.semester === query.semester)
          .filter((record) => !query.subjectId || record.subjectId === query.subjectId)
          .filter((record) => !query.status || record.status === query.status)
          .filter(
            (record) =>
              keyword === '' ||
              record.title.toLocaleLowerCase('ko').includes(keyword) ||
              subjectName(record).toLocaleLowerCase('ko').includes(keyword),
          )
          .sort(compare(query.sort))

    const start = query.page * query.size
    return {
      items: matched.slice(start, start + query.size).map(toResponse),
      page: {
        number: query.page,
        size: query.size,
        totalElements: matched.length,
        totalPages: Math.ceil(matched.length / query.size),
      },
    }
  })
}

function findRecord(assessmentId: string): SchoolAssessmentRecord {
  const record = mockStore.schoolAssessments.find((item) => item.assessmentId === assessmentId)
  if (!record) fail(404, { code: 'ASSESSMENT_NOT_FOUND', message: '수행평가를 찾을 수 없어요.', details: {} })
  return record
}

export function getSchoolAssessmentMock(assessmentId: string): Promise<SchoolAssessment> {
  return respond(() => toResponse(findRecord(assessmentId)))
}

export function createSchoolAssessmentMock(request: CreateSchoolAssessmentRequest): Promise<SchoolAssessment> {
  return respond(() => {
    if (scenarioActive('createError')) {
      fail(500, { code: 'INTERNAL_ERROR', message: '일시적인 서버 오류로 저장하지 못했어요.', details: {} })
    }
    const fields: { field: string; reason: string }[] = []
    const title = request.title.trim()
    if (scenarioActive('createValidation') || title === '') fields.push({ field: 'title', reason: 'required' })
    const context = mockStore.academicContexts.find(
      (item) => item.academicYear === request.academicYear && item.semester === request.semester,
    )
    if (!context) fields.push({ field: 'semester', reason: 'unknown' })
    else if (!context.subjects.some((subject) => subject.subjectId === request.subjectId)) {
      fields.push({ field: 'subjectId', reason: request.subjectId ? 'unknown' : 'required' })
    }
    if (request.deadlineDate !== null && !datePattern.test(request.deadlineDate)) {
      fields.push({ field: 'deadlineDate', reason: 'format' })
    }
    if (!statuses.includes(request.status)) fields.push({ field: 'status', reason: 'enum' })
    if (fields.length > 0) {
      fail(400, { code: 'VALIDATION_ERROR', message: '입력값을 확인해주세요.', details: { fields } })
    }

    const record: SchoolAssessmentRecord = {
      assessmentId: nextMockId('assessment'),
      title,
      subjectId: request.subjectId,
      status: request.status,
      deadlineDate: request.deadlineDate,
      createdAt: mockNow(),
      evaluationItemRef: request.evaluationItemRef,
      academicYear: request.academicYear,
      semester: request.semester,
      description: request.description?.trim() || null,
    }
    mockStore.schoolAssessments.push(record)
    return toResponse(record)
  })
}

export function changeSchoolAssessmentStatusMock(
  assessmentId: string,
  status: SchoolAssessmentStatus,
): Promise<ChangeSchoolAssessmentStatusResponse> {
  return respond(() => {
    const record = findRecord(assessmentId)
    // §13: 역전이 정책이 확정되지 않았으므로 되돌리기는 허용하지 않는다 (MM-01).
    if (scenarioActive('statusConflict') || statusOrder[status] < statusOrder[record.status]) {
      fail(409, {
        code: 'INVALID_STATE_TRANSITION',
        message: '현재 상태에서 해당 동작을 할 수 없습니다.',
        details: { currentState: record.status, requestedAction: status },
      })
    }
    record.status = status
    return { assessmentId, status, updatedAt: mockNow() }
  })
}
