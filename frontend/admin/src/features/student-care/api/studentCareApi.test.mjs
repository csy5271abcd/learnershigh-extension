import assert from 'node:assert/strict'
import { test } from 'node:test'
import { studentCareApi as api } from './studentCareApi.ts'
import { PREVIEW_DEFAULTS as defaults, PREVIEW_AS_OF } from './previewData.ts'
import { addDays } from '../model/format.ts'

test('V2 preview keeps the roster, settings, cases and history consistent without network access', async () => {
  const originalFetch = globalThis.fetch
  let requests = 0
  globalThis.fetch = () => { requests++; throw new Error('FE preview must not use the server') }
  try {
    assert.deepEqual((await api.branches()).map(branch => branch.studentCount), [10, 3])
    const board = await api.board('br_gangnam')
    assert.equal(board.students.length, 10)
    const classified = [...board.needsCheck, ...board.inAdjustment, ...board.deferred]
    assert.equal(new Set(classified.map(student => student.studentId)).size, classified.length)
    assert.deepEqual([board.needsCheck.length, board.inAdjustment.length, board.deferred.length], [5, 2, 1])
    assert.equal((await api.board('br_bundang')).students.length, 3)
    for (const student of board.students) {
      const detail = await api.detail('br_gangnam', student.studentId)
      assert.equal(detail.dailyStudy.length, 14)
      assert.equal(detail.asOf, PREVIEW_AS_OF)
      assert.equal(detail.student.studentName, student.studentName)
    }
    await assert.rejects(api.detail('br_bundang', 'stu_001'), error => error.status === 404)
    const settings = await api.settings('br_gangnam')
    for (const key of Object.keys(defaults)) assert.equal(settings[key], defaults[key])
    settings.absenceDays = 14
    assert.equal((await api.settings('br_gangnam')).absenceDays, defaults.absenceDays, 'responses are detached')
    await api.updateSettings('br_gangnam', { ...defaults, studyDropPercent: 90 })
    assert.equal((await api.board('br_gangnam')).needsCheck.some(student => student.studentId === 'stu_003'), false)
    assert.equal((await api.settings('br_bundang')).studyDropPercent, defaults.studyDropPercent)
    await assert.rejects(api.updateSettings('br_gangnam', { ...defaults, cooldownDays: -1 }), error => error.status === 422 && error.hasField('cooldownDays'))
    await assert.rejects(api.updateSettings('br_gangnam', { ...defaults, absenceDays: 3.5 }), error => error.status === 422)
    await api.updateSettings('br_gangnam', { ...defaults })
    await assert.rejects(api.openCase({ branchId: 'br_gangnam', studentId: 'stu_009', channel: 'CALL', memo: '', reason: 'EXPECTED_CHANGE' }), error => error.code === 'STUDENT_NOT_FLAGGED')
    await assert.rejects(api.openCase({ branchId: 'br_gangnam', studentId: 'stu_002', channel: 'CALL', memo: '', reason: 'ADJUSTMENT_NEEDED', recheckDate: PREVIEW_AS_OF }), error => error.code === 'INVALID_RECHECK_DATE')
    const opened = await api.openCase({ branchId: 'br_gangnam', studentId: 'stu_002', channel: 'CALL', memo: '<script>literal</script> 확인', reason: 'ADJUSTMENT_NEEDED', recheckDate: addDays(PREVIEW_AS_OF, 7) })
    assert.equal(opened.status, 'IN_ADJUSTMENT')
    await assert.rejects(api.openCase({ branchId: 'br_gangnam', studentId: 'stu_002', channel: 'CALL', memo: '', reason: 'EXPECTED_CHANGE' }), error => error.code === 'ACTIVE_CARE_CASE_EXISTS')
    await assert.rejects(api.decide('br_gangnam', opened.caseId, { decision: 'CLOSE' }), error => error.code === 'RECHECK_NOT_DUE')
    await assert.rejects(api.addNote('br_bundang', opened.caseId, 'CALL', 'other'), error => error.code === 'CARE_CASE_NOT_FOUND')
    const note = await api.addNote('br_gangnam', opened.caseId, 'MESSAGE', '일정 확인')
    assert.equal((await api.history('br_gangnam', 'stu_002')).items[0].eventId, note.eventId)
    assert.equal((await api.detail('br_gangnam', 'stu_002')).activeCase.events.at(-1).eventId, note.eventId)
    const due = (await api.board('br_gangnam')).inAdjustment.find(student => student.recheckDue)
    assert.ok(due)
    assert.equal((await api.decide('br_gangnam', due.caseId, { decision: 'CLOSE' })).status, 'CLOSED')
    assert.equal((await api.detail('br_gangnam', due.studentId)).activeCase, null)
    assert.equal((await api.board('br_gangnam')).needsCheck.some(student => student.studentId === due.studentId), false)
    await assert.rejects(api.decide('br_gangnam', due.caseId, { decision: 'CLOSE' }), error => error.code === 'INVALID_STATE_TRANSITION')
    await api.board('br_bundang')
    assert.equal((await api.detail('br_gangnam', 'stu_002')).activeCase.caseId, opened.caseId)
    assert.equal(requests, 0)
  } finally {
    globalThis.fetch = originalFetch
  }
})
