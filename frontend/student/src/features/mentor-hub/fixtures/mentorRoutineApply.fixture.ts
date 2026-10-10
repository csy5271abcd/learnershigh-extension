// Frontend UI 검증용 Routine Apply Fixture다.
// - Preview / Apply는 POST .../routine-apply-preview, POST .../apply-routine을 흉내만 낸다. 실제로 저장하지 않는다.
// - 기존 일정은 existingSchedule.fixture.ts(Plan Apply와 공유). 기존 LearnersHigh Schedule Schema가 아니다.

import { overlaps } from '../model/timeSlot.ts'
import type {
  MentorPlanDay,
  MentorRoutineDetail,
  RoutineApplyConflict,
  RoutineApplyPreviewRequest,
  RoutineApplyPreviewResult,
  RoutineApplyRequest,
  RoutineApplyResult,
  RoutineApplyTarget,
} from '../model/types.ts'
import { fixtureExistingWeeklySchedules, scheduleLabel, type ExistingScheduleFixture } from './existingSchedule.fixture.ts'
import { findMentorRoutineFixture } from './mentorRoutine.fixture.ts'

/** 전체 적용 = Timeline 전체, 습관만 적용 = 고른 Habit */
function targets(routine: MentorRoutineDetail, request: RoutineApplyPreviewRequest): RoutineApplyTarget[] {
  if (request.applyAll) {
    return routine.timeline.map((block) => ({ targetId: block.blockId, title: block.title, slot: block.slot }))
  }
  return routine.habits
    .filter((habit) => request.selectedHabitIds.includes(habit.habitId))
    .map((habit) => ({ targetId: habit.habitId, title: habit.title, slot: habit.slot }))
}

function buildPreview(
  routine: MentorRoutineDetail,
  request: RoutineApplyPreviewRequest,
  schedules: ExistingScheduleFixture[],
): RoutineApplyPreviewResult {
  const items = targets(routine, request)
  const conflicts: RoutineApplyConflict[] = []

  for (const item of items) {
    const hits = schedules.filter((schedule) => routine.applyDays.includes(schedule.day) && overlaps(schedule.slot, item.slot))
    if (hits.length === 0) continue
    const days = routine.applyDays.filter((day: MentorPlanDay) => hits.some((hit) => hit.day === day))
    conflicts.push({ targetId: item.targetId, days, existingTitles: [...new Set(hits.map(scheduleLabel))] })
  }

  return { applyDays: routine.applyDays, items, conflicts }
}

/**
 * success: Mockup 기존 일정과 비교 (충돌 있음)
 * no-conflict: 기존 일정 없음 (충돌 없음)
 * apply-fail-once: 첫 "적용하기"는 실패, 다시 시도하면 성공
 */
export type RoutineApplyFixtureScenario = 'success' | 'no-conflict' | 'apply-fail-once'

const scenarios: RoutineApplyFixtureScenario[] = ['success', 'no-conflict', 'apply-fail-once']

export function readRoutineApplyFixtureScenario(search: string): RoutineApplyFixtureScenario {
  const value = new URLSearchParams(search).get('fixture')
  return scenarios.find((scenario) => scenario === value) ?? 'success'
}

export interface RoutineApplyService {
  preview: (contentId: string, request: RoutineApplyPreviewRequest) => Promise<RoutineApplyPreviewResult>
  apply: (contentId: string, request: RoutineApplyRequest) => Promise<RoutineApplyResult>
}

function buildService(scenario: RoutineApplyFixtureScenario): RoutineApplyService {
  const schedules = scenario === 'no-conflict' ? [] : fixtureExistingWeeklySchedules
  let applyAttempts = 0
  let applicationSeq = 0

  return {
    preview: (contentId, request) => {
      const routine = findMentorRoutineFixture(contentId)
      return routine ? Promise.resolve(buildPreview(routine, request, schedules)) : Promise.reject(new Error('Routine not found'))
    },
    apply: (contentId, request) => {
      applyAttempts += 1
      if (scenario === 'apply-fail-once' && applyAttempts === 1) {
        return new Promise((_, reject) => setTimeout(() => reject(new Error('Routine apply fixture error')), 400))
      }
      const routine = findMentorRoutineFixture(contentId)
      applicationSeq += 1
      const result: RoutineApplyResult = {
        // 실제 DB ID가 아니다.
        applicationId: `fixture-routine-application-${applicationSeq}`,
        createdScheduleItemIds: routine
          ? targets(routine, request).map((item) => `fixture-routine-created-${applicationSeq}-${item.targetId}`)
          : [],
        sourceMentorRoutineId: contentId,
        snapshotCreated: true,
      }
      return new Promise((resolve) => setTimeout(() => resolve(result), 400))
    },
  }
}

const services = new Map<RoutineApplyFixtureScenario, RoutineApplyService>()

/** 실제 Routine Apply API 대신 Fixture를 쓰는 Service. 같은 scenario에는 같은 객체를 돌려준다. */
export function createRoutineApplyFixtureService(scenario: RoutineApplyFixtureScenario): RoutineApplyService {
  let service = services.get(scenario)
  if (!service) {
    service = buildService(scenario)
    services.set(scenario, service)
  }
  return service
}

const conflictHintLoaders = new Map<RoutineApplyFixtureScenario, (contentId: string) => Promise<RoutineApplyPreviewResult>>()

/** Routine Detail Timeline 안내용: 전체 Timeline 기준 충돌 (같은 Preview Service를 쓴다) */
export function createRoutineConflictHintLoader(scenario: RoutineApplyFixtureScenario) {
  let loader = conflictHintLoaders.get(scenario)
  if (!loader) {
    const service = createRoutineApplyFixtureService(scenario)
    loader = (contentId: string) => service.preview(contentId, { selectedHabitIds: [], applyAll: true })
    conflictHintLoaders.set(scenario, loader)
  }
  return loader
}
