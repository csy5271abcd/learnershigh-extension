import { useId, useLayoutEffect, useRef, useState, type Ref } from 'react'
import {
  canDownloadCaseMaterial,
  canPreviewCaseMaterial,
  caseMaterialName,
  caseMaterialRoleLabel,
  caseMaterialUnavailableText,
} from '../model/caseMaterials.ts'
import type { CaseAdminRecommendation, CaseMaterial, CaseStage, LinkedTask } from '../model/types.ts'
import { ApplyDialog } from './ApplyDialog.tsx'
import shared from './ApplyDialog.module.css'
import { CaseMaterialDownloadLink } from './CaseMaterialDownloadLink.tsx'
import styles from './CaseParts.module.css'

export function CaseAdminBadge() {
  return <span className={styles.adminBadge}>Admin 추천</span>
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface CaseMaterialActionsProps {
  material: CaseMaterial
  onPreview: (material: CaseMaterial) => void
}

// 자료 하나의 미리보기("열기", ActivityCase-03 ~ 09) / 원본 다운로드 Action. 과정 자료 Card와 "이 단계의 자료"가 함께 쓴다.
// 미리보기는 preview가 있을 때, 다운로드는 original이 있을 때만 보인다. (role과 무관)
export function CaseMaterialActions({ material, onPreview }: CaseMaterialActionsProps) {
  const name = caseMaterialName(material)
  const unavailable = caseMaterialUnavailableText(material)
  return (
    <span className={styles.materialActions}>
      {canPreviewCaseMaterial(material) && (
        <button
          type="button"
          className={styles.openButton}
          aria-haspopup="dialog"
          aria-label={`${name} 미리보기 열기`}
          onClick={() => onPreview(material)}
        >
          열기
        </button>
      )}
      {material.original && (
        <CaseMaterialDownloadLink material={{ ...material, original: material.original }} className={styles.openButton} />
      )}
      {unavailable && <span className={styles.materialUnavailable}>{unavailable}</span>}
    </span>
  )
}

interface CaseMaterialCardsProps {
  materials: CaseMaterial[]
  stages: CaseStage[]
  currentStageId: string
  onStageSelect: (index: number) => void
  onPreview: (material: CaseMaterial) => void
}

// 과정 자료 (ActivityCase-01 / 04 / 06 / 07 / 08). Card를 누르면 그 자료가 나온 단계로 이동하고, 현재 단계의 자료를 강조한다.
// 미리보기 / 다운로드는 Card 아래 별도 Action이다. (단계 이동 Button 안에 다른 Button / Link를 넣지 않는다)
export function CaseMaterialCards({ materials, stages, currentStageId, onStageSelect, onPreview }: CaseMaterialCardsProps) {
  return (
    <ul className={styles.materials}>
      {materials.map((item) => {
        const index = stages.findIndex((stage) => stage.stageId === item.stageId)
        const stage = stages[index]
        const current = item.stageId === currentStageId
        return (
          <li key={item.materialId} className={styles.materialItem} data-current={current || undefined}>
            <button
              type="button"
              className={styles.materialCard}
              aria-current={current ? 'step' : undefined}
              onClick={() => onStageSelect(index)}
            >
              <span className={styles.materialRole}>{caseMaterialRoleLabel[item.role]}</span>
              <span className={styles.materialTitle}>{caseMaterialName(item)}</span>
              <span className={styles.materialMeta}>
                {index + 1}단계 · {stage?.title} · {item.format}
              </span>
            </button>
            {(canPreviewCaseMaterial(item) || canDownloadCaseMaterial(item)) && (
              <span className={styles.materialCardActions}>
                <CaseMaterialActions material={item} onPreview={onPreview} />
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

interface CaseStageNavProps {
  stages: CaseStage[]
  currentIndex: number
  onStageSelect: (index: number) => void
}

// 단계 목록 (ActivityCase-01 ~ 08 왼쪽). Mobile에서는 가로로 넘기는 목록이 된다.
export function CaseStageNav({ stages, currentIndex, onStageSelect }: CaseStageNavProps) {
  // 가로 목록(Mobile)에서는 선택 단계가 보이도록 가운데로 옮긴다.
  const listRef = useRef<HTMLOListElement>(null)
  useLayoutEffect(() => {
    const list = listRef.current
    const selected = list?.querySelector<HTMLElement>('[aria-current="step"]')?.parentElement
    if (!list || !selected || list.scrollWidth <= list.clientWidth) return
    list.scrollLeft = selected.offsetLeft - list.offsetLeft - (list.clientWidth - selected.offsetWidth) / 2
  }, [currentIndex])

  return (
    <nav aria-label="활동 단계">
      <ol ref={listRef} className={styles.stageNav}>
        {stages.map((stage, index) => (
          <li key={stage.stageId}>
            <button
              type="button"
              className={styles.stageButton}
              aria-current={index === currentIndex ? 'step' : undefined}
              onClick={() => onStageSelect(index)}
            >
              <span className={styles.stageNumber} aria-hidden="true">
                {index + 1}
              </span>
              <span className={styles.stageText}>
                <span className={styles.stageTitle}>
                  <span className="lh-visually-hidden">{index + 1}단계 </span>
                  {stage.title}
                </span>
                <span className={styles.stageSummary}>{stage.summary}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}

interface CaseStagePanelProps {
  stage: CaseStage
  index: number
  total: number
  materials: CaseMaterial[]
  /** 마지막 단계에서만 보여준다. */
  reflection?: string
  followUp?: string
  headingRef: Ref<HTMLHeadingElement>
  onStageSelect: (index: number) => void
  onPreview: (material: CaseMaterial) => void
}

// 선택 단계 Detail (ActivityCase-01 ~ 08 오른쪽). 단계마다 실제로 있는 정보만 보여준다.
export function CaseStagePanel({
  stage,
  index,
  total,
  materials,
  reflection,
  followUp,
  headingRef,
  onStageSelect,
  onPreview,
}: CaseStagePanelProps) {
  const headingId = useId()
  const stageMaterials = materials.filter((item) => item.stageId === stage.stageId)
  const isFirst = index === 0
  const isLast = index === total - 1

  return (
    <section className={styles.panel} aria-labelledby={headingId}>
      <p className={styles.stageCount}>
        단계 {index + 1} / {total}
      </p>
      <h2 id={headingId} ref={headingRef} tabIndex={-1} className={styles.panelTitle}>
        {stage.title}
      </h2>
      <p className={styles.panelDescription}>{stage.description}</p>

      {stage.planChange && (
        <div className={styles.planChange}>
          <p className={styles.planBox}>
            <span className={styles.planLabel}>처음 계획</span>
            <span className={styles.planText}>{stage.planChange.before}</span>
          </p>
          <span className={styles.planArrow} aria-hidden="true">
            →
          </span>
          <p className={`${styles.planBox} ${styles.planAfter}`}>
            <span className={styles.planLabel}>바꾼 계획</span>
            <span className={styles.planText}>{stage.planChange.after}</span>
          </p>
        </div>
      )}

      {stage.checklist.length > 0 && (
        <ul className={styles.checklist}>
          {stage.checklist.map((item) => (
            <li key={item}>
              <CheckIcon />
              {item}
            </li>
          ))}
        </ul>
      )}

      {stage.feedback && (
        <div className={styles.feedback}>
          <p className={styles.feedbackSource}>{stage.feedback.source}</p>
          <p className={styles.feedbackText}>{stage.feedback.text}</p>
          <p className={styles.feedbackNote}>{stage.feedback.note}</p>
        </div>
      )}

      {isLast && reflection && (
        <figure className={styles.reflection}>
          <blockquote>“{reflection}”</blockquote>
          <figcaption className="lh-visually-hidden">Mentor Reflection</figcaption>
        </figure>
      )}

      {isLast && followUp && (
        <p className={styles.followUp}>
          <span className={styles.followUpLabel}>후속 활동</span>
          {followUp}
        </p>
      )}

      {stageMaterials.length > 0 && (
        <div className={styles.stageMaterials}>
          <p className={styles.stageMaterialsLabel}>이 단계의 자료</p>
          <ul>
            {stageMaterials.map((item) => (
              <li key={item.materialId} className={styles.stageMaterial}>
                <span className={styles.formatChip}>{item.format}</span>
                <span className={styles.stageMaterialText}>
                  <span className={styles.stageMaterialTitle}>
                    <span className={styles.materialRoleInline}>{caseMaterialRoleLabel[item.role]}</span>
                    {caseMaterialName(item)}
                  </span>
                  <span className={styles.stageMaterialDescription}>{item.description}</span>
                </span>
                <CaseMaterialActions material={item} onPreview={onPreview} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.stagePager}>
        <button type="button" className={styles.pagerButton} disabled={isFirst} onClick={() => onStageSelect(index - 1)}>
          이전 단계
        </button>
        <button
          type="button"
          className={`${styles.pagerButton} ${styles.pagerNext}`}
          disabled={isLast}
          onClick={() => onStageSelect(index + 1)}
        >
          다음 단계
        </button>
      </div>
    </section>
  )
}

interface CaseTaskLinkDialogProps {
  caseTitle: string
  tasks: LinkedTask[]
  adminRecommendation?: CaseAdminRecommendation
  onClose: () => void
}

// 내 Task에 참고 연결 (ActivityCase-10 Mockup).
// Student가 Case를 Task에 연결하는 API가 Contract에 없어 저장(Task.relatedMentorCaseIds 변경)은 하지 않는다. (Contract Gap)
// Admin 추천으로 이미 연결된 Task는 추천 출처를 따로 보여주고, Student의 연결과 한 값으로 합치지 않는다.
export function CaseTaskLinkDialog({ caseTitle, tasks, adminRecommendation, onClose }: CaseTaskLinkDialogProps) {
  const [selectedTaskId, setSelectedTaskId] = useState(tasks[0]?.taskId)
  const unavailableId = useId()

  const footer = (
    <>
      <p id={unavailableId} className={shared.sourceNotice}>
        아직 Task에 연결을 저장하는 기능이 준비되지 않아 연결할 수 없어요. 지금은 내 Task에 아무것도 바뀌지 않아요.
      </p>
      <div className={shared.actions}>
        <button type="button" className={shared.secondaryButton} onClick={onClose}>
          취소
        </button>
        <button type="button" className={shared.primaryButton} disabled aria-describedby={unavailableId}>
          연결하기
        </button>
      </div>
    </>
  )

  return (
    <ApplyDialog
      idPrefix="case-task-link"
      title="내 Task에 참고 연결"
      subtitle="연결하면 Task 상세의 참고 Case에 표시되고, 학원에서도 함께 볼 수 있어요."
      onClose={onClose}
      footer={footer}
    >
      {tasks.length > 0 ? (
        <fieldset className={styles.taskList}>
          <legend className="lh-visually-hidden">{caseTitle} Case를 참고로 연결할 Task</legend>
          {tasks.map((task) => {
            const recommended = adminRecommendation?.linkedTask.taskId === task.taskId
            return (
              <label key={task.taskId} className={styles.taskOption}>
                <input
                  type="radio"
                  name="case-task-link"
                  value={task.taskId}
                  checked={selectedTaskId === task.taskId}
                  onChange={() => setSelectedTaskId(task.taskId)}
                />
                <span className={styles.taskText}>
                  <span className={styles.taskTitle}>{task.title}</span>
                  <span className={styles.taskMeta}>
                    {recommended ? 'Admin이 이 Task에 추천한 Case예요.' : '진행 중인 Task'}
                  </span>
                </span>
                <span className={styles.taskCheck} aria-hidden="true">
                  <CheckIcon />
                </span>
              </label>
            )
          })}
        </fieldset>
      ) : (
        <p className={styles.taskEmpty}>지금 진행 중인 Task가 없어요.</p>
      )}
    </ApplyDialog>
  )
}
