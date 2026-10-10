// Frontend UI 검증용 Plan Apply Fixture다.
// - Library / 기존 일정은 기존 LearnersHigh Library · Plan Schema가 아니다. (실제 API / DB 구조 미확인)
// - Preview / Apply는 POST .../plan-apply-preview, POST .../apply-plan을 흉내만 낸다. 실제로 저장하지 않는다.
// - 기존 일정과 대표 Plan 4주차 시간은 Plan-02 ~ 04 Mockup 값을 쓴다.

import type {
  ExistingLibraryItemView,
  MentorPlanDay,
  MentorPlanDetail,
  PlanApplyConflict,
  PlanApplyPreviewItem,
  PlanApplyPreviewRequest,
  PlanApplyPreviewResult,
  PlanApplyRequest,
  PlanApplyResult,
  PlanTimeSlot,
} from '../model/types.ts'
import { findMentorPlanFixture } from './mentorPlan.fixture.ts'

/** 내 Library 표시용 가상 목록 (libraryItemId / title / subject / type만 쓴다) */
export const fixtureExistingLibraryItems: ExistingLibraryItemView[] = [
  { libraryItemId: 'fixture-library-01', title: '쎈 수학Ⅱ', subject: '수학Ⅱ', type: '문제집' },
  { libraryItemId: 'fixture-library-02', title: '수학Ⅱ 교과서', subject: '수학Ⅱ', type: '교과서' },
  { libraryItemId: 'fixture-library-03', title: '화학Ⅰ 교과서', subject: '화학Ⅰ', type: '교과서' },
  { libraryItemId: 'fixture-library-04', title: '화학Ⅰ 서술형 문제집', subject: '화학Ⅰ', type: '문제집' },
  { libraryItemId: 'fixture-library-05', title: '영어 교과서 본문', subject: '영어', type: '교과서' },
  { libraryItemId: 'fixture-library-06', title: '국어 문학 자습서', subject: '국어', type: '자습서' },
]

interface ExistingSchedule {
  day: MentorPlanDay
  title: string
  slot: PlanTimeSlot
}

/** 매주 반복되는 가상 기존 일정 (Plan-02 Mockup) */
const existingWeeklySchedules: ExistingSchedule[] = [
  { day: '월', title: '생명과학 학원', slot: { start: '19:00', end: '21:00' } },
  { day: '수', title: '수학 학원', slot: { start: '18:00', end: '20:00' } },
  { day: '목', title: '생명과학 학원', slot: { start: '19:00', end: '21:00' } },
]

/** 대표 Plan 4주차 Item의 기본 시간 (Plan-02 Mockup). 그 외 Item은 20:00–21:00 */
const fixtureItemSlots: Record<string, PlanTimeSlot> = {
  'fixture-content-plan-02-w4-1': { start: '19:30', end: '21:00' },
  'fixture-content-plan-02-w4-2': { start: '20:00', end: '21:00' },
  'fixture-content-plan-02-w4-3': { start: '19:00', end: '19:40' },
  'fixture-content-plan-02-w4-4': { start: '20:00', end: '21:00' },
  'fixture-content-plan-02-w4-5': { start: '19:00', end: '20:30' },
}
const defaultSlot: PlanTimeSlot = { start: '20:00', end: '21:00' }

const dayOrder: MentorPlanDay[] = ['일', '월', '화', '수', '목', '금', '토']

const toMinutes = (time: string) => {
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}
const toTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

const overlaps = (a: PlanTimeSlot, b: PlanTimeSlot) =>
  toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end)

/** 시작일 이후(당일 포함) 처음 오는 해당 요일. Timezone 영향을 피하려고 UTC 날짜 계산만 쓴다. */
function dateOnOrAfter(startDate: string, day: MentorPlanDay): string {
  const [year, month, date] = startDate.split('-').map(Number)
  const start = new Date(Date.UTC(year, month - 1, date))
  const offset = (dayOrder.indexOf(day) - start.getUTCDay() + 7) % 7
  start.setUTCDate(start.getUTCDate() + offset)
  return start.toISOString().slice(0, 10)
}

function buildPreview(
  plan: MentorPlanDetail,
  request: PlanApplyPreviewRequest,
  schedules: ExistingSchedule[],
): PlanApplyPreviewResult {
  const items = plan.weeks.flatMap((week) => week.items).filter((item) => request.selectedItemIds.includes(item.itemId))
  const resolvedItems: PlanApplyPreviewItem[] = []
  const conflicts: PlanApplyConflict[] = []

  for (const item of items) {
    const slot = fixtureItemSlots[item.itemId] ?? defaultSlot
    resolvedItems.push({ mentorItemId: item.itemId, date: dateOnOrAfter(request.startDate, item.day), slot })

    const existing = schedules.find((schedule) => schedule.day === item.day && overlaps(schedule.slot, slot))
    if (existing) {
      // 기존 일정이 끝난 직후로 같은 길이만큼 옮기는 안
      const duration = toMinutes(slot.end) - toMinutes(slot.start)
      const start = toMinutes(existing.slot.end)
      conflicts.push({
        mentorItemId: item.itemId,
        existingSchedule: { title: existing.title, slot: existing.slot },
        suggestedSlot: { start: toTime(start), end: toTime(start + duration) },
      })
    }
  }

  return { resolvedItems, conflicts }
}

// ---------- Scenario (개발 중 ?fixture= 로 확인. Plan Detail Scenario 값과 겹치지 않는다) ----------

/**
 * success: Mockup 기존 일정과 비교 (충돌 있음)
 * no-conflict: 기존 일정 없음 (충돌 없음)
 * apply-fail-once: 첫 "내 주간계획에 추가"는 실패, 다시 시도하면 성공
 */
export type PlanApplyFixtureScenario = 'success' | 'no-conflict' | 'apply-fail-once'

const scenarios: PlanApplyFixtureScenario[] = ['success', 'no-conflict', 'apply-fail-once']

export function readPlanApplyFixtureScenario(search: string): PlanApplyFixtureScenario {
  const value = new URLSearchParams(search).get('fixture')
  return scenarios.find((scenario) => scenario === value) ?? 'success'
}

export interface PlanApplyService {
  preview: (contentId: string, request: PlanApplyPreviewRequest) => Promise<PlanApplyPreviewResult>
  apply: (contentId: string, request: PlanApplyRequest) => Promise<PlanApplyResult>
}

function buildService(scenario: PlanApplyFixtureScenario): PlanApplyService {
  const schedules = scenario === 'no-conflict' ? [] : existingWeeklySchedules
  let applyAttempts = 0
  let applicationSeq = 0

  return {
    preview: (contentId, request) => {
      const plan = findMentorPlanFixture(contentId)
      return plan ? Promise.resolve(buildPreview(plan, request, schedules)) : Promise.reject(new Error('Plan not found'))
    },
    apply: (contentId, request) => {
      applyAttempts += 1
      if (scenario === 'apply-fail-once' && applyAttempts === 1) {
        return new Promise((_, reject) => setTimeout(() => reject(new Error('Plan apply fixture error')), 400))
      }
      const excluded = new Set(
        request.conflictResolutions.filter((item) => item.resolution === 'exclude').map((item) => item.mentorItemId),
      )
      applicationSeq += 1
      const result: PlanApplyResult = {
        // 실제 DB ID가 아니다.
        applicationId: `fixture-application-${applicationSeq}`,
        createdPlanItemIds: request.selectedItemIds
          .filter((id) => !excluded.has(id))
          .map((id) => `fixture-created-${applicationSeq}-${id}`),
        sourceMentorPlanId: contentId,
        snapshotCreated: true,
      }
      return new Promise((resolve) => setTimeout(() => resolve(result), 400))
    },
  }
}

const services = new Map<PlanApplyFixtureScenario, PlanApplyService>()

/** 실제 Plan Apply API 대신 Fixture를 쓰는 Service. 같은 scenario에는 같은 객체를 돌려준다. */
export function createPlanApplyFixtureService(scenario: PlanApplyFixtureScenario): PlanApplyService {
  let service = services.get(scenario)
  if (!service) {
    service = buildService(scenario)
    services.set(scenario, service)
  }
  return service
}
