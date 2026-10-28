import { Link } from 'react-router'
import type { UniversityExamDocument, UniversityExamFileState } from '../../api/types.ts'
import { documentHighlights, examCategoryLabels } from '../../model/universityExamView.ts'
import { universityExamDocumentPath } from '../../routes/paths.ts'
import { PlusIcon } from '../AssessmentIcons.tsx'
import styles from './university.module.css'

interface UniversityExamRowProps {
  document: UniversityExamDocument
  fileState: UniversityExamFileState
  /** 목록 조건 (원문 보기에서 돌아올 때 그대로) */
  listSearch: string
  onStartTask: (document: UniversityExamDocument) => void
}

const fileStateLabels: Partial<Record<UniversityExamFileState, string>> = {
  MISSING: '파일 없음',
  CHANGED: '파일 변경됨',
}

/** 과목·영역은 대표 2개만, 나머지는 "외 N" (전체는 원문 화면에서) */
function subjectSummary(subjects: string[]): string {
  if (subjects.length === 0) return '—'
  return subjects.length <= 2 ? subjects.join(' · ') : `${subjects.slice(0, 2).join(' · ')} 외 ${subjects.length - 2}`
}

// 대학별 기출 PDF 목록 한 줄 (Daglo 전체 보드 목록의 정보 위계 참고: 제목 중심, 부가 정보는 작은 회색 글씨, 열 정렬).
// 제목을 누르면 원문이 열린다. PDF 보기·탐구 시작은 같은 무게의 보조 동작이다.
export function UniversityExamRow({ document, fileState, listSearch, onStartTask }: UniversityExamRowProps) {
  const highlights = documentHighlights(document, 6)
  const fileLabel = fileStateLabels[fileState]
  const viewerPath = universityExamDocumentPath(document.documentId)
  return (
    <li className={styles.examRow}>
      <div className={styles.rowTitleCell}>
        <Link className={styles.rowTitle} to={viewerPath} state={{ listSearch }}>
          {document.title}
        </Link>
        {highlights.length > 0 && <p className={styles.rowKeywords}>{highlights.join(' · ')}</p>}
        {fileLabel && <p className={styles.rowWarning}>{fileLabel}</p>}
      </div>
      <div className={styles.rowCell} data-col="university">
        <span className={styles.rowPrimary}>{document.university}</span>
        <span className={styles.rowMeta}>
          {document.academicYear} · {examCategoryLabels[document.category]}
        </span>
      </div>
      <div className={styles.rowCell} data-col="subject">
        <span className={styles.rowPrimary}>{subjectSummary(document.subjectAreas)}</span>
      </div>
      <div className={styles.rowCell} data-col="pages">
        <span className={styles.rowPrimary}>{document.pageCount}쪽</span>
        {document.indexStatus === 'INDEXED' && <span className={styles.rowMeta}>문항 {document.questions.length}</span>}
      </div>
      {/* 좁은 화면에서 열 대신 한 줄로 보이는 요약 */}
      <p className={styles.rowCompactMeta}>
        {document.university} · {document.academicYear} · {examCategoryLabels[document.category]} · {subjectSummary(document.subjectAreas)} · {document.pageCount}쪽
      </p>
      <div className={styles.rowActions}>
        <Link className={styles.quietButton} to={viewerPath} state={{ listSearch }} aria-label={`${document.title} PDF 보기`}>
          PDF 보기
        </Link>
        <button type="button" className={styles.quietButton} aria-label={`${document.title}로 탐구 시작`} onClick={() => onStartTask(document)}>
          <PlusIcon size={13} />
          탐구 시작
        </button>
      </div>
    </li>
  )
}
