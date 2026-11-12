// 신규 '생활 레포트' 탭: 고른 날짜까지 최근 7일을 그 앞 7일과 비교한다.
// 데일리·주간·월간 레포트와 겹치는 공부 시간·순공·계획 달성률·과목은 빼고, 출결·입실·계획 제출·이미지 인식 관찰·케어 기록만 담는다.
// 2026-11-12 사용자: 시안 1로 확정, 나머지 시안과 고르기 버튼 제거. 수치는 lifeData 한 곳에서 계산한다.
import { useMemo } from 'react'
import { careApi, type CareRow } from '../../shared/useCareData.ts'
import { useRemote } from '../../../model/useRemote.ts'
import type { SupEvent } from '../../supervisor/supervisorClient.ts'
import { careRecords, lifeData, md, LATE_DEFAULT } from './lifeData.ts'
import { LifeV1 } from './LifeV1.tsx'

export function LifeTab({ s, ev, date }: { s: CareRow; ev: SupEvent[]; date: string }) {
  // 늦은 입실 기준은 학생 케어 관리 기준과 같게(학습관 설정 '등원 시간 늦어짐' 분)
  const settings = useRemote(`life/${s.student.branchId}/settings`, () => careApi.settings(s.student.branchId))
  const lateMin = settings.data?.startShiftMinutes ?? LATE_DEFAULT
  const L = useMemo(() => lifeData(s, ev, date, lateMin), [s, ev, date, lateMin])
  const hist = useRemote(`life/${s.student.studentId}/history`, () => careApi.history(s.student.branchId, s.student.studentId))
  const care = hist.status === 'error' && !hist.data ? 'error' as const : careRecords(hist.data, date)
  return <div className="lv">
    <div className="lv-bar"><span>{md(L.now.from)} – {md(L.now.to)} (최근 7일) · 그 앞 7일과 비교</span></div>
    <LifeV1 L={L} care={care} />
  </div>
}
