import { useState } from 'react'
import { SchoolLayout, type SchoolSectionId } from './components/SchoolLayout.tsx'
import type { SchoolArchiveLoader } from './fixtures/schoolArchive.fixture.ts'
import type { ArchiveItemView, ArchiveSourceFilter } from './model/types.ts'
import { useSchoolArchive } from './model/useSchoolArchive.ts'
import styles from './SchoolArchivePage.module.css'

/** 출처 Filter (Contract source=task|growth). Mockup의 유형 Chip(발표 / 포스터 …)은 원본에 유형 정보가 없어 두지 않는다. */
const sourceFilters: { id: ArchiveSourceFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'task', label: '수행평가' },
  { id: 'growth', label: '성장 활동' },
]

const sourceLabel: Record<ArchiveItemView['source'], string> = { task: '수행평가', growth: '성장 활동' }

interface SchoolArchivePageProps {
  loadArchive: SchoolArchiveLoader
  source: ArchiveSourceFilter
  query: string
  onSourceChange: (source: ArchiveSourceFilter) => void
  onQueryChange: (query: string) => void
  /** 검색 · 출처를 한 번에 처음 상태로 */
  onReset: () => void
  onItemOpen: (item: ArchiveItemView) => void
  studentGrade: string
  onSectionSelect: (id: SchoolSectionId) => void
}

// School Archive (Archive-00 Mockup): 완료된 수행평가와 Archive 저장한 Growth Activity가 함께 쌓이는 기록.
// 검색 / 출처 Filter는 URL(?query=&source=)에 둬 새로고침 / Back 후에도 유지한다. 카드 전체를 누르면 원본으로 이동한다.
export function SchoolArchivePage({
  loadArchive,
  source,
  query,
  onSourceChange,
  onQueryChange,
  onReset,
  onItemOpen,
  studentGrade,
  onSectionSelect,
}: SchoolArchivePageProps) {
  const { state, reload } = useSchoolArchive(loadArchive, { source, query })
  // 입력 중인 검색어 (URL은 입력할 때마다 바꾸되 History는 쌓지 않는다)
  const [draft, setDraft] = useState(query)
  const [syncedQuery, setSyncedQuery] = useState(query)
  if (syncedQuery !== query) {
    // Back / Forward로 주소가 바뀌면 입력칸도 따라간다.
    setSyncedQuery(query)
    setDraft(query)
  }

  return (
    <SchoolLayout current="archive" studentGrade={studentGrade} onSectionSelect={onSectionSelect} busy={state.status === 'loading'}>
      <section className={styles.page} aria-labelledby="school-archive-heading">
        <h2 id="school-archive-heading" className="lh-visually-hidden">
          Archive
        </h2>
        <p className={styles.lead}>최종 제출을 마친 수행평가와 Archive에 저장한 성장 활동이 여기에 모여요.</p>

        <div className={styles.toolbar}>
          <label className={styles.search}>
            <span className="lh-visually-hidden">Archive 검색</span>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
              <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={draft}
              placeholder="활동 이름, 과목, Reflection 검색"
              onChange={(event) => {
                setDraft(event.target.value)
                onQueryChange(event.target.value)
              }}
            />
          </label>
          <div className={styles.filters} role="group" aria-label="Archive 출처">
            {sourceFilters.map(({ id, label }) => (
              <button key={id} type="button" className={styles.filterChip} aria-pressed={id === source} onClick={() => onSourceChange(id)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {state.status === 'loading' && (
          <>
            <p className="lh-visually-hidden" role="status">
              Archive를 불러오는 중이에요.
            </p>
            <div className={styles.grid} aria-hidden="true">
              {Array.from({ length: 3 }, (_, index) => (
                <span key={index} className={styles.skeletonCard} />
              ))}
            </div>
          </>
        )}

        {state.status === 'error' && (
          <div className={styles.notice} role="alert">
            <p className={styles.noticeTitle}>Archive를 불러오지 못했어요.</p>
            <p className={styles.noticeDescription}>잠시 후 다시 시도해 주세요.</p>
            <button type="button" className={styles.noticeButton} onClick={reload}>
              다시 시도
            </button>
          </div>
        )}

        {state.status === 'success' &&
          (state.data.totalAll === 0 ? (
            <p className={styles.notice} role="status">
              아직 보관된 활동이 없어요. 최종 제출을 마친 수행평가와 Archive에 저장한 성장 활동이 여기에 모여요.
            </p>
          ) : state.data.items.length === 0 ? (
            <div className={styles.notice} role="status">
              <p>조건에 맞는 기록이 없어요.</p>
              <button
                type="button"
                className={styles.noticeButton}
                onClick={() => {
                  setDraft('')
                  onReset()
                }}
              >
                전체 보기
              </button>
            </div>
          ) : (
            <ul className={styles.grid} aria-label={`Archive 기록 ${state.data.items.length}개`}>
              {state.data.items.map((item) => (
                <li key={`${item.source}-${item.sourceId}`}>
                  <ArchiveCard item={item} onOpen={() => onItemOpen(item)} />
                </li>
              ))}
            </ul>
          ))}
      </section>
    </SchoolLayout>
  )
}

function ArchiveCard({ item, onOpen }: { item: ArchiveItemView; onOpen: () => void }) {
  const titleId = `archive-${item.source}-${item.sourceId}-title`
  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <p className={styles.period}>{item.periodLabel}</p>
      <h3 id={titleId} className={styles.title}>
        {/* 카드 전체를 누르면 원본으로 이동한다. (CSS로 버튼 영역을 카드 전체로 넓힌다) */}
        <button type="button" className={styles.open} onClick={onOpen}>
          {item.title}
          <span className="lh-visually-hidden"> {sourceLabel[item.source]} 보기</span>
        </button>
      </h3>
      <p className={styles.tags}>
        <span className={styles.source}>{sourceLabel[item.source]}</span>
        {item.result && <span className={styles.result}>{item.result}</span>}
      </p>
      {/* Task에는 Reflection이 없다. 가짜 Reflection을 만들지 않고 Mockup 문장으로 조용히 알린다. */}
      <p className={styles.reflection} data-empty={!item.reflectionSummary || undefined}>
        {item.reflectionSummary ?? 'Reflection을 아직 쓰지 않았어요.'}
      </p>
      <p className={styles.meta}>
        {item.category}
        {item.evidenceCount !== null && ` · Evidence ${item.evidenceCount}개`}
      </p>
    </article>
  )
}
