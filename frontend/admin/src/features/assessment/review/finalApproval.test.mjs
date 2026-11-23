// A28-05 원클릭 최종 승인 계획 시험 (node --test). 서버 상태를 바꾸지 않는 순수 함수.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { finalApprovalPlan } from './finalApproval.ts'

const locator = { kind: 'HWPX_TABLE_CELL', section: 0, path: 'p3.c0.r2c4', table: 1, row: 2, col: 4 }
const field = (subjectIndex, fieldPath, candidate, { pages = [3], locators = [] } = {}) => ({
  subjectIndex, subjectName: `s${subjectIndex}`, fieldPath, label: fieldPath, kind: 'number', candidate,
  sourcePages: pages, sourceLocators: locators.map(() => '위치'), documentLocators: locators,
})
const view = (format, fields, subjects = ['공통국어2', '공통수학2', '물리학Ⅱ'], extra = {}) => ({
  planId: 'p', documentRevisionId: 'r', analysisId: 'a', analysisStatus: 'REVIEW_REQUIRED', reviewStatus: 'UNREVIEWED',
  subjects: subjects.map((subjectName) => ({ subjectName })), subjectGrades: subjects.map(() => [1]), slot: { schoolId: 's', academicYear: 2026, grade: 1, semester: 2 },
  revisionFile: { fileName: 'x', pageCount: 10, checksum: 'c', documentFormat: format }, reviewFields: fields, confirmedFields: [], ...extra,
})
const slotSubjects = [{ subjectId: 'subj_k', name: '공통국어2' }, { subjectId: 'subj_m', name: '공통 수학2' }]
const base = { decisions: {}, adminLinks: {}, excluded: new Set(), slotSubjects, reReview: false, serverOriginal: true, expectedDraftVersion: 3 }

test('HWPX 16개: 개별 승인 없이 전부 기본 승인 · 원문 위치로 확정 · 서버 원본 검증 1회 요청', () => {
  const fields = Array.from({ length: 16 }, (_, i) => field(0, `performanceEvaluation.items[${i}].weightPercent`, 10 + i, { pages: [], locators: [locator] }))
  const plan = finalApprovalPlan({ ...base, view: view('HWPX', fields, ['공통국어2']) })
  assert.deepEqual(plan.blockers, [])
  assert.equal(plan.counts.approved, 16)
  assert.equal(plan.counts.defaulted, 16)
  assert.deepEqual(plan.request.sourceCheck, { method: 'SERVER_STORED_ORIGINAL' })
  assert.equal(plan.request.bulk, true)
  assert.equal(plan.request.expectedDraftVersion, 3)
  assert.equal(plan.request.reviewedSubjects.length, 1)
  assert.deepEqual(plan.request.reviewedSubjects[0], { subjectId: 'subj_k', analysisSubjectIndex: 0, confirmedFields: plan.request.reviewedSubjects[0].confirmedFields })
  assert.deepEqual(plan.request.reviewedSubjects[0].confirmedFields[0], { fieldPath: 'performanceEvaluation.items[0].weightPercent', value: 10, pdfPageNumber: null, documentLocator: locator })
})

test('PDF: 관리자 수정값 우선 · 수정 안 한 값은 AI 값 · 값·근거 없는 항목은 만들지 않고 빼되 막지 않는다 · 과목명 공백 차이도 기본 연결', () => {
  const fields = [field(0, 'a', 20), field(0, 'b', 30), field(0, 'c', null), field(1, 'd', 40, { pages: [] }), field(1, 'e', 50, { pages: [7] })]
  const decisions = { '0|b': { kind: 'edited', value: '35', page: '4' } }
  const plan = finalApprovalPlan({ ...base, view: view('PDF', fields), decisions })
  assert.deepEqual(plan.blockers, [])
  assert.deepEqual(plan.counts, { total: 5, approved: 3, defaulted: 2, edited: 1, confirmed: 0, absent: 0, skippedNoEvidence: 2, skippedSubject: 0, excludedFields: 0 })
  const all = plan.request.reviewedSubjects.flatMap((s) => s.confirmedFields)
  assert.deepEqual(all.find((f) => f.fieldPath === 'b'), { fieldPath: 'b', value: 35, pdfPageNumber: 4 })
  assert.deepEqual(all.find((f) => f.fieldPath === 'a'), { fieldPath: 'a', value: 20, pdfPageNumber: 3 })
  assert.equal(all.find((f) => f.fieldPath === 'c'), undefined, '원문에 없는 값을 만들지 않는다')
  assert.deepEqual(plan.autoLinked, [0, 1])
  assert.ok(plan.warnings.some((w) => w.includes('2개')))
})

test('과목 연결: 이름이 맞는 학업 과목이 없으면 그 과목만 빼고 알린다 · 다른 학년·제외 과목도 뺀다', () => {
  const fields = [field(0, 'a', 1), field(2, 'b', 2), field(1, 'c', 3)]
  const v = view('PDF', fields, ['공통국어2', '공통수학2', '물리학Ⅱ'], { subjectGrades: [[1], [3], [1]] })
  const plan = finalApprovalPlan({ ...base, view: v, excluded: new Set() })
  assert.deepEqual(plan.unlinkedSubjects, ['물리학Ⅱ'])
  assert.deepEqual(plan.gradeConflictSubjects, ['공통수학2'])
  assert.equal(plan.counts.skippedSubject, 2)
  assert.deepEqual(plan.request.reviewedSubjects.map((s) => s.analysisSubjectIndex), [0])
  const excluded = finalApprovalPlan({ ...base, view: v, excluded: new Set([0]) })
  assert.equal(excluded.counts.excludedFields, 1)
  assert.equal(excluded.request, null, '승인할 값이 없으면 막는다')
  assert.ok(excluded.blockers.some((b) => b.includes('승인할 수 있는 값이 없어요')))
})

test('무결성 조건: 학교알리미 원본 아님 · 확정된 문서(재검토 전) · 실패 분석은 막는다', () => {
  const fields = [field(0, 'a', 1)]
  assert.ok(finalApprovalPlan({ ...base, view: view('PDF', fields), serverOriginal: false }).blockers.some((b) => b.includes('학교알리미')))
  assert.ok(finalApprovalPlan({ ...base, view: view('PDF', fields, undefined, { reviewStatus: 'CONFIRMED' }) }).blockers.some((b) => b.includes('확정 내용 수정')))
  assert.equal(finalApprovalPlan({ ...base, view: view('PDF', fields, undefined, { reviewStatus: 'CONFIRMED' }), reReview: true }).blockers.length, 0)
  assert.ok(finalApprovalPlan({ ...base, view: view('PDF', fields, undefined, { analysisStatus: 'FAILED' }) }).request === null)
})

// A28-08 통합 최종 승인: 수행·지필·월별 운영계획을 한 요청으로
const tpRow = (rowKey, page) => ({ rowKey, month: 3, unit: 'u', content: 'c', sources: page ? [{ pdfPageNumber: page }] : [] })
const withTeaching = (extra = {}) =>
  view('PDF', [field(0, 'performanceEvaluation.items[0].weightPercent', 20), field(0, 'writtenEvaluation.weightPercent', 60), field(2, 'performanceEvaluation.weightPercent', 40)], ['공통국어2', '공통수학2', '물리학Ⅱ'], {
    teachingPlanCandidates: [
      { subjectIndex: 0, subjectName: '공통국어2', extractionStatus: 'COMPLETE', issues: [], rows: [tpRow('T01', 2), tpRow('T02', 2), tpRow('T03', null)] },
      { subjectIndex: 2, subjectName: '물리학Ⅱ', extractionStatus: 'COMPLETE', issues: [], rows: [tpRow('T09', 5)] },
    ],
    ...extra,
  })
const open = { status: { confirmed: false, reopened: false }, decisions: {} }

test('A28-08: 운영계획 확정 전이면 같은 요청에 teachingPlan 을 넣고 유형별로 센다 · 근거 없는 행·연결 안 된 과목 행은 뺀다 · 관리자 제외 우선', () => {
  const decisions = { '0|teachingPlan[1]': { kind: 'absent', page: '2' } }
  const plan = finalApprovalPlan({ ...base, view: withTeaching(), teaching: { ...open, decisions } })
  assert.deepEqual(plan.blockers, [])
  assert.deepEqual(plan.byType.performance, { approved: 1, skipped: 1 })
  assert.deepEqual(plan.byType.written, { approved: 1, skipped: 0 })
  assert.deepEqual({ ...plan.byType.teaching }, { approved: 1, excluded: 1, skipped: 2, state: 'open' })
  assert.deepEqual(plan.request.teachingPlan, {
    analysisId: 'a',
    rows: [
      { subjectIndex: 0, rowKey: 'T01', subjectId: 'subj_k', decision: 'CONFIRMED' },
      { subjectIndex: 0, rowKey: 'T02', subjectId: 'subj_k', decision: 'EXCLUDED' },
    ],
  })
  assert.equal(plan.teachingOnlyRequest, null)
})

test('A28-08: 운영계획이 이미 확정이면 넣지 않고 알린다 · 상태를 모르면 막는다(부분 승인 방지)', () => {
  const confirmed = finalApprovalPlan({ ...base, view: withTeaching(), teaching: { status: { confirmed: true, reopened: false }, decisions: {} } })
  assert.equal(confirmed.request.teachingPlan, undefined)
  assert.equal(confirmed.byType.teaching.state, 'confirmed')
  assert.ok(confirmed.warnings.some((w) => w.includes('이미 확정')))
  for (const status of [null, 'error']) {
    const plan = finalApprovalPlan({ ...base, view: withTeaching(), teaching: { status, decisions: {} } })
    assert.equal(plan.request, null)
    assert.ok(plan.blockers.some((b) => b.includes('월별 운영계획')))
  }
})

test('A28-08: 평가 정보만 확정된 문서는 남은 운영계획만 승인한다(평가 재확정 요청 없음) · 둘 다 확정이면 막는다', () => {
  const v = withTeaching({ reviewStatus: 'CONFIRMED' })
  const only = finalApprovalPlan({ ...base, view: v, teaching: open })
  assert.equal(only.request, null)
  assert.deepEqual(only.blockers, [])
  assert.deepEqual(only.teachingOnlyRequest, { analysisId: 'a', rows: [
    { subjectIndex: 0, rowKey: 'T01', subjectId: 'subj_k', decision: 'CONFIRMED' },
    { subjectIndex: 0, rowKey: 'T02', subjectId: 'subj_k', decision: 'CONFIRMED' },
  ] })
  const both = finalApprovalPlan({ ...base, view: v, teaching: { status: { confirmed: true, reopened: false }, decisions: {} } })
  assert.equal(both.teachingOnlyRequest, null)
  assert.ok(both.blockers.some((b) => b.includes('이미 확정된 문서')))
})

test('A28-22: 분석 결과에 월별 운영계획 행이 없으면 운영계획은 확정되지 않는다고 알린다(요청에 teachingPlan 없음)', () => {
  const plan = finalApprovalPlan({ ...base, view: view('PDF', [field(0, 'performanceEvaluation.items[0].weightPercent', 20)], ['공통국어2'], { teachingPlanCandidates: [{ subjectIndex: 0, subjectName: '공통국어2', extractionStatus: null, issues: [], rows: null }] }) })
  assert.deepEqual(plan.blockers, [])
  assert.equal(plan.request.teachingPlan, undefined)
  assert.equal(plan.byType.teaching.state, 'none')
  assert.ok(plan.warnings.some((w) => w.includes('월별 운영계획 행이 없어요')))
})
