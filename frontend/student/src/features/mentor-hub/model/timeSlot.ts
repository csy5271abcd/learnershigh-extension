import type { PlanTimeSlot } from './types.ts'

// "HH:mm" 시간대 계산. (Plan Apply / Routine Apply가 함께 쓴다)

export const toMinutes = (time: string) => {
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}

export const toTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

export const overlaps = (a: PlanTimeSlot, b: PlanTimeSlot) =>
  toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end)

export const durationMinutes = (slot: PlanTimeSlot) => toMinutes(slot.end) - toMinutes(slot.start)

export const slotText = (slot: PlanTimeSlot) => `${slot.start}–${slot.end}`
