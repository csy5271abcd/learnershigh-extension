import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { NavLink, useNavigate, useSearchParams } from 'react-router'
import { enrichmentPath, mockExamMaterialsPath, universityResourcesPath } from '../../routes/paths.ts'
import { SearchIcon } from '../AssessmentIcons.tsx'
import styles from './enrichment.module.css'

const searchDebounceMs = 250

const tabs = [
  { to: enrichmentPath, label: '탐구 라이브러리', end: true },
  { to: mockExamMaterialsPath, label: '모의고사 지문', end: false },
  { to: universityResourcesPath, label: '대학별 자료', end: false },
]

interface EnrichmentFrameProps {
  children: ReactNode
  /** 탐구 라이브러리의 오른쪽 Preview (Mockup AE-LIST-01·03) */
  panel?: ReactNode
  /** 상세 화면처럼 이 화면에 검색 대상이 없으면, 검색어를 이 목록으로 가져가 검색한다 */
  searchTarget?: string
  /** 탭마다 검색 대상이 다를 때 안내 문구 (기본: 탐구 검색) */
  searchPlaceholder?: string
}

// 심화 탐구 공통 틀 (Mockup AE-LIST·AE-MOCK·AE-UNI): 검색 / 제목 / 3개 탭.
// 2026-11-11 범위 축소 반영(assessment-enrichment-content.md §1·§3): 읽기 전용 참고자료다.
// "직접 만들기"·"내 탐구" 탭·만들기 Modal을 없앴다. 학생 Task·진행 상태를 만들지 않는다.
// 검색어는 URL `q`에 두어 상세에 다녀와도 유지된다.
export function EnrichmentFrame({ children, panel, searchTarget, searchPlaceholder }: EnrichmentFrameProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const [searchInput, setSearchInput] = useState(query)
  const [syncedQuery, setSyncedQuery] = useState(query)
  if (syncedQuery !== query) {
    setSyncedQuery(query)
    if (searchInput.trim() !== query) setSearchInput(query)
  }

  const updateQuery = useCallback(
    (value: string) => {
      if (searchTarget) {
        navigate(value ? `${searchTarget}?q=${encodeURIComponent(value)}` : searchTarget)
        return
      }
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          if (value) next.set('q', value)
          else next.delete('q')
          // 검색 결과가 바뀌면 이전 선택은 의미가 없어진다 (Preview가 다른 카드를 보여주지 않게).
          next.delete('selected')
          return next
        },
        { replace: true, preventScrollReset: true },
      )
    },
    [navigate, searchTarget, setSearchParams],
  )

  useEffect(() => {
    if (searchInput.trim() === query) return
    const timer = window.setTimeout(() => updateQuery(searchInput.trim()), searchDebounceMs)
    return () => window.clearTimeout(timer)
  }, [searchInput, query, updateQuery])

  return (
    <main className={styles.page} data-with-panel={panel ? 'true' : undefined}>
      <div className={styles.mainArea}>
        <div className={styles.toolbar}>
          <label className={styles.search}>
            <SearchIcon size={17} className={styles.searchIcon} />
            <span className="lh-visually-hidden">참고자료 검색</span>
            <input
              type="search"
              value={searchInput}
              placeholder={searchPlaceholder ?? '주제, 키워드로 자료 찾기'}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </label>
        </div>

        <div className={styles.content}>
          <header className={styles.header}>
            <h1 className={styles.title}>심화 탐구</h1>
          </header>
          <nav className={styles.tabs} aria-label="심화 탐구 메뉴">
            {tabs.map((tab) => (
              <NavLink key={tab.to} to={tab.to} end={tab.end} className={styles.tab}>
                {tab.label}
              </NavLink>
            ))}
          </nav>
          {children}
        </div>
      </div>

      {panel && <div className={styles.panelArea}>{panel}</div>}
    </main>
  )
}
