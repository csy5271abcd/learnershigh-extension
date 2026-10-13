// UI 검증용 Evidence(과정 자료) Fixture. 실제 GET / POST / DELETE /api/student/tasks/{taskId}/evidence 대신 메모리 저장소를 쓴다.
// - Canonical Evidence 하나를 Task Detail 과정 자료 Tab과 School Evidence 목록이 함께 읽는다. (Task별 복사본 없음)
// - Seed 자료는 Evidence-00 / TasksDetail-04 Mockup에 파일 이름이 보이는 것만 둔다.
//   (Mockup의 임시 이름 "dd"와 파일 이름이 보이지 않는 하천 묶음은 넣지 않는다 → 그 Task는 "준비 안 됨")
// - Seed 자료는 원본 파일이 없어 미리볼 수 없다. 이번 Session에 학생이 고른 파일만 브라우저에서 미리본다.
// - 실제 Backend / File Storage가 아니다. 새로고침하면 Seed로 돌아간다. (Task Create / Topic과 같은 메모리 방식)
// - Evidence 추가 / 삭제는 Task currentStage를 바꾸지 않는다. (Evidence ≥ 1은 자료 조사 완료 조건 "만족 가능" 표시만, Stage 4 자동 전이 / 삭제 시 역전 없음)

import type { SchoolEvidenceListResult, TaskEvidence, TaskEvidenceList, TaskProcessCategory } from '../model/types.ts'
import { findCreatedTask, markTaskStoreChanged, taskStoreRevision } from './schoolTaskRepository.fixture.ts'
import { createSchoolTaskListFixtureLoader, SCHOOL_SNAPSHOT_DATE } from './schoolTasks.fixture.ts'

const seed = (taskId: string, evidenceId: string, fileName: string, stageTag: TaskProcessCategory, date: string): TaskEvidence => ({
  evidenceId,
  taskId,
  fileName,
  fileRef: `fixture-seed:${evidenceId}`,
  stageTag,
  createdAt: `${date}T09:00:00+09:00`,
})

/** Mockup에서 파일 이름이 보이는 Seed Evidence (Task별) */
const seedEvidence: Record<string, TaskEvidence[]> = {
  'fixture-task-02': [
    seed('fixture-task-02', 'speech-outline', 'speech_outline.png', 'plan', '2026-09-27'),
    seed('fixture-task-02', 'speech-articles', 'AI 교육 기사 3건 요약.pdf', 'research', '2026-09-28'),
    seed('fixture-task-02', 'speech-v1-file', 'speech_v1_612words.docx', 'draft', '2026-10-01'),
    seed('fixture-task-02', 'speech-v2-file', 'speech_v2_548words.docx', 'draft', '2026-10-03'),
  ],
  'fixture-task-03': [
    seed('fixture-task-03', 'lunch-data', '급식 잔반 데이터.csv', 'research', '2026-10-06'),
    seed('fixture-task-03', 'lunch-analysis', '급식 잔반 데이터 분석.py', 'draft', '2026-10-06'),
  ],
  'fixture-task-04': [
    seed('fixture-task-04', 'braking-data', '도로교통공단 속도별 제동거리.png', 'research', '2026-09-25'),
    seed('fixture-task-04', 'braking-v1', '제동거리_탐구보고서_v1.pdf', 'draft', '2026-09-29'),
    seed('fixture-task-04', 'braking-final', '최종 제출.py', 'final', '2026-10-06'),
  ],
  // 자료 조사 단계 Seed Task: 아직 올린 자료가 없다. (Evidence 0 → 1 확인용)
  'fixture-task-07': [],
}

/** 이번 Session의 Task별 Evidence (처음 바뀔 때 Seed를 복사해 둔다) */
const sessionEvidence = new Map<string, TaskEvidence[]>()
let addedCount = 0

/** Seed 정보가 있거나 이번 Session에 등록한 Task면 자료 목록 전체를 안다. */
const isKnown = (taskId: string) => taskId in seedEvidence || Boolean(findCreatedTask(taskId))

export function taskEvidence(taskId: string): TaskEvidenceList {
  const items = sessionEvidence.get(taskId) ?? seedEvidence[taskId] ?? []
  return { items, complete: isKnown(taskId) }
}

// ---------- 추가 / 삭제 Service ----------

export type SchoolEvidenceFixtureScenario = 'success' | 'evidence-add-fail-once' | 'evidence-delete-fail-once'
const scenarios: SchoolEvidenceFixtureScenario[] = ['success', 'evidence-add-fail-once', 'evidence-delete-fail-once']

export function readSchoolEvidenceFixtureScenario(search: string): SchoolEvidenceFixtureScenario {
  const value = new URLSearchParams(search).get('fixture')
  return scenarios.find((scenario) => scenario === value) ?? 'success'
}

export interface SchoolEvidenceService {
  add: (taskId: string, file: File, stageTag: TaskProcessCategory) => Promise<TaskEvidence>
  remove: (taskId: string, evidenceId: string) => Promise<void>
}

const services = new Map<SchoolEvidenceFixtureScenario, SchoolEvidenceService>()

export function createSchoolEvidenceFixtureService(scenario: SchoolEvidenceFixtureScenario): SchoolEvidenceService {
  let service = services.get(scenario)
  if (!service) {
    let addAttempts = 0
    let removeAttempts = 0
    service = {
      add: (taskId, file, stageTag) => {
        addAttempts += 1
        return new Promise((resolve, reject) => {
          // 응답 지연을 흉내 내 중복 클릭을 확인할 수 있게 한다. (파일 준비 진행률과는 별개)
          setTimeout(() => {
            if (scenario === 'evidence-add-fail-once' && addAttempts === 1) {
              reject(new Error('School evidence add fixture error'))
              return
            }
            addedCount += 1
            const evidenceId = `fixture-evidence-${String(addedCount).padStart(3, '0')}`
            const evidence: TaskEvidence = {
              evidenceId,
              taskId,
              fileName: file.name,
              fileRef: `fixture-local:${evidenceId}`,
              stageTag,
              createdAt: `${SCHOOL_SNAPSHOT_DATE}T10:00:00+09:00`,
              mimeType: file.type,
              sizeBytes: file.size,
              file,
            }
            sessionEvidence.set(taskId, [...taskEvidence(taskId).items, evidence])
            markTaskStoreChanged()
            resolve(evidence)
          }, 300)
        })
      },
      remove: (taskId, evidenceId) => {
        removeAttempts += 1
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            if (scenario === 'evidence-delete-fail-once' && removeAttempts === 1) {
              reject(new Error('School evidence delete fixture error'))
              return
            }
            sessionEvidence.set(
              taskId,
              taskEvidence(taskId).items.filter((item) => item.evidenceId !== evidenceId),
            )
            markTaskStoreChanged()
            resolve()
          }, 300)
        })
      },
    }
    services.set(scenario, service)
  }
  return service
}

// ---------- School Evidence 전체 목록 (Evidence-00) ----------
// 전체 목록 Endpoint가 Contract에 없어, Task 목록(GET /api/student/tasks) + Task별 Evidence(GET …/evidence)를 묶는 방식으로 읽는다.
// 로그인 Student(최하은)의 Task만 대상이다.

export type SchoolEvidenceListFixtureScenario = 'success' | 'loading' | 'error' | 'empty'
const listScenarios: SchoolEvidenceListFixtureScenario[] = ['success', 'loading', 'error', 'empty']

export function readSchoolEvidenceListFixtureScenario(search: string): SchoolEvidenceListFixtureScenario {
  const value = new URLSearchParams(search).get('fixture')
  return listScenarios.find((scenario) => scenario === value) ?? 'success'
}

export type SchoolEvidenceListLoader = () => Promise<SchoolEvidenceListResult>
const listLoaders = new Map<string, SchoolEvidenceListLoader>()

export function createSchoolEvidenceListFixtureLoader(scenario: SchoolEvidenceListFixtureScenario): SchoolEvidenceListLoader {
  const key = `${scenario}|${taskStoreRevision()}`
  let loader = listLoaders.get(key)
  if (!loader) {
    loader = () => {
      switch (scenario) {
        case 'loading':
          return new Promise<SchoolEvidenceListResult>(() => {})
        case 'error':
          return Promise.reject(new Error('School evidence list fixture error'))
        case 'empty':
          return Promise.resolve({ groups: [] })
        case 'success':
          return createSchoolTaskListFixtureLoader('success')().then(({ items }) => ({
            groups: items
              .map((task) => ({ task, items: taskEvidence(task.taskId).items }))
              .filter((group) => group.items.length > 0),
          }))
      }
    }
    listLoaders.set(key, loader)
  }
  return loader
}
