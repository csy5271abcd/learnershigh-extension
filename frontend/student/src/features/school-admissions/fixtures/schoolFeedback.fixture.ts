// UI 검증용 Feedback Fixture. 실제 GET /api/student/tasks/{taskId}/feedback 대신 메모리 저장소를 쓴다.
// - Canonical Feedback 하나를 피드백 Tab · 지금 할 일 · Tasks 목록이 함께 읽는다.
// - AI 사전 점검 결과는 Version Fixture가 만든 결과를 그대로 읽는다. (복사하지 않는다)
// - 선생님 피드백은 공용 검토 대기열(Shared Feedback Queue)에서 Admin / Staff가 검토해 전달한 결과다.
//   Student 화면은 결과만 읽는다. 전달은 개발 중에만 applyTeacherFeedbackFixture로 재현한다. (Admin Review 화면은 범위 밖)
// - "반영함"은 학생이 실제 제출물을 고쳤다고 본인이 표시하는 값이다. 시스템이 파일을 고치거나 검증하지 않는다.
//   Contract에 reflected / required 필드와 갱신 Endpoint가 없어 Frontend View Model로 둔다.
// - 필수 피드백을 모두 반영해도 Stage는 6에 머문다. 다음 할 일만 수정본 준비로 바뀐다. (7단계 전이는 수정본 제출 Flow에서)
// - 실제 Backend가 아니다. 새로고침하면 Seed로 돌아간다.

import { reflectTargetKey, type FeedbackReflectTarget } from '../model/feedback.ts'
import type { StudentTaskSummary, TaskAiFeedback, TaskFeedback, TaskFeedbackState, TaskTeacherFeedback } from '../model/types.ts'
import { findCreatedTask, findSeedOverride, markTaskStoreChanged, saveTaskSummary } from './schoolTaskRepository.fixture.ts'
import { fixtureStudentTasks, SCHOOL_SNAPSHOT_DATE } from './schoolTasks.fixture.ts'
import { sessionAiFeedbackFor, taskVersions } from './schoolVersion.fixture.ts'

/** 항생제 포스터 Task (4단계, 아직 받은 피드백 없음) */
const antibioticTaskId = fixtureStudentTasks.find((task) => task.currentStage === 4)?.taskId ?? 'fixture-task-01'

/** 피드백 정보가 있는 Seed Task (TasksDetail-05 Mockup) */
const seedFeedback: Record<string, TaskFeedback> = {
  'fixture-task-02': {
    teacher: [
      { feedbackId: 'speech-teacher-v2', versionId: 'speech-v2', versionLabel: 'V2', status: 'reviewing' },
      {
        feedbackId: 'speech-teacher-v1',
        versionId: 'speech-v1',
        versionLabel: 'V1',
        status: 'delivered',
        comment: '도입부가 길어서 핵심 주장이 늦게 나와요. 같은 표현이 여러 번 반복되는 부분도 다시 읽어보세요.',
        nextAction: '도입부를 줄이고 반복 표현을 정리한 V2를 제출하세요.',
        deliveredAt: '2026-10-02T16:10:00+09:00',
        required: true,
        // V2(반복 표현 정리, 도입부 축소)에 반영했다고 학생이 표시한 상태
        reflected: true,
      },
    ],
    ai: [
      {
        feedbackId: 'speech-ai-v2',
        versionId: 'speech-v2',
        versionLabel: 'V2',
        analyzedAt: '2026-10-03T20:47:00+09:00',
        items: [
          { itemId: 'time', summary: '분량이 3분 55초예요. 목표 3분보다 55초 길어요.', reflected: true },
          { itemId: 'thesis', summary: 'thesis가 두 번째 문단에 있어요. 처음 듣는 사람이 주장을 언제 알 수 있을지 생각해보세요.', reflected: false },
          { itemId: 'repeat', summary: '같은 표현이 2회 반복돼요. 어느 부분인지 다시 읽어보세요.', reflected: false },
        ],
      },
      {
        feedbackId: 'speech-ai-v1',
        versionId: 'speech-v1',
        versionLabel: 'V1',
        analyzedAt: '2026-10-01T22:12:00+09:00',
        items: [{ itemId: 'time', summary: '분량이 4분 20초예요. 목표 시간보다 길어요.', reflected: true }],
      },
    ],
    // V1 검토는 수정본 V2를 요구했다. (TasksDetail-05 / 07)
    reviewDecisions: [{ versionId: 'speech-v1', needsAnotherRevision: true }],
  },
  // 4단계(초안 V1 미제출): 제출한 Version이 없으니 받은 피드백도 실제로 없다.
  [antibioticTaskId]: { teacher: [], ai: [], reviewDecisions: [] },
}

/** 이번 Session에 전달된 선생님 피드백 (개발용 재현). 전달 묶음(Version) 단위로 쌓는다. */
const sessionTeacher = new Map<string, TaskTeacherFeedback[][]>()
/** 이번 Session에 전달된 (재)검토 결과: versionId → 수정본이 더 필요한지 */
const sessionDecisions = new Map<string, boolean>()
/** 이번 Session에 학생이 바꾼 "반영함" 값 (선생님 feedbackId / AI itemId) */
const reflectedOverrides = new Map<string, boolean>()

const isKnown = (taskId: string) => taskId in seedFeedback || Boolean(findCreatedTask(taskId))

/** AI 항목 id는 Task 안에서만 고유할 수 있어 Feedback id와 함께 쓴다. */
const aiItemKey = (feedbackId: string, itemId: string) => `${feedbackId}:${itemId}`

export function taskFeedback(taskId: string): TaskFeedbackState {
  if (!isKnown(taskId)) return { status: 'not-prepared' }
  const seed = seedFeedback[taskId] ?? { teacher: [], ai: [], reviewDecisions: [] }
  // 최근 전달 묶음이 먼저, 묶음 안의 항목 순서는 그대로
  const delivered = [...(sessionTeacher.get(taskId) ?? [])].reverse().flat()
  const known = [...delivered, ...seed.teacher]
  // 공용 검토 대기열에 들어갔지만 아직 선생님 피드백이 없는 Version: "검토 중" 표시만 (가짜 피드백 내용 없음)
  const pendingReviews: TaskTeacherFeedback[] = taskVersions(taskId)
    .items.filter((version) => version.inFeedbackQueue && !known.some((item) => item.versionId === version.versionId))
    .reverse()
    .map((version) => ({ feedbackId: `${version.versionId}-review`, versionId: version.versionId, versionLabel: version.label, status: 'reviewing' }))
  const teacher = [...pendingReviews, ...known].map((item) =>
    item.status === 'delivered' && reflectedOverrides.has(item.feedbackId) ? { ...item, reflected: reflectedOverrides.get(item.feedbackId) } : item,
  )
  const ai: TaskAiFeedback[] = [...sessionAiFeedbackFor(taskId), ...seed.ai].map((feedback) => ({
    ...feedback,
    items: feedback.items.map((item) => {
      const key = aiItemKey(feedback.feedbackId, item.itemId)
      return reflectedOverrides.has(key) ? { ...item, reflected: reflectedOverrides.get(key) ?? item.reflected } : item
    }),
  }))
  const reviewDecisions = [...seed.reviewDecisions, ...[...sessionDecisions].map(([versionId, needsAnotherRevision]) => ({ versionId, needsAnotherRevision }))]
    .filter((decision) => taskVersions(taskId).items.some((version) => version.versionId === decision.versionId))
  return { status: 'ready', data: { teacher, ai, reviewDecisions } }
}

function currentSummary(taskId: string): StudentTaskSummary | undefined {
  return findCreatedTask(taskId)?.task ?? findSeedOverride(taskId)?.task ?? fixtureStudentTasks.find((task) => task.taskId === taskId)
}

/** 최근 Version에 전달된 필수 선생님 피드백의 반영 현황 */
export function requiredProgress(taskId: string): { versionLabel: string; reflected: number; total: number } | undefined {
  const state = taskFeedback(taskId)
  const latest = taskVersions(taskId).items.at(-1)
  if (state.status !== 'ready' || !latest) return undefined
  const required = state.data.teacher.filter((item) => item.versionId === latest.versionId && item.status === 'delivered' && item.required)
  if (required.length === 0) return undefined
  return { versionLabel: latest.label, reflected: required.filter((item) => item.reflected).length, total: required.length }
}

/** 목록 / 헤더에 보일 Task 요약 (6단계 유지, 다음 할 일만 바뀐다) */
function syncSummary(taskId: string) {
  const task = currentSummary(taskId)
  const progress = requiredProgress(taskId)
  const latest = taskVersions(taskId).items.at(-1)
  if (!task || !latest || (task.currentStage !== 6 && task.currentStage !== 7)) return
  if (sessionDecisions.get(latest.versionId) === false) {
    // 추가 수정 없이 최종 제출 준비. Stage 8은 실제 최종 제출 때 (지금은 그대로)
    saveTaskSummary({ ...task, stageStatus: '최종 제출 준비', turn: 'student', nextAction: '최종 제출을 준비해주세요.' })
    return
  }
  if (!progress) return
  const done = progress.reflected === progress.total
  const nextNumber = latest.versionNumber + 1
  saveTaskSummary({
    ...task,
    stageStatus: done ? `V${nextNumber} 수정 준비` : `${progress.versionLabel} 피드백 확인`,
    turn: 'student',
    nextAction: done ? `수정본 V${nextNumber}를 준비해주세요.` : '선생님 피드백을 확인하고 수정할 내용을 반영해주세요.',
  })
}

// ---------- "반영함" Service ----------

export type SchoolFeedbackFixtureScenario = 'success' | 'feedback-reflect-fail-once'

export function readSchoolFeedbackFixtureScenario(search: string): SchoolFeedbackFixtureScenario {
  return new URLSearchParams(search).get('fixture') === 'feedback-reflect-fail-once' ? 'feedback-reflect-fail-once' : 'success'
}

export interface SchoolFeedbackService {
  setReflected: (target: FeedbackReflectTarget, reflected: boolean) => Promise<void>
}

const services = new Map<SchoolFeedbackFixtureScenario, SchoolFeedbackService>()

export function createSchoolFeedbackFixtureService(scenario: SchoolFeedbackFixtureScenario): SchoolFeedbackService {
  let service = services.get(scenario)
  if (!service) {
    let attempts = 0
    service = {
      setReflected: (target, reflected) => {
        attempts += 1
        return new Promise((resolve, reject) => {
          // 응답 지연을 흉내 내 중복 클릭을 확인할 수 있게 한다.
          setTimeout(() => {
            if (scenario === 'feedback-reflect-fail-once' && attempts === 1) {
              reject(new Error('School feedback reflect fixture error'))
              return
            }
            reflectedOverrides.set(reflectTargetKey(target), reflected)
            syncSummary(target.taskId)
            // 요약이 바뀌지 않아도 Loader가 바뀐 반영 값을 다시 읽게 한다.
            markTaskStoreChanged()
            resolve()
          }, 250)
        })
      },
    }
    services.set(scenario, service)
  }
  return service
}

// ---------- 개발용: 선생님 피드백 전달 재현 (Admin Review 결과, Student 화면 버튼 없음) ----------

/** 개발용 선생님 (재)검토 결과: delivered = 수정본이 더 필요, final-ready = 추가 수정 없이 최종 제출 준비 */
export type TeacherFeedbackFixture = 'delivered' | 'final-ready'

export function readTeacherFeedbackFixture(search: string): TeacherFeedbackFixture | undefined {
  const value = new URLSearchParams(search).get('fixtureTeacherFeedback')
  return value === 'delivered' || value === 'final-ready' ? value : undefined
}

/**
 * 표시용 선생님 피드백 (가상). 학생 원고를 대신 쓰지 않고 방향만 남긴다.
 * 첫 검토는 api-contract §13-1 예시 문장, 재검토는 남은 한 가지만 짚는다.
 */
const fixtureFirstReview = [
  { key: 'source', comment: '근거 자료의 출처를 더 구체적으로 적어주세요.', nextAction: '출처를 보강해 다음 버전에 반영하세요.' },
  { key: 'conclusion', comment: '결론이 어디에 있는지 한눈에 보이지 않아요.', nextAction: '결론 문장을 앞쪽에 정리해 다음 버전에 반영하세요.' },
]
const fixtureReReview = [
  { key: 'citation', comment: '고친 부분이 잘 보여요. 출처를 적는 형식만 한 가지로 맞춰주세요.', nextAction: '출처 표기 형식을 맞춰 다음 버전에 반영하세요.' },
]
const fixtureFinalReady = [{ key: 'final', comment: '필요한 수정이 잘 반영됐어요.', nextAction: '최종 제출을 준비하세요.' }]

/** 공용 검토 대기열에 있는 최근 Version에 선생님 (재)검토 결과가 전달된 상태를 만든다. 바꿨으면 true. */
export function applyTeacherFeedbackFixture(taskId: string, result: TeacherFeedbackFixture): boolean {
  const latest = taskVersions(taskId).items.at(-1)
  const task = currentSummary(taskId)
  const state = taskFeedback(taskId)
  if (!latest || !task || !latest.inFeedbackQueue || state.status !== 'ready') return false
  if (state.data.teacher.some((item) => item.versionId === latest.versionId && item.status === 'delivered')) return false
  const needsAnotherRevision = result === 'delivered'
  const items = !needsAnotherRevision ? fixtureFinalReady : latest.versionNumber === 1 ? fixtureFirstReview : fixtureReReview
  sessionTeacher.set(taskId, [
    ...(sessionTeacher.get(taskId) ?? []),
    items.map((item) => ({
      feedbackId: `${latest.versionId}-teacher-${item.key}`,
      versionId: latest.versionId,
      versionLabel: latest.label,
      status: 'delivered' as const,
      comment: item.comment,
      nextAction: item.nextAction,
      deliveredAt: `${SCHOOL_SNAPSHOT_DATE}T15:00:00+09:00`,
      // 최종 제출 준비 안내는 반영할 수정 항목이 아니다.
      required: needsAnotherRevision,
      reflected: false,
    })),
  ])
  sessionDecisions.set(latest.versionId, needsAnotherRevision)
  // 피드백이 전달돼도 단계는 그대로다. (초안 V1 = 6단계, 수정본 = 7단계) 학생 차례로 바뀐다.
  saveTaskSummary({ ...task, turn: 'student' })
  syncSummary(taskId)
  return true
}
