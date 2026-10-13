// UI 검증용 Version / AI 사전 점검 Fixture. 실제 POST · GET /api/student/tasks/{taskId}/versions, …/ai-analysis/retry 대신 메모리 저장소를 쓴다.
// - Canonical Version 하나를 지금 할 일 · 피드백 Tab · 수정 기록 Tab이 함께 읽는다. Evidence(과정 자료)와 다른 Entity다.
// - 제출: 새 Version(latest + 1, 이전 Version 유지) → AI 사전 점검 시작(processing). Task는 4단계 → 5단계 AI 사전 점검.
//   근거: Feature Spec Stage 4 "제출 즉시 AI 분석" / Stage 5 "AI 사전 점검", Seed "5 · AI 1차 분석 중"
// - AI 결과(성공 / 실패)는 서버 처리 결과다. Student 화면에 버튼이 없고, 개발 중에만 applyAiAnalysisFixture로 재현한다.
//   (시간이 지나면 끝나는 것처럼 흉내 내지 않는다)
// - 성공: AI 사전 점검 결과 생성 + 공용 검토 대기열 진입(inFeedbackQueue) → 5단계 완료, 6단계 선생님 피드백(검토 대기).
//   근거: Spec Stage 5 "성공 또는 실패/Retry" · Stage 6 "Shared Feedback Queue", Version + AI 성공 "Task Stage 갱신"
// - 분석 중 / 실패 / 다시 시도는 5단계에 머문다. 실패 시 다시 시도(같은 Version을 다시 분석), 새 Version을 만들지 않는다.
// - 수정본(V2 / V3)은 7단계 Revision Loop 안에서 반복한다. 제출하는 순간 6 → 7단계, 그 뒤 AI 분석 중 / 실패 / 재검토 대기도
//   7단계에 머문다. (5단계로 되돌리지 않는다)
// - AI는 학생 파일을 고치거나 새 Version을 만들지 않는다. 결과는 참고용 확인 포인트만 둔다. (점수 · 등급 없음)
// - 실제 Backend / AI / File Storage가 아니다. 새로고침하면 Seed로 돌아간다.

import type { StudentTaskSummary, TaskAiFeedback, TaskVersion, TaskVersionList } from '../model/types.ts'
import { findCreatedTask, findSeedOverride, saveTaskSummary } from './schoolTaskRepository.fixture.ts'
import { fixtureStudentTasks, SCHOOL_SNAPSHOT_DATE } from './schoolTasks.fixture.ts'

/** 항생제 포스터 Task (Mentor Hub currentTask와 같은 4단계 Task) */
const antibioticTaskId = fixtureStudentTasks.find((task) => task.currentStage === 4)?.taskId ?? 'fixture-task-01'

const seedVersion = (
  taskId: string,
  versionId: string,
  versionNumber: number,
  fileName: string,
  submittedAt: string,
  note: string,
  sizeSummary: string,
): TaskVersion => ({
  versionId,
  taskId,
  versionNumber,
  label: `V${versionNumber}`,
  fileName,
  fileRef: `fixture-seed:${versionId}`,
  submittedAt,
  aiAnalysisStatus: 'success',
  retryAllowed: false,
  inFeedbackQueue: true,
  note,
  sizeSummary,
})

/** Version 정보가 있는 Seed Task (TasksDetail-07 Mockup) */
const seedVersions: Record<string, TaskVersion[]> = {
  'fixture-task-02': [
    seedVersion('fixture-task-02', 'speech-v1', 1, 'speech_v1_612words.docx', '2026-10-01T22:10:00+09:00', '최초 원고', '4분 20초 · 612단어'),
    seedVersion('fixture-task-02', 'speech-v2', 2, 'speech_v2_548words.docx', '2026-10-03T20:45:00+09:00', '반복 표현 정리, 사례 1개 삭제', '3분 55초 · 548단어'),
  ],
  // 항생제 포스터 (4단계 초안 V1 미제출): 아직 제출한 Version이 없다.
  [antibioticTaskId]: [],
}

const sessionVersions = new Map<string, TaskVersion[]>()
/** 이번 Session에 만든 AI 사전 점검 결과 (versionId별) */
const sessionAiFeedback = new Map<string, TaskAiFeedback>()
let submittedCount = 0

const isKnown = (taskId: string) => taskId in seedVersions || Boolean(findCreatedTask(taskId))

export function taskVersions(taskId: string): TaskVersionList {
  return { items: sessionVersions.get(taskId) ?? seedVersions[taskId] ?? [], complete: isKnown(taskId) }
}

/** 이번 Session에 만든 AI 사전 점검 결과 (최근 Version이 먼저) */
export function sessionAiFeedbackFor(taskId: string): TaskAiFeedback[] {
  return taskVersions(taskId)
    .items.map((version) => sessionAiFeedback.get(version.versionId))
    .filter((item): item is TaskAiFeedback => Boolean(item))
    .reverse()
}

/** 기준일 10:00부터 minutes분 뒤의 Fixture 시각 (ISO 8601, KST) */
function fixtureTime(minutes: number): string {
  const total = 10 * 60 + minutes
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${SCHOOL_SNAPSHOT_DATE}T${pad(Math.floor(total / 60))}:${pad(total % 60)}:00+09:00`
}

/** fixtureTime의 반대: 10:00부터 지난 분 */
const minutesOf = (iso: string) => {
  const [hour, minute] = iso.slice(11, 16).split(':').map(Number)
  return hour * 60 + minute - 10 * 60
}

function currentSummary(taskId: string): StudentTaskSummary | undefined {
  return findCreatedTask(taskId)?.task ?? findSeedOverride(taskId)?.task ?? fixtureStudentTasks.find((task) => task.taskId === taskId)
}

function saveVersion(next: TaskVersion) {
  sessionVersions.set(
    next.taskId,
    taskVersions(next.taskId).items.map((item) => (item.versionId === next.versionId ? next : item)),
  )
}

/** 이 Version이 속한 단계: 초안 V1은 4 → 5(AI 사전 점검) → 6, 수정본 V2 / V3는 7(Revision) 안에서만 움직인다. */
const isRevision = (version: Pick<TaskVersion, 'versionNumber'>) => version.versionNumber > 1

/** AI 사전 점검을 진행하는 동안의 Task 요약 (기다리는 중) */
function analyzingSummary(task: StudentTaskSummary, version: Pick<TaskVersion, 'versionNumber' | 'label'>): StudentTaskSummary {
  return isRevision(version)
    ? { ...task, currentStage: 7, stageStatus: `${version.label} AI 사전 점검 중`, turn: 'waiting', nextAction: 'AI 사전 점검이 끝나면 알려드릴게요.' }
    : { ...task, currentStage: 5, stageStatus: 'AI 1차 분석 중', turn: 'waiting', nextAction: 'AI 사전 점검이 끝나면 알려드릴게요.' }
}

// ---------- 제출 / 다시 시도 Service ----------

export type VersionFixtureErrorCode =
  | 'VERSION_SUBMIT_FAILED'
  | 'VERSION_NOT_FOUND'
  | 'AI_ANALYSIS_ALREADY_PROCESSING'
  | 'AI_ANALYSIS_RETRY_NOT_ALLOWED'

export class VersionFixtureError extends Error {
  code: VersionFixtureErrorCode
  constructor(code: VersionFixtureErrorCode) {
    super(code)
    this.code = code
  }
}

export type SchoolVersionFixtureScenario =
  | 'success'
  | 'version-submit-fail-once'
  | 'ai-retry-already-processing'
  | 'ai-retry-version-not-found'
const scenarios: SchoolVersionFixtureScenario[] = [
  'success',
  'version-submit-fail-once',
  'ai-retry-already-processing',
  'ai-retry-version-not-found',
]

export function readSchoolVersionFixtureScenario(search: string): SchoolVersionFixtureScenario {
  const value = new URLSearchParams(search).get('fixture')
  return scenarios.find((scenario) => scenario === value) ?? 'success'
}

export interface SchoolVersionService {
  submit: (taskId: string, file: File) => Promise<TaskVersion>
  retryAnalysis: (taskId: string, versionId: string) => Promise<void>
}

const services = new Map<SchoolVersionFixtureScenario, SchoolVersionService>()

export function createSchoolVersionFixtureService(scenario: SchoolVersionFixtureScenario): SchoolVersionService {
  let service = services.get(scenario)
  if (!service) {
    let submitAttempts = 0
    service = {
      submit: (taskId, file) => {
        submitAttempts += 1
        return new Promise((resolve, reject) => {
          // 응답 지연을 흉내 내 중복 클릭을 확인할 수 있게 한다. (AI 분석 시간과는 무관)
          setTimeout(() => {
            const task = currentSummary(taskId)
            if (!task || (scenario === 'version-submit-fail-once' && submitAttempts === 1)) {
              reject(new VersionFixtureError('VERSION_SUBMIT_FAILED'))
              return
            }
            submittedCount += 1
            const items = taskVersions(taskId).items
            const versionNumber = (items.at(-1)?.versionNumber ?? 0) + 1
            const versionId = `fixture-version-${String(submittedCount).padStart(3, '0')}`
            const version: TaskVersion = {
              versionId,
              taskId,
              versionNumber,
              label: `V${versionNumber}`,
              fileName: file.name,
              fileRef: `fixture-local:${versionId}`,
              // 기준일(Snapshot) 안에서 제출 순서대로 10분씩 (Fixture 시각)
              submittedAt: fixtureTime(10 * (submittedCount - 1)),
              aiAnalysisStatus: 'processing',
              retryAllowed: false,
              inFeedbackQueue: false,
              mimeType: file.type,
              sizeBytes: file.size,
              file,
            }
            // 이전 Version은 그대로 두고 뒤에 붙인다.
            sessionVersions.set(taskId, [...items, version])
            saveTaskSummary(analyzingSummary(task, version))
            resolve(version)
          }, 300)
        })
      },
      retryAnalysis: (taskId, versionId) =>
        new Promise((resolve, reject) => {
          setTimeout(() => {
            const version = taskVersions(taskId).items.find((item) => item.versionId === versionId)
            const task = currentSummary(taskId)
            if (!version || !task || scenario === 'ai-retry-version-not-found') {
              reject(new VersionFixtureError('VERSION_NOT_FOUND'))
              return
            }
            if (version.aiAnalysisStatus === 'processing') {
              reject(new VersionFixtureError('AI_ANALYSIS_ALREADY_PROCESSING'))
              return
            }
            if (scenario === 'ai-retry-already-processing') {
              // 다른 곳(예: 다른 창)에서 이미 다시 시도한 상태를 재현한다.
              saveVersion({ ...version, aiAnalysisStatus: 'processing', retryAllowed: false })
              saveTaskSummary(analyzingSummary(task, version))
              reject(new VersionFixtureError('AI_ANALYSIS_ALREADY_PROCESSING'))
              return
            }
            if (version.aiAnalysisStatus !== 'failed' || !version.retryAllowed) {
              reject(new VersionFixtureError('AI_ANALYSIS_RETRY_NOT_ALLOWED'))
              return
            }
            // 같은 Version을 다시 분석한다. (새 Version을 만들지 않는다)
            saveVersion({ ...version, aiAnalysisStatus: 'processing', retryAllowed: false })
            saveTaskSummary(analyzingSummary(task, version))
            resolve()
          }, 300)
        }),
    }
    services.set(scenario, service)
  }
  return service
}

// ---------- 개발용: AI 사전 점검 결과 재현 (서버 처리 결과, Student 화면 버튼 없음) ----------

/** success / failed(다시 시도 가능) / failed-final(다시 시도 불가) */
export type AiAnalysisFixtureResult = 'success' | 'failed' | 'failed-final'

export function readAiAnalysisFixtureResult(search: string): AiAnalysisFixtureResult | undefined {
  const value = new URLSearchParams(search).get('fixtureAiResult')
  return value === 'success' || value === 'failed' || value === 'failed-final' ? value : undefined
}

/** 표시용 AI 사전 점검 항목 (가상). 학생 원고를 고쳐 쓰지 않고 확인할 곳만 알려준다. 점수 · 등급 없음. */
const fixtureAiItems = [
  { itemId: 'evidence', summary: '주장과 근거가 이어지는 부분을 다시 확인해보세요. 근거 문장 바로 뒤에 출처가 있으면 읽는 사람이 따라가기 쉬워요.' },
  { itemId: 'criteria', summary: '평가 기준과 연결되는 설명이 짧은 부분이 있는지 확인해보세요.' },
  { itemId: 'repeat', summary: '같은 표현이 반복되는 문장이 있는지 소리 내어 읽어보세요.' },
]

/** 분석 중인 최근 Version에 결과를 적용한다. 바꿨으면 true. */
export function applyAiAnalysisFixture(taskId: string, result: AiAnalysisFixtureResult): boolean {
  const version = taskVersions(taskId).items.findLast((item) => item.aiAnalysisStatus === 'processing')
  const task = currentSummary(taskId)
  if (!version || !task) return false

  if (result === 'success') {
    saveVersion({ ...version, aiAnalysisStatus: 'success', retryAllowed: false, inFeedbackQueue: true })
    sessionAiFeedback.set(version.versionId, {
      feedbackId: `${version.versionId}-ai`,
      versionId: version.versionId,
      versionLabel: version.label,
      analyzedAt: fixtureTime(minutesOf(version.submittedAt) + 5),
      items: fixtureAiItems.map((item) => ({ ...item, itemId: `${version.versionId}-${item.itemId}`, reflected: false })),
    })
    // 초안 V1: 5단계 완료 → 6단계(공용 검토 대기열). 수정본: 7단계 그대로 재검토 대기.
    saveTaskSummary(
      isRevision(version)
        ? { ...task, currentStage: 7, stageStatus: `${version.label} 재검토 대기`, turn: 'waiting', nextAction: `선생님이 ${version.label}을 다시 검토하고 있어요.` }
        : { ...task, currentStage: 6, stageStatus: `${version.label} 검토 대기`, turn: 'waiting', nextAction: `선생님이 ${version.label}을 검토하고 있어요.` },
    )
    return true
  }

  saveVersion({ ...version, aiAnalysisStatus: 'failed', retryAllowed: result === 'failed', inFeedbackQueue: false })
  saveTaskSummary({
    ...task,
    currentStage: isRevision(version) ? 7 : 5,
    stageStatus: isRevision(version) ? `${version.label} AI 사전 점검 실패` : 'AI 사전 점검 실패',
    turn: result === 'failed' ? 'student' : 'waiting',
    nextAction: result === 'failed' ? 'AI 사전 점검을 다시 시도해주세요.' : '학원에서 확인한 뒤 알려드릴게요.',
  })
  return true
}
