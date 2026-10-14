import { Link, useSearchParams } from 'react-router'
import { mentorApi } from '../../api/mentorApi.ts'
import type { MentorContentListItem, MentorContentStatus, PageResult } from '../../api/types.ts'
import { contentEditPath, contentPath, createPath } from '../../app/paths.ts'
import { Badge } from '../../components/Badge.tsx'
import { EmptyState, ErrorState, LoadingState } from '../../components/PageState.tsx'
import { PageTitle } from '../../components/PageTitle.tsx'
import ui from '../../components/ui.module.css'
import { formatCount, formatDate } from '../../lib/format.ts'
import { useResource, type ResourceState } from '../../lib/useResource.ts'
import { contentStatusView, contentTypeLabel, contentTypes, hasApply } from '../../model/contentMeta.ts'
import { editBlockedReason } from './model/editability.ts'
import styles from './MyContentPage.module.css'

const statusFilters: { id: MentorContentStatus; label: string }[] = [
  { id: 'DRAFT', label: '초안' },
  { id: 'PUBLISHED', label: '공개됨' },
]

const parseType = (value: string | null) => contentTypes.find((item) => item.id === value)?.id
const parseStatus = (value: string | null) => statusFilters.find((item) => item.id === value)?.id

function matchesQuery(item: MentorContentListItem, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return item.title.toLowerCase().includes(needle) || item.tags.some((tag) => tag.toLowerCase().includes(needle))
}

// My Content: Type / Status Filter와 검색어는 URL에 두어 Detail 왕복 후에도 유지한다. Scroll은 ScrollRestoration이 복원한다.
// Contract에 검색 Query가 없어(api-contract §25-1) 검색은 받아 온 목록 안에서만 한다. (Contract Gap)
export function MyContentPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const type = parseType(searchParams.get('type'))
  const status = parseStatus(searchParams.get('status'))
  const query = searchParams.get('q') ?? ''

  const { state, reload } = useResource(`content:list:${type ?? 'all'}:${status ?? 'all'}`, () =>
    mentorApi.listContent({ type, status, size: 100 }),
  )

  const setParam = (name: string, value: string | undefined) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value) next.set(name, value)
        else next.delete(name)
        return next
      },
      { replace: true, preventScrollReset: true },
    )

  const resetFilters = () =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.delete('type')
        next.delete('status')
        next.delete('q')
        return next
      },
      { replace: true, preventScrollReset: true },
    )

  return (
    <div className={ui.page}>
      <header className={ui.pageHeader}>
        <div>
          <PageTitle>내 콘텐츠</PageTitle>
          <p className={ui.pageLead}>작성한 Plan · Routine · Story · Record · Case를 관리해요.</p>
        </div>
        <Link to={createPath} className={`${ui.button} ${ui.primary}`}>
          새 글 쓰기
        </Link>
      </header>

      <section className={styles.controls} aria-label="콘텐츠 Filter">
        <div className={ui.chips} role="group" aria-label="유형">
          <FilterChip label="전체" selected={!type} onSelect={() => setParam('type', undefined)} />
          {contentTypes.map((item) => (
            <FilterChip key={item.id} label={item.label} selected={type === item.id} onSelect={() => setParam('type', item.id)} />
          ))}
        </div>
        <div className={styles.secondRow}>
          <div className={styles.segmented} role="group" aria-label="상태">
            <SegmentButton label="전체 상태" selected={!status} onSelect={() => setParam('status', undefined)} />
            {statusFilters.map((item) => (
              <SegmentButton
                key={item.id}
                label={item.label}
                selected={status === item.id}
                onSelect={() => setParam('status', item.id)}
              />
            ))}
          </div>
          <div className={styles.search}>
            <label htmlFor="content-search" className="visually-hidden">
              제목 또는 태그 검색
            </label>
            <input
              id="content-search"
              type="search"
              className={ui.input}
              placeholder="제목 또는 태그 검색"
              value={query}
              onChange={(event) => setParam('q', event.target.value || undefined)}
            />
          </div>
        </div>
      </section>

      <ContentListBody
        state={state}
        reload={reload}
        query={query}
        filtered={Boolean(type || status)}
        onClearSearch={() => setParam('q', undefined)}
        onResetFilters={resetFilters}
      />
    </div>
  )
}

function FilterChip({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" className={ui.chip} aria-pressed={selected} onClick={onSelect}>
      {label}
    </button>
  )
}

function SegmentButton({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" className={styles.segment} aria-pressed={selected} onClick={onSelect}>
      {label}
    </button>
  )
}

interface ContentListBodyProps {
  state: ResourceState<PageResult<MentorContentListItem>>
  reload: () => void
  query: string
  filtered: boolean
  onClearSearch: () => void
  onResetFilters: () => void
}

function ContentListBody({ state, reload, query, filtered, onClearSearch, onResetFilters }: ContentListBodyProps) {
  if (state.status === 'loading') return <LoadingState label="내 콘텐츠를 불러오는 중이에요." />
  if (state.status === 'error' || state.status === 'notFound') {
    return <ErrorState title="내 콘텐츠를 불러오지 못했어요." error={state.status === 'error' ? state.error : null} onRetry={reload} />
  }

  const all = state.data.items
  const items = all.filter((item) => matchesQuery(item, query))

  if (all.length === 0 && !filtered) {
    return (
      <EmptyState title="아직 작성한 콘텐츠가 없어요." description="공부했던 계획이나 경험을 Student와 나눠 보세요.">
        <Link to={createPath} className={`${ui.button} ${ui.primary}`}>
          첫 글 쓰기
        </Link>
      </EmptyState>
    )
  }

  if (all.length === 0) {
    return (
      <EmptyState title="조건에 맞는 콘텐츠가 없어요." description="유형이나 상태 Filter를 바꿔 보세요.">
        <button type="button" className={`${ui.button} ${ui.neutral}`} onClick={onResetFilters}>
          Filter 초기화
        </button>
      </EmptyState>
    )
  }

  if (items.length === 0) {
    return (
      <EmptyState title={`'${query.trim()}' 검색 결과가 없어요.`} description="다른 단어로 찾아보거나 검색어를 지워 보세요.">
        <button type="button" className={`${ui.button} ${ui.neutral}`} onClick={onClearSearch}>
          검색어 지우기
        </button>
      </EmptyState>
    )
  }

  return (
    <section aria-labelledby="content-count">
      <p id="content-count" className={styles.count} aria-live="polite">
        {items.length}개
      </p>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.contentId}>
            <ContentRow item={item} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function ContentRow({ item }: { item: MentorContentListItem }) {
  const statusView = contentStatusView(item)
  const editable = editBlockedReason(item) === null
  const published = item.status === 'PUBLISHED'

  return (
    <article className={`${styles.row} ${published ? '' : styles.draftRow}`}>
      <div className={styles.rowMain}>
        <div className={styles.badges}>
          <Badge>{contentTypeLabel(item.type)}</Badge>
          <Badge tone={statusView.tone}>{statusView.label}</Badge>
        </div>
        <h2 className={styles.rowTitle}>
          <Link to={contentPath(item.contentId)} className={styles.rowLink}>
            {item.title}
          </Link>
        </h2>
        {item.tags.length > 0 && (
          <ul className={ui.tagList} aria-label="태그">
            {item.tags.map((tag) => (
              <li key={tag} className={ui.tag}>
                {tag}
              </li>
            ))}
          </ul>
        )}
      </div>
      {published ? (
        <dl className={styles.metrics} aria-label="반응">
          <div>
            <dt>조회</dt>
            <dd>{formatCount(item.metrics.viewCount)}</dd>
          </div>
          <div>
            <dt>저장</dt>
            <dd>{formatCount(item.metrics.saveCount)}</dd>
          </div>
          {hasApply(item.type) && item.metrics.applyCount !== null && (
            <div>
              <dt>적용</dt>
              <dd>{formatCount(item.metrics.applyCount)}</dd>
            </div>
          )}
        </dl>
      ) : (
        <p className={styles.metricsPending}>공개 후 집계</p>
      )}
      <p className={styles.date}>
        <span className="visually-hidden">최근 수정 </span>
        {formatDate(item.updatedAt)}
      </p>
      <div className={styles.rowActions}>
        {editable && (
          <Link
            to={contentEditPath(item.contentId)}
            className={`${ui.button} ${ui.neutral} ${ui.small}`}
            aria-label={`${item.title} 수정`}
          >
            수정
          </Link>
        )}
      </div>
    </article>
  )
}
