import { Link, useSearchParams } from 'react-router'
import { discoverApi } from '../../api/discover/discoverApi.ts'
import type { PublicMentorView, PublishedMentorContentView } from '../../api/discover/types.ts'
import { discoverContentPath, discoverMentorPath } from '../../app/paths.ts'
import { Avatar } from '../../components/Avatar.tsx'
import { EmptyState, ErrorState, LoadingState } from '../../components/PageState.tsx'
import { PageTitle } from '../../components/PageTitle.tsx'
import ui from '../../components/ui.module.css'
import { SearchField, Workspace, type SidebarSection } from '../../components/Workspace.tsx'
import { formatDate } from '../../lib/format.ts'
import { useResource, type ResourceState } from '../../lib/useResource.ts'
import { contentTypeLabel, contentTypes } from '../../model/contentMeta.ts'
import { AuthorLine } from './components/AuthorLine.tsx'
import styles from './DiscoverPage.module.css'

const parseType = (value: string | null) => contentTypes.find((item) => item.id === value)?.id

function contentMatches(item: PublishedMentorContentView, needle: string) {
  return [item.title, item.summary, item.mentor.name, item.mentor.major, item.mentor.university, ...item.tags].some((value) =>
    value.toLowerCase().includes(needle),
  )
}

function mentorMatches(mentor: PublicMentorView, needle: string) {
  return [mentor.name, mentor.university, mentor.major, mentor.admissionType, mentor.representativeExperience, ...mentor.tags].some(
    (value) => value.toLowerCase().includes(needle),
  )
}

// 둘러보기: 동료 Mentor가 공개한 경험을 찾아보는 Professional Peer Library. (SNS Feed / 추천 화면이 아니다)
// 보기(content / mentors) · 유형 · 태그 · 검색어는 URL에 두어 Detail / Profile 왕복 후에도 유지한다.
export function DiscoverPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const view = searchParams.get('view') === 'mentors' ? 'mentors' : 'content'
  const type = parseType(searchParams.get('type'))
  const tag = searchParams.get('tag') ?? undefined
  const query = searchParams.get('q') ?? ''
  const needle = query.trim().toLowerCase()

  const contents = useResource('discover:content:all', () => discoverApi.listPublishedContent())
  const mentors = useResource('discover:mentors:all', () => discoverApi.listMentors())
  const allContents = contents.state.status === 'success' ? contents.state.data : []
  const allMentors = mentors.state.status === 'success' ? mentors.state.data : []

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
        { key: 'content', label: '전체 콘텐츠', to: hrefWith({ view: undefined, type: undefined }), active: view === 'content' && !type, count: allContents.length },
        { key: 'mentors', label: 'Mentor', to: hrefWith({ view: 'mentors', type: undefined, tag: undefined }), active: view === 'mentors', count: allMentors.length },
      ],
    },
    {
      heading: '유형',
      items: contentTypes.map((item) => ({
        key: item.id,
        label: item.label,
        to: hrefWith({ view: undefined, type: type === item.id && view === 'content' ? undefined : item.id }),
        active: view === 'content' && type === item.id,
        count: allContents.filter((content) => content.type === item.id).length,
      })),
    },
  ]

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

  return (
    <Workspace
      title="둘러보기"
      sections={sections}
      toolbar={<SearchField label="다른 멘토와 콘텐츠 검색" value={query} onChange={(value) => setParam('q', value || undefined)} />}
    >
      <header className={styles.header}>
        <PageTitle>다른 멘토의 경험 둘러보기</PageTitle>
        <p className={ui.pageLead}>동료 멘토가 공개한 프로필과 콘텐츠예요. 초안 · 검수 중인 글 · Q&A는 보이지 않아요.</p>
      </header>

      {view === 'mentors' ? (
        <MentorList
          state={mentors.state}
          reload={mentors.reload}
          items={allMentors.filter((mentor) => !needle || mentorMatches(mentor, needle))}
          query={query}
          onClearSearch={() => setParam('q', undefined)}
        />
      ) : (
        <ContentList
          state={contents.state}
          reload={contents.reload}
          all={allContents.filter((item) => !type || item.type === type)}
          tag={tag}
          needle={needle}
          query={query}
          onTag={(value) => setParam('tag', value)}
          onClearSearch={() => setParam('q', undefined)}
        />
      )}
    </Workspace>
  )
}

interface ContentListProps {
  state: ResourceState<PublishedMentorContentView[]>
  reload: () => void
  all: PublishedMentorContentView[]
  tag: string | undefined
  needle: string
  query: string
  onTag: (tag: string | undefined) => void
  onClearSearch: () => void
}

function ContentList({ state, reload, all, tag, needle, query, onTag, onClearSearch }: ContentListProps) {
  if (state.status === 'loading') return <LoadingState label="공개 콘텐츠를 불러오는 중이에요." />
  if (state.status === 'error' || state.status === 'notFound') {
    return <ErrorState title="공개 콘텐츠를 불러오지 못했어요." error={state.status === 'error' ? state.error : null} onRetry={reload} />
  }
  if (state.data.length === 0) {
    return <EmptyState title="아직 공개된 다른 멘토의 콘텐츠가 없어요." />
  }

  // 지금 보이는 유형 안에서 많이 쓰인 태그
  const tagCounts = new Map<string, number>()
  all.forEach((item) => item.tags.forEach((value) => tagCounts.set(value, (tagCounts.get(value) ?? 0) + 1)))
  const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8)
  const items = all.filter((item) => (!tag || item.tags.includes(tag)) && (!needle || contentMatches(item, needle)))

  return (
    <section aria-labelledby="discover-content-title">
      <div className={styles.sectionHead}>
        <h2 id="discover-content-title" className={styles.sectionTitle}>
          최근 공개 콘텐츠
        </h2>
        <div className={ui.chips} role="group" aria-label="태그">
          {topTags.map(([value]) => (
            <button key={value} type="button" className={ui.chip} aria-pressed={tag === value} onClick={() => onTag(tag === value ? undefined : value)}>
              {value}
            </button>
          ))}
        </div>
      </div>
      {items.length === 0 ? (
        <EmptyState title={query.trim() ? `'${query.trim()}' 검색 결과가 없어요.` : '조건에 맞는 콘텐츠가 없어요.'}>
          {query.trim() && (
            <button type="button" className={`${ui.button} ${ui.neutral}`} onClick={onClearSearch}>
              검색어 지우기
            </button>
          )}
          {tag && (
            <button type="button" className={`${ui.button} ${ui.neutral}`} onClick={() => onTag(undefined)}>
              태그 해제
            </button>
          )}
        </EmptyState>
      ) : (
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.contentId}>
              <article className={styles.row}>
                <div className={styles.rowMain}>
                  <p className={styles.type}>{contentTypeLabel(item.type)}</p>
                  <h3 className={styles.rowTitle}>
                    <Link to={discoverContentPath(item.contentId)} className={styles.rowLink}>
                      {item.title}
                    </Link>
                  </h3>
                  <p className={styles.summary}>{item.summary}</p>
                  <AuthorLine author={item.mentor} size={24} />
                  {item.tags.length > 0 && <p className={styles.tags}>{item.tags.join(' · ')}</p>}
                </div>
                <p className={styles.date}>{formatDate(item.publishedAt)}</p>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

interface MentorListProps {
  state: ResourceState<PublicMentorView[]>
  reload: () => void
  items: PublicMentorView[]
  query: string
  onClearSearch: () => void
}

function MentorList({ state, reload, items, query, onClearSearch }: MentorListProps) {
  if (state.status === 'loading') return <LoadingState label="멘토 목록을 불러오는 중이에요." />
  if (state.status === 'error' || state.status === 'notFound') {
    return <ErrorState title="멘토 목록을 불러오지 못했어요." error={state.status === 'error' ? state.error : null} onRetry={reload} />
  }
  if (state.data.length === 0) return <EmptyState title="아직 둘러볼 다른 멘토가 없어요." />

  return (
    <section aria-labelledby="discover-mentor-title">
      <div className={styles.sectionHead}>
        <h2 id="discover-mentor-title" className={styles.sectionTitle}>
          멘토
        </h2>
      </div>
      {items.length === 0 ? (
        <EmptyState title={`'${query.trim()}' 검색 결과가 없어요.`}>
          <button type="button" className={`${ui.button} ${ui.neutral}`} onClick={onClearSearch}>
            검색어 지우기
          </button>
        </EmptyState>
      ) : (
        <ul className={styles.list}>
          {items.map((mentor) => (
            <li key={mentor.mentorId}>
              <article className={`${styles.row} ${styles.mentorRow}`}>
                <Avatar name={mentor.name} imageUrl={mentor.profileImageUrl} size={48} />
                <div className={styles.rowMain}>
                  <h3 className={styles.rowTitle}>
                    <Link to={discoverMentorPath(mentor.mentorId)} className={styles.rowLink}>
                      {mentor.name}
                    </Link>
                    {mentor.verified && <span className={styles.verified}>인증</span>}
                  </h3>
                  <p className={styles.summary}>
                    {mentor.university} · {mentor.major} · {mentor.admissionType}
                  </p>
                  <p className={styles.experience}>{mentor.representativeExperience}</p>
                  {mentor.tags.length > 0 && <p className={styles.tags}>{mentor.tags.join(' · ')}</p>}
                </div>
                <p className={styles.date}>공개 콘텐츠 {mentor.publishedContentCount}</p>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
