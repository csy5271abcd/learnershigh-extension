import { useCallback, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { listMockExamMaterials, listPersonalMockExamMaterials } from '../api/enrichmentApi.ts'
import type { PersonalMockExamMaterial } from '../api/types.ts'
import { InfoIcon, UploadIcon } from '../components/AssessmentIcons.tsx'
import type { CreateEnrichmentPrefill } from '../components/enrichment/CreateEnrichmentModal.tsx'
import { EnrichmentFrame } from '../components/enrichment/EnrichmentFrame.tsx'
import styles from '../components/enrichment/enrichment.module.css'
import { PersonalMaterialModal } from '../components/enrichment/PersonalMaterialModal.tsx'
import { MockDataNotice } from '../components/MockDataNotice.tsx'
import { EmptyState, ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { Toast, type ToastMessage } from '../components/Toast.tsx'
import { useAssessmentWorkspace } from '../model/assessmentWorkspace.ts'
import { mockExamSourceLabel, mockExamSubjectName, mockExamSubjects } from '../model/enrichmentView.ts'
import { useApiQuery } from '../model/useApiQuery.ts'
import { mockExamMaterialDetailPath } from './paths.ts'

const pageSize = 50

// 모의고사 지문 (screen-map S19, Mockup AE-MOCK-01, inquiry §4 ST-07, api-contract.md §17).
// 문제 풀이·채점 기능이 아니라 탐구 소재 탐색이다. 지문 원문은 싣지 않고, LearnersHigh가 정리한 소재·아이디어만 보인다.
// Mockup의 계열 필터(인문·사회/자연과학/공학)와 즐겨찾기는 §17에 없어 표시하지 않는다 (MM-28).
export function MockExamMaterialsRoute() {
  const { dataVersion } = useAssessmentWorkspace()
  const [searchParams, setSearchParams] = useSearchParams()
  const subjectId = searchParams.get('subject') ?? undefined
  const query = searchParams.get('q') ?? ''
  const [registering, setRegistering] = useState(false)
  const [createRequest, setCreateRequest] = useState<CreateEnrichmentPrefill | null>(null)
  const [mineVersion, setMineVersion] = useState(0)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const dismissToast = useCallback(() => setToast(null), [])

  const materials = useApiQuery(`ae-materials|${subjectId ?? ''}|${query}`, () =>
    listMockExamMaterials({ subjectId, query: query || undefined, page: 0, size: pageSize }),
  )
  const mine = useApiQuery(`ae-my-materials|${mineVersion}|${dataVersion}`, () => listPersonalMockExamMaterials())

  const selectSubject = (value: string | undefined) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (value) next.set('subject', value)
        else next.delete('subject')
        return next
      },
      { replace: true, preventScrollReset: true },
    )

  const onRegistered = (material: PersonalMockExamMaterial) => {
    setRegistering(false)
    setMineVersion((value) => value + 1)
    setToast((previous) => ({
      id: (previous?.id ?? 0) + 1,
      tone: 'success',
      text: `${mockExamSubjectName(material.subjectId)} 지문을 내 자료로 등록했어요.`,
    }))
  }

  const items = materials.data?.items ?? []

  return (
    <EnrichmentFrame createRequest={createRequest} onCreateRequestHandled={() => setCreateRequest(null)}>
      <div className={styles.infoBanner}>
        <InfoIcon size={15} />
        <p>모의고사 지문에 나온 소재를 수행평가·심화 탐구 주제로 넓혀 보는 곳이에요. 문제 풀이 기능은 없고, 지문 원문은 싣지 않아요.</p>
        <button type="button" className={styles.outlineButton} onClick={() => setRegistering(true)}>
          <UploadIcon size={14} />내 지문 등록
        </button>
      </div>

      <div className={styles.chips} role="group" aria-label="과목">
        <button type="button" className={styles.chip} aria-pressed={!subjectId} onClick={() => selectSubject(undefined)}>
          전체
        </button>
        {mockExamSubjects.map((subject) => (
          <button
            key={subject.subjectId}
            type="button"
            className={styles.chip}
            aria-pressed={subjectId === subject.subjectId}
            onClick={() => selectSubject(subject.subjectId)}
          >
            {subject.name}
          </button>
        ))}
      </div>

      <section aria-label="모의고사 탐구 소재 목록" aria-busy={materials.isRefreshing}>
        {materials.status === 'error' && materials.error ? (
          <div className={styles.stateArea}>
            <ErrorState title="탐구 소재를 불러오지 못했어요" error={materials.error} onRetry={materials.retry} />
          </div>
        ) : !materials.data ? (
          <div className={styles.stateArea}>
            <LoadingRows rows={3} label="탐구 소재를 불러오는 중" />
          </div>
        ) : items.length === 0 ? (
          <div className={styles.stateArea}>
            <EmptyState
              title={query || subjectId ? '조건에 맞는 탐구 소재가 없어요' : '아직 공개된 탐구 소재가 없어요'}
              description="공부하며 본 지문이 있다면 '내 지문 등록'으로 출처를 남겨 두세요."
            />
          </div>
        ) : (
          <ul className={styles.cardGrid}>
            {items.map((item) => {
              const subjectName = mockExamSubjectName(item.subjectId)
              return (
                <li key={item.materialId} className={styles.card}>
                  <span className={styles.subjectTag}>{subjectName}</span>
                  <span className={styles.cardSource}>
                    {mockExamSourceLabel(item.source, subjectName) ?? 'LearnersHigh 자체 제작 시연용 주제'}
                  </span>
                  <h2 className={styles.cardTitle}>{item.idea.topicTitle}</h2>
                  <p className={styles.cardText}>{item.idea.coreMaterial}</p>
                  <p className={styles.cardFields}>{item.idea.relatedFields.join(' · ')}</p>
                  <Link to={mockExamMaterialDetailPath(item.materialId)} className={styles.textLink}>
                    자세히 보기
                    <span className="lh-visually-hidden">: {item.idea.topicTitle}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="my-materials-heading">
        <h2 id="my-materials-heading" className={styles.sectionHeading}>
          내가 등록한 지문
        </h2>
        {mine.status === 'error' && mine.error ? (
          <div className={styles.stateArea}>
            <ErrorState title="내 지문을 불러오지 못했어요" error={mine.error} onRetry={mine.retry} />
          </div>
        ) : !mine.data ? (
          <div className={styles.stateArea}>
            <LoadingRows rows={1} label="내 지문을 불러오는 중" />
          </div>
        ) : mine.data.items.length === 0 ? (
          <p className={styles.previewHint}>아직 등록한 지문이 없어요. 등록한 지문은 나만 볼 수 있어요.</p>
        ) : (
          <ul className={styles.resourceList}>
            {mine.data.items.map((material) => {
              const subjectName = mockExamSubjectName(material.subjectId)
              const label = mockExamSourceLabel(material, subjectName) ?? subjectName
              return (
                <li key={material.materialId} className={styles.resourceRow}>
                  <div className={styles.resourceMain}>
                    <span className={styles.rowText}>
                      <span className={styles.rowTitle}>{label}</span>
                      <span className={styles.resourceMeta}>
                        <span>{material.personalNote ?? '메모 없음'}</span>
                        <span>· 직접 입력한 링크 (열리는지 확인하지 않았어요)</span>
                      </span>
                    </span>
                    <span className={styles.resourceActions}>
                      <button
                        type="button"
                        className={styles.outlineButton}
                        onClick={() =>
                          setCreateRequest({
                            title: '',
                            goal: material.personalNote ?? '',
                            sourceReference: { type: 'PERSONAL_MOCK_EXAM_MATERIAL', sourceId: material.materialId },
                            sourceTitle: label,
                          })
                        }
                      >
                        이 지문으로 탐구 시작
                      </button>
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <div className={styles.notices}>
        <MockDataNotice />
      </div>

      {registering && <PersonalMaterialModal onClose={() => setRegistering(false)} onCreated={onRegistered} />}
      <Toast message={toast} onDismiss={dismissToast} />
    </EnrichmentFrame>
  )
}
