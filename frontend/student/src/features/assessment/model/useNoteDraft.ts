import { useCallback, useEffect, useRef, useState } from 'react'
import { toApiError } from '../api/apiError.ts'
import { createNote, getNoteRevision, listNotes, updateNote } from '../api/assessmentDetailApi.ts'
import type { AssessmentNote, AssessmentSourceType, SaveNoteResponse } from '../api/types.ts'
import { mockAutosaveDelayMs } from './noteAutosavePolicy.ts'
import { blankNoteBlocks, fromNoteBlocks, isBlankNote, sameContent, toNoteBlocks, type EditorBlock } from './noteEditorModel.ts'

// 노트 초안·저장 상태 (Editor 화면과 분리된 저장 흐름). §20 POST(첫 저장)·PUT(이후 저장, expectedRevisionId).
// 상태: 변경 없음 → 저장 안 됨 → 저장 중 → 저장됨 / 저장 실패 / 충돌. "저장됨"은 서버(Mock) 응답을 받은 뒤에만 표시한다.

export type NoteSaveStatus = 'clean' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict'

export interface NoteConflict {
  noteId: string
  revisionId: string
  revisionNumber: number
}

interface Content {
  title: string
  blocks: EditorBlock[]
}

interface UseNoteDraftOptions {
  sourceType: AssessmentSourceType
  sourceId: string
  /** 마지막으로 저장된 노트 (§20 GET). 없으면 새 노트 */
  initialNote: AssessmentNote | undefined
  onSaved: (response: SaveNoteResponse) => void
}

export function useNoteDraft({ sourceType, sourceId, initialNote, onSaved }: UseNoteDraftOptions) {
  // 빈 노트는 바로 입력할 수 있는 빈 본문 하나로 시작한다. 이 시작 블록은 변경으로 치지 않는다 (저장 기준과 같게 둔다).
  const [initial] = useState<Content>(() => ({
    title: initialNote?.title ?? '탐구 노트',
    blocks: initialNote && initialNote.blocks.length > 0 ? fromNoteBlocks(initialNote.blocks) : blankNoteBlocks(),
  }))
  const [content, setContent] = useState<Content>(initial)
  const [saved, setSaved] = useState<Content>(initial)
  const [noteId, setNoteId] = useState(initialNote?.noteId)
  const [base, setBase] = useState(
    initialNote ? { revisionId: initialNote.revisionId, revisionNumber: initialNote.revisionNumber, savedAt: initialNote.savedAt } : undefined,
  )
  const [status, setStatus] = useState<NoteSaveStatus>('clean')
  const [error, setError] = useState<string>()
  const [conflict, setConflict] = useState<NoteConflict>()
  const savingRef = useRef(false)
  const contentRef = useRef(content)
  const onSavedRef = useRef(onSaved)
  useEffect(() => {
    contentRef.current = content
    onSavedRef.current = onSaved
  })

  const dirty = !sameContent(content, saved)

  const update = useCallback((change: (previous: Content) => Content) => {
    setContent((previous) => change(previous))
    setStatus((previous) => (previous === 'saving' || previous === 'conflict' || previous === 'error' ? previous : 'dirty'))
  }, [])

  const setTitle = useCallback((title: string) => update((previous) => ({ ...previous, title })), [update])
  const setBlocks = useCallback(
    (change: (blocks: EditorBlock[]) => EditorBlock[]) => update((previous) => ({ ...previous, blocks: change(previous.blocks) })),
    [update],
  )

  const runSave = useCallback(
    async (expectedRevisionId?: string) => {
      if (savingRef.current) return
      const snapshot = contentRef.current
      // 아직 노트가 없고 본문도 비어 있으면 만들지 않는다.
      if (!noteId && isBlankNote(snapshot.blocks)) return
      savingRef.current = true
      setStatus('saving')
      setError(undefined)
      try {
        const body = { title: snapshot.title, blocks: toNoteBlocks(snapshot.blocks) }
        const response = noteId
          ? await updateNote(noteId, { ...body, expectedRevisionId: expectedRevisionId ?? base?.revisionId ?? '' })
          : await createNote({ sourceType, sourceId, ...body })
        setNoteId(response.noteId)
        setBase({ revisionId: response.revisionId, revisionNumber: response.revisionNumber, savedAt: response.savedAt })
        setSaved(snapshot)
        setConflict(undefined)
        // 저장하는 동안 더 고친 내용이 있으면 "저장 안 됨"으로 남긴다.
        setStatus(sameContent(contentRef.current, snapshot) ? 'saved' : 'dirty')
        onSavedRef.current(response)
      } catch (caught) {
        const apiError = toApiError(caught)
        if (apiError.code === 'RESOURCE_VERSION_CONFLICT') {
          const latest = await findLatest(noteId, sourceType, sourceId, apiError.details)
          if (latest) {
            setNoteId(latest.noteId)
            setConflict(latest)
            setStatus('conflict')
            return
          }
        }
        setError(`${apiError.message} (${apiError.code})`)
        setStatus('error')
      } finally {
        savingRef.current = false
      }
    },
    [base, noteId, sourceId, sourceType],
  )

  // Mock 자동 저장: 마지막 입력 뒤 잠시 멈추면 저장한다. 주기·정책은 계약 미정(API-OD-A04)이라 noteAutosavePolicy에만 둔다.
  // 실패·충돌 상태에서는 학생이 고를 때까지 자동으로 다시 보내지 않는다.
  useEffect(() => {
    if (status !== 'dirty' || !dirty) return
    const timer = window.setTimeout(() => void runSave(), mockAutosaveDelayMs)
    return () => window.clearTimeout(timer)
  }, [content, dirty, runSave, status])

  /** 충돌 해결 ①: 지금 내 내용으로 최신 Revision 위에 새 Revision을 저장 (다른 저장본은 이력에 그대로 남는다) */
  const saveOverLatest = useCallback(() => {
    if (!conflict) return
    void runSave(conflict.revisionId)
  }, [conflict, runSave])

  /** 충돌 해결 ②: 저장된 최신 내용을 불러온다 (내 입력은 버린다, 화면에서 확인을 받은 뒤 호출) */
  const loadLatest = useCallback(async () => {
    if (!conflict) return
    try {
      const latest = await getNoteRevision(conflict.noteId, conflict.revisionId)
      const next = { title: latest.title, blocks: latest.blocks.length > 0 ? fromNoteBlocks(latest.blocks) : blankNoteBlocks() }
      setContent(next)
      setSaved(next)
      setBase({ revisionId: latest.revisionId, revisionNumber: latest.revisionNumber, savedAt: latest.savedAt })
      setConflict(undefined)
      setStatus('clean')
    } catch (caught) {
      const apiError = toApiError(caught)
      setError(`최신 노트를 불러오지 못했어요. ${apiError.message} (${apiError.code})`)
    }
  }, [conflict])

  /** 본문 전체를 바꾼다 (템플릿 "새 노트로 시작"). 이전 저장본은 Revision 이력에 남는다. */
  const replaceBlocks = useCallback((blocks: EditorBlock[]) => update((previous) => ({ ...previous, blocks })), [update])

  return {
    title: content.title,
    blocks: content.blocks,
    noteId,
    base,
    status,
    dirty,
    error,
    conflict,
    setTitle,
    setBlocks,
    replaceBlocks,
    save: () => void runSave(),
    saveOverLatest,
    loadLatest,
  }
}

async function findLatest(
  noteId: string | undefined,
  sourceType: AssessmentSourceType,
  sourceId: string,
  details: Record<string, unknown> | undefined,
): Promise<NoteConflict | undefined> {
  if (noteId && typeof details?.currentRevisionId === 'string') {
    return { noteId, revisionId: details.currentRevisionId, revisionNumber: Number(details.currentRevisionNumber) || 0 }
  }
  // 첫 저장 중 다른 곳에서 노트가 먼저 만들어진 경우: 저장된 노트를 찾아 충돌로 보여준다.
  try {
    const { items } = await listNotes(sourceType, sourceId)
    const note = items[0]
    return note ? { noteId: note.noteId, revisionId: note.revisionId, revisionNumber: note.revisionNumber } : undefined
  } catch {
    return undefined
  }
}
