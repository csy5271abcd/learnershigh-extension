import { Link } from 'react-router'
import { FileIcon } from '../AssessmentIcons.tsx'
import styles from './university.module.css'

interface ExamSourceCardProps {
  title: string
  line: string
  to: string
  linkLabel?: string
}

// 대학 기출 PDF 출처 카드 (노트 블록·탐구 출처). 원문은 복사하지 않고 원본 PDF의 그 쪽으로만 연결한다.
export function ExamSourceCard({ title, line, to, linkLabel = '원본 보기' }: ExamSourceCardProps) {
  return (
    <div className={styles.sourceCard}>
      <span className={styles.sourceIcon} aria-hidden="true">
        <FileIcon size={16} />
      </span>
      <span className={styles.sourceText}>
        <span className={styles.sourceTitle}>{title}</span>
        <span className={styles.sourceLine}>{line}</span>
      </span>
      <Link className={styles.outlineButton} to={to}>
        {linkLabel}
      </Link>
    </div>
  )
}
