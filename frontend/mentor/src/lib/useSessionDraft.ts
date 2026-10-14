import { useCallback, useEffect, useRef, useState } from 'react'

// 작성 중인 내용을 이 Browser Tab의 sessionStorage에 보존한다. (Back / 다른 메뉴 이동 / Preview ↔ Edit / 새로고침)
// Backend Draft 저장이 아니다. 보존 대상은 Mentor 본인이 쓰는 글뿐이며 Student 개인정보를 Key / 값에 넣지 않는다.
const PREFIX = 'lh-mentor:draft:'

function readDraft<T>(key: string): T | undefined {
  try {
    const raw = window.sessionStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : undefined
  } catch {
    return undefined
  }
}

export function clearSessionDraft(key: string) {
  try {
    window.sessionStorage.removeItem(PREFIX + key)
  } catch {
    // 저장소를 쓸 수 없으면 보존 없이 계속한다.
  }
}

export function hasSessionDraft(key: string) {
  return readDraft(key) !== undefined
}

/**
 * `createInitial`은 보존된 Draft가 없을 때만 쓴다.
 * `discard`는 보존된 Draft를 지우고 처음 값으로 돌린다.
 */
export function useSessionDraft<T>(key: string, createInitial: () => T) {
  const [value, setValue] = useState<T>(() => readDraft<T>(key) ?? createInitial())
  const [restored] = useState(() => readDraft<T>(key) !== undefined)
  const [dirty, setDirty] = useState(false)
  // 처음 값 생성 함수. 같은 key 안에서는 첫 렌더링 함수를 쓴다.
  const createInitialRef = useRef(createInitial)

  useEffect(() => {
    if (!dirty) return
    try {
      window.sessionStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
      // 저장 공간이 없으면 화면 State만 유지한다.
    }
  }, [dirty, key, value])

  const update = useCallback((next: T | ((current: T) => T)) => {
    setDirty(true)
    setValue(next)
  }, [])

  const discard = useCallback(() => {
    clearSessionDraft(key)
    setDirty(false)
    setValue(createInitialRef.current())
  }, [key])

  return { value, update, discard, restored }
}
