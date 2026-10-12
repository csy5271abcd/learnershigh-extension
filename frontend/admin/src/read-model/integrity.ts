import type { AdminState } from '../store/adminStore.ts'

/*
 * Canonical Fixture 정합성 검사 (개발 / 검증용, 화면에는 쓰지 않는다)
 * - 중복 id, 없는 Foreign Key, Stage와 상태가 모순되는 조합을 찾는다. 문제가 없으면 problems가 빈 배열이다.
 * - Browser 검증에서 import('/src/read-model/integrity.ts')로 호출한다.
 */

export interface IntegrityReport {
  problems: string[]
  counts: Record<string, number>
}

const duplicates = (ids: string[]) => ids.filter((id, index) => ids.indexOf(id) !== index)

export function checkIntegrity(state: AdminState): IntegrityReport {
  const problems: string[] = []
  const push = (condition: boolean, message: string) => {
    if (condition) problems.push(message)
  }

  const studentIds = new Set(state.students.map((item) => item.studentId))
  const taskById = new Map(state.tasks.map((item) => [item.taskId, item]))
  const activityById = new Map(state.activities.map((item) => [item.activityId, item]))
  const caseIds = new Set(state.mentorCases.map((item) => item.contentId))

  // ---- 중복 id ----
  const idSets: [string, string[]][] = [
    ['studentId', state.students.map((item) => item.studentId)],
    ['taskId', state.tasks.map((item) => item.taskId)],
    ['versionId', state.tasks.flatMap((item) => item.versions?.map((version) => version.versionId) ?? [])],
    ['feedbackId', state.reviews.map((item) => item.feedbackId)],
    ['activityId', state.activities.map((item) => item.activityId)],
    ['testResultId', state.testResults.map((item) => item.testResultId)],
    ['schoolRecordSnapshotId', state.schoolRecords.map((item) => item.schoolRecordSnapshotId)],
    ['connectionId', state.connections.map((item) => item.connectionId)],
    ['questionId', state.interview.map((item) => item.questionId)],
    ['caseId', state.mentorCases.map((item) => item.contentId)],
    ['recommendationId', state.recommendations.map((item) => item.recommendationId)],
    ['applicationId', state.applications.map((item) => item.applicationId)],
    ['parentReportId', state.parentReports.map((item) => item.parentReportId)],
  ]
  for (const [name, ids] of idSets) push(duplicates(ids).length > 0, `duplicate ${name}: ${duplicates(ids).join(', ')}`)
  push(state.study.length !== state.students.length || duplicates(state.study.map((item) => item.studentId)).length > 0, 'study snapshot은 학생마다 하나여야 한다')

  // ---- Foreign Key ----
  const fk = (label: string, studentId: string) => push(!studentIds.has(studentId), `${label} → 없는 studentId ${studentId}`)
  state.study.forEach((item) => fk('study', item.studentId))
  state.tasks.forEach((item) => fk(`task ${item.taskId}`, item.studentId))
  state.activities.forEach((item) => fk(`activity ${item.activityId}`, item.studentId))
  state.testResults.forEach((item) => fk(`testResult ${item.testResultId}`, item.studentId))
  state.schoolRecords.forEach((item) => fk(`schoolRecord ${item.schoolRecordSnapshotId}`, item.studentId))
  state.connections.forEach((item) => fk(`connection ${item.connectionId}`, item.studentId))
  state.interview.forEach((item) => fk(`interview ${item.questionId}`, item.studentId))
  state.recommendations.forEach((item) => fk(`recommendation ${item.recommendationId}`, item.studentId))
  state.applications.forEach((item) => fk(`application ${item.applicationId}`, item.studentId))
  state.parentReports.forEach((item) => fk(`parentReport ${item.parentReportId}`, item.studentId))

  for (const review of state.reviews) {
    const task = taskById.get(review.taskId)
    push(!task, `review ${review.feedbackId} → 없는 taskId ${review.taskId}`)
    const version = task?.versions?.find((item) => item.versionId === review.versionId)
    push(Boolean(task) && !version, `review ${review.feedbackId} → Task에 없는 versionId ${review.versionId}`)
    push(Boolean(version) && version!.aiStatus !== 'success', `review ${review.feedbackId} → AI 사전 점검을 마치지 않은 Version`)
    push(Boolean(version?.aiAnalyzedAt) && version!.aiAnalyzedAt !== review.queuedAt, `review ${review.feedbackId} → queuedAt ≠ AI 분석 시각`)
  }
  for (const task of state.tasks) {
    for (const version of task.versions ?? []) {
      const reviews = state.reviews.filter((item) => item.versionId === version.versionId)
      push(version.aiStatus === 'success' && reviews.length !== 1, `task ${task.taskId} ${version.versionId} → AI 성공 Version의 검토가 ${reviews.length}개`)
    }
    task.relatedMentorCaseIds.forEach((caseId) => push(!caseIds.has(caseId), `task ${task.taskId} → 없는 Mentor Case ${caseId}`))
  }
  for (const item of state.recommendations) {
    push(!caseIds.has(item.caseId), `recommendation ${item.recommendationId} → 없는 Case ${item.caseId}`)
    const task = item.taskId ? taskById.get(item.taskId) : null
    push(Boolean(item.taskId) && (!task || task.studentId !== item.studentId), `recommendation ${item.recommendationId} → 학생의 Task가 아님`)
    push(Boolean(task) && !task!.relatedMentorCaseIds.includes(item.caseId), `recommendation ${item.recommendationId} → Task.relatedMentorCaseIds에 없음`)
  }

  const archivedRef = (studentId: string, source: 'task' | 'growth', sourceId: string) => {
    if (source === 'task') {
      const task = taskById.get(sourceId)
      return Boolean(task && task.studentId === studentId && task.currentStage === 8)
    }
    const activity = activityById.get(sourceId)
    return Boolean(activity && activity.studentId === studentId && activity.status === 'archived')
  }
  for (const connection of state.connections) {
    connection.sourceRefs.forEach((ref) => push(!archivedRef(connection.studentId, ref.source, ref.sourceId), `connection ${connection.connectionId} → Archive에 없는 ${ref.source}:${ref.sourceId}`))
  }
  for (const question of state.interview) {
    question.relatedActivityIds.forEach((id) => push(!archivedRef(question.studentId, 'growth', id), `interview ${question.questionId} → 학생의 Archive 활동이 아닌 ${id}`))
    if (question.connectionId) {
      const connection = state.connections.find((item) => item.connectionId === question.connectionId)
      push(!connection || connection.studentId !== question.studentId, `interview ${question.questionId} → 없는 Connection ${question.connectionId}`)
    }
  }

  // ---- Stage / 상태 의미 검사 ----
  for (const task of state.tasks) {
    const versions = task.versions ?? []
    const latest = versions.at(-1)
    const label = `task ${task.taskId} (Stage ${task.currentStage} · ${task.stageStatus})`
    push(task.currentStage === 8 && (task.turn === 'student' || /제출 필요|올려주세요|준비해주세요/.test(task.nextAction)), `${label} → 완료 Task에 제출 안내`)
    push(task.currentStage <= 4 && versions.length > 0, `${label} → 4단계 이하인데 제출 Version 있음`)
    push(task.currentStage <= 3 && /V\d/.test(task.stageStatus), `${label} → 3단계 이하인데 Version 상태`)
    push(task.currentStage === 2 && !task.topic, `${label} → 2단계인데 주제 정보 없음`)
    push(task.topic?.state === 'in-review' && task.currentStage !== 2, `${label} → 주제 검토 중인데 2단계가 아님`)
    push(task.currentStage === 5 && versions.length > 0 && (latest!.number !== 1 || latest!.aiStatus === 'success'), `${label} → 5단계는 V1 AI 분석 중 / 실패만`)
    push(task.currentStage === 6 && versions.length > 0 && latest!.number > 2, `${label} → 6단계에 V3 이상`)
    push(task.currentStage === 7 && versions.length > 0 && latest!.number < 2 && task.taskId.startsWith('fixture-admin-'), `${label} → 7단계인데 수정본 없음`)
    push(Boolean(latest) && latest!.aiStatus === 'processing' && task.turn !== 'waiting', `${label} → AI 분석 중인데 학생 차례`)
    push(task.finalArtifact !== null && task.currentStage !== 8, `${label} → 최종 결과물은 8단계에만`)
    for (let index = 1; index < versions.length; index += 1) {
      push(versions[index].number !== versions[index - 1].number + 1 || versions[index].submittedAt < versions[index - 1].submittedAt, `${label} → Version 순서 불일치`)
    }
  }
  for (const activity of state.activities) {
    const label = `activity ${activity.activityId} (${activity.status})`
    push(activity.status === 'feedback-waiting' && !activity.feedbackRequestedAt, `${label} → 피드백 요청 시각 없음`)
    push((activity.status === 'feedback-waiting' || activity.status === 'draft' || activity.status === 'submitted') && activity.feedback !== null, `${label} → 전달 전인데 피드백 있음`)
    push(activity.status === 'feedback-delivered' && activity.feedback === null, `${label} → 피드백 도착인데 피드백 없음`)
    push((activity.status === 'reflected' || activity.status === 'archived') && activity.reflection === null, `${label} → Reflection 없이 보완 / Archive`)
  }
  for (const question of state.interview) {
    const student = state.students.find((item) => item.studentId === question.studentId)
    push(question.answer !== '' && !question.published, `interview ${question.questionId} → 비공개 질문에 학생 답변`)
    push(question.studentId !== 'fixture-student-choi-haeun' && student?.grade !== '고3', `interview ${question.questionId} → 고3이 아닌 학생`)
  }

  return {
    problems,
    counts: {
      students: state.students.length,
      tasks: state.tasks.length,
      reviews: state.reviews.length,
      activities: state.activities.length,
      testResults: state.testResults.length,
      schoolRecords: state.schoolRecords.length,
      connections: state.connections.length,
      interviewQuestions: state.interview.length,
    },
  }
}
