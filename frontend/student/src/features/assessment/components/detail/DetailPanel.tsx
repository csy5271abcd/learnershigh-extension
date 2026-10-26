import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { ClipboardIcon, InfoIcon, NoteIcon, SendIcon, SparkleIcon } from '../AssessmentIcons.tsx'
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
  feedbackContent: ReactNode
  onUnavailable: (message: string) => void
}

// 오른쪽 상세 패널 (Mockup SA-DETAIL-01·08~11): 평가 기준 / AI 도우미 / 피드백 / 자료 탭.
export function DetailPanel({ activeTab, onTabChange, assessmentTitle, hasNote, feedbackContent, onUnavailable }: DetailPanelProps) {
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
        {activeTab === 'criteria' && <CriteriaTab onUnavailable={onUnavailable} />}
        {activeTab === 'ai' && <AiAssistantTab assessmentTitle={assessmentTitle} hasNote={hasNote} />}
        {activeTab === 'feedback' && feedbackContent}
        {activeTab === 'resources' && <ResourcesTab />}
      </div>
    </aside>
  )
}

// 평가 기준 (Mockup SA-DETAIL-01·08). 학교 원본 기준을 과제별로 조회하는 계약이 없어(§11 분석 결과의 항목 키·채점기준
// 구조 미정, screen-map MM-20) 공식 기준을 표시하지 않는다. AI 쉬운 설명(§14)은 Stage 3에서 연결한다.
function CriteriaTab({ onUnavailable }: { onUnavailable: (message: string) => void }) {
  return (
    <div className={styles.panelStack}>
      <p className={styles.infoBox}>
        <InfoIcon size={14} />
        AI 설명은 이해를 돕기 위한 참고용이에요. 공식 채점 기준을 대신하지 않고, 점수를 보장하지 않아요.
      </p>
      <div className={styles.panelEmpty}>
        <ClipboardIcon size={22} />
        <p className={styles.panelEmptyTitle}>평가 기준이 아직 연결되지 않았어요</p>
        <p className={styles.panelEmptyText}>
          학교 평가계획서의 기준을 과제별로 불러오는 기능은 준비 중이에요. 선생님이 안내한 기준은 탐구 노트에 적어 두세요.
        </p>
      </div>
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

const suggestedQuestions = [
  '이 수행평가의 평가 기준을 쉽게 설명해줘.',
  '이 자료의 핵심 내용을 알려줘.',
  '탐구 주제를 더 확장하려면 어떤 내용을 조사하면 좋을까?',
  '내 주장에 근거가 충분한지 확인해줘.',
]

// AI 도우미 (Mockup SA-DETAIL-09, api-contract.md §28). AI 호출은 Stage 3 범위라 질문을 보내지 않는다.
function AiAssistantTab({ assessmentTitle, hasNote }: { assessmentTitle: string; hasNote: boolean }) {
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

// 자료 (Mockup SA-DETAIL-11, api-contract.md §22). 추천 응답 항목 Shape이 계약에 없어(MM-21) 목록을 만들지 않는다.
function ResourcesTab() {
  return (
    <div className={styles.panelStack}>
      <div className={styles.panelEmpty}>
        <NoteIcon size={22} />
        <p className={styles.panelEmptyTitle}>과목별 자료 추천은 준비 중이에요</p>
        <p className={styles.panelEmptyText}>
          뉴스·영상·논문·통계 자료를 추천하고 노트에 추가하는 기능이 자료함과 함께 연결될 예정이에요. 지금은 찾은 자료의 출처를 노트에 적어 두세요.
        </p>
      </div>
    </div>
  )
}
