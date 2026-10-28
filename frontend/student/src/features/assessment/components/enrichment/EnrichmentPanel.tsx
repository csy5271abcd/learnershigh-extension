import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { getCatalogItem } from '../../api/enrichmentApi.ts'
import type { EnrichmentTask } from '../../api/types.ts'
import { sourceTypeLabels } from '../../model/enrichmentView.ts'
import { useApiQuery } from '../../model/useApiQuery.ts'
import { mockExamMaterialDetailPath } from '../../routes/paths.ts'
import { InfoIcon } from '../AssessmentIcons.tsx'
import detailStyles from '../detail/detail.module.css'
import { AiAssistantTab } from '../detail/DetailPanel.tsx'
import { LoadingRows } from '../StateViews.tsx'
import { TaskExamSource } from '../university/TaskExamSource.tsx'
import styles from './enrichment.module.css'

export type EnrichmentPanelTab = 'selfCheck' | 'ai' | 'resources'

const tabs: { id: EnrichmentPanelTab; label: string }[] = [
  { id: 'selfCheck', label: '자기 점검' },
  { id: 'ai', label: 'AI 도우미' },
  { id: 'resources', label: '자료' },
]

interface EnrichmentPanelProps {
  task: EnrichmentTask
  hasNote: boolean
  activeTab: EnrichmentPanelTab
  onTabChange: (tab: EnrichmentPanelTab) => void
  /** 과목 추천 자료원·내 자료 (ResourcesTab, AUD-016) */
  resourcesContent: ReactNode
}

// 심화 탐구 상세 오른쪽 패널 (Mockup AE-DETAIL-01~03): 자기 점검 / AI 도우미 / 자료.
// AI 도우미(Stage 3 준비 중)·자료 탭은 학교 수행평가 상세와 같은 화면을 쓴다.
export function EnrichmentPanel({ task, hasNote, activeTab, onTabChange, resourcesContent }: EnrichmentPanelProps) {
  const baseId = useId()
  const tabRefs = useRef<Record<EnrichmentPanelTab, HTMLButtonElement | null>>({ selfCheck: null, ai: null, resources: null })

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((tab) => tab.id === activeTab)
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % tabs.length
        : event.key === 'ArrowLeft'
          ? (index - 1 + tabs.length) % tabs.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? tabs.length - 1
              : -1
    if (next < 0) return
    event.preventDefault()
    onTabChange(tabs[next].id)
    tabRefs.current[tabs[next].id]?.focus()
  }

  return (
    <aside className={detailStyles.panel} aria-label="심화 탐구 도구">
      <div className={detailStyles.panelTabs} role="tablist" aria-label="심화 탐구 도구" onKeyDown={onKeyDown}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(element) => {
              tabRefs.current[tab.id] = element
            }}
            type="button"
            role="tab"
            id={`${baseId}-${tab.id}-tab`}
            aria-selected={activeTab === tab.id}
            aria-controls={`${baseId}-${tab.id}-panel`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            className={detailStyles.panelTab}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        className={detailStyles.panelBody}
        role="tabpanel"
        id={`${baseId}-${activeTab}-panel`}
        aria-labelledby={`${baseId}-${activeTab}-tab`}
        tabIndex={0}
      >
        {activeTab === 'selfCheck' && <SelfCheckTab task={task} />}
        {activeTab === 'ai' && <AiAssistantTab assessmentTitle={task.title} hasNote={hasNote} />}
        {activeTab === 'resources' && resourcesContent}
      </div>
    </aside>
  )
}

// 자기 점검 (Mockup AE-DETAIL-01). 공개 콘텐츠에서 시작했으면 그 콘텐츠의 수행 안내(§16 methods)를 참고로 보여준다.
// 원본이 비공개·삭제되어도 학생 Task와 노트는 그대로이며, 원본 내용만 볼 수 없다고 안내한다 (§18).
// Mockup의 문제 상황·예상 결과물·자기 점검 체크박스는 §16에 없고 체크 결과를 저장할 계약도 없어 표시하지 않는다 (MM-26).
function SelfCheckTab({ task }: { task: EnrichmentTask }) {
  const catalog = useApiQuery(task.catalogTaskId ? `ae-catalog-item|${task.catalogTaskId}` : 'ae-catalog-item|none', () =>
    task.catalogTaskId ? getCatalogItem(task.catalogTaskId) : Promise.resolve(null),
  )
  const item = catalog.data && catalog.data.catalogTaskId === task.catalogTaskId ? catalog.data : undefined
  const source = task.sourceReference

  return (
    <div className={detailStyles.panelStack}>
      <p className={styles.previewHint}>
        자율 심화 탐구예요. 정해진 순서 없이 자료 조사부터 해도, 결과물을 먼저 써도 괜찮아요.
      </p>

      {source && (
        <section className={styles.previewSection} aria-label="출발 자료">
          <h3 className={styles.previewLabel}>출발 자료</h3>
          <p className={styles.previewBody}>
            {sourceTypeLabels[source.type]}
            {source.type === 'MOCK_EXAM_MATERIAL' && (
              <>
                {' · '}
                <Link to={mockExamMaterialDetailPath(source.sourceId)}>소재 다시 보기</Link>
              </>
            )}
          </p>
          {source.type === 'UNIVERSITY_RESOURCE' && <TaskExamSource taskId={task.taskId} source={source} />}
          <p className={styles.previewHint}>출처만 연결돼 있고 원문은 복사하지 않았어요. (출처 연결 계약 확정 전 시연)</p>
        </section>
      )}

      {task.catalogTaskId && catalog.status === 'loading' && <LoadingRows rows={2} label="수행 안내를 불러오는 중" />}
      {task.catalogTaskId && catalog.status === 'error' && (
        <p className={detailStyles.infoBox}>
          <InfoIcon size={14} />
          {catalog.error?.code === 'ENRICHMENT_CATALOG_NOT_FOUND'
            ? '시작할 때 참고한 공개 탐구가 지금은 공개되지 않아요. 내 탐구 기록과 노트는 그대로 남아 있어요.'
            : '참고한 공개 탐구의 수행 안내를 불러오지 못했어요.'}
          {catalog.error?.code !== 'ENRICHMENT_CATALOG_NOT_FOUND' && (
            <button type="button" className={styles.textLink} onClick={catalog.retry}>
              다시 시도
            </button>
          )}
        </p>
      )}
      {item && item.methods.length > 0 && (
        <section className={styles.previewSection} aria-label="수행 안내">
          <h3 className={styles.previewLabel}>수행 안내</h3>
          <ul className={styles.bulletList}>
            {item.methods.map((method) => (
              <li key={method}>{method}</li>
            ))}
          </ul>
          <p className={styles.previewHint}>탐구 라이브러리에서 시작할 때의 안내예요. 순서는 참고용이에요.</p>
        </section>
      )}
      {!task.catalogTaskId && !source && (
        <p className={styles.previewHint}>직접 만든 탐구라 정해진 수행 안내가 없어요. 노트에 나만의 계획을 적어 보세요.</p>
      )}
    </div>
  )
}
