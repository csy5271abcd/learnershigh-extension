// 개발 서버 전용 시연 Context 선택 (2026-11-12). **실제 로그인·Session이 아니다**(API-OD-A01).
// - 기존 개발용 Mock 인증과 같은 방식이다: 고른 ID를 Backend Mock Header(X-Assessment-Student-Id / X-Assessment-Admin-Id)로 보낸다.
//   서버는 그 ID의 권한 범위(학생 본인 자료 / 관리자 지점 branchIds)를 그대로 검사한다. 권한 검사를 건너뛰는 값은 없다.
// - 선택값이 없으면 Vite 실행 설정(VITE_ASSESSMENT_DEV_STUDENT_ID / VITE_ASSESSMENT_DEV_ADMIN_ID)을 쓴다(기존 동작).
// - Production Build(import.meta.env.DEV=false)에서는 항상 null → Header를 붙이지 않는다(서버 401).
// - 전환하면 페이지를 새로 불러와 이전 학생·관리자 데이터(메모리 캐시)를 남기지 않는다.

export type DevContextKind = 'student' | 'admin'

const keys: Record<DevContextKind, string> = {
  student: 'lh.assessment.devContext.studentId',
  admin: 'lh.assessment.devContext.adminId',
}
const idPattern = /^[a-z0-9_]{3,48}$/

// 시연 링크: `?devStudent=stu_demo_006` / `?devAdmin=adm_demo_b01` (개발 서버 전용). 값을 저장하고 주소에서 지운다.
// 서버 재시작 없이 특정 시연 Context로 바로 들어가기 위한 것이며, 권한 검사는 서버가 그대로 한다.
const queryKeys: Record<DevContextKind, string> = { student: 'devStudent', admin: 'devAdmin' }
// A27-UX: 시연 Context 전환 패널은 사용자 화면에 기본으로 그리지 않는다(개발 문구·계정 ID 노출 금지).
// 개발자가 `?devPanel=1`(이 탭 동안 유지, `?devPanel=0`으로 끔) 또는 VITE_ASSESSMENT_DEV_PANEL=1로 켤 때만 보인다.
const panelKey = 'lh.assessment.devPanel'
if (import.meta.env.DEV && typeof window !== 'undefined') {
  try {
    const url = new URL(window.location.href)
    const value = url.searchParams.get('devPanel')
    if (value !== null) {
      if (value === '1') window.sessionStorage.setItem(panelKey, '1')
      else window.sessionStorage.removeItem(panelKey)
      url.searchParams.delete('devPanel')
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
    }
  } catch {
    // 저장소를 쓸 수 없으면 패널을 켜지 않는다
  }
}
export function devPanelEnabled(): boolean {
  if (!import.meta.env.DEV) return false
  if (import.meta.env.VITE_ASSESSMENT_DEV_PANEL === '1') return true
  try {
    return window.sessionStorage.getItem(panelKey) === '1'
  } catch {
    return false
  }
}
if (import.meta.env.DEV && typeof window !== 'undefined') {
  try {
    const url = new URL(window.location.href)
    let changed = false
    for (const kind of ['student', 'admin'] as const) {
      const value = url.searchParams.get(queryKeys[kind])
      if (value === null) continue
      if (idPattern.test(value)) window.localStorage.setItem(keys[kind], value)
      url.searchParams.delete(queryKeys[kind])
      changed = true
    }
    if (changed) window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
  } catch {
    // 저장소·History를 쓸 수 없으면 무시(실행 설정값 사용)
  }
}

function stored(kind: DevContextKind): string | null {
  if (!import.meta.env.DEV) return null
  try {
    const value = window.localStorage.getItem(keys[kind])
    return value && idPattern.test(value) ? value : null
  } catch {
    return null
  }
}

/** Vite 실행 설정값 (기존 방식) */
export function configuredDevContextId(kind: DevContextKind): string | null {
  if (!import.meta.env.DEV) return null
  const raw: unknown = kind === 'student' ? import.meta.env.VITE_ASSESSMENT_DEV_STUDENT_ID : import.meta.env.VITE_ASSESSMENT_DEV_ADMIN_ID
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : null
}

/** 지금 쓰는 개발용 ID: 화면에서 고른 값 → 없으면 실행 설정값. Production은 null. */
export function devContextId(kind: DevContextKind): string | null {
  if (!import.meta.env.DEV) return null
  return stored(kind) ?? configuredDevContextId(kind)
}

export function isDevContextOverridden(kind: DevContextKind): boolean {
  return stored(kind) !== null
}

/** 선택을 저장(null이면 실행 설정으로 되돌림)하고 시작 화면을 새로 불러온다. */
export function switchDevContext(kind: DevContextKind, id: string | null, landingPath: string): void {
  if (!import.meta.env.DEV) return
  try {
    if (id && idPattern.test(id)) window.localStorage.setItem(keys[kind], id)
    else window.localStorage.removeItem(keys[kind])
  } catch {
    // 저장소를 쓸 수 없으면 실행 설정값 그대로 둔다(아래 새로고침 후에도 기존 동작).
  }
  window.location.assign(landingPath)
}
