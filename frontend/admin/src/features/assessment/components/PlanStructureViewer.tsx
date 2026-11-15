import { useEffect, useMemo, useRef, useState } from 'react'
import { toApiError } from '../api/canonicalSource.ts'
import { getPlanStructure } from '../api/assessmentAdminApi.ts'
import type { PlanStructureBlock, PlanStructureCell, PlanStructurePreview } from '../api/types.ts'
import styles from './structure.module.css'

// A10 HWP·HWPX 원문 구조 Viewer (§38-6). 서버가 원본을 직접 읽어 준 문단·표(병합 셀)를 그대로 그린다 — PDF 변환 없음.
// - 글자는 React가 문자열로만 넣는다(원문의 HTML·Script를 해석하지 않음).
// - 쪽 나눔·글꼴·그림·도형은 서버가 담지 않으므로 표시하지 않는다(조판 결과가 아니라 문서 구조라고 안내한다).
// - focus: 분석 결과 documentLocator의 section·path와 정확히 같은 위치만 강조한다. 못 찾으면 강조하지 않고 그렇다고 알린다.

export interface StructureFocus {
  section: number
  path: string
}

type Loaded = { key: string; kind: 'ready'; data: PlanStructurePreview } | { key: string; kind: 'error'; message: string; retryable: boolean }

const locKey = (section: number, path: string) => `s${section}:${path}`
/** 큰 문서(전 학년·전 과목 묶음 등)는 최상위 블록을 이만큼씩 그린다. 근거 위치·찾은 곳이 뒤에 있으면 그 지점까지 그린다 */
const CHUNK = 400

const FAILURE_TEXT: Record<string, string> = {
  parse_failed: '원문 구조를 읽지 못했어요. 파일이 손상되었거나 지원하지 않는 구조예요.',
  limit_exceeded: '문서가 너무 크거나 복잡해서 화면에 표시하지 않았어요.',
  timeout: '원문을 읽는 데 시간이 너무 오래 걸려 중단했어요.',
  protected: '암호가 걸렸거나 배포용으로 저장된 문서라 내용을 읽을 수 없어요.',
}

export function PlanStructureViewer({ planId, revisionId, focus }: { planId: string; revisionId: string; focus?: StructureFocus | null }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [query, setQuery] = useState('')
  const [matchIndex, setMatchIndex] = useState(0)
  const [shown, setShown] = useState(CHUNK)
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

  // 원문 구조에 있는 모든 위치(문단·표·칸) → 속한 최상위 블록 번호. 근거 위치가 여기 없으면 강조하지 않는다
  const locations = useMemo(() => {
    const out = new Map<string, number>()
    data?.blocks.forEach((top, index) => {
      const visit = (block: PlanStructureBlock) => {
        out.set(locKey(block.section, block.path), index)
        block.blocks?.forEach(visit)
        block.caption?.forEach(visit)
        block.cells?.forEach((cell) => {
          out.set(locKey(block.section, cell.path), index)
          cell.paragraphs.forEach(visit)
        })
      }
      visit(top)
    })
    return out
  }, [data])

  // 근거 위치 강조: 정확히 같은 section·path가 있을 때만
  const focusKey = focus ? locKey(focus.section, focus.path) : null
  const focusMissing = Boolean(data && focusKey && !locations.has(focusKey))
  const visibleCount = Math.max(shown, (focusKey ? (locations.get(focusKey) ?? -1) : -1) + 1, (current ? (locations.get(current) ?? -1) : -1) + 1)

  useEffect(() => {
    const root = bodyRef.current
    if (!root || !current) return
    root.querySelector(`[data-loc="${CSS.escape(current)}"]`)?.scrollIntoView({ block: 'center' })
  }, [current, visibleCount])

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
  }, [data, focusKey, visibleCount])

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
  return (
    <div className={styles.viewer} data-testid="structure-viewer" data-format={doc.documentFormat}>
      <div className={styles.toolbar}>
        <span className={styles.meta} data-testid="structure-meta">
          {doc.documentFormat} 원문 구조 · 문단 {doc.stats.paragraphs.toLocaleString()} · 표 {doc.stats.tables.toLocaleString()}
          {doc.sectionCount > 1 ? ` · 구역 ${doc.sectionCount}` : ''}
        </span>
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
              if (event.key === 'Enter' && matches.length) setMatchIndex((n) => (n + (event.shiftKey ? matches.length - 1 : 1)) % matches.length)
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
            <button type="button" className={styles.ghost} onClick={() => setMatchIndex((n) => (n + matches.length - 1) % matches.length)} aria-label="이전 찾은 곳">
              ↑
            </button>
            <button type="button" className={styles.ghost} onClick={() => setMatchIndex((n) => (n + 1) % matches.length)} aria-label="다음 찾은 곳">
              ↓
            </button>
          </>
        )}
      </div>
      <p className={styles.note} data-testid="structure-note">
        원본 파일을 PDF로 바꾸지 않고 직접 읽어 글자와 표(병합 칸 포함)를 보여 줘요. 쪽 나눔·글꼴·그림은 표시하지 않아요.
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
            {doc.notices!.slice(0, 20).map((notice, index) => (
              <li key={index}>{notice}</li>
            ))}
          </ul>
        </details>
      )}
      <div className={styles.page} ref={bodyRef} data-current-match={current ?? undefined}>
        {doc.blocks.length === 0 ? (
          <p className={styles.meta}>원문에 표시할 글자가 없어요.</p>
        ) : (
          doc.blocks.slice(0, visibleCount).map((block, index) => <BlockView key={index} block={block} current={current} />)
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
      {block.blocks?.map((child, index) => <BlockView key={index} block={child} current={current} />)}
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
      {block.caption?.map((caption, index) => <BlockView key={`c${index}`} block={caption} current={current} />)}
      <table className={styles.table}>
        <tbody>
          {rows.map(({ row, cells }) => (
            <tr key={row}>
              {cells.map((cell) => (
                <td key={cell.path} rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined} colSpan={cell.colSpan > 1 ? cell.colSpan : undefined} data-loc={locKey(block.section, cell.path)}>
                  {cell.paragraphs.map((paragraph, index) => <BlockView key={index} block={paragraph} current={current} />)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
