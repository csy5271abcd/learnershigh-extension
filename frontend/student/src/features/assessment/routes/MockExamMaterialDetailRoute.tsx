import type { ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { getMockExamMaterial } from '../api/enrichmentApi.ts'
import { ChevronLeftIcon, InfoIcon } from '../components/AssessmentIcons.tsx'
import { EnrichmentFrame } from '../components/enrichment/EnrichmentFrame.tsx'
import { MockExamPassage } from '../components/enrichment/MockExamPassage.tsx'
import styles from '../components/enrichment/enrichment.module.css'
import { EmptyState, ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { mockExamSourceLabel, mockExamSubjectName } from '../model/enrichmentView.ts'
import { examLine } from '../model/mockExamResearchView.ts'
import mockStyles from '../components/enrichment/mockExam.module.css'
import { useApiQuery } from '../model/useApiQuery.ts'
import { mockExamMaterialsPath } from './paths.ts'

// 모의고사 탐구 소재 상세 (screen-map S19, Mockup AE-MOCK-02·03, inquiry §4, api-contract.md §17).
// 원문 정보(출처)와 LearnersHigh가 쓴 탐구 아이디어를 따로 보여준다.
// 모의고사 60선(2026-10-28)은 원본 Markdown의 원문 지문을 그대로 보여준다 — 공개 배포 권한은 미확인 (API-OD-A11, P-24).
// 원문은 Git에 넣지 않고 로컬 파일이 있을 때만 붙는다(api/mock/mockExamPassages.ts). 없으면 "원문 미포함" 안내만 보여준다.
// 2026-11-11: 읽기 전용 정적 참고자료(content/enrichmentContent.ts). "이 주제로 심화 탐구 시작"·수행평가 아이디어 연결을 없앴다(명세 §1).
// Mockup의 영문 주제·해시태그·LearnersHigh 코멘트·관련 자율 심화 Task·즐겨찾기는 계약/Spec 항목에 없어 보류한다 (MM-28).
export function MockExamMaterialDetailRoute() {
  const { materialId = '' } = useParams()
  const location = useLocation()
  const material = useApiQuery(`ae-material|${materialId}`, () => getMockExamMaterial(materialId))
  const item = material.data?.materialId === materialId ? material.data : undefined

  const frame = (content: ReactNode) => (
    <EnrichmentFrame searchTarget={mockExamMaterialsPath}>
      <article className={styles.article}>{content}</article>
    </EnrichmentFrame>
  )

  const listSearch = (location.state as { listSearch?: unknown } | null)?.listSearch
  const back = (
    <Link to={`${mockExamMaterialsPath}${typeof listSearch === 'string' && listSearch.startsWith('?') ? listSearch : ''}`} className={styles.backLink}>
      <ChevronLeftIcon size={15} />
      모의고사 목록
    </Link>
  )

  if (material.status === 'error' && material.error) {
    return frame(
      <>
        {back}
        {material.error.code === 'MOCK_EXAM_MATERIAL_NOT_FOUND' ? (
          <EmptyState title="모의고사 자료를 찾을 수 없어요" action={<Link to={mockExamMaterialsPath}>모의고사 목록으로 가기</Link>} />
        ) : (
          <ErrorState title="탐구 소재를 불러오지 못했어요" error={material.error} onRetry={material.retry} />
        )}
      </>,
    )
  }
  if (!item) return frame(<LoadingRows rows={4} label="탐구 소재를 불러오는 중" />)

  const subjectName = mockExamSubjectName(item.subjectId)
  const sourceLabel = mockExamSourceLabel(item.source, subjectName)
  const research = item.research
  return frame(
    <>
      <div className={styles.articleTop}>
        {back}
      </div>

      <header className={mockStyles.detailHeader}>
        <p className={mockStyles.detailMeta}>
          <span className={styles.subjectTag}>{subjectName}</span>
          <span>{examLine(item)}</span>
          <span>{item.materialId}</span>
        </p>
        <h2 className={mockStyles.detailTitle}>{item.idea.coreMaterial}</h2>
        {item.idea.relatedFields.length > 0 && (
          <ul className={mockStyles.majorChips} aria-label="추천 계열·학과">
            {item.idea.relatedFields.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </ul>
        )}
      </header>

      {research ? (
        <section className={mockStyles.passageSection} aria-labelledby="mock-passage">
          <h3 id="mock-passage" className={mockStyles.sectionTitle}>
            원문 지문
          </h3>
          {/* 원본 텍스트 그대로 (국어 2단 편집 행바꿈 포함). 길면 스크롤, "전체 펼치기"로 잘림 없이 볼 수 있다. */}
          {/* A26: 원문 지문은 텍스트 데이터(PDF 아님). 글자·줄바꿈 그대로, 없으면 이유별 안내 */}
          <MockExamPassage passage={research.passage} examTitle={research.examTitle} questionLabel={research.questionLabel} />
          <dl className={mockStyles.sourceTable} aria-label="시험 출처">
            <dt>시험</dt>
            <dd>{research.examTitle}</dd>
            <dt>문항</dt>
            <dd>{research.questionLabel}</dd>
            <dt>원본 PDF</dt>
            <dd>
              {research.originalFileName} · {research.pdfPage}
            </dd>
          </dl>
          <p className={styles.sourceLine}>
            <InfoIcon size={13} />
            지문은 시험 자료에서 발췌한 원문이에요. 아래 추천 내용은 LearnersHigh 학습용 제안이며 출제기관 공식 해설이 아니에요.
          </p>
        </section>
      ) : (
        <p className={styles.sourceLine}>
          <InfoIcon size={13} />
          {sourceLabel ? '지문 원문은 저작권 때문에 싣지 않고 내용만 요약했어요.' : 'LearnersHigh가 직접 만든 시연용 주제예요. 실제 시험 지문이 아니에요.'} 지금은 추천 목록에서 내려간 소재예요.
        </p>
      )}

      <section className={styles.articleSection} aria-labelledby="mock-topic">
        <h3 id="mock-topic" className={styles.articleSectionTitle}>
          추천 탐구 주제
        </h3>
        <div className={mockStyles.ideaBox}>
          <p className={mockStyles.ideaLabel}>탐구 주제</p>
          <p className={mockStyles.ideaTopic}>{item.idea.topicTitle}</p>
        </div>
      </section>

      <section className={styles.articleSection} aria-labelledby="mock-reason">
        <h3 id="mock-reason" className={styles.articleSectionTitle}>
          탐구 주제 해설
        </h3>
        <p className={mockStyles.ideaText}>{item.idea.topicReason}</p>
      </section>

      {item.idea.methods.length > 0 && (
        <section className={styles.articleSection} aria-labelledby="mock-methods">
          <h3 id="mock-methods" className={styles.articleSectionTitle}>
            탐구 방법 예시
          </h3>
          <ol className={mockStyles.methodList}>
            {item.idea.methods.map((method, index) => (
              <li key={method.label}>
                <span className={mockStyles.stepNumber} aria-hidden="true">
                  {index + 1}
                </span>
                <span>
                  <span className="lh-visually-hidden">{method.label}: </span>
                  {method.text}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {item.idea.extensionQuestions.length > 0 && (
        <section className={styles.articleSection} aria-labelledby="mock-questions">
          <h3 id="mock-questions" className={styles.articleSectionTitle}>
            심화 탐구 확장하기
          </h3>
          <ol className={mockStyles.questionList}>
            {item.idea.extensionQuestions.map((question, index) => (
              <li key={question}>
                <span className={mockStyles.questionMark}>Q{index + 1}.</span>
                <span>{question}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

    </>,
  )
}
