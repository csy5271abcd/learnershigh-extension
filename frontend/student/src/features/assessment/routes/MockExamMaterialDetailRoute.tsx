import { useCallback, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { getMockExamMaterial } from '../api/enrichmentApi.ts'
import { ChevronDownIcon, ChevronLeftIcon, InfoIcon, PlusIcon } from '../components/AssessmentIcons.tsx'
import type { CreateEnrichmentPrefill } from '../components/enrichment/CreateEnrichmentModal.tsx'
import { EnrichmentFrame } from '../components/enrichment/EnrichmentFrame.tsx'
import styles from '../components/enrichment/enrichment.module.css'
import { MockDataNotice } from '../components/MockDataNotice.tsx'
import { EmptyState, ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { Toast, type ToastMessage } from '../components/Toast.tsx'
import { useAssessmentWorkspace } from '../model/assessmentWorkspace.ts'
import { mockExamSourceLabel, mockExamSubjectName } from '../model/enrichmentView.ts'
import { useApiQuery } from '../model/useApiQuery.ts'
import { mockExamMaterialsPath } from './paths.ts'

// 모의고사 탐구 소재 상세 (screen-map S19, Mockup AE-MOCK-02·03, inquiry §4, api-contract.md §17).
// 원문 정보(출처)와 LearnersHigh가 쓴 탐구 아이디어를 따로 보여준다. 지문 전문은 싣지 않는다 (API-OD-A11).
// 심화 Task 만들기는 §18 sourceReference(제안 계약)로 출발 자료를 남긴다.
// Mockup의 영문 주제·해시태그·LearnersHigh 코멘트·관련 자율 심화 Task·즐겨찾기는 계약/Spec 항목에 없어 보류한다 (MM-28).
export function MockExamMaterialDetailRoute() {
  const { materialId = '' } = useParams()
  const { termAssessments } = useAssessmentWorkspace()
  const material = useApiQuery(`ae-material|${materialId}`, () => getMockExamMaterial(materialId))
  const [createRequest, setCreateRequest] = useState<CreateEnrichmentPrefill | null>(null)
  const [ideaTarget, setIdeaTarget] = useState('')
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const dismissToast = useCallback(() => setToast(null), [])
  const item = material.data?.materialId === materialId ? material.data : undefined

  const frame = (content: ReactNode) => (
    <EnrichmentFrame
      searchTarget={mockExamMaterialsPath}
      createRequest={createRequest}
      onCreateRequestHandled={() => setCreateRequest(null)}
    >
      <article className={styles.article}>{content}</article>
      <Toast message={toast} onDismiss={dismissToast} />
    </EnrichmentFrame>
  )

  const back = (
    <Link to={mockExamMaterialsPath} className={styles.backLink}>
      <ChevronLeftIcon size={15} />
      지문 목록
    </Link>
  )

  if (material.status === 'error' && material.error) {
    return frame(
      <>
        {back}
        {material.error.code === 'MOCK_EXAM_MATERIAL_NOT_FOUND' ? (
          <EmptyState title="탐구 소재를 찾을 수 없어요" description="공개가 끝났거나 없는 소재예요." />
        ) : (
          <ErrorState title="탐구 소재를 불러오지 못했어요" error={material.error} onRetry={material.retry} />
        )}
      </>,
    )
  }
  if (!item) return frame(<LoadingRows rows={4} label="탐구 소재를 불러오는 중" />)

  const subjectName = mockExamSubjectName(item.subjectId)
  const sourceLabel = mockExamSourceLabel(item.source, subjectName)

  return frame(
    <>
      <div className={styles.articleTop}>
        {back}
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() =>
            setCreateRequest({
              title: item.idea.topicTitle,
              goal: item.idea.goal,
              sourceReference: { type: 'MOCK_EXAM_MATERIAL', sourceId: item.materialId },
              sourceTitle: item.idea.topicTitle,
            })
          }
        >
          <PlusIcon size={15} />
          심화 Task 만들기
        </button>
      </div>

      <div className={styles.articleTitleRow}>
        <h2 className={styles.articleTitle}>{sourceLabel ?? item.idea.topicTitle}</h2>
        <span className={styles.subjectTag}>{subjectName}</span>
      </div>
      <p className={styles.articleLead}>{item.idea.coreMaterial}</p>
      <p className={styles.sourceLine}>
        <InfoIcon size={13} />
        {sourceLabel
          ? '지문 원문은 저작권 때문에 싣지 않고 내용만 요약했어요.'
          : 'LearnersHigh가 직접 만든 시연용 주제예요. 실제 시험 지문이 아니에요.'}
        {item.source.sourceUrl ? (
          <a href={item.source.sourceUrl} target="_blank" rel="noreferrer">
            원문 확인
          </a>
        ) : (
          <span className={styles.sourceWarning}>원문 링크 없음</span>
        )}
      </p>
      {item.idea.relatedFields.length > 0 && (
        <p className={styles.fieldChips}>
          추천 계열·분야
          {item.idea.relatedFields.map((field) => (
            <span key={field} className={styles.fieldChip}>
              {field}
            </span>
          ))}
        </p>
      )}

      <section className={styles.articleSection} aria-labelledby="mock-topic">
        <h3 id="mock-topic" className={styles.articleSectionTitle}>
          탐구 주제 추천
        </h3>
        <div className={styles.box}>
          <p className={styles.boxTitle}>{item.idea.topicTitle}</p>
          <p>{item.idea.goal}</p>
        </div>
      </section>

      <section className={styles.articleSection} aria-labelledby="mock-reason">
        <h3 id="mock-reason" className={styles.articleSectionTitle}>
          탐구 주제 해설
        </h3>
        <p className={styles.box}>{item.idea.topicReason}</p>
      </section>

      {item.idea.methods.length > 0 && (
        <section className={styles.articleSection} aria-labelledby="mock-methods">
          <h3 id="mock-methods" className={styles.articleSectionTitle}>
            탐구 방법 예시
          </h3>
          <dl className={styles.methodTable}>
            {item.idea.methods.map((method) => (
              <div key={method.label} style={{ display: 'contents' }}>
                <dt>{method.label}</dt>
                <dd>{method.text}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {item.idea.extensionQuestions.length > 0 && (
        <section className={styles.articleSection} aria-labelledby="mock-questions">
          <h3 id="mock-questions" className={styles.articleSectionTitle}>
            심화 탐구 확장하기
          </h3>
          <ol className={styles.questionList}>
            {item.idea.extensionQuestions.map((question, index) => (
              <li key={question}>
                <strong>Q{index + 1}.</strong>
                {question}
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className={styles.connectBox}>
        <p className={styles.boxTitle}>학교 수행평가에 아이디어로 연결</p>
        <div className={styles.connectRow}>
          <span className={styles.selectWrap}>
            <label className="lh-visually-hidden" htmlFor="mock-connect-target">
              연결할 수행평가
            </label>
            <select
              id="mock-connect-target"
              className={styles.select}
              value={ideaTarget}
              onChange={(event) => setIdeaTarget(event.target.value)}
            >
              <option value="">수행평가 선택</option>
              {(termAssessments.data?.items ?? []).map((assessment) => (
                <option key={assessment.assessmentId} value={assessment.assessmentId}>
                  {assessment.title}
                </option>
              ))}
            </select>
            <ChevronDownIcon size={16} className={styles.selectChevron} />
          </span>
          <button
            type="button"
            className={styles.primaryButton}
            aria-disabled="true"
            aria-describedby="mock-connect-reason"
            onClick={() =>
              setToast((previous) => ({
                id: (previous?.id ?? 0) + 1,
                tone: 'info',
                text: '노트에 아이디어를 넣는 기능은 탐구 노트 편집기와 함께 제공돼요.',
              }))
            }
          >
            탐구 주제로 사용하기
          </button>
        </div>
        <p id="mock-connect-reason" className={styles.previewHint}>
          노트에 아이디어만 추가되는 기능이에요. 노트 편집기가 준비되면 쓸 수 있고, 수행평가 주제명은 바뀌지 않아요.
        </p>
      </div>

      <div className={styles.notices}>
        <MockDataNotice />
      </div>
    </>,
  )
}
