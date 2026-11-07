// 비전 관찰 예시 데이터. 형태는 docs/design/ops-redesign/vision-contract-draft.md를 따른다.
// 서비스 백엔드가 없어 학생 ID·날짜로 결정적(같은 입력 → 같은 값)으로 만든다. 화면은 반드시 "예시"를 표시한다.
// 사진 표본의 셈일 뿐이며 시간·집중도·성과가 아니다. 판정·사유·정렬에 쓰지 않는다.

export const VISION_AXES = ['person_visible', 'head_down', 'phone_interaction', 'reading_or_writing'] as const
export type VisionAxis = (typeof VISION_AXES)[number]

export const visionAxisLabel: Record<VisionAxis, string> = {
  person_visible: '자리에 있음',
  head_down: '고개 숙임',
  phone_interaction: '휴대폰 사용',
  reading_or_writing: '읽기·쓰기',
}

export interface VisionCount { yes: number; no: number; unknown: number }

export interface VisionDay {
  studentId: string
  date: string
  source: 'example'
  photosReceived: number
  analyzedPhotos: number
  failedPhotos: number
  failures: Record<string, number>
  /** 그날 모델이 지원하지 않은 관찰. 해당 축은 전부 unknown이다 */
  unsupportedAxes: VisionAxis[]
  axes: Record<VisionAxis, VisionCount>
  coverage: { firstCaptureAt: string | null; lastCaptureAt: string | null; expectedPhotos: null; expectedPhotosReason: 'capture_interval_unknown' }
  ratioMeaning: 'photo_sample_ratio'
}

/** 문자열 → 32비트 해시(FNV-1a) */
const hash = (text: string) => { let h = 0x811c9dc5; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) } return h >>> 0 }
/** 해시 → 0 이상 1 미만 */
const unit = (text: string) => hash(text) / 2 ** 32

/** 학생마다 고정된 관찰 성향(예시). 날짜마다 조금씩 흔들린다 */
const profile = (studentId: string): Record<VisionAxis, number> => ({
  person_visible: 0.84 + unit(`${studentId}:pv`) * 0.14,
  head_down: 0.05 + unit(`${studentId}:hd`) * 0.25,
  phone_interaction: 0.02 + unit(`${studentId}:ph`) ** 2 * 0.3,
  reading_or_writing: 0.3 + unit(`${studentId}:rw`) * 0.4,
})

const clock = (date: string, minuteOfDay: number) => {
  const m = Math.max(0, Math.min(24 * 60 - 1, Math.round(minuteOfDay)))
  return `${date}T${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00+09:00`
}

/**
 * 하루 예시 관찰. 입실해서 학습 기록(분)이 있는 날만 사진이 있다.
 * 장수는 학습 분 ÷ 10을 쓰지만, 실제 촬영 간격은 정해지지 않았으므로 기대 장수는 계산하지 않는다(expectedPhotos = null).
 */
export function visionDay(studentId: string, date: string, minutes: number | null, start: number | null): VisionDay {
  const empty: VisionCount = { yes: 0, no: 0, unknown: 0 }
  const base: VisionDay = {
    studentId, date, source: 'example', photosReceived: 0, analyzedPhotos: 0, failedPhotos: 0, failures: {}, unsupportedAxes: [],
    axes: { person_visible: { ...empty }, head_down: { ...empty }, phone_interaction: { ...empty }, reading_or_writing: { ...empty } },
    coverage: { firstCaptureAt: null, lastCaptureAt: null, expectedPhotos: null, expectedPhotosReason: 'capture_interval_unknown' },
    ratioMeaning: 'photo_sample_ratio',
  }
  if (!minutes || minutes <= 0) return base
  const received = Math.max(1, Math.round(minutes / 10))
  const failed = Math.floor(received * unit(`${studentId}:${date}:fail`) * 0.1)
  const timeout = Math.ceil(failed / 2), inputError = failed - timeout
  const analyzed = received - failed
  const p = profile(studentId)
  // 예시: 일부 날은 읽기·쓰기를 지원하지 않는 모델이 쓰였다고 가정한다
  const unsupported: VisionAxis[] = unit(`${studentId}:${date}:model`) < 0.1 ? ['reading_or_writing'] : []
  for (const axis of VISION_AXES) {
    if (unsupported.includes(axis)) { base.axes[axis] = { yes: 0, no: 0, unknown: analyzed }; continue }
    const unknownRate = 0.03 + unit(`${studentId}:${date}:${axis}:u`) * 0.12
    const rate = Math.min(0.99, Math.max(0, p[axis] * (0.75 + unit(`${studentId}:${date}:${axis}:d`) * 0.5)))
    const unknown = Math.round(analyzed * unknownRate)
    const yes = Math.round((analyzed - unknown) * rate)
    base.axes[axis] = { yes, no: analyzed - unknown - yes, unknown }
  }
  const first = start ?? 18 * 60
  return {
    ...base,
    photosReceived: received, analyzedPhotos: analyzed, failedPhotos: failed, unsupportedAxes: unsupported,
    failures: failed ? { ...(timeout ? { timeout } : {}), ...(inputError ? { input_error: inputError } : {}) } : {},
    coverage: { ...base.coverage, firstCaptureAt: clock(date, first + 2), lastCaptureAt: clock(date, first + minutes - 3) },
  }
}

/**
 * 5판 예시 집계 규칙(실제 API 채택이 아님, plan-v5.md 3장).
 * 축마다 분모 = 그 축을 지원한 모델로 분석한 사진 수. 지원하지 않은 모델의 사진은 그 축의 yes/no/unknown과 분모에서 빼고
 * `unsupportedPhotos`로 따로 센다(합계에서 미지원 사실을 잃지 않는다). 하루 원자료는 초안대로 미지원 축이 전부 unknown이다.
 */
export interface AxisTotal extends VisionCount { analyzed: number; unsupportedPhotos: number }

export const axisOfDay = (d: VisionDay, axis: VisionAxis): AxisTotal => d.unsupportedAxes.includes(axis)
  ? { yes: 0, no: 0, unknown: 0, analyzed: 0, unsupportedPhotos: d.analyzedPhotos }
  : { ...d.axes[axis], analyzed: d.analyzedPhotos, unsupportedPhotos: 0 }

/** 여러 날 합계(학생 7일 등). 축마다 독립적으로 더한다(축끼리 합치지 않는다) */
export function sumVision(days: VisionDay[]) {
  const axes = Object.fromEntries(VISION_AXES.map((a) => [a, { yes: 0, no: 0, unknown: 0, analyzed: 0, unsupportedPhotos: 0 }])) as Record<VisionAxis, AxisTotal>
  let received = 0, analyzed = 0, failed = 0
  for (const d of days) {
    received += d.photosReceived; analyzed += d.analyzedPhotos; failed += d.failedPhotos
    for (const a of VISION_AXES) { const x = axisOfDay(d, a), s = axes[a]; s.yes += x.yes; s.no += x.no; s.unknown += x.unknown; s.analyzed += x.analyzed; s.unsupportedPhotos += x.unsupportedPhotos }
  }
  return { received, analyzed, failed, axes }
}

/** 판정에 쓰지 않는 참고 비율(사진 표본). 분석 장수가 0이면 null */
export const visionShare = (count: { yes: number; analyzed: number }) => (count.analyzed ? count.yes / count.analyzed : null)

export interface BranchVisionInput { studentId: string; day: VisionDay }

/**
 * 학습관 하루 집계. 사진 기준 비율(관찰 장수 합 ÷ 분석 장수 합)과 학생 분포(분석 1장 이상 학생의 학생별 비율)를 따로 낸다.
 * 축 분모 규칙은 axisOfDay와 같다(미지원 사진은 분모에서 빼고 unsupportedPhotos·unsupportedStudents로 센다). 분석 장수 합이 0이면 비율은 null.
 */
export function branchVisionDay(inputs: BranchVisionInput[], excluded: ReadonlySet<string> = new Set()) {
  const rows = inputs.filter((x) => !excluded.has(x.studentId))
  return Object.fromEntries(VISION_AXES.map((axis) => {
    let yes = 0, analyzed = 0, unsupportedPhotos = 0, unsupportedStudents = 0
    const shares: { studentId: string; share: number; yes: number; analyzed: number }[] = []
    for (const { studentId, day } of rows) {
      const x = axisOfDay(day, axis)
      if (x.unsupportedPhotos) { unsupportedPhotos += x.unsupportedPhotos; unsupportedStudents++ }
      if (!x.analyzed) continue
      yes += x.yes; analyzed += x.analyzed
      shares.push({ studentId, share: x.yes / x.analyzed, yes: x.yes, analyzed: x.analyzed })
    }
    const sorted = shares.map((s) => s.share).sort((a, b) => a - b)
    const q = (p: number) => { if (!sorted.length) return null; const i = (sorted.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo) }
    return [axis, { photoShare: analyzed ? yes / analyzed : null, yes, analyzed, unsupportedPhotos, unsupportedStudents, students: shares.length, median: q(0.5), q1: q(0.25), q3: q(0.75), shares }]
  })) as Record<VisionAxis, { photoShare: number | null; yes: number; analyzed: number; unsupportedPhotos: number; unsupportedStudents: number; students: number; median: number | null; q1: number | null; q3: number | null; shares: { studentId: string; share: number; yes: number; analyzed: number }[] }>
}
