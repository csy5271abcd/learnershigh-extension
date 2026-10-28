import { Link, useLocation } from 'react-router'
import type { MockExamMaterial } from '../../api/types.ts'
import { examLine, subjectBadge } from '../../model/mockExamResearchView.ts'
import { mockExamMaterialDetailPath } from '../../routes/paths.ts'
import { ArrowRightIcon, PlusIcon } from '../AssessmentIcons.tsx'
import styles from './mockExam.module.css'

// 모의고사 60선 카드. 원문은 싣지 않고 출처·소재·추천 주제·계열만 보인다 (원문은 상세에서).
// 제목 링크로 상세에 가고, "심화 탐구 시작"은 기존 만들기 Modal을 연다.
export function MockExamResearchCard({ item, onStart }: { item: MockExamMaterial; onStart: () => void }) {
  const isEnglish = item.subjectId === 'mock_eng'
  // 상세의 "모의고사 목록"이 지금 탐색 조건(과목·검색·필터·더 보기)으로 돌아오도록 넘긴다.
  const { search } = useLocation()
  const linkState = { listSearch: search }
  return (
    <article className={styles.card} data-subject={isEnglish ? 'english' : 'korean'} aria-labelledby={`mock-card-${item.materialId}`}>
      <div className={styles.cardTop}>
        <span className={styles.subjectBadge}>{subjectBadge(item)}</span>
        <span className={styles.cardId}>{item.materialId}</span>
      </div>
      <p className={styles.cardExam}>{examLine(item)}</p>
      <h3 id={`mock-card-${item.materialId}`} className={styles.cardTitle}>
        <Link to={mockExamMaterialDetailPath(item.materialId)} state={linkState} className={styles.cardLink}>
          {item.idea.coreMaterial}
        </Link>
      </h3>
      <p className={styles.cardTopic}>
        <span className={styles.topicLabel}>추천 탐구 주제</span>
        {item.idea.topicTitle}
      </p>
      {item.idea.relatedFields.length > 0 && (
        <ul className={styles.majorChips} aria-label="추천 계열·학과">
          {item.idea.relatedFields.map((field) => (
            <li key={field}>{field}</li>
          ))}
        </ul>
      )}
      <div className={styles.cardActions}>
        <Link to={mockExamMaterialDetailPath(item.materialId)} state={linkState} className={styles.detailLink} aria-label={`${item.idea.coreMaterial} 지문 상세 보기`}>
          지문 상세 보기
          <ArrowRightIcon size={14} />
        </Link>
        <button type="button" className={styles.startButton} aria-label={`${item.idea.coreMaterial}로 심화 탐구 시작`} onClick={onStart}>
          <PlusIcon size={14} />
          심화 탐구 시작
        </button>
      </div>
    </article>
  )
}
