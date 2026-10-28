import type { ComponentType } from 'react'
import type { ReferenceSource, ReferenceSourceCategory } from '../../api/types.ts'
import { BarChartIcon, CapIcon, FileIcon, InstitutionIcon, NoteIcon, PlayIcon } from '../AssessmentIcons.tsx'
import styles from './referenceLinks.module.css'

const categoryIcons: Record<ReferenceSourceCategory, ComponentType<{ size?: number; className?: string }>> = {
  '공식 기관': InstitutionIcon,
  '논문·학술': FileIcon,
  '뉴스·시사': NoteIcon,
  '통계·데이터': BarChartIcon,
  '영상·다큐': PlayIcon,
  '교육 도구·포털': CapIcon,
}

export function ReferenceCategoryIcon({ category, size = 22 }: { category: ReferenceSourceCategory; size?: number }) {
  const Icon = categoryIcons[category]
  return <Icon size={size} />
}

interface ReferenceSourceCardProps {
  source: ReferenceSource
  /** 이 자료원이 추천되는 과목 영역 */
  areas: { areaKey: string; label: string }[]
  /** 지금 고른 영역에서의 활용 (없으면 원본 "주요 활용") */
  usage: string | null
  /** 영역별 활용 문장 전체 (펼쳐 보기) */
  usages: { label: string; usage: string }[]
  onAddFound: () => void
}

// 자료원 카드 (Daglo 카드형 안내 화면을 참고한 LearnersHigh 디자인). 공식 사이트로 이동하는 "자료원"이며 개별 기사·논문이 아니다.
export function ReferenceSourceCard({ source, areas, usage, usages, onAddFound }: ReferenceSourceCardProps) {
  const headingId = `reference-${source.sourceId}`
  return (
    <article className={styles.sourceCard} aria-labelledby={headingId}>
      <div className={styles.sourceVisual} data-category={source.category}>
        <span className={styles.sourceIcon} aria-hidden="true">
          <ReferenceCategoryIcon category={source.category} size={24} />
        </span>
        <span className={styles.sourceCategory}>{source.category}</span>
      </div>
      <div className={styles.sourceBody}>
        <h3 id={headingId} className={styles.sourceName}>
          {source.name}
        </h3>
        <p className={styles.sourceNature}>
          {source.nature}
          {source.sourceGroup === 'additional' && <span className={styles.additionalBadge}>추가 자료원</span>}
        </p>
        {areas.length > 0 && (
          <ul className={styles.areaTags} aria-label="추천 과목 영역">
            {areas.map((area) => (
              <li key={area.areaKey}>{area.label}</li>
            ))}
          </ul>
        )}
        <p className={styles.sourceUsage}>{usage ?? source.primaryUsage}</p>
        {source.accessNotes && <p className={styles.accessNote}>{source.accessNotes}</p>}
        {usages.length > 1 && (
          <details className={styles.usageDetails}>
            <summary>과목별 활용 보기</summary>
            <ul>
              {usages.map((item) => (
                <li key={`${item.label}-${item.usage}`}>
                  <strong>{item.label}</strong> {item.usage}
                </li>
              ))}
            </ul>
          </details>
        )}
        <div className={styles.sourceActions}>
          <a className={styles.openButton} href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`${source.name} 공식 사이트 열기 (새 탭)`}>
            공식 사이트 열기 ↗
          </a>
          <button type="button" className={styles.addButton} aria-label={`${source.name}에서 찾은 자료를 자료함에 등록`} onClick={onAddFound}>
            찾은 자료 등록
          </button>
        </div>
      </div>
    </article>
  )
}
