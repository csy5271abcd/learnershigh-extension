// 학생 Assessment 왼쪽 메뉴 전체 접기 상태 (A27-UX 부록 E, S1). 이 브라우저에만 기억한다(화면 편의 상태 — 업무 데이터 아님).
// 저장소를 쓸 수 없으면(비공개 창·차단·서버 렌더) 기본값 '펼침'으로 동작하고 오류를 내지 않는다.

export const SIDEBAR_COLLAPSED_KEY = 'lh.assessment.student.sidebarCollapsed'

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

function storage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export function readSidebarCollapsed(store: StorageLike | null = storage()): boolean {
  try {
    return store?.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

export function writeSidebarCollapsed(collapsed: boolean, store: StorageLike | null = storage()): void {
  try {
    store?.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0')
  } catch {
    // 저장하지 못해도 이번 화면에서는 접힘 상태가 그대로 동작한다
  }
}
