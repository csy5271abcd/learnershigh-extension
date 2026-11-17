import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { ClipboardIcon, InfoIcon, NoteIcon, SendIcon } from '../AssessmentIcons.tsx'
import styles from './detail.module.css'

export type DetailPanelTab = 'criteria' | 'ai' | 'feedback' | 'resources'

const tabs: { id: DetailPanelTab; label: string }[] = [
  { id: 'criteria', label: '평가 기준' },
  { id: 'ai', label: 'AI 도우미' },
  { id: 'feedback', label: '피드백' },
  { id: 'resources', label: '자료' },
]

interface DetailPanelProps {
  activeTab: DetailPanelTab
  onTabChange: (tab: DetailPanelTab) => void
  assessmentTitle: string
  hasNote: boolean
  /** 평가 기준 후보 (CriteriaTab, AUD-015) */
  criteriaContent: ReactNode
  feedbackContent: ReactNode
  /** 과목 추천 자료원·내 자료 (ResourcesTab, AUD-016) */
  resourcesContent: ReactNode
}

// 오른쪽 상세 패널 (Mockup SA-DETAIL-01·08~11): 평가 기준 / AI 도우미 / 피드백 / 자료 탭.
export function DetailPanel({ activeTab, onTabChange, assessmentTitle, hasNote, criteriaContent, feedbackContent, resourcesContent }: DetailPanelProps) {
  const baseId = useId()
  const tabRefs = useRef<Record<DetailPanelTab, HTMLButtonElement | null>>({
    criteria: null,
    ai: null,
    feedback: null,
    resources: null,
  })

  // WAI-ARIA Tabs: 좌우 화살표·Home·End로 이동
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
    <aside className={styles.panel} aria-label="수행평가 도구">
      <div className={styles.panelTabs} role="tablist" aria-label="수행평가 도구" onKeyDown={onKeyDown}>
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
            className={styles.panelTab}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        className={styles.panelBody}
        role="tabpanel"
        id={`${baseId}-${activeTab}-panel`}
        aria-labelledby={`${baseId}-${activeTab}-tab`}
        tabIndex={0}
      >
        {activeTab === 'criteria' && criteriaContent}
        {activeTab === 'ai' && <AiAssistantTab assessmentTitle={assessmentTitle} hasNote={hasNote} />}
        {activeTab === 'feedback' && feedbackContent}
        {activeTab === 'resources' && resourcesContent}
      </div>
    </aside>
  )
}

const suggestedQuestions = [
  '이 수행평가의 평가 기준을 쉽게 설명해줘.',
  '이 자료의 핵심 내용을 알려줘.',
  '탐구 주제를 더 확장하려면 어떤 내용을 조사하면 좋을까?',
  '내 주장에 근거가 충분한지 확인해줘.',
]

// AI 도우미 (Mockup SA-DETAIL-09, api-contract.md §28). AI 호출은 Stage 3 범위라 질문을 보내지 않는다.
export function AiAssistantTab({ assessmentTitle, hasNote }: { assessmentTitle: string; hasNote: boolean }) {
  return (
    <div className={styles.aiTab}>
      <div className={styles.contextChips}>
        <span className={styles.contextLabel}>참고 중</span>
        <span className={styles.contextChip}>
          <ClipboardIcon size={12} />
          {assessmentTitle}
        </span>
        {hasNote && (
          <span className={styles.contextChip}>
            <NoteIcon size={12} />내 노트
          </span>
        )}
      </div>
      <p className={styles.infoBox}>
        <InfoIcon size={14} />
        AI 도우미는 아직 연결되지 않았어요. 연결되면 이 과제와 내 노트를 바탕으로 이해를 도와줘요.
      </p>
      <div>
        <h3 className={styles.aiHeading}>무엇이 궁금한가요?</h3>
        <p className={styles.panelEmptyText}>이 과제와 내 노트를 바탕으로 이해를 도와줄게요.</p>
      </div>
      <ul className={styles.questionList}>
        {suggestedQuestions.map((question) => (
          <li key={question}>
            <button type="button" className={styles.questionButton} disabled>
              {question}
            </button>
          </li>
        ))}
      </ul>
      <div className={styles.aiComposer}>
        <label className="lh-visually-hidden" htmlFor="ai-question">
          AI 도우미에게 질문
        </label>
        <input id="ai-question" placeholder="AI 도우미 연결 후 질문할 수 있어요" disabled />
        <button type="button" className={styles.sendButton} aria-label="질문 보내기" disabled>
          <SendIcon size={15} />
        </button>
      </div>
      <p className={styles.aiFootnote}>AI 답변은 참고용이에요. 과제는 직접 작성해 주세요.</p>
    </div>
  )
}
