// 충돌 확인용 가상 "내 기존 일정" (Plan Apply / Routine Apply가 함께 쓴다)
// 기존 LearnersHigh Plan / Schedule Schema가 아니다. (실제 API / DB 구조 미확인)
// Plan-02 Mockup(월·수·목 학원) + Routine-02 Mockup(화 "영어 단어 (내 계획)")

import type { MentorPlanDay, PlanTimeSlot } from '../model/types.ts'

export interface ExistingScheduleFixture {
  day: MentorPlanDay
  title: string
  /** 학원 등 외부 일정 / 학생이 직접 넣은 내 계획 */
  kind: 'external' | 'myPlan'
  slot: PlanTimeSlot
}

export const fixtureExistingWeeklySchedules: ExistingScheduleFixture[] = [
  { day: '월', title: '생명과학 학원', kind: 'external', slot: { start: '19:00', end: '21:00' } },
  { day: '화', title: '영어 단어', kind: 'myPlan', slot: { start: '19:00', end: '19:40' } },
  { day: '수', title: '수학 학원', kind: 'external', slot: { start: '18:00', end: '20:00' } },
  { day: '목', title: '생명과학 학원', kind: 'external', slot: { start: '19:00', end: '21:00' } },
]

/** 화면 표시용 이름: 내 계획은 "(내 계획)"을 붙인다. (Routine-02 Mockup) */
export const scheduleLabel = (schedule: ExistingScheduleFixture) =>
  schedule.kind === 'myPlan' ? `${schedule.title} (내 계획)` : schedule.title
