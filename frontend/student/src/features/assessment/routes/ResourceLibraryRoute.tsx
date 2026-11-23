import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { listRecommendedSources, listResources, listSharedResources } from '../api/resourcesApi.ts'
import type { StudentResource } from '../api/types.ts'
import { ChevronDownIcon, PlusIcon, SearchIcon } from '../components/AssessmentIcons.tsx'
import enrichmentStyles from '../components/enrichment/enrichment.module.css'
import { MockDataNotice } from '../components/MockDataNotice.tsx'
import { AddResourceModal, type AddResourcePrefill } from '../components/resources/AddResourceModal.tsx'
import styles from '../components/resources/resources.module.css'
import { ResourceTypeIcon } from '../components/resources/ResourceTypeIcon.tsx'
import { EmptyState, ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { Toast, type ToastMessage } from '../components/Toast.tsx'
import { useAssessmentWorkspace } from '../model/assessmentWorkspace.ts'
import {
  parseResourceType,
  resourceFilterTypes,
  resourceMetaLine,
  resourceTypeLabel,
} from '../model/resourceLibraryView.ts'
import { useApiQuery } from '../model/useApiQuery.ts'
import { resourceDetailPath } from './paths.ts'

const pageSize = 50
const searchDebounceMs = 250

// 자료함 (screen-map S21, Mockup RL-LIST-01·02, inquiry §7, api-contract.md §22).
// 위: 과목별 추천 자료원(탐색 후보 출처, §22 recommendations). 아래: 내 자료(§22 목록, 본인 비공개).
// 검색은 Mockup에 없지만 §22 query와 다른 Assessment 목록의 도구 막대 위치를 따라 둔다 (quality 기록).
// Mockup의 행별 "연결된 수행평가"는 자료–과제 연결 계약이 없어 표시하지 않는다 (MM-30). A28-47: 출처 확인 배지·AI 요약 버튼 없음.
export function ResourceLibraryRoute() {
  const { selectedContext, dataVersion, notifyDataChanged } = useAssessmentWorkspace()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const type = parseResourceType(searchParams.get('type'))
  const subjectId = searchParams.get('subject') ?? ''

  const [searchInput, setSearchInput] = useState(query)
  const [syncedQuery, setSyncedQuery] = useState(query)
  if (syncedQuery !== query) {
    setSyncedQuery(query)
    if (searchInput.trim() !== query) setSearchInput(query)
  }
  const [addPrefill, setAddPrefill] = useState<AddResourcePrefill | null>(null)
  const [openSource, setOpenSource] = useState<string>()
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const dismissToast = useCallback(() => setToast(null), [])

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

  const resources = useApiQuery(`rl-list|${query}|${type ?? ''}|${dataVersion}`, () =>
    listResources({ query: query || undefined, type, page: 0, size: pageSize }),
  )
  const subjects = selectedContext?.subjects ?? []
  const subjectName = subjects.find((subject) => subject.subjectId === subjectId)?.name ?? null
  const recommendations = useApiQuery(subjectId ? `rl-reco|${subjectId}|${subjectName ?? ''}` : 'rl-reco|none', () =>
    subjectId ? listRecommendedSources({ subjectId, subjectName }) : Promise.resolve({ items: [] }),
  )
  const [recoCategory, setRecoCategory] = useState<string>()
  const [recoQuery, setRecoQuery] = useState('')
  const recoItems = (recommendations.data?.items ?? []).filter(
    (source) =>
      (!recoCategory || source.category === recoCategory) &&
      (!recoQuery.trim() || [source.sourceName, source.category, source.description].some((text) => text.toLocaleLowerCase('ko').includes(recoQuery.trim().toLocaleLowerCase('ko')))),
  )
  const recoCategories = [...new Set((recommendations.data?.items ?? []).map((source) => source.category))]

  const onCreated = (resource: StudentResource) => {
    setAddPrefill(null)
    notifyDataChanged()
    navigate(resourceDetailPath(resource.resourceId), { state: { created: true } })
  }

  const hasFilter = Boolean(query || type)
  const items = resources.data?.items ?? []

  return (
    <main className={enrichmentStyles.page}>
      <div className={enrichmentStyles.mainArea}>
        <div className={enrichmentStyles.toolbar}>
          <label className={enrichmentStyles.search}>
            <SearchIcon size={17} className={enrichmentStyles.searchIcon} />
            <span className="lh-visually-hidden">내 자료 검색</span>
            <input type="search" value={searchInput} placeholder="자료명, 메모, 태그로 찾기" onChange={(event) => setSearchInput(event.target.value)} />
          </label>
          <button type="button" className={enrichmentStyles.primaryButton} onClick={() => setAddPrefill({})}>
            <PlusIcon size={16} />
            자료 추가
          </button>
        </div>

        <div className={`${enrichmentStyles.content} ${styles.area}`}>
          <header className={enrichmentStyles.header}>
            <h1 className={enrichmentStyles.title}>자료함</h1>
          </header>

          <section className={styles.recoCard} aria-labelledby="reco-heading">
            <div className={styles.recoHead}>
              <h2 id="reco-heading" className={styles.recoLabel}>
                과목별 추천 자료원
              </h2>
              <span className={`${enrichmentStyles.selectWrap} ${styles.recoSelect}`}>
                <label className="lh-visually-hidden" htmlFor="reco-subject">
                  추천 과목
                </label>
                <select
                  id="reco-subject"
                  className={enrichmentStyles.select}
                  value={subjectId}
                  onChange={(event) => {
                    setOpenSource(undefined)
                    setRecoCategory(undefined)
                    setRecoQuery('')
                    updateParams({ subject: event.target.value || undefined })
                  }}
                >
                  <option value="">과목 선택</option>
                  {subjects.map((subject) => (
                    <option key={subject.subjectId} value={subject.subjectId}>
                      {subject.name}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon size={14} className={enrichmentStyles.selectChevron} />
              </span>
            </div>
            {!subjectId ? (
              <p className={styles.recoHint}>과목별 뉴스·영상·논문·통계 자료원</p>
            ) : recommendations.status === 'error' && recommendations.error ? (
              <ErrorState title="추천 자료원을 불러오지 못했어요" error={recommendations.error} onRetry={recommendations.retry} />
            ) : !recommendations.data ? (
              <LoadingRows rows={1} label="추천 자료원을 불러오는 중" />
            ) : recommendations.data.items.length === 0 ? (
              <p className={styles.recoHint} data-testid="reco-empty">이 과목에 준비된 추천 자료원이 아직 없어요.</p>
            ) : (
              <>
                <p className={styles.recoHint} data-testid="reco-basis">
                  {'basis' in recommendations.data && recommendations.data.basis === 'general'
                    ? `'${subjectName ?? '이 과목'}'에 맞춘 추천 영역이 없어 어느 과목에나 쓰는 일반 자료원(도서관·논문·통계)을 보여줘요.`
                    : `${'areaLabel' in recommendations.data && recommendations.data.areaLabel ? `${recommendations.data.areaLabel} 영역 · ` : ''}검토한 자료원 목록이에요(AI 추천 아님).`}
                </p>
                <div className={enrichmentStyles.chips} role="group" aria-label="추천 자료원 유형">
                  <button type="button" className={enrichmentStyles.chip} aria-pressed={!recoCategory} onClick={() => setRecoCategory(undefined)}>
                    전체
                  </button>
                  {recoCategories.map((category) => (
                    <button key={category} type="button" className={enrichmentStyles.chip} aria-pressed={recoCategory === category} onClick={() => setRecoCategory(category)}>
                      {category}
                    </button>
                  ))}
                  <label className={enrichmentStyles.search} style={{ maxWidth: 220 }}>
                    <span className="lh-visually-hidden">추천 자료원 검색</span>
                    <input type="search" value={recoQuery} placeholder="자료원 찾기" data-testid="reco-search" onChange={(event) => setRecoQuery(event.target.value)} />
                  </label>
                </div>
                {recoItems.length === 0 && <p className={styles.recoHint}>조건에 맞는 자료원이 없어요.</p>}
                <ul className={styles.sourceChips} aria-label="추천 자료원">
                  {recoItems.map((source) => (
                    <li key={source.sourceName}>
                      <button
                        type="button"
                        className={styles.sourceChip}
                        aria-expanded={openSource === source.sourceName}
                        aria-controls="reco-source-detail"
                        onClick={() => setOpenSource(openSource === source.sourceName ? undefined : source.sourceName)}
                      >
                        {source.sourceName}
                        <span className={styles.sourceCategory}>{source.category}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {recoItems
                  .filter((source) => source.sourceName === openSource)
                  .map((source) => (
                    <div key={source.sourceName} id="reco-source-detail" className={styles.sourceDetail}>
                      <p>
                        <strong>{source.sourceName}</strong> · {source.description}
                      </p>
                      {source.searchKeywords.length > 0 && <p>추천 검색어: {source.searchKeywords.join(', ')}</p>}
                      {source.homepageUrl && (
                        <p>
                          출처:{' '}
                          <a href={source.homepageUrl} target="_blank" rel="noopener noreferrer" data-testid="reco-link">
                            {source.homepageUrl}
                          </a>
                        </p>
                      )}
                      <p className={styles.recoHint}>
                        탐색 후보 출처예요. 유료·로그인이 필요한 자료가 있을 수 있어요.
                      </p>
                      <button type="button" className={enrichmentStyles.textLink} data-testid="reco-add" onClick={() => setAddPrefill({ sourceName: source.sourceName })}>
                        이 자료원에서 찾은 자료 추가
                      </button>
                    </div>
                  ))}
              </>
            )}
          </section>

          <div className={`${enrichmentStyles.chips} ${styles.typeFilters}`} role="group" aria-label="자료 유형">
            <button type="button" className={enrichmentStyles.chip} aria-pressed={!type} onClick={() => updateParams({ type: undefined })}>
              전체
            </button>
            {resourceFilterTypes.map((value) => (
              <button key={value} type="button" className={enrichmentStyles.chip} aria-pressed={type === value} onClick={() => updateParams({ type: value })}>
                {resourceTypeLabel(value)}
              </button>
            ))}
          </div>

          <section aria-label="내 자료 목록" aria-busy={resources.isRefreshing}>
            {resources.status === 'error' && resources.error ? (
              <div className={enrichmentStyles.stateArea}>
                <ErrorState title="내 자료를 불러오지 못했어요" error={resources.error} onRetry={resources.retry} />
              </div>
            ) : !resources.data ? (
              <div className={enrichmentStyles.stateArea}>
                <LoadingRows rows={4} label="내 자료를 불러오는 중" />
              </div>
            ) : items.length === 0 ? (
              <div className={enrichmentStyles.stateArea}>
                {hasFilter ? (
                  <EmptyState
                    title="조건에 맞는 자료가 없어요"
                    action={
                      <button
                        type="button"
                        className={enrichmentStyles.outlineButton}
                        onClick={() => {
                          setSearchInput('')
                          updateParams({ q: undefined, type: undefined })
                        }}
                      >
                        조건 초기화
                      </button>
                    }
                  />
                ) : (
                  <EmptyState
                    title="아직 모은 자료가 없어요"
                    description="조사하면서 본 기사·논문·영상의 출처를 자료함에 남겨 두면 노트를 쓸 때 다시 찾기 쉬워요."
                    action={
                      <button type="button" className={enrichmentStyles.outlineButton} onClick={() => setAddPrefill({})}>
                        자료 추가
                      </button>
                    }
                  />
                )}
              </div>
            ) : (
              <ul className={styles.list}>
                {items.map((resource) => {
                  return (
                    <li key={resource.resourceId} className={styles.row}>
                      <span className={styles.typeIcon} aria-hidden="true">
                        <ResourceTypeIcon type={resource.type} />
                      </span>
                      <span className={styles.rowText}>
                        <Link to={resourceDetailPath(resource.resourceId)} className={styles.rowTitle}>
                          {resource.title}
                        </Link>
                        <span className={styles.rowMeta}>{resourceMetaLine(resource)}</span>
                      </span>
                      {/* A28-47: '출처 확인 필요' 배지·'AI 요약'(Stage 3 안내만 띄우던 버튼) 제거. 저장된 출처 정보는 상세 화면에 그대로 */}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <SharedResources />

          <div className={enrichmentStyles.notices}>
            <MockDataNotice />
          </div>
        </div>
      </div>

      {addPrefill && <AddResourceModal prefill={addPrefill} onClose={() => setAddPrefill(null)} onCreated={onCreated} />}
      <Toast message={toast} onDismiss={dismissToast} />
    </main>
  )
}

/** 선생님(관리자)이 학생에게 공개한 참고자료 (2026-11-11, 읽기 전용). 내 자료함(비공개)과 별개다. */
function SharedResources() {
  const shared = useApiQuery('rl-shared', () => listSharedResources())
  if (shared.status === 'error' && shared.error) {
    return (
      <section aria-labelledby="shared-resources-heading">
        <h2 id="shared-resources-heading" className={enrichmentStyles.sectionHeading}>선생님이 공개한 자료</h2>
        <ErrorState title="공개 자료를 불러오지 못했어요" error={shared.error} onRetry={shared.retry} />
      </section>
    )
  }
  return (
    <section aria-labelledby="shared-resources-heading" data-testid="shared-resources">
      <h2 id="shared-resources-heading" className={enrichmentStyles.sectionHeading}>선생님이 공개한 자료</h2>
      {!shared.data ? (
        <LoadingRows rows={1} label="공개 자료를 불러오는 중" />
      ) : shared.data.items.length === 0 ? (
        <p className={enrichmentStyles.previewHint}>아직 선생님이 공개한 자료가 없어요.</p>
      ) : (
        <ul className={enrichmentStyles.resourceList}>
          {shared.data.items.map((item) => (
            <li key={item.resourceId} className={enrichmentStyles.resourceRow}>
              <div className={enrichmentStyles.resourceMain}>
                <span className={enrichmentStyles.rowText}>
                  <span className={enrichmentStyles.rowTitle}>{item.title}</span>
                  <span className={enrichmentStyles.resourceMeta}>
                    {[item.sourceName, item.author, item.description].filter(Boolean).join(' · ') || '설명 없음'}
                  </span>
                </span>
                {item.sourceUrl && (
                  <a className={enrichmentStyles.outlineButton} href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                    원문 열기
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
