import { useEffect, useRef } from 'react'

/** 비동기 처리 뒤에 읽을 최신 값. */
export function useLatest<T>(value: T) {
  const ref = useRef(value)
  useEffect(() => {
    ref.current = value
  })
  return ref
}
