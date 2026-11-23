// A27-UX(계정 B) 학생 Home 다가오는 수행평가 통합 시험 (node --test)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { upcomingAssessments } from './upcomingAssessments.ts'

const context = { subjects: [{ subjectId: 'KOR', name: '국어' }, { subjectId: 'SCI', name: '과학' }], catalogSubjects: [] }
const plan = {
  planId: 'P1',
  documentRevisionId: 'R1',
  confirmedFields: [
    { subjectId: 'KOR', fieldPath: 'performanceEvaluation.items[0].label', value: '논술 쓰기', pdfPageNumber: 2 },
    { subjectId: 'KOR', fieldPath: 'performanceEvaluation.items[0].timing', value: '4월', pdfPageNumber: 2 },
    { subjectId: 'KOR', fieldPath: 'performanceEvaluation.items[1].label', value: '발표', pdfPageNumber: 2 },
    { subjectId: 'SCI', fieldPath: 'performanceEvaluation.items[0].label', value: '실험 보고서', pdfPageNumber: 3 },
    // 수강하지 않는 과목
    { subjectId: 'ART', fieldPath: 'performanceEvaluation.items[0].label', value: '그림', pdfPageNumber: 4 },
    // 이름이 확정되지 않은 항목은 일정으로 만들지 않는다
    { subjectId: 'SCI', fieldPath: 'performanceEvaluation.items[1].timing', value: '6월', pdfPageNumber: 3 },
  ],
}
const assessment = (id, overrides) => ({ assessmentId: id, subjectId: 'KOR', title: id, status: 'IN_PROGRESS', deadlineDate: null, evaluationDate: null, evaluationItemRef: null, createdAt: '', ...overrides })

test('두 출처를 함께 보여 주고 같은 수행평가는 한 번만', () => {
  const items = [
    assessment('a1', { title: '논술  쓰기', deadlineDate: '2026-11-25', evaluationItemRef: { documentRevisionId: 'R1', subjectId: 'KOR', itemKey: 'K1' } }),
    assessment('a2', { title: '독서 기록', evaluationDate: '2026-11-20', deadlineDate: '2026-11-28' }),
    assessment('a3', { title: '지난 과제', deadlineDate: '2026-11-01' }),
    assessment('a4', { title: '날짜 없음' }),
    assessment('a5', { title: '끝난 과제', status: 'COMPLETED', deadlineDate: '2026-11-21' }),
  ]
  const view = upcomingAssessments(items, [plan], context, '2026-11-18')
  assert.deepEqual(view.dated.map((entry) => [entry.assessment.assessmentId, entry.dateKind, entry.days, entry.linkedOfficial]), [
    ['a2', 'evaluation', 2, false],
    ['a1', 'deadline', 7, true],
  ])
  // '논술 쓰기'는 학생 항목과 연결되어 공식 목록에서 빠진다. 수강하지 않는 과목·이름 없는 항목은 없다
  assert.deepEqual(view.officialUndated.map((entry) => [entry.label, entry.timing]).sort(), [
    ['발표', null],
    ['실험 보고서', null],
  ])
})

test('연결 정보가 없으면 이름만 같아도 같은 항목으로 추정하지 않는다', () => {
  const view = upcomingAssessments([assessment('a1', { title: '발표', deadlineDate: '2026-11-19' })], [plan], context, '2026-11-18')
  assert.equal(view.officialUndated.some((entry) => entry.label === '발표'), true)
})

test('완료한 연결 항목도 공식 항목을 다시 보이게 하지 않는다', () => {
  const view = upcomingAssessments([assessment('a1', { title: '발표', status: 'COMPLETED', evaluationItemRef: { documentRevisionId: 'R1', subjectId: 'KOR', itemKey: 'K2' } })], [plan], context, '2026-11-18')
  assert.equal(view.officialUndated.some((entry) => entry.label === '발표'), false)
  assert.equal(view.dated.length, 0)
})

test('같은 과목에 이름이 같은 공식 수행평가가 둘이면, 학생 연결 1건은 공식 1건만 대신한다 (오병합 방지)', () => {
  const twin = {
    planId: 'P2',
    documentRevisionId: 'R2',
    confirmedFields: [
      { subjectId: 'SCI', fieldPath: 'performanceEvaluation.items[0].label', value: '보고서', pdfPageNumber: 1 },
      { subjectId: 'SCI', fieldPath: 'performanceEvaluation.items[0].timing', value: '4월', pdfPageNumber: 1 },
      { subjectId: 'SCI', fieldPath: 'performanceEvaluation.items[1].label', value: '보고서', pdfPageNumber: 1 },
      { subjectId: 'SCI', fieldPath: 'performanceEvaluation.items[1].timing', value: '10월', pdfPageNumber: 1 },
    ],
  }
  const linked = assessment('a1', { subjectId: 'SCI', title: '보고서', deadlineDate: '2026-11-25', evaluationItemRef: { documentRevisionId: 'R2', subjectId: 'SCI', itemKey: 'K9' } })
  const view = upcomingAssessments([linked], [twin], context, '2026-11-18')
  assert.equal(view.dated.length, 1)
  // 어느 쪽인지 확정값만으로는 알 수 없으므로 하나는 남아야 한다 (둘 다 숨기면 다른 수행평가가 사라진다)
  assert.equal(view.officialUndated.filter((entry) => entry.label === '보고서').length, 1)
})
