// 최근 7일 사진 관찰 일일 보고를 날짜마다 불러온다. 인증 실패·권한 없음·연결 실패를 빈 자료와 구분한다.
import { useCallback, useEffect, useState } from 'react'
import type { FacilityReportView } from './visionContract.ts'
import { facilityIdOf, readFacilityReport } from './visionClient.ts'

export type VisionWeekStatus = 'idle' | 'loading' | 'ready' | 'unauthenticated' | 'forbidden' | 'error'
export interface VisionWeek {
  status: VisionWeekStatus
  /** 날짜 → 보고(그날 보고가 없으면 null) */
  reports: Map<string, FacilityReportView | null>
  dates: string[]
  reload: () => void
}

export function useVisionWeek(branchId: string | null, dates: string[]): VisionWeek {
  const [version, setVersion] = useState(0)
  const key = dates.join(',')
  const request = `${branchId}|${key}|${version}`
  // 불러온 요청 키를 함께 저장하고, 지금 요청과 다르면 불러오는 중으로 본다(효과 안에서 상태를 바로 바꾸지 않음)
  const [state, setState] = useState<{ request: string; status: VisionWeekStatus; reports: Map<string, FacilityReportView | null> }>({ request: '', status: 'idle', reports: new Map() })
  useEffect(() => {
    if (!branchId || !key) return
    const ctrl = new AbortController()
    const facility = facilityIdOf(branchId)
    Promise.all(key.split(',').map(async (date) => [date, await readFacilityReport(facility, date, ctrl.signal)] as const)).then((results) => {
      const reports = new Map<string, FacilityReportView | null>()
      let status: VisionWeekStatus = 'ready'
      for (const [date, r] of results) {
        if (r.status === 'available') reports.set(date, r.report)
        else if (r.status === 'not_found') reports.set(date, null)
        else if (r.status === 'forbidden') status = r.reason === 'unauthenticated' ? 'unauthenticated' : status === 'unauthenticated' ? status : 'forbidden'
        else if (status === 'ready') status = 'error'
      }
      setState({ request, status, reports })
    }).catch((e) => { if ((e as Error).name !== 'AbortError') setState({ request, status: 'error', reports: new Map() }) })
    return () => ctrl.abort()
  }, [branchId, key, request])
  const reload = useCallback(() => setVersion((v) => v + 1), [])
  const status: VisionWeekStatus = !branchId || !key ? 'idle' : state.request === request ? state.status : 'loading'
  return { status, reports: state.reports, dates, reload }
}
