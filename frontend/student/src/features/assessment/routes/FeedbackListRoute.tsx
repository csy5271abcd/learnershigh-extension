import { useCallback, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { isMockDataSource } from '../api/dataSource.ts'
import { FeedbackRequestCard } from '../components/feedback/FeedbackRequestCard.tsx'
import { SnapshotModal } from '../components/feedback/SnapshotModal.tsx'
import { MockDataNotice } from '../components/MockDataNotice.tsx'
import { EmptyState, ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { Toast, type ToastMessage } from '../components/Toast.tsx'
import { termKey } from '../model/academicTerm.ts'
import { useAssessmentWorkspace } from '../model/assessmentWorkspace.ts'
import { loadFeedbackOverview, parseFeedbackFilter, type FeedbackFilter } from '../model/feedbackListView.ts'
import { useApiQuery } from '../model/useApiQuery.ts'
import styles from './FeedbackListRoute.module.css'
import { schoolAssessmentsPath } from './paths.ts'

const filters: { value: FeedbackFilter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'PENDING', label: '답변 대기' },
  { value: 'DELIVERED', label: '답변 완료' },
]

const filterEmpty: Record<Exclude<FeedbackFilter, 'ALL'>, string> = {
  PENDING: '답변을 기다리는 요청이 없어요',
  DELIVERED: '아직 답변이 도착한 요청이 없어요',
}

// 선생님 피드백 (screen-map S15, Mockup TF-LIST-01~03, feedback §8 ST-15, api-contract §31·32).
// 전체 / 답변 대기 / 답변 완료 필터는 URL(`?status=`)에 두어 과제 상세에 다녀와도 유지된다.
// 요청 상태는 §31 응답 그대로 쓰고 화면에서 따로 바꾸지 않는다. 학생의 읽음 기록은 계약이 없어 만들지 않는다.
export function FeedbackListRoute() {
  const { terms, dataVersion } = useAssessmentWorkspace()
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = parseFeedbackFilter(searchParams.get('status'))
  const [snapshotRequestId, setSnapshotRequestId] = useState<string>()
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const dismissToast = useCallback(() => setToast(null), [])
  const showUnavailable = useCallback(
    (text: string) => setToast((previous) => ({ id: (previous?.id ?? 0) + 1, tone: 'info', text })),
    [],
  )

  // 요청이 어느 학기 과제인지 §31에 없어 불러온 모든 학기의 수행평가에서 찾는다 (model/feedbackListView.ts).
  const loadedTerms = terms.data?.contexts ?? []
  const overview = useApiQuery(
    terms.data ? `feedback-list|${loadedTerms.map(termKey).join(',')}|${dataVersion}` : 'feedback-list|pending',
    () => (terms.data ? loadFeedbackOverview(loadedTerms) : new Promise<never>(() => {})),
  )

  const selectFilter = (value: FeedbackFilter) => {
    const next = new URLSearchParams(searchParams)
    if (value === 'ALL') next.delete('status')
    else next.set('status', value)
    setSearchParams(next, { replace: true })
  }

  const header = (
    <header className={styles.header}>
      <h1 className={styles.title}>선생님 피드백</h1>
      <p className={styles.subtitle}>
        작성한 수행평가 자료를 선생님께 보내고 받은 피드백을 모아 볼 수 있어요. 피드백 요청은 각 수행평가 화면에서 버튼
        하나로 보낼 수 있어요.
      </p>
    </header>
  )

  const error = terms.status === 'error' ? terms.error : overview.error
  const retry = terms.status === 'error' ? terms.retry : overview.retry
  const data = overview.data
  const visible = data?.entries.filter((entry) => filter === 'ALL' || entry.request.status === filter) ?? []
  const snapshotEntry = data?.entries.find((entry) => entry.request.requestId === snapshotRequestId)

  return (
    <main className={styles.page}>
      {header}

      {data && data.counts.ALL > 0 && (
        <div className={styles.filters} role="group" aria-label="답변 상태">
          {filters.map((option) => (
            <button
              key={option.value}
              type="button"
              className={styles.filter}
              aria-pressed={filter === option.value}
              onClick={() => selectFilter(option.value)}
            >
              {option.label}
              <span className={styles.filterCount}>{data.counts[option.value]}</span>
            </button>
          ))}
        </div>
      )}

      <section className={styles.list} aria-label="피드백 요청 목록" aria-busy={overview.isRefreshing}>
        {error ? (
          <ErrorState title="피드백 요청을 불러오지 못했어요" error={error} onRetry={retry} />
        ) : !data ? (
          <LoadingRows rows={3} label="피드백 요청을 불러오는 중" />
        ) : data.counts.ALL === 0 ? (
          <EmptyState
            title="아직 보낸 피드백 요청이 없어요"
            description="수행평가 화면의 ‘선생님께 피드백 요청’ 버튼으로 탐구 노트와 결과 파일을 보낼 수 있어요."
            action={
              <Link to={schoolAssessmentsPath} className={styles.emptyLink}>
                학교 수행평가로 가기
              </Link>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title={filter === 'ALL' ? '' : filterEmpty[filter]}
            action={
              <button type="button" className={styles.emptyLink} onClick={() => selectFilter('ALL')}>
                전체 보기
              </button>
            }
          />
        ) : (
          visible.map((entry) => (
            <FeedbackRequestCard
              key={entry.request.requestId}
              entry={entry}
              onOpenSnapshot={() => setSnapshotRequestId(entry.request.requestId)}
              onUnavailable={showUnavailable}
            />
          ))
        )}
      </section>

      <div className={styles.notices}>
        <MockDataNotice />
        {isMockDataSource && (
          <p className={styles.mockHint}>
            답변 완료 요청은 미리 준비한 시연 데이터예요. 관리자 화면에서 보낸 답변이 이 화면에 자동으로 반영되지는 않아요.
          </p>
        )}
      </div>

      {snapshotEntry && <SnapshotModal entry={snapshotEntry} onClose={() => setSnapshotRequestId(undefined)} />}
      <Toast message={toast} onDismiss={dismissToast} />
    </main>
  )
}
