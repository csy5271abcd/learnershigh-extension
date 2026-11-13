import { useSearchParams } from 'react-router'
import { EnrichmentFrame } from '../components/enrichment/EnrichmentFrame.tsx'
import styles from '../components/enrichment/enrichment.module.css'
import { EmptyState } from '../components/StateViews.tsx'
import { catalogSubjectLabels, getCatalogContent, listCatalogContent, type EnrichmentContentItem } from '../content/enrichmentContent.ts'

// 탐구 라이브러리 (screen-map S16, Mockup AE-LIST-01·03, assessment-enrichment-content.md §3 ST-16).
// 2026-11-11: 읽기 전용 정적 참고자료로 복구했다. dataSource(mock|http)와 무관하게 Frontend 정적 콘텐츠를 읽는다.
// "이 탐구 시작하기"·진행 상태 표시·즐겨찾기를 없앴다(학생 데이터가 생기지 않음, 명세 §3).
// 교과 필터는 학생 학업 정보(학기별 과목 ID)가 아니라 콘텐츠 자체의 교과 이름이다(http 학업 정보와 ID가 달라 맞지 않기 때문).
// 교과·검색·선택 카드는 URL(`subject`, `q`, `selected`)에 둔다.
export function EnrichmentLibraryRoute() {
  const [searchParams, setSearchParams] = useSearchParams()
  const subjectLabel = searchParams.get('subject') ?? undefined
  const query = searchParams.get('q') ?? ''
  const subjects = catalogSubjectLabels()
  const activeSubject = subjectLabel && subjects.includes(subjectLabel) ? subjectLabel : undefined
  const items = listCatalogContent({ subjectLabel: activeSubject, query })

  const selectedParam = searchParams.get('selected')
  // 선택이 없으면 첫 카드를 보여준다 (Mockup AE-LIST-01). 검색·필터로 사라진 카드는 선택하지 않는다.
  const selectedId = items.some((item) => item.catalogTaskId === selectedParam) ? selectedParam : items[0]?.catalogTaskId
  const selected = selectedId ? getCatalogContent(selectedId) : null
  const hasFilter = Boolean(query || activeSubject)

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

  return (
    <EnrichmentFrame
      panel={
        selected ? (
          <CatalogPreview key={selected.catalogTaskId} item={selected} />
        ) : (
          <div className={styles.previewEmpty}>
            <p>왼쪽에서 탐구 주제를 고르면 내용을 미리 볼 수 있어요.</p>
          </div>
        )
      }
    >
      <div className={styles.chips} role="group" aria-label="교과">
        <button type="button" className={styles.chip} aria-pressed={!activeSubject} onClick={() => updateParams({ subject: undefined, selected: undefined })}>
          전체 교과
        </button>
        {subjects.map((subject) => (
          <button
            key={subject}
            type="button"
            className={styles.chip}
            aria-pressed={activeSubject === subject}
            onClick={() => updateParams({ subject, selected: undefined })}
          >
            {subject}
          </button>
        ))}
      </div>

      <section aria-label="탐구 라이브러리 목록">
        {items.length === 0 ? (
          <div className={styles.stateArea}>
            <EmptyState
              title={hasFilter ? '조건에 맞는 탐구 주제가 없어요' : '아직 등록된 탐구 주제가 없어요'}
              description={hasFilter ? '검색어나 교과를 바꿔 보세요.' : undefined}
              action={
                hasFilter ? (
                  <button type="button" className={styles.outlineButton} onClick={() => updateParams({ q: undefined, subject: undefined, selected: undefined })}>
                    조건 초기화
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <ul className={styles.catalogList}>
            {items.map((item) => (
              <li key={item.catalogTaskId} className={styles.starRow}>
                <button
                  type="button"
                  className={styles.catalogRow}
                  aria-current={item.catalogTaskId === selectedId ? 'true' : undefined}
                  onClick={() => updateParams({ selected: item.catalogTaskId })}
                >
                  <span className={styles.rowText}>
                    <span className={styles.rowTitle}>{item.title}</span>
                    <span className={styles.rowMeta}>{item.subjectLabel}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className={styles.previewHint}>참고자료는 이 화면에서 읽기만 해요. 학생 기록으로 저장되지 않아요.</p>
    </EnrichmentFrame>
  )
}

// 선택 카드의 Preview (Mockup AE-LIST-01·03). 정적 콘텐츠라 Loading·Error가 없다.
function CatalogPreview({ item }: { item: EnrichmentContentItem }) {
  return (
    <article className={styles.preview} aria-label={`${item.title} 미리보기`}>
      <div className={styles.previewHead}>
        <h2 className={styles.previewTitle}>{item.title}</h2>
        <p className={styles.previewMeta}>{item.subjectLabel} · 심화 탐구 참고자료 (학교 수행평가 아님)</p>
      </div>

      <section className={styles.previewSection} aria-label="탐구 목표">
        <h3 className={styles.previewLabel}>탐구 목표</h3>
        <p className={styles.previewBody}>{item.goal}</p>
      </section>

      {item.methods.length > 0 && (
        <section className={styles.previewSection} aria-label="탐구 방법 예시">
          <h3 className={styles.previewLabel}>탐구 방법 예시</h3>
          <ul className={styles.bulletList}>
            {item.methods.map((method) => (
              <li key={method}>{method}</li>
            ))}
          </ul>
          <p className={styles.previewHint}>순서는 참고용이에요.</p>
        </section>
      )}

      <section className={styles.previewSection} aria-label="출처">
        <h3 className={styles.previewLabel}>출처</h3>
        <p className={styles.previewHint}>LearnersHigh가 작성한 학습용 예시예요. 확인된 외부 출처는 아직 연결되지 않았어요 (출처 확인 필요).</p>
      </section>
    </article>
  )
}
