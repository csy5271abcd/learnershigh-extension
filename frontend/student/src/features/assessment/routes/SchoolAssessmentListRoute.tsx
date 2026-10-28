import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toApiError } from '../api/apiError.ts'
import { assessmentToday } from '../api/runtimeInfo.ts'
import { changeSchoolAssessmentStatus, listSchoolAssessments } from '../api/schoolAssessmentApi.ts'
import type { SchoolAssessment, SchoolAssessmentStatus, SubjectRef } from '../api/types.ts'
import { AddSchoolAssessmentModal } from '../components/AddSchoolAssessmentModal.tsx'
import { AlertIcon, ChatIcon, ChevronDownIcon, ClockIcon, FileIcon, LinkIcon, NoteIcon, PencilIcon, PlusIcon, SearchIcon, StarIcon } from '../components/AssessmentIcons.tsx'
import { MockDataNotice } from '../components/MockDataNotice.tsx'
import { PdfImportModal } from '../components/pdf-import/PdfImportModal.tsx'
import { FavoriteButton } from '../components/FavoriteButton.tsx'
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
  orderForDisplay,
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
import { loadAssessmentRecords, type AssessmentRecordSummary } from '../model/assessmentRecords.ts'
import { useApiQuery, type QueryResult } from '../model/useApiQuery.ts'
import { favoriteKey, useFavorites } from '../model/useFavorites.ts'
import { schoolAssessmentDetailPath, schoolAssessmentFeedbackPath, schoolAssessmentHistoryPath } from './paths.ts'
import styles from './SchoolAssessmentListRoute.module.css'

const pageSizeStep = 20
const countPageSize = 100
const searchDebounceMs = 250

// 학교 수행평가 목록 + 과목별 목록 (screen-map S3·S6, assessment-student.md §6, api-contract.md §12·13).
// 과목·상태·검색·정렬·중요는 URL Query에 두어 상세에서 돌아올 때 그대로 복원한다 (§3 Back Context).
// ★ 즐겨찾기 조작은 목록에서만 한다 (2026-10-28 사용자 요청, 상세에는 별표 없음). "중요" 필터는 §12 Query가 없어(MM-07)
// 같은 범위를 한 번에 받아(최대 100건) 즐겨찾기(§30)와 화면에서 맞춘다. "기록" 열은 assessmentRecords에서 계산한다 (MM-55).
export function SchoolAssessmentListRoute() {
  const workspace = useAssessmentWorkspace()
  const { terms, selectedTerm, selectedContext, termAssessments, dataVersion, notifyDataChanged } = workspace
  const [searchParams, setSearchParams] = useSearchParams()

  const subjectId = searchParams.get('subject') ?? undefined
  // 진행 상태 4개(전체·시작 전·진행 중·완료)와 ★ 중요는 한 번에 하나만 고르는 필터다 (2026-10-28 사용자 요청).
  // 예전 URL에 둘 다 있으면 중요를 우선하고 상태는 무시한다.
  const importantParam = searchParams.get('important') === '1'
  const status = importantParam ? undefined : parseStatus(searchParams.get('status'))
  const query = searchParams.get('q') ?? ''
  const sort = parseSort(searchParams.get('sort'))
  const important = importantParam

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
  const favorites = useFavorites()
  const toggleFavorite = (assessmentId: string) =>
    favorites.toggle('SCHOOL_ASSESSMENT', assessmentId).then(
      (text) => text && showToast('success', text),
      (error: Error) => showToast('error', `즐겨찾기를 바꾸지 못했어요. ${error.message}`),
    )

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

  const rows = useApiQuery(`sa-rows|${scopeKey}|${status ?? ''}|${sort}|${important ? countPageSize : pageSize}`, () =>
    selectedTerm
      ? listSchoolAssessments({ ...selectedTerm, subjectId, status, query: query || undefined, sort, page: 0, size: important ? countPageSize : pageSize })
      : new Promise<never>(() => {}),
  )
  const visibleIds = rows.data?.items.map((item) => item.assessmentId) ?? []
  const records = useApiQuery(rows.data ? `sa-records|${visibleIds.join(',')}|${dataVersion}` : 'sa-records|pending', () =>
    rows.data ? loadAssessmentRecords(visibleIds) : new Promise<never>(() => {}),
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
  const hasFilter = Boolean(status || query || important)
  // 중요: 즐겨찾기 상태를 받기 전에는 거르지 않고 기다린다 (빈 목록으로 오해하지 않게).
  const isImportant = (assessmentId: string) => favorites.isFavorite('SCHOOL_ASSESSMENT', assessmentId) === true
  const listed = rows.data ? (important ? rows.data.items.filter((item) => isImportant(item.assessmentId)) : rows.data.items) : undefined
  const listReady = rows.status === 'success' && listed !== undefined && (!important || favorites.ready)
  const importantCount = scope.data && favorites.ready ? scope.data.items.filter((item) => isImportant(item.assessmentId)).length : undefined

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
    updateParams({ status: undefined, q: undefined, important: undefined })
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
        <div className={styles.tabs} role="group" aria-label="목록 필터 (하나만 선택)">
          <FilterTab label="전체" count={scopeTotal} active={!status && !important} onClick={() => updateParams({ status: undefined, important: undefined })} />
          {schoolAssessmentStatuses.map((value) => (
            <FilterTab
              key={value}
              label={statusLabels[value]}
              count={counts?.[value]}
              active={status === value}
              onClick={() => updateParams({ status: value, important: undefined })}
            />
          ))}
          <button
            type="button"
            className={styles.tab}
            data-kind="important"
            aria-pressed={important}
            title="즐겨찾기한 수행평가 (진행 상태와 관계없이)"
            onClick={() => updateParams({ important: '1', status: undefined })}
          >
            <StarIcon size={14} filled className={styles.tabStar} />
            중요
            <span className={styles.tabCount}>{importantCount ?? '–'}</span>
          </button>
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
          <span>평가일 · 마감</span>
          <span>정보 출처</span>
          <span>진행 상태</span>
          <span>기록</span>
        </div>

        {(rows.status === 'loading' || (rows.status === 'success' && !listReady)) && <LoadingRows label="수행평가 목록을 불러오는 중" />}
        {rows.status === 'error' && rows.error && (
          <ErrorState title="수행평가 목록을 불러오지 못했어요" error={rows.error} onRetry={rows.retry} />
        )}
        {listReady && listed.length === 0 && (
          <ListEmpty
            hasFilter={hasFilter}
            important={important}
            query={query}
            status={status}
            subject={subject}
            onReset={resetFilters}
            onAdd={() => setModalOpen(true)}
          />
        )}
        {listReady && listed.length > 0 && (
          <ul className={styles.rows} data-refreshing={rows.isRefreshing}>
            {orderForDisplay(listed, sort).map((item) => (
              <AssessmentRow
                key={item.assessmentId}
                item={item}
                subjects={subjects}
                highlighted={item.assessmentId === createdId}
                pending={pendingStatusId === item.assessmentId}
                onStatusChange={(next) => onStatusChange(item, next)}
                favorite={favorites.isFavorite('SCHOOL_ASSESSMENT', item.assessmentId)}
                favoritePending={favorites.pendingKey === favoriteKey('SCHOOL_ASSESSMENT', item.assessmentId)}
                onToggleFavorite={() => toggleFavorite(item.assessmentId)}
                records={records}
              />
            ))}
          </ul>
        )}
        {rows.data && !important && rows.data.page.totalElements > rows.data.items.length && (
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
  favorite: boolean | undefined
  favoritePending: boolean
  onToggleFavorite: () => void
  records: QueryResult<Record<string, AssessmentRecordSummary>>
}

function AssessmentRow({ item, subjects, highlighted, pending, onStatusChange, favorite, favoritePending, onToggleFavorite, records }: AssessmentRowProps) {
  const days = item.deadlineDate ? daysUntil(item.deadlineDate, assessmentToday()) : undefined
  return (
    <li className={styles.row} data-highlighted={highlighted} data-status={item.status}>
      {/* Mockup의 ★ 열. §30 즐겨찾기와 같은 값이다 (목록 중요 필터는 §12 Query가 없어 두지 않음, MM-07). */}
      <span className={styles.cellLead}>
        <FavoriteButton favorite={favorite} pending={favoritePending} title={item.title} onToggle={onToggleFavorite} />
      </span>
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
      <div className={styles.cellTrail}>
        <RecordCell assessment={item} records={records} />
      </div>
    </li>
  )
}

/**
 * 기록 열 (Mockup SA-LIST-01): 노트 수정 이력 수 + 선생님 피드백 말풍선(답변 도착은 파란색).
 * 아이콘을 누르면 상세의 수정 이력 / 피드백 탭으로 간다. 조회 실패는 "없음"으로 보이지 않게 따로 표시한다.
 */
const feedbackSummaryText = (summary: AssessmentRecordSummary) =>
  [summary.deliveredCount > 0 && `답변 도착 ${summary.deliveredCount}건`, summary.pendingCount > 0 && `답변 대기 ${summary.pendingCount}건`].filter(Boolean).join(', ')

function RecordCell({ assessment, records }: { assessment: SchoolAssessment; records: QueryResult<Record<string, AssessmentRecordSummary>> }) {
  if (records.status === 'error') {
    return (
      <button type="button" className={styles.recordButton} data-tone="error" aria-label={`${assessment.title} 기록을 불러오지 못했어요. 다시 시도`} title="기록을 불러오지 못했어요. 눌러서 다시 시도" onClick={records.retry}>
        <AlertIcon size={14} />
      </button>
    )
  }
  const summary = records.data?.[assessment.assessmentId]
  if (!summary) return <span className={styles.recordLoading} aria-label="기록을 불러오는 중" role="status" />
  return (
    <>
      <Link
        to={schoolAssessmentHistoryPath(assessment.assessmentId)}
        className={styles.recordButton}
        aria-label={`${assessment.title} 노트 수정 이력 ${summary.revisionCount}개 보기`}
        title={`노트 수정 이력 ${summary.revisionCount}개`}
      >
        <NoteIcon size={14} />
        <span>{summary.revisionCount}</span>
      </Link>
      {(summary.deliveredCount > 0 || summary.pendingCount > 0) && (
        <Link
          to={schoolAssessmentFeedbackPath(assessment.assessmentId)}
          className={styles.recordButton}
          data-tone={summary.deliveredCount > 0 ? 'delivered' : 'pending'}
          aria-label={`${assessment.title} 선생님 피드백 보기 (${feedbackSummaryText(summary)})`}
          title={`선생님 피드백 · ${feedbackSummaryText(summary)}`}
        >
          <ChatIcon size={15} />
        </Link>
      )}
    </>
  )
}

interface ListEmptyProps {
  hasFilter: boolean
  important: boolean
  query: string
  status: SchoolAssessmentStatus | undefined
  subject: SubjectRef | undefined
  onReset: () => void
  onAdd: () => void
}

// 데이터 없음 / 검색 결과 없음 / 필터 결과 없음을 구분한다 (frontend-admin.md §16과 같은 원칙, testing.md §10).
function ListEmpty({ hasFilter, important, query, status, subject, onReset, onAdd }: ListEmptyProps) {
  if (important && !query) {
    return (
      <EmptyState
        title="중요 표시한 수행평가가 없어요"
        description="목록 왼쪽 별표를 누르면 중요 수행평가로 모아 볼 수 있어요."
        action={
          <button type="button" className={styles.secondaryButton} onClick={onReset}>
            전체 보기
          </button>
        }
      />
    )
  }
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
