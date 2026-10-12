// UI 검증용 Growth Activity Fixture. 실제 /api/student/activities(목록 · 생성 · 수정 · 제출 · Evidence) 대신 메모리 저장소를 쓴다.
// - Canonical Activity 하나를 목록 · Detail이 함께 읽는다. 화면마다 다른 Activity 객체를 만들지 않는다.
// - Task와 다른 Entity다. Activity 과정 자료도 Task Evidence 저장소와 따로 둔다.
// - Seed는 Activities-00 / ActivitiesDetail-01·02 Mockup 중 로그인 학생(최하은)의 기록 하나뿐이다. (다른 학생 카드는 넣지 않는다)
//   Mockup에 없는 부제 / 팀 인원은 Contract 필드가 없어 두지 않는다.
// - 이번 Branch에서 학생이 바꾸는 상태는 작성 중(draft) → 제출(submitted)뿐이다. Reflection / 피드백 / Archive 저장은 다음 Branch.
// - 실제 Backend가 아니다. 새로고침하면 Seed로 돌아간다.

import type {
  ActivityEvidence,
  ActivityRecordFields,
  GrowthActivity,
  GrowthActivityDetail,
  GrowthActivityListItem,
} from '../model/activity.ts'
import { activityReflectionQuestions } from '../model/activity.ts'
import { SCHOOL_SNAPSHOT_DATE } from './schoolTasks.fixture.ts'

const seedActivity: GrowthActivity = {
  activityId: 'fixture-activity-biology-club',
  title: '생명과학 탐구동아리',
  type: 'club',
  organizer: '교내 생명과학 탐구동아리',
  startDate: '2026-09-12',
  endDate: '2026-09-26',
  role: '배지 촬영과 관찰 기록지 정리',
  participationReason: '',
  process: '',
  contribution: '손 씻기 전후 손가락을 배지에 찍어 3일 동안 세균 집락 수 변화를 조별로 관찰했어요.',
  result: '손 씻기 후 집락 수가 평균 70% 정도 줄어든 결과를 조별 결과표로 정리했어요.',
  followUp: '',
  tags: [],
  status: 'feedback-delivered',
  visibility: 'PRIVATE',
  // ActivitiesDetail-02의 학생 Reflection (마지막 질문은 아직 쓰지 않음)
  reflection: [
    '수행평가에서 다룬 항생제 내성이 실제 세균에서 어떻게 보이는지 궁금했어요.',
    '배지 사진을 같은 각도로 찍고 집락 수를 세어 기록지에 정리했어요.',
    '손 씻기 전, 물로만 씻은 후, 비누로 씻은 후 세 조건으로 배지를 만들었어요.',
    '집락이 겹쳐 있어 개수를 세는 기준이 사람마다 달랐어요.',
    '관찰 기준을 먼저 정하지 않으면 같은 배지도 결과가 달라질 수 있다는 걸 알았어요.',
    '집락을 세는 기준을 사진 예시로 먼저 정하고 시작하고 싶어요.',
    null,
  ].map((answer, index) => ({ question: activityReflectionQuestions[index], answer })),
  feedback: {
    author: '김현우',
    deliveredAt: '2026-10-02T17:10:00+09:00',
    sections: [
      { label: '잘 드러난 점', text: '조건을 세 가지로 나눠 비교한 점과 관찰 기준 문제를 스스로 발견한 점이 잘 드러나요.' },
      { label: '조금 더 구체화할 점', text: '집락 수를 셀 때 조원끼리 어떤 기준으로 맞췄는지 한 문장 추가해보세요.' },
      { label: '생각해볼 질문', text: '같은 배지를 다른 사람이 세면 결과가 얼마나 달라질까요?' },
      { label: '다음 활동 제안', text: '다음 관찰에서는 기준 사진을 먼저 만들어 조원과 공유해볼 수 있어요.' },
    ],
  },
}

const seedEvidence = (evidenceId: string, fileName: string): ActivityEvidence => ({
  evidenceId,
  activityId: seedActivity.activityId,
  fileName,
  fileRef: `fixture-seed:${evidenceId}`,
  createdAt: '2026-09-26T18:00:00+09:00',
})

const activities: GrowthActivity[] = [seedActivity]
const evidence = new Map<string, ActivityEvidence[]>([
  [
    seedActivity.activityId,
    [
      seedEvidence('biology-club-photos', '배지 사진 6장.zip'),
      seedEvidence('biology-club-sheet', '관찰 기록지.pdf'),
      seedEvidence('biology-club-result', '조별 결과표.xlsx'),
    ],
  ],
])
let revision = 0
let createdCount = 0
let addedEvidenceCount = 0

/** 저장소가 바뀔 때마다 증가한다. 목록 / Detail Loader가 이 값으로 다시 읽는다. */
export const activityStoreRevision = () => revision

const findActivity = (activityId: string) => activities.find((item) => item.activityId === activityId)

// ---------- 목록 / Detail Loader ----------

export type SchoolActivityLoadScenario = 'success' | 'loading' | 'error' | 'empty'
const loadScenarios: SchoolActivityLoadScenario[] = ['success', 'loading', 'error', 'empty']

export function readSchoolActivityLoadScenario(search: string): SchoolActivityLoadScenario {
  const value = new URLSearchParams(search).get('fixture')
  return loadScenarios.find((scenario) => scenario === value) ?? 'success'
}

export type SchoolActivityListLoader = () => Promise<GrowthActivityListItem[]>
export type SchoolActivityDetailLoader = (activityId: string) => Promise<GrowthActivityDetail | null>

const listLoaders = new Map<string, SchoolActivityListLoader>()
const detailLoaders = new Map<string, SchoolActivityDetailLoader>()

/** 로그인 학생(최하은)의 활동 전체. 검색 / 유형 Filter는 화면이 이 목록에 적용한다. (GET /api/student/activities 한 번) */
export function createSchoolActivityListLoader(scenario: SchoolActivityLoadScenario): SchoolActivityListLoader {
  const key = `${scenario}|${revision}`
  let loader = listLoaders.get(key)
  if (!loader) {
    loader = () => {
      switch (scenario) {
        case 'loading':
          return new Promise<GrowthActivityListItem[]>(() => {})
        case 'error':
          return Promise.reject(new Error('School activity list fixture error'))
        case 'empty':
          return Promise.resolve([])
        case 'success':
          // 최근에 기록한 활동이 먼저 (새로 만든 활동 → Seed)
          return Promise.resolve(
            [...activities].reverse().map((activity) => ({ activity, evidenceCount: evidence.get(activity.activityId)?.length ?? 0 })),
          )
      }
    }
    listLoaders.set(key, loader)
  }
  return loader
}

export function createSchoolActivityDetailLoader(scenario: SchoolActivityLoadScenario): SchoolActivityDetailLoader {
  const key = `${scenario}|${revision}`
  let loader = detailLoaders.get(key)
  if (!loader) {
    loader = (activityId) => {
      switch (scenario) {
        case 'loading':
          return new Promise<GrowthActivityDetail | null>(() => {})
        case 'error':
          return Promise.reject(new Error('School activity detail fixture error'))
        case 'empty':
        case 'success': {
          const activity = findActivity(activityId)
          return Promise.resolve(activity ? { activity, evidence: evidence.get(activityId) ?? [] } : null)
        }
      }
    }
    detailLoaders.set(key, loader)
  }
  return loader
}

// ---------- 생성 / 수정 / 제출 / 과정 자료 Service ----------

export type SchoolActivityActionScenario =
  | 'success'
  | 'activity-create-fail-once'
  | 'activity-save-fail-once'
  | 'activity-submit-fail-once'
  | 'activity-evidence-add-fail-once'
  | 'activity-evidence-delete-fail-once'
const actionScenarios: SchoolActivityActionScenario[] = [
  'success',
  'activity-create-fail-once',
  'activity-save-fail-once',
  'activity-submit-fail-once',
  'activity-evidence-add-fail-once',
  'activity-evidence-delete-fail-once',
]

export function readSchoolActivityActionScenario(search: string): SchoolActivityActionScenario {
  const value = new URLSearchParams(search).get('fixture')
  return actionScenarios.find((scenario) => scenario === value) ?? 'success'
}

export interface SchoolActivityService {
  create: (fields: ActivityRecordFields) => Promise<GrowthActivity>
  update: (activityId: string, fields: ActivityRecordFields) => Promise<void>
  submit: (activityId: string) => Promise<void>
  addEvidence: (activityId: string, file: File) => Promise<ActivityEvidence>
  removeEvidence: (activityId: string, evidenceId: string) => Promise<void>
}

const services = new Map<SchoolActivityActionScenario, SchoolActivityService>()

/** 응답 지연을 흉내 내 중복 클릭을 확인할 수 있게 한다. 실패 시나리오는 그 동작의 첫 요청만 실패한다. */
function respond<T>(fail: boolean, run: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (fail) {
        reject(new Error('School activity fixture error'))
        return
      }
      try {
        const value = run()
        revision += 1
        resolve(value)
      } catch (error) {
        reject(error)
      }
    }, 250)
  })
}

export function createSchoolActivityService(scenario: SchoolActivityActionScenario): SchoolActivityService {
  let service = services.get(scenario)
  if (!service) {
    const attempts = { create: 0, update: 0, submit: 0, add: 0, remove: 0 }
    const editable = (activityId: string) => {
      const activity = findActivity(activityId)
      if (!activity) throw new Error('ACTIVITY_NOT_FOUND')
      if (activity.status !== 'draft') throw new Error('ACTIVITY_NOT_EDITABLE')
      return activity
    }
    service = {
      create: (fields) => {
        attempts.create += 1
        return respond(scenario === 'activity-create-fail-once' && attempts.create === 1, () => {
          createdCount += 1
          const activity: GrowthActivity = {
            ...fields,
            activityId: `fixture-activity-${String(createdCount).padStart(3, '0')}`,
            // 처음 기록은 늘 작성 중(Draft)
            status: 'draft',
            visibility: 'PRIVATE',
            reflection: activityReflectionQuestions.map((question) => ({ question, answer: null })),
            feedback: null,
          }
          activities.push(activity)
          evidence.set(activity.activityId, [])
          return activity
        })
      },
      update: (activityId, fields) => {
        attempts.update += 1
        return respond(scenario === 'activity-save-fail-once' && attempts.update === 1, () => {
          Object.assign(editable(activityId), fields)
        })
      },
      submit: (activityId) => {
        attempts.submit += 1
        return respond(scenario === 'activity-submit-fail-once' && attempts.submit === 1, () => {
          const activity = findActivity(activityId)
          if (!activity) throw new Error('ACTIVITY_NOT_FOUND')
          // 이미 제출했으면 그대로 둔다. (한 번만 바뀐다) 피드백 요청은 선택이라 자동으로 피드백 대기로 바꾸지 않는다.
          if (activity.status === 'draft') activity.status = 'submitted'
        })
      },
      addEvidence: (activityId, file) => {
        attempts.add += 1
        return respond(scenario === 'activity-evidence-add-fail-once' && attempts.add === 1, () => {
          editable(activityId)
          addedEvidenceCount += 1
          const evidenceId = `fixture-activity-evidence-${String(addedEvidenceCount).padStart(3, '0')}`
          const item: ActivityEvidence = {
            evidenceId,
            activityId,
            fileName: file.name,
            fileRef: `fixture-local:${evidenceId}`,
            createdAt: `${SCHOOL_SNAPSHOT_DATE}T11:00:00+09:00`,
            mimeType: file.type,
            sizeBytes: file.size,
            file,
          }
          evidence.set(activityId, [...(evidence.get(activityId) ?? []), item])
          return item
        })
      },
      removeEvidence: (activityId, evidenceId) => {
        attempts.remove += 1
        return respond(scenario === 'activity-evidence-delete-fail-once' && attempts.remove === 1, () => {
          editable(activityId)
          evidence.set(
            activityId,
            (evidence.get(activityId) ?? []).filter((item) => item.evidenceId !== evidenceId),
          )
        })
      },
    }
    services.set(scenario, service)
  }
  return service
}
