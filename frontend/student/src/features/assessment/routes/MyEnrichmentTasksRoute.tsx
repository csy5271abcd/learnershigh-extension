import { Link, useSearchParams } from 'react-router'
import { getSchoolAssessment } from '../api/schoolAssessmentApi.ts'
import { listEnrichmentTasks } from '../api/enrichmentApi.ts'
import type { EnrichmentTask, SchoolAssessment } from '../api/types.ts'
import { LinkIcon } from '../components/AssessmentIcons.tsx'
import { EnrichmentFrame } from '../components/enrichment/EnrichmentFrame.tsx'
import styles from '../components/enrichment/enrichment.module.css'
import { MockDataNotice } from '../components/MockDataNotice.tsx'
import { EmptyState, ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { useAssessmentWorkspace } from '../model/assessmentWorkspace.ts'
import { formatTaskDate, matchesText } from '../model/enrichmentView.ts'
import { statusLabels, subjectNameOf } from '../model/schoolAssessmentView.ts'
import { useApiQuery } from '../model/useApiQuery.ts'
import { enrichmentPath, enrichmentTaskDetailPath } from './paths.ts'

const taskPageSize = 100

interface MyTasksData {
  tasks: EnrichmentTask[]
  /** 연결된 학교 수행평가 (§12 상세). 찾지 못한 ID는 없다. */
  related: Record<string, SchoolAssessment>
}

// 연결된 수행평가 제목은 §18 응답에 없어 §12 상세로 확인한다. 연결 대상을 못 찾아도 탐구 목록은 보여준다.
async function loadMyTasks(): Promise<MyTasksData> {
  const { items } = await listEnrichmentTasks({ page: 0, size: taskPageSize })
  const relatedIds = [...new Set(items.flatMap((task) => task.relatedAssessmentId ?? []))]
  const settled = await Promise.allSettled(relatedIds.map((id) => getSchoolAssessment(id)))
  const related: Record<string, SchoolAssessment> = {}
  settled.forEach((result) => {
    if (result.status === 'fulfilled') related[result.value.assessmentId] = result.value
  })
  return { tasks: items, related }
}

// 내 탐구 (screen-map S17, Mockup AE-MY-01, api-contract.md §18). 학생이 시작했거나 직접 만든 개인 Task만 보인다.
// §18 목록에 검색 Query가 없어 검색어는 불러온 목록의 제목·목표에서만 찾는다 (화면 필터).
export function MyEnrichmentTasksRoute() {
  const { terms, dataVersion } = useAssessmentWorkspace()
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const data = useApiQuery(`ae-my|${dataVersion}`, loadMyTasks)
  const subjects = terms.data?.contexts.flatMap((context) => context.subjects) ?? []

  const visible = data.data?.tasks.filter((task) => matchesText(query, task.title, task.goal)) ?? []

  return (
    <EnrichmentFrame>
      <section aria-label="내 심화 탐구 목록" aria-busy={data.isRefreshing}>
        {data.status === 'error' && data.error ? (
          <div className={styles.stateArea}>
            <ErrorState title="내 탐구를 불러오지 못했어요" error={data.error} onRetry={data.retry} />
          </div>
        ) : !data.data ? (
          <div className={styles.stateArea}>
            <LoadingRows rows={3} label="내 탐구를 불러오는 중" />
          </div>
        ) : data.data.tasks.length === 0 ? (
          <div className={styles.stateArea}>
            <EmptyState
              title="아직 시작한 심화 탐구가 없어요"
              description="탐구 라이브러리에서 주제를 골라 시작하거나, 직접 만들어 보세요."
              action={
                <Link to={enrichmentPath} className={styles.outlineButton}>
                  탐구 라이브러리 보기
                </Link>
              }
            />
          </div>
        ) : visible.length === 0 ? (
          <div className={styles.stateArea}>
            <EmptyState title="검색어와 맞는 탐구가 없어요" description="다른 검색어로 찾아보세요." />
          </div>
        ) : (
          <ul className={styles.taskList}>
            {visible.map((task) => {
              const related = task.relatedAssessmentId ? data.data?.related[task.relatedAssessmentId] : undefined
              return (
                <li key={task.taskId}>
                  <Link to={enrichmentTaskDetailPath(task.taskId)} className={styles.taskRow}>
                    <span className={styles.rowText}>
                      <span className={styles.rowTitle}>{task.title}</span>
                      <span className={styles.rowMeta}>
                        {subjectNameOf(subjects, task.subjectId)} · {formatTaskDate(task.createdAt)} 시작
                      </span>
                    </span>
                    <span className={styles.taskLink}>
                      <LinkIcon size={13} />
                      {task.relatedAssessmentId
                        ? (related?.title ?? '연결된 수행평가를 확인할 수 없어요')
                        : '연결된 수행평가 없음'}
                    </span>
                    <span className={styles.statusLabel} data-status={task.status}>
                      <span className={styles.statusDot} aria-hidden="true" />
                      {statusLabels[task.status]}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <div className={styles.notices}>
        <MockDataNotice />
      </div>
    </EnrichmentFrame>
  )
}
