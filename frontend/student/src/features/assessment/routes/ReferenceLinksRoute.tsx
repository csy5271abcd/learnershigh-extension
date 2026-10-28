import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { getReferenceCatalog } from '../api/referenceLinksApi.ts'
import type { ReferenceAreaKey, ReferenceSourceCategory } from '../api/types.ts'
import { ArrowRightIcon, InfoIcon, SearchIcon } from '../components/AssessmentIcons.tsx'
import { MockDataNotice } from '../components/MockDataNotice.tsx'
import { ReferenceCategoryIcon, ReferenceSourceCard } from '../components/reference-links/ReferenceSourceCard.tsx'
import styles from '../components/reference-links/referenceLinks.module.css'
import { AddResourceModal, type AddResourcePrefill } from '../components/resources/AddResourceModal.tsx'
import { EmptyState, ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { Toast, type ToastMessage } from '../components/Toast.tsx'
import { areaLabel, areasOfSource, matchesReferenceSearch, parseReferenceArea, sourcesForArea } from '../model/referenceAreas.ts'
import { useApiQuery } from '../model/useApiQuery.ts'
import { resourcesPath } from './paths.ts'

const searchDebounceMs = 250
const categories: ReferenceSourceCategory[] = ['공식 기관', '논문·학술', '뉴스·시사', '통계·데이터', '영상·다큐', '교육 도구·포털']

/** "이런 자료원을 추천해요" 3묶음 → 아래 둘러보기의 분류 필터로 이어진다 */
const recommendGroups: { title: string; text: string; categories: ReferenceSourceCategory[] }[] = [
  { title: '공식 기관·공공데이터', text: '규범·사료·통계처럼 근거가 되는 1차 자료를 찾을 때', categories: ['공식 기관', '통계·데이터'] },
  { title: '논문·연구자료', text: '보고서·발표에 쓸 전문 연구 근거를 찾을 때', categories: ['논문·학술'] },
  { title: '뉴스·교육 영상', text: '주제 배경을 이해하고 탐구 질문을 떠올릴 때', categories: ['뉴스·시사', '영상·다큐', '교육 도구·포털'] },
]

// 참고자료 (2026-10-28 신설, screen-map S25). 과목별 공식 자료원(사이트·채널)을 찾는 탐색 허브.
// Daglo 콘텐츠 안내 화면(daglo-quiz-01·02)의 정보 구조(소개 → 단계 카드 3개 → 추천 카드 3개)를 참고해 LearnersHigh 디자인으로 만들었다.
// - 자료원 = 대표 홈페이지·채널 주소. 개별 기사·논문 검색 결과가 아니며 검색 API·원문 수집 권한도 없다.
// - 학생이 사이트에서 찾은 개별 자료 주소만 "찾은 자료 등록"(자료함 §22 POST)으로 저장하고, 노트에서는 "/참고자료"로 넣는다.
// - 카탈로그는 계약이 없는 Mock 전용 응답이다 (P-24 PROPOSED). 영역·분류·검색 상태는 URL에 둔다.
export function ReferenceLinksRoute() {
  const [searchParams, setSearchParams] = useSearchParams()
  const area = parseReferenceArea(searchParams.get('area'))
  const category = categories.find((value) => value === searchParams.get('category'))
  const query = searchParams.get('q') ?? ''
  const [searchInput, setSearchInput] = useState(query)
  const [syncedQuery, setSyncedQuery] = useState(query)
  if (syncedQuery !== query) {
    setSyncedQuery(query)
    if (searchInput.trim() !== query) setSearchInput(query)
  }
  const [adding, setAdding] = useState<AddResourcePrefill | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const dismissToast = useCallback(() => setToast(null), [setToast])
  const browseRef = useRef<HTMLElement>(null)
  const catalog = useApiQuery('reference-catalog', getReferenceCatalog)

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

  // 수행평가 자료 탭의 "전체 참고자료 보기"(#browse)로 들어오면 둘러보기 영역으로 바로 간다.
  const scrolledRef = useRef(false)
  useEffect(() => {
    if (scrolledRef.current || !catalog.data || window.location.hash !== '#browse') return
    scrolledRef.current = true
    browseRef.current?.scrollIntoView({ block: 'start' })
  }, [catalog.data])

  const goBrowse = (changes?: Record<string, string | undefined>) => {
    if (changes) updateParams(changes)
    browseRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    browseRef.current?.focus({ preventScroll: true })
  }

  const data = catalog.data
  // 영역을 고르면 그 영역의 원본 순서·활용 문장, 아니면 전체 자료원(원본 번호 순)
  const rows = data
    ? area
      ? sourcesForArea(data, area).map(({ source, usage }) => ({ source, usage }))
      : data.sources.map((source) => ({ source, usage: null as string | null }))
    : []
  const enriched = data
    ? rows.map((row) => {
        const areas = areasOfSource(data, row.source.sourceId)
        const usages = data.areas.flatMap((item) => item.sources.filter((s) => s.sourceId === row.source.sourceId).map((s) => ({ label: item.label, usage: s.usage })))
        return { ...row, areas, usages }
      })
    : []
  const visible = enriched.filter(
    (row) =>
      (!category || row.source.category === category) &&
      matchesReferenceSearch(query, row.source, row.areas.map((a) => a.label), row.usages.map((u) => u.usage)),
  )
  const areaTips = data && area ? (data.areas.find((item) => item.areaKey === area)?.tips ?? []) : []
  const hasFilter = Boolean(query || category)

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        {/* 1. 소개 (Daglo 상단 안내 영역 구조) */}
        <section className={styles.hero} aria-labelledby="reference-hero-title">
          <div className={styles.heroVisual} aria-hidden="true">
            <div className={styles.mockWindow}>
              <p className={styles.mockWindowTitle}>과목별 참고자료</p>
              <div className={styles.mockChips}>
                <span data-active="true">국어·문학</span>
                <span>사회·정치·경제</span>
                <span>과학·물리</span>
              </div>
              {['국립국어원', 'RISS 학술연구정보서비스', 'KOSIS 국가통계포털'].map((name, index) => (
                <div key={name} className={styles.mockRow}>
                  <span className={styles.mockRowIcon}>
                    <ReferenceCategoryIcon category={(['공식 기관', '논문·학술', '통계·데이터'] as const)[index]} size={16} />
                  </span>
                  <span className={styles.mockRowText}>
                    <strong>{name}</strong>
                    <span>{(['공식 기관', '논문·학술', '통계·데이터'] as const)[index]}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.heroText}>
            <h1 id="reference-hero-title" className={styles.heroTitle}>
              과목별 참고자료
            </h1>
            <p className={styles.heroLead}>공신력 있는 사이트와 교육 자료원을 과목에 맞게 찾아보세요. 수행평가와 심화 탐구에 쓸 근거를 어디서 찾을지 알려 드려요.</p>
            <button type="button" className={styles.heroButton} onClick={() => goBrowse()}>
              참고자료 둘러보기
              <ArrowRightIcon size={16} />
            </button>
          </div>
        </section>

        {/* 2. 사용 안내 STEP 카드 3개 */}
        <section className={styles.block} aria-labelledby="reference-steps-title">
          <h2 id="reference-steps-title" className={styles.blockTitle}>
            참고자료는 이렇게 활용해요
          </h2>
          <p className={styles.blockLead}>수행평가와 심화 탐구에 필요한 신뢰할 수 있는 자료원을 과목별로 찾아보세요.</p>
          <ol className={styles.stepGrid}>
            <li className={styles.stepCard}>
              <div className={styles.stepVisual} aria-hidden="true">
                <div className={styles.stepAreaGrid}>
                  {['국어', '수학', '사회', '과학', '화학', '생명', '정보', '역사'].map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
              </div>
              <div className={styles.stepBody}>
                <p className={styles.stepTitle}>
                  <span className={styles.stepPill}>STEP 1</span>과목 선택
                </p>
                <p className={styles.stepText}>국어, 수학, 과학, 사회 등 참고자료를 찾을 과목 영역을 선택하세요.</p>
              </div>
            </li>
            <li className={styles.stepCard}>
              <div className={styles.stepVisual} aria-hidden="true">
                <div className={styles.stepSearch}>
                  <span className={styles.stepSearchBar}>
                    <SearchIcon size={13} />
                    통계, 논문, 다큐…
                  </span>
                  <span className={styles.stepTagRow}>
                    <span>공식 기관</span>
                    <span>논문·학술</span>
                    <span>뉴스</span>
                    <span>통계</span>
                    <span>영상</span>
                  </span>
                </div>
              </div>
              <div className={styles.stepBody}>
                <p className={styles.stepTitle}>
                  <span className={styles.stepPill}>STEP 2</span>자료원 탐색
                </p>
                <p className={styles.stepText}>공식 기관, 논문·학술 사이트, 뉴스, 통계, 교육 영상 중 목적에 맞는 자료원을 골라 공식 사이트로 이동해요.</p>
              </div>
            </li>
            <li className={styles.stepCard}>
              <div className={styles.stepVisual} aria-hidden="true">
                <div className={styles.stepNote}>
                  <span className={styles.stepNoteLine} />
                  <span className={styles.stepNoteLine} data-short="true" />
                  <span className={styles.stepNoteCard}>
                    <span className={styles.stepNoteIcon}>🔗</span>
                    <span>
                      <strong>찾은 논문 제목</strong>
                      <span>RISS · 출처 카드</span>
                    </span>
                  </span>
                </div>
              </div>
              <div className={styles.stepBody}>
                <p className={styles.stepTitle}>
                  <span className={styles.stepPill}>STEP 3</span>탐구 노트에 활용
                </p>
                <p className={styles.stepText}>사이트에서 찾은 개별 자료의 주소를 자료함에 등록하고, 탐구 노트에서 "/참고자료"로 출처 카드를 넣어요.</p>
              </div>
            </li>
          </ol>
        </section>

        {/* 3. 추천 자료원 묶음 → 둘러보기 분류로 연결 */}
        <section className={styles.block} aria-labelledby="reference-recommend-title">
          <h2 id="reference-recommend-title" className={styles.blockTitle}>
            이런 자료원을 추천해요
          </h2>
          <ul className={styles.recommendGrid}>
            {recommendGroups.map((group) => {
              const names = data ? data.sources.filter((source) => group.categories.includes(source.category)).slice(0, 3).map((source) => source.name) : []
              return (
                <li key={group.title} className={styles.recommendCard}>
                  <div className={styles.recommendVisual} aria-hidden="true">
                    {group.categories.slice(0, 3).map((value) => (
                      <span key={value} className={styles.recommendIcon}>
                        <ReferenceCategoryIcon category={value} size={26} />
                      </span>
                    ))}
                  </div>
                  <div className={styles.stepBody}>
                    <p className={styles.recommendTitle}>{group.title}</p>
                    <p className={styles.stepText}>{group.text}</p>
                    {names.length > 0 && <p className={styles.recommendNames}>예: {names.join(', ')}</p>}
                    <button
                      type="button"
                      className={styles.textButton}
                      onClick={() => goBrowse({ category: group.categories[0], q: undefined })}
                    >
                      {group.categories[0]} 자료원 보기
                      <ArrowRightIcon size={14} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        {/* 4. 둘러보기: 과목 영역·검색·분류·자료원 카드 */}
        <section ref={browseRef} id="browse" className={styles.block} aria-labelledby="reference-browse-title" tabIndex={-1}>
          <div className={styles.browseHead}>
            <div>
              <h2 id="reference-browse-title" className={styles.blockTitleLeft}>
                참고자료 둘러보기
              </h2>
              <p className={styles.blockLeadLeft}>
                자료원 {data?.sources.length ?? '–'}곳 · 과목 영역 {data?.areas.length ?? '–'}개 · {data ? `${data.basis.checkedOn} 확인한 공식 주소` : ''}
              </p>
            </div>
            <Link to={resourcesPath} className={styles.textButton}>
              내 자료함 열기
              <ArrowRightIcon size={14} />
            </Link>
          </div>

          <div className={styles.areaChips} role="group" aria-label="과목 영역">
            <button type="button" className={styles.areaChip} aria-pressed={!area} onClick={() => updateParams({ area: undefined })}>
              전체
            </button>
            {(data?.areas ?? []).map((item) => (
              <button key={item.areaKey} type="button" className={styles.areaChip} aria-pressed={area === item.areaKey} onClick={() => updateParams({ area: item.areaKey as ReferenceAreaKey })}>
                {item.label}
              </button>
            ))}
          </div>

          <div className={styles.toolbarRow}>
            <label className={styles.searchField}>
              <SearchIcon size={16} />
              <span className="lh-visually-hidden">자료원 검색</span>
              <input type="search" value={searchInput} placeholder="사이트 이름, 자료 유형, 활용 목적, 과목 검색" onChange={(event) => setSearchInput(event.target.value)} />
            </label>
            <div className={styles.categoryChips} role="group" aria-label="자료 유형">
              <button type="button" className={styles.categoryChip} aria-pressed={!category} onClick={() => updateParams({ category: undefined })}>
                전체 유형
              </button>
              {categories.map((value) => (
                <button key={value} type="button" className={styles.categoryChip} aria-pressed={category === value} onClick={() => updateParams({ category: value })}>
                  {value}
                </button>
              ))}
            </div>
          </div>

          {area && data && (
            <p className={styles.areaNote}>
              <InfoIcon size={13} />
              <span>
                <strong>{areaLabel(data, area)}</strong> 추천 자료원 {sourcesForArea(data, area).length}곳을 원본 문서 순서로 보여요.
                {areaTips.map((tip) => ` ${tip}.`).join('')}
              </span>
            </p>
          )}

          {catalog.status === 'error' && catalog.error ? (
            <ErrorState title="참고자료를 불러오지 못했어요" error={catalog.error} onRetry={catalog.retry} />
          ) : !data ? (
            <LoadingRows rows={3} label="참고자료를 불러오는 중" />
          ) : visible.length === 0 ? (
            <EmptyState
              title="조건에 맞는 자료원이 없어요"
              description="검색어나 자료 유형을 바꿔 보세요."
              action={
                hasFilter ? (
                  <button type="button" className={styles.addButton} onClick={() => {
                    setSearchInput('')
                    updateParams({ q: undefined, category: undefined })
                  }}>
                    조건 초기화
                  </button>
                ) : undefined
              }
            />
          ) : (
            <>
              <p className={styles.resultCount} role="status">
                자료원 {visible.length}곳
              </p>
              <ul className={styles.sourceGrid}>
                {visible.map((row) => (
                  <li key={row.source.sourceId}>
                    <ReferenceSourceCard
                      source={row.source}
                      areas={row.areas}
                      usage={row.usage}
                      usages={row.usages}
                      onAddFound={() => setAdding({ sourceName: row.source.name })}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className={styles.footNote}>
            <InfoIcon size={13} />
            링크는 각 서비스의 대표 홈페이지·채널이에요. 특정 기사·논문 주소가 아니고, 이 앱이 사이트 안을 검색하지 않아요. RISS·DBpia·ScienceON은 기관 인증·구독에 따라 원문 열람 범위가 달라요. 기사·논문·영상을 인용할 때는 제목·저자·발행일·원문 주소를 따로 적어 주세요.
          </p>
          <MockDataNotice />
        </section>
      </div>

      {adding && (
        <AddResourceModal
          prefill={adding}
          onClose={() => setAdding(null)}
          onCreated={(resource) => {
            setAdding(null)
            setToast((previous) => ({
              id: (previous?.id ?? 0) + 1,
              tone: 'success',
              text: `'${resource.title}'을(를) 자료함에 저장했어요. 탐구 노트에서 "/참고자료"로 넣을 수 있어요.`,
            }))
          }}
        />
      )}
      <Toast message={toast} onDismiss={dismissToast} />
    </main>
  )
}
