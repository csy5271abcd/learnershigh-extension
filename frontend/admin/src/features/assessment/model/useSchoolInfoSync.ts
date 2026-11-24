import { useEffect, useRef, useState } from 'react'
import { ensureSchoolInfoSync, getSchoolInfoSync } from '../api/assessmentAdminApi.ts'
import { ApiError } from '../api/canonicalSource.ts'
import type { SchoolInfoSyncResult } from '../api/types.ts'
import { recentAcademicYears, SYNC_GRADES, SYNC_SEMESTERS } from './schoolInfoSync.ts'

// §38-12 학교알리미 최근 3개 학년도 자동 확인 (A27-UX 부록 E).
// 학교가 정해지면 버튼 없이 POST(같은 학교 작업은 서버가 재사용) → 끝날 때까지 GET 만 반복한다.
// 학년도 필터는 보기만 바꾼다(다시 보내지 않음). 화면을 떠나거나 학교가 바뀌면 폴링을 멈추고 이전 학교 결과를 보이지 않는다.

const POLL_MILLIS = 1500

export interface SchoolInfoSyncState {
  result: SchoolInfoSyncResult | null
  error: string | null
  pending: boolean
  /** force = 관리자가 '다시 확인'을 직접 눌렀을 때(TTL 무시, 부록 F) */
  retry: (force?: boolean) => void
}

export function useSchoolInfoSync(schoolId: string | null | undefined, enabled: boolean): SchoolInfoSyncState {
  const [state, setState] = useState<{ key: string | null; result: SchoolInfoSyncResult | null; error: string | null; pending: boolean }>({
    key: null,
    result: null,
    error: null,
    pending: false,
  })
  const [nonce, setNonce] = useState(0)
  const forceNext = useRef(false)

  useEffect(() => {
    if (!enabled || !schoolId) return
    const key = `${schoolId}:${nonce}`
    let alive = true
    let timer: number | undefined
    const force = forceNext.current
    forceNext.current = false
    const send = async (years: number[], retried: boolean): Promise<SchoolInfoSyncResult> => {
      try {
        return await ensureSchoolInfoSync({ schoolId, requestedAcademicYears: years, grades: SYNC_GRADES, semesters: SYNC_SEMESTERS, ...(force ? { force: true } : {}) })
      } catch (cause) {
        // 브라우저 시계와 서버 기준 학년도가 다르면 서버 기대값으로 한 번만 다시 보낸다
        const expected = cause instanceof ApiError ? cause.details?.expectedAcademicYears : undefined
        if (!retried && cause instanceof ApiError && cause.code === 'SCHOOLINFO_SYNC_YEARS_MISMATCH' && Array.isArray(expected)) {
          return send(expected as number[], true)
        }
        throw cause
      }
    }
    const show = (result: SchoolInfoSyncResult) => setState({ key, result, error: null, pending: false })
    const fail = (cause: unknown) =>
      setState((previous) => ({ key, result: previous.key === key ? previous.result : null, error: cause instanceof Error ? cause.message : '자동 확인 상태를 읽지 못했어요.', pending: false }))
    const poll = (jobId: string) => {
      timer = window.setTimeout(() => {
        getSchoolInfoSync(jobId).then(
          (result) => {
            if (!alive) return
            show(result)
            if (result.state === 'RUNNING') poll(jobId)
          },
          (cause: unknown) => alive && fail(cause),
        )
      }, POLL_MILLIS)
    }
    // 학교가 바뀌면 key 가 달라져 아래 current 가 이전 학교 결과를 보이지 않는다
    send(recentAcademicYears(), false).then(
      (result) => {
        if (!alive) return
        show(result)
        if (result.state === 'RUNNING') poll(result.jobId)
      },
      (cause: unknown) => alive && fail(cause),
    )
    return () => {
      alive = false
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [schoolId, enabled, nonce])

  const current = state.key === `${schoolId}:${nonce}` ? state : { result: null, error: null, pending: Boolean(enabled && schoolId) }
  return { result: current.result, error: current.error, pending: current.pending, retry: (force?: boolean) => {
      forceNext.current = Boolean(force)
      setNonce((value) => value + 1)
    } }
}
