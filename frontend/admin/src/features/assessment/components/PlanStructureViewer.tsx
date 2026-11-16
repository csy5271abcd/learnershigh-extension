import { memo, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { toApiError } from '../api/canonicalSource.ts'
import { getPlanStructure } from '../api/assessmentAdminApi.ts'
import type { PlanStructureBlock, PlanStructureCell, PlanStructurePreview } from '../api/types.ts'
import styles from './structure.module.css'

// A10·A11 HWP·HWPX 원문 구조 Viewer (§38-6). 서버가 원본을 직접 읽어 준 문단·표(병합 셀)를 그대로 그린다 — PDF 변환 없음.
// - 글자는 React가 문자열로만 넣는다(원문의 HTML·Script를 해석하지 않음).
// - 쪽 나눔·글꼴·그림·도형은 서버가 담지 않으므로 표시하지 않는다(조판 결과가 아니라 문서 구조라고 안내한다).
// - focus: 분석 결과 documentLocator의 section·path와 정확히 같은 위치만 강조한다. 못 찾으면 강조하지 않고 그렇다고 알린다.
// - A11: 확대·축소, '구조 구간'(표 하나 또는 표 사이 문단 묶음 — 인쇄 쪽이 아님) 이전·다음, 구역·표 목록, 키보드.
//   본문(BlockList)은 memo로 분리해 스크롤·배율·구간 표시가 바뀌어도 다시 그리지 않는다(큰 문서 성능).

export interface StructureFocus {
  section: number
  path: string
  /** 같은 위치를 다시 눌러도 다시 스크롤하도록 호출 측이 바꾸는 값(선택) */
  seq?: number
}

type Loaded = { key: string; kind: 'ready'; data: PlanStructurePreview } | { key: string; kind: 'error'; message: string; retryable: boolean }

const locKey = (section: number, path: string) => `s${section}:${path}`
/** 큰 문서는 최상위 블록을 이만큼씩 그린다. 근거 위치·찾은 곳·고른 구간이 뒤에 있으면 그 지점까지 그린다 */
const CHUNK = 400
/** 표가 없는 긴 문단 묶음은 이 개수마다 구간을 나눈다 */
const SEGMENT_PARAGRAPHS = 30
const ZOOM_MIN = 0.7
const ZOOM_MAX = 2
const ZOOM_STEP = 0.1

const FAILURE_TEXT: Record<string, string> = {
  parse_failed: '원문 구조를 읽지 못했어요. 파일이 손상되었거나 지원하지 않는 구조예요.',
  limit_exceeded: '문서가 너무 크거나 복잡해서 화면에 표시하지 않았어요.',
  timeout: '원문을 읽는 데 시간이 너무 오래 걸려 중단했어요.',
  protected: '암호가 걸렸거나 배포용으로 저장된 문서라 내용을 읽을 수 없어요.',
}

const hasTable = (block: PlanStructureBlock) => block.type === 'TABLE' || (block.blocks ?? []).some((child) => child.type === 'TABLE')

/** 문서 색인: 위치 → 최상위 블록 번호, 구조 구간 시작점, 구역·표 목록 */
function indexDocument(blocks: PlanStructureBlock[]) {
  const location = new Map<string, number>()
  const segmentStarts: number[] = []
  const segmentOfTop: number[] = []
  const tables: { label: string; top: number; key: string }[] = []
  const sections: { section: number; top: number }[] = []
  let run = 0
  blocks.forEach((top, index) => {
    const previous = blocks[index - 1]
    const newSection = !previous || previous.section !== top.section
    if (newSection) sections.push({ section: top.section, top: index })
    if (index === 0 || newSection || hasTable(top) || (previous && hasTable(previous)) || run >= SEGMENT_PARAGRAPHS) {
      segmentStarts.push(index)
      run = 0
    }
    run++
    segmentOfTop.push(segmentStarts.length - 1)
    const visit = (block: PlanStructureBlock) => {
      location.set(locKey(block.section, block.path), index)
      if (block.type === 'TABLE') {
        const first = (block.cells ?? []).flatMap((cell) => cell.paragraphs.map((paragraph) => paragraph.text ?? '')).find((text) => text.trim())
        tables.push({ label: `표 ${(block.table ?? tables.length) + 1}${first ? ` · ${first.slice(0, 18)}` : ''}`, top: index, key: locKey(block.section, block.path) })
      }
      block.blocks?.forEach(visit)
      block.caption?.forEach(visit)
      block.cells?.forEach((cell) => {
        location.set(locKey(block.section, cell.path), index)
        cell.paragraphs.forEach(visit)
      })
    }
    visit(top)
  })
  return { location, segmentStarts, segmentOfTop, tables, sections }
}

export function PlanStructureViewer({ planId, revisionId, focus }: { planId: string; revisionId: string; focus?: StructureFocus | null }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [query, setQuery] = useState('')
  const [matchIndex, setMatchIndex] = useState(0)
  const [shown, setShown] = useState(CHUNK)
  const [zoom, setZoom] = useState(1)
  const [segment, setSegment] = useState(0)
  const [nav, setNav] = useState<{ key: string; seq: number } | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const key = `${planId}/${revisionId}`
  const state = loaded && loaded.key === key ? loaded : null

  useEffect(() => {
    let cancelled = false
    getPlanStructure(planId, revisionId).then(
      (data) => !cancelled && setLoaded({ key, kind: 'ready', data }),
      (cause: unknown) => {
        if (cancelled) return
        const error = toApiError(cause)
        const reason = error.fieldReasons().file
        const message =
          error.code === 'PLAN_PREVIEW_FAILED' && reason
            ? (FAILURE_TEXT[reason] ?? error.message)
            : error.code === 'FILE_INTEGRITY_FAILED'
              ? '저장된 원문이 등록 당시와 달라 열지 않았어요.'
              : error.message
        setLoaded({ key, kind: 'error', message, retryable: error.code !== 'PLAN_PREVIEW_FAILED' || reason === 'timeout' })
      },
    )
    return () => {
      cancelled = true
    }
  }, [key, planId, revisionId, attempt])

  const data = state?.kind === 'ready' ? state.data : null
  const index = useMemo(() => indexDocument(data?.blocks ?? []), [data])

  // 찾기: 글자가 들어 있는 위치 목록(문서 순서)
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!data || needle.length < 2) return [] as string[]
    const out: string[] = []
    const visit = (block: PlanStructureBlock) => {
      if (block.type === 'PARAGRAPH') {
        if ((block.text ?? '').toLowerCase().includes(needle)) out.push(locKey(block.section, block.path))
        block.blocks?.forEach(visit)
      } else {
        block.caption?.forEach(visit)
        block.cells?.forEach((cell) => cell.paragraphs.forEach(visit))
      }
    }
    data.blocks.forEach(visit)
    return out
  }, [data, query])
  const current = matches.length ? matches[Math.min(matchIndex, matches.length - 1)] : null

  const focusKey = focus ? locKey(focus.section, focus.path) : null
  const focusMissing = Boolean(data && focusKey && !index.location.has(focusKey))
  const navTop = nav ? (index.location.get(nav.key) ?? -1) : -1
  const visibleCount = Math.max(
    shown,
    (focusKey ? (index.location.get(focusKey) ?? -1) : -1) + 1,
    (current ? (index.location.get(current) ?? -1) : -1) + 1,
    navTop + 1,
  )

  const scrollTo = (selector: string) => bodyRef.current?.querySelector(selector)?.scrollIntoView({ block: 'center' })

  useEffect(() => {
    if (current) scrollTo(`[data-loc="${CSS.escape(current)}"]`)
  }, [current, visibleCount])

  // 구간·표 이동: 그 지점까지 그린 뒤 맨 위로 맞춘다
  useEffect(() => {
    if (!nav) return
    bodyRef.current?.querySelector(`[data-loc="${CSS.escape(nav.key)}"]`)?.scrollIntoView({ block: 'start' })
  }, [nav, visibleCount])

  // 근거 위치 강조: 정확히 같은 section·path가 있을 때만
  const focusSeq = focus?.seq ?? 0
  useEffect(() => {
    const root = bodyRef.current
    if (!root || !data) return
    root.querySelectorAll('[data-focused="true"]').forEach((element) => element.removeAttribute('data-focused'))
    if (!focusKey) return
    const target = root.querySelector(`[data-loc="${CSS.escape(focusKey)}"]`)
    if (target) {
      target.setAttribute('data-focused', 'true')
      target.scrollIntoView({ block: 'center' })
    }
  }, [data, focusKey, focusSeq, visibleCount])

  if (!state) {
    return (
      <div className={styles.loading} aria-busy="true" data-testid="structure-loading">
        <span>원문을 읽는 중…</span>
        <div className={styles.skeleton} />
        <div className={styles.skeleton} style={{ width: '70%' }} />
        <div className={styles.skeletonTable} />
      </div>
    )
  }
  if (state.kind === 'error') {
    return (
      <div className={styles.error} role="alert" data-testid="structure-error">
        <p>{state.message} 원본을 내려받아 한글 프로그램에서 확인해 주세요.</p>
        {state.retryable && (
          <button type="button" className={styles.ghost} onClick={() => { setLoaded(null); setAttempt((n) => n + 1) }} data-testid="structure-retry">
            다시 시도
          </button>
        )}
      </div>
    )
  }

  const doc = state.data
  const segmentCount = index.segmentStarts.length
  const goTop = (top: number) => {
    const block = doc.blocks[top]
    if (!block) return
    setSegment(index.segmentOfTop[top] ?? 0)
    setNav((previous) => ({ key: locKey(block.section, block.path), seq: (previous?.seq ?? 0) + 1 }))
  }
  const goSegment = (next: number) => {
    const target = Math.max(0, Math.min(segmentCount - 1, next))
    goTop(index.segmentStarts[target])
  }
  const setZoomTo = (value: number) => setZoom(Math.round(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, value)) * 10) / 10)
  const step = (direction: 1 | -1) => matches.length && setMatchIndex((n) => (n + (direction === 1 ? 1 : matches.length - 1)) % matches.length)

  // 스크롤 위치로 현재 구간을 정한다(이벤트 처리 — 본문은 다시 그리지 않음)
  const onScroll = () => {
    const root = bodyRef.current
    if (!root) return
    const top = root.getBoundingClientRect().top + 8
    const anchors = root.querySelectorAll<HTMLElement>('[data-seg]')
    let currentSegment = 0
    for (const anchor of anchors) {
      if (anchor.getBoundingClientRect().top <= top) currentSegment = Number(anchor.dataset.seg)
      else break
    }
    if (currentSegment !== segment) setSegment(currentSegment)
  }

  // 키보드: Alt+↑/↓ 구간, +/− 배율, 0 배율 초기화 (본문에 초점이 있을 때)
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey && event.key === 'ArrowDown') goSegment(segment + 1)
    else if (event.altKey && event.key === 'ArrowUp') goSegment(segment - 1)
    else if (event.key === '+' || event.key === '=') setZoomTo(zoom + ZOOM_STEP)
    else if (event.key === '-') setZoomTo(zoom - ZOOM_STEP)
    else if (event.key === '0') setZoomTo(1)
    else return
    event.preventDefault()
  }

  return (
    <div className={styles.viewer} data-testid="structure-viewer" data-format={doc.documentFormat}>
      <div className={styles.toolbar} role="toolbar" aria-label="원문 구조 보기 도구">
        <span className={styles.meta} data-testid="structure-meta">
          {doc.documentFormat} 원문 구조 · 문단 {doc.stats.paragraphs.toLocaleString()} · 표 {doc.stats.tables.toLocaleString()}
          {doc.sectionCount > 1 ? ` · 구역 ${doc.sectionCount}` : ''}
        </span>
        <span className={styles.group}>
          <button type="button" className={styles.ghost} onClick={() => goSegment(segment - 1)} disabled={segment <= 0} aria-label="이전 구간" title="이전 구간 (Alt+↑)" data-testid="structure-seg-prev">
            ‹
          </button>
          <span className={styles.meta} data-testid="structure-seg-label" title="구조 구간은 표 하나 또는 표 사이 문단 묶음이에요. 인쇄 쪽 번호가 아니에요.">
            구간 {Math.min(segment + 1, segmentCount)} / {segmentCount}
          </span>
          <button type="button" className={styles.ghost} onClick={() => goSegment(segment + 1)} disabled={segment >= segmentCount - 1} aria-label="다음 구간" title="다음 구간 (Alt+↓)" data-testid="structure-seg-next">
            ›
          </button>
        </span>
        {(index.tables.length > 0 || index.sections.length > 1) && (
          <label className={styles.outline}>
            <span className={styles.srOnly}>구역·표로 이동</span>
            <select
              value=""
              onChange={(event) => {
                if (event.target.value !== '') goTop(Number(event.target.value))
              }}
              data-testid="structure-outline"
            >
              <option value="">구역·표로 이동</option>
              {index.sections.length > 1 && (
                <optgroup label="구역">
                  {index.sections.map((section) => (
                    <option key={`s${section.section}`} value={section.top}>
                      구역 {section.section + 1}
                    </option>
                  ))}
                </optgroup>
              )}
              {index.tables.length > 0 && (
                <optgroup label="표">
                  {index.tables.slice(0, 300).map((table) => (
                    <option key={table.key} value={table.top}>
                      {table.label}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
        )}
        <span className={styles.group}>
          <button type="button" className={styles.ghost} onClick={() => setZoomTo(zoom - ZOOM_STEP)} disabled={zoom <= ZOOM_MIN} aria-label="축소" title="축소 (−)" data-testid="structure-zoom-out">
            −
          </button>
          <button type="button" className={styles.ghost} onClick={() => setZoomTo(1)} aria-label="배율 초기화" title="배율 초기화 (0)" data-testid="structure-zoom-reset">
            <span data-testid="structure-zoom-level">{Math.round(zoom * 100)}%</span>
          </button>
          <button type="button" className={styles.ghost} onClick={() => setZoomTo(zoom + ZOOM_STEP)} disabled={zoom >= ZOOM_MAX} aria-label="확대" title="확대 (+)" data-testid="structure-zoom-in">
            +
          </button>
        </span>
        <span className={styles.group}>
          <label className={styles.find}>
            <span className={styles.srOnly}>원문에서 찾기</span>
            <input
              type="search"
              value={query}
              placeholder="원문에서 찾기"
              onChange={(event) => {
                setQuery(event.target.value)
                setMatchIndex(0)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') step(event.shiftKey ? -1 : 1)
              }}
              data-testid="structure-find"
            />
          </label>
          {query.trim().length >= 2 && (
            <span className={styles.meta} aria-live="polite" data-testid="structure-find-count">
              {matches.length ? `${Math.min(matchIndex, matches.length - 1) + 1} / ${matches.length}` : '없음'}
            </span>
          )}
          {matches.length > 1 && (
            <>
              <button type="button" className={styles.ghost} onClick={() => step(-1)} aria-label="이전 찾은 곳" title="이전 (Shift+Enter)" data-testid="structure-find-prev">
                ↑
              </button>
              <button type="button" className={styles.ghost} onClick={() => step(1)} aria-label="다음 찾은 곳" title="다음 (Enter)" data-testid="structure-find-next">
                ↓
              </button>
            </>
          )}
        </span>
      </div>
      <p className={styles.note} data-testid="structure-note">
        원본 파일을 PDF로 바꾸지 않고 직접 읽어 글자와 표(병합 칸 포함)를 보여 줘요. 쪽 나눔·글꼴·그림은 표시하지 않고, 구간은 인쇄 쪽 번호가 아니에요.
        {focusKey && !focusMissing ? ' 분석 근거 위치를 파란 테두리로 표시했어요.' : ''}
      </p>
      {focusKey && focusMissing && (
        <p className={styles.warn} role="status" data-testid="structure-focus-missing">
          분석 결과가 가리킨 위치를 이 원문 구조에서 찾지 못해 표시하지 않았어요. 원본에서 직접 확인해 주세요.
        </p>
      )}
      {(doc.notices ?? []).length > 0 && (
        <details className={styles.notices}>
          <summary>판독 참고 {doc.notices!.length}건</summary>
          <ul>
            {doc.notices!.slice(0, 20).map((notice, position) => (
              <li key={position}>{notice}</li>
            ))}
          </ul>
        </details>
      )}
      <div
        className={styles.page}
        ref={bodyRef}
        tabIndex={0}
        role="document"
        aria-label="원문 구조 본문 (Alt+↑/↓ 구간 이동, +/− 확대·축소, 0 초기화)"
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        style={{ ['--sv-zoom' as string]: String(zoom) }}
        data-zoom={zoom}
      >
        {doc.blocks.length === 0 ? (
          <p className={styles.meta}>원문에 표시할 글자가 없어요.</p>
        ) : (
          <BlockList blocks={doc.blocks} count={visibleCount} segmentStarts={index.segmentStarts} current={current} />
        )}
        {doc.blocks.length > visibleCount && (
          <button type="button" className={styles.more} onClick={() => setShown(visibleCount + CHUNK)} data-testid="structure-more">
            이어서 보기 (남은 최상위 문단·표 {(doc.blocks.length - visibleCount).toLocaleString()}개)
          </button>
        )}
      </div>
    </div>
  )
}

/** 본문. props가 같으면 다시 그리지 않는다(스크롤·배율·구간 표시 변경과 무관) */
const BlockList = memo(function BlockList({ blocks, count, segmentStarts, current }: { blocks: PlanStructureBlock[]; count: number; segmentStarts: number[]; current: string | null }) {
  const starts = useMemo(() => new Map(segmentStarts.map((top, segment) => [top, segment])), [segmentStarts])
  return (
    <>
      {blocks.slice(0, count).map((block, top) => (
        <div key={top} className={styles.top}>
          {starts.has(top) && <span className={styles.anchor} data-seg={starts.get(top)} aria-hidden="true" />}
          <BlockView block={block} current={current} />
        </div>
      ))}
    </>
  )
})

function BlockView({ block, current }: { block: PlanStructureBlock; current: string | null }) {
  if (block.type === 'TABLE') return <TableView block={block} current={current} />
  const loc = locKey(block.section, block.path)
  const text = block.text ?? ''
  return (
    <>
      {(text || !block.blocks?.length) && (
        <p
          className={block.kind === 'CONTROL_TEXT' ? styles.controlText : styles.paragraph}
          data-loc={loc}
          data-match={current === loc ? 'current' : undefined}
        >
          {text || ' '}
        </p>
      )}
      {!text && block.blocks?.length ? <span data-loc={loc} className={styles.anchor} /> : null}
      {block.blocks?.map((child, position) => <BlockView key={position} block={child} current={current} />)}
    </>
  )
}

function TableView({ block, current }: { block: PlanStructureBlock; current: string | null }) {
  // 칸을 행 번호로 묶고 열 순서대로 둔다. 병합은 rowSpan·colSpan을 그대로 쓴다(빈 칸을 지어내지 않음).
  const rows = useMemo(() => {
    const byRow = new Map<number, PlanStructureCell[]>()
    for (const cell of block.cells ?? []) {
      const list = byRow.get(cell.row) ?? []
      list.push(cell)
      byRow.set(cell.row, list)
    }
    return [...byRow.entries()].sort((a, b) => a[0] - b[0]).map(([row, cells]) => ({ row, cells: cells.sort((a, b) => a.col - b.col) }))
  }, [block.cells])
  return (
    <div className={styles.tableWrap} data-loc={locKey(block.section, block.path)}>
      {block.caption?.map((caption, position) => <BlockView key={`c${position}`} block={caption} current={current} />)}
      <table className={styles.table}>
        <tbody>
          {rows.map(({ row, cells }) => (
            <tr key={row}>
              {cells.map((cell) => (
                <td key={cell.path} rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined} colSpan={cell.colSpan > 1 ? cell.colSpan : undefined} data-loc={locKey(block.section, cell.path)}>
                  {cell.paragraphs.map((paragraph, position) => <BlockView key={position} block={paragraph} current={current} />)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
