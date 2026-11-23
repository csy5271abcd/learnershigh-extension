import { useEffect, useState } from 'react'
import { ensureOfficialPlans } from '../api/evaluationPlansApi.ts'
import { isAdminReadOnlyHttpView } from '../api/http/assessmentHttpClient.ts'
import type { StudentOfficialEnsure } from '../api/types.ts'

// A27-UX 부록 K: 학생 화면 진입 시 학교알리미 공식 원본 자동 확보(§10-1-3 POST .../official/ensure, 버튼 없음).
// - 서버가 학생 학적의 학교 하나만 확인한다(학교당 작업 1개, 24시간 기록 재사용). 화면은 학교·학년도를 보내지 않는다.
// - 진행 중(RUNNING)이면 같은 POST를 다시 불러 끝나면 멈춘다(처음 30초는 2초, 그 뒤 5초 간격, 최대 5분 — 그 뒤에는 다음 진입 때 이어 확인).
//   학교알리미 작업 줄은 서버에 하나라(순차·요청 간격 보호) 다른 학교 작업이 끝날 때까지 기다릴 수 있다.
// - 부록 L: '학교 확인 필요'(같은 이름 학교, 관리자 선택 대기)이면 15초 간격으로 계속 확인한다(서버 기록만 읽음 — 외부 요청 없음).
//   관리자가 학교를 고르면 다시 들어오지 않아도 목록이 갱신된다. 목록은 상태가 바뀔 때만 다시 읽는다.
// - 같은 화면의 여러 카드가 동시에 불러도 요청은 하나만 보낸다(진행 중 Promise 공유).
// - 관리자 '학생 화면 보기'(읽기 전용)에서는 쓰기 요청을 보내지 않는다.
const INTERVAL_MS = 2000
const SLOW_INTERVAL_MS = 5000
const WAIT_SCHOOL_INTERVAL_MS = 15_000
const LIMIT_MS = 300_000

let inflight: Promise<StudentOfficialEnsure | null> | null = null
let latest: StudentOfficialEnsure | null = null
const listeners = new Set<(value: StudentOfficialEnsure | null) => void>()
let loopStarted = 0

function callOnce(): Promise<StudentOfficialEnsure | null> {
  if (!inflight) {
    inflight = ensureOfficialPlans().finally(() => {
      inflight = null
    })
  }
  return inflight
}

function publish(value: StudentOfficialEnsure | null) {
  latest = value
  listeners.forEach((listener) => listener(value))
}

async function loop() {
  const started = Date.now()
  loopStarted = started
  for (;;) {
    let value: StudentOfficialEnsure | null
    try {
      value = await callOnce()
    } catch {
      value = { state: 'FAILED', schoolSelectionRequired: false, years: [], message: '공식 원본 상태를 확인하지 못했어요.' }
    }
    if (loopStarted !== started) return
    publish(value)
    const waiting = value?.state === 'RUNNING' || value?.state === 'SCHOOL_CONFIRMATION_REQUIRED'
    if (!value || !waiting || Date.now() - started > LIMIT_MS) return
    const interval = value.state === 'SCHOOL_CONFIRMATION_REQUIRED' ? WAIT_SCHOOL_INTERVAL_MS : Date.now() - started > 30_000 ? SLOW_INTERVAL_MS : INTERVAL_MS
    await new Promise((resolve) => window.setTimeout(resolve, interval))
  }
}

/** 부록 O: 학생이 열람 학교를 고르거나 철회한 뒤 자동 확인을 처음부터 다시 돈다(같은 화면의 모든 원본 목록이 갱신된다). */
export function restartOfficialEnsure() {
  if (isAdminReadOnlyHttpView()) return
  void loop()
}

export interface OfficialEnsureView {
  /** null = 아직 확인 전(또는 Mock 데이터 모드) */
  ensure: StudentOfficialEnsure | null
  /** 확인이 끝날 때마다 늘어난다 — 원본 목록 조회 키에 넣어 끝난 뒤 자동으로 다시 읽는다 */
  version: number
}

export function useOfficialEnsure(): OfficialEnsureView {
  const [view, setView] = useState<OfficialEnsureView>({ ensure: latest, version: 0 })
  useEffect(() => {
    const listener = (value: StudentOfficialEnsure | null) =>
      setView((previous) => ({
        ensure: value,
        // 상태가 바뀌어 끝났을 때만 목록을 다시 읽는다(같은 '학교 확인 필요'가 반복되면 다시 읽지 않음)
        version: value && value.state !== 'RUNNING' && value.state !== previous.ensure?.state ? previous.version + 1 : previous.version,
      }))
    listeners.add(listener)
    if (!isAdminReadOnlyHttpView() && (latest === null || latest.state === 'RUNNING' || latest.state === 'SCHOOL_CONFIRMATION_REQUIRED') && !inflight) {
      void loop()
    }
    return () => {
      listeners.delete(listener)
    }
  }, [])
  return view
}
