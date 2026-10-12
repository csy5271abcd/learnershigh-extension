import { useState } from 'react'
import type { ScreenLoadState } from '../../app/useScreenLoad.ts'
import { ADMIN_SNAPSHOT_DATE } from '../../fixtures/snapshot.ts'
import type { AdminState } from '../../store/adminStore.ts'
import {
  computeFeedbackKpi,
  DEADLINE_SOON_DAYS,
  deriveFeedbackQueue,
  LONG_WAIT_HOURS,
  queueStageLabel,
  queueStatusLabel,
  REVISION_NOT_APPLIED_HOURS,
  type FeedbackQueueItem,
  type QueueStage,
  type QueueStatus,
} from '../../read-model/feedbackQueue.ts'
import { daysUntil, formatDday, formatMonthDay, formatSnapshotLabel, formatWaiting } from '../../read-model/time.ts'
import {
  applyFeedbackFilter,
  emptyFilter,
  isFilterActive,
  paginate,
  presentValues,
  primaryActionLabel,
  QUEUE_PAGE_SIZE,
  sourceTypeLabel,
  type FeedbackQueueFilter,
} from './model/feedbackQueue.ts'
import styles from './FeedbackDashboardPage.module.css'

interface FeedbackDashboardPageProps {
  state: AdminState
  load: ScreenLoadState
  onRetry: () => void
  filter: FeedbackQueueFilter
  onFilterChange: (filter: FeedbackQueueFilter) => void
  onOpen: (item: FeedbackQueueItem) => void
  /** Student 360으로 이동 (없으면 학생 이름은 글자만) */
  onOpenStudent?: (studentId: string) => void
}

interface ChipGroup {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

// Feedback Dashboard (FeedbackDashboard-00): 오늘 처리할 검토 업무를 보는 공용 Queue.
// 수행평가 검토 · 주제 검토 · 성장활동 피드백이 한 Queue에 있다. 특정 Staff / 과목으로 나누지 않는다. (Filter는 보기 조건일 뿐)
export function FeedbackDashboardPage({ state, load, onRetry, filter, onFilterChange, onOpen, onOpenStudent }: FeedbackDashboardPageProps) {
  // 입력 중인 검색어 (주소는 입력할 때마다 바꾸되 History는 쌓지 않는다)
  const [draft, setDraft] = useState(filter.query)
  const [syncedQuery, setSyncedQuery] = useState(filter.query)
  if (syncedQuery !== filter.query) {
    setSyncedQuery(filter.query)
    setDraft(filter.query)
  }
  // 조건을 바꾸면 첫 page로 돌아간다.
  const update = (patch: Partial<FeedbackQueueFilter>) => onFilterChange({ ...filter, page: 0, ...patch })
  const reset = () => {
    setDraft('')
    onFilterChange(emptyFilter)
  }

  return (
    <div className={styles.page} aria-busy={load.status === 'loading'}>
      <header className={styles.header}>
        <h1 className={styles.title}>Feedback Dashboard</h1>
        <p className={styles.lead}>
          {formatSnapshotLabel(ADMIN_SNAPSHOT_DATE)} 기준 · 수행평가 · 주제 · 성장활동 검토를 모든 Admin이 같은 Queue에서 함께 처리해요.
        </p>
      </header>

      {load.status === 'loading' && (
        <>
          <p className="lh-visually-hidden" role="status">
            검토 Queue를 불러오는 중이에요.
          </p>
          <div className={styles.skeleton} aria-hidden="true">
            <div className={styles.skeletonKpis}>
              {Array.from({ length: 4 }, (_, index) => (
                <span key={index} />
              ))}
            </div>
            {Array.from({ length: 6 }, (_, index) => (
              <span key={index} className={styles.skeletonRow} />
            ))}
          </div>
        </>
      )}

      {load.status === 'error' && (
        <section className={styles.notice} role="alert" aria-labelledby="feedback-error-title">
          <h2 id="feedback-error-title" className={styles.noticeTitle}>
            검토 Queue를 불러오지 못했어요.
          </h2>
          <p>잠시 후 다시 시도해 주세요.</p>
          <button type="button" className={styles.secondaryButton} onClick={onRetry}>
            다시 시도
          </button>
        </section>
      )}

      {load.status === 'ready' && renderDashboard(load.empty)}
    </div>
  )

  // Component가 아니라 그리기 함수다. (Render마다 새 Component가 되어 검색칸 Focus를 잃지 않게)
  function renderDashboard(empty: boolean) {
    const all = empty ? [] : deriveFeedbackQueue(state)
    const kpi = empty ? { feedbackPending: 0, deadlineSoon: 0, revisionNotApplied: 0, completedThisWeek: 0 } : computeFeedbackKpi(state)
    const filtered = applyFeedbackFilter(all, filter)
    const page = paginate(filtered, filter.page)
    const stages = presentValues(all, (item) => item.stage, Object.keys(queueStageLabel) as QueueStage[])
    const statuses = presentValues(all, (item) => item.status, Object.keys(queueStatusLabel) as QueueStatus[])
    const active = isFilterActive(filter)

    const groups: ChipGroup[] = [
      {
        label: '유형',
        value: filter.type,
        options: [{ value: 'all', label: '전체' }, { value: 'task', label: '수행평가' }, { value: 'activity', label: '성장활동' }],
        onChange: (value) => update({ type: value as FeedbackQueueFilter['type'] }),
      },
      {
        label: '학년',
        value: filter.grade,
        options: [{ value: 'all', label: '전체' }, ...(['고1', '고2', '고3'] as const).map((grade) => ({ value: grade, label: grade }))],
        onChange: (value) => update({ grade: value as FeedbackQueueFilter['grade'] }),
      },
      {
        label: 'Stage',
        value: filter.stage,
        options: [{ value: 'all', label: '전체' }, ...stages.map((stage) => ({ value: stage, label: queueStageLabel[stage] }))],
        onChange: (value) => update({ stage: value as FeedbackQueueFilter['stage'] }),
      },
      {
        label: 'Deadline',
        value: filter.deadline,
        options: [
          { value: 'all', label: '전체' },
          { value: 'passed', label: '마감 지남' },
          { value: 'd3', label: 'D-3 이내' },
          { value: 'd7', label: 'D-7 이내' },
        ],
        onChange: (value) => update({ deadline: value as FeedbackQueueFilter['deadline'] }),
      },
      {
        label: 'Waiting',
        value: filter.waiting,
        options: [
          { value: 'all', label: '전체' },
          { value: 'over24', label: '24시간 초과' },
          { value: 'over48', label: `${LONG_WAIT_HOURS}시간 초과` },
        ],
        onChange: (value) => update({ waiting: value as FeedbackQueueFilter['waiting'] }),
      },
      {
        label: 'Status',
        value: filter.status,
        options: [{ value: 'all', label: '전체' }, ...statuses.map((status) => ({ value: status, label: queueStatusLabel[status] }))],
        onChange: (value) => update({ status: value as FeedbackQueueFilter['status'] }),
      },
    ]

    return (
      <>
        <section aria-labelledby="feedback-kpi-heading">
          <h2 id="feedback-kpi-heading" className="lh-visually-hidden">
            오늘 검토 현황
          </h2>
          <dl className={styles.kpis}>
            <Kpi label="Feedback Pending" value={kpi.feedbackPending} note="수행평가 검토 + 주제 검토 + 활동 피드백" />
            <Kpi label="마감 임박" value={kpi.deadlineSoon} note={`Queue 중 Deadline D-${DEADLINE_SOON_DAYS} 이내`} tone={kpi.deadlineSoon > 0 ? 'negative' : undefined} />
            <Kpi label="수정 미반영" value={kpi.revisionNotApplied} note={`Staff Feedback 후 ${REVISION_NOT_APPLIED_HOURS}시간 경과`} tone={kpi.revisionNotApplied > 0 ? 'warning' : undefined} />
            <Kpi label="이번 주 완료" value={kpi.completedThisWeek} note="이번 주 월요일부터 학생에게 전달" />
          </dl>
        </section>

        <section className={styles.queue} aria-labelledby="feedback-queue-heading">
          <div className={styles.queueHead}>
            <h2 id="feedback-queue-heading" className={styles.queueTitle}>
              Shared Queue
            </h2>
            <p className={styles.queueCount} role="status">
              {active ? `${filtered.length}건 표시 · 전체 ${all.length}건` : `${all.length}건`} · 공용 Queue · 오래 기다린 순
            </p>
          </div>

          {all.length > 0 && (
            <div className={styles.toolbar}>
              <label className={styles.search}>
                <span className="lh-visually-hidden">학생, 과목, 제목 검색</span>
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                  <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <input
                  type="search"
                  value={draft}
                  placeholder="학생, 과목, 제목 검색"
                  onChange={(event) => {
                    setDraft(event.target.value)
                    update({ query: event.target.value })
                  }}
                />
              </label>
              {groups.map((group) => (
                <div key={group.label} className={styles.filterGroup} role="group" aria-label={group.label}>
                  <span className={styles.filterLabel} aria-hidden="true">
                    {group.label}
                  </span>
                  <div className={styles.segment}>
                    {group.options.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={styles.segmentItem}
                        aria-pressed={group.value === option.value}
                        onClick={() => group.onChange(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {active && (
                <button type="button" className={styles.resetButton} onClick={reset}>
                  조건 초기화
                </button>
              )}
            </div>
          )}

          {all.length === 0 ? (
            <div className={styles.notice}>
              <p className={styles.noticeTitle}>처리할 검토 업무가 없어요.</p>
              <p>새로 제출된 수행평가 · 주제 · 성장활동 피드백 요청이 생기면 여기에 모여요.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.notice}>
              <p className={styles.noticeTitle}>{filter.query.trim() ? '검색 결과가 없어요.' : '조건에 맞는 검토 업무가 없어요.'}</p>
              <button type="button" className={styles.secondaryButton} onClick={reset}>
                전체 보기
              </button>
            </div>
          ) : (
            <>
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <caption className="lh-visually-hidden">
                    공용 검토 Queue {filtered.length}건 중 {page.page * QUEUE_PAGE_SIZE + 1}~{page.page * QUEUE_PAGE_SIZE + page.rows.length}번째 (오래 기다린 순)
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">학생</th>
                      <th scope="col">학년</th>
                      <th scope="col">유형</th>
                      <th scope="col">Task / 활동</th>
                      <th scope="col">Stage</th>
                      <th scope="col">Deadline</th>
                      <th scope="col">Waiting</th>
                      <th scope="col">Status</th>
                      <th scope="col">
                        <span className="lh-visually-hidden">Action</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.rows.map((item) => (
                      <QueueRow key={item.feedbackId} item={item} onOpen={() => onOpen(item)} onOpenStudent={onOpenStudent} />
                    ))}
                  </tbody>
                </table>
              </div>
              {page.totalPages > 1 && (
                <nav className={styles.pagination} aria-label="Queue 페이지">
                  <button type="button" className={styles.pageButton} disabled={page.page === 0} onClick={() => onFilterChange({ ...filter, page: page.page - 1 })}>
                    이전
                  </button>
                  {Array.from({ length: page.totalPages }, (_, index) => (
                    <button
                      key={index}
                      type="button"
                      className={styles.pageButton}
                      aria-current={index === page.page ? 'page' : undefined}
                      aria-label={`${index + 1}페이지`}
                      onClick={() => onFilterChange({ ...filter, page: index })}
                    >
                      {index + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={styles.pageButton}
                    disabled={page.page >= page.totalPages - 1}
                    onClick={() => onFilterChange({ ...filter, page: page.page + 1 })}
                  >
                    다음
                  </button>
                  <span className={styles.pageInfo}>
                    {page.page + 1} / {page.totalPages}
                  </span>
                </nav>
              )}
            </>
          )}
        </section>
      </>
    )
  }
}

function Kpi({ label, value, note, tone }: { label: string; value: number; note: string; tone?: 'negative' | 'warning' }) {
  return (
    <div className={styles.kpi}>
      <dt className={styles.kpiLabel}>{label}</dt>
      <dd className={styles.kpiValue} data-tone={tone}>
        {value}
      </dd>
      <dd className={styles.kpiNote}>{note}</dd>
    </div>
  )
}

function QueueRow({ item, onOpen, onOpenStudent }: { item: FeedbackQueueItem; onOpen: () => void; onOpenStudent?: (studentId: string) => void }) {
  const days = item.deadlineDate ? daysUntil(item.deadlineDate) : null
  const longWait = item.waitingHours > LONG_WAIT_HOURS
  const soon = days !== null && days <= DEADLINE_SOON_DAYS
  const priority = item.status === 'deadline-risk' || item.status === 'deadline-passed'
  return (
    <tr>
      <th scope="row" className={styles.student}>
        {onOpenStudent ? (
          <button type="button" className={styles.studentLink} onClick={() => onOpenStudent(item.student.studentId)}>
            {item.student.displayName}
            <span className="lh-visually-hidden"> Student 360 보기</span>
          </button>
        ) : (
          item.student.displayName
        )}
      </th>
      <td>{item.grade}</td>
      <td>
        <span className={styles.typeTag}>{sourceTypeLabel[item.type]}</span>
      </td>
      <td className={styles.titleCell}>
        <span className={styles.itemTitle}>{item.title}</span>
        <span className={styles.itemSub}>
          {item.subject} · {item.target}
        </span>
      </td>
      <td>{queueStageLabel[item.stage]}</td>
      <td>
        {item.deadlineDate && days !== null ? (
          <>
            <span className={styles.cellMain}>{formatMonthDay(item.deadlineDate)}</span>
            <span className={styles.cellSub} data-tone={soon ? 'negative' : undefined}>
              {formatDday(days)}
              {days < 0 ? <span className="lh-visually-hidden"> (마감 지남)</span> : soon && <span className="lh-visually-hidden"> (마감 임박)</span>}
            </span>
          </>
        ) : (
          <span className={styles.cellSub}>마감 없음</span>
        )}
      </td>
      <td className={styles.waiting} data-tone={longWait ? 'negative' : undefined}>
        {formatWaiting(item.waitingHours)}
        {longWait && <span className="lh-visually-hidden"> ({LONG_WAIT_HOURS}시간 초과)</span>}
      </td>
      <td>
        <span className={styles.status} data-status={item.status}>
          {queueStatusLabel[item.status]}
        </span>
      </td>
      <td className={styles.actionCell}>
        <button type="button" className={styles.rowAction} data-priority={priority || undefined} onClick={onOpen}>
          {primaryActionLabel(item)}
          <span className="lh-visually-hidden">
            : {item.student.displayName} · {item.title}
          </span>
        </button>
      </td>
    </tr>
  )
}
