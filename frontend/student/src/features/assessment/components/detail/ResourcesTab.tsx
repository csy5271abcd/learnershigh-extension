import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router'
import { listRecommendedSources, listResources } from '../../api/resourcesApi.ts'
import type { StudentResource } from '../../api/types.ts'
import { isHttpUrl } from '../../model/noteEditorModel.ts'
import { resourceMetaLine } from '../../model/resourceLibraryView.ts'
import { useApiQuery } from '../../model/useApiQuery.ts'
import { referenceAreaForSubject } from '../../model/referenceAreas.ts'
import { referenceLinksAreaPath, referenceLinksPath, resourcesPath } from '../../routes/paths.ts'
import { InfoIcon, PlusIcon, SearchIcon } from '../AssessmentIcons.tsx'
import { AddResourceModal, type AddResourcePrefill } from '../resources/AddResourceModal.tsx'
import { ResourceTypeIcon } from '../resources/ResourceTypeIcon.tsx'
import { EmptyState, ErrorState, LoadingRows } from '../StateViews.tsx'
import styles from './detail.module.css'
import contextStyles from './context.module.css'

const searchDebounceMs = 250
const myResourcePageSize = 20

interface ResourcesTabProps {
  subjectId: string
  subjectName: string
  /** 지금 과제·탐구 제목 (주제) */
  topic: string
  /** 노트 편집기가 준비됐는지. 아니면 "노트에 추가"를 막고 이유를 보여준다 */
  canInsert: boolean
  onInsert: (resource: StudentResource) => void
  onNotify: (tone: 'success' | 'info' | 'error', text: string) => void
}

// 자료 (Mockup SA-DETAIL-11, AUD-016 2026-10-27 승인, ST-10·11, api-contract.md §22).
// ① 과목별 추천 자료원: §22 recommendations(P-15 제안 Shape, MM-21). Mock은 참고자료 카탈로그(원본 문서 24곳, 2026-10-28)에서
//    과목 → 영역으로 만든다 (참고자료 화면과 같은 Source). "어디서 찾아볼지" 자료원이며 실제 검색 결과·기사 목록이 아니다.
//    주소가 없는 자료원은 링크를 만들지 않는다 (기사 제목·URL을 지어내지 않는다). "전체 참고자료 보기"는 이 과목 영역을 고른 채로 연다.
// ② 내 자료함 검색: §22 GET 목록. "노트에 추가"는 원문을 복사하지 않고 출처 카드(RESOURCE_LINK)를 노트에 넣는다.
// ③ URL로 자료 등록: 자료함 등록 Modal(§22 POST)을 그대로 쓴다.
export function ResourcesTab({ subjectId, subjectName, topic, canInsert, onInsert, onNotify }: ResourcesTabProps) {
  const ids = { search: useId(), reason: useId() }
  const [category, setCategory] = useState<string>()
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [version, setVersion] = useState(0)
  const [adding, setAdding] = useState<AddResourcePrefill | null>(null)

  useEffect(() => {
    if (searchInput.trim() === query) return
    const timer = window.setTimeout(() => setQuery(searchInput.trim()), searchDebounceMs)
    return () => window.clearTimeout(timer)
  }, [searchInput, query])

  const recommended = useApiQuery(`detail-recommend|${subjectId}`, () => listRecommendedSources({ subjectId }))
  const mine = useApiQuery(`detail-my-resources|${query}|${version}`, () =>
    listResources({ query: query || undefined, page: 0, size: myResourcePageSize }),
  )
  const sources = recommended.data?.items ?? []
  const categories = [...new Set(sources.map((source) => source.category))]
  const visibleSources = category ? sources.filter((source) => source.category === category) : sources
  const areaKey = referenceAreaForSubject(subjectName)
  const allReferencesPath = areaKey ? referenceLinksAreaPath(areaKey) : referenceLinksPath

  return (
    <div className={styles.panelStack}>
      <div className={styles.contextChips}>
        <span className={styles.contextLabel}>지금 보는 중</span>
        <span className={styles.contextChip}>{subjectName}</span>
        <span className={styles.contextChip} title={topic}>
          {topic}
        </span>
      </div>

      <section aria-labelledby="recommend-heading" className={contextStyles.panelSection}>
        <div className={contextStyles.sectionHead}>
          <h3 id="recommend-heading" className={contextStyles.subTitle}>
            과목 추천 자료원
          </h3>
          <span className={contextStyles.kindBadge}>탐색 후보 · 검색 결과 아님</span>
        </div>
        {recommended.status === 'error' && recommended.error ? (
          <ErrorState title="추천 자료원을 불러오지 못했어요" error={recommended.error} onRetry={recommended.retry} />
        ) : !recommended.data ? (
          <LoadingRows rows={2} label="추천 자료원을 불러오는 중" />
        ) : sources.length === 0 ? (
          <p className={styles.panelEmptyText}>이 과목에 연결된 추천 영역이 없어요. 전체 참고자료에서 영역을 골라 보거나, 찾은 자료를 주소로 직접 등록해 보세요.</p>
        ) : (
          <>
            <div className={contextStyles.filterChips} role="group" aria-label="자료원 분류">
              <button type="button" className={contextStyles.filterChip} aria-pressed={!category} onClick={() => setCategory(undefined)}>
                전체
              </button>
              {categories.map((value) => (
                <button key={value} type="button" className={contextStyles.filterChip} aria-pressed={category === value} onClick={() => setCategory(value)}>
                  {value}
                </button>
              ))}
            </div>
            <ul className={contextStyles.sourceList}>
              {visibleSources.map((source) => (
                <li key={`${source.category}:${source.sourceName}`} className={contextStyles.sourceCard}>
                  <div className={contextStyles.sourceTop}>
                    <span className={contextStyles.sourceName}>{source.sourceName}</span>
                    <span className={contextStyles.categoryBadge}>{source.category}</span>
                  </div>
                  <p className={styles.panelEmptyText}>
                    <span className={contextStyles.reasonLabel}>추천 이유</span> {source.description}
                  </p>
                  {source.searchKeywords.length > 0 && (
                    <p className={contextStyles.keywords}>
                      찾아볼 검색어: {source.searchKeywords.join(' · ')}
                    </p>
                  )}
                  <div className={contextStyles.sourceActions}>
                    {source.homepageUrl && isHttpUrl(source.homepageUrl) ? (
                      <a className={contextStyles.smallLink} href={source.homepageUrl} target="_blank" rel="noopener noreferrer" aria-label={`${source.sourceName} 공식 사이트 열기 (새 탭)`}>
                        공식 사이트 열기 ↗
                      </a>
                    ) : (
                      <span className={contextStyles.muted}>공식 주소 미확인</span>
                    )}
                    <button type="button" className={contextStyles.smallButton} onClick={() => setAdding({ sourceName: source.sourceName })}>
                      찾은 자료 등록
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
        <Link to={allReferencesPath} className={styles.textAction}>
          전체 참고자료 보기
        </Link>
      </section>

      <section aria-labelledby="my-resources-heading" className={contextStyles.panelSection}>
        <div className={contextStyles.sectionHead}>
          <h3 id="my-resources-heading" className={contextStyles.subTitle}>
            내 자료함에서 찾기
          </h3>
          <button type="button" className={contextStyles.smallButton} onClick={() => setAdding({})}>
            <PlusIcon size={13} />
            URL로 등록
          </button>
        </div>
        <label className={contextStyles.searchField} htmlFor={ids.search}>
          <SearchIcon size={15} />
          <span className="lh-visually-hidden">내 자료 검색</span>
          <input id={ids.search} type="search" value={searchInput} placeholder="자료명·출처·태그 검색" onChange={(event) => setSearchInput(event.target.value)} />
        </label>
        {!canInsert && (
          <p id={ids.reason} className={contextStyles.muted}>
            노트를 불러온 뒤 노트에 추가할 수 있어요.
          </p>
        )}
        {mine.status === 'error' && mine.error ? (
          <ErrorState title="내 자료를 불러오지 못했어요" error={mine.error} onRetry={mine.retry} />
        ) : !mine.data ? (
          <LoadingRows rows={2} label="내 자료를 불러오는 중" />
        ) : mine.data.items.length === 0 ? (
          query ? (
            <EmptyState title={`'${query}'에 맞는 자료가 없어요`} description="다른 검색어로 찾거나 주소로 새로 등록해 보세요." />
          ) : (
            <EmptyState title="자료함이 비어 있어요" description="찾은 기사·영상·논문을 주소로 등록하면 노트에 출처 카드로 넣을 수 있어요." />
          )
        ) : (
          <ul className={contextStyles.myList} aria-busy={mine.isRefreshing}>
            {mine.data.items.map((resource) => (
              <li key={resource.resourceId} className={contextStyles.myRow}>
                <ResourceTypeIcon type={resource.type} />
                <span className={contextStyles.myText}>
                  <span className={contextStyles.myTitle}>{resource.title}</span>
                  <span className={contextStyles.muted}>{resourceMetaLine(resource)}</span>
                </span>
                <button
                  type="button"
                  className={contextStyles.smallButton}
                  disabled={!canInsert}
                  aria-describedby={canInsert ? undefined : ids.reason}
                  aria-label={`${resource.title} 노트에 추가`}
                  onClick={() => onInsert(resource)}
                >
                  노트에 추가
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className={styles.infoBox}>
          <InfoIcon size={14} />
          노트에는 원문을 복사하지 않고 출처 카드만 들어가요. 등록한 주소가 실제로 열리는지는 확인하지 않아요.
        </p>
        <Link to={resourcesPath} className={styles.textAction}>
          자료함 열기
        </Link>
      </section>

      {adding && (
        <AddResourceModal
          prefill={adding}
          onClose={() => setAdding(null)}
          onCreated={(resource) => {
            setAdding(null)
            setVersion((value) => value + 1)
            onNotify('success', `'${resource.title}'을(를) 자료함에 저장했어요. "노트에 추가"로 노트에 넣을 수 있어요.`)
          }}
        />
      )}
    </div>
  )
}
