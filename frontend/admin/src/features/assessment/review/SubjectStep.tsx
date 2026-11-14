import type { EvaluationPlanAnalysisView } from '../api/types.ts'
import { fieldKey, type Decision } from './reviewModel.ts'
import styles from './review.module.css'

// 2단계 과목 확인: 분석기가 인식한 과목을 학업 정보의 과목과 연결한다.
// 과목 목록 API가 아직 없어 과목 코드를 직접 입력한다. 과목명으로 자동 연결하지 않는다(서버가 문서 학교·학년도·학년·학기 과목인지 검사한다).
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
      <h3 className={styles.stepTitle}>과목 확인</h3>
      <p className={styles.stepLead}>
        분석기가 찾은 과목이에요. 확정할 과목은 학업 정보의 과목 코드와 연결해 주세요. 과목 목록 조회 기능이 아직 없어 코드를 직접 입력해요(예: subj_02).
      </p>
      {view.analysisStatus === 'PARTIAL' && (
        <div className={styles.notice} role="status">
          <div>
            <strong>분석되지 않은 과목이 있을 수 있어요</strong>
            <p>원문 목차와 비교해 빠진 과목이 있으면 이번 확정에서 제외되고, 원문에서 직접 확인해야 해요.</p>
          </div>
        </div>
      )}
      {view.subjects.map((subject, index) => {
        const subjectFields = fields.filter((field) => field.subjectIndex === index)
        const reviewed = subjectFields.filter((field) => decisions[fieldKey(field)]).length
        const missing = subjectFields.filter((field) => field.candidate === null).length
        const range = pages[index]
        const linked = (subjectIds[index] ?? '').trim() !== ''
        return (
          <section key={`${subject.subjectName}-${index}`} className={styles.card} aria-label={subject.subjectName} data-testid="review-subject-card">
            <div className={styles.subjectCard}>
              <div>
                <h4 className={styles.cardTitle} style={{ fontSize: 16 }}>
                  {subject.subjectName}
                  {reviewed === subjectFields.length && subjectFields.length > 0 ? (
                    <span className={styles.pill} data-tone="success">검토 완료</span>
                  ) : reviewed > 0 ? (
                    <span className={styles.pill} data-tone="primary">검토 중</span>
                  ) : null}
                </h4>
                <p className={styles.muted}>
                  수행평가 {subject.performanceEvaluation?.items.length ?? 0}개 · 확인할 항목 {subjectFields.length}개 중 {reviewed}개 검토
                  {missing > 0 ? ` · 값을 못 읽은 항목 ${missing}개` : ''}
                </p>
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  {range?.from ? (
                    <button type="button" className={styles.pageLink} onClick={() => onJump(range.from as number)}>
                      원문 {range.from}~{range.to}쪽 보기
                    </button>
                  ) : (
                    <span className={styles.tiny}>원문 쪽 범위 정보 없음</span>
                  )}
                  <button type="button" className={styles.chipButton} onClick={() => onOpenSubject(index)}>
                    수행평가 검토하기
                  </button>
                </div>
              </div>
              <label className={styles.formField}>
                학업 과목 코드
                <input
                  className={styles.input}
                  value={subjectIds[index] ?? ''}
                  placeholder="예: subj_02"
                  onChange={(event) => onSubjectId(index, event.target.value)}
                  data-testid={`review-subject-id-${index}`}
                />
                <span className={styles.tiny}>{linked ? '입력됨 · 확정할 때 서버가 확인해요' : '아직 연결하지 않았어요'}</span>
              </label>
            </div>
          </section>
        )
      })}
    </div>
  )
}
