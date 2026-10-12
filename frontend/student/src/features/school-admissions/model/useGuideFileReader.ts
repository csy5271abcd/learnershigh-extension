import { useCallback, useEffect, useRef, useState } from 'react'
import type { GuideFileReadState } from './taskCreate.ts'

/**
 * 선택한 안내문 파일을 브라우저에서 읽으며 실제 진행률을 알려준다. (FileReader progress: loaded / total)
 * 서버 Upload 진행률이 아니다. 작은 파일은 바로 100%가 될 수 있고, 인위적인 지연을 넣지 않는다.
 * 읽기가 끝나면 onReady(file)로 Form에 넘긴다. 새 파일을 고르면 이전 읽기를 멈추고 0%부터 다시 읽는다.
 */
export function useGuideFileReader(onReady: (file: File) => void) {
  const [state, setState] = useState<GuideFileReadState>({ status: 'idle' })
  const readerRef = useRef<FileReader | null>(null)
  const onReadyRef = useRef(onReady)
  useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])

  const stop = () => {
    const reader = readerRef.current
    readerRef.current = null
    if (reader && reader.readyState === FileReader.LOADING) reader.abort()
  }

  useEffect(() => stop, [])

  const read = useCallback((file: File) => {
    stop()
    const reader = new FileReader()
    readerRef.current = reader
    setState({ status: 'reading', fileName: file.name, percent: 0 })
    reader.onprogress = (event) => {
      if (readerRef.current !== reader || !event.lengthComputable || event.total === 0) return
      setState({ status: 'reading', fileName: file.name, percent: Math.min(100, Math.round((event.loaded / event.total) * 100)) })
    }
    reader.onload = () => {
      if (readerRef.current !== reader) return
      readerRef.current = null
      setState({ status: 'ready' })
      onReadyRef.current(file)
    }
    reader.onerror = () => {
      if (readerRef.current !== reader) return
      readerRef.current = null
      setState({ status: 'error', fileName: file.name })
    }
    // 내용은 저장하지 않는다. 브라우저에서 끝까지 읽을 수 있는 파일인지 확인하고 진행률을 보여주기 위해 읽는다.
    reader.readAsArrayBuffer(file)
  }, [])

  const reset = useCallback(() => {
    stop()
    setState({ status: 'idle' })
  }, [])

  return { state, read, reset }
}
