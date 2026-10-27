import { useState } from 'react'
import { tipActionLabels, tips, type TipAction, type TipContent } from '../../model/tipsContent.ts'
import { ArrowRightIcon, CheckIcon } from '../AssessmentIcons.tsx'
import { Modal } from '../Modal.tsx'
import styles from './tips.module.css'

export interface TipActionTarget {
  /** 누르면 실행. 없으면 비활성(aria-disabled) + reason 안내 */
  run?: () => void
  reason?: string
}

interface TipsBrowserProps {
  selectedTipId: string
  onSelect: (tipId: string) => void
  /** 관련 기능 버튼이 어디로 가는지는 여는 화면이 정한다 (상세 안 / 꿀팁 화면) */
  resolveAction: (action: TipAction) => TipActionTarget
  /** 이번에 열어 본 팁 (Mockup의 ✓ 표시). 저장하지 않고 필수 단계로 쓰지 않는다. */
  viewedTipIds?: ReadonlySet<string>
}

// 수행평가 꿀팁 목록 + 선택한 팁 (Mockup SA-TIPS-01~06은 같은 화면의 선택 상태 6개).
// 수행평가 상세의 Modal과 메뉴의 꿀팁 화면이 이 Component 하나를 같이 쓴다.
export function TipsBrowser({ selectedTipId, onSelect, resolveAction, viewedTipIds }: TipsBrowserProps) {
  const selected = tips.find((tip) => tip.tipId === selectedTipId) ?? tips[0]
  return (
    <div className={styles.browser}>
      <ul className={styles.list} aria-label="꿀팁 목록">
        {tips.map((tip) => {
          const current = tip.tipId === selected.tipId
          return (
            <li key={tip.tipId}>
              <button
                type="button"
                className={styles.item}
                aria-current={current ? 'true' : undefined}
                aria-controls="tip-detail"
                onClick={() => onSelect(tip.tipId)}
              >
                <span className={styles.itemEmoji} aria-hidden="true">
                  {tip.emoji}
                </span>
                <span className={styles.itemText}>
                  <span className={styles.itemNumber}>{tip.number}</span>
                  <span className={styles.itemTitle}>{tip.title}</span>
                </span>
                {viewedTipIds?.has(tip.tipId) && !current && (
                  <span className={styles.viewed}>
                    <CheckIcon size={13} />
                    <span className="lh-visually-hidden">이번에 읽음</span>
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      <TipDetail tip={selected} resolveAction={resolveAction} />
    </div>
  )
}

function TipDetail({ tip, resolveAction }: { tip: TipContent; resolveAction: TipsBrowserProps['resolveAction'] }) {
  const [reasons, setReasons] = useState<{ tipId: string; text: string }>()
  const reason = reasons?.tipId === tip.tipId ? reasons.text : undefined
  return (
    <article id="tip-detail" className={styles.detail} aria-labelledby="tip-detail-title" aria-live="polite">
      <p className={styles.detailNumber}>{tip.number}</p>
      <h3 id="tip-detail-title" className={styles.detailTitle}>
        <span aria-hidden="true">{tip.emoji}</span> {tip.title}
      </h3>
      <p className={styles.body}>{tip.body}</p>
      {tip.example?.kind === 'rows' && (
        <dl className={styles.example} aria-label="예시">
          {tip.example.rows.map((row) => (
            <div key={row.label} className={styles.exampleRow}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {tip.example?.kind === 'questions' && (
        <ul className={`${styles.example} ${styles.questions}`} aria-label="스스로 물어볼 질문">
          {tip.example.questions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      )}
      <div className={styles.actions}>
        {tip.relatedActions.map((action) => {
          const target = resolveAction(action)
          return (
            <button
              key={action}
              type="button"
              className={styles.actionButton}
              aria-disabled={target.run ? undefined : 'true'}
              onClick={() => (target.run ? target.run() : setReasons({ tipId: tip.tipId, text: target.reason ?? '' }))}
            >
              <ArrowRightIcon size={15} />
              {tipActionLabels[action]}
            </button>
          )
        })}
      </div>
      {reason && (
        <p className={styles.reason} role="status">
          {reason}
        </p>
      )}
    </article>
  )
}

interface TipsModalProps {
  initialTipId?: string
  resolveAction: (action: TipAction, close: () => void) => TipActionTarget
  onClose: () => void
}

/** 수행평가 상세의 "수행평가 꿀팁" Modal (Mockup SA-TIPS-01~06) */
export function TipsModal({ initialTipId, resolveAction, onClose }: TipsModalProps) {
  const [selectedTipId, setSelectedTipId] = useState(initialTipId ?? tips[0].tipId)
  const [viewed, setViewed] = useState<ReadonlySet<string>>(() => new Set([initialTipId ?? tips[0].tipId]))
  return (
    <Modal title="수행평가 꿀팁" description="순서 없이 필요한 팁만 골라 보세요." wide onRequestClose={onClose} footer={null}>
      <p className={styles.intro}>순서 없이 필요한 팁만 골라 보세요. 학교의 공식 채점 기준이나 세특 내용을 보장하는 안내가 아니에요.</p>
      <TipsBrowser
        selectedTipId={selectedTipId}
        viewedTipIds={viewed}
        onSelect={(tipId) => {
          setSelectedTipId(tipId)
          setViewed((previous) => new Set(previous).add(tipId))
        }}
        resolveAction={(action) => resolveAction(action, onClose)}
      />
    </Modal>
  )
}
