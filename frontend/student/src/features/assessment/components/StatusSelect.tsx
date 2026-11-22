import { useId } from 'react'
import type { SchoolAssessmentStatus } from '../api/types.ts'
import { isStatusTransitionAllowed, schoolAssessmentStatuses, statusLabels } from '../model/schoolAssessmentView.ts'
import { ChevronDownIcon } from './AssessmentIcons.tsx'
import styles from './StatusSelect.module.css'

interface StatusSelectProps {
  status: SchoolAssessmentStatus
  /** 접근성 이름에 붙일 과제명 */
  assessmentTitle: string
  pending: boolean
  onChange: (next: SchoolAssessmentStatus) => void
  /** 관리자 읽기 전용 보기(P-28): 같은 자리·같은 모양으로 두되 바꿀 수 없다 */
  disabled?: boolean
}

// 학생 자기 관리 상태 선택 (§13). A27-UX: 앞으로·되돌리기 모두 고를 수 있다(서버가 변경 이력을 남긴다).
export function StatusSelect({ status, assessmentTitle, pending, onChange, disabled = false }: StatusSelectProps) {
  const hintId = useId()
  const hasLockedOption = schoolAssessmentStatuses.some((option) => !isStatusTransitionAllowed(status, option))
  return (
    <span className={styles.wrap} data-status={status}>
      <span className={styles.dot} aria-hidden="true" />
      <select
        className={styles.select}
        value={status}
        disabled={pending || disabled}
        title={disabled ? '관리자 읽기 전용 보기에서는 상태를 바꿀 수 없어요' : undefined}
        aria-label={`${assessmentTitle} 진행 상태`}
        aria-describedby={hasLockedOption ? hintId : undefined}
        aria-busy={pending}
        onChange={(event) => onChange(event.target.value as SchoolAssessmentStatus)}
      >
        {schoolAssessmentStatuses.map((option) => {
          const allowed = isStatusTransitionAllowed(status, option)
          return (
            <option key={option} value={option} disabled={!allowed}>
              {statusLabels[option]}
              {allowed ? '' : ' (선택할 수 없음)'}
            </option>
          )
        })}
      </select>
      <ChevronDownIcon className={styles.chevron} size={13} />
      {hasLockedOption && (
        <span id={hintId} className="lh-visually-hidden">
          지금은 고를 수 없는 상태가 있어요.
        </span>
      )}
    </span>
  )
}
