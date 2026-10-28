import { useCallback, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { listMockExamMaterials, listPersonalMockExamMaterials } from '../api/enrichmentApi.ts'
import type { MockExamMaterial, PersonalMockExamMaterial } from '../api/types.ts'
import { ScreenshotRegionsModal } from '../components/enrichment/ScreenshotRegionsModal.tsx'
import screenshotStyles from '../components/enrichment/screenshot.module.css'
import { ChevronDownIcon, InfoIcon, UploadIcon } from '../components/AssessmentIcons.tsx'
import type { CreateEnrichmentPrefill } from '../components/enrichment/CreateEnrichmentModal.tsx'
import { EnrichmentFrame } from '../components/enrichment/EnrichmentFrame.tsx'
import { MockExamResearchCard } from '../components/enrichment/MockExamResearchCard.tsx'
import mockStyles from '../components/enrichment/mockExam.module.css'
import styles from '../components/enrichment/enrichment.module.css'
import { PersonalMaterialModal } from '../components/enrichment/PersonalMaterialModal.tsx'
import { MockDataNotice } from '../components/MockDataNotice.tsx'
import { EmptyState, ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { Toast, type ToastMessage } from '../components/Toast.tsx'
import { useAssessmentWorkspace } from '../model/assessmentWorkspace.ts'
import { mockExamSourceLabel, mockExamSubjectName } from '../model/enrichmentView.ts'
import { useMaterialScreenshot } from '../model/mockExamScreenshotStore.ts'
import { useApiQuery } from '../model/useApiQuery.ts'
import { applyFilters, filterOptions, mockExamPageStep, mockExamSubjectTabs, type MockExamFilters } from '../model/mockExamResearchView.ts'

const pageSize = 100

// 모의고사 지문 (screen-map S19, Mockup AE-MOCK-01, inquiry §4 ST-07, api-contract.md §17).
// 문제 풀이·채점 기능이 아니라 탐구 소재 탐색이다. 2026-10-28부터 공개 추천 소재는 "모의고사 지문 기반 심화 탐구 60선"
// (영어 30·국어 30, references/mock-exam 원본)이다. 카드에는 원문 대신 출처·소재·추천 주제·계열만 보이고, 원문은 상세에서 보여준다.
// 과목은 §17 Query(subjectId), 검색은 §17 query, 학년·시행 시기·계열은 §17에 없어 받은 목록에서 화면이 거른다 (MM-57).
// 탐색 상태(과목·검색·학년·시기·계열·더 보기 수)는 URL에 두어 상세에 다녀와도 그대로다.
// 원문 재배포 권한은 확인되지 않았다 (로컬 Mock 시연, P-24). 내 지문 스크린샷·영역 표시는 이 화면에서만 보관한다.
export function MockExamMaterialsRoute() {
  const { dataVersion } = useAssessmentWorkspace()
  const [searchParams, setSearchParams] = useSearchParams()
  const subjectId = searchParams.get('subject') ?? undefined
  const query = searchParams.get('q') ?? ''
  const filters: MockExamFilters = {
    grade: searchParams.get('grade') ?? undefined,
    period: searchParams.get('period') ?? undefined,
    major: searchParams.get('major') ?? undefined,
  }
  const shown = Math.max(mockExamPageStep, Number(searchParams.get('show')) || mockExamPageStep)
  const [registering, setRegistering] = useState(false)
  const [regionTarget, setRegionTarget] = useState<{ materialId: string; label: string }>()
  const [createRequest, setCreateRequest] = useState<CreateEnrichmentPrefill | null>(null)
  const [mineVersion, setMineVersion] = useState(0)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const dismissToast = useCallback(() => setToast(null), [])

  const materials = useApiQuery(`ae-materials|${subjectId ?? ''}|${query}`, () =>
    listMockExamMaterials({ subjectId, query: query || undefined, page: 0, size: pageSize }),
  )
  // 과목 탭 건수: 검색 없이 전체를 받아 과목별로 센다 (숫자를 고정하지 않는다).
  const all = useApiQuery('ae-materials-all', () => listMockExamMaterials({ page: 0, size: pageSize }))
  const mine = useApiQuery(`ae-my-materials|${mineVersion}|${dataVersion}`, () => listPersonalMockExamMaterials())

  const updateParams = (changes: Record<string, string | undefined>) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        for (const [name, value] of Object.entries(changes)) {
          if (value) next.set(name, value)
          else next.delete(name)
        }
        // 조건이 바뀌면 처음 12개부터 다시 보여준다.
        if (!('show' in changes)) next.delete('show')
        return next
      },
      { replace: true, preventScrollReset: true },
    )

  const onRegistered = (material: PersonalMockExamMaterial, screenshot: 'image' | 'pdf' | undefined) => {
    setRegistering(false)
    setMineVersion((value) => value + 1)
    setToast((previous) => ({
      id: (previous?.id ?? 0) + 1,
      tone: 'success',
      text: `${mockExamSubjectName(material.subjectId)} 지문을 내 자료로 등록했어요.`,
    }))
    // 스크린샷 이미지를 붙였으면 바로 영역을 표시할 수 있게 연다.
    if (screenshot === 'image') {
      const subjectName = mockExamSubjectName(material.subjectId)
      setRegionTarget({ materialId: material.materialId, label: mockExamSourceLabel(material, subjectName) ?? subjectName })
    }
  }

  const received = materials.data?.items ?? []
  const options = filterOptions(received)
  const items = applyFilters(received, filters)
  const visible = items.slice(0, shown)
  const hasFilter = Boolean(query || filters.grade || filters.period || filters.major)
  const countFor = (id: string | undefined) => (all.data ? all.data.items.filter((item) => !id || item.subjectId === id).length : undefined)
  const startTask = (item: MockExamMaterial) =>
    setCreateRequest({
      title: item.idea.topicTitle,
      goal: item.idea.goal,
      sourceReference: { type: 'MOCK_EXAM_MATERIAL', sourceId: item.materialId },
      sourceTitle: `${item.materialId} ${item.idea.coreMaterial}`,
    })

  return (
    <EnrichmentFrame createRequest={createRequest} onCreateRequestHandled={() => setCreateRequest(null)}>
      <header className={mockStyles.hero}>
        <div>
          <h2 className={mockStyles.heroTitle}>모의고사 지문으로 심화 탐구하기</h2>
          <p className={mockStyles.heroText}>실제 기출 지문의 소재를 교과 탐구로 확장해 보세요. 영어 30개·국어 30개 지문에 탐구 주제와 방법을 붙여 두었어요.</p>
        </div>
        <button type="button" className={styles.outlineButton} onClick={() => setRegistering(true)}>
          <UploadIcon size={14} />내 지문 등록
        </button>
      </header>

      <div className={mockStyles.subjectTabs} role="group" aria-label="과목">
        {mockExamSubjectTabs.map((tab) => (
          <button
            key={tab.label}
            type="button"
            className={mockStyles.subjectTab}
            aria-pressed={subjectId === tab.subjectId}
            onClick={() => updateParams({ subject: tab.subjectId })}
          >
            {tab.label}
            <span className={mockStyles.subjectCount}>{countFor(tab.subjectId) ?? '–'}</span>
          </button>
        ))}
      </div>

      <div className={mockStyles.filterRow}>
        <FilterSelect label="학년" value={filters.grade} placeholder="학년 전체" options={options.grades.map((o) => ({ value: o.key, label: `${o.label} (${o.count})` }))} onChange={(value) => updateParams({ grade: value })} />
        <FilterSelect label="시행 시기" value={filters.period} placeholder="시행 시기 전체" options={options.periods.map((o) => ({ value: o.key, label: `${o.label} (${o.count})` }))} onChange={(value) => updateParams({ period: value })} />
        <FilterSelect label="추천 계열·학과" value={filters.major} placeholder="계열·학과 전체" options={options.majors.map((o) => ({ value: o.key, label: `${o.key} (${o.count})` }))} onChange={(value) => updateParams({ major: value })} />
        {hasFilter && (
          <button type="button" className={mockStyles.resetButton} onClick={() => updateParams({ q: undefined, grade: undefined, period: undefined, major: undefined })}>
            필터 초기화
          </button>
        )}
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
              title={hasFilter || subjectId ? '조건에 맞는 탐구 소재가 없어요' : '아직 공개된 탐구 소재가 없어요'}
              description={hasFilter ? '검색어나 필터를 바꾸거나 초기화해 보세요.' : "공부하며 본 지문이 있다면 '내 지문 등록'으로 출처를 남겨 두세요."}
            />
          </div>
        ) : (
          <>
            <p className={mockStyles.resultCount} role="status">
              {items.length}개 소재{items.length > visible.length ? ` 중 ${visible.length}개 표시` : ''}
            </p>
            <ul className={mockStyles.cardGrid}>
              {visible.map((item) => (
                <li key={item.materialId}>
                  <MockExamResearchCard item={item} onStart={() => startTask(item)} />
                </li>
              ))}
            </ul>
            {items.length > visible.length && (
              <button type="button" className={mockStyles.moreButton} onClick={() => updateParams({ show: String(shown + mockExamPageStep) })}>
                더 보기 ({visible.length}/{items.length})
              </button>
            )}
          </>
        )}
        <p className={mockStyles.rightsNote}>
          <InfoIcon size={13} />
          지문은 시험 자료에서 발췌한 원문이고, 추천 계열·주제·해설·방법·질문은 LearnersHigh가 만든 학습용 제안이에요 (출제기관 공식 해설 아님). 원문 공개 배포 권한은 아직 확인 전이에요.
        </p>
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
                <MyMaterialRow key={material.materialId} materialId={material.materialId} label={label} onOpenRegions={() => setRegionTarget({ materialId: material.materialId, label })}>
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
                </MyMaterialRow>
              )
            })}
          </ul>
        )}
      </section>

      <div className={styles.notices}>
        <MockDataNotice />
      </div>

      {registering && <PersonalMaterialModal onClose={() => setRegistering(false)} onCreated={onRegistered} />}
      {regionTarget && (
        <ScreenshotRegionsModal
          materialId={regionTarget.materialId}
          materialLabel={regionTarget.label}
          onClose={() => setRegionTarget(undefined)}
          onStartTask={(region, index) => {
            setRegionTarget(undefined)
            // 영역 좌표는 §18 sourceReference에 담을 필드가 없어 넘기지 않는다 (P-22). 학생이 적은 질문·개념만 목표 초안으로 쓴다.
            setCreateRequest({
              title: '',
              goal: [region.question.trim(), region.concept.trim() && `핵심 개념: ${region.concept.trim()}`].filter(Boolean).join('\n'),
              sourceReference: { type: 'PERSONAL_MOCK_EXAM_MATERIAL', sourceId: regionTarget.materialId },
              sourceTitle: `${regionTarget.label} · 영역 ${index + 1}`,
            })
          }}
        />
      )}
      <Toast message={toast} onDismiss={dismissToast} />
    </EnrichmentFrame>
  )
}

/** 내 지문 행: 이 화면에서만 붙인 스크린샷이 있으면 영역 수를 함께 보여준다 */
function MyMaterialRow({ materialId, label, onOpenRegions, children }: { materialId: string; label: string; onOpenRegions: () => void; children: ReactNode }) {
  const screenshot = useMaterialScreenshot(materialId)
  return (
    <li className={styles.resourceRow}>
      {children}
      <div className={screenshotStyles.topicActions}>
        <button type="button" className={styles.outlineButton} aria-label={`${label} 스크린샷 영역 표시`} onClick={onOpenRegions}>
          {screenshot ? `스크린샷 · 영역 ${screenshot.regions.length}개` : '스크린샷 올리기'}
        </button>
        {screenshot && <span className={styles.previewHint}>이 화면에서만 보관 · 새로고침하면 사라져요</span>}
      </div>
    </li>
  )
}

function FilterSelect({ label, value, placeholder, options, onChange }: { label: string; value: string | undefined; placeholder: string; options: { value: string; label: string }[]; onChange: (value: string | undefined) => void }) {
  return (
    <span className={mockStyles.filterSelect}>
      <select aria-label={label} value={value ?? ''} onChange={(event) => onChange(event.target.value || undefined)}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon size={14} className={mockStyles.selectChevron} />
    </span>
  )
}
