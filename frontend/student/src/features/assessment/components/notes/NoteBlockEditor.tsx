import { useEffect, useId, useLayoutEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import type { NoteBlockAttrs } from '../../api/types.ts'
import {
  blockCommands,
  blockLabel,
  calloutEmojis,
  codeLanguages,
  convertibleTypes,
  filterCommands,
  headingLevel,
  isHttpUrl,
  listBlockTypes,
  multilineBlockTypes,
  textBlockTypes,
  youtubeEmbedUrl,
  type BlockCommand,
  type EditorBlock,
} from '../../model/noteEditorModel.ts'
import { MoreIcon, PlusIcon } from '../AssessmentIcons.tsx'
import { sessionPreview, setSessionPreview } from '../../model/notePreviewStore.ts'
import { ChartPreview, FileMeta, MapCard, MathView, ResourceCard, VideoView, WebLinkCard } from './NoteBlockParts.tsx'
import { ExamSourceCard } from '../university/ExamSourceCard.tsx'
import { universityExamDocumentPath } from '../../routes/paths.ts'
import styles from './notes.module.css'

export interface FocusRequest {
  blockId: string
  caret: 'start' | 'end' | number
  /** 포커스한 뒤 "/" 메뉴를 연다 (블록 왼쪽 + 버튼으로 새로 만든 블록) */
  slash?: boolean
}

export type NavigateDirection = 'previous' | 'next'

interface NoteBlockEditorProps {
  block: EditorBlock
  /** 번호 목록 번호 (같은 들여쓰기의 연속 NUMBERED 기준) */
  number: number | undefined
  isFirst: boolean
  isLast: boolean
  /** 노트에 블록이 이것 하나뿐 (빈 노트의 시작 안내를 보여준다) */
  isOnly: boolean
  focusRequest: FocusRequest | undefined
  onFocusHandled: () => void
  onFocused: () => void
  onChange: (block: EditorBlock) => void
  /** Enter: 커서 앞뒤로 나눈다 */
  onSplit: (before: string, after: string) => void
  /** 글이 있는 블록 맨 앞에서 Enter: 위에 빈 블록 */
  onInsertAbove: () => void
  /** 맨 앞에서 Backspace (본문 블록): 앞 블록과 합치기 */
  onMergePrevious: () => void
  /** 맨 끝에서 Delete: 다음 블록을 끌어오기 */
  onMergeNext: () => void
  onNavigate: (direction: NavigateDirection, caret: 'start' | 'end') => void
  onIndent: (delta: 1 | -1) => void
  onInsertBelow: (withSlashMenu: boolean) => void
  onCommand: (command: BlockCommand) => void
  onConvert: (type: string, attrs?: NoteBlockAttrs) => void
  onMove: (delta: -1 | 1) => void
  onDuplicate: () => void
  onRemove: (focus: NavigateDirection | null) => void
  onPickResource: () => void
  /** "대학 기출 PDF" 블록의 문서·쪽 고르기 */
  onPickExamSource: () => void
  /** 출처 카드에서 원문을 열 때 돌아올 탐구 (심화 탐구 노트일 때) */
  examReturnTaskId?: string
}

const imageAccept = 'image/png,image/jpeg,image/gif,image/webp'
/** 이 화면 미리보기만 만드는 크기 (Mock 기준, 실제 업로드 한도 아님) */
const previewMaxBytes = 20 * 1024 * 1024

/** 글 블록 바꾸기 메뉴에 보이는 명령 (내용을 잃지 않는 전환만) */
const convertCommands = blockCommands.filter((command) => convertibleTypes.has(command.type))

// 블록 하나 편집 (경량 블록 편집기, OD-A05 결정 전. 새 Editor 패키지를 설치하지 않는다).
// 글 블록은 textarea 하나이고, 블록 사이 이동·나누기·합치기는 부모(NoteEditor)가 블록 목록에서 처리한다.
// 키보드: Enter 나누기 · Shift+Enter 줄바꿈 · Backspace(맨 앞) 합치기/유형 해제 · ↑↓←→ 블록 이동 · Tab/Shift+Tab 목록 들여쓰기 ·
// Alt+↑↓ 순서 이동 · "/" 블록 메뉴. 한글 조합 중(isComposing)에는 Enter·Backspace를 가로채지 않는다.
export function NoteBlockEditor(props: NoteBlockEditorProps) {
  const { block, number, isFirst, isLast, isOnly, focusRequest, onFocusHandled, onFocused, onChange } = props
  const [menu, setMenu] = useState<'actions' | 'types' | null>(null)
  // 블록 왼쪽 +로 만든 새 블록은 "/" 메뉴가 열린 채로 시작한다.
  const [slash, setSlash] = useState<{ query: string; active: number } | null>(() =>
    focusRequest?.slash && block.text === '/' ? { query: '', active: 0 } : null,
  )
  const [focused, setFocused] = useState(false)
  const menuId = useId()
  const rootRef = useRef<HTMLLIElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const slashOptions = slash ? filterCommands(slash.query) : []
  const isText = textBlockTypes.has(block.type)
  const isMultiline = multilineBlockTypes.has(block.type)

  // 부모가 요청한 블록·위치로 포커스 (나누기·합치기·화살표 이동·새 블록)
  useLayoutEffect(() => {
    if (!focusRequest || focusRequest.blockId !== block.blockId) return
    const target = rootRef.current?.querySelector<HTMLElement>('[data-focus-target]')
    if (target) {
      target.focus()
      if (target instanceof HTMLTextAreaElement || (target instanceof HTMLInputElement && target.type === 'text')) {
        const length = target.value.length
        const position = focusRequest.caret === 'end' ? length : focusRequest.caret === 'start' ? 0 : Math.min(focusRequest.caret, length)
        target.setSelectionRange(position, position)
      }
    }
    onFocusHandled()
  }, [block.blockId, focusRequest, onFocusHandled])

  useEffect(() => {
    if (!menu) return
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [menu])

  useEffect(() => {
    if (!slash) return
    document.getElementById(`${menuId}-slash-${slash.active}`)?.scrollIntoView({ block: 'nearest' })
  }, [menuId, slash])

  const runCommand = (command: BlockCommand) => {
    setSlash(null)
    props.onCommand(command)
  }

  const onTextKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // 한글 등 조합 중 입력은 브라우저에 맡긴다 (조합 확정 Enter가 블록을 나누지 않게).
    if (event.nativeEvent.isComposing || event.keyCode === 229) return
    const element = event.currentTarget
    const { selectionStart, selectionEnd, value } = element
    const collapsed = selectionStart === selectionEnd

    if (slash) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        if (slashOptions.length === 0) return
        const delta = event.key === 'ArrowDown' ? 1 : -1
        setSlash({ ...slash, active: (slash.active + delta + slashOptions.length) % slashOptions.length })
        return
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault()
        const command = slashOptions[slash.active]
        if (command) runCommand(command)
        else setSlash(null)
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        setSlash(null)
        return
      }
    }

    if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault()
      props.onMove(event.key === 'ArrowUp' ? -1 : 1)
      return
    }

    if (event.key === 'Tab') {
      if (listBlockTypes.has(block.type)) {
        event.preventDefault()
        props.onIndent(event.shiftKey ? -1 : 1)
      } else if (block.type === 'CODE' && !event.shiftKey) {
        event.preventDefault()
        insertAtCaret(element, '  ')
      }
      return
    }

    if (event.key === 'Enter') {
      if (isMultiline) {
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          props.onInsertBelow(false)
        }
        return
      }
      if (event.shiftKey) return
      event.preventDefault()
      if (value === '' && block.type !== 'PARAGRAPH' && block.type !== 'HEADING') {
        // 빈 목록·인용·토글·강조에서 Enter: 들여쓰기를 줄이거나 본문으로 빠져나온다 (Notion과 같다).
        if (listBlockTypes.has(block.type) && (block.attrs?.indent ?? 0) > 0) props.onIndent(-1)
        else props.onConvert('PARAGRAPH')
        return
      }
      if (collapsed && selectionStart === 0 && value !== '') {
        props.onInsertAbove()
        return
      }
      props.onSplit(value.slice(0, selectionStart), value.slice(selectionEnd))
      return
    }

    if (event.key === 'Backspace' && collapsed && selectionStart === 0) {
      if (block.type === 'PARAGRAPH') {
        if (isFirst) return
        event.preventDefault()
        props.onMergePrevious()
        return
      }
      event.preventDefault()
      if (listBlockTypes.has(block.type) && (block.attrs?.indent ?? 0) > 0) props.onIndent(-1)
      else props.onConvert('PARAGRAPH')
      return
    }

    if (event.key === 'Delete' && collapsed && selectionStart === value.length && !isLast && !isMultiline) {
      event.preventDefault()
      props.onMergeNext()
      return
    }

    if (event.key === 'ArrowUp' && !isFirst && collapsed && caretOnFirstLine(element)) {
      event.preventDefault()
      props.onNavigate('previous', 'end')
      return
    }
    if (event.key === 'ArrowDown' && !isLast && collapsed && caretOnLastLine(element)) {
      event.preventDefault()
      props.onNavigate('next', 'start')
      return
    }
    if (event.key === 'ArrowLeft' && !isFirst && collapsed && selectionStart === 0) {
      event.preventDefault()
      props.onNavigate('previous', 'end')
      return
    }
    if (event.key === 'ArrowRight' && !isLast && collapsed && selectionStart === value.length) {
      event.preventDefault()
      props.onNavigate('next', 'start')
    }
  }

  const onTextChange = (value: string) => {
    // 빈 블록에서 "/"를 입력하면 블록 메뉴를 연다. "/" 뒤 글자로 메뉴를 거른다.
    if (!slash && isText && block.text === '' && value === '/') setSlash({ query: '', active: 0 })
    else if (slash) {
      if (!value.startsWith('/') || value.includes('\n') || value.length > 24) setSlash(null)
      else setSlash({ query: value.slice(1), active: 0 })
    }
    onChange({ ...block, text: value })
  }

  // 제목·본문 등 아닌 블록의 입력칸(주소·장소 등)에서 ↑↓로 블록 사이를 오간다.
  const onFieldKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.nativeEvent.isComposing) return
    const target = event.target as HTMLElement
    if (target instanceof HTMLTextAreaElement) return
    if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault()
      props.onMove(event.key === 'ArrowUp' ? -1 : 1)
      return
    }
    if (target.closest('table') || target instanceof HTMLSelectElement) return
    if (event.key === 'ArrowUp' && !isFirst) {
      event.preventDefault()
      props.onNavigate('previous', 'end')
    } else if (event.key === 'ArrowDown' && !isLast) {
      event.preventDefault()
      props.onNavigate('next', 'start')
    } else if (target.dataset.focusTarget === 'block' && (event.key === 'Backspace' || event.key === 'Delete')) {
      event.preventDefault()
      props.onRemove(event.key === 'Backspace' ? 'previous' : 'next')
    } else if (target.dataset.focusTarget === 'block' && event.key === 'Enter') {
      event.preventDefault()
      props.onInsertBelow(false)
    }
  }

  const placeholder = block.attrs?.placeholder ?? defaultPlaceholder(block.type, focused || isOnly)
  const textArea = (extra?: { className?: string; label?: string; placeholder?: string }) => (
    <AutoTextarea
      textRef={textRef}
      value={block.text}
      placeholder={extra?.placeholder ?? placeholder}
      label={extra?.label ?? blockLabel(block)}
      className={extra?.className}
      slash={slash ? { listId: `${menuId}-slash`, activeId: slashOptions.length > 0 ? `${menuId}-slash-${slash.active}` : undefined } : undefined}
      onChange={onTextChange}
      onKeyDown={onTextKeyDown}
    />
  )
  const set = (attrs: NoteBlockAttrs) => onChange({ ...block, attrs: { ...block.attrs, ...attrs } })
  const indent = listBlockTypes.has(block.type) ? (block.attrs?.indent ?? 0) : 0

  return (
    <li
      ref={rootRef}
      className={styles.block}
      data-type={block.type}
      data-level={block.type === 'HEADING' ? headingLevel(block) : undefined}
      onFocus={() => {
        setFocused(true)
        onFocused()
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocused(false)
          setSlash(null)
        }
      }}
      onKeyDown={isText || isMultiline ? undefined : onFieldKeyDown}
    >
      <div className={styles.gutter} data-open={menu ? 'true' : undefined}>
        <button type="button" className={styles.gutterButton} data-optional="true" aria-label="아래에 블록 추가" title="아래에 블록 추가 (/ 메뉴가 열려요)" onClick={() => props.onInsertBelow(true)}>
          <PlusIcon size={14} />
        </button>
        <div ref={menuRef} className={styles.menuWrap}>
          <button
            type="button"
            className={styles.gutterButton}
            aria-label={`${blockLabel(block)} 블록 메뉴`}
            aria-haspopup="menu"
            aria-expanded={menu !== null}
            aria-controls={menu ? menuId : undefined}
            onClick={() => setMenu(menu ? null : 'actions')}
          >
            <MoreIcon size={14} />
          </button>
          {menu && (
            <div
              id={menuId}
              role="menu"
              aria-label="블록 메뉴"
              className={styles.menu}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.stopPropagation()
                  setMenu(null)
                  rootRef.current?.querySelector<HTMLElement>('[data-focus-target]')?.focus()
                }
              }}
            >
              {menu === 'actions' ? (
                <>
                  <button type="button" role="menuitem" className={styles.menuItem} disabled={isFirst} onClick={() => { setMenu(null); props.onMove(-1) }}>
                    위로 이동 <span className={styles.menuHint}>Alt+↑</span>
                  </button>
                  <button type="button" role="menuitem" className={styles.menuItem} disabled={isLast} onClick={() => { setMenu(null); props.onMove(1) }}>
                    아래로 이동 <span className={styles.menuHint}>Alt+↓</span>
                  </button>
                  <button type="button" role="menuitem" className={styles.menuItem} onClick={() => { setMenu(null); props.onDuplicate() }}>
                    복제
                  </button>
                  {convertibleTypes.has(block.type) && (
                    <button type="button" role="menuitem" className={styles.menuItem} onClick={() => setMenu('types')}>
                      유형 바꾸기 <span className={styles.menuHint}>›</span>
                    </button>
                  )}
                  <button type="button" role="menuitem" className={styles.menuItem} data-danger="true" onClick={() => { setMenu(null); props.onRemove(null) }}>
                    블록 삭제
                  </button>
                </>
              ) : (
                <>
                  <span className={styles.menuLabel}>블록 유형 (글은 그대로 남아요)</span>
                  {convertCommands.map((command) => (
                    <button
                      key={command.id}
                      type="button"
                      role="menuitem"
                      className={styles.menuItem}
                      aria-current={command.type === block.type && (command.type !== 'HEADING' || command.attrs?.level === headingLevel(block)) ? 'true' : undefined}
                      onClick={() => {
                        setMenu(null)
                        props.onConvert(command.type, command.attrs)
                      }}
                    >
                      <span className={styles.commandName}>
                        <span className={styles.commandIcon} aria-hidden="true">{command.icon}</span>
                        {command.label}
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.blockBody} style={indent ? { paddingLeft: indent * 24 } : undefined}>
        {block.type === 'HEADING' && textArea()}
        {block.type === 'PARAGRAPH' && textArea()}
        {block.type === 'QUOTE' && <div className={styles.quote}>{textArea()}</div>}
        {(block.type === 'BULLET' || block.type === 'NUMBERED') && (
          <div className={styles.listRow}>
            <span className={styles.listMarker} aria-hidden="true">
              {block.type === 'BULLET' ? (indent % 2 === 1 ? '◦' : '•') : `${number ?? 1}.`}
            </span>
            {textArea()}
          </div>
        )}
        {block.type === 'CHECKLIST' && (
          <div className={styles.listRow} data-checked={block.attrs?.checked ? 'true' : undefined}>
            <input
              type="checkbox"
              checked={Boolean(block.attrs?.checked)}
              aria-label={`${block.text || '체크리스트 항목'} 완료`}
              onChange={(event) => set({ checked: event.target.checked })}
            />
            {textArea()}
          </div>
        )}
        {block.type === 'TOGGLE' && <ToggleEditor block={block} textArea={textArea} onChange={onChange} />}
        {block.type === 'CALLOUT' && (
          <div className={styles.callout}>
            <EmojiPicker value={block.attrs?.emoji ?? '💡'} onChange={(emoji) => set({ emoji })} />
            {textArea()}
          </div>
        )}
        {block.type === 'CODE' && (
          <div className={styles.codeBlock}>
            <div className={styles.codeHead}>
              <label className="lh-visually-hidden" htmlFor={`${menuId}-lang`}>
                코드 언어
              </label>
              <select id={`${menuId}-lang`} className={styles.codeLanguage} value={block.attrs?.language ?? 'plain'} onChange={(event) => set({ language: event.target.value })}>
                {codeLanguages.map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
              <span className={styles.menuHint}>Ctrl+Enter 다음 블록 · 실행·색 구분 없음</span>
            </div>
            {textArea({ className: styles.codeText, label: '코드', placeholder: '코드를 입력하세요' })}
          </div>
        )}
        {block.type === 'MATH' && (
          <div className={styles.mathBlock}>
            {textArea({ className: styles.codeText, label: '수식 (LaTeX)', placeholder: '예: \\frac{a}{b} = c^2' })}
            {block.text.trim() !== '' && <MathView source={block.text} />}
          </div>
        )}
        {block.type === 'DIVIDER' && (
          <div className={styles.divider} role="separator" aria-label="구분선 (Backspace로 삭제, Enter로 아래에 새 줄)" tabIndex={0} data-focus-target="block">
            <hr />
          </div>
        )}
        {block.type === 'TABLE' && <TableEditor block={block} onChange={onChange} />}
        {block.type === 'CHART' && (
          <div className={styles.chartBlock}>
            <input
              className={styles.fieldInput}
              value={block.text}
              placeholder="차트 제목"
              aria-label="차트 제목"
              data-focus-target="field"
              type="text"
              onChange={(event) => onChange({ ...block, text: event.target.value })}
            />
            <TableEditor block={block} onChange={onChange} fixedColumns />
            <ChartPreview rows={block.attrs?.rows} title={block.text} />
          </div>
        )}
        {block.type === 'RESOURCE_LINK' &&
          (block.attrs?.resource ? (
            <div tabIndex={0} data-focus-target="block" className={styles.focusCard} aria-label={`참고자료 ${block.attrs.resource.title}`}>
              <ResourceCard resource={block.attrs.resource} fallbackTitle={block.text} withDetailLink />
            </div>
          ) : (
            <div className={styles.mediaEmpty}>
              <button type="button" className={styles.mediaButton} data-focus-target="field" onClick={props.onPickResource}>
                📚 자료함에서 참고자료 고르기
              </button>
              <span className={styles.menuHint}>원문을 복사하지 않고 출처 카드로 연결해요</span>
            </div>
          ))}
        {block.type === 'EXAM_SOURCE' &&
          (block.attrs?.examSource ? (
            <div tabIndex={0} data-focus-target="block" className={styles.focusCard} aria-label={`대학 기출 PDF 출처 ${block.text}`}>
              <ExamSourceCard
                title={block.text}
                line={block.attrs.examSource.label}
                to={universityExamDocumentPath(block.attrs.examSource.documentId, { page: block.attrs.examSource.pageStart, task: props.examReturnTaskId })}
              />
            </div>
          ) : (
            <div className={styles.mediaEmpty}>
              <button type="button" className={styles.mediaButton} data-focus-target="field" onClick={props.onPickExamSource}>
                🏛 대학 기출 PDF 고르기
              </button>
              <span className={styles.menuHint}>원문을 복사하지 않고 문서와 쪽만 출처 카드로 연결해요</span>
            </div>
          ))}
        {block.type === 'LINK' && <UrlEditor block={block} kind="LINK" onChange={onChange} />}
        {block.type === 'VIDEO' && <UrlEditor block={block} kind="VIDEO" onChange={onChange} />}
        {block.type === 'MAP' && <MapEditor block={block} onChange={onChange} />}
        {(block.type === 'IMAGE' || block.type === 'FILE') && <FileEditor block={block} onChange={onChange} />}
        {!knownTypes.has(block.type) && (
          <p className={styles.provisional} tabIndex={0} data-focus-target="block">
            이 블록 유형({block.type})은 아직 편집할 수 없어요. 내용은 그대로 보존돼요.
          </p>
        )}

        {slash && (
          <div id={`${menuId}-slash`} role="listbox" aria-label="블록 메뉴" className={styles.slashMenu}>
            {slashOptions.length === 0 ? (
              <p className={styles.slashEmpty}>맞는 블록이 없어요. Esc로 닫아요.</p>
            ) : (
              slashOptions.map((command, index) => (
                <div
                  key={command.id}
                  id={`${menuId}-slash-${index}`}
                  role="option"
                  aria-selected={index === slash.active}
                  className={styles.slashItem}
                  onPointerDown={(event) => event.preventDefault()}
                  onPointerEnter={() => setSlash({ ...slash, active: index })}
                  onClick={() => runCommand(command)}
                >
                  <span className={styles.commandIcon} aria-hidden="true">
                    {command.icon}
                  </span>
                  <span className={styles.slashText}>
                    <span className={styles.slashLabel}>{command.label}</span>
                    <span className={styles.slashDescription}>{command.description}</span>
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </li>
  )
}

const knownTypes = new Set<string>([...textBlockTypes, ...multilineBlockTypes, 'DIVIDER', 'TABLE', 'CHART', 'RESOURCE_LINK', 'EXAM_SOURCE', 'LINK', 'VIDEO', 'MAP', 'IMAGE', 'FILE'])

function defaultPlaceholder(type: string, active: boolean): string {
  switch (type) {
    case 'HEADING':
      return '제목'
    case 'BULLET':
    case 'NUMBERED':
      return '목록'
    case 'CHECKLIST':
      return '할 일'
    case 'QUOTE':
      return '인용·메모'
    case 'TOGGLE':
      return '토글 제목'
    case 'CALLOUT':
      return '강조할 내용'
    default:
      return active ? "내용을 입력하거나 '/'로 블록을 고르세요" : ''
  }
}

function lineHeightOf(element: HTMLTextAreaElement): number {
  const style = window.getComputedStyle(element)
  const lineHeight = Number.parseFloat(style.lineHeight)
  return Number.isFinite(lineHeight) ? lineHeight : Number.parseFloat(style.fontSize) * 1.5
}

/** 한 줄로만 보이는 textarea인지 (자동 줄바꿈 포함) */
function isSingleVisualLine(element: HTMLTextAreaElement): boolean {
  const style = window.getComputedStyle(element)
  const padding = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom)
  return element.scrollHeight - padding <= lineHeightOf(element) * 1.5
}

/** 위 화살표로 앞 블록에 갈 때: 커서 앞에 줄바꿈이 없고, 맨 앞이거나 한 줄짜리 블록 */
function caretOnFirstLine(element: HTMLTextAreaElement): boolean {
  const position = element.selectionStart
  if (element.value.slice(0, position).includes('\n')) return false
  return position === 0 || isSingleVisualLine(element)
}

function caretOnLastLine(element: HTMLTextAreaElement): boolean {
  const position = element.selectionEnd
  if (element.value.slice(position).includes('\n')) return false
  return position === element.value.length || isSingleVisualLine(element)
}

/** 커서 자리에 글자를 넣는다. 브라우저가 커서를 넣은 글자 뒤에 두고, input 이벤트로 React 상태를 맞춘다 (빠르게 이어 쳐도 커서가 튀지 않게). */
function insertAtCaret(element: HTMLTextAreaElement, text: string) {
  element.setRangeText(text, element.selectionStart, element.selectionEnd, 'end')
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

interface AutoTextareaProps {
  textRef: RefObject<HTMLTextAreaElement | null>
  value: string
  placeholder: string
  label: string
  className?: string
  slash?: { listId: string; activeId: string | undefined }
  onChange: (value: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
}

function AutoTextarea({ textRef, value, placeholder, label, className, slash, onChange, onKeyDown }: AutoTextareaProps) {
  // 내용 높이에 맞춰 늘어난다 (Notion형 블록처럼 스크롤 없이 이어서 보이게).
  useLayoutEffect(() => {
    const element = textRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight}px`
  }, [textRef, value])
  return (
    <textarea
      ref={textRef}
      className={`${styles.textArea}${className ? ` ${className}` : ''}`}
      value={value}
      rows={1}
      placeholder={placeholder}
      aria-label={label}
      data-focus-target="text"
      aria-haspopup="listbox"
      aria-expanded={slash ? true : undefined}
      aria-controls={slash?.listId}
      aria-activedescendant={slash?.activeId}
      aria-autocomplete={slash ? 'list' : undefined}
      spellCheck={false}
      onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
    />
  )
}

function ToggleEditor({ block, textArea, onChange }: { block: EditorBlock; textArea: () => ReactNode; onChange: (block: EditorBlock) => void }) {
  // 펼침 여부는 화면 상태다 (저장하지 않음). 내용은 attrs.body에 저장한다.
  const [open, setOpen] = useState(true)
  const bodyId = useId()
  return (
    <div className={styles.toggle}>
      <div className={styles.toggleHead}>
        <button type="button" className={styles.toggleButton} aria-expanded={open} aria-controls={bodyId} aria-label={open ? '토글 접기' : '토글 펼치기'} onClick={() => setOpen(!open)}>
          <span aria-hidden="true" data-open={open}>
            ▸
          </span>
        </button>
        {textArea()}
      </div>
      {open && (
        <div id={bodyId} className={styles.toggleBody}>
          <BodyTextarea value={block.attrs?.body ?? ''} onChange={(body) => onChange({ ...block, attrs: { ...block.attrs, body } })} />
        </div>
      )}
    </div>
  )
}

function BodyTextarea({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight}px`
  }, [value])
  return (
    <textarea
      ref={ref}
      className={styles.textArea}
      value={value}
      rows={1}
      placeholder="펼쳤을 때 보일 내용 (Enter 줄바꿈)"
      aria-label="토글 내용"
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

function EmojiPicker({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const wrapRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])
  return (
    <span ref={wrapRef} className={styles.menuWrap}>
      <button type="button" className={styles.emojiButton} aria-label={`강조 아이콘 ${value} 바꾸기`} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(!open)}>
        {value}
      </button>
      {open && (
        <span id={id} role="menu" aria-label="강조 아이콘" className={styles.emojiMenu} onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}>
          {calloutEmojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              role="menuitemradio"
              aria-checked={emoji === value}
              className={styles.emojiOption}
              onClick={() => {
                onChange(emoji)
                setOpen(false)
              }}
            >
              {emoji}
            </button>
          ))}
        </span>
      )}
    </span>
  )
}

function TableEditor({ block, onChange, fixedColumns = false }: { block: EditorBlock; onChange: (block: EditorBlock) => void; fixedColumns?: boolean }) {
  const rows = block.attrs?.rows ?? [['']]
  const setRows = (next: string[][]) => onChange({ ...block, attrs: { ...block.attrs, rows: next } })
  const columnCount = rows[0]?.length ?? 1
  return (
    <div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>
                    <input
                      className={styles.cellInput}
                      value={cell}
                      type="text"
                      data-focus-target={rowIndex === 0 && cellIndex === 0 && !fixedColumns ? 'field' : undefined}
                      aria-label={`표 ${rowIndex + 1}행 ${cellIndex + 1}열${rowIndex === 0 ? ' (머리글)' : ''}`}
                      onChange={(event) =>
                        setRows(rows.map((r, ri) => (ri === rowIndex ? r.map((c, ci) => (ci === cellIndex ? event.target.value : c)) : r)))
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.tableActions}>
        <button type="button" className={styles.tinyButton} onClick={() => setRows([...rows, rows[0].map(() => '')])}>
          + 행 추가
        </button>
        {!fixedColumns && (
          <button type="button" className={styles.tinyButton} onClick={() => setRows(rows.map((row) => [...row, '']))}>
            + 열 추가
          </button>
        )}
        <button type="button" className={styles.tinyButton} disabled={rows.length <= 2} onClick={() => setRows(rows.slice(0, -1))}>
          − 마지막 행 삭제
        </button>
        {!fixedColumns && (
          <button type="button" className={styles.tinyButton} disabled={columnCount <= 1} onClick={() => setRows(rows.map((row) => row.slice(0, -1)))}>
            − 마지막 열 삭제
          </button>
        )}
      </div>
    </div>
  )
}

function UrlEditor({ block, kind, onChange }: { block: EditorBlock; kind: 'LINK' | 'VIDEO'; onChange: (block: EditorBlock) => void }) {
  const url = block.attrs?.url ?? ''
  const [draft, setDraft] = useState(url)
  const [error, setError] = useState<string>()
  const inputId = useId()
  const apply = () => {
    const value = draft.trim()
    if (value === '') return
    if (!isHttpUrl(value)) {
      setError('http:// 또는 https://로 시작하는 주소를 입력해 주세요.')
      return
    }
    setError(undefined)
    onChange({ ...block, attrs: { ...block.attrs, url: value } })
  }
  if (url) {
    return (
      <div className={styles.mediaBlock}>
        {kind === 'VIDEO' ? <VideoView url={url} title={block.text} embed /> : <WebLinkCard url={url} title={block.text} />}
        {kind === 'VIDEO' && !youtubeEmbedUrl(url) && <p className={styles.mediaCaption}>YouTube 외 주소는 화면에 삽입하지 않고 링크로 보여줘요.</p>}
        <div className={styles.inlineFields}>
          <input
            className={styles.fieldInput}
            type="text"
            value={block.text}
            placeholder={kind === 'VIDEO' ? '동영상 제목 (선택)' : '링크 제목 (선택)'}
            aria-label={kind === 'VIDEO' ? '동영상 제목' : '링크 제목'}
            data-focus-target="field"
            onChange={(event) => onChange({ ...block, text: event.target.value })}
          />
          <button type="button" className={styles.tinyButton} onClick={() => onChange({ ...block, attrs: { ...block.attrs, url: undefined } })}>
            주소 바꾸기
          </button>
        </div>
      </div>
    )
  }
  return (
    <div className={styles.mediaEmpty}>
      <label className="lh-visually-hidden" htmlFor={inputId}>
        {kind === 'VIDEO' ? '동영상 주소' : '링크 주소'}
      </label>
      <input
        id={inputId}
        className={styles.fieldInput}
        type="text"
        inputMode="url"
        value={draft}
        placeholder={kind === 'VIDEO' ? 'YouTube 또는 동영상 주소 붙여넣기' : 'https:// 주소 붙여넣기'}
        data-focus-target="field"
        aria-invalid={error ? true : undefined}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
            event.preventDefault()
            event.stopPropagation()
            apply()
          }
        }}
      />
      <button type="button" className={styles.mediaButton} onClick={apply} disabled={draft.trim() === ''}>
        {kind === 'VIDEO' ? '동영상 넣기' : '링크 넣기'}
      </button>
      {error && (
        <p className={styles.mathError} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function MapEditor({ block, onChange }: { block: EditorBlock; onChange: (block: EditorBlock) => void }) {
  const url = block.attrs?.url ?? ''
  const urlInvalid = url !== '' && !isHttpUrl(url)
  return (
    <div className={styles.mediaBlock}>
      <div className={styles.inlineFields}>
        <input
          className={styles.fieldInput}
          type="text"
          value={block.attrs?.place ?? ''}
          placeholder="장소 이름 (예: 국립중앙과학관)"
          aria-label="장소 이름"
          data-focus-target="field"
          onChange={(event) => onChange({ ...block, attrs: { ...block.attrs, place: event.target.value } })}
        />
        <input
          className={styles.fieldInput}
          type="text"
          inputMode="url"
          value={url}
          placeholder="지도 링크 (선택)"
          aria-label="지도 링크"
          aria-invalid={urlInvalid || undefined}
          onChange={(event) => onChange({ ...block, attrs: { ...block.attrs, url: event.target.value || undefined } })}
        />
      </div>
      {urlInvalid && <p className={styles.mathError}>지도 링크는 http:// 또는 https://로 시작해야 열 수 있어요.</p>}
      {(block.attrs?.place || url) && <MapCard place={block.attrs?.place ?? ''} url={url || undefined} />}
    </div>
  )
}

function FileEditor({ block, onChange }: { block: EditorBlock; onChange: (block: EditorBlock) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState(() => sessionPreview(block.blockId))
  const [notice, setNotice] = useState<string>()
  const file = block.attrs?.file
  const isImage = block.type === 'IMAGE'
  const pdfOnly = !isImage && file?.mimeType === 'application/pdf' && !file.name
  const accept = isImage ? imageAccept : pdfOnly ? 'application/pdf' : undefined
  const choose = (chosen: File | undefined) => {
    if (!chosen) return
    if (isImage && !imageAccept.split(',').includes(chosen.type)) {
      setNotice('PNG·JPG·GIF·WEBP 이미지만 넣을 수 있어요.')
      return
    }
    if (pdfOnly && chosen.type !== 'application/pdf') {
      setNotice('PDF 파일만 넣을 수 있어요.')
      return
    }
    setNotice(chosen.size > previewMaxBytes ? '20MB보다 커서 미리보기는 만들지 않고 파일 정보만 기록했어요.' : undefined)
    setPreview(chosen.size > previewMaxBytes ? undefined : setSessionPreview(block.blockId, chosen))
    onChange({ ...block, attrs: { ...block.attrs, file: { name: chosen.name, size: chosen.size, mimeType: chosen.type || 'application/octet-stream' } } })
  }
  const label = isImage ? '이미지' : pdfOnly || file?.mimeType === 'application/pdf' ? 'PDF' : '파일'
  return (
    <div className={styles.mediaBlock}>
      <input ref={inputRef} type="file" hidden accept={accept} onChange={(event) => { choose(event.target.files?.[0]); event.target.value = '' }} />
      {file?.name ? (
        <>
          <FileMeta file={file} previewUrl={preview} isImage={isImage} />
          <button type="button" className={styles.tinyButton} data-focus-target="field" onClick={() => inputRef.current?.click()}>
            다른 {label} 고르기
          </button>
        </>
      ) : (
        <div className={styles.mediaEmpty}>
          <button type="button" className={styles.mediaButton} data-focus-target="field" onClick={() => inputRef.current?.click()}>
            {isImage ? '🖼' : '📎'} {label} 고르기
          </button>
          <span className={styles.menuHint}>이 화면에서만 미리보기 · 서버에 저장되지 않아요 (파일 저장소 미정)</span>
        </div>
      )}
      {notice && (
        <p className={styles.mathError} role="status">
          {notice}
        </p>
      )}
    </div>
  )
}
