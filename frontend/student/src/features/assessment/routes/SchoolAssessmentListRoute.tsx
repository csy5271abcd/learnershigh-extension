import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toApiError } from '../api/apiError.ts'
import { assessmentToday } from '../api/runtimeInfo.ts'
import { changeSchoolAssessmentStatus, listSchoolAssessments } from '../api/schoolAssessmentApi.ts'
import type { SchoolAssessment, SchoolAssessmentStatus, SubjectRef } from '../api/types.ts'
import { AddSchoolAssessmentModal } from '../components/AddSchoolAssessmentModal.tsx'
import { ChevronDownIcon, ClockIcon, FileIcon, LinkIcon, PencilIcon, PlusIcon, SearchIcon } from '../components/AssessmentIcons.tsx'
import { MockDataNotice } from '../components/MockDataNotice.tsx'
import { PdfImportModal } from '../components/pdf-import/PdfImportModal.tsx'
import { EmptyState, ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { StatusSelect } from '../components/StatusSelect.tsx'
import { Toast, type ToastMessage } from '../components/Toast.tsx'
import { termKey, termLabel } from '../model/academicTerm.ts'
import { useAssessmentWorkspace } from '../model/assessmentWorkspace.ts'
import {
  countByStatus,
  daysUntil,
  defaultSort,
  formatDateWithWeekday,
  formatDday,
  formatShortDate,
  parseSort,
  parseStatus,
  schoolAssessmentStatuses,
  sortOptions,
  sourceLabel,
  statusLabels,
  subjectNameOf,
  upcomingDeadlines,
  urgentDays,
} from '../model/schoolAssessmentView.ts'
import { useApiQuery } from '../model/useApiQuery.ts'
import { schoolAssessmentDetailPath } from './paths.ts'
import styles from './SchoolAssessmentListRoute.module.css'

const pageSizeStep = 20
const countPageSize = 100
const searchDebounceMs = 250

// 학교 수행평가 목록 + 과목별 목록 (screen-map S3·S6, assessment-student.md §6, api-contract.md §12·13).
// 과목·상태·검색·정렬은 URL Query에 두어 상세에서 돌아올 때 그대로 복원한다 (§3 Back Context).
export function SchoolAssessmentListRoute() {
  const workspace = useAssessmentWorkspace()
  const { terms, selectedTerm, selectedContext, termAssessments, dataVersion, notifyDataChanged } = workspace
  const [searchParams, setSearchParams] = useSearchParams()

  const subjectId = searchParams.get('subject') ?? undefined
  const status = parseStatus(searchParams.get('status'))
  const query = searchParams.get('q') ?? ''
  const sort = parseSort(searchParams.get('sort'))

  const [searchInput, setSearchInput] = useState(query)
  const [syncedQuery, setSyncedQuery] = useState(query)
  if (syncedQuery !== query) {
    // 메뉴 이동·뒤로 가기 등으로 URL 검색어가 바뀌면 입력창도 맞춘다.
    setSyncedQuery(query)
    if (searchInput.trim() !== query) setSearchInput(query)
  }
  const [pageSize, setPageSize] = useState(pageSizeStep)
  const [modalOpen, setModalOpen] = useState(false)
  const [pdfOpen, setPdfOpen] = useState(false)
  const [pendingStatusId, setPendingStatusId] = useState<string>()
  const [createdId, setCreatedId] = useState<string>()
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const dismissToast = useCallback(() => setToast(null), [])
  const showToast = (tone: ToastMessage['tone'], text: string) => setToast((previous) => ({ id: (previous?.id ?? 0) + 1, tone, text }))

  const updateParams = useCallback(
    (changes: Record<string, string | undefined>) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          for (const [name, value] of Object.entries(changes)) {
            if (value === undefined || value === '') next.delete(name)
            else next.set(name, value)
          }
          return next
        },
        { replace: true, preventScrollReset: true },
      )
    },
    [setSearchParams],
  )

  // 검색어 입력은 잠시 멈춘 뒤 URL에 반영한다.
  useEffect(() => {
    if (searchInput.trim() === query) return
    const timer = window.setTimeout(() => updateParams({ q: searchInput.trim() || undefined }), searchDebounceMs)
    return () => window.clearTimeout(timer)
  }, [searchInput, query, updateParams])

  const scopeKey = selectedTerm
    ? `${termKey(selectedTerm)}|${subjectId ?? ''}|${query}|${dataVersion}`
    : 'pending'

  const rows = useApiQuery(`sa-rows|${scopeKey}|${status ?? ''}|${sort}|${pageSize}`, () =>
    selectedTerm
      ? listSchoolAssessments({ ...selectedTerm, subjectId, status, query: query || undefined, sort, page: 0, size: pageSize })
      : new Promise<never>(() => {}),
  )
  // 상태 탭 건수: 같은 범위(과목·검색)에서 상태 필터 없이 조회한 결과로 계산한다. 화면에 숫자를 고정하지 않는다.
  const scope = useApiQuery(`sa-scope|${scopeKey}`, () =>
    selectedTerm
      ? listSchoolAssessments({ ...selectedTerm, subjectId, query: query || undefined, page: 0, size: countPageSize })
      : new Promise<never>(() => {}),
  )

  if (terms.status === 'error' && terms.error) {
    return (
      <main className={styles.page}>
        <div className={styles.content}>
          <h1 className={styles.title}>학교 수행평가</h1>
          <ErrorState title="학업 정보를 불러오지 못했어요" error={terms.error} onRetry={terms.retry} />
        </div>
      </main>
    )
  }
  if (!selectedContext) {
    return (
      <main className={styles.page}>
        <div className={styles.content}>
          <h1 className={styles.title}>학교 수행평가</h1>
          <LoadingRows label="학업 정보를 불러오는 중" />
        </div>
      </main>
    )
  }

  const subjects = selectedContext.subjects
  const subject = subjectId ? subjects.find((item) => item.subjectId === subjectId) : undefined
  const counts = scope.data ? countByStatus(scope.data.items) : undefined
  const scopeTotal = scope.data?.page.totalElements
  const upcoming = termAssessments.data ? upcomingDeadlines(termAssessments.data.items, assessmentToday()) : []
  const hasFilter = Boolean(status || query)

  const onStatusChange = async (item: SchoolAssessment, next: SchoolAssessmentStatus) => {
    if (next === item.status || pendingStatusId) return
    setPendingStatusId(item.assessmentId)
    try {
      await changeSchoolAssessmentStatus(item.assessmentId, next)
      showToast('success', `'${item.title}' 상태를 ${statusLabels[next]}(으)로 바꿨어요.`)
      notifyDataChanged()
    } catch (error) {
      const apiError = toApiError(error)
      showToast('error', `상태를 바꾸지 못했어요. ${apiError.message} (${apiError.code})`)
    } finally {
      setPendingStatusId(undefined)
    }
  }

  const resetFilters = () => {
    setSearchInput('')
    updateParams({ status: undefined, q: undefined })
  }

  return (
    <main className={styles.page}>
      <div className={styles.toolbar}>
        <label className={styles.search}>
          <SearchIcon size={17} className={styles.searchIcon} />
          <span className="lh-visually-hidden">수행평가 검색</span>
          <input
            type="search"
            value={searchInput}
            placeholder="수행평가 이름, 과목으로 검색"
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </label>
        <div className={styles.toolbarActions}>
          <button type="button" className={styles.secondaryButton} onClick={() => setPdfOpen(true)}>
            <FileIcon size={16} />
            PDF로 가져오기
          </button>
          <button type="button" className={styles.primaryButton} onClick={() => setModalOpen(true)}>
            <PlusIcon size={16} />
            수행평가 추가
          </button>
        </div>
      </div>

      <div className={styles.content}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          {subject?.name ?? '학교 수행평가'}
          <span className={styles.titleMeta}>
            {termLabel(selectedContext)}
            {scopeTotal !== undefined && ` · ${scopeTotal}개`}
          </span>
        </h1>
        <MockDataNotice />
      </header>

      {subjectId && !subject && (
        <div className={styles.inlineNotice} role="alert">
          선택한 학기에 이 과목이 없어요.{' '}
          <button type="button" className={styles.textButton} onClick={() => updateParams({ subject: undefined })}>
            전체 수행평가 보기
          </button>
        </div>
      )}

      {/* Mockup SA-LIST-05~07: 상태 탭을 고르면 다가오는 일정은 숨긴다 (전체 탭·과목별 목록에서만 표시). */}
      {upcoming.length > 0 && !status && (
        <section className={styles.upcoming} aria-labelledby="upcoming-heading">
          <h2 id="upcoming-heading" className={styles.sectionLabel}>
            <ClockIcon size={15} />
            다가오는 일정
          </h2>
          <ul className={styles.upcomingList}>
            {upcoming.map(({ assessment, days }) => (
              <li key={assessment.assessmentId}>
                <Link to={schoolAssessmentDetailPath(assessment.assessmentId)} className={styles.upcomingCard}>
                  <span className={styles.upcomingDday} data-urgent={days <= urgentDays}>
                    <strong>{formatDday(days)}</strong>
                    <span>{formatShortDate(assessment.deadlineDate as string)}</span>
                  </span>
                  <span className={styles.upcomingText}>
                    <span className={styles.upcomingMeta}>{subjectNameOf(subjects, assessment.subjectId)} · 마감</span>
                    <span className={styles.upcomingTitle}>{assessment.title}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={styles.filterBar}>
        <div className={styles.tabs} role="group" aria-label="진행 상태 필터">
          <FilterTab label="전체" count={scopeTotal} active={!status} onClick={() => updateParams({ status: undefined })} />
          {schoolAssessmentStatuses.map((value) => (
            <FilterTab
              key={value}
              label={statusLabels[value]}
              count={counts?.[value]}
              active={status === value}
              onClick={() => updateParams({ status: value })}
            />
          ))}
        </div>
        <label className={styles.sort}>
          <span>정렬</span>
          <span className={styles.sortSelectWrap}>
            <select
              value={sort}
              onChange={(event) => updateParams({ sort: event.target.value === defaultSort ? undefined : event.target.value })}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon size={15} className={styles.sortChevron} />
          </span>
        </label>
      </div>

      <section className={styles.table} aria-label="수행평가 목록" aria-busy={rows.isRefreshing || rows.status === 'loading'}>
        <div className={styles.tableHead} aria-hidden="true">
          <span />
          <span>수행평가</span>
          <span>마감</span>
          <span>정보 출처</span>
          <span>진행 상태</span>
        </div>

        {rows.status === 'loading' && <LoadingRows label="수행평가 목록을 불러오는 중" />}
        {rows.status === 'error' && rows.error && (
          <ErrorState title="수행평가 목록을 불러오지 못했어요" error={rows.error} onRetry={rows.retry} />
        )}
        {rows.status === 'success' && rows.data && rows.data.items.length === 0 && (
          <ListEmpty
            hasFilter={hasFilter}
            query={query}
            status={status}
            subject={subject}
            onReset={resetFilters}
            onAdd={() => setModalOpen(true)}
          />
        )}
        {rows.status === 'success' && rows.data && rows.data.items.length > 0 && (
          <ul className={styles.rows} data-refreshing={rows.isRefreshing}>
            {rows.data.items.map((item) => (
              <AssessmentRow
                key={item.assessmentId}
                item={item}
                subjects={subjects}
                highlighted={item.assessmentId === createdId}
                pending={pendingStatusId === item.assessmentId}
                onStatusChange={(next) => onStatusChange(item, next)}
              />
            ))}
          </ul>
        )}
        {rows.data && rows.data.page.totalElements > rows.data.items.length && (
          <button
            type="button"
            className={styles.moreButton}
            disabled={rows.isRefreshing}
            onClick={() => setPageSize((value) => value + pageSizeStep)}
          >
            {rows.isRefreshing ? '불러오는 중…' : `더 보기 (${rows.data.items.length}/${rows.data.page.totalElements})`}
          </button>
        )}
        {rows.status !== 'error' && (
          <button type="button" className={styles.addRowButton} onClick={() => setModalOpen(true)}>
            <PlusIcon size={16} />새 수행평가
          </button>
        )}
      </section>
      </div>

      {pdfOpen && <PdfImportModal onClose={() => setPdfOpen(false)} onManualAdd={() => setModalOpen(true)} />}
      {modalOpen && (
        <AddSchoolAssessmentModal
          context={selectedContext}
          initialSubjectId={subject?.subjectId}
          existingTitles={termAssessments.data?.items.map((item) => item.title) ?? []}
          onClose={() => setModalOpen(false)}
          onCreated={(created) => {
            setModalOpen(false)
            setCreatedId(created.assessmentId)
            notifyDataChanged()
            const hidden = (status && status !== created.status) || (subjectId && subjectId !== created.subjectId)
            showToast(
              'success',
              hidden
                ? `'${created.title}'을(를) 추가했어요. 현재 필터에서는 보이지 않아요.`
                : `'${created.title}'을(를) 추가했어요.`,
            )
          }}
        />
      )}
      <Toast message={toast} onDismiss={dismissToast} />
    </main>
  )
}

function FilterTab({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" className={styles.tab} aria-pressed={active} onClick={onClick}>
      {label}
      <span className={styles.tabCount}>{count ?? '–'}</span>
    </button>
  )
}

interface AssessmentRowProps {
  item: SchoolAssessment
  subjects: SubjectRef[]
  highlighted: boolean
  pending: boolean
  onStatusChange: (next: SchoolAssessmentStatus) => void
}

function AssessmentRow({ item, subjects, highlighted, pending, onStatusChange }: AssessmentRowProps) {
  const days = item.deadlineDate ? daysUntil(item.deadlineDate, assessmentToday()) : undefined
  return (
    <li className={styles.row} data-highlighted={highlighted} data-status={item.status}>
      {/* Mockup의 ★중요 열 자리. 목록 중요 필터 계약이 정해지기 전까지 비워 둔다 (MM-07). */}
      <span className={styles.cellLead} aria-hidden="true" />
      <div className={styles.cellTitle}>
        <Link to={schoolAssessmentDetailPath(item.assessmentId)} className={styles.rowLink}>
          {item.title}
        </Link>
        <span className={styles.rowMeta}>{subjectNameOf(subjects, item.subjectId)}</span>
      </div>
      <div className={styles.cellDate}>
        {item.deadlineDate && days !== undefined ? (
          <>
            <span className={styles.date}>{formatDateWithWeekday(item.deadlineDate)}</span>
            {item.status === 'COMPLETED' ? (
              <span className={styles.dateSub}>완료</span>
            ) : days < 0 ? (
              <span className={styles.dateSub}>마감일 지남</span>
            ) : (
              <span className={styles.dday} data-urgent={days <= urgentDays}>
                {formatDday(days)}
              </span>
            )}
          </>
        ) : (
          <span className={styles.dateUnknown}>날짜 미정</span>
        )}
      </div>
      <div className={styles.cellSource}>
        <span className={styles.sourceBadge} data-linked={item.evaluationItemRef !== null}>
          {item.evaluationItemRef ? <LinkIcon size={13} /> : <PencilIcon size={13} />}
          {sourceLabel(item)}
        </span>
      </div>
      <div className={styles.cellStatus}>
        <StatusSelect status={item.status} assessmentTitle={item.title} pending={pending} onChange={onStatusChange} />
      </div>
      {/* Mockup의 기록 열 자리 (노트 수·피드백 표시는 §12 목록 응답에 없음, MM-11). */}
      <span className={styles.cellTrail} aria-hidden="true" />
    </li>
  )
}

interface ListEmptyProps {
  hasFilter: boolean
  query: string
  status: SchoolAssessmentStatus | undefined
  subject: SubjectRef | undefined
  onReset: () => void
  onAdd: () => void
}

// 데이터 없음 / 검색 결과 없음 / 필터 결과 없음을 구분한다 (frontend-admin.md §16과 같은 원칙, testing.md §10).
function ListEmpty({ hasFilter, query, status, subject, onReset, onAdd }: ListEmptyProps) {
  if (query) {
    return (
      <EmptyState
        title={`'${query}'에 맞는 수행평가가 없어요`}
        description="검색어를 바꾸거나 필터를 초기화해 보세요."
        action={
          <button type="button" className={styles.secondaryButton} onClick={onReset}>
            검색·필터 초기화
          </button>
        }
      />
    )
  }
  if (hasFilter && status) {
    return (
      <EmptyState
        title={`'${statusLabels[status]}' 상태인 수행평가가 없어요`}
        action={
          <button type="button" className={styles.secondaryButton} onClick={onReset}>
            전체 보기
          </button>
        }
      />
    )
  }
  return (
    <EmptyState
      title={subject ? `${subject.name}에 등록한 수행평가가 없어요` : '아직 등록한 수행평가가 없어요'}
      description="학교에서 안내받은 수행평가를 추가해 일정과 준비 과정을 관리해 보세요."
      action={
        <button type="button" className={styles.primaryButton} onClick={onAdd}>
          <PlusIcon size={17} />
          수행평가 추가
        </button>
      }
    />
  )
}
