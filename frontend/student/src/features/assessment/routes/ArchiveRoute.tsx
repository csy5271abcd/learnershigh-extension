import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toApiError } from '../api/apiError.ts'
import { listArchive, setArchiveFavorite } from '../api/growthArchiveApi.ts'
import type { ArchiveItem, ArchiveTab } from '../api/types.ts'
import { BookIcon, BulbIcon, ClipboardIcon, DownloadIcon, FolderIcon, PlusIcon, SearchIcon, StarIcon } from '../components/AssessmentIcons.tsx'
import enrichmentStyles from '../components/enrichment/enrichment.module.css'
import styles from '../components/growth/growthArchive.module.css'
import { FavoriteButton } from '../components/FavoriteButton.tsx'
import { MockDataNotice } from '../components/MockDataNotice.tsx'
import { EmptyState, ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { Toast, type ToastMessage } from '../components/Toast.tsx'
import { formatDateTime } from '../model/assessmentDetailView.ts'
import { useAssessmentWorkspace } from '../model/assessmentWorkspace.ts'
import { archiveMetaLine, archiveTabs, countArchiveSubjects, parseArchiveTab, subjectNameIn } from '../model/growthArchiveView.ts'
import { useApiQuery } from '../model/useApiQuery.ts'
import { archivePath, archiveSourcePath } from './paths.ts'

const pageSize = 100
const searchDebounceMs = 250

const emptyTexts: Record<ArchiveTab, { title: string; description: string }> = {
  recent: { title: '아직 기록이 없어요', description: '학교 수행평가나 심화 탐구를 시작하면 여기에서 다시 찾을 수 있어요.' },
  favorites: { title: '즐겨찾기한 기록이 없어요', description: '자주 보는 수행평가·심화 탐구·탐구 라이브러리에 별표를 눌러 두면 여기에 모여요.' },
  completed: { title: '완료한 기록이 없어요', description: '완료로 바꾼 학교 수행평가와 심화 탐구가 여기에 모여요.' },
  'previous-semesters': { title: '이전 학기 기록이 없어요', description: '지난 학기의 학교 수행평가가 여기에 모여요.' },
  trash: { title: '휴지통이 비어 있어요', description: '삭제 기능은 정책이 정해진 뒤 제공돼요.' },
}

const itemPath = (item: ArchiveItem) => archiveSourcePath(item.sourceType, item.sourceId)

// 보관함 (screen-map S23, Mockup AR-TAB-01~05, api-contract.md §30).
// 원본(학교 수행평가·심화 탐구)을 다시 조회하는 Projection이다. 보관함 사본을 만들지 않고, 행은 원본 상세로 이동한다.
// 즐겨찾기 표시는 모든 유형을 보여주지만, 여기서 바꿀 수 있는 것은 §30 예시 유형(SCHOOL_ASSESSMENT)뿐이다 (MM-40).
// 심화 탐구·라이브러리(Mock 전용 P-22)는 내 탐구·탐구 라이브러리 목록에서 바꾼다. 새 폴더·내보내기·사용자 폴더는 계약이 없어 비활성 (MM-41).
// 휴지통 복구·영구 삭제는 정책 미정(API-OD-A08, OD-A11)이라 실행하지 않는다. "30일 뒤 삭제" 안내는 정책이 아니라 표시하지 않는다.
// Mockup 최근 기록의 피드백 행은 §30 sourceType에 없어 넣지 않는다 (MM-39).
export function ArchiveRoute() {
  const { terms, dataVersion, notifyDataChanged } = useAssessmentWorkspace()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = parseArchiveTab(searchParams.get('tab'))
  const query = searchParams.get('q') ?? ''
  const subjectId = searchParams.get('subject') ?? ''
  const [searchInput, setSearchInput] = useState(query)
  const [syncedQuery, setSyncedQuery] = useState(query)
  if (syncedQuery !== query) {
    setSyncedQuery(query)
    if (searchInput.trim() !== query) setSearchInput(query)
  }
  const [pendingFavorite, setPendingFavorite] = useState<string>()
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const dismissToast = useCallback(() => setToast(null), [])
  const notify = (tone: ToastMessage['tone'], text: string) => setToast((previous) => ({ id: (previous?.id ?? 0) + 1, tone, text }))

  const updateParams = useCallback(
    (changes: Record<string, string | undefined>) =>
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          for (const [name, value] of Object.entries(changes)) {
            if (value) next.set(name, value)
            else next.delete(name)
          }
          return next
        },
        { replace: true, preventScrollReset: true },
      ),
    [setSearchParams],
  )

  useEffect(() => {
    if (searchInput.trim() === query) return
    const timer = window.setTimeout(() => updateParams({ q: searchInput.trim() || undefined }), searchDebounceMs)
    return () => window.clearTimeout(timer)
  }, [searchInput, query, updateParams])

  const archive = useApiQuery(`ar-list|${tab}|${query}|${dataVersion}`, () => listArchive({ tab, query: query || undefined, page: 0, size: pageSize }))
  const contexts = terms.data?.contexts ?? []
  const all = archive.data?.items ?? []
  // 과목 폴더는 §30 Query에 없어, 받은 목록 안에서만 거른다 (MM-41).
  const folders = countArchiveSubjects(all)
  const items = subjectId ? all.filter((item) => item.subjectId === subjectId) : all

  const toggleFavorite = async (item: ArchiveItem) => {
    if (pendingFavorite) return
    const key = `${item.sourceType}:${item.sourceId}`
    setPendingFavorite(key)
    try {
      await setArchiveFavorite({ sourceType: item.sourceType, sourceId: item.sourceId, favorite: !item.favorite })
      notifyDataChanged()
      notify('success', item.favorite ? '즐겨찾기에서 뺐어요. 원본 기록은 그대로예요.' : '즐겨찾기에 추가했어요.')
    } catch (caught) {
      const apiError = toApiError(caught)
      notify('error', `${apiError.message} (${apiError.code})`)
    } finally {
      setPendingFavorite(undefined)
    }
  }

  const unavailable = (text: string) => notify('info', text)
  const hasFilter = Boolean(query || subjectId)

  return (
    <main className={enrichmentStyles.page}>
      <div className={enrichmentStyles.mainArea}>
        <div className={enrichmentStyles.toolbar}>
          <label className={enrichmentStyles.search}>
            <SearchIcon size={17} className={enrichmentStyles.searchIcon} />
            <span className="lh-visually-hidden">지난 기록 검색</span>
            <input type="search" value={searchInput} placeholder="지난 기록 검색" onChange={(event) => setSearchInput(event.target.value)} />
          </label>
          <div className={styles.toolbarEnd}>
            <button
              type="button"
              className={enrichmentStyles.outlineButton}
              aria-disabled="true"
              onClick={() => unavailable('사용자 폴더는 아직 지원하지 않아요. 과목별로 모아 볼 수 있어요.')}
            >
              <PlusIcon size={15} />
              새 폴더
            </button>
            <button
              type="button"
              className={enrichmentStyles.outlineButton}
              aria-disabled="true"
              onClick={() => unavailable('보관함 내보내기는 형식이 정해지지 않아 아직 지원하지 않아요.')}
            >
              <DownloadIcon size={15} />
              내보내기
            </button>
          </div>
        </div>

        <div className={`${enrichmentStyles.content} ${styles.archiveArea}`}>
          <header className={enrichmentStyles.header}>
            <h1 className={enrichmentStyles.title}>{tab === 'trash' ? '휴지통' : '보관함'}</h1>
          </header>

          <nav className={enrichmentStyles.tabs} aria-label="보관함 보기">
            {archiveTabs.map((item) => (
              <Link
                key={item.tab}
                to={item.tab === 'recent' ? archivePath : `${archivePath}?tab=${item.tab}`}
                replace
                className={enrichmentStyles.tab}
                aria-current={item.tab === tab ? 'page' : undefined}
                onClick={() => setSearchInput('')}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {tab === 'trash' ? (
            <p className={styles.trashNote}>삭제·복구 정책이 정해지기 전이라 휴지통 항목을 복구하거나 영구 삭제할 수 없어요.</p>
          ) : (
            folders.length > 0 && (
              <div className={styles.folderChips} role="group" aria-label="과목 폴더">
                {folders.map((folder) => (
                  <button
                    key={folder.subjectId}
                    type="button"
                    className={styles.folderChip}
                    aria-pressed={subjectId === folder.subjectId}
                    onClick={() => updateParams({ subject: subjectId === folder.subjectId ? undefined : folder.subjectId })}
                  >
                    <FolderIcon size={14} />
                    {subjectNameIn(contexts, folder.subjectId) ?? '알 수 없는 과목'}
                    <span className={styles.folderCount}>{folder.count}</span>
                  </button>
                ))}
              </div>
            )
          )}

          <section aria-label={`${archiveTabs.find((item) => item.tab === tab)?.label} 목록`} aria-busy={archive.isRefreshing}>
            {archive.status === 'error' && archive.error ? (
              <div className={enrichmentStyles.stateArea}>
                <ErrorState title="보관함을 불러오지 못했어요" error={archive.error} onRetry={archive.retry} />
              </div>
            ) : !archive.data || (!terms.data && terms.status === 'loading') ? (
              <div className={enrichmentStyles.stateArea}>
                <LoadingRows rows={4} label="보관함을 불러오는 중" />
              </div>
            ) : items.length === 0 ? (
              <div className={enrichmentStyles.stateArea}>
                {hasFilter ? (
                  <EmptyState
                    title="조건에 맞는 기록이 없어요"
                    description="검색어나 과목을 바꿔 보세요."
                    action={
                      <button
                        type="button"
                        className={enrichmentStyles.outlineButton}
                        onClick={() => {
                          setSearchInput('')
                          updateParams({ q: undefined, subject: undefined })
                        }}
                      >
                        조건 초기화
                      </button>
                    }
                  />
                ) : (
                  <EmptyState title={emptyTexts[tab].title} description={emptyTexts[tab].description} />
                )}
              </div>
            ) : (
              <ul className={styles.rows}>
                {items.map((item) => {
                  const key = `${item.sourceType}:${item.sourceId}`
                  const Icon = item.sourceType === 'SCHOOL_ASSESSMENT' ? ClipboardIcon : item.sourceType === 'ENRICHMENT_TASK' ? BulbIcon : BookIcon
                  return (
                    <li key={key} className={styles.row}>
                      <Icon size={18} className={styles.rowIcon} />
                      <span className={styles.rowText}>
                        {tab === 'trash' ? (
                          <span className={styles.rowTitle}>{item.title}</span>
                        ) : (
                          <Link to={itemPath(item)} className={styles.rowTitle}>
                            {item.title}
                          </Link>
                        )}
                        <span className={styles.rowMeta}>
                          {tab === 'trash' && item.deletedAt
                            ? `${archiveMetaLine(item, subjectNameIn(contexts, item.subjectId), tab, terms.data?.currentTerm)} · ${formatDateTime(item.deletedAt)} 삭제`
                            : archiveMetaLine(item, subjectNameIn(contexts, item.subjectId), tab, terms.data?.currentTerm)}
                        </span>
                      </span>
                      <span className={styles.rowEnd}>
                        {tab === 'trash' ? (
                          <button
                            type="button"
                            className={styles.smallButton}
                            aria-disabled="true"
                            onClick={() => unavailable('복구 정책이 정해지기 전이라 아직 복구할 수 없어요.')}
                          >
                            복구
                          </button>
                        ) : (
                          <>
                            {item.noteBlockCount !== null && <span>노트 {item.noteBlockCount}블록</span>}
                            {/* 보관함은 원본 상태를 보여주고 원본으로 이동한다. Stage 5부터 있던 학교 수행평가 행 별표만 유지하고,
                                심화 탐구·라이브러리 즐겨찾기는 각 목록에서 바꾼다 (2026-10-28 사용자 요청). */}
                            {item.sourceType === 'SCHOOL_ASSESSMENT' ? (
                              <FavoriteButton
                                favorite={item.favorite}
                                pending={pendingFavorite === key}
                                title={item.title}
                                onToggle={() => void toggleFavorite(item)}
                              />
                            ) : (
                              item.favorite && (
                                <span className={styles.favoriteMark} title="즐겨찾기 (목록에서 바꿀 수 있어요)">
                                  <StarIcon size={16} filled />
                                  <span className="lh-visually-hidden">즐겨찾기</span>
                                </span>
                              )
                            )}
                          </>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <div className={enrichmentStyles.notices}>
            <MockDataNotice />
          </div>
        </div>
      </div>
      <Toast message={toast} onDismiss={dismissToast} />
    </main>
  )
}
