import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useBlocker } from 'react-router'
import type { AssessmentNote, AssessmentSourceType, SaveNoteResponse } from '../../api/types.ts'
import {
  blocksFromTemplate,
  blockTypeOptions,
  convertBlock,
  createBlock,
  createResourceBlock,
  hasProvisionalBlocks,
  moveBlock,
  toNoteBlocks,
} from '../../model/noteEditorModel.ts'
import { noteTemplates } from '../../model/noteTemplates.ts'
import type { QueryResult } from '../../model/useApiQuery.ts'
import { useNoteDraft, type NoteSaveStatus } from '../../model/useNoteDraft.ts'
import formStyles from '../AddSchoolAssessmentModal.module.css'
import { AlertIcon, FileIcon, InfoIcon, LinkIcon, NoteIcon, PlusIcon, TemplateIcon } from '../AssessmentIcons.tsx'
import detailStyles from '../detail/detail.module.css'
import { TemplateModal } from '../detail/TemplateModal.tsx'
import { Modal } from '../Modal.tsx'
import { ErrorState, LoadingRows } from '../StateViews.tsx'
import { NoteBlockEditor } from './NoteBlockEditor.tsx'
import { ConflictCompareModal, ResourcePickerModal } from './NoteModals.tsx'
import styles from './notes.module.css'

export interface NoteEditorState {
  status: NoteSaveStatus
  /** 저장되지 않은 변경 (저장 중·실패·충돌 포함) */
  unsaved: boolean
  noteId: string | undefined
  baseRevisionId: string | undefined
  baseRevisionNumber: number | undefined
}

interface NoteEditorProps {
  sourceType: AssessmentSourceType
  sourceId: string
  notes: QueryResult<{ items: AssessmentNote[] }>
  onSaved: (response: SaveNoteResponse) => void
  onStateChange: (state: NoteEditorState) => void
}

// 탐구 노트 (Mockup SN-DETAIL-01·AE-DETAIL-01, inquiry §5·§6, api-contract.md §19~21).
// 학교 수행평가·심화 탐구 상세가 같은 편집기를 쓰고, 저장 대상은 sourceType·sourceId·noteId로 나뉜다.
// 경량 편집기다: 전문 Rich-text Editor(OD-A05)가 정해지면 화면 계층만 바꾸고 저장·Revision 흐름(useNoteDraft)은 그대로 쓴다.
export function NoteEditor({ sourceType, sourceId, notes, onSaved, onStateChange }: NoteEditorProps) {
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
}

function NoteDraftEditor({ sourceType, sourceId, initialNote, onSaved, onStateChange }: NoteDraftEditorProps) {
  const draft = useNoteDraft({ sourceType, sourceId, initialNote, onSaved })
  const [focusId, setFocusId] = useState<string>()
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [modal, setModal] = useState<'template' | 'resource' | 'conflict' | null>(null)
  const addMenuId = useId()
  const addMenuRef = useRef<HTMLDivElement>(null)

  const unsaved = draft.dirty || draft.status === 'saving' || draft.status === 'error' || draft.status === 'conflict'
  const displayStatus: NoteSaveStatus = draft.status === 'dirty' && !draft.dirty ? (draft.base ? 'saved' : 'clean') : draft.status

  useEffect(() => {
    onStateChange({
      status: displayStatus,
      unsaved,
      noteId: draft.noteId,
      baseRevisionId: draft.base?.revisionId,
      baseRevisionNumber: draft.base?.revisionNumber,
    })
  }, [displayStatus, draft.base?.revisionId, draft.base?.revisionNumber, draft.noteId, onStateChange, unsaved])

  // 저장되지 않은 변경이 있으면 다른 화면으로 가기 전에 묻는다 (앱 안 이동).
  const blocker = useBlocker(({ currentLocation, nextLocation }) => unsaved && currentLocation.pathname !== nextLocation.pathname)
  // 브라우저 새로고침·닫기: 브라우저 기본 확인만 띄운다. 입력이 영구 보존된다는 뜻은 아니다.
  useEffect(() => {
    if (!unsaved) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [unsaved])

  useEffect(() => {
    if (!addMenuOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!addMenuRef.current?.contains(event.target as Node)) setAddMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [addMenuOpen])

  const clearFocus = useCallback(() => setFocusId(undefined), [])
  const { setBlocks } = draft

  const insertAt = (index: number, type: string) => {
    const block = createBlock(type)
    setBlocks((blocks) => [...blocks.slice(0, index), block, ...blocks.slice(index)])
    setFocusId(block.blockId)
  }

  const applyTemplate = (templateId: string, mode: 'APPEND' | 'NEW_NOTE') => {
    const template = noteTemplates.find((item) => item.templateId === templateId)
    if (!template) return
    const blocks = blocksFromTemplate(template.blocks)
    if (mode === 'APPEND') setBlocks((previous) => [...previous, ...blocks])
    else draft.replaceBlocks(blocks)
    setFocusId(blocks[0]?.blockId)
    setModal(null)
  }

  const numbers = draft.blocks.reduce<number[]>((acc, block, index) => {
    acc.push(block.type === 'NUMBERED' ? (draft.blocks[index - 1]?.type === 'NUMBERED' ? acc[index - 1] + 1 : 1) : 0)
    return acc
  }, [])
  const empty = draft.blocks.length === 0

  return (
    <section className={`${detailStyles.section} ${detailStyles.noteSection} ${styles.editor}`} aria-labelledby="note-heading">
      <div className={styles.header}>
        <NoteHeading revisionNumber={draft.base?.revisionNumber} />
        <div className={styles.headerRight}>
          <span className={styles.hint}>Enter 새 줄 · 빈 줄에서 / 블록 추가</span>
          <button type="button" className={detailStyles.smallOutlineButton} onClick={() => setModal('template')}>
            <TemplateIcon size={14} />
            템플릿 선택
          </button>
        </div>
      </div>

      <label className="lh-visually-hidden" htmlFor={`${addMenuId}-title`}>
        노트 제목
      </label>
      <input
        id={`${addMenuId}-title`}
        className={styles.titleInput}
        value={draft.title}
        placeholder="노트 제목"
        maxLength={200}
        onChange={(event) => draft.setTitle(event.target.value)}
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
            <button type="button" className={styles.bannerButton} onClick={() => setModal('conflict')}>
              비교하고 고르기
            </button>
          </div>
        </div>
      )}
      {hasProvisionalBlocks(draft.blocks) && (
        <p className={styles.banner} data-tone="info">
          <span>
            <InfoIcon size={12} /> 목록·체크리스트·표·자료 링크는 저장 형식이 확정되기 전이라 시연용(Mock) 형식으로 저장돼요.
          </span>
        </p>
      )}

      {empty ? (
        <div className={styles.emptyStart}>
          <p className={styles.emptyTitle}>어떻게 시작할까요?</p>
          <p className={styles.emptyText}>템플릿은 시작을 돕는 예시예요. 필요 없는 칸은 지우고 순서도 마음대로 바꿔도 돼요.</p>
          <div className={styles.startButtons}>
            <button type="button" className={detailStyles.smallOutlineButton} onClick={() => insertAt(0, 'PARAGRAPH')}>
              <FileIcon size={14} />빈 노트
            </button>
            {noteTemplates.slice(0, 4).map((template) => (
              <button key={template.templateId} type="button" className={detailStyles.smallOutlineButton} onClick={() => applyTemplate(template.templateId, 'NEW_NOTE')}>
                <TemplateIcon size={14} />
                {template.name}
              </button>
            ))}
            <button type="button" className={styles.linkButton} onClick={() => setModal('template')}>
              템플릿 {noteTemplates.length}종 모두 보기
            </button>
          </div>
        </div>
      ) : (
        <ul className={styles.blocks} aria-label="노트 본문">
          {draft.blocks.map((block, index) => (
            <NoteBlockEditor
              key={block.blockId}
              block={block}
              number={numbers[index] || undefined}
              isFirst={index === 0}
              isLast={index === draft.blocks.length - 1}
              autoFocus={focusId === block.blockId}
              onFocused={clearFocus}
              onChange={(next) => setBlocks((blocks) => blocks.map((item) => (item.blockId === block.blockId ? next : item)))}
              onInsertBelow={() => insertAt(index + 1, 'PARAGRAPH')}
              onConvert={(type) => {
                setBlocks((blocks) => blocks.map((item) => (item.blockId === block.blockId ? convertBlock(item, type) : item)))
                setFocusId(block.blockId)
              }}
              onMove={(delta) => setBlocks((blocks) => moveBlock(blocks, blocks.findIndex((item) => item.blockId === block.blockId), delta))}
              onRemove={(focusPrevious) => {
                const previous = draft.blocks[index - 1]
                setBlocks((blocks) => blocks.filter((item) => item.blockId !== block.blockId))
                if (focusPrevious && previous) setFocusId(previous.blockId)
              }}
            />
          ))}
        </ul>
      )}

      {!empty && (
        <div ref={addMenuRef} className={styles.menuWrap}>
          <button
            type="button"
            className={styles.addBlock}
            aria-haspopup="menu"
            aria-expanded={addMenuOpen}
            aria-controls={addMenuOpen ? `${addMenuId}-menu` : undefined}
            onClick={() => setAddMenuOpen((value) => !value)}
          >
            <PlusIcon size={14} />
            블록 추가
          </button>
          {addMenuOpen && (
            <div id={`${addMenuId}-menu`} role="menu" aria-label="블록 추가" className={styles.menu} onKeyDown={(event) => event.key === 'Escape' && setAddMenuOpen(false)}>
              {blockTypeOptions.map((option) => (
                <button
                  key={option.type}
                  type="button"
                  role="menuitem"
                  className={styles.menuItem}
                  onClick={() => {
                    setAddMenuOpen(false)
                    insertAt(draft.blocks.length, option.type)
                  }}
                >
                  {option.label} <span className={styles.menuHint}>{option.hint}</span>
                </button>
              ))}
              <button
                type="button"
                role="menuitem"
                className={styles.menuItem}
                onClick={() => {
                  setAddMenuOpen(false)
                  setModal('resource')
                }}
              >
                <span>
                  <LinkIcon size={13} /> 자료함에서 자료 링크
                </span>
                <span className={styles.menuHint}>카드</span>
              </button>
            </div>
          )}
        </div>
      )}

      {modal === 'template' && (
        <TemplateModal
          hasContent={!empty}
          hasUnsavedChanges={unsaved}
          onClose={() => setModal(null)}
          onApply={(template, mode) => applyTemplate(template.templateId, mode)}
        />
      )}
      {modal === 'resource' && (
        <ResourcePickerModal
          onClose={() => setModal(null)}
          onPick={(resource) => {
            const block = createResourceBlock(resource)
            setBlocks((blocks) => [...blocks, block])
            setModal(null)
          }}
        />
      )}
      {modal === 'conflict' && draft.conflict && (
        <ConflictCompareModal
          noteId={draft.conflict.noteId}
          latestRevisionId={draft.conflict.revisionId}
          mine={toNoteBlocks(draft.blocks)}
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
            {draft.status === 'saving' ? '지금 저장하는 중이에요. 잠시 뒤 다시 시도해 주세요.' : '노트에 저장되지 않은 내용이 있어요. 머무르면 자동 저장되거나 다시 저장할 수 있어요.'}
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
