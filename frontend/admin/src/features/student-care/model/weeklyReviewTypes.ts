import type { CareSnapshot, DailyCareRecord } from './careSnapshot.ts'
export interface WeekDay extends DailyCareRecord { scheduled: boolean | null }
export interface WeekdayBaseline { date: string; minutes: number | null; start: number | null; samples: number; startSamples?: number }
export interface WeeklyReview extends CareSnapshot {
  days: WeekDay[]
  baselineDays: WeekDay[]
  baselineFrom: string
  baselineTo: string
  weekdayBaseline: WeekdayBaseline[]
}
