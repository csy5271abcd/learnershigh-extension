import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { NavLink, useNavigate, useSearchParams } from 'react-router'
import type { EnrichmentTask } from '../../api/types.ts'
import { useAssessmentWorkspace } from '../../model/assessmentWorkspace.ts'
import {
  enrichmentPath,
  enrichmentTaskDetailPath,
  mockExamMaterialsPath,
  myEnrichmentTasksPath,
  universityResourcesPath,
} from '../../routes/paths.ts'
import { PlusIcon, SearchIcon } from '../AssessmentIcons.tsx'
import { CreateEnrichmentModal, type CreateEnrichmentPrefill } from './CreateEnrichmentModal.tsx'
import styles from './enrichment.module.css'

const searchDebounceMs = 250

const tabs = [
  { to: enrichmentPath, label: '탐구 라이브러리', end: true },
  { to: mockExamMaterialsPath, label: '모의고사 지문', end: false },
  { to: myEnrichmentTasksPath, label: '내 탐구', end: false },
  { to: universityResourcesPath, label: '대학 공개 자료', end: false },
]

interface EnrichmentFrameProps {
  children: ReactNode
  /** 탐구 라이브러리의 오른쪽 Preview (Mockup AE-LIST-01·03) */
  panel?: ReactNode
  /** 상세 화면처럼 이 화면에 검색 대상이 없으면, 검색어를 이 목록으로 가져가 검색한다 */
  searchTarget?: string
  /** 화면이 띄우는 만들기 Modal (출발 자료가 있는 경우) */
  createRequest?: CreateEnrichmentPrefill | null
  onCreateRequestHandled?: () => void
}

// 심화 탐구 공통 틀 (Mockup AE-LIST·AE-MY·AE-MOCK·AE-UNI): 검색 / 직접 만들기 / 제목 / 4개 탭.
// 검색어는 URL `q`에 두어 상세에 다녀와도 유지된다. 각 탭은 자기 계약(§16·17·18·27)의 query로 쓴다.
export function EnrichmentFrame({ children, panel, searchTarget, createRequest, onCreateRequestHandled }: EnrichmentFrameProps) {
  const { selectedContext, termAssessments, notifyDataChanged } = useAssessmentWorkspace()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const [searchInput, setSearchInput] = useState(query)
  const [syncedQuery, setSyncedQuery] = useState(query)
  if (syncedQuery !== query) {
    setSyncedQuery(query)
    if (searchInput.trim() !== query) setSearchInput(query)
  }
  const [manualCreate, setManualCreate] = useState(false)
  const modalPrefill = createRequest ?? (manualCreate ? {} : null)

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

  const closeModal = () => {
    setManualCreate(false)
    onCreateRequestHandled?.()
  }

  const onCreated = (task: EnrichmentTask) => {
    closeModal()
    notifyDataChanged()
    navigate(enrichmentTaskDetailPath(task.taskId))
  }

  return (
    <main className={styles.page} data-with-panel={panel ? 'true' : undefined}>
      <div className={styles.mainArea}>
        <div className={styles.toolbar}>
          <label className={styles.search}>
            <SearchIcon size={17} className={styles.searchIcon} />
            <span className="lh-visually-hidden">탐구 검색</span>
            <input
              type="search"
              value={searchInput}
              placeholder="주제, 키워드로 탐구 찾기"
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </label>
          <button type="button" className={styles.primaryButton} onClick={() => setManualCreate(true)}>
            <PlusIcon size={16} />
            직접 만들기
          </button>
        </div>

        <div className={styles.content}>
          <header className={styles.header}>
            <h1 className={styles.title}>심화 탐구</h1>
            <p className={styles.subtitle}>
              학교 수행평가와 별개로, 관심 있는 주제를 스스로 더 깊이 탐구해요. 정해진 순서는 없어요.
            </p>
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

      {modalPrefill && selectedContext && (
        <CreateEnrichmentModal
          subjects={selectedContext.subjects}
          assessments={termAssessments.data?.items ?? []}
          prefill={modalPrefill}
          onClose={closeModal}
          onCreated={onCreated}
        />
      )}
    </main>
  )
}
