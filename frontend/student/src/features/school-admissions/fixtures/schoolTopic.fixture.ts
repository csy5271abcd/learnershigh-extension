// UI 검증용 주제 제출 Fixture. 실제 PUT /api/student/tasks/{taskId}/topic 대신 Fixture 저장소의 같은 Task를 바꾼다.
// - 학생 제출: 주제 저장 → 검토 중, Stage 2(주제 선정)에 머문다. 제출만으로 Stage 3으로 가지 않는다.
// - 선생님(학원) 결과(방향 요청 / 확인)는 Admin Action이다. Student 화면에는 버튼이 없고,
//   개발 중에만 applyTopicReviewFixture로 결과를 재현한다. (Admin Topic Review 화면은 범위 밖)
// - 확인되면 Stage 3(자료 조사)부터, 다음 할 일은 자료 추가다. (Evidence Vault는 다음 작업)
// - topicApprovalStatus Enum은 확정하지 않는다. (OD-03)

import type { StudentTaskDetailExtra, StudentTaskSummary } from '../model/types.ts'
import { findCreatedTask, findSeedOverride, saveTask, type StoredTask } from './schoolTaskRepository.fixture.ts'
import { seedTaskDetail } from './schoolTaskDetail.fixture.ts'
import { fixtureStudentTasks } from './schoolTasks.fixture.ts'

/** 지금 이 Task의 값 (등록한 Task → Seed의 Session 변경 → Seed) */
function currentTask(taskId: string): StoredTask | undefined {
  const created = findCreatedTask(taskId)
  if (created) return created
  const override = findSeedOverride(taskId)
  // 요약만 바뀐 Seed Task(예: Version 제출)는 Seed 상세 자료를 그대로 쓴다.
  if (override) return { task: override.task, detail: override.detail ?? seedTaskDetail(taskId) }
  const task = fixtureStudentTasks.find((item) => item.taskId === taskId)
  return task ? { task, detail: seedTaskDetail(taskId) } : undefined
}

/** 상세 자료가 없는 Seed Task에 주제만 붙일 때 쓰는 빈 상세 (다른 자료는 준비 안 됨 = null) */
const emptyDetail = (): StudentTaskDetailExtra => ({
  topic: null,
  nowCard: { headline: '', description: '', waitingActions: [] },
  guideFile: null,
  guideText: null,
  criteria: null,
  references: null,
  feedback: null,
  mentorCases: null,
  revisionDiffs: [],
})

function inReview(task: StudentTaskSummary, detail: StudentTaskDetailExtra, topic: string): StoredTask {
  return {
    task: {
      ...task,
      currentStage: 2,
      stageStatus: '주제 검토 대기',
      turn: 'waiting',
      nextAction: '선생님이 주제를 검토하고 있어요.',
    },
    detail: {
      ...detail,
      topic: { state: 'in-review', topic },
      nowCard: { headline: '주제를 제출했어요', description: '선생님 검토를 기다리고 있어요.', waitingActions: [] },
    },
  }
}

// ---------- 학생: 주제 제출 ----------

export type SchoolTopicSubmitFixtureScenario = 'success' | 'topic-fail-once'
const scenarios: SchoolTopicSubmitFixtureScenario[] = ['success', 'topic-fail-once']

export function readSchoolTopicSubmitFixtureScenario(search: string): SchoolTopicSubmitFixtureScenario {
  const value = new URLSearchParams(search).get('fixture')
  return scenarios.find((scenario) => scenario === value) ?? 'success'
}

/** PUT /api/student/tasks/{taskId}/topic Response 의미 (taskId / topic / currentStage) */
export interface SchoolTopicSubmitResult {
  taskId: string
  topic: string
  currentStage: StudentTaskSummary['currentStage']
}

export type SchoolTopicSubmit = (taskId: string, topic: string) => Promise<SchoolTopicSubmitResult>

const services = new Map<SchoolTopicSubmitFixtureScenario, SchoolTopicSubmit>()

export function createSchoolTopicSubmitFixtureService(scenario: SchoolTopicSubmitFixtureScenario): SchoolTopicSubmit {
  let service = services.get(scenario)
  if (!service) {
    let attempts = 0
    service = (taskId, topic) => {
      attempts += 1
      return new Promise((resolve, reject) => {
        // 응답 지연을 흉내 내 중복 클릭을 확인할 수 있게 한다.
        setTimeout(() => {
          const current = currentTask(taskId)
          if (!current) {
            reject(new Error('TASK_NOT_FOUND'))
            return
          }
          if (scenario === 'topic-fail-once' && attempts === 1) {
            reject(new Error('School topic submit fixture error'))
            return
          }
          const text = topic.trim()
          saveTask(inReview(current.task, current.detail ?? emptyDetail(), text))
          resolve({ taskId, topic: text, currentStage: 2 })
        }, 400)
      })
    }
    services.set(scenario, service)
  }
  return service
}

// ---------- 개발용: 선생님(학원) 검토 결과 재현 (Admin Action, Student 화면 버튼 없음) ----------

export type TopicReviewFixtureResult = 'direction-requested' | 'confirmed'

export function readTopicReviewFixtureResult(search: string): TopicReviewFixtureResult | undefined {
  const value = new URLSearchParams(search).get('fixtureTopicReview')
  return value === 'direction-requested' || value === 'confirmed' ? value : undefined
}

/** 표시용 방향 안내 문장 (가상). 학생 주제를 대신 고쳐 쓰지 않고 방향만 남긴다. */
const fixtureGuidance = '주제 범위가 조금 넓어요. 한 가지 원인이나 한 지역으로 좁혀서, 무엇을 비교할지 드러나게 다시 적어보세요.'

/** 검토 중인 주제에만 결과를 적용한다. 바꿨으면 true. */
export function applyTopicReviewFixture(taskId: string, result: TopicReviewFixtureResult): boolean {
  const current = currentTask(taskId)
  const topic = current?.detail?.topic
  if (!current || !current.detail || topic?.state !== 'in-review') return false

  if (result === 'direction-requested') {
    saveTask({
      task: { ...current.task, currentStage: 2, stageStatus: '주제 수정 필요', turn: 'student', nextAction: '방향을 확인하고 주제를 다시 제출하세요.' },
      detail: {
        ...current.detail,
        topic: { state: 'direction-requested', topic: topic.topic, guidance: fixtureGuidance },
        nowCard: {
          headline: '주제를 조금 더 구체화해주세요',
          description: '선생님이 방향을 남겼어요. 확인하고 주제를 고쳐서 다시 제출해요.',
          primaryAction: { kind: 'submitTopic', label: '주제 수정하기' },
          waitingActions: [],
        },
      },
    })
    return true
  }

  saveTask({
    task: { ...current.task, currentStage: 3, stageStatus: '자료 조사', turn: 'student', nextAction: '자료를 추가하세요.' },
    detail: {
      ...current.detail,
      topic: { state: 'confirmed', topic: topic.topic },
      nowCard: {
        headline: '자료 조사를 시작해요',
        description: '주제가 확인되었어요. 조사한 자료를 1개 이상 추가하면 다음 단계로 이어갈 수 있어요.',
        primaryAction: { kind: 'addEvidence', label: '자료 추가' },
        waitingActions: [],
      },
    },
  })
  return true
}
