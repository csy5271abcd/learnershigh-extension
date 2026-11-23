import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useBlocker } from 'react-router'
import type { AssessmentNote, AssessmentSourceType, SaveNoteResponse, StudentResource } from '../../api/types.ts'
import {
  applyCommand,
  convertInPlace,
  duplicateBlock,
  indentBlock,
  insertAbove,
  insertBelow,
  mergeWithNext,
  mergeWithPrevious,
  placeResourceBlock,
  removeBlock,
  splitBlock,
  type BlockEdit,
} from '../../model/noteBlockOps.ts'
import {
  blocksFromTemplate,
  createBlock,
  createExamSourceBlock,
  createResourceBlock,
  hasProvisionalBlocks,
  isBlankNote,
  listNumbers,
  moveBlock,
  toNoteBlocks,
} from '../../model/noteEditorModel.ts'
import { noteTemplates } from '../../model/noteTemplates.ts'
import { emptyHistory, record, redo, undo, type NoteHistory } from '../../model/noteHistory.ts'
import { marksOf, safeHref, toggleMark, withMarks, type MarkType } from '../../model/noteInlineMarks.ts'
import { textBlockTypes } from '../../model/noteEditorModel.ts'
import type { QueryResult } from '../../model/useApiQuery.ts'
import { useNoteDraft, type NoteSaveStatus } from '../../model/useNoteDraft.ts'
import formStyles from '../AddSchoolAssessmentModal.module.css'
import { AlertIcon, InfoIcon, NoteIcon, TemplateIcon } from '../AssessmentIcons.tsx'
import detailStyles from '../detail/detail.module.css'
import { TemplateModal } from '../detail/TemplateModal.tsx'
import { Modal } from '../Modal.tsx'
import { ErrorState, LoadingRows } from '../StateViews.tsx'
import { NoteBlockEditor, type FocusRequest } from './NoteBlockEditor.tsx'
import { ConflictCompareModal, ResourcePickerModal } from './NoteModals.tsx'
import { ExamSourcePickerModal, type ExamSourcePick } from '../university/ExamSourcePickerModal.tsx'
import styles from './notes.module.css'

export interface NoteEditorState {
  status: NoteSaveStatus
  /** 저장되지 않은 변경 (저장 중·실패·충돌 포함) */
  unsaved: boolean
  noteId: string | undefined
  baseRevisionId: string | undefined
  baseRevisionNumber: number | undefined
  /** A27-UX(계정 B): 지금 노트(저장 전 변경 포함)에 출처 카드로 연결된 내 자료 — 자료 찾기 Modal의 '연결된 자료' */
  linkedResources: { resourceId: string; title: string }[]
}

/** 자료 탭·대학 기출 PDF 화면의 "노트에 추가" 요청. nonce가 바뀔 때마다 한 번 넣는다. 둘 중 하나만 넣는다. */
export interface NoteInsertRequest {
  nonce: number
  resource?: StudentResource
  /** 대학 기출 PDF 출처 (P-25) */
  examSource?: ExamSourcePick
  /** A27-UX(계정 B) 연결 해제: 이 자료의 출처 카드를 노트에서 뺀다(자료함의 자료는 그대로). 저장은 자동 저장으로 */
  removeResourceId?: string
}

interface NoteEditorProps {
  sourceType: AssessmentSourceType
  sourceId: string
  notes: QueryResult<{ items: AssessmentNote[] }>
  onSaved: (response: SaveNoteResponse) => void
  onStateChange: (state: NoteEditorState) => void
  insertRequest?: NoteInsertRequest
}

// 탐구 노트 (Mockup SN-DETAIL-01·AE-DETAIL-01, inquiry §5·§6, api-contract.md §19~21).
// 학교 수행평가·심화 탐구 상세가 같은 편집기를 쓰고, 저장 대상은 sourceType·sourceId·noteId로 나뉜다.
// Notion형 블록 편집기를 Editor 패키지 없이 만든다 (OD-A05 결정 전). Editor가 정해지면 화면 계층만 바꾸고
// 저장·Revision 흐름(useNoteDraft)과 블록 동작(noteBlockOps)은 그대로 쓴다.
export function NoteEditor({ sourceType, sourceId, notes, onSaved, onStateChange, insertRequest }: NoteEditorProps) {
  // 편집기는 "지금 막 받은" 저장본으로만 시작한다. 다른 화면에 다녀오면 이전 조회 결과(캐시)가 먼저 보일 수 있는데,
  // 그걸로 시작하면 그 사이 저장한 Revision을 놓친다. 시작한 뒤의 재조회(저장 후 갱신)는 편집 중인 내용을 바꾸지 않는다.
  const [started, setStarted] = useState(false)
  if (!started && notes.data && !notes.isRefreshing) setStarted(true)

  if (!started && notes.status === 'error' && notes.error) {
    return (
      <section className={`${detailStyles.section} ${detailStyles.noteSection}`} aria-labelledby="note-heading">
        <NoteHeading />
        <ErrorState title="탐구 노트를 불러오지 못했어요" error={notes.error} onRetry={notes.retry} />
      </section>
    )
  }
  if (!started || !notes.data) {
    return (
      <section className={`${detailStyles.section} ${detailStyles.noteSection}`} aria-labelledby="note-heading">
        <NoteHeading />
        <LoadingRows rows={3} label="탐구 노트를 불러오는 중" />
      </section>
    )
  }
  // 처음 불러온 저장본으로 한 번만 시작한다. 저장 뒤 목록을 다시 불러와도 편집 중인 내용은 바꾸지 않는다.
  return (
    <NoteDraftEditor
      key={`${sourceType}:${sourceId}`}
      sourceType={sourceType}
      sourceId={sourceId}
      initialNote={notes.data.items[0]}
      onSaved={onSaved}
      onStateChange={onStateChange}
      insertRequest={insertRequest}
    />
  )
}

function NoteHeading({ revisionNumber }: { revisionNumber?: number }) {
  return (
    <h2 id="note-heading" className={detailStyles.sectionTitle}>
      <NoteIcon size={15} />
      탐구 노트
      {revisionNumber !== undefined && <span className={detailStyles.sectionCount}>v{revisionNumber}</span>}
    </h2>
  )
}

interface NoteDraftEditorProps {
  sourceType: AssessmentSourceType
  sourceId: string
  initialNote: AssessmentNote | undefined
  onSaved: (response: SaveNoteResponse) => void
  onStateChange: (state: NoteEditorState) => void
  insertRequest?: NoteInsertRequest
}

function NoteDraftEditor({ sourceType, sourceId, initialNote, onSaved, onStateChange, insertRequest }: NoteDraftEditorProps) {
  const draft = useNoteDraft({ sourceType, sourceId, initialNote, onSaved })
  const [focusRequest, setFocusRequest] = useState<FocusRequest>()
  const [modal, setModal] = useState<
    { kind: 'template' } | { kind: 'resource'; targetId: string | undefined } | { kind: 'examSource'; targetId: string | undefined } | { kind: 'conflict' } | null
  >(null)
  const titleId = useId()
  /** 마지막으로 포커스한 블록 (자료 탭에서 넣을 위치) */
  const lastFocusedRef = useRef<string | undefined>(undefined)

  const unsaved = draft.dirty || draft.status === 'saving' || draft.status === 'error' || draft.status === 'conflict'
  const displayStatus: NoteSaveStatus = draft.status === 'dirty' && !draft.dirty ? (draft.base ? 'saved' : 'clean') : draft.status

  // 노트에 연결된 자료(출처 카드). 같은 자료가 여러 번 들어 있어도 한 번만. 목록이 바뀔 때만 부모에게 알린다
  const linkedKey = JSON.stringify(
    [...new Map(draft.blocks.filter((block) => block.type === 'RESOURCE_LINK' && block.attrs?.resource?.resourceId).map((block) => [block.attrs!.resource!.resourceId, block.attrs!.resource!.title])).entries()],
  )
  useEffect(() => {
    onStateChange({
      status: displayStatus,
      unsaved,
      noteId: draft.noteId,
      baseRevisionId: draft.base?.revisionId,
      baseRevisionNumber: draft.base?.revisionNumber,
      linkedResources: (JSON.parse(linkedKey) as [string, string][]).map(([resourceId, title]) => ({ resourceId, title })),
    })
  }, [displayStatus, draft.base?.revisionId, draft.base?.revisionNumber, draft.noteId, onStateChange, unsaved, linkedKey])

  // 저장되지 않은 변경이 있으면 다른 화면으로 가기 전에 묻는다 (앱 안 이동).
  const blocker = useBlocker(({ currentLocation, nextLocation }) => unsaved && currentLocation.pathname !== nextLocation.pathname)
  // 브라우저 새로고침·닫기: 브라우저 기본 확인만 띄운다. 입력이 영구 보존된다는 뜻은 아니다.
  useEffect(() => {
    if (!unsaved) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [unsaved])

  const clearFocus = useCallback(() => setFocusRequest(undefined), [])
  const { setBlocks, blocks } = draft
  const blocksRef = useRef(blocks)
  useEffect(() => {
    blocksRef.current = blocks
  })

  // A27-UX 되돌리기·다시 하기: 블록 변화마다 이전 상태를 기록한다(되돌리기로 생긴 변화는 기록하지 않는다).
  const historyRef = useRef<NoteHistory>(emptyHistory())
  const previousBlocksRef = useRef(blocks)
  const travelingRef = useRef(false)
  const [historySize, setHistorySize] = useState({ past: 0, future: 0 })
  useEffect(() => {
    const previous = previousBlocksRef.current
    previousBlocksRef.current = blocks
    if (travelingRef.current) {
      travelingRef.current = false
      return
    }
    if (previous === blocks) return
    historyRef.current = record(historyRef.current, previous, blocks, Date.now())
    setHistorySize({ past: historyRef.current.past.length, future: historyRef.current.future.length })
  }, [blocks])
  const travel = (direction: 'undo' | 'redo') => {
    const result = direction === 'undo' ? undo(historyRef.current, blocksRef.current) : redo(historyRef.current, blocksRef.current)
    if (!result) return false
    historyRef.current = result.history
    travelingRef.current = true
    setBlocks(() => result.blocks)
    setHistorySize({ past: result.history.past.length, future: result.history.future.length })
    return true
  }
  const onHistoryKey = (event: React.KeyboardEvent) => {
    if (event.nativeEvent.isComposing || !(event.ctrlKey || event.metaKey) || event.altKey) return
    const key = event.key.toLowerCase()
    if (key === 'z' && !event.shiftKey) {
      if (travel('undo')) event.preventDefault()
    } else if ((key === 'z' && event.shiftKey) || key === 'y') {
      if (travel('redo')) event.preventDefault()
    }
  }

  // A27-UX(계정 B) 인라인 서식: 지금 편집 중인 글 블록의 선택 범위에 굵게·기울임·밑줄·링크를 켜고 끈다.
  // 서식은 attrs.marks에만 저장하고 text는 바꾸지 않는다. 바꾼 뒤 같은 선택 범위를 되돌려 이어서 편집한다.
  const [formatHint, setFormatHint] = useState<string | null>(null)
  const [linkTarget, setLinkTarget] = useState<{ blockId: string; start: number; end: number; current: string | null } | null>(null)
  const activeSelection = () => {
    const element = document.activeElement
    const blockId = lastFocusedRef.current
    if (!(element instanceof HTMLTextAreaElement) || !blockId) return null
    const block = blocksRef.current.find((item) => item.blockId === blockId)
    if (!block || !textBlockTypes.has(block.type) || element.value !== block.text) return null
    return { element, block, start: element.selectionStart, end: element.selectionEnd }
  }
  const setMark = (blockId: string, start: number, end: number, type: MarkType, href?: string, element?: HTMLTextAreaElement | null) => {
    setBlocks((previous) =>
      previous.map((item) => (item.blockId === blockId ? withMarks(item, toggleMark(marksOf(item), type, start, end, item.text.length, href)) : item)),
    )
    window.requestAnimationFrame(() => {
      const target = element && element.isConnected ? element : null
      target?.focus()
      target?.setSelectionRange(start, end)
    })
  }
  const format = (type: MarkType) => {
    const selection = activeSelection()
    if (!selection || selection.start === selection.end) {
      setFormatHint('서식을 넣을 글자를 먼저 선택해 주세요.')
      return
    }
    setFormatHint(null)
    if (type === 'link') {
      const current = marksOf(selection.block).find((mark) => mark.type === 'link' && mark.start <= selection.start && mark.end >= selection.end)
      setLinkTarget({ blockId: selection.block.blockId, start: selection.start, end: selection.end, current: current?.href ?? null })
      return
    }
    setMark(selection.block.blockId, selection.start, selection.end, type, undefined, selection.element)
  }

  /** 블록 동작 결과를 반영하고 다음 포커스를 요청한다 */
  const apply = (edit: BlockEdit) => {
    if (edit.blocks !== blocks) setBlocks(() => edit.blocks)
    // 같은 위치를 다시 요청해도 새 객체라 포커스가 다시 적용된다.
    if (edit.focus) setFocusRequest({ ...edit.focus })
  }

  // 자료 탭 "노트에 추가": 마지막으로 쓰던 블록 아래(빈 줄이면 그 자리)에 출처 카드를 넣는다.
  // 편집기가 새로 열릴 때 이미 처리한 요청을 다시 넣지 않도록, 열린 시점의 요청은 처리한 것으로 본다.
  const handledInsertRef = useRef(insertRequest?.nonce)
  const applyRef = useRef(apply)
  useEffect(() => {
    applyRef.current = apply
  })
  useEffect(() => {
    if (!insertRequest || insertRequest.nonce === handledInsertRef.current) return
    handledInsertRef.current = insertRequest.nonce
    if (insertRequest.removeResourceId) {
      const removeId = insertRequest.removeResourceId
      const remaining = blocksRef.current.filter((block) => !(block.type === 'RESOURCE_LINK' && block.attrs?.resource?.resourceId === removeId))
      // 노트에 블록이 하나도 남지 않으면 빈 본문 한 줄을 둔다
      applyRef.current({ blocks: remaining.length > 0 ? remaining : [createBlock('PARAGRAPH', '')] })
      return
    }
    const card = insertRequest.examSource
      ? createExamSourceBlock(insertRequest.examSource, insertRequest.examSource.title)
      : insertRequest.resource
        ? createResourceBlock(insertRequest.resource)
        : undefined
    if (card) applyRef.current(placeResourceBlock(blocksRef.current, lastFocusedRef.current, card))
  }, [insertRequest])

  const applyTemplate = (templateId: string, mode: 'APPEND' | 'NEW_NOTE') => {
    const template = noteTemplates.find((item) => item.templateId === templateId)
    if (!template) return
    const templateBlocks = blocksFromTemplate(template.blocks)
    // 빈 노트에 "이어 붙이기"하면 시작용 빈 줄은 남기지 않는다. "새 노트로 시작"의 이전 저장본은 Revision 이력에 남는다.
    const next = mode === 'APPEND' && !isBlankNote(blocks) ? [...blocks, ...templateBlocks] : templateBlocks
    const first = templateBlocks.find((block) => block.type === 'PARAGRAPH') ?? templateBlocks[0]
    apply({ blocks: next, focus: first ? { blockId: first.blockId, caret: 'start' } : undefined })
    setModal(null)
  }

  const saveHintId = useId()
  const numbers = listNumbers(blocks)
  const blank = isBlankNote(blocks)

  /** 본문 아래 빈 곳을 누르면 마지막 줄로 가거나, 마지막이 빈 본문이 아니면 새 줄을 만든다 (Notion과 같다). */
  const onTailClick = () => {
    const last = blocks[blocks.length - 1]
    if (last && last.type === 'PARAGRAPH' && last.text === '') apply({ blocks, focus: { blockId: last.blockId, caret: 'start' } })
    else apply(insertBelow(blocks, last?.blockId, createBlock('PARAGRAPH')))
  }

  return (
    <section className={`${detailStyles.section} ${detailStyles.noteSection} ${styles.editor}`} aria-labelledby="note-heading">
      <div className={styles.header}>
        <NoteHeading revisionNumber={draft.base?.revisionNumber} />
        <div className={styles.headerRight}>
          <span className={styles.hint}>/ 블록 메뉴 · # · - · 1. · [] · &gt; 바로 입력 · Ctrl+Z 되돌리기</span>
          <span className={styles.formatBar} role="group" aria-label="글자 서식 (글자를 선택한 뒤 눌러요)">
            {(
              [
                ['bold', <b key="b">B</b>, '굵게 (Ctrl+B)'],
                ['italic', <i key="i">I</i>, '기울임 (Ctrl+I)'],
                ['underline', <u key="u">U</u>, '밑줄 (Ctrl+U)'],
                ['link', '링크', '링크 (Ctrl+K)'],
              ] as const
            ).map(([type, label, title]) => (
              <button
                key={type}
                type="button"
                className={styles.formatButton}
                title={title}
                aria-label={title}
                // 선택 범위를 잃지 않게 누를 때 입력칸 포커스를 빼앗지 않는다
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => format(type)}
                data-testid={`note-format-${type}`}
              >
                {label}
              </button>
            ))}
          </span>
          <button type="button" className={detailStyles.smallOutlineButton} onClick={() => travel('undo')} disabled={historySize.past === 0} data-testid="note-undo" aria-label="되돌리기 (Ctrl+Z)">
            되돌리기
          </button>
          <button type="button" className={detailStyles.smallOutlineButton} onClick={() => travel('redo')} disabled={historySize.future === 0} data-testid="note-redo" aria-label="다시 하기 (Ctrl+Shift+Z)">
            다시 하기
          </button>
          <button type="button" className={detailStyles.smallOutlineButton} onClick={() => setModal({ kind: 'template' })}>
            <TemplateIcon size={14} />
            템플릿 선택
          </button>
          {/* 지금 저장: 자동 저장(입력 멈춤 1.5초)을 기다리지 않고 같은 저장 흐름(useNoteDraft.save)을 바로 실행한다.
              저장 중·저장할 내용 없음·충돌 상태에서는 누를 수 없다(중복 저장 방지). 저장마다 새 Revision이 생긴다. */}
          <button
            type="button"
            className={detailStyles.smallOutlineButton}
            data-testid="note-save-now"
            disabled={draft.status === 'saving' || draft.status === 'conflict' || !(draft.status === 'dirty' || draft.status === 'error')}
            aria-describedby={saveHintId}
            onClick={draft.save}
          >
            {draft.status === 'saving' ? '저장 중…' : '지금 저장'}
          </button>
          <span id={saveHintId} className="lh-visually-hidden">
            {draft.status === 'dirty' ? '저장하지 않은 변경이 있어요' : draft.status === 'saving' ? '저장하고 있어요' : '저장할 변경이 없어요'}
          </span>
        </div>
      </div>

      <label className="lh-visually-hidden" htmlFor={titleId}>
        노트 제목
      </label>
      <input
        id={titleId}
        className={styles.titleInput}
        value={draft.title}
        placeholder="노트 제목"
        maxLength={200}
        onChange={(event) => draft.setTitle(event.target.value)}
        onKeyDown={(event) => {
          // 제목에서 Enter·↓ → 본문 첫 블록으로
          if ((event.key === 'Enter' || event.key === 'ArrowDown') && !event.nativeEvent.isComposing && blocks[0]) {
            event.preventDefault()
            apply({ blocks, focus: { blockId: blocks[0].blockId, caret: 'start' } })
          }
        }}
      />

      {draft.status === 'error' && (
        <div className={styles.banner} data-tone="error" role="alert">
          <span>
            <AlertIcon size={13} /> 저장하지 못했어요. 입력한 내용은 그대로 있어요. {draft.error}
          </span>
          <div className={styles.bannerActions}>
            <button type="button" className={styles.bannerButton} onClick={draft.save}>
              다시 저장
            </button>
          </div>
        </div>
      )}
      {draft.status === 'conflict' && draft.conflict && (
        <div className={styles.banner} data-tone="warning" role="alert">
          <span>
            <AlertIcon size={13} /> 다른 곳에서 먼저 저장된 버전(v{draft.conflict.revisionNumber})이 있어 저장을 멈췄어요. 내 입력은 그대로 있어요.
          </span>
          <div className={styles.bannerActions}>
            <button type="button" className={styles.bannerButton} onClick={() => setModal({ kind: 'conflict' })}>
              비교하고 고르기
            </button>
          </div>
        </div>
      )}
      {hasProvisionalBlocks(blocks) && (
        <p className={styles.banner} data-tone="info">
          <span>
            <InfoIcon size={12} /> 제목 단계·목록·표·체크리스트·토글·코드·수식·카드·미디어 블록은 Editor 저장 형식이 확정되기 전(OD-A05)의 임시 형식으로 저장돼요. 파일·이미지 본문은 노트에 저장되지 않아요(파일은 결과물로 올려 주세요).
          </span>
        </p>
      )}

      {formatHint && (
        <p className={styles.hint} role="status" data-testid="note-format-hint">
          {formatHint}
        </p>
      )}
      <ul className={styles.blocks} aria-label="노트 본문" onKeyDownCapture={onHistoryKey}>
        {blocks.map((block, index) => (
          <NoteBlockEditor
            key={block.blockId}
            block={block}
            number={numbers[index] || undefined}
            isFirst={index === 0}
            isLast={index === blocks.length - 1}
            isOnly={blocks.length === 1}
            focusRequest={focusRequest?.blockId === block.blockId ? focusRequest : undefined}
            onFocusHandled={clearFocus}
            onFocused={() => {
              lastFocusedRef.current = block.blockId
            }}
            onChange={(next) => setBlocks((previous) => previous.map((item) => (item.blockId === block.blockId ? next : item)))}
            onFormat={format}
            onSplit={(before, after) => apply(splitBlock(blocks, block.blockId, before, after))}
            onInsertAbove={() => apply(insertAbove(blocks, block.blockId))}
            onMergePrevious={() => apply(mergeWithPrevious(blocks, block.blockId))}
            onMergeNext={() => apply(mergeWithNext(blocks, block.blockId))}
            onNavigate={(direction, caret) => {
              const target = blocks[index + (direction === 'previous' ? -1 : 1)]
              if (target) apply({ blocks, focus: { blockId: target.blockId, caret } })
            }}
            onIndent={(delta) => {
              const element = document.activeElement
              const caret = element instanceof HTMLTextAreaElement ? element.selectionStart : 0
              apply(indentBlock(blocks, block.blockId, delta, caret))
            }}
            onInsertBelow={(withSlashMenu) => {
              const next = createBlock('PARAGRAPH', withSlashMenu ? '/' : '')
              apply(insertBelow(blocks, block.blockId, next, withSlashMenu))
            }}
            onCommand={(command) => {
              const edit = applyCommand(blocks, block.blockId, command)
              apply(edit)
              if (edit.pickResource) setModal({ kind: 'resource', targetId: block.blockId })
              if (edit.pickExamSource) setModal({ kind: 'examSource', targetId: block.blockId })
            }}
            onConvert={(type, attrs) => apply(convertInPlace(blocks, block.blockId, type, attrs))}
            onMove={(delta) => {
              setBlocks((previous) => moveBlock(previous, previous.findIndex((item) => item.blockId === block.blockId), delta))
              setFocusRequest({ blockId: block.blockId, caret: 'end' })
            }}
            onDuplicate={() => apply(duplicateBlock(blocks, block.blockId))}
            onRemove={(focus) => apply(removeBlock(blocks, block.blockId, focus ?? (index > 0 ? 'previous' : 'next')))}
            onPickResource={() => setModal({ kind: 'resource', targetId: block.blockId })}
            onPickExamSource={() => setModal({ kind: 'examSource', targetId: block.blockId })}
            examReturnTaskId={sourceType === 'ENRICHMENT_TASK' ? sourceId : undefined}
          />
        ))}
      </ul>
      <div className={styles.tail} aria-hidden="true" onClick={onTailClick} />

      {blank && (
        <div className={styles.startHint}>
          <span className={styles.hint}>템플릿으로 시작하기</span>
          {noteTemplates.slice(0, 4).map((template) => (
            <button key={template.templateId} type="button" className={styles.startChip} onClick={() => applyTemplate(template.templateId, 'NEW_NOTE')}>
              <TemplateIcon size={13} />
              {template.name}
            </button>
          ))}
          <button type="button" className={styles.linkButton} onClick={() => setModal({ kind: 'template' })}>
            템플릿 {noteTemplates.length}종 모두 보기
          </button>
        </div>
      )}

      {linkTarget && (
        <LinkModal
          current={linkTarget.current}
          onClose={() => {
            const target = linkTarget
            setLinkTarget(null)
            apply({ blocks, focus: { blockId: target.blockId, caret: target.end } })
          }}
          onSubmit={(href) => {
            const target = linkTarget
            setLinkTarget(null)
            const element = document.querySelector<HTMLTextAreaElement>(`[data-note-block-id="${CSS.escape(target.blockId)}"] textarea[data-focus-target="text"]`)
            setMark(target.blockId, target.start, target.end, 'link', href ?? undefined, element)
          }}
        />
      )}
      {modal?.kind === 'template' && (
        <TemplateModal
          hasContent={!blank}
          hasUnsavedChanges={unsaved}
          onClose={() => setModal(null)}
          onApply={(template, mode) => applyTemplate(template.templateId, mode)}
        />
      )}
      {modal?.kind === 'resource' && (
        <ResourcePickerModal
          onClose={() => {
            const targetId = modal.targetId
            setModal(null)
            if (targetId && blocks.some((block) => block.blockId === targetId)) apply({ blocks, focus: { blockId: targetId, caret: 'end' } })
          }}
          onPick={(resource) => {
            apply(placeResourceBlock(blocks, modal.targetId, createResourceBlock(resource)))
            setModal(null)
          }}
        />
      )}
      {modal?.kind === 'examSource' && (
        <ExamSourcePickerModal
          onClose={() => {
            const targetId = modal.targetId
            setModal(null)
            if (targetId && blocks.some((block) => block.blockId === targetId)) apply({ blocks, focus: { blockId: targetId, caret: 'end' } })
          }}
          onPick={(source) => {
            apply(placeResourceBlock(blocks, modal.targetId, createExamSourceBlock(source, source.title)))
            setModal(null)
          }}
        />
      )}
      {modal?.kind === 'conflict' && draft.conflict && (
        <ConflictCompareModal
          noteId={draft.conflict.noteId}
          latestRevisionId={draft.conflict.revisionId}
          mine={toNoteBlocks(blocks)}
          onClose={() => setModal(null)}
          onSaveMine={() => {
            setModal(null)
            draft.saveOverLatest()
          }}
          onLoadLatest={() => {
            setModal(null)
            void draft.loadLatest()
          }}
        />
      )}
      {blocker.state === 'blocked' && (
        <Modal
          title="저장되지 않은 변경이 있어요"
          description="이 화면을 나가면 저장되지 않은 노트 내용이 사라져요."
          compact
          onRequestClose={() => blocker.reset()}
          footer={
            <>
              <button type="button" className={formStyles.ghostButton} onClick={() => blocker.proceed()}>
                저장하지 않고 나가기
              </button>
              <button type="button" className={formStyles.primaryButton} onClick={() => blocker.reset()}>
                머무르기
              </button>
            </>
          }
        >
          <p className={styles.emptyText}>
            {draft.status === 'saving' ? '지금 저장하는 중이에요. 잠시 뒤 다시 시도해 주세요.' : '노트에 저장되지 않은 내용이 있어요.'}
          </p>
        </Modal>
      )}
    </section>
  )
}

/** 상단 바용 저장 상태 표시 (Mockup "자동 저장됨" 자리). 서버(Mock) 응답을 받은 뒤에만 "저장됨"이라고 쓴다. */
export function NoteSaveStatusLabel({ state }: { state: NoteEditorState | undefined }) {
  if (!state) return null
  const labels: Record<NoteSaveStatus, string | null> = {
    clean: state.baseRevisionNumber ? `저장됨 · v${state.baseRevisionNumber}` : null,
    dirty: '저장 안 됨',
    saving: '저장 중…',
    saved: `자동 저장됨 · v${state.baseRevisionNumber ?? ''}`,
    error: '저장 실패',
    conflict: '저장 충돌',
  }
  const label = labels[state.status]
  if (!label) return null
  return (
    <span className={styles.saveStatus} data-status={state.status} role="status" aria-live="polite">
      {label}
    </span>
  )
}

/** A27-UX(계정 B) 링크 넣기: http(s) 주소만 받는다. 이미 링크가 있으면 바꾸거나 뺄 수 있다 */
function LinkModal({ current, onClose, onSubmit }: { current: string | null; onClose: () => void; onSubmit: (href: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(current ?? '')
  const [error, setError] = useState<string | null>(null)
  const submit = () => {
    const href = safeHref(value)
    if (!href) {
      setError('http:// 또는 https:// 로 열 수 있는 주소를 넣어 주세요.')
      return
    }
    onSubmit(href)
  }
  return (
    <Modal
      title={current ? '링크 바꾸기' : '링크 넣기'}
      compact
      onRequestClose={onClose}
      initialFocusRef={inputRef}
      footer={
        <>
          {current && (
            <button type="button" className={formStyles.ghostButton} onClick={() => onSubmit(null)} data-testid="note-link-remove">
              링크 빼기
            </button>
          )}
          <button type="button" className={formStyles.ghostButton} onClick={onClose}>
            취소
          </button>
          <button type="button" className={formStyles.primaryButton} onClick={submit} data-testid="note-link-save">
            넣기
          </button>
        </>
      }
    >
      <form
        className={styles.linkForm}
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <label className="lh-visually-hidden" htmlFor="note-link-input">
          링크 주소
        </label>
        <input
          id="note-link-input"
          ref={inputRef}
          className={styles.linkInput}
          value={value}
          placeholder="https://"
          inputMode="url"
          onChange={(event) => {
            setValue(event.target.value)
            setError(null)
          }}
          data-testid="note-link-input"
        />
        {error && (
          <p className={styles.linkError} role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
