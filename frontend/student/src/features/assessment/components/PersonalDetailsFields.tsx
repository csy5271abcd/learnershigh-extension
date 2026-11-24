import { useId } from 'react'
import type { SchoolAssessmentStatus } from '../api/types.ts'
import {
  assessmentTypeLabels,
  assessmentTypeOrder,
  submissionError,
  submissionOptions,
  submissionOther,
  typeLabelError,
  weightError,
  type PersonalDetailsValue,
} from '../model/personalDetails.ts'
import styles from './AddSchoolAssessmentModal.module.css'

// A27-UX 학생 개인 수행평가 관리 정보 입력 (추가·수정 Modal 공용, api-contract §12 DRAFT).
// 순서: 평가 유형 → 일정 → 평가 정보 → 제출물(독립 Section) → 관리. 모두 선택 값이다. 비워 두면 '모름' — 0이나 임의 날짜를 넣지 않는다.
// 학교 공식 평가정보를 바꾸지 않는다. 평가일(시험·발표일)과 제출 마감은 서로 다른 값이라 자동으로 맞추지 않는다(날짜는 한국 시간 기준 YYYY-MM-DD).
const statusOptions: { value: SchoolAssessmentStatus; label: string }[] = [
  { value: 'BEFORE_START', label: '진행 전' },
  { value: 'IN_PROGRESS', label: '진행 중' },
  { value: 'COMPLETED', label: '완료' },
]

export function PersonalDetailsFields({
  value,
  onChange,
  disabled,
  errors,
  showStatus,
}: {
  value: PersonalDetailsValue
  onChange: (patch: Partial<PersonalDetailsValue>) => void
  disabled: boolean
  errors?: Partial<Record<'evaluationDate' | 'deadlineDate' | 'weightPercent', string>>
  showStatus?: boolean
}) {
  const id = useId()
  const weightProblem = errors?.weightPercent ?? weightError(value.weightPercent)
  const labelProblem = typeLabelError(value)
  const submissionProblem = submissionError(value)
  return (
    <div className={styles.sections} data-testid="personal-details-fields">
      <section className={styles.section} aria-labelledby={`${id}-type`}>
        <h3 id={`${id}-type`} className={styles.sectionTitle}>
          평가 유형
        </h3>
        <div className={styles.chips} role="radiogroup" aria-label="평가 유형">
          {assessmentTypeOrder.map((type) => (
            <label key={type} className={styles.chip}>
              <input type="radio" name={`${id}-type`} value={type} checked={value.assessmentType === type} disabled={disabled} onChange={() => onChange({ assessmentType: type })} />
              <span>{assessmentTypeLabels[type]}</span>
            </label>
          ))}
          {value.assessmentType && (
            <button type="button" className={styles.linkButton} onClick={() => onChange({ assessmentType: '', assessmentTypeLabel: '' })} disabled={disabled}>
              선택 해제
            </button>
          )}
        </div>
        {value.assessmentType === 'OTHER' && (
          <div className={styles.field}>
            <label htmlFor={`${id}-type-label`} className={styles.label}>
              평가 유형 직접 입력
            </label>
            <input
              id={`${id}-type-label`}
              className={styles.input}
              value={value.assessmentTypeLabel}
              maxLength={50}
              placeholder="예: 모의 면접, 구술 평가"
              disabled={disabled}
              aria-invalid={labelProblem ? true : undefined}
              onChange={(event) => onChange({ assessmentTypeLabel: event.target.value })}
              data-testid="field-type-label"
            />
            {labelProblem && <p className={styles.fieldError}>{labelProblem}</p>}
          </div>
        )}
      </section>

      <section className={styles.section} aria-labelledby={`${id}-schedule`}>
        <h3 id={`${id}-schedule`} className={styles.sectionTitle}>
          일정
        </h3>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label htmlFor={`${id}-evaluation`} className={styles.label}>
              평가일
            </label>
            <input id={`${id}-evaluation`} type="date" className={styles.input} value={value.evaluationDate} disabled={disabled} aria-invalid={errors?.evaluationDate ? true : undefined} onChange={(event) => onChange({ evaluationDate: event.target.value })} data-testid="field-evaluation-date" />
            {errors?.evaluationDate && <p className={styles.fieldError}>{errors.evaluationDate}</p>}
          </div>
          <div className={styles.field}>
            <label htmlFor={`${id}-deadline`} className={styles.label}>
              제출 마감
            </label>
            <input id={`${id}-deadline`} type="date" className={styles.input} value={value.deadlineDate} disabled={disabled} aria-invalid={errors?.deadlineDate ? true : undefined} onChange={(event) => onChange({ deadlineDate: event.target.value })} data-testid="field-deadline-date" />
            {errors?.deadlineDate && <p className={styles.fieldError}>{errors.deadlineDate}</p>}
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby={`${id}-info`}>
        <h3 id={`${id}-info`} className={styles.sectionTitle}>
          평가 정보
        </h3>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label htmlFor={`${id}-weight`} className={styles.label}>
              반영 비율 (%)
            </label>
            <input id={`${id}-weight`} inputMode="numeric" className={styles.input} value={value.weightPercent} placeholder="예: 20" disabled={disabled} aria-invalid={weightProblem ? true : undefined} aria-describedby={`${id}-weight-hint`} onChange={(event) => onChange({ weightPercent: event.target.value })} data-testid="field-weight" />
            <p id={`${id}-weight-hint`} className={weightProblem ? styles.fieldError : styles.hint}>
              {weightProblem ?? '0~100.'}
            </p>
          </div>
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-description`} className={styles.label}>
            수행 내용
          </label>
          <textarea id={`${id}-description`} className={styles.textarea} rows={3} maxLength={2000} value={value.description} placeholder="선생님이 안내한 내용이나 해야 할 일을 적어 두세요" disabled={disabled} onChange={(event) => onChange({ description: event.target.value })} data-testid="field-description" />
        </div>
      </section>

      <section className={styles.section} aria-labelledby={`${id}-submission`}>
        <h3 id={`${id}-submission`} className={styles.sectionTitle}>
          제출물
        </h3>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label htmlFor={`${id}-submission-choice`} className={styles.label}>
              무엇을 내나요
            </label>
            <select
              id={`${id}-submission-choice`}
              className={styles.input}
              value={value.submissionChoice}
              disabled={disabled}
              onChange={(event) => onChange({ submissionChoice: event.target.value })}
              data-testid="field-submission-choice"
            >
              <option value="">미정</option>
              {submissionOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              <option value={submissionOther}>기타 (직접 입력)</option>
            </select>
          </div>
          {value.submissionChoice === submissionOther && (
            <div className={styles.field}>
              <label htmlFor={`${id}-submission-custom`} className={styles.label}>
                제출물 직접 입력
              </label>
              <input
                id={`${id}-submission-custom`}
                className={styles.input}
                value={value.submissionCustom}
                maxLength={500}
                placeholder="예: 보고서 1부와 발표 영상"
                disabled={disabled}
                aria-invalid={submissionProblem ? true : undefined}
                onChange={(event) => onChange({ submissionCustom: event.target.value })}
                data-testid="field-submission-custom"
              />
              {submissionProblem && <p className={styles.fieldError}>{submissionProblem}</p>}
            </div>
          )}
        </div>
      </section>

      <section className={styles.section} aria-labelledby={`${id}-manage`}>
        <h3 id={`${id}-manage`} className={styles.sectionTitle}>
          관리
        </h3>
        {showStatus && (
          <div className={styles.field}>
            <span className={styles.label}>진행 상태</span>
            <div className={styles.chips} role="radiogroup" aria-label="진행 상태">
              {statusOptions.map((option) => (
                <label key={option.value} className={styles.chip}>
                  <input type="radio" name={`${id}-status`} value={option.value} checked={(value.status ?? 'BEFORE_START') === option.value} disabled={disabled} onChange={() => onChange({ status: option.value })} />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        <div className={styles.field}>
          <label htmlFor={`${id}-memo`} className={styles.label}>
            개인 메모
          </label>
          <textarea id={`${id}-memo`} className={styles.textarea} rows={2} maxLength={2000} value={value.personalMemo} placeholder="나만 보는 메모예요" disabled={disabled} onChange={(event) => onChange({ personalMemo: event.target.value })} data-testid="field-memo" />
        </div>
      </section>
    </div>
  )
}
