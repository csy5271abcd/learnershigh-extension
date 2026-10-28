import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import type { EnrichmentTask, UniversityExamQuestion } from '../api/types.ts'
import { getUniversityExamDocument, universityExamFileUrl } from '../api/universityExamApi.ts'
import { AlertIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, InfoIcon, NoteIcon, PlusIcon } from '../components/AssessmentIcons.tsx'
import { CreateEnrichmentModal, type CreateEnrichmentPrefill } from '../components/enrichment/CreateEnrichmentModal.tsx'
import { MockDataNotice } from '../components/MockDataNotice.tsx'
import { EmptyState, ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { ExamQuestionNavigator } from '../components/university/ExamQuestionNavigator.tsx'
import { type ExamSourceInsertState } from '../components/university/ExamSourcePickerModal.tsx'
import { examTaskPrefill } from '../components/university/examTaskPrefill.ts'
import { NoteTargetModal } from '../components/university/NoteTargetModal.tsx'
import { PdfViewer } from '../components/university/PdfViewer.tsx'
import styles from '../components/university/university.module.css'
import { useAssessmentWorkspace } from '../model/assessmentWorkspace.ts'
import {
  examCategoryLabels,
  examSourceLine,
  formatFileSize,
  questionAtPage,
  questionDisplayLabel,
  sectionsAtPage,
  universityLine,
} from '../model/universityExamView.ts'
import { useApiQuery } from '../model/useApiQuery.ts'
import { enrichmentTaskDetailPath, universityResourcesPath } from './paths.ts'

// 대학별 기출 PDF 원문 보기 (2026-10-28, P-25 PROPOSED). 왼쪽 PDF(앱 안 pdf.js), 오른쪽 자료 정보·현재 쪽·문항 목차.
// 쪽은 URL `?page=`(PDF 물리 쪽)에 두어 새로고침·공유해도 같은 쪽이 열린다. `?task=`면 그 탐구 노트로 돌아가기·노트에 추가가 된다.
// 새 노트 편집기를 만들지 않는다. 노트에 넣기는 기존 심화 탐구 상세의 편집기가 카드를 넣고 자동 저장한다.
export function UniversityExamDocumentRoute() {
  const { documentId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { selectedContext, termAssessments, notifyDataChanged } = useAssessmentWorkspace()
  const documentQuery = useApiQuery(`ae-uni-exam|${documentId}`, () => getUniversityExamDocument(documentId))
  const item = documentQuery.data?.documentId === documentId ? documentQuery.data : undefined
  const taskId = searchParams.get('task')
  const [createRequest, setCreateRequest] = useState<CreateEnrichmentPrefill | null>(null)
  const [notePicker, setNotePicker] = useState(false)
  const [tocOpen, setTocOpen] = useState(() => window.matchMedia('(min-width: 821px)').matches)

  const listSearch = (location.state as { listSearch?: unknown } | null)?.listSearch
  const listPath = `${universityResourcesPath}${typeof listSearch === 'string' && listSearch.startsWith('?') ? listSearch : ''}`
  const requestedPage = Number(searchParams.get('page')) || 1
  const page = item ? Math.min(Math.max(1, Math.floor(requestedPage)), item.pageCount) : 1
  const question = item ? questionAtPage(item, page) : null

  const goToPage = (next: number) =>
    setSearchParams(
      (previous) => {
        const params = new URLSearchParams(previous)
        params.set('page', String(next))
        return params
      },
      { replace: true, preventScrollReset: true, state: location.state },
    )

  const backLinks = (
    <ol className={styles.breadcrumb} aria-label="위치">
      <li>
        <Link to={listPath}>
          <ChevronLeftIcon size={14} />
          대학별 자료
        </Link>
      </li>
      {item && (
        <>
          <li aria-hidden="true">/</li>
          <li>{item.university}</li>
          <li aria-hidden="true">/</li>
          <li>
            {item.academicYear} {item.subjectAreas.length === 1 ? item.subjectAreas[0] : item.examType}
          </li>
        </>
      )}
    </ol>
  )

  const frame = (viewer: ReactNode, info: ReactNode) => (
    <main className={styles.docPage}>
      <div className={styles.docTopBar}>
        {backLinks}
        {taskId && (
          <div className={styles.topBarActions}>
            <Link className={styles.outlineButton} to={enrichmentTaskDetailPath(taskId)}>
              <NoteIcon size={14} />
              탐구 노트로 돌아가기
            </Link>
          </div>
        )}
      </div>
      <div className={styles.docBody}>
        <section className={styles.viewerArea} aria-label="PDF 원문">
          {viewer}
        </section>
        <aside className={styles.infoArea} aria-label="자료 정보">
          <div className={styles.infoStack}>{info}</div>
        </aside>
      </div>
    </main>
  )

  if (documentQuery.status === 'error' && documentQuery.error) {
    const notFound = documentQuery.error.code === 'UNIVERSITY_RESOURCE_NOT_FOUND'
    return frame(
      notFound ? (
        <EmptyState title="자료를 찾을 수 없어요" description="목록에서 빠졌거나 없는 자료예요." action={<Link to={listPath}>대학별 자료로 가기</Link>} />
      ) : (
        <ErrorState title="자료 정보를 불러오지 못했어요" error={documentQuery.error} onRetry={documentQuery.retry} />
      ),
      null,
    )
  }
  if (!item) return frame(<LoadingRows rows={4} label="자료를 불러오는 중" />, <LoadingRows rows={3} label="자료 정보를 불러오는 중" />)

  const fileUrl = universityExamFileUrl(item.documentId)
  const subjects = selectedContext?.subjects ?? []
  const pageSections = sectionsAtPage(question, page)
  const startTask = (target: UniversityExamQuestion | null, targetPage: number) => setCreateRequest(examTaskPrefill(item, target, targetPage, subjects))

  const sourceForNote = (): ExamSourceInsertState['examSourceInsert'] => ({
    documentId: item.documentId,
    questionId: question?.questionId ?? null,
    pageStart: page,
    pageEnd: null,
    label: examSourceLine(item, question, page),
    title: item.title,
  })
  const insertIntoNote = (targetTaskId: string) => {
    const state: ExamSourceInsertState = { examSourceInsert: sourceForNote() }
    navigate(enrichmentTaskDetailPath(targetTaskId), { state })
  }

  const onCreated = (task: EnrichmentTask) => {
    setCreateRequest(null)
    notifyDataChanged()
    navigate(enrichmentTaskDetailPath(task.taskId))
  }

  return (
    <>
      {frame(
        fileUrl ? (
          <PdfViewer key={item.documentId} url={fileUrl} title={item.title} expectedPageCount={item.pageCount} page={page} onPageChange={goToPage} />
        ) : (
          <div className={styles.viewerState} role="status">
            <InfoIcon size={20} />
            <p className={styles.viewerStateTitle}>이 환경에서는 원문 PDF를 제공하지 않아요</p>
            <p className={styles.viewerStateBody}>
              원문은 개발 환경에서만 열려요. 서비스 공개 전에 대학의 이용 허락과 서버 제공 방식(권한·저장소)이 정해져야 해요.
            </p>
          </div>
        ),
        <>
          <section className={styles.infoSection} aria-labelledby="exam-doc-title">
            <p className={styles.cardMeta}>
              <span className={styles.badge} data-tone="blue">
                {item.university}
              </span>
              <span className={styles.badge}>{item.academicYear}학년도</span>
              <span className={styles.badge} data-tone={item.category === 'SAMPLE_QUESTION' ? 'sample' : undefined}>
                {examCategoryLabels[item.category]}
              </span>
            </p>
            <h1 id="exam-doc-title" className={styles.docTitle}>
              {item.title}
            </h1>
            {item.category === 'SAMPLE_QUESTION' && (
              <p className={styles.sampleNote}>
                <AlertIcon size={14} />
                대학이 면접 대비로 공개한 예시 문항이에요. 실제로 출제된 기출문제가 아니에요.
              </p>
            )}
            <dl className={styles.infoList}>
              <dt>대학</dt>
              <dd>{universityLine(item)}</dd>
              <dt>유형</dt>
              <dd>{item.examType}</dd>
              {item.subjectAreas.length > 0 && (
                <>
                  <dt>과목·영역</dt>
                  <dd>{item.subjectAreas.join(' · ')}</dd>
                </>
              )}
              <dt>원본 파일</dt>
              <dd>
                {item.fileName} · {item.pageCount}쪽 · {formatFileSize(item.sizeBytes)}
              </dd>
            </dl>
          </section>

          <section className={styles.currentBox} aria-label="지금 보는 쪽">
            <p className={styles.infoLabel}>지금 보는 쪽</p>
            <p className={styles.currentLine}>
              <strong>
                PDF {page}쪽 / {item.pageCount}쪽
              </strong>
              {question && ` · ${questionDisplayLabel(question)}`}
              {pageSections.length > 0 && ` · ${pageSections.join('·')}`}
            </p>
            {question && question.concepts.length > 0 && (
              <ul className={styles.conceptChips} aria-label="핵심 개념 (원문 표기)">
                {question.concepts.map((concept) => (
                  <li key={concept}>{concept}</li>
                ))}
              </ul>
            )}
            <div className={styles.actionColumn}>
              {/* 위치·배치는 간소화 전 그대로, 파란 배경 강조만 빼고 보조 버튼 모양 (2026-10-28 사용자 요청) */}
              <button type="button" className={styles.outlineButton} onClick={() => startTask(question, page)}>
                <PlusIcon size={14} />
                {question ? '이 문항으로 심화 탐구 시작' : '이 쪽으로 심화 탐구 시작'}
              </button>
              <button
                type="button"
                className={styles.outlineButton}
                onClick={() => (taskId ? insertIntoNote(taskId) : setNotePicker(true))}
              >
                <NoteIcon size={14} />
                현재 쪽을 노트에 추가
              </button>
              {taskId && (
                <Link className={styles.textButton} to={enrichmentTaskDetailPath(taskId)}>
                  탐구 노트로 돌아가기
                  <ChevronRightIcon size={13} />
                </Link>
              )}
            </div>
          </section>

          <section className={styles.infoSection} aria-label="문항 목차">
            <button type="button" className={styles.tocToggle} aria-expanded={tocOpen} aria-controls="exam-toc" onClick={() => setTocOpen(!tocOpen)}>
              문항 목차 {item.indexStatus === 'INDEXED' ? `(${item.questions.length})` : ''}
              <ChevronDownIcon size={14} />
            </button>
            <div id="exam-toc" hidden={!tocOpen}>
              {tocOpen && (
                <ExamQuestionNavigator
                  document={item}
                  currentQuestionId={question?.questionId ?? null}
                  currentPage={page}
                  onGoTo={(targetPage) => goToPage(targetPage)}
                  onStartTask={(target) => startTask(target, target.pageStart)}
                />
              )}
            </div>
          </section>

          <p className={styles.noticeBox}>
            <InfoIcon size={13} />
            <span>
              문항 목차는 원문에서 문항 제목·표 머리가 확인된 쪽만 연결했어요. 쪽 번호는 PDF 쪽 기준이라 문서에 인쇄된 쪽 번호와 다를 수 있어요. 원문은 개발 환경
              시연용이며, 공개 배포 전 대학의 이용 허락 확인이 필요해요.
            </span>
          </p>
          <MockDataNotice />
        </>,
      )}

      {createRequest && selectedContext && (
        <CreateEnrichmentModal
          subjects={selectedContext.subjects}
          assessments={termAssessments.data?.items ?? []}
          prefill={createRequest}
          onClose={() => setCreateRequest(null)}
          onCreated={onCreated}
        />
      )}
      {notePicker && (
        <NoteTargetModal
          sourceLine={examSourceLine(item, question, page)}
          onClose={() => setNotePicker(false)}
          onPick={(targetTaskId) => {
            setNotePicker(false)
            insertIntoNote(targetTaskId)
          }}
        />
      )}
    </>
  )
}
