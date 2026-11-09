// 사진 관찰 서비스(runners_hi_vision_ai, develop 8d4c540)의 일일 보고 조회 응답 중 학생 케어가 읽는 부분.
// 원본: packages/contracts/src/service/study-read-models.ts · report-content.ts,
//       backend/.../reports/ReportReadController.java · SessionReportReadService.project().
// 두 서비스가 하나로 합쳐지면 이 파일 대신 @runners-high/contracts를 직접 가져온다. 필드 이름과 의미를 바꾸지 않는다.

export const STUDY_FACTORS = ['person_visible', 'phone_interaction', 'head_down', 'reading_or_writing', 'desk_resting'] as const
export type StudyFactor = (typeof STUDY_FACTORS)[number]
export type ManagementReason = 'absence_observed' | 'phone_interaction_observed' | 'desk_resting_observed'
export const MANAGEMENT_REASONS: ManagementReason[] = ['absence_observed', 'phone_interaction_observed', 'desk_resting_observed']

/** 사진 관찰 비율. 시간이나 집중도가 아니다(분모 = 판독된 사진 수) */
export interface ObservationRatio { numerator: number; denominator: number; value: number | null }

export interface AttentionEpisode { episodeId: string; studentId: string; reason: ManagementReason; status: 'candidate' | 'active' | 'resolved' | 'limited'; captureIds: string[] }
export type FindingKind = 'repeated_across_periods' | 'single_prolonged' | 'limited_observation' | 'stable_study_observation'

export interface StudentReportDocument {
  reportId: string
  revision: number
  facts: {
    studentId: string
    sessionState: 'observed' | 'not_started' | 'unresolved' | 'end_unknown'
    quality: 'sufficient' | 'limited' | 'no_data'
    /** person_visible = 재석 비율(재석 ÷ 재석 판독), 나머지 = 재석 사진 중 해당 관찰 비율 */
    metrics: Record<StudyFactor, ObservationRatio>
    episodes: AttentionEpisode[]
  }
  findings: { findingId: string; episodeIds: string[]; kind: FindingKind; text: string }[]
  summary: string
  content: { supportingFacts: { absenceRatio: ObservationRatio } }
}

export interface FacilityReportView {
  facilityId: string
  serviceDate: string
  publicationState: 'published' | 'limited' | 'roster_unavailable'
  publishedAt: string
  dataCutoff: string
  counts: { rosterStudents: number; managementStudents: number; limitedStudents: number; processingFailedStudents: number; byReason: Record<ManagementReason, number> }
  students: ({ status: 'available'; studentId: string; reportId: string; revision: number } | { status: 'failed'; studentId: string; reason: 'processing_failed' })[]
  reports: StudentReportDocument[]
}

/** GET /api/reports/{facilityId}/{serviceDate} 의 상태(HTTP 200·400·401·403·404·503) */
export type ReportReadResult =
  | { status: 'available'; report: FacilityReportView }
  | { status: 'not_found' }
  | { status: 'forbidden'; reason: 'unauthenticated' | 'forbidden' }
  | { status: 'invalid_request' }
  | { status: 'retryable_error'; reason?: string }

/** 관리 사유: 비전 서버 SessionReportReadService와 같은 규칙(반복·긴 구간 발견에 묶인 에피소드의 사유) */
export function managementReasons(doc: StudentReportDocument): ManagementReason[] {
  const out = new Set<ManagementReason>()
  for (const f of doc.findings) {
    if (f.kind !== 'repeated_across_periods' && f.kind !== 'single_prolonged') continue
    for (const id of f.episodeIds) { const e = doc.facts.episodes.find((x) => x.episodeId === id); if (e && MANAGEMENT_REASONS.includes(e.reason)) out.add(e.reason) }
  }
  return MANAGEMENT_REASONS.filter((r) => out.has(r))
}
