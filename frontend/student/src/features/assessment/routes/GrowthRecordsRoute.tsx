import { useCallback, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { listGrowthRecords } from '../api/growthArchiveApi.ts'
import type { GrowthRecord } from '../api/types.ts'
import { DownloadIcon, LinkIcon, LockIcon, PlusIcon } from '../components/AssessmentIcons.tsx'
import enrichmentStyles from '../components/enrichment/enrichment.module.css'
import styles from '../components/growth/growthArchive.module.css'
import { MockDataNotice } from '../components/MockDataNotice.tsx'
import { EmptyState, ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { Toast, type ToastMessage } from '../components/Toast.tsx'
import { useAssessmentWorkspace } from '../model/assessmentWorkspace.ts'
import { growthCardFields, growthTextFields, groupGrowthRecordsByTerm, relatedSourceLabels, subjectNameIn } from '../model/growthArchiveView.ts'
import { useApiQuery } from '../model/useApiQuery.ts'
import { growthRecordDetailPath, growthRecordNewPath, relatedSourcePath } from './paths.ts'

const pageSize = 100

// 성장 기록 목록 (screen-map S22, Mockup GR-LIST-01, api-contract.md §29).
// 학생이 직접 쓰는 개인 기록이다. 학교생활기록부·세특 문장이 아니며 AI로 만들지 않는다.
// Mockup 카드 오른쪽 "선생님 피드백 1건/탐구 노트 1개"는 §29 응답에 건수가 없어 관련 활동 링크로 대신한다 (MM-37).
// "성장 기록 쓰기"는 Mockup에 없지만 §29 POST 진입점이 필요해 "내보내기" 옆에 둔다 (quality 기록).
export function GrowthRecordsRoute() {
  const { terms, dataVersion } = useAssessmentWorkspace()
  const [searchParams, setSearchParams] = useSearchParams()
  const subjectId = searchParams.get('subject') ?? ''
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const dismissToast = useCallback(() => setToast(null), [])

  const records = useApiQuery(`gr-list|${dataVersion}`, () => listGrowthRecords({ page: 0, size: pageSize }))
  const contexts = terms.data?.contexts ?? []
  const all = records.data?.items ?? []
  const subjectIds = [...new Set(all.map((record) => record.subjectId).filter((id): id is string => Boolean(id)))]
  const visible = subjectId ? all.filter((record) => record.subjectId === subjectId) : all
  const groups = groupGrowthRecordsByTerm(visible, contexts)

  const selectSubject = (next: string) =>
    setSearchParams(next ? { subject: next } : {}, { replace: true, preventScrollReset: true })

  return (
    <main className={enrichmentStyles.page}>
      <div className={enrichmentStyles.mainArea}>
        <div className={enrichmentStyles.toolbar}>
          <div className={styles.toolbarEnd}>
            <Link to={growthRecordNewPath()} className={enrichmentStyles.primaryButton}>
              <PlusIcon size={15} />
              성장 기록 쓰기
            </Link>
            <button
              type="button"
              className={enrichmentStyles.outlineButton}
              aria-disabled="true"
              onClick={() =>
                setToast((previous) => ({ id: (previous?.id ?? 0) + 1, tone: 'info', text: '성장 기록 내보내기는 형식이 정해지지 않아 아직 지원하지 않아요.' }))
              }
            >
              <DownloadIcon size={15} />
              내보내기
            </button>
          </div>
        </div>

        <div className={`${enrichmentStyles.content} ${styles.growthArea}`}>
          <header className={enrichmentStyles.header}>
            <h1 className={enrichmentStyles.title}>성장 기록</h1>
            <p className={enrichmentStyles.subtitle}>학교 과제와 심화 탐구에서 내가 직접 한 일과 배운 점을 남겨요.</p>
          </header>

          <p className={styles.privacyBox}>
            <LockIcon size={15} />
            <span>
              나만 보는 개인 기록이에요. 학교생활기록부에 선생님이 작성하는 세부능력 및 특기사항(세특)과는 별개이고, 자동으로 세특을 만들어 주지 않아요.
            </span>
          </p>

          <div className={enrichmentStyles.chips} role="group" aria-label="과목">
            <button type="button" className={enrichmentStyles.chip} aria-pressed={!subjectId} onClick={() => selectSubject('')}>
              전체
            </button>
            {subjectIds.map((id) => (
              <button key={id} type="button" className={enrichmentStyles.chip} aria-pressed={subjectId === id} onClick={() => selectSubject(id)}>
                {subjectNameIn(contexts, id) ?? '알 수 없는 과목'}
              </button>
            ))}
          </div>

          <section aria-label="성장 기록 목록" aria-busy={records.isRefreshing}>
            {records.status === 'error' && records.error ? (
              <div className={enrichmentStyles.stateArea}>
                <ErrorState title="성장 기록을 불러오지 못했어요" error={records.error} onRetry={records.retry} />
              </div>
            ) : !records.data || (!terms.data && terms.status === 'loading') ? (
              <div className={enrichmentStyles.stateArea}>
                <LoadingRows rows={3} label="성장 기록을 불러오는 중" />
              </div>
            ) : visible.length === 0 ? (
              <div className={enrichmentStyles.stateArea}>
                {subjectId ? (
                  <EmptyState
                    title="이 과목의 성장 기록이 없어요"
                    action={
                      <button type="button" className={enrichmentStyles.outlineButton} onClick={() => selectSubject('')}>
                        전체 보기
                      </button>
                    }
                  />
                ) : (
                  <EmptyState
                    title="아직 남긴 성장 기록이 없어요"
                    description="과제나 탐구를 마친 뒤 내가 맡은 역할, 해결한 문제, 배운 점을 짧게 남겨 보세요."
                    action={
                      <Link to={growthRecordNewPath()} className={enrichmentStyles.outlineButton}>
                        성장 기록 쓰기
                      </Link>
                    }
                  />
                )}
              </div>
            ) : (
              groups.map((group) => (
                <section key={group.key} className={styles.termGroup} aria-labelledby={`growth-term-${group.key}`}>
                  <h2 id={`growth-term-${group.key}`} className={styles.termHeading}>
                    {group.label}
                  </h2>
                  <ul className={styles.cardList}>
                    {group.records.map((record) => (
                      <GrowthCard key={record.recordId} record={record} subjectName={subjectNameIn(contexts, record.subjectId)} />
                    ))}
                  </ul>
                </section>
              ))
            )}
          </section>

          <div className={enrichmentStyles.notices}>
            <MockDataNotice />
          </div>
        </div>
      </div>
      <Toast message={toast} onDismiss={dismissToast} />
    </main>
  )
}

function GrowthCard({ record, subjectName }: { record: GrowthRecord; subjectName: string | null }) {
  const related = relatedSourcePath(record)
  return (
    <li className={styles.card}>
      <div className={styles.cardTop}>
        <span className={styles.sourceBadge}>{record.relatedSourceType ? relatedSourceLabels[record.relatedSourceType] : '개인 활동'}</span>
        {subjectName && <span className={styles.subjectText}>{subjectName}</span>}
        {related && (
          <Link to={related} className={styles.relatedLink}>
            <LinkIcon size={12} />
            관련 활동 보기
          </Link>
        )}
      </div>
      <Link to={growthRecordDetailPath(record.recordId)} className={styles.cardTitle}>
        {record.title}
      </Link>
      <dl className={styles.fieldList}>
        {growthTextFields
          .filter((item) => (growthCardFields as string[]).includes(item.field) && record[item.field])
          .map((item) => (
            <div key={item.field} className={styles.fieldRow}>
              <dt>{item.label}</dt>
              <dd>{record[item.field]}</dd>
            </div>
          ))}
      </dl>
    </li>
  )
}
