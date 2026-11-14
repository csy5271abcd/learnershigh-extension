import type { EvaluationPlanAnalysisView } from '../api/types.ts'
import { fieldKey, type Decision } from './reviewModel.ts'
import styles from './review.module.css'

// 2단계 과목 확인: 분석기가 찾은 과목을 학업 정보의 과목 코드와 연결한다(선 하나로 나눈 행 목록).
// 과목 목록 API가 아직 없어 코드를 직접 입력한다. 과목명으로 자동 연결하지 않는다(서버가 문서 슬롯 과목인지 검사).
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
  onJump: (page: number) => void
}) {
  const fields = view.reviewFields ?? []
  const pages = view.subjectPages ?? []

  return (
    <div data-testid="review-step-subjects">
      <h3 className={styles.title}>과목 확인</h3>
      <p className={styles.lead}>
        확정할 과목을 학업 정보의 과목 코드와 연결해 주세요. 과목 목록 조회 기능이 아직 없어 코드를 직접 입력해요(예: subj_02).
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
              <input
                className={styles.input}
                style={{ maxWidth: 200 }}
                value={subjectIds[index] ?? ''}
                placeholder="과목 코드"
                aria-label={`${subject.subjectName} 학업 과목 코드`}
                onChange={(event) => onSubjectId(index, event.target.value)}
                data-testid={`review-subject-id-${index}`}
              />
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
