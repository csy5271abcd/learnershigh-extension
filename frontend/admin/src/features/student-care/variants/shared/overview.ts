// 한눈에 보기 줄(OverviewStrip) 값. 칸 진하기는 그날 관리 쪽 학생 비율(0~1), 안내 글자는 정확값.
import type { BranchModel, MetricKey } from './branch.ts'
import { METRIC_LABEL } from './branch.ts'
import type { StripRow } from './charts.tsx'

const round = (v: number) => Math.round(v * 10) / 10
const sg = (v: number, u: string) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Math.round(v))}${u}`

export function overviewRows(m: BranchModel, drop: number, shift: number, pick?: (k: MetricKey) => void, selected?: MetricKey | null): StripRow[] {
  const n = m.included.length || 1
  const per = (f: (i: number) => { v: number | null; text: string }) => m.days.map((_, i) => f(i))
  const lateOn = (i: number) => m.included.filter((r) => { const d = r.days[i]; return d.start !== null && d.usualStart !== null && d.start - d.usualStart >= shift }).length
  const dropOn = (i: number) => m.included.filter((r) => { const d = r.days[i]; return d.minutes !== null && d.usualMinutes ? (d.minutes - d.usualMinutes) / d.usualMinutes * 100 <= -drop : false }).length
  const row = (key: MetricKey, head: string, cells: { v: number | null; text: string }[]): StripRow => ({ key, label: METRIC_LABEL[key], head, cells, onPick: pick && (() => pick(key)), selected: selected === key })
  const absentAvg = m.days.reduce((a, d) => a + d.absent.length, 0) / 7
  const missAvg = m.days.reduce((a, d) => a + (d.submitKnown - d.submitted), 0) / 7
  const phone = m.vision.map((v) => v.phone_interaction)
  return [
    row('absence', `하루 평균 ${round(absentAvg)}명`, per((i) => { const d = m.days[i]; return { v: d.scheduled ? (d.absent.length / d.scheduled) * 5 : null, text: `결석 ${d.absent.length}/${d.scheduled}명` } })),
    row('study', `평소 대비 ${sg(m.days.reduce((a, d) => a + (d.studyChange?.median ?? 0), 0) / 7, '%')}`, per((i) => { const d = m.days[i], k = dropOn(i); return { v: d.studyChange ? (k / n) * 8 : null, text: `가운데 값 ${d.studyChange ? sg(d.studyChange.median, '%') : '—'}, 평소보다 ${drop}% 이상 적은 학생 ${k}명` } })),
    row('start', `평소 대비 ${sg(m.days.reduce((a, d) => a + (d.startShift?.median ?? 0), 0) / 7, '분')}`, per((i) => { const d = m.days[i], k = lateOn(i); return { v: d.startShift ? (k / n) * 8 : null, text: `가운데 값 ${d.startShift ? sg(d.startShift.median, '분') : '—'}, ${shift}분 이상 늦은 학생 ${k}명` } })),
    row('plan', `미제출 하루 평균 ${round(missAvg)}명`, per((i) => { const d = m.days[i], miss = d.submitKnown - d.submitted; return { v: d.submitKnown ? (miss / d.submitKnown) * 3 : null, text: `미제출 ${miss}/${d.submitKnown}명` } })),
    row('vision', `휴대폰 사용 ${(() => { const y = phone.reduce((a, x) => a + x.yes, 0), an = phone.reduce((a, x) => a + x.analyzed, 0); return an ? `${Math.round(y / an * 100)}%` : '—' })()} (예시)`, per((i) => { const x = phone[i]; return { v: x.photoShare === null ? null : x.photoShare * 4, text: x.photoShare === null ? '분석 사진 없음' : `휴대폰 사용 ${Math.round(x.photoShare * 100)}% (사진 ${x.analyzed}장 기준, 예시)` } })),
  ]
}
