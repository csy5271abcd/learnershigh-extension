import { useState } from 'react'
import { candidateStatusLabel, sourcePageLabel, type EvaluationItemLookup } from '../../model/evaluationItemCandidate.ts'
import { analysisStatusLabels, valueOrMissing } from '../../model/pdfImportView.ts'
import type { QueryResult } from '../../model/useApiQuery.ts'
import { ClipboardIcon, InfoIcon, SparkleIcon } from '../AssessmentIcons.tsx'
import { ErrorState, LoadingRows } from '../StateViews.tsx'
import styles from './detail.module.css'
import contextStyles from './context.module.css'

interface CriteriaTabProps {
  lookup: QueryResult<EvaluationItemLookup>
  onUnavailable: (message: string) => void
}

// 평가 기준 (Mockup SA-DETAIL-01·08, AUD-015 2026-10-27 승인).
// 연결된 평가계획서 항목(evaluationItemRef)의 §11 분석 결과를 "확인이 필요한 후보"로 보여준다. 공식 기준으로 확정하지 않는다.
// 직접 등록한 과제·분석 실패·과목/항목 없음을 서로 다른 상태로 보여준다 (빈 결과 ≠ 실패).
// AI가 평가 기준을 새로 만들지 않는다. AI 쉬운 설명(§14)은 Stage 3에서 연결한다.
// 학생 점검 체크는 이 화면에서만 쓰는 표시이며 저장되지 않는다 (계약에 저장 필드 없음).
export function CriteriaTab({ lookup, onUnavailable }: CriteriaTabProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const result = lookup.data

  const body = (() => {
    if (lookup.status === 'error' && lookup.error) {
      return <ErrorState title="평가 기준을 불러오지 못했어요" error={lookup.error} onRetry={lookup.retry} />
    }
    if (!result) return <LoadingRows rows={3} label="평가계획서에서 평가 기준을 찾는 중" />
    switch (result.kind) {
      case 'unlinked':
        return (
          <PanelMessage
            title="연결된 평가계획서 항목이 없어요"
            text="직접 등록한 수행평가예요. 학교 평가계획서 PDF를 가져와 이 과제와 같은 항목으로 등록하면 기준 후보를 볼 수 있어요. 선생님이 안내한 기준은 탐구 노트에 적어 두세요."
          />
        )
      case 'analysisUnavailable':
        return (
          <div className={styles.panelStack}>
            <PanelMessage
              title={result.status === 'FAILED' ? '평가계획서 분석에 실패했어요' : '평가계획서 분석이 아직 끝나지 않았어요'}
              text={`분석 상태: ${analysisStatusLabels[result.status]}. 평가 기준이 없는 것이 아니라 아직 읽지 못한 상태예요.`}
            />
            <button type="button" className={contextStyles.inlineAction} onClick={lookup.retry}>
              다시 확인
            </button>
          </div>
        )
      case 'subjectMissing':
        return (
          <PanelMessage
            title={result.extractionFailed ? '이 과목은 평가계획서에서 읽지 못했어요' : '평가계획서에서 이 과목을 찾지 못했어요'}
            text="과목 이름이 문서와 다르거나 추출에 실패했을 수 있어요. 학교 원본 평가계획서를 직접 확인해 주세요."
          />
        )
      case 'itemMissing':
        return (
          <PanelMessage
            title="연결된 수행평가 항목을 분석 결과에서 찾지 못했어요"
            text="문서가 바뀌었거나 항목 이름이 정정됐을 수 있어요. 학교 원본 평가계획서를 확인해 주세요."
          />
        )
      case 'found': {
        const { item, source, analysisStatus } = result
        const rubricKey = (index: number) => `${item.itemKey}:${index}`
        return (
          <div className={styles.panelStack}>
            <div className={contextStyles.candidateHead}>
              <span className={contextStyles.reviewBadge} data-status={analysisStatus}>
                {candidateStatusLabel(analysisStatus)}
              </span>
              <h3 className={contextStyles.candidateTitle}>{item.label ?? '항목 이름 원본에 없음'}</h3>
            </div>
            <dl className={contextStyles.factGrid}>
              <div>
                <dt>반영 비율</dt>
                <dd>{valueOrMissing(item.weightPercent, '%')}</dd>
              </div>
              <div>
                <dt>배점</dt>
                <dd>{valueOrMissing(item.maxScore, '점')}</dd>
              </div>
              <div>
                <dt>평가 시기</dt>
                <dd>{valueOrMissing(item.timing)}</dd>
              </div>
            </dl>

            <section aria-labelledby="criteria-rubric">
              <h4 id="criteria-rubric" className={contextStyles.subTitle}>
                채점 기준 후보
              </h4>
              {item.rubric.length > 0 ? (
                <ul className={contextStyles.rubricList}>
                  {item.rubric.map((line, index) => (
                    <li key={rubricKey(index)}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className={styles.panelEmptyText}>원본에서 채점 기준 문장을 찾지 못했어요. 선생님 안내를 확인해 주세요.</p>
              )}
            </section>

            <section aria-labelledby="criteria-source">
              <h4 id="criteria-source" className={contextStyles.subTitle}>
                원본 근거
              </h4>
              {source ? (
                <figure className={contextStyles.sourceQuote}>
                  <figcaption>{sourcePageLabel(source)}</figcaption>
                  <blockquote>{source.extractedText}</blockquote>
                </figure>
              ) : (
                <p className={styles.panelEmptyText}>근거 페이지 미확인 · 원본 PDF에서 직접 확인해 주세요.</p>
              )}
            </section>

            {item.rubric.length > 0 && (
              <section aria-labelledby="criteria-self" className={contextStyles.selfCheck}>
                <h4 id="criteria-self" className={contextStyles.subTitle}>
                  내 점검
                </h4>
                <p className={styles.panelEmptyText}>기준 후보를 보며 스스로 점검해요. 이 체크는 이 화면에서만 보이고 저장되지 않아요.</p>
                {item.rubric.map((line, index) => (
                  <label key={rubricKey(index)} className={contextStyles.checkRow}>
                    <input
                      type="checkbox"
                      checked={checked[rubricKey(index)] ?? false}
                      onChange={(event) => setChecked((previous) => ({ ...previous, [rubricKey(index)]: event.target.checked }))}
                    />
                    <span>{line}</span>
                  </label>
                ))}
              </section>
            )}
          </div>
        )
      }
    }
  })()

  return (
    <div className={styles.panelStack}>
      <p className={styles.infoBox}>
        <InfoIcon size={14} />
        평가계획서 분석 값은 확인이 필요한 후보예요. 학교·선생님 안내와 다르면 학교 안내를 따르세요. AI가 기준을 새로 만들지 않아요.
      </p>
      {body}
      <button
        type="button"
        className={styles.aiButton}
        aria-disabled="true"
        onClick={() => onUnavailable('AI 쉬운 설명은 공식 평가 기준이 연결되고 AI 기능이 준비된 뒤 제공돼요.')}
      >
        <SparkleIcon size={14} />
        AI 쉬운 설명
        <span className={styles.menuItemNote}>준비 중</span>
      </button>
    </div>
  )
}

function PanelMessage({ title, text }: { title: string; text: string }) {
  return (
    <div className={styles.panelEmpty}>
      <ClipboardIcon size={22} />
      <p className={styles.panelEmptyTitle}>{title}</p>
      <p className={styles.panelEmptyText}>{text}</p>
    </div>
  )
}
