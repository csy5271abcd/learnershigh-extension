import { mentorCaseDetailsFixture } from '../fixtures/adminMentorCaseDetails.fixture.ts'
import { mentorPlansFixture, mentorProfilesFixture, mentorRecordsFixture, mentorRoutinesFixture, mentorStoriesFixture } from '../fixtures/adminMentorContent.fixture.ts'
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
    ['evidenceId', state.tasks.flatMap((item) => item.evidence?.map((evidence) => evidence.evidenceId) ?? [])],
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

  // ---- D17 ~ D24: Version · Evidence · Mentor Case 상세 ----
  for (const task of state.tasks) {
    const versions = task.versions ?? []
    task.evidence?.forEach((item) => push(item.taskId !== task.taskId, `evidence ${item.evidenceId} → 다른 Task(${item.taskId})`))
    push(duplicates(versions.map((item) => String(item.number))).length > 0, `task ${task.taskId} → Version 번호 중복`)
    for (const version of versions) {
      const attempts = version.aiAttempts ?? []
      push(attempts.length > 0 && attempts.at(-1)!.status !== version.aiStatus, `task ${task.taskId} ${version.versionId} → AI 시도 이력의 마지막 상태 ≠ 현재 상태`)
    }
    const waiting = state.reviews.filter((item) => item.taskId === task.taskId && !item.delivery)
    push(waiting.length > 1, `task ${task.taskId} → 검토 대기 Version이 ${waiting.length}개`)
    push(waiting.length === 1 && waiting[0].versionId !== versions.at(-1)?.versionId, `task ${task.taskId} → 검토 대기 Version이 최신 Version이 아님`)
    for (const diff of task.revisionDiffs ?? []) {
      const from = versions.find((item) => item.versionId === diff.fromVersionId)
      const to = versions.find((item) => item.versionId === diff.toVersionId)
      push(!from || !to || from.number >= to.number, `task ${task.taskId} → 내용 비교의 Version 짝이 없음 / 순서 틀림`)
      push(Boolean(diff.appliedFeedbackId) && !state.reviews.some((item) => item.feedbackId === diff.appliedFeedbackId && item.taskId === task.taskId), `task ${task.taskId} → 비교가 가리키는 피드백 없음`)
    }
  }
  for (const activity of state.activities) {
    Object.keys(activity.fileBackings ?? {}).forEach((name) => push(!activity.files.includes(name), `activity ${activity.activityId} → 자료 목록에 없는 원본 ${name}`))
  }
  for (const caseRef of state.mentorCases) {
    const detail = mentorCaseDetailsFixture.find((item) => item.contentId === caseRef.contentId)
    push(!detail, `mentorCase ${caseRef.contentId} → 상세 정보 없음`)
    if (!detail) continue
    const stageIds = new Set(detail.stages.map((stage) => stage.stageId))
    detail.materials.forEach((material) => push(!stageIds.has(material.stageId), `mentorCase ${caseRef.contentId} 자료 ${material.materialId} → 없는 단계 ${material.stageId}`))
    detail.materials.forEach((material) => push(Boolean(material.original) && !material.fileName, `mentorCase ${caseRef.contentId} 자료 ${material.materialId} → 원본은 있는데 파일 이름 없음`))
  }
  push(mentorCaseDetailsFixture.some((item) => !state.mentorCases.some((caseRef) => caseRef.contentId === item.contentId)), 'mentorCase 상세에 목록에 없는 Case')

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

  // ---- D25 ~ D33: Mentor Content · 추천 · Connection / Interview 출처 · 메시지 / 리마인더 ----
  const mentorById = new Map(mentorProfilesFixture.map((item) => [item.mentorId, item]))
  const nonCase = [...mentorPlansFixture, ...mentorRoutinesFixture, ...mentorStoriesFixture, ...mentorRecordsFixture]
  const contentIds = new Set([...caseIds, ...nonCase.map((item) => item.contentId)])
  for (const id of duplicates(mentorProfilesFixture.map((item) => item.mentorId))) problems.push(`D25 중복 mentorId ${id}`)
  for (const id of duplicates([...state.mentorCases.map((item) => item.contentId), ...nonCase.map((item) => item.contentId)])) problems.push(`D25 중복 contentId ${id}`)
  for (const item of state.mentorCases) {
    const mentor = mentorById.get(item.mentorId)
    push(!mentor, `D26 case ${item.contentId} → 없는 mentorId ${item.mentorId}`)
    push(Boolean(mentor) && (mentor!.name !== item.mentorName || `${mentor!.university} ${mentor!.major}` !== item.mentorAffiliation), `D26 case ${item.contentId} → Mentor 이름 · 소속이 Profile과 다름`)
  }
  for (const item of nonCase) push(!mentorById.has(item.mentorId), `D26 content ${item.contentId} → 없는 mentorId ${item.mentorId}`)
  for (const item of mentorRecordsFixture) {
    push(Boolean(item.linkedActivity.caseId) && !caseIds.has(item.linkedActivity.caseId!), `D27 record ${item.contentId} → 없는 연결 Case`)
    for (const related of item.relatedContent) push(!contentIds.has(related.contentId), `D27 record ${item.contentId} → 없는 관련 Content ${related.contentId}`)
  }
  for (const detail of mentorCaseDetailsFixture) for (const related of detail.relatedContent) push(!contentIds.has(related.contentId), `D27 case ${detail.contentId} → 없는 관련 Content ${related.contentId}`)
  for (const item of state.recommendations) {
    push(!studentIds.has(item.studentId), `D28 recommendation ${item.recommendationId} → 없는 학생`)
    push(!caseIds.has(item.caseId), `D28 recommendation ${item.recommendationId} → 없는 Case`)
    const task = item.taskId ? taskById.get(item.taskId) : null
    const activity = item.activityId ? activityById.get(item.activityId) : null
    push(!task && !activity, `D28 recommendation ${item.recommendationId} → 연결 Task / 활동 없음`)
    push(Boolean(task) && task!.studentId !== item.studentId, `D28 recommendation ${item.recommendationId} → 다른 학생의 Task`)
    push(Boolean(activity) && activity!.studentId !== item.studentId, `D28 recommendation ${item.recommendationId} → 다른 학생의 활동`)
    push(Boolean(task) && !task!.relatedMentorCaseIds.includes(item.caseId), `D28 recommendation ${item.recommendationId} → Task Case 연결 누락`)
  }
  for (const item of state.contentRecommendationDrafts) {
    push(!studentIds.has(item.studentId), `D29 content draft ${item.draftId} → 없는 학생`)
    push(!nonCase.some((content) => content.contentId === item.contentId && content.kind === item.kind), `D29 content draft ${item.draftId} → 없는 Content / 유형 불일치`)
    push(Boolean(item.taskId) && taskById.get(item.taskId!)?.studentId !== item.studentId, `D29 content draft ${item.draftId} → 다른 학생의 Task`)
    push(Boolean(item.activityId) && activityById.get(item.activityId!)?.studentId !== item.studentId, `D29 content draft ${item.draftId} → 다른 학생의 활동`)
  }
  for (const connection of state.connections) {
    for (const ref of connection.sourceRefs) {
      const owner = ref.source === 'task' ? taskById.get(ref.sourceId)?.studentId : activityById.get(ref.sourceId)?.studentId
      push(owner !== connection.studentId, `D30 connection ${connection.connectionId} → 출처 ${ref.sourceId} 없음 / 다른 학생`)
    }
    push(connection.reviewState !== 'candidate' && !connection.reviewedAt && connection.connectionId.startsWith('fixture-admin-'), `D30 connection ${connection.connectionId} → 검토 시각 없음`)
  }
  for (const question of state.interview) {
    for (const id of question.relatedActivityIds) push(activityById.get(id)?.studentId !== question.studentId, `D31 interview ${question.questionId} → 관련 활동 ${id} 없음 / 다른 학생`)
    const connection = question.connectionId ? state.connections.find((item) => item.connectionId === question.connectionId) : null
    push(Boolean(question.connectionId) && (!connection || connection.reviewState !== 'confirmed' || connection.studentId !== question.studentId), `D32 interview ${question.questionId} → 근거 Connection 미확정 / 다른 학생`)
  }
  for (const item of state.outreachDrafts) {
    push(!studentIds.has(item.studentId), `D33 outreach ${item.outreachId} → 없는 학생`)
    push(Boolean(item.taskId) && taskById.get(item.taskId!)?.studentId !== item.studentId, `D33 outreach ${item.outreachId} → 다른 학생의 Task`)
    push(Boolean(item.activityId) && activityById.get(item.activityId!)?.studentId !== item.studentId, `D33 outreach ${item.outreachId} → 다른 학생의 활동`)
    push(item.kind === 'reminder' && (!item.scheduledAt || !item.title), `D33 outreach ${item.outreachId} → 리마인더 제목 / 예정 시각 없음`)
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
      versions: state.tasks.reduce((sum, item) => sum + (item.versions?.length ?? 0), 0),
      taskEvidence: state.tasks.reduce((sum, item) => sum + (item.evidence?.length ?? 0), 0),
      caseDetails: mentorCaseDetailsFixture.length,
      mentors: mentorProfilesFixture.length,
      mentorContents: contentIds.size,
      recommendations: state.recommendations.length,
      contentRecommendationDrafts: state.contentRecommendationDrafts.length,
      outreachDrafts: state.outreachDrafts.length,
    },
  }
}
