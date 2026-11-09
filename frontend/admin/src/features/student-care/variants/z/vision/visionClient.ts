// 사진 관찰 서비스 호출. 같은 출처 경로(/vision-api)로 부르고 별도 로그인은 없다.
// 두 서버가 나뉜 동안은 개발 프록시가 인증하고(visionDevAuth.ts), 합쳐지면 같은 세션을 쓰므로 VISION_BASE만 '/api'로 바꾼다.
// 학습관·학생 ID는 통합 후 같은 ID를 쓴다고 보고 기본은 그대로 넘긴다. 다르면 VITE_VISION_ID_MAP으로 대응표를 준다(한 곳에서만 바꾼다).
import type { FacilityReportView, ReportReadResult } from './visionContract.ts'

export const VISION_BASE = '/vision-api'

interface IdMap { facilities?: Record<string, string>; students?: Record<string, string> }
const idMap: IdMap = (() => { try { return JSON.parse(import.meta.env.VITE_VISION_ID_MAP ?? '{}') as IdMap } catch { return {} } })()
export const facilityIdOf = (branchId: string) => idMap.facilities?.[branchId] ?? branchId
export const visionStudentIdOf = (studentId: string) => idMap.students?.[studentId] ?? studentId

const STATUS: Record<number, ReportReadResult['status']> = { 200: 'available', 400: 'invalid_request', 401: 'forbidden', 403: 'forbidden', 404: 'not_found' }

/** 학습관 일일 보고(최신 판). 연결 실패·형식 오류는 빈 결과가 아니라 retryable_error로 돌려준다 */
export async function readFacilityReport(facilityId: string, serviceDate: string, signal?: AbortSignal): Promise<ReportReadResult> {
  let res: Response
  try {
    res = await fetch(`${VISION_BASE}/reports/${encodeURIComponent(facilityId)}/${serviceDate}`, { credentials: 'same-origin', cache: 'no-store', signal })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    return { status: 'retryable_error', reason: 'network_error' }
  }
  const status = STATUS[res.status] ?? 'retryable_error'
  if (status === 'forbidden') return { status, reason: res.status === 401 ? 'unauthenticated' : 'forbidden' }
  if (status !== 'available') return status === 'retryable_error' ? { status, reason: `http_${res.status}` } : { status } as ReportReadResult
  try {
    const body = await res.json() as { status?: string; report?: FacilityReportView }
    if (body.status !== 'available' || !body.report || !Array.isArray(body.report.reports) || !Array.isArray(body.report.students)) return { status: 'retryable_error', reason: 'invalid_response' }
    return { status: 'available', report: body.report }
  } catch {
    return { status: 'retryable_error', reason: 'invalid_response' }
  }
}
