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
}

// 학생 자기 관리 상태 선택 (§13). 되돌리기 선택지는 정책 확정 전이라 비활성 + 사유 표시 (MM-01).
export function StatusSelect({ status, assessmentTitle, pending, onChange }: StatusSelectProps) {
  const hintId = useId()
  const hasLockedOption = schoolAssessmentStatuses.some((option) => !isStatusTransitionAllowed(status, option))
  return (
    <span className={styles.wrap} data-status={status}>
      <span className={styles.dot} aria-hidden="true" />
      <select
        className={styles.select}
        value={status}
        disabled={pending}
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
              {allowed ? '' : ' (되돌리기 준비 중)'}
            </option>
          )
        })}
      </select>
      <ChevronDownIcon className={styles.chevron} size={13} />
      {hasLockedOption && (
        <span id={hintId} className="lh-visually-hidden">
          이전 상태로 되돌리는 기능은 정책 확정 전이라 아직 사용할 수 없어요.
        </span>
      )}
    </span>
  )
}
