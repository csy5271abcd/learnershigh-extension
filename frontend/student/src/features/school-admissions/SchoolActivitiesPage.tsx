import { useState } from 'react'
import { SchoolLayout, type SchoolSectionId } from './components/SchoolLayout.tsx'
import type { SchoolActivityListLoader } from './fixtures/schoolActivity.fixture.ts'
import {
  activityPeriodText,
  activityStatusLabel,
  activityTypeLabel,
  activityTypes,
  isThisSemester,
  reflectionStatusText,
  type ActivityType,
  type GrowthActivityListItem,
} from './model/activity.ts'
import { useSchoolActivityList } from './model/useSchoolActivities.ts'
import styles from './SchoolActivitiesPage.module.css'

/** 유형 Chip (Activities-00: 전체 + 7개, 기타는 Chip 없이 전체에서만 보인다) */
const typeFilters = activityTypes.filter((item) => item.id !== 'etc')

interface SchoolActivitiesPageProps {
  loadList: SchoolActivityListLoader
  query: string
  type: ActivityType | 'all'
  /** 기준일 (이번 학기 기록 계산) */
  snapshotDate: string
  onQueryChange: (query: string) => void
  onTypeChange: (type: ActivityType | 'all') => void
  onReset: () => void
  onOpen: (activityId: string) => void
  onCreate: () => void
  createTriggerId: string
  onSectionSelect: (id: SchoolSectionId) => void
}

/** 검색: 활동명 · 기관 · 태그 (Activities-00 검색 안내 범위, 긴 본문은 찾지 않는다) */
const matches = (item: GrowthActivityListItem, query: string) => {
  const keyword = query.trim().toLowerCase()
  if (!keyword) return true
  const { title, organizer, tags } = item.activity
  return [title, organizer, ...tags].some((text) => text.toLowerCase().includes(keyword))
}

// School Activities (Activities-00 Mockup): 수행평가 밖 성장 활동 기록.
// 검색(?query=) / 유형(?type=)은 URL에 둬 새로고침 / Back 후에도 유지한다. 카드 전체를 누르면 Detail로 간다.
export function SchoolActivitiesPage({
  loadList,
  query,
  type,
  snapshotDate,
  onQueryChange,
  onTypeChange,
  onReset,
  onOpen,
  onCreate,
  createTriggerId,
  onSectionSelect,
}: SchoolActivitiesPageProps) {
  const { state, reload } = useSchoolActivityList(loadList)
  const [draft, setDraft] = useState(query)
  const [syncedQuery, setSyncedQuery] = useState(query)
  if (syncedQuery !== query) {
    // Back / Forward로 주소가 바뀌면 입력칸도 따라간다.
    setSyncedQuery(query)
    setDraft(query)
  }

  const all = state.status === 'success' ? state.data : []
  const visible = all.filter((item) => (type === 'all' || item.activity.type === type) && matches(item, query))

  return (
    <SchoolLayout current="activities" onSectionSelect={onSectionSelect} busy={state.status === 'loading'}>
      <section className={styles.page} aria-labelledby="school-activities-heading">
        <header className={styles.header}>
          <div>
            <h2 id="school-activities-heading" className={styles.title}>
              나의 활동 기록
            </h2>
            <p className={styles.lead}>대회, 동아리, 프로젝트, 자율 탐구 등 다양한 활동의 과정과 배운 점을 기록하고, 나중에 다시 활용해보세요.</p>
          </div>
          <button type="button" id={createTriggerId} className={styles.createButton} aria-haspopup="dialog" onClick={onCreate}>
            + 활동 기록 추가
          </button>
        </header>

        {state.status === 'success' && all.length > 0 && (
          <dl className={styles.summary}>
            <div className={styles.summaryItem}>
              <dt>전체 활동</dt>
              <dd>{all.length}</dd>
            </div>
            <div className={styles.summaryItem}>
              <dt>Feedback 대기</dt>
              <dd>{all.filter((item) => item.activity.status === 'feedback-waiting').length}</dd>
            </div>
            <div className={styles.summaryItem}>
              <dt>이번 학기 기록</dt>
              <dd>{all.filter((item) => isThisSemester(item.activity.startDate, snapshotDate)).length}</dd>
            </div>
          </dl>
        )}

        <div className={styles.toolbar}>
          <label className={styles.search}>
            <span className="lh-visually-hidden">활동 검색</span>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
              <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={draft}
              placeholder="활동명, 기관, 태그 검색"
              onChange={(event) => {
                setDraft(event.target.value)
                onQueryChange(event.target.value)
              }}
            />
          </label>
          <div className={styles.filters} role="group" aria-label="활동 유형">
            <button type="button" className={styles.filterChip} aria-pressed={type === 'all'} onClick={() => onTypeChange('all')}>
              전체
            </button>
            {typeFilters.map(({ id, label }) => (
              <button key={id} type="button" className={styles.filterChip} aria-pressed={type === id} onClick={() => onTypeChange(id)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {state.status === 'loading' && (
          <>
            <p className="lh-visually-hidden" role="status">
              활동 기록을 불러오는 중이에요.
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
            <p className={styles.noticeTitle}>활동 기록을 불러오지 못했어요.</p>
            <p>잠시 후 다시 시도해 주세요.</p>
            <button type="button" className={styles.noticeButton} onClick={reload}>
              다시 시도
            </button>
          </div>
        )}

        {state.status === 'success' &&
          (all.length === 0 ? (
            <p className={styles.notice} role="status">
              아직 기록한 성장 활동이 없어요. 대회 · 봉사 · 동아리 같은 활동을 기록해보세요.
            </p>
          ) : visible.length === 0 ? (
            <div className={styles.notice} role="status">
              <p>조건에 맞는 활동이 없어요.</p>
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
            <ul className={styles.grid} aria-label={`활동 기록 ${visible.length}개`}>
              {visible.map((item) => (
                <li key={item.activity.activityId}>
                  <ActivityCard item={item} onOpen={() => onOpen(item.activity.activityId)} />
                </li>
              ))}
            </ul>
          ))}
      </section>
    </SchoolLayout>
  )
}

function ActivityCard({ item, onOpen }: { item: GrowthActivityListItem; onOpen: () => void }) {
  const { activity } = item
  const titleId = `activity-${activity.activityId}-title`
  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <p className={styles.cardTop}>
        <span className={styles.typeTag}>{activityTypeLabel(activity.type)}</span>
      </p>
      <h3 id={titleId} className={styles.cardTitle}>
        {/* 카드 전체를 누르면 Detail로 간다. (CSS로 버튼 영역을 카드 전체로 넓힌다) */}
        <button type="button" className={styles.open} onClick={onOpen}>
          {activity.title}
        </button>
      </h3>
      {activity.organizer && <p className={styles.organizer}>{activity.organizer}</p>}
      <p className={styles.period}>{activityPeriodText(activity)}</p>
      {activity.role && <p className={styles.role}>{activity.role}</p>}
      <p className={styles.footer}>
        <span>
          Evidence {item.evidenceCount}개 · {reflectionStatusText(activity)}
        </span>
        <span className={styles.status} data-status={activity.status}>
          {activityStatusLabel[activity.status]}
        </span>
      </p>
    </article>
  )
}
