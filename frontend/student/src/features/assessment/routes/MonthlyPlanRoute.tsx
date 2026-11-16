import { useNavigate } from 'react-router'
import { getEvaluationPlanTeachingPlan, listEvaluationPlans } from '../api/evaluationPlansApi.ts'
import type { AcademicContext, EvaluationPlan, StudentTeachingPlan } from '../api/types.ts'
import { CalendarIcon, InfoIcon } from '../components/AssessmentIcons.tsx'
import { EmptyState, ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { MonthlyPlanner } from '../components/teaching-plan/MonthlyPlanner.tsx'
import { entryFromRow, type TeachingPlanEntry } from '../components/teaching-plan/teachingPlanPlacement.ts'
import { termLabel } from '../model/academicTerm.ts'
import { useAssessmentWorkspace } from '../model/assessmentWorkspace.ts'
import { useApiQuery } from '../model/useApiQuery.ts'
import styles from './EvaluationPlansRoute.module.css'
import { evaluationPlanOriginalPath } from './paths.ts'

// 학생 월별 교수·학습 운영계획 (A6, api-contract.md §10-1-2 DRAFT).
// - 관리자가 확정한 운영계획 행만 보여 준다(후보·초안 없음). 문서가 공개됐어도 운영계획이 확정 전이면 '아직 확정 전'으로 안내한다(오류 아님).
// - 날짜는 원문 정밀도 그대로(공용 MonthlyPlanner 규칙): 날짜·주차·월·학기 주차·시기 미정을 구분하고 연도를 추정하지 않는다.
// - 운영계획 행은 학교 수행평가 일정이 아니다(수행평가로 바꾸지 않는다).

type Loaded = { plan: EvaluationPlan; teaching: StudentTeachingPlan }

const subjectNameOf = (context: AcademicContext | undefined, subjectId: string) =>
  context?.subjects.find((subject) => subject.subjectId === subjectId)?.name ??
  context?.catalogSubjects?.find((subject) => subject.subjectId === subjectId)?.name ??
  `과목 코드 ${subjectId}`

export function MonthlyPlanRoute() {
  const { terms, selectedContext } = useAssessmentWorkspace()
  const navigate = useNavigate()
  const slot = selectedContext
    ? { schoolId: selectedContext.school.schoolId, academicYear: selectedContext.academicYear, grade: selectedContext.grade, semester: selectedContext.semester }
    : null
  const loaded = useApiQuery(`monthly-plan:${slot ? `${slot.schoolId}|${slot.academicYear}|${slot.grade}|${slot.semester}` : 'none'}`, () =>
    slot
      ? listEvaluationPlans(slot).then((list) =>
          Promise.all(list.items.map((plan) => getEvaluationPlanTeachingPlan(plan.planId).then((teaching): Loaded => ({ plan, teaching })))),
        )
      : new Promise<never>(() => {}),
  )

  const header = (
    <header className={styles.header}>
      <h1 className={styles.title}>월별 운영계획</h1>
      <p className={styles.subtitle}>
        {selectedContext ? `${selectedContext.school.name} · ${termLabel(selectedContext)} · ` : ''}
        학교 교수·학습 운영계획 중 관리자가 원문과 대조해 확정한 내용만 보여요.
      </p>
    </header>
  )

  if (terms.status === 'error' && terms.error) {
    return (
      <main className={styles.page}>
        {header}
        <ErrorState title="학업 정보를 불러오지 못했어요" error={terms.error} onRetry={terms.retry} />
      </main>
    )
  }
  if (!selectedContext) {
    return (
      <main className={styles.page}>
        {header}
        {terms.status === 'loading' ? <LoadingRows rows={3} label="학업 정보를 불러오는 중" /> : <EmptyState title="학업 정보가 없어요" description="학교·학년·학기 정보가 있어야 운영계획을 볼 수 있어요." />}
      </main>
    )
  }
  if (loaded.status === 'error' && loaded.error) {
    return (
      <main className={styles.page}>
        {header}
        <ErrorState title="운영계획을 불러오지 못했어요" error={loaded.error} onRetry={loaded.retry} />
      </main>
    )
  }
  if (!loaded.data) {
    return (
      <main className={styles.page}>
        {header}
        <LoadingRows rows={4} label="운영계획을 불러오는 중" />
      </main>
    )
  }

  const withRows = loaded.data.filter((item) => item.teaching.status === 'CONFIRMED' && item.teaching.rows.length > 0)
  return (
    <main className={styles.page} data-testid="student-monthly-plan" style={{ maxWidth: 'calc(1200px + var(--as-content-inset) * 2)' }}>
      {header}
      <p className={styles.notice}>
        <InfoIcon size={14} />
        원문에 적힌 만큼만 보여요: 날짜가 없으면 주차·월로, 시기가 없으면 &lsquo;달을 정할 수 없는 계획&rsquo;으로 따로 모아요. 수업 운영 계획이며 수행평가 일정과는 달라요.
      </p>
      {loaded.data.length === 0 ? (
        <EmptyState title="아직 확정된 평가계획서가 없어요" description="관리자가 이 학기 평가계획서를 확인하면 운영계획도 여기에 보여요." />
      ) : withRows.length === 0 ? (
        <div data-testid="monthly-plan-not-confirmed">
          <EmptyState title="운영계획이 아직 확정되지 않았어요" description="평가계획서는 공개됐지만 월별 운영계획은 관리자가 확인하는 중이에요. 원문에서 먼저 확인할 수 있어요." />
        </div>
      ) : (
        withRows.map(({ plan, teaching }) => {
          const entries: TeachingPlanEntry[] = teaching.rows.map((row) =>
            entryFromRow(row, { id: `${row.subjectId}|${row.rowKey}`, subjectName: subjectNameOf(selectedContext, row.subjectId), status: 'CONFIRMED', academicYear: teaching.academicYear }),
          )
          return (
            <section key={plan.planId} className={styles.plan} aria-label={`${plan.fileName} 운영계획`} data-testid="monthly-plan-section">
              <div className={styles.planHead}>
                <div className={styles.planTitle}>
                  <CalendarIcon size={16} />
                  <span className={styles.planName}>{plan.fileName}</span>
                </div>
                <span className={styles.meta}>
                  확정 {teaching.rows.length}개 계획{teaching.confirmedAt ? ` · ${new Date(teaching.confirmedAt).toLocaleDateString('ko-KR')} 확정` : ''}
                </span>
              </div>
              <MonthlyPlanner
                academicYear={teaching.academicYear}
                semester={teaching.semester}
                entries={entries}
                mode="student"
                onOpenSource={plan.file?.previewAvailable ? (page) => navigate(evaluationPlanOriginalPath(plan.planId, page)) : undefined}
                emptyState={<span>확정된 계획이 없어요.</span>}
              />
            </section>
          )
        })
      )}
    </main>
  )
}
