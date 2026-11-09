// 사진 관찰 일일 보고 7일치를 학생 케어 화면 단위(학생 한 명, 학습관 전체)로 묶는다.
// 판정은 사진 관찰 서버의 관리 사유를 그대로 쓰고, 여기서는 날짜를 세고 비율을 더하기만 한다.
import { MANAGEMENT_REASONS, STUDY_FACTORS, managementReasons, type FacilityReportView, type ManagementReason, type ObservationRatio, type StudentReportDocument, type StudyFactor } from './visionContract.ts'

export const REASON_LABEL: Record<ManagementReason, string> = { absence_observed: '자리비움 관찰', phone_interaction_observed: '휴대전화 관찰', desk_resting_observed: '엎드림 관찰' }
/** 비전 SPEC-003 "앞단에서 받는 다섯 항목"의 화면 이름. person_visible은 자리비움 비율(absenceRatio)로 보인다 */
export const FACTOR_LABEL: Record<StudyFactor, string> = { person_visible: '자리비움', phone_interaction: '휴대전화', head_down: '머리 숙임', reading_or_writing: '읽기·필기', desk_resting: '엎드림' }

export interface VisionDayView { date: string; doc: StudentReportDocument | null; reasons: ManagementReason[] }
export interface VisionStudent {
  days: VisionDayView[]
  /** 7일 중 관리 사유가 나온 날 수 */
  reasonDays: { reason: ManagementReason; days: number }[]
  /** 7일 합산(분자·분모를 더함). person_visible 자리는 자리비움 비율 */
  totals: Record<StudyFactor, ObservationRatio>
  latest: VisionDayView | null
}

const add = (a: ObservationRatio, b: ObservationRatio): ObservationRatio => { const n = a.numerator + b.numerator, d = a.denominator + b.denominator; return { numerator: n, denominator: d, value: d ? n / d : null } }
const ZERO: ObservationRatio = { numerator: 0, denominator: 0, value: null }

export function studentVision(reports: Map<string, FacilityReportView | null>, dates: string[], visionStudentId: string): VisionStudent {
  const days = dates.map((date) => {
    const doc = reports.get(date)?.reports.find((r) => r.facts.studentId === visionStudentId) ?? null
    return { date, doc, reasons: doc ? managementReasons(doc) : [] }
  })
  const totals = Object.fromEntries(STUDY_FACTORS.map((f) => [f, days.reduce((acc, d) => !d.doc ? acc : add(acc, f === 'person_visible' ? d.doc.content.supportingFacts.absenceRatio : d.doc.facts.metrics[f]), ZERO)])) as Record<StudyFactor, ObservationRatio>
  const reasonDays = MANAGEMENT_REASONS.map((reason) => ({ reason, days: days.filter((d) => d.reasons.includes(reason)).length })).filter((x) => x.days > 0).sort((a, b) => b.days - a.days)
  const latest = [...days].reverse().find((d) => d.doc) ?? null
  return { days, reasonDays, totals, latest }
}

/** 학습관 전체: 가장 최근 보고일의 서버 집계(counts)를 그대로 쓴다 */
export function latestFacility(reports: Map<string, FacilityReportView | null>, dates: string[]) {
  for (let i = dates.length - 1; i >= 0; i--) { const r = reports.get(dates[i]); if (r) return r }
  return null
}

export const pctOf = (r: ObservationRatio) => r.value === null ? '—' : `${Math.round(r.value * 100)}%`
