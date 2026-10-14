import { Link, useNavigate, useSearchParams } from 'react-router'
import { mentorApi } from '../../api/mentorApi.ts'
import type { MentorContentListItem, MentorContentType, PageResult } from '../../api/types.ts'
import { contentEditPath, contentPath, createPath } from '../../app/paths.ts'
import { Badge } from '../../components/Badge.tsx'
import { PlusIcon } from '../../components/icons.tsx'
import { EmptyState, ErrorState, LoadingState } from '../../components/PageState.tsx'
import { PageTitle } from '../../components/PageTitle.tsx'
import ui from '../../components/ui.module.css'
import { SearchField, ToolbarSpacer, Workspace, type SidebarSection } from '../../components/Workspace.tsx'
import { formatCount, formatDate } from '../../lib/format.ts'
import { useResource, type ResourceState } from '../../lib/useResource.ts'
import { contentStatusView, contentTypeLabel, contentTypes, hasApply, isInReview } from '../../model/contentMeta.ts'
import { editBlockedReason } from './model/editability.ts'
import styles from './MyContentPage.module.css'

/** 화면 보기. "검수 대기"는 Canonical Review State 확정 전 UI-only 구분이다. (Domain 상태는 DRAFT) */
type StatusView = 'DRAFT' | 'PUBLISHED' | 'REVIEW'

const statusViews: { id: StatusView; label: string }[] = [
  { id: 'DRAFT', label: '초안' },
  { id: 'PUBLISHED', label: '공개' },
  { id: 'REVIEW', label: '검수 대기' },
]

const parseType = (value: string | null) => contentTypes.find((item) => item.id === value)?.id
const parseStatus = (value: string | null) => statusViews.find((item) => item.id === value)?.id

function matchesStatus(item: MentorContentListItem, status: StatusView | undefined) {
  if (!status) return true
  if (status === 'PUBLISHED') return item.status === 'PUBLISHED'
  if (status === 'REVIEW') return isInReview(item)
  return item.status === 'DRAFT' && !isInReview(item)
}

function matchesQuery(item: MentorContentListItem, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return item.title.toLowerCase().includes(needle) || item.tags.some((tag) => tag.toLowerCase().includes(needle))
}

// My Content: Secondary Sidebar(상태 / 유형) + 검색 + 목록. 보기 / 유형 / 검색어는 URL에 두어 Detail 왕복 후에도 유지한다.
// 목록은 GET /api/mentor/content 한 번으로 받아 Sidebar 개수와 목록을 같은 데이터에서 계산한다.
// Contract에 검색 Query가 없어(api-contract §25-1) 검색은 받아 온 목록 안에서만 한다. (Contract Gap)
export function MyContentPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const type = parseType(searchParams.get('type'))
  const status = parseStatus(searchParams.get('status'))
  const query = searchParams.get('q') ?? ''

  const { state, reload } = useResource('content:list:all:all', () => mentorApi.listContent({ size: 100 }))
  const all = state.status === 'success' ? state.data.items : []

  const hrefWith = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    const search = next.toString()
    return search ? `?${search}` : '?'
  }

  const sections: SidebarSection[] = [
    {
      items: [
        { key: 'all', label: '전체 콘텐츠', to: hrefWith({ status: undefined }), active: !status, count: all.length },
        ...statusViews.map((view) => ({
          key: view.id,
          label: view.label,
          to: hrefWith({ status: view.id }),
          active: status === view.id,
          count: all.filter((item) => matchesStatus(item, view.id)).length,
        })),
      ],
    },
    {
      heading: '유형',
      items: contentTypes.map((item) => ({
        key: item.id,
        label: item.label,
        // 선택된 유형을 다시 누르면 유형 조건을 푼다.
        to: hrefWith({ type: type === item.id ? undefined : item.id }),
        active: type === item.id,
        count: all.filter((content) => content.type === item.id).length,
      })),
    },
  ]

  const setQuery = (value: string) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value) next.set('q', value)
        else next.delete('q')
        return next
      },
      { replace: true, preventScrollReset: true },
    )

  const resetFilters = () => setSearchParams({}, { replace: true, preventScrollReset: true })
  const viewTitle = statusViews.find((view) => view.id === status)?.label ?? '전체 콘텐츠'

  return (
    <Workspace
      title="내 콘텐츠"
      sections={sections}
      toolbar={
        <>
          <SearchField label="내 콘텐츠 검색" value={query} onChange={setQuery} />
          <ToolbarSpacer />
          <button type="button" className={`${ui.button} ${ui.primary}`} onClick={() => navigate(createPath)}>
            <PlusIcon />새 콘텐츠
          </button>
        </>
      }
    >
      <header className={styles.header}>
        <PageTitle>{viewTitle}</PageTitle>
        {type && (
          <p className={ui.pageLead}>
            {contentTypeLabel(type)}만 보는 중 ·{' '}
            <Link to={hrefWith({ type: undefined })} replace preventScrollReset className={styles.inlineLink}>
              유형 해제
            </Link>
          </p>
        )}
      </header>
      <ContentListBody
        state={state}
        reload={reload}
        type={type}
        status={status}
        query={query}
        onClearSearch={() => setQuery('')}
        onResetFilters={resetFilters}
      />
    </Workspace>
  )
}

interface ContentListBodyProps {
  state: ResourceState<PageResult<MentorContentListItem>>
  reload: () => void
  type: MentorContentType | undefined
  status: StatusView | undefined
  query: string
  onClearSearch: () => void
  onResetFilters: () => void
}

function ContentListBody({ state, reload, type, status, query, onClearSearch, onResetFilters }: ContentListBodyProps) {
  if (state.status === 'loading') return <LoadingState label="내 콘텐츠를 불러오는 중이에요." />
  if (state.status === 'error' || state.status === 'notFound') {
    return <ErrorState title="내 콘텐츠를 불러오지 못했어요." error={state.status === 'error' ? state.error : null} onRetry={reload} />
  }

  const all = state.data.items
  const filtered = all.filter((item) => (!type || item.type === type) && matchesStatus(item, status))
  const items = filtered.filter((item) => matchesQuery(item, query))

  if (all.length === 0) {
    return (
      <EmptyState title="아직 작성한 콘텐츠가 없어요." description="공부했던 계획이나 경험을 Student와 나눠 보세요.">
        <Link to={createPath} className={`${ui.button} ${ui.primary}`}>
          첫 글 쓰기
        </Link>
      </EmptyState>
    )
  }
  if (filtered.length === 0) {
    return (
      <EmptyState title="조건에 맞는 콘텐츠가 없어요." description="상태나 유형을 바꿔 보세요.">
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
      <div className={styles.listHead} aria-hidden="true">
        <span>제목</span>
        <span>상태</span>
        <span>Student 반응</span>
        <span>최근 수정</span>
        <span />
      </div>
      <p id="content-count" className="visually-hidden" aria-live="polite">
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
    <article className={styles.row}>
      <div className={styles.rowMain}>
        <p className={styles.type}>{contentTypeLabel(item.type)}</p>
        <h2 className={styles.rowTitle}>
          <Link to={contentPath(item.contentId)} className={styles.rowLink}>
            {item.title}
          </Link>
        </h2>
        {item.tags.length > 0 && <p className={styles.tags}>{item.tags.join(' · ')}</p>}
      </div>
      <div className={styles.meta}>
        <div className={styles.status}>
          <Badge tone={statusView.tone}>{statusView.label}</Badge>
        </div>
        <p className={styles.metrics}>
          {published ? (
            <>
              조회 {formatCount(item.metrics.viewCount)} · 저장 {formatCount(item.metrics.saveCount)}
              {hasApply(item.type) && item.metrics.applyCount !== null && ` · 적용 ${formatCount(item.metrics.applyCount)}`}
            </>
          ) : (
            <span className={styles.muted}>공개 전</span>
          )}
        </p>
        <p className={styles.date}>
          <span className="visually-hidden">최근 수정 </span>
          {formatDate(item.updatedAt)}
        </p>
      </div>
      <div className={styles.rowActions}>
        {editable && (
          <Link to={contentEditPath(item.contentId)} className={styles.edit} aria-label={`${item.title} 수정`}>
            수정
          </Link>
        )}
      </div>
    </article>
  )
}
