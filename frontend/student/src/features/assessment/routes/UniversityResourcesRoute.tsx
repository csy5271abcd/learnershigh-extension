import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router'
import { listUniversityResources } from '../api/enrichmentApi.ts'
import { ChevronDownIcon, FileIcon, InfoIcon, LinkIcon } from '../components/AssessmentIcons.tsx'
import type { CreateEnrichmentPrefill } from '../components/enrichment/CreateEnrichmentModal.tsx'
import { EnrichmentFrame } from '../components/enrichment/EnrichmentFrame.tsx'
import styles from '../components/enrichment/enrichment.module.css'
import { MockDataNotice } from '../components/MockDataNotice.tsx'
import { EmptyState, ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { Toast, type ToastMessage } from '../components/Toast.tsx'
import { useApiQuery } from '../model/useApiQuery.ts'

const pageSize = 100

// 대학 공개 자료 (screen-map S20, Mockup AE-UNI-01, inquiry §9 ST-17, api-contract.md §27).
// 대학명은 고정 Enum이 아니라 응답에 있는 값으로 Chip을 만든다. 외부 사이트를 실시간 검색하지 않는다.
// 원본 링크는 확인된 공식 URL이 있을 때만 연다. 미리보기(원문 표시)는 이용 조건·저장소 결정 전이라 제공하지 않는다 (API-OD-A11).
// Mockup의 대학 공식 자료 페이지 카드·분야 필터는 §27 응답에 없어 표시하지 않는다 (MM-29).
export function UniversityResourcesRoute() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const yearParam = Number(searchParams.get('year')) || undefined
  const typeParam = searchParams.get('type') ?? ''
  const [openIdeas, setOpenIdeas] = useState<string>()
  const [createRequest, setCreateRequest] = useState<CreateEnrichmentPrefill | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const dismissToast = useCallback(() => setToast(null), [])
  const notify = (text: string) => setToast((previous) => ({ id: (previous?.id ?? 0) + 1, tone: 'info', text }))

  // 대학·학년도 선택지는 조건 없이 받은 목록에서 만든다 (숫자·이름을 화면에 고정하지 않는다).
  const all = useApiQuery('ae-uni-all', () => listUniversityResources({ page: 0, size: pageSize }))
  const universities = [...new Set(all.data?.items.map((item) => item.university) ?? [])]
  const universityParam = searchParams.get('university')
  const university = universityParam && universities.includes(universityParam) ? universityParam : universities[0]
  const years = [...new Set(all.data?.items.map((item) => item.academicYear) ?? [])].sort((a, b) => b - a)

  const resources = useApiQuery(`ae-uni|${university ?? ''}|${yearParam ?? ''}|${query}`, () =>
    university
      ? listUniversityResources({ university, academicYear: yearParam, query: query || undefined, page: 0, size: pageSize })
      : new Promise<never>(() => {}),
  )
  const items = resources.data?.items ?? []
  const types = [...new Set(items.map((item) => item.resourceType))]
  // 자료 유형은 §27 Query에 없어 받은 목록 안에서만 거른다 (화면 필터). 검색어는 §27 query로 보낸다.
  const visible = items.filter((item) => !typeParam || item.resourceType === typeParam)

  const updateParams = (changes: Record<string, string | undefined>) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        for (const [name, value] of Object.entries(changes)) {
          if (value) next.set(name, value)
          else next.delete(name)
        }
        return next
      },
      { replace: true, preventScrollReset: true },
    )

  const loading = !all.data || (university !== undefined && !resources.data)
  const error = all.status === 'error' ? all.error : resources.status === 'error' ? resources.error : undefined
  const retry = all.status === 'error' ? all.retry : resources.retry

  return (
    <EnrichmentFrame createRequest={createRequest} onCreateRequestHandled={() => setCreateRequest(null)}>
      <div className={styles.uniArea}>
        <div className={styles.infoBanner}>
          <InfoIcon size={15} />
          <p>
            대학이 공식 공개한 자료를 자율 심화 탐구의 참고자료로 살펴봐요. 면접 연습 기능은 없어요. 원문은 각 대학 공식 사이트에서 열리고,
            문서명·학년도·분류는 원본에서 꼭 확인해 주세요.
          </p>
        </div>

        {error ? (
          <div className={styles.stateArea}>
            <ErrorState title="대학 공개 자료를 불러오지 못했어요" error={error} onRetry={retry} />
          </div>
        ) : loading ? (
          <div className={styles.stateArea}>
            <LoadingRows rows={3} label="대학 공개 자료를 불러오는 중" />
          </div>
        ) : universities.length === 0 ? (
          <div className={styles.stateArea}>
            <EmptyState title="아직 공개된 대학 자료가 없어요" description="관리자가 확인한 공식 자료가 등록되면 여기에 보여요." />
          </div>
        ) : (
          <>
            <div className={styles.chips} role="group" aria-label="대학">
              {universities.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={styles.chip}
                  aria-pressed={name === university}
                  onClick={() => updateParams({ university: name, type: undefined })}
                >
                  {name}
                </button>
              ))}
            </div>

            <div className={styles.filterRow}>
              <span className={styles.selectWrap}>
                <label className="lh-visually-hidden" htmlFor="uni-year">
                  학년도
                </label>
                <select
                  id="uni-year"
                  className={styles.select}
                  value={yearParam ?? ''}
                  onChange={(event) => updateParams({ year: event.target.value || undefined })}
                >
                  <option value="">전체 학년도</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}학년도
                    </option>
                  ))}
                </select>
                <ChevronDownIcon size={14} className={styles.selectChevron} />
              </span>
              <div className={styles.textFilters} role="group" aria-label="자료 유형">
                <button type="button" className={styles.textFilter} aria-pressed={!typeParam} onClick={() => updateParams({ type: undefined })}>
                  전체
                </button>
                {types.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={styles.textFilter}
                    aria-pressed={typeParam === type}
                    onClick={() => updateParams({ type })}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {visible.length === 0 ? (
              <div className={styles.stateArea}>
                <EmptyState title="조건에 맞는 자료가 없어요" description="학년도나 자료 유형을 바꿔 보세요." />
              </div>
            ) : (
              <ul className={styles.resourceList} aria-label={`${university} 공개 자료`}>
                {visible.map((item) => {
                  const ideasOpen = openIdeas === item.resourceId
                  return (
                    <li key={item.resourceId} className={styles.resourceRow}>
                      <div className={styles.resourceMain}>
                        <span className={styles.fileIcon} aria-hidden="true">
                          <FileIcon size={15} />
                        </span>
                        <span className={styles.rowText}>
                          <span className={styles.rowTitle}>{item.title}</span>
                          <span className={styles.resourceMeta}>
                            <span className={styles.badge} data-tone="blue">
                              {item.resourceType}
                            </span>
                            {item.university} · {item.academicYear}학년도 ·{' '}
                            {item.officialUrl ? '공식 사이트에서 확인' : '확인된 원본 링크 없음 (시연 데이터)'}
                          </span>
                        </span>
                        <span className={styles.resourceActions}>
                          <button
                            type="button"
                            className={styles.outlineButton}
                            aria-disabled="true"
                            onClick={() => notify('미리보기는 자료 이용 조건과 파일 보관 방식이 정해진 뒤 제공돼요. 원문은 공식 사이트에서 확인해 주세요.')}
                          >
                            미리보기
                          </button>
                          {item.officialUrl ? (
                            <a className={styles.outlineButton} href={item.officialUrl} target="_blank" rel="noreferrer">
                              원본 열기
                              <LinkIcon size={12} />
                            </a>
                          ) : (
                            <button
                              type="button"
                              className={styles.outlineButton}
                              aria-disabled="true"
                              onClick={() => notify('확인된 공식 원본 링크가 없는 시연 자료예요.')}
                            >
                              원본 열기
                            </button>
                          )}
                          <button
                            type="button"
                            className={styles.outlineButton}
                            aria-expanded={ideasOpen}
                            aria-controls={`ideas-${item.resourceId}`}
                            onClick={() => setOpenIdeas(ideasOpen ? undefined : item.resourceId)}
                          >
                            탐구 아이디어
                            <ChevronDownIcon size={13} />
                          </button>
                        </span>
                      </div>
                      {ideasOpen && (
                        <div id={`ideas-${item.resourceId}`} className={styles.ideaBox}>
                          {item.relatedConcepts.length > 0 && (
                            <p>
                              <span className={styles.previewLabel}>관련 교과 개념 </span>
                              {item.relatedConcepts.join(', ')}
                            </p>
                          )}
                          <ul className={styles.bulletList}>
                            {item.inquiryIdeas.map((idea) => (
                              <li key={idea}>{idea}</li>
                            ))}
                          </ul>
                          <button
                            type="button"
                            className={styles.textLink}
                            onClick={() =>
                              setCreateRequest({
                                title: '',
                                goal: item.inquiryIdeas[0] ?? '',
                                sourceReference: { type: 'UNIVERSITY_RESOURCE', sourceId: item.resourceId },
                                sourceTitle: `${item.university} · ${item.title}`,
                              })
                            }
                          >
                            이 자료로 심화 탐구 시작
                          </button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}

        <div className={styles.notices}>
          <MockDataNotice />
        </div>
      </div>
      <Toast message={toast} onDismiss={dismissToast} />
    </EnrichmentFrame>
  )
}
