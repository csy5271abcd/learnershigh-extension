// A28-22 관리자 확정 신호: 평가 정보·운영계획 확정 API 가 성공(서버 commit 후 응답)한 직후, 같은 브라우저의 관리자 화면(같은 탭·다른 탭)에
// '이 문서(슬롯)가 확정됐다'는 갱신 신호만 보낸다. 학생 정보·확정값은 싣지 않는다(문서 ID·학교·학년도·학년·학기만).
// 받는 화면(전체 현황·월별 운영계획)은 같은 학교·학년도·학년·학기이거나 슬롯을 모르는 신호면 바로 다시 조회한다(복귀 갱신 10초 제한과 무관).
// BroadcastChannel 은 같은 origin(관리자 5174)의 탭끼리만 닿는다. 학생 화면(5173)·다른 브라우저는 다시 들어오거나 창에 돌아올 때 갱신된다.

export interface PlanConfirmedSignal {
  planId: string
  slot: { schoolId: string; academicYear: number; grade: number; semester: number } | null
  at: number
}

const CHANNEL = 'lh-assessment-plan-confirmed'
const LOCAL_EVENT = 'lh-assessment-plan-confirmed'

function channel(): BroadcastChannel | null {
  try {
    return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL)
  } catch {
    return null
  }
}

export function announcePlanConfirmed(planId: string, slot: PlanConfirmedSignal['slot']) {
  const signal: PlanConfirmedSignal = { planId, slot, at: Date.now() }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent<PlanConfirmedSignal>(LOCAL_EVENT, { detail: signal }))
  const sender = channel()
  if (sender) {
    sender.postMessage(signal)
    sender.close()
  }
}

/** 신호를 받는다(같은 탭 + 다른 탭). 반환값으로 구독을 끊는다 */
export function onPlanConfirmed(listener: (signal: PlanConfirmedSignal) => void): () => void {
  const local = (event: Event) => listener((event as CustomEvent<PlanConfirmedSignal>).detail)
  window.addEventListener(LOCAL_EVENT, local)
  const receiver = channel()
  if (receiver) receiver.onmessage = (event: MessageEvent<PlanConfirmedSignal>) => listener(event.data)
  return () => {
    window.removeEventListener(LOCAL_EVENT, local)
    receiver?.close()
  }
}

/** 이 화면 조건과 관계있는 신호인가(슬롯을 모르면 관계있다고 본다 — 다시 조회는 같은 원천이라 안전) */
export function signalMatches(signal: PlanConfirmedSignal, schoolId: string, academicYear: number | null, grade: number, semester: number): boolean {
  if (!signal.slot) return true
  return signal.slot.schoolId === schoolId && signal.slot.academicYear === academicYear && signal.slot.grade === grade && signal.slot.semester === semester
}
