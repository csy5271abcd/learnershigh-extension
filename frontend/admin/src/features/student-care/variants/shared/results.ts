// 학습관 결과 표·비교 표의 칸 값(지표별). 결과 표는 고른 날짜에서만 열리는 정확값 보기다.
import { hours, clock } from './model.ts'
import type { MetricKey } from './branch.ts'
import type { CareRow } from './useCareData.ts'
import type { VisionAxis } from './visionExample.ts'

export const RESULT_HEAD: Record<MetricKey, [string, string, string]> = {
  absence: ['그날', '7일', '계획'], study: ['실제', '평소', '평소 대비'], start: ['입실 시각', '평소', '평소 대비'], plan: ['그날', '7일', ''], vision: ['관찰', '판단 불가', '비율(사진 기준)'],
}

export function compareValue(metric: MetricKey, axis: VisionAxis) {
  return (r: CareRow, i: number) => {
    const d = r.days[i]
    if (metric === 'absence') return d.attendance === 'absent' ? '결석' : d.attendance === 'present' ? '입실' : d.attendance === 'off' ? '예정 없음' : '기록 없음'
    if (metric === 'plan') return d.submission === 'missing' ? '미제출' : d.submission === 'submitted' ? '제출' : '—'
    if (metric === 'study') return d.minutes === null ? '—' : hours(d.minutes)
    if (metric === 'start') return d.start === null ? '—' : clock(d.start)
    const v = r.vision[i]
    return v.photosReceived === 0 ? '사진 없음' : v.unsupportedAxes.includes(axis) ? '지원 안 함' : `${v.axes[axis].yes}/${v.analyzedPhotos}장`
  }
}
