import { useState } from 'react'
import { AdminIcon } from '../../components/AdminIcons.tsx'
import { CompactMetric, DisclosureButton, SummaryHero, ToneButton, ToneTag, type VisualTone } from '../../components/AdminVisual.tsx'
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
  isDeadlineCritical,
  primaryActionLabel,
  QUEUE_PAGE_SIZE,
  queueWorkflow,
  queueWorkflowLabel,
  sourceTypeLabel,
  type FeedbackQueueFilter,
  type QueueWorkflow,
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

/** 업무 종류: 모두 Neutral 글자 Label로 구분하고, Action만 Blue 3단계(채움 = 우선 검토 · Soft = 검토 · 글자 = 주제 검토)로 나눈다 */
const workflowVisual: Record<QueueWorkflow, { tone: VisualTone; action: 'soft' | 'text' }> = {
  topic: { tone: 'neutral', action: 'text' },
  feedback: { tone: 'neutral', action: 'soft' },
  revision: { tone: 'neutral', action: 'soft' },
  activity: { tone: 'neutral', action: 'soft' },
}

// Feedback Dashboard (FeedbackDashboard-00): 오늘 처리할 검토 업무를 보는 공용 Queue.
// 수행평가 검토 · 주제 검토 · 성장활동 피드백이 한 Queue에 있다. 특정 Staff / 과목으로 나누지 않는다. (Filter는 보기 조건일 뿐)
export function FeedbackDashboardPage({ state, load, onRetry, filter, onFilterChange, onOpen, onOpenStudent }: FeedbackDashboardPageProps) {
  const [moreOpen, setMoreOpen] = useState(false)
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
    const secondaryActive = [filter.stage, filter.deadline, filter.waiting].filter((value) => value !== 'all').length
    const moreShown = moreOpen || secondaryActive > 0
    const primaryGroups = ['유형', '학년', 'Status']
    const renderGroup = (group: ChipGroup) => (
      <div key={group.label} className={styles.filterGroup} role="group" aria-label={group.label}>
        <span className={styles.filterLabel} aria-hidden="true">
          {group.label}
        </span>
        <div className={styles.segment}>
          {group.options.map((option) => (
            <button key={option.value} type="button" className={styles.segmentItem} aria-pressed={group.value === option.value} onClick={() => group.onChange(option.value)}>
              {option.label}
            </button>
          ))}
        </div>
      </div>
    )

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
          {/* 위계: Feedback Pending(오늘 처리할 업무 전체) → 마감 임박 · 수정 미반영 · 이번 주 완료 */}
          <dl className={styles.kpis}>
            <SummaryHero
              label="Feedback Pending"
              value={kpi.feedbackPending}
              unit="건"
              note="지금 공용 Queue에서 검토를 기다리는 업무"
              breakdown={(['feedback', 'revision', 'topic', 'activity'] as const).map((workflow) => ({
                label: queueWorkflowLabel[workflow],
                value: all.filter((item) => queueWorkflow(item) === workflow).length,
                tone: workflowVisual[workflow].tone,
              }))}
            />
            <CompactMetric
              label="마감 임박"
              tone={kpi.deadlineSoon > 0 ? 'risk' : 'neutral'}
              value={kpi.deadlineSoon}
              note={`Queue 중 Deadline D-${DEADLINE_SOON_DAYS} 이내`}
              action={
                kpi.deadlineSoon > 0 && filter.deadline !== 'd3' ? (
                  <ToneButton variant="text" tone="risk" onClick={() => update({ deadline: 'd3' })}>
                    마감 임박만 보기
                  </ToneButton>
                ) : undefined
              }
            />
            <CompactMetric label="수정 미반영" tone={kpi.revisionNotApplied > 0 ? 'revision' : 'neutral'} value={kpi.revisionNotApplied} note={`Staff Feedback 후 ${REVISION_NOT_APPLIED_HOURS}시간 경과`} />
            <CompactMetric label="이번 주 완료" tone="complete" value={kpi.completedThisWeek} note="이번 주 월요일부터 학생에게 전달" />
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
            <div className={styles.filterPanel}>
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
                {groups.filter((group) => primaryGroups.includes(group.label)).map(renderGroup)}
                <DisclosureButton expanded={moreShown} controls="feedback-more-filters" onToggle={() => setMoreOpen(!moreShown)}>
                  추가 필터{secondaryActive > 0 ? ` ${secondaryActive}개 적용` : ''}
                </DisclosureButton>
                {active && (
                  <button type="button" className={styles.resetButton} onClick={reset}>
                    조건 초기화
                  </button>
                )}
              </div>
              {/* 추가 필터: 접혀 있어도 주소 Query 조건은 그대로 적용된다. 적용 중이면 펼쳐 보여준다. */}
              <div id="feedback-more-filters" className={styles.moreFilters} hidden={!moreShown}>
                {groups.filter((group) => !primaryGroups.includes(group.label)).map(renderGroup)}
              </div>
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
                      <th scope="col">업무</th>
                      <th scope="col">Task / 활동</th>
                      <th scope="col">Stage</th>
                      <th scope="col">Deadline</th>
                      <th scope="col">Waiting</th>
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

function QueueRow({ item, onOpen, onOpenStudent }: { item: FeedbackQueueItem; onOpen: () => void; onOpenStudent?: (studentId: string) => void }) {
  const days = item.deadlineDate ? daysUntil(item.deadlineDate) : null
  const longWait = item.waitingHours > LONG_WAIT_HOURS
  const soon = days !== null && days <= DEADLINE_SOON_DAYS
  const critical = isDeadlineCritical(item)
  const workflow = queueWorkflow(item)
  const visual = workflowVisual[workflow]
  return (
    <tr data-critical={critical || undefined}>
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
      <td className={styles.gradeCell}>{item.grade}</td>
      <td className={styles.workflowCell}>
        <ToneTag tone={visual.tone}>
          {queueWorkflowLabel[workflow]}
        </ToneTag>
        {/* 운영 상태: Deadline Risk / 마감 지남만 Risk 표시, 나머지는 보조 글자 */}
        {critical ? (
          <span className={styles.riskText}>
            <AdminIcon name="alert" size={13} />
            {queueStatusLabel[item.status]}
          </span>
        ) : (
          <span className={styles.statusText}>{queueStatusLabel[item.status]}</span>
        )}
      </td>
      <td className={styles.titleCell}>
        <span className={styles.itemEyebrow} data-type={item.type}>
          {sourceTypeLabel[item.type]}
          <span aria-hidden="true"> · </span>
          {item.subject}
        </span>
        <span className={styles.itemTitle}>{item.title}</span>
        <span className={styles.itemSub}>{item.type === 'task' ? (item.kind === 'topic-review' ? '주제 선정 검토' : `${item.subject} · ${item.target} 제출본`) : 'Activity Feedback 요청'}</span>
      </td>
      <td className={styles.stageCell}>{queueStageLabel[item.stage]}</td>
      <td>
        {item.deadlineDate && days !== null ? (
          <span className={styles.deadline}>
            <span className={styles.cellMain}>{formatMonthDay(item.deadlineDate)}</span>
            <span className={styles.dday} data-tone={days < 0 ? 'passed' : soon ? 'soon' : undefined}>
              {formatDday(days)}
              {days < 0 ? <span className="lh-visually-hidden"> (마감 지남)</span> : soon && <span className="lh-visually-hidden"> (마감 임박)</span>}
            </span>
          </span>
        ) : (
          <span className={styles.cellSub}>마감 없음</span>
        )}
      </td>
      <td className={styles.waiting}>
        <span className={styles.waitText} data-long={longWait || undefined}>
          {formatWaiting(item.waitingHours)}
          {longWait && <span className="lh-visually-hidden"> ({LONG_WAIT_HOURS}시간 초과)</span>}
        </span>
      </td>
      <td className={styles.actionCell}>
        <ToneButton variant={critical ? 'primary' : visual.action} tone="feedback" onClick={onOpen}>
          {primaryActionLabel(item)}
          <span className="lh-visually-hidden">
            : {item.student.displayName} · {item.title}
          </span>
        </ToneButton>
      </td>
    </tr>
  )
}
