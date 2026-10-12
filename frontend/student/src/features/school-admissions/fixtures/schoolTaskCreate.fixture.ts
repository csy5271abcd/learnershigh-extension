// UI 검증용 Task Create Service. 실제 POST /api/student/tasks 대신 Fixture 저장소에 Task를 만든다.
// - 새 Task는 1단계(안내문 등록)로 시작한다. (api-contract §9-2: Task 생성 → 수행평가 8단계 Stage 1)
//   Interaction 기준의 "생성 직후 주제 단계(1→2)"와 다르므로 Stage 2는 확정하지 않는다. (Spec / Contract Gap)
// - 다음 할 일은 주제 선정이다. (Task Detail의 "주제 선정하기" → 주제 제출 Modal)
// - 형태 / "지금 어디까지 했나요?"는 맥락 정보로만 보관하고 currentStage를 옮기지 않는다. (Stage 전이 규칙 미확정)
// - 안내문은 파일과 직접 입력을 모두 보관한다. (둘 중 하나만 저장한다는 규칙이 Source에 없다)
// - 입력하지 않은 자료(참고 자료 / 과정 자료 / 피드백 / Mentor Case / Version)는 만들지 않는다. (빈 배열 = 실제로 없음)

import { fileExtensionLabel, filledCriteria, type TaskCreateDraft } from '../model/taskCreate.ts'
import type { StudentTaskSummary } from '../model/types.ts'
import { addCreatedTask, nextCreatedTaskId } from './schoolTaskRepository.fixture.ts'
import { fixtureStudentTasks, SCHOOL_SNAPSHOT_DATE } from './schoolTasks.fixture.ts'

/** 고2 Student의 기존 수행평가 과목 (Fixture에 실제로 있는 과목만, 별도 교육과정 목록을 만들지 않는다) */
export const schoolTaskSubjectOptions = [...new Set(fixtureStudentTasks.map((task) => task.subject))].sort((a, b) =>
  a.localeCompare(b, 'ko'),
)

/** POST /api/student/tasks Response 의미 (taskId / title / currentStage / createdAt) */
export interface SchoolTaskCreateResult {
  taskId: string
  title: string
  currentStage: StudentTaskSummary['currentStage']
  createdAt: string
}

export type SchoolTaskCreateFixtureScenario = 'success' | 'create-fail-once'
const scenarios: SchoolTaskCreateFixtureScenario[] = ['success', 'create-fail-once']

export function readSchoolTaskCreateFixtureScenario(search: string): SchoolTaskCreateFixtureScenario {
  const value = new URLSearchParams(search).get('fixture')
  return scenarios.find((scenario) => scenario === value) ?? 'success'
}

export type SchoolTaskCreate = (draft: TaskCreateDraft) => Promise<SchoolTaskCreateResult>

const services = new Map<SchoolTaskCreateFixtureScenario, SchoolTaskCreate>()

function createTask(draft: TaskCreateDraft): SchoolTaskCreateResult {
  const taskId = nextCreatedTaskId()
  const title = draft.title.trim()
  const guideText = draft.guideText.trim()
  const criteria = filledCriteria(draft)
  const task: StudentTaskSummary = {
    taskId,
    title,
    subject: draft.subject,
    deadlineDate: draft.deadlineDate,
    currentStage: 1,
    stageStatus: '안내문 등록 완료',
    // 목록 / Detail의 제출물 요약: 학생이 적은 제출물, 없으면 형태
    deliverableSummary: draft.deliverable.trim() || draft.performanceType,
    turn: 'student',
    attentionFlags: [],
    nextAction: '주제를 선정하세요.',
  }
  addCreatedTask({
    task,
    detail: {
      topic: { state: 'not-submitted' },
      nowCard: {
        headline: '주제를 선정하세요',
        description: '안내문을 등록했어요. 다음 단계에서 주제를 정해 제출해요.',
        primaryAction: { kind: 'submitTopic', label: '주제 선정하기' },
        waitingActions: [],
      },
      guideFile: draft.guideFile
        ? { fileName: draft.guideFile.fileName, format: fileExtensionLabel(draft.guideFile.fileName), registeredDate: SCHOOL_SNAPSHOT_DATE }
        : null,
      guideText: guideText || null,
      criteria: criteria.map((item, index) => ({ criterionId: `${taskId}-criterion-${index + 1}`, name: item.name, points: item.points })),
      references: [],
      feedback: { teacher: [], ai: [] },
      mentorCases: [],
      revisionDiffs: [],
    },
    context: { performanceType: draft.performanceType, startingPoint: draft.startingPoint },
  })
  return { taskId, title, currentStage: 1, createdAt: `${SCHOOL_SNAPSHOT_DATE}T09:00:00+09:00` }
}

export function createSchoolTaskCreateFixtureService(scenario: SchoolTaskCreateFixtureScenario): SchoolTaskCreate {
  let service = services.get(scenario)
  if (!service) {
    let attempts = 0
    service = (draft) => {
      attempts += 1
      // 응답 지연을 흉내 내 중복 클릭을 확인할 수 있게 한다.
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (scenario === 'create-fail-once' && attempts === 1) reject(new Error('School task create fixture error'))
          else resolve(createTask(draft))
        }, 400)
      })
    }
    services.set(scenario, service)
  }
  return service
}
