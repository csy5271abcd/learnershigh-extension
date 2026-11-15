import { useEffect, useState } from 'react'
import { getPlanSubjects } from '../api/assessmentAdminApi.ts'
import type { EvaluationPlanAnalysisView, PlanSubjects } from '../api/types.ts'
import { fieldKey, type Decision } from './reviewModel.ts'
import type { OnJump } from './evidence.ts'
import styles from './review.module.css'

// 2단계 과목 확인: 분석기가 찾은 과목을 학업 정보의 과목 코드와 연결한다(선 하나로 나눈 행 목록).
// 문서 슬롯의 학업 과목 목록(§38-4)에서 고른다. 목록이 없으면 코드를 직접 입력한다. 과목명으로 자동 연결하지 않는다(서버가 문서 슬롯 과목인지 검사).
export function SubjectStep({
  view,
  subjectIds,
  decisions,
  onSubjectId,
  onOpenSubject,
  onJump,
}: {
  view: EvaluationPlanAnalysisView
  subjectIds: Record<number, string>
  decisions: Record<string, Decision>
  onSubjectId: (index: number, value: string) => void
  onOpenSubject: (index: number) => void
  onJump: OnJump
}) {
  const fields = view.reviewFields ?? []
  const pages = view.subjectPages ?? []
  const [options, setOptions] = useState<PlanSubjects | null>(null)
  useEffect(() => {
    let cancelled = false
    getPlanSubjects(view.planId).then(
      (data) => !cancelled && setOptions(data),
      () => !cancelled && setOptions(null), // 목록을 못 받으면 직접 입력으로 둔다(입력값은 서버가 검증)
    )
    return () => {
      cancelled = true
    }
  }, [view.planId])
  const choose = Boolean(options?.available && options.items.length > 0)

  return (
    <div data-testid="review-step-subjects">
      <h3 className={styles.title}>과목 확인</h3>
      <p className={styles.lead}>
        확정할 과목을 학업 정보의 과목과 연결해 주세요. {choose ? '이 문서 학년·학기의 학업 과목 목록에서 골라요(이름이 비슷해도 자동으로 연결하지 않아요).' : '이 학년·학기의 학업 과목 목록을 받지 못해 과목 코드를 직접 입력해요(예: subj_02).'}
        {view.analysisStatus === 'PARTIAL' && ' 원문 목차와 비교해 목록에 없는 과목이 있으면 원문에서 직접 확인해 주세요.'}
      </p>
      <ul className={styles.rows}>
        {view.subjects.map((subject, index) => {
          const subjectFields = fields.filter((field) => field.subjectIndex === index)
          const reviewed = subjectFields.filter((field) => decisions[fieldKey(field)]).length
          const range = pages[index]
          return (
            <li key={`${subject.subjectName}-${index}`} className={styles.row} style={{ minHeight: 76 }} data-testid="review-subject-card">
              <div style={{ minWidth: 0, flex: 1 }}>
                <span className={styles.rowValue} style={{ fontSize: 16 }}>
                  {subject.subjectName}
                </span>
                <div className={styles.tiny} style={{ marginTop: 4 }}>
                  수행평가 {subject.performanceEvaluation?.items.length ?? 0}개 · 검토 {reviewed}/{subjectFields.length}
                  {range?.from ? (
                    <>
                      {' · '}
                      <button type="button" className={styles.page} onClick={() => onJump(range.from as number)}>
                        원문 {range.from}~{range.to}쪽
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
              {choose && options ? (
                <select
                  className={styles.select}
                  style={{ maxWidth: 220 }}
                  value={subjectIds[index] ?? ''}
                  aria-label={`${subject.subjectName} 학업 과목`}
                  onChange={(event) => onSubjectId(index, event.target.value)}
                  data-testid={`review-subject-select-${index}`}
                >
                  <option value="">과목 선택</option>
                  {options.items.map((item) => (
                    <option key={item.subjectId} value={item.subjectId}>
                      {item.name} · {item.subjectId}
                    </option>
                  ))}
                  {subjectIds[index] && !options.items.some((item) => item.subjectId === subjectIds[index]) && (
                    <option value={subjectIds[index]}>{subjectIds[index]} (목록에 없음 — 확정 시 거절돼요)</option>
                  )}
                </select>
              ) : (
                <input
                  className={styles.input}
                  style={{ maxWidth: 200 }}
                  value={subjectIds[index] ?? ''}
                  placeholder="과목 코드"
                  aria-label={`${subject.subjectName} 학업 과목 코드`}
                  onChange={(event) => onSubjectId(index, event.target.value)}
                  data-testid={`review-subject-id-${index}`}
                />
              )}
              <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => onOpenSubject(index)}>
                검토하기
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
