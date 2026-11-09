// Z′ 명부·상세가 함께 쓰는 '서버 사유 이름 + 그 값' 문구.
import type { CareRow } from '../shared/useCareData.ts'
import { absentDays, missingDays, startLate } from '../z/zModel.ts'
import { hm } from '../notation/kit.tsx'

/** 서버 사유(signals)마다 '사유 이름 + 그 사유를 만든 값'. 사유 이름은 서버 문구 그대로(다른 화면과 같은 말), 값은 단위를 붙인다 */
export function reasons(r: CareRow, th?: { shift: number; rate: number }): { label: string; value: string }[] {
  return r.signals.map((x) => {
    let value = ''
    // 관리 중인 학생은 사유가 생긴 뒤 값이 기준 아래로 내려왔을 수 있다: 0·기준 아래면 '지금은 기준 아래'
    const below = '지금은 기준 아래'
    if (x.type === 'CONSECUTIVE_ABSENCE') { const n = absentDays(r); value = n ? `${n}일${r.absencePattern === '연속' ? ' 연속' : ''}` : below }
    else if (x.type === 'PLAN_MISSING') { const n = missingDays(r); value = n ? `${n}일` : below }
    else if (x.type === 'STUDY_DROP' && r.week.minutes !== null && r.week.usualWeek) value = `${hm(r.week.minutes)}, 평소 한 주 ${hm(r.week.usualWeek)}`
    else if (x.type === 'START_TIME_SHIFT') { const l = startLate(r); if (l !== null) value = th && l < th.shift ? below : `평균 ${hm(l)} 늦게` }
    else if (x.type === 'EXECUTION_GAP' && r.week.executionRate !== null) value = th && r.week.executionRate >= th.rate ? below : `계획의 ${Math.floor(r.week.executionRate)}%`
    return { label: x.label, value }
  })
}

