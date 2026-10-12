// UI 검증용 최종 제출 / 최종 결과물 / 학부모 공유 / Archive Projection Fixture. 실제 API 대신 메모리 저장소를 쓴다.
// - 최종 제출 Endpoint가 Contract에 없어 Feature 내부 Command(finalize)로 둔다. (API를 만들지 않는다)
// - 최종 제출은 선생님이 "최종 제출 준비"라고 한 최근 Version을 최종본으로 정한다. 새 파일을 올리지 않는다.
//   Final Artifact는 그 Version의 fileRef를 참조하는 별도 Entity다. (Version 기록은 그대로 남는다)
// - 최종 제출이 성공해야만 7(또는 6)단계 → 8단계. 실패하면 단계 · 결과물 모두 그대로.
// - 학부모 공유(PUT …/final-artifact/parent-share): Student는 not_shared ↔ consented만. 동의는 Parent Report 첨부 "후보"일 뿐,
//   바로 보내거나 첨부하지 않는다. (attached / shared는 Admin Report Flow)
// - Archive: 별도 Archive 기록을 만들지 않고, 완료(8단계)된 Task에서 계산한다. 최종 결과물은 있을 수도 없을 수도 있다.
//   (Task ─ TaskFinalArtifact? : 결과물이 없어도 완료 기록은 Archive에 남는다. API-OD-05 저장 방식 미확정)
// - 실제 Backend가 아니다. 새로고침하면 Seed로 돌아간다.

import type { ArchiveItemView, StudentTaskSummary, TaskFinalArtifact, TaskFinalArtifactState } from '../model/types.ts'
import { taskEvidence } from './schoolEvidence.fixture.ts'
import { taskFeedback } from './schoolFeedback.fixture.ts'
import { findCreatedTask, findSeedOverride, listCreatedTasks, saveTaskSummary, markTaskStoreChanged } from './schoolTaskRepository.fixture.ts'
import { fixtureStudentTasks, SCHOOL_SNAPSHOT_DATE } from './schoolTasks.fixture.ts'
import { taskVersions } from './schoolVersion.fixture.ts'

/** 최종 결과물 (taskId 하나에 하나) */
const artifacts = new Map<string, TaskFinalArtifact>()

export function taskFinalArtifact(taskId: string): TaskFinalArtifactState {
  const artifact = artifacts.get(taskId)
  return artifact ? { status: 'ready', data: artifact } : { status: 'none' }
}

function currentSummary(taskId: string): StudentTaskSummary | undefined {
  return findCreatedTask(taskId)?.task ?? findSeedOverride(taskId)?.task ?? fixtureStudentTasks.find((task) => task.taskId === taskId)
}

/** 선생님이 최근 Version에서 최종 제출 준비라고 했는지 */
function isFinalReady(taskId: string): boolean {
  const latest = taskVersions(taskId).items.at(-1)
  const feedback = taskFeedback(taskId)
  if (!latest || feedback.status !== 'ready') return false
  return feedback.data.reviewDecisions.some((decision) => decision.versionId === latest.versionId && !decision.needsAnotherRevision)
}

// ---------- 최종 제출 / 학부모 공유 Service ----------

export type SchoolFinalFixtureScenario = 'success' | 'final-submit-fail-once' | 'parent-share-fail-once'
const scenarios: SchoolFinalFixtureScenario[] = ['success', 'final-submit-fail-once', 'parent-share-fail-once']

export function readSchoolFinalFixtureScenario(search: string): SchoolFinalFixtureScenario {
  const value = new URLSearchParams(search).get('fixture')
  return scenarios.find((scenario) => scenario === value) ?? 'success'
}

export interface SchoolFinalService {
  finalize: (taskId: string) => Promise<TaskFinalArtifact>
  setParentShare: (taskId: string, consented: boolean) => Promise<void>
}

const services = new Map<SchoolFinalFixtureScenario, SchoolFinalService>()

export function createSchoolFinalFixtureService(scenario: SchoolFinalFixtureScenario): SchoolFinalService {
  let service = services.get(scenario)
  if (!service) {
    let finalizeAttempts = 0
    let shareAttempts = 0
    let createdCount = 0
    service = {
      finalize: (taskId) => {
        finalizeAttempts += 1
        return new Promise((resolve, reject) => {
          // 응답 지연을 흉내 내 중복 클릭을 확인할 수 있게 한다.
          setTimeout(() => {
            // 이미 최종 제출했으면 같은 결과물을 돌려준다. (두 번 만들지 않는다)
            const existing = artifacts.get(taskId)
            if (existing) {
              resolve(existing)
              return
            }
            const task = currentSummary(taskId)
            const latest = taskVersions(taskId).items.at(-1)
            if (scenario === 'final-submit-fail-once' && finalizeAttempts === 1) {
              reject(new Error('School final submit fixture error'))
              return
            }
            if (!task || !latest || !isFinalReady(taskId)) {
              reject(new Error('Task is not ready for final submission'))
              return
            }
            createdCount += 1
            const artifact: TaskFinalArtifact = {
              artifactId: `fixture-artifact-${taskId}-${createdCount}`,
              taskId,
              type: latest.fileName.split('.').pop()?.toUpperCase() ?? '파일',
              fileRef: latest.fileRef,
              parentShareStatus: 'not_shared',
              sourceVersionId: latest.versionId,
              sourceVersionLabel: latest.label,
              fileName: latest.fileName,
              createdAt: `${SCHOOL_SNAPSHOT_DATE}T18:00:00+09:00`,
              file: latest.file,
            }
            artifacts.set(taskId, artifact)
            // 최종 제출 완료 → 8단계. 더 기다릴 일 / 할 일이 없는 완료 상태.
            saveTaskSummary({ ...task, currentStage: 8, stageStatus: '최종 제출 완료', turn: 'done', nextAction: '수행평가를 완료했어요.' })
            resolve(artifact)
          }, 300)
        })
      },
      setParentShare: (taskId, consented) => {
        shareAttempts += 1
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            const artifact = artifacts.get(taskId)
            if (!artifact || (scenario === 'parent-share-fail-once' && shareAttempts === 1)) {
              reject(new Error('School parent share fixture error'))
              return
            }
            // 동의 해제 → not_shared (Parent Report 첨부 후보에서 빠진다). attached / shared는 Student가 바꾸지 않는다.
            artifacts.set(taskId, { ...artifact, parentShareStatus: consented ? 'consented' : 'not_shared' })
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

// ---------- Archive Projection (GET /api/student/archive 의미, source = task) ----------

/** 마감일로 학기 이름을 만든다. (3~7월 1학기, 8~2월 2학기) */
function periodLabel(deadlineDate: string): string {
  const [year, month] = deadlineDate.split('-').map(Number)
  if (month >= 8) return `${year}년 2학기`
  if (month <= 2) return `${year - 1}년 2학기`
  return `${year}년 1학기`
}

/**
 * 완료(8단계)된 Task의 Archive 항목. 그때그때 계산한다. (최종 결과물 유무와 무관)
 * 항목은 sourceId로 Task를 가리킬 뿐 결과물 내용을 복사하지 않는다. (Task 하나에 항목 하나)
 */
export function archiveTaskProjection(): ArchiveItemView[] {
  const tasks = [...listCreatedTasks(), ...fixtureStudentTasks.map((task) => findSeedOverride(task.taskId)?.task ?? task)]
  return tasks
    .filter((task) => task.currentStage === 8)
    // 정렬 규칙은 Source에 없다. 완료 시각이 Seed에 없어 마감일이 늦은 순으로 둔다. (같은 Fixture면 늘 같은 순서)
    .sort((a, b) => b.deadlineDate.localeCompare(a.deadlineDate) || a.taskId.localeCompare(b.taskId))
    .map((task): ArchiveItemView => ({
      source: 'task',
      sourceId: task.taskId,
      title: task.title,
      periodLabel: periodLabel(task.deadlineDate),
      category: task.subject,
      result: task.stageStatus,
      reflectionSummary: null,
      // 자료 정보가 준비되지 않은 Task는 0개와 구분해 null
      evidenceCount: taskEvidence(task.taskId).complete ? taskEvidence(task.taskId).items.length : null,
    }))
}
