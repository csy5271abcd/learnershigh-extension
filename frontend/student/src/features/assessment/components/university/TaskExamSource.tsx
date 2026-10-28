import { Link } from 'react-router'
import type { EnrichmentSourceReference } from '../../api/types.ts'
import { getUniversityExamDocument } from '../../api/universityExamApi.ts'
import { examSourceLine } from '../../model/universityExamView.ts'
import { useApiQuery } from '../../model/useApiQuery.ts'
import { universityExamDocumentPath } from '../../routes/paths.ts'
import { LoadingRows } from '../StateViews.tsx'
import { ExamSourceCard } from './ExamSourceCard.tsx'
import styles from './university.module.css'

interface TaskExamSourceProps {
  taskId: string
  source: EnrichmentSourceReference
}

// 심화 탐구의 출발 자료가 대학 기출 PDF일 때 (§18 sourceReference + locator P-25): 문서·문항·쪽과 원문 바로가기.
// 문서가 목록에서 빠져도 내 탐구·노트는 그대로이며, 원문만 열 수 없다고 안내한다.
export function TaskExamSource({ taskId, source }: TaskExamSourceProps) {
  const document = useApiQuery(`ae-uni-exam|${source.sourceId}`, () => getUniversityExamDocument(source.sourceId))
  const item = document.data?.documentId === source.sourceId ? document.data : undefined

  if (document.status === 'error' && document.error) {
    return (
      <p className={styles.mutedText}>
        {document.error.code === 'UNIVERSITY_RESOURCE_NOT_FOUND'
          ? '시작할 때 참고한 대학 자료를 지금은 찾을 수 없어요. 내 탐구와 노트는 그대로 남아 있어요.'
          : '참고한 대학 자료 정보를 불러오지 못했어요.'}
        {document.error.code !== 'UNIVERSITY_RESOURCE_NOT_FOUND' && (
          <button type="button" className={styles.textButton} onClick={document.retry}>
            다시 시도
          </button>
        )}
      </p>
    )
  }
  if (!item) return <LoadingRows rows={1} label="탐구 출처를 불러오는 중" />

  const locator = source.locator ?? null
  const question = locator?.questionId ? (item.questions.find((entry) => entry.questionId === locator.questionId) ?? null) : null
  const page = locator?.page ?? null
  return (
    <div className={styles.infoSection}>
      <ExamSourceCard
        title={item.title}
        line={page ? examSourceLine(item, question, page) : `${item.university} · ${item.academicYear}학년도 · 문서 전체`}
        to={universityExamDocumentPath(item.documentId, { page: page ?? 1, task: taskId })}
        linkLabel={page ? '해당 쪽으로 이동' : 'PDF 원문 보기'}
      />
      {page && page !== 1 && (
        <Link className={styles.textButton} to={universityExamDocumentPath(item.documentId, { page: 1, task: taskId })}>
          PDF 원문 처음부터 보기
        </Link>
      )}
    </div>
  )
}
