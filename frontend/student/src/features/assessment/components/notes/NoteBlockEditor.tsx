import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import { Link } from 'react-router'
import { blockTypeOptions, textBlockTypes, type EditorBlock } from '../../model/noteEditorModel.ts'
import { resourceTypeLabel } from '../../model/resourceLibraryView.ts'
import { resourceDetailPath } from '../../routes/paths.ts'
import { LinkIcon, MoreIcon, PlusIcon } from '../AssessmentIcons.tsx'
import styles from './notes.module.css'

interface NoteBlockEditorProps {
  block: EditorBlock
  /** 번호 목록 번호 (연속 NUMBERED 기준) */
  number: number | undefined
  isFirst: boolean
  isLast: boolean
  autoFocus: boolean
  onFocused: () => void
  onChange: (block: EditorBlock) => void
  onInsertBelow: () => void
  onConvert: (type: string) => void
  onMove: (delta: -1 | 1) => void
  onRemove: (focusPrevious: boolean) => void
}

// 블록 하나 편집 (경량 편집기, OD-A05 결정 전). 텍스트 블록은 textarea, 표는 셀 입력, 링크 카드는 자료함 참조를 보여준다.
// 키보드: 빈 블록에서 "/" → 블록 유형 메뉴, 빈 블록에서 Backspace → 블록 삭제, Alt+↑/↓ → 순서 이동.
// 드래그 이동은 Editor 라이브러리 결정 뒤 붙인다. 지금은 ⋮⋮ 메뉴의 위로/아래로로 옮긴다.
export function NoteBlockEditor(props: NoteBlockEditorProps) {
  const { block, number, isFirst, isLast, autoFocus, onFocused, onChange, onInsertBelow, onConvert, onMove, onRemove } = props
  const [menu, setMenu] = useState<'actions' | 'types' | null>(null)
  const menuId = useId()
  const textRef = useRef<HTMLTextAreaElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const isText = textBlockTypes.has(block.type)

  useEffect(() => {
    if (!autoFocus) return
    const target = textRef.current ?? menuRef.current?.parentElement?.querySelector<HTMLElement>('input, textarea')
    target?.focus()
    onFocused()
  }, [autoFocus, onFocused])

  useEffect(() => {
    if (!menu) return
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [menu])

  const onTextKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault()
      onMove(event.key === 'ArrowUp' ? -1 : 1)
      return
    }
    if (event.key === 'Backspace' && block.text === '' && !isFirst) {
      event.preventDefault()
      onRemove(true)
      return
    }
    if (event.key === 'Escape' && menu) {
      event.stopPropagation()
      setMenu(null)
    }
  }

  const onTextChange = (value: string) => {
    // 빈 줄에서 "/"를 입력하면 블록 유형을 고른다 (Mockup 안내 "빈 줄에서 / 블록 추가").
    if (block.text === '' && value === '/') {
      setMenu('types')
      return
    }
    onChange({ ...block, text: value })
  }

  const textArea = (placeholder: string) => (
    <AutoTextarea
      textRef={textRef}
      value={block.text}
      placeholder={placeholder}
      label={blockLabel(block.type)}
      onChange={onTextChange}
      onKeyDown={onTextKeyDown}
    />
  )

  return (
    <li className={styles.block} data-type={block.type}>
      <div className={styles.gutter} data-open={menu ? 'true' : undefined}>
        <button type="button" className={styles.gutterButton} data-optional="true" aria-label="아래에 블록 추가" onClick={onInsertBelow}>
          <PlusIcon size={14} />
        </button>
        <div ref={menuRef} className={styles.menuWrap}>
          <button
            type="button"
            className={styles.gutterButton}
            aria-label={`${blockLabel(block.type)} 블록 메뉴`}
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
                  textRef.current?.focus()
                }
              }}
            >
              {menu === 'actions' ? (
                <>
                  <button type="button" role="menuitem" className={styles.menuItem} disabled={isFirst} onClick={() => { setMenu(null); onMove(-1) }}>
                    위로 이동 <span className={styles.menuHint}>Alt+↑</span>
                  </button>
                  <button type="button" role="menuitem" className={styles.menuItem} disabled={isLast} onClick={() => { setMenu(null); onMove(1) }}>
                    아래로 이동 <span className={styles.menuHint}>Alt+↓</span>
                  </button>
                  {isText && (
                    <button type="button" role="menuitem" className={styles.menuItem} onClick={() => setMenu('types')}>
                      유형 바꾸기 <span className={styles.menuHint}>›</span>
                    </button>
                  )}
                  <button type="button" role="menuitem" className={styles.menuItem} data-danger="true" onClick={() => { setMenu(null); onRemove(false) }}>
                    블록 삭제
                  </button>
                </>
              ) : (
                <>
                  <span className={styles.menuLabel}>블록 유형</span>
                  {blockTypeOptions
                    .filter((option) => textBlockTypes.has(option.type))
                    .map((option) => (
                      <button
                        key={option.type}
                        type="button"
                        role="menuitem"
                        className={styles.menuItem}
                        aria-current={option.type === block.type ? 'true' : undefined}
                        onClick={() => {
                          setMenu(null)
                          // 유형이 바뀌면 입력 요소가 다시 그려지므로 포커스는 부모가 새 요소에 다시 준다.
                          onConvert(option.type)
                        }}
                      >
                        {option.label} <span className={styles.menuHint}>{option.hint}</span>
                      </button>
                    ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.blockBody}>
        {block.type === 'HEADING' && textArea('소제목')}
        {block.type === 'PARAGRAPH' && textArea('내용을 입력하세요. 빈 줄에서 / 를 누르면 블록을 고를 수 있어요')}
        {block.type === 'QUOTE' && <div className={styles.quote}>{textArea('인용·메모')}</div>}
        {(block.type === 'BULLET' || block.type === 'NUMBERED') && (
          <div className={styles.listRow}>
            <span className={styles.listMarker} aria-hidden="true">
              {block.type === 'BULLET' ? '•' : `${number ?? 1}.`}
            </span>
            {textArea('목록 항목')}
          </div>
        )}
        {block.type === 'CHECKLIST' && (
          <div className={styles.listRow} data-checked={block.attrs?.checked ? 'true' : undefined}>
            <input
              type="checkbox"
              checked={Boolean(block.attrs?.checked)}
              aria-label={`${block.text || '체크리스트 항목'} 완료`}
              onChange={(event) => onChange({ ...block, attrs: { ...block.attrs, checked: event.target.checked } })}
            />
            {textArea('할 일')}
          </div>
        )}
        {block.type === 'TABLE' && <TableEditor block={block} onChange={onChange} />}
        {block.type === 'RESOURCE_LINK' && <ResourceLinkCard block={block} />}
        {!isText && block.type !== 'TABLE' && block.type !== 'RESOURCE_LINK' && (
          <p className={styles.provisional}>이 블록 유형({block.type})은 아직 편집할 수 없어요. 내용은 그대로 보존돼요.</p>
        )}
      </div>
    </li>
  )
}

function blockLabel(type: string): string {
  if (type === 'RESOURCE_LINK') return '자료 링크'
  return blockTypeOptions.find((option) => option.type === type)?.label ?? '블록'
}

interface AutoTextareaProps {
  textRef: RefObject<HTMLTextAreaElement | null>
  value: string
  placeholder: string
  label: string
  onChange: (value: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
}

function AutoTextarea({ textRef, value, placeholder, label, onChange, onKeyDown }: AutoTextareaProps) {
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
      className={styles.textArea}
      value={value}
      rows={1}
      placeholder={placeholder}
      aria-label={label}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
    />
  )
}

function TableEditor({ block, onChange }: { block: EditorBlock; onChange: (block: EditorBlock) => void }) {
  const rows = block.attrs?.rows ?? [['']]
  const setRows = (next: string[][]) => onChange({ ...block, attrs: { ...block.attrs, rows: next } })
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
          + 행
        </button>
        <button type="button" className={styles.tinyButton} onClick={() => setRows(rows.map((row) => [...row, '']))}>
          + 열
        </button>
        {rows.length > 2 && (
          <button type="button" className={styles.tinyButton} onClick={() => setRows(rows.slice(0, -1))}>
            − 마지막 행
          </button>
        )}
        {rows[0].length > 1 && (
          <button type="button" className={styles.tinyButton} onClick={() => setRows(rows.map((row) => row.slice(0, -1)))}>
            − 마지막 열
          </button>
        )}
      </div>
    </div>
  )
}

// 자료함 자료 링크 카드 (Mockup SN-DETAIL-01 "참고자료"). 원문을 복사하지 않고 출처 메타데이터만 보여준다.
function ResourceLinkCard({ block }: { block: EditorBlock }) {
  const resource = block.attrs?.resource
  return (
    <div className={styles.linkCard}>
      <span className={styles.linkIcon} aria-hidden="true">
        <LinkIcon size={14} />
      </span>
      <span>
        <span className={styles.linkMeta}>
          {resource && <span className={styles.linkType}>{resourceTypeLabel(resource.type)}</span>}
          {resource?.sourceName ?? '출처 미입력'}
        </span>
        <span className={styles.linkTitle}>
          {resource?.title ?? block.text}
        </span>
        {resource?.sourceUrl ? (
          <span className={styles.linkUrl}>{resource.sourceUrl} · 직접 입력한 링크 (열리는지 확인 안 됨)</span>
        ) : (
          <span className={styles.linkUrl}>링크 없음</span>
        )}
      </span>
      <span className={styles.linkActions}>
        {resource?.sourceUrl && (
          <a href={resource.sourceUrl} target="_blank" rel="noreferrer noopener">
            원문 열기 ↗
          </a>
        )}
        {resource && <Link to={resourceDetailPath(resource.resourceId)}>자료 보기</Link>}
      </span>
    </div>
  )
}
