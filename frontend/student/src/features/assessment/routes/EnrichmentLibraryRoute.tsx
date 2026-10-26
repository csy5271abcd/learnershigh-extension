import { useCallback, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toApiError } from '../api/apiError.ts'
import { createEnrichmentTask, getCatalogItem, listCatalog, listEnrichmentTasks } from '../api/enrichmentApi.ts'
import type { EnrichmentCatalogItem, EnrichmentTask } from '../api/types.ts'
import { AlertIcon } from '../components/AssessmentIcons.tsx'
import { EnrichmentFrame } from '../components/enrichment/EnrichmentFrame.tsx'
import styles from '../components/enrichment/enrichment.module.css'
import { MockDataNotice } from '../components/MockDataNotice.tsx'
import { EmptyState, ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { useAssessmentWorkspace } from '../model/assessmentWorkspace.ts'
import { taskStartedFrom } from '../model/enrichmentView.ts'
import { subjectNameOf } from '../model/schoolAssessmentView.ts'
import { useApiQuery } from '../model/useApiQuery.ts'
import { enrichmentTaskDetailPath } from './paths.ts'

const catalogPageSize = 50
const taskPageSize = 100

// 탐구 라이브러리 (screen-map S16, Mockup AE-LIST-01·03, inquiry §3, api-contract.md §16·18).
// 과목·검색·선택 카드는 URL(`subject`, `q`, `selected`)에 둔다. Preview는 선택한 catalogTaskId의 상세 응답만 보여준다.
// Mockup의 탐구 분야 필터·난이도·즐겨찾기·문제 상황·참고할 만한 곳·예상 결과물·자기 점검은 §16 응답에 없어 표시하지 않는다 (MM-26).
export function EnrichmentLibraryRoute() {
  const { selectedContext, terms, dataVersion } = useAssessmentWorkspace()
  const [searchParams, setSearchParams] = useSearchParams()
  const subjectId = searchParams.get('subject') ?? undefined
  const query = searchParams.get('q') ?? ''

  const catalog = useApiQuery(`ae-catalog|${subjectId ?? ''}|${query}`, () =>
    listCatalog({ subjectId, query: query || undefined, page: 0, size: catalogPageSize }),
  )
  // 내가 이미 시작한 공개 콘텐츠 표시용 (§18 목록, catalogTaskId로 연결)
  const myTasks = useApiQuery(`ae-my-tasks|${dataVersion}`, () => listEnrichmentTasks({ page: 0, size: taskPageSize }))

  const items = catalog.data?.items ?? []
  const selectedParam = searchParams.get('selected')
  // 선택이 없으면 첫 카드를 보여준다 (Mockup AE-LIST-01). 검색·필터로 사라진 카드는 선택하지 않는다.
  const selectedId = items.some((item) => item.catalogTaskId === selectedParam) ? selectedParam : items[0]?.catalogTaskId

  const select = (catalogTaskId: string) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        next.set('selected', catalogTaskId)
        return next
      },
      { replace: true, preventScrollReset: true },
    )

  const selectSubject = (value: string | undefined) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (value) next.set('subject', value)
        else next.delete('subject')
        next.delete('selected')
        return next
      },
      { replace: true, preventScrollReset: true },
    )

  const subjects = selectedContext?.subjects ?? []
  const allSubjects = terms.data?.contexts.flatMap((context) => context.subjects) ?? subjects
  const subjectName = (id: string) => subjectNameOf(allSubjects, id)

  return (
    <EnrichmentFrame
      panel={
        selectedId ? (
          <CatalogPreview
            key={selectedId}
            catalogTaskId={selectedId}
            subjectName={subjectName}
            startedTask={myTasks.data ? taskStartedFrom(myTasks.data.items, selectedId) : undefined}
            myTasksReady={myTasks.status === 'success'}
          />
        ) : (
          <div className={styles.previewEmpty}>
            <p>왼쪽에서 탐구를 고르면 내용을 미리 볼 수 있어요.</p>
          </div>
        )
      }
    >
      <div className={styles.chips} role="group" aria-label="과목">
        <button type="button" className={styles.chip} aria-pressed={!subjectId} onClick={() => selectSubject(undefined)}>
          전체 과목
        </button>
        {subjects.map((subject) => (
          <button
            key={subject.subjectId}
            type="button"
            className={styles.chip}
            aria-pressed={subjectId === subject.subjectId}
            onClick={() => selectSubject(subject.subjectId)}
          >
            {subject.name}
          </button>
        ))}
      </div>

      <section aria-label="탐구 라이브러리 목록" aria-busy={catalog.isRefreshing}>
        {catalog.status === 'error' && catalog.error ? (
          <div className={styles.stateArea}>
            <ErrorState title="탐구 목록을 불러오지 못했어요" error={catalog.error} onRetry={catalog.retry} />
          </div>
        ) : !catalog.data ? (
          <div className={styles.stateArea}>
            <LoadingRows rows={5} label="탐구 목록을 불러오는 중" />
          </div>
        ) : items.length === 0 ? (
          <div className={styles.stateArea}>
            <EmptyState
              title={query || subjectId ? '조건에 맞는 탐구가 없어요' : '아직 공개된 탐구가 없어요'}
              description={query || subjectId ? '검색어나 과목을 바꿔 보세요. 원하는 주제는 직접 만들 수도 있어요.' : '원하는 주제가 있다면 직접 만들어 시작할 수 있어요.'}
            />
          </div>
        ) : (
          <ul className={styles.catalogList}>
            {items.map((item) => {
              const started = myTasks.data ? taskStartedFrom(myTasks.data.items, item.catalogTaskId) : undefined
              return (
                <li key={item.catalogTaskId}>
                  <button
                    type="button"
                    className={styles.catalogRow}
                    aria-current={item.catalogTaskId === selectedId ? 'true' : undefined}
                    onClick={() => select(item.catalogTaskId)}
                  >
                    <span className={styles.rowText}>
                      <span className={styles.rowTitle}>{item.title}</span>
                      <span className={styles.rowMeta}>{subjectName(item.subjectId)}</span>
                    </span>
                    {started?.status === 'IN_PROGRESS' && (
                      <span className={styles.badge} data-tone="blue">
                        진행 중
                      </span>
                    )}
                    {started?.status === 'COMPLETED' && (
                      <span className={styles.badge} data-tone="green">
                        완료
                      </span>
                    )}
                  </button>
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

interface CatalogPreviewProps {
  catalogTaskId: string
  subjectName: (subjectId: string) => string
  startedTask: EnrichmentTask | undefined
  myTasksReady: boolean
}

// 선택 카드의 Preview (Mockup AE-LIST-01·03). key로 카드마다 새로 그려 이전 카드 내용·오류가 남지 않게 한다.
function CatalogPreview({ catalogTaskId, subjectName, startedTask, myTasksReady }: CatalogPreviewProps) {
  const navigate = useNavigate()
  const { notifyDataChanged } = useAssessmentWorkspace()
  const detail = useApiQuery(`ae-catalog-item|${catalogTaskId}`, () => getCatalogItem(catalogTaskId))
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string>()
  const startingRef = useRef(false)
  // useApiQuery는 조회 중 직전 결과를 줄 수 있으므로 ID가 같은 응답만 쓴다.
  const item: EnrichmentCatalogItem | undefined = detail.data?.catalogTaskId === catalogTaskId ? detail.data : undefined

  const start = useCallback(async () => {
    if (!item || startingRef.current) return
    startingRef.current = true
    setStarting(true)
    setStartError(undefined)
    try {
      // 공개 콘텐츠는 그대로 두고 학생 개인 Task를 새 taskId로 만든다 (§18).
      const task = await createEnrichmentTask({
        title: item.title,
        subjectId: item.subjectId,
        goal: item.goal,
        relatedAssessmentId: null,
        catalogTaskId: item.catalogTaskId,
        status: 'IN_PROGRESS',
        deadlineDate: null,
        sourceReference: null,
      })
      notifyDataChanged()
      navigate(enrichmentTaskDetailPath(task.taskId))
    } catch (error) {
      const apiError = toApiError(error)
      setStartError(`${apiError.message} 다시 시도해 주세요. (${apiError.code})`)
      startingRef.current = false
      setStarting(false)
    }
  }, [item, navigate, notifyDataChanged])

  if (detail.status === 'error' && detail.error) {
    return (
      <div className={styles.preview}>
        <ErrorState title="탐구 내용을 불러오지 못했어요" error={detail.error} onRetry={detail.retry} />
      </div>
    )
  }
  if (!item) {
    return (
      <div className={styles.preview}>
        <LoadingRows rows={4} label="탐구 내용을 불러오는 중" />
      </div>
    )
  }

  return (
    <article className={styles.preview} aria-label={`${item.title} 미리보기`}>
      <div className={styles.previewHead}>
        <h2 className={styles.previewTitle}>{item.title}</h2>
        <p className={styles.previewMeta}>{subjectName(item.subjectId)} · 자율 심화 탐구 (학교 수행평가 아님)</p>
        <div className={styles.previewActions}>
          {startedTask ? (
            <Link to={enrichmentTaskDetailPath(startedTask.taskId)} className={styles.primaryButton}>
              {startedTask.status === 'IN_PROGRESS' ? '진행 중인 탐구 열기' : '내 탐구 열기'}
            </Link>
          ) : (
            <button
              type="button"
              className={styles.primaryButton}
              disabled={starting || !myTasksReady}
              aria-busy={starting}
              onClick={start}
            >
              {starting ? '시작하는 중…' : '이 탐구 시작하기'}
            </button>
          )}
        </div>
        {startError && (
          <p className={styles.inlineError} role="alert">
            <AlertIcon size={14} />
            {startError}
          </p>
        )}
      </div>

      <section className={styles.previewSection} aria-label="탐구 목표">
        <h3 className={styles.previewLabel}>탐구 목표</h3>
        <p className={styles.previewBody}>{item.goal}</p>
      </section>

      {item.methods.length > 0 && (
        <section className={styles.previewSection} aria-label="수행 안내">
          <h3 className={styles.previewLabel}>수행 안내</h3>
          <ul className={styles.bulletList}>
            {item.methods.map((method) => (
              <li key={method}>{method}</li>
            ))}
          </ul>
          <p className={styles.previewHint}>순서는 참고용이에요. 편한 것부터 시작해도 돼요.</p>
        </section>
      )}

      <p className={styles.previewHint}>
        시작하면 내 탐구로 따로 저장돼요. 나중에 이 공개 탐구 내용이 바뀌어도 내 기록은 바뀌지 않아요.
      </p>
    </article>
  )
}
