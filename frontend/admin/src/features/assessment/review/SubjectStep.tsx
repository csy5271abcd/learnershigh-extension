import { useEffect, useState } from 'react'
import { SubjectSearchSelect } from '../components/SubjectSearchSelect.tsx'
import { Modal } from '../components/canonicalUi.ts'
import { getPlanSubjects } from '../api/assessmentAdminApi.ts'
import type { EvaluationPlanAnalysisView, PlanSubjects, SubjectExclusionReason } from '../api/types.ts'
import { confirmedSubjectLinks, exclusionReasonLabel, fieldKey, gradeConflict, gradeText, type Decision } from './reviewModel.ts'
import type { Exclusions } from './useServerDraft.ts'
import type { OnJump } from './evidence.ts'
import styles from './review.module.css'

// 2단계 과목 확인: 분석기가 찾은 과목을 학업 정보의 과목 코드와 연결한다(선 하나로 나눈 행 목록).
// 문서 슬롯의 학업 과목 목록(§38-4)에서 과목명으로 찾아 고른다(A27-UX: 과목 ID 직접 입력 없음). 과목명으로 자동 연결하지 않는다(서버가 문서 슬롯 과목인지 검사).
// A27-UX 관리자 추가 수정 [01]: 합본·다른 학년 과목을 '이 문서 검토 대상에서 제외'할 수 있다(삭제 아님 — 공유 초안 subjectExclusions에 저장,
// 새로고침해도 유지, 되돌리기 가능). 제외한 과목은 수행평가·채점기준·월별 운영계획 검토와 확정·학생 공개에서 빠진다.
// [03][04]: 과목 검색은 범용 고등학교 과목 후보(1학년 / 2·3학년 통합)를 함께 찾되, 고를 수 있는 것은 이 학교·학년·학기 학업 과목뿐이다.
const reasons: SubjectExclusionReason[] = ['OTHER_GRADE', 'DUPLICATE', 'NOT_THIS_TERM', 'OTHER']

export function SubjectStep({
  view,
  subjectIds,
  decisions,
  exclusions,
  onExclude,
  editable,
  onSubjectId,
  onOpenSubject,
  onJump,
}: {
  view: EvaluationPlanAnalysisView
  subjectIds: Record<number, string>
  decisions: Record<string, Decision>
  exclusions: Exclusions
  onExclude: (index: number, value: Exclusions[number] | null) => void
  /** 초안을 고칠 수 있을 때만 제외·되돌리기가 보인다(확정본은 재검토를 시작한 뒤) */
  editable: boolean
  onSubjectId: (index: number, value: string) => void
  onOpenSubject: (index: number) => void
  onJump: OnJump
}) {
  const fields = view.reviewFields ?? []
  const pages = view.subjectPages ?? []
  const [options, setOptions] = useState<PlanSubjects | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'done' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const [excluding, setExcluding] = useState<{ index: number; reason: SubjectExclusionReason; note: string } | null>(null)
  useEffect(() => {
    let cancelled = false
    getPlanSubjects(view.planId).then(
      (data) => {
        if (cancelled) return
        setOptions(data)
        setLoadState('done')
      },
      () => {
        if (cancelled) return
        setOptions(null)
        setLoadState('error')
      },
    )
    return () => {
      cancelled = true
    }
  }, [view.planId, attempt])
  const choose = Boolean(options?.available && options.items.length > 0)
  const excludedCount = Object.keys(exclusions).length
  const confirmedLinks = confirmedSubjectLinks(view)
  const publishedCount = (index: number) =>
    view.confirmedFields.filter((field) => (typeof field.analysisSubjectIndex === 'number' ? field.analysisSubjectIndex === index : confirmedLinks[index] !== undefined && field.subjectId === confirmedLinks[index])).length
  const target = excluding ? view.subjects[excluding.index] : null
  const targetDecided = excluding ? fields.filter((field) => field.subjectIndex === excluding.index && decisions[fieldKey(field)]).length : 0
  const targetPublished = excluding ? publishedCount(excluding.index) : 0

  return (
    <div data-testid="review-step-subjects">
      <h3 className={styles.title}>과목 확인</h3>
      <p className={styles.lead}>
        확정할 과목을 학업 정보의 과목과 연결해 주세요. 과목명으로 찾아 골라요(이름이 비슷해도 자동으로 연결하지 않아요). 다른 학년 과목이나 중복 추출된 과목은 이 문서 검토 대상에서 제외할 수 있어요.
        {view.analysisStatus === 'PARTIAL' && ' 원문 목차와 비교해 목록에 없는 과목이 있으면 원문에서 직접 확인해 주세요.'}
      </p>
      <p className={styles.tiny} data-testid="review-subject-scope">
        검토 대상 {view.subjects.length - excludedCount}과목{excludedCount > 0 ? ` · 제외 ${excludedCount}과목` : ''}
      </p>
      {loadState !== 'loading' && !choose && (
        <div className={styles.note} role="alert" data-testid="review-subjects-unavailable">
          <div>
            <strong>이 학년·학기의 학업 과목 목록을 불러오지 못했어요</strong>
            <span className={styles.muted} style={{ display: 'block' }}>
              과목을 연결할 수 없어 확정할 수 없어요.{' '}
              <button type="button" className={styles.link} onClick={() => {
                setLoadState('loading')
                setAttempt((value) => value + 1)
              }}>
                다시 불러오기
              </button>
            </span>
          </div>
        </div>
      )}
      <ul className={styles.rows}>
        {view.subjects.map((subject, index) => {
          const subjectFields = fields.filter((field) => field.subjectIndex === index)
          const reviewed = subjectFields.filter((field) => decisions[fieldKey(field)]).length
          const range = pages[index]
          const grades = view.subjectGrades?.[index] ?? null
          const conflict = gradeConflict(grades, view.slot?.grade)
          const exclusion = exclusions[index]
          return (
            <li key={`${subject.subjectName}-${index}`} className={styles.row} style={{ minHeight: 76 }} data-testid="review-subject-card" data-excluded={exclusion ? 'true' : undefined}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <span className={styles.rowValue} style={{ fontSize: 16 }}>
                  {subject.subjectName}
                </span>
                {gradeText(grades) && (
                  <span className={styles.tiny} style={{ marginLeft: 8 }} data-testid="review-subject-grades" title="분석기가 원문의 학년 문맥(제목·구간)에서 찾은 학년이에요.">
                    원문 {gradeText(grades)}
                  </span>
                )}
                {exclusion ? (
                  <span className={styles.excludedBadge} data-testid="review-subject-excluded">
                    제외됨 · {exclusionReasonLabel[exclusion.reason]}
                    {exclusion.note ? ` · ${exclusion.note}` : ''}
                  </span>
                ) : (
                  conflict && (
                    <div className={styles.blockedNote} role="note" data-testid="review-subject-grade-conflict">
                      <strong>확정할 수 없어요 · 학년이 달라요</strong>
                      <span>
                        이 문서는 {view.slot?.grade}학년으로 등록됐지만 원문상 {gradeText(grades)} 과목이에요. 다른 과목으로 연결하지 말고, 이 문서 검토 대상에서 제외하거나 원문 학년을 다시 확인해 주세요.
                      </span>
                    </div>
                  )
                )}
                <div className={styles.tiny} style={{ marginTop: 4 }}>
                  수행평가 {subject.performanceEvaluation?.items.length ?? 0}개 · {exclusion ? `검토 대상 아님(확인한 값 ${reviewed}개는 보존)` : `검토 ${reviewed}/${subjectFields.length}`}
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
              {exclusion ? (
                editable && (
                  <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => onExclude(index, null)} data-testid={`review-subject-restore-${index}`}>
                    되돌리기
                  </button>
                )
              ) : (
                <>
                  {choose && options ? (
                    <SubjectSearchSelect
                      options={options.items}
                      value={subjectIds[index] ?? ''}
                      onChange={(value) => onSubjectId(index, value)}
                      label={`${subject.subjectName} 학업 과목`}
                      context={view.slot ? `고${view.slot.grade} · ${view.slot.semester}학기` : undefined}
                      catalogGrade={view.slot?.grade ?? null}
                      testId={`review-subject-select-${index}`}
                    />
                  ) : (
                    <span className={styles.tiny} data-testid={`review-subject-unavailable-${index}`}>
                      {loadState === 'loading' ? '과목 목록을 불러오는 중' : '과목 목록 없음'}
                    </span>
                  )}
                  <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => onOpenSubject(index)}>
                    검토하기
                  </button>
                  {editable && (
                    <button
                      type="button"
                      className={`${styles.buttonGhost} ${styles.small}`}
                      onClick={() => setExcluding({ index, reason: conflict ? 'OTHER_GRADE' : 'DUPLICATE', note: '' })}
                      data-testid={`review-subject-exclude-${index}`}
                    >
                      제외
                    </button>
                  )}
                </>
              )}
            </li>
          )
        })}
      </ul>

      {excluding && target && (
        <Modal
          title={`'${target.subjectName}'을(를) 이 문서 검토 대상에서 제외할까요?`}
          onRequestClose={() => setExcluding(null)}
          footer={
            <>
              <button type="button" className={styles.button} onClick={() => setExcluding(null)}>
                취소
              </button>
              <button
                type="button"
                className={styles.buttonPrimary}
                onClick={() => {
                  onExclude(excluding.index, { reason: excluding.reason, note: excluding.note.trim() ? excluding.note.trim() : null })
                  setExcluding(null)
                }}
                data-testid="review-subject-exclude-confirm"
              >
                제외하기
              </button>
            </>
          }
        >
          <div className={styles.excludeDialog} data-testid="review-subject-exclude-dialog">
            <p className={styles.lead} style={{ margin: 0 }}>
              <strong>삭제가 아니에요.</strong> 원문·AI 분석 결과·근거 위치는 그대로 두고, 이 문서({view.slot ? `고${view.slot.grade} ${view.slot.semester}학기` : '이 학년·학기'})의 수행평가·채점기준·월별 운영계획 검토와 확정·학생 공개에서만 빼요.
            </p>
            {targetDecided > 0 && (
              <p className={styles.tiny} role="note" style={{ margin: 0 }} data-testid="review-subject-exclude-impact">
                이 과목에서 확인·수정한 값 {targetDecided}개는 지우지 않고 보존해요. 제외하는 동안에는 확정에 들어가지 않고, 되돌리면 그대로 돌아와요.
              </p>
            )}
            {targetPublished > 0 && (
              <p className={styles.tiny} role="alert" style={{ margin: 0 }} data-testid="review-subject-exclude-published">
                이 과목의 확정값 {targetPublished}개가 지금 학생에게 공개 중이에요. 제외해도 공개 중인 값은 바로 바뀌지 않아요.
              </p>
            )}
            <fieldset className={styles.excludeReasons}>
              <legend>제외 사유</legend>
              {reasons.map((reason) => (
                <label key={reason}>
                  <input type="radio" name="exclude-reason" value={reason} checked={excluding.reason === reason} onChange={() => setExcluding({ ...excluding, reason })} />
                  {exclusionReasonLabel[reason]}
                </label>
              ))}
            </fieldset>
            <label className={styles.excludeNote}>
              <span>메모 (선택)</span>
              <input className={styles.input} maxLength={200} value={excluding.note} placeholder="예: 원문 2학년 과목 — 2학년 문서에서 검토" onChange={(event) => setExcluding({ ...excluding, note: event.target.value })} data-testid="review-subject-exclude-note" />
            </label>
          </div>
        </Modal>
      )}
    </div>
  )
}
