import { useState, type ReactNode } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { getUniversityExamDocument, universityExamFileUrl } from '../api/universityExamApi.ts'
import { AlertIcon, ChevronDownIcon, ChevronLeftIcon, InfoIcon } from '../components/AssessmentIcons.tsx'
import { EmptyState, ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { ExamQuestionNavigator } from '../components/university/ExamQuestionNavigator.tsx'
import { PdfViewer } from '../components/university/PdfViewer.tsx'
import styles from '../components/university/university.module.css'
import {
  examCategoryLabels,
  formatFileSize,
  questionAtPage,
  questionDisplayLabel,
  sectionsAtPage,
  universityLine,
} from '../model/universityExamView.ts'
import { useApiQuery } from '../model/useApiQuery.ts'
import { universityResourcesPath } from './paths.ts'

// 대학별 기출 PDF 원문 보기 (2026-10-28, P-25 PROPOSED). 왼쪽 PDF(앱 안 pdf.js), 오른쪽 자료 정보·현재 쪽·문항 목차.
// 쪽은 URL `?page=`(PDF 물리 쪽)에 두어 새로고침·공유해도 같은 쪽이 열린다.
// 2026-11-11: 읽기 전용 참고자료로 축소했다. 심화 탐구 시작·탐구 노트에 추가·`?task=` 복귀를 없앴다(명세 §3).
// 학교 수행평가 노트의 출처 카드(EXAM_SOURCE, ExamSourcePickerModal)는 이 화면과 별개로 유지된다.
// 메타데이터는 정적 참고자료라 http 모드에서도 열린다. 원문 PDF는 개발 서버 전용 경로뿐이다.
export function UniversityExamDocumentRoute() {
  const { documentId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const documentQuery = useApiQuery(`ae-uni-exam|${documentId}`, () => getUniversityExamDocument(documentId))
  const item = documentQuery.data?.documentId === documentId ? documentQuery.data : undefined
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
  const pageSections = sectionsAtPage(question, page)

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
        </>,
      )}
    </>
  )
}
