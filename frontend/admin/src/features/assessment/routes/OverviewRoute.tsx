import { navigate, replaceSearch } from '../../../app/adminLocation.ts'
import { getOverview, listStudents, mockAsOfDate } from '../api/assessmentAdminApi.ts'
import type { AdminStudentSummary } from '../api/types.ts'
import { ListEmpty, RemoteView } from '../components/AdminParts.tsx'
import { BooksIcon, ChatIcon, ClipboardIcon, FileIcon, MonthlyPlanner, SparkleIcon, UploadIcon } from '../components/canonicalUi.ts'
import { SchoolYearFilters } from '../components/SchoolYearFilters.tsx'
import { useConfirmedTeachingPlan } from '../model/confirmedTeachingPlan.ts'
import { usePlanSchoolContext } from '../model/planSchoolContext.ts'
import review from '../review/review.module.css'
import dash from './overview.module.css'
import { dateTimeLabel, dDayLabel, daysUntil } from '../model/adminFormat.ts'
import { useRefreshOnReturn, useRemote } from '../model/useRemote.ts'
import { onPlanConfirmed, signalMatches } from '../model/planEvents.ts'
import { PendingList, TeachingPlanEmpty } from '../components/TeachingPlanEmpty.tsx'
import { useEffect } from 'react'
import styles from '../styles/assessmentAdmin.module.css'
import { paths } from './paths.ts'

// AD-01·17 전체 현황 (AM-01, A27-UX 재구성). Student Care 지표와 섞지 않는다 — 여기 숫자는 Assessment Entity에서만 계산한다.
// 하나의 학교·학년 Context(URL school·grade·semester)가 KPI·운영계획 Calendar·담당 학생·최근 활동에 함께 적용된다.
export function OverviewRoute({ search }: { search: URLSearchParams }) {
  const context = usePlanSchoolContext(search)
  const schoolId = context.schoolId
  const grade = Number(search.get('grade') ?? '1') || 1
  const asOfMonth = Number(mockAsOfDate.slice(5, 7))
  const semesterParam = Number(search.get('semester') ?? '')
  const semester = semesterParam === 1 || semesterParam === 2 ? semesterParam : asOfMonth >= 3 && asOfMonth <= 8 ? 1 : 2
  const overview = useRemote(() => getOverview({ schoolId: schoolId || undefined, grade }), [schoolId, grade])
  const students = useRemote(() => listStudents({ schoolId: schoolId || undefined, grade }), [schoolId, grade])
  const plan = useConfirmedTeachingPlan(schoolId, context.year, grade, semester)
  // A28-17: 다른 탭에서 확정한 뒤 돌아오면 KPI·운영계획·학생을 다시 조회(오래 열어 둔 화면의 '확정 전' 잔상 방지)
  useRefreshOnReturn(() => {
    overview.refresh()
    students.refresh()
    plan.refresh()
  })
  // A28-22: 확정 API 성공 신호(같은 탭·다른 관리자 탭)를 받으면 같은 학교·학년도·학년·학기면 바로 다시 조회(복귀 10초 제한과 무관)
  const refreshPlan = plan.refresh
  const refreshOverview = overview.refresh
  useEffect(
    () =>
      onPlanConfirmed((signal) => {
        if (!signalMatches(signal, schoolId, context.year, grade, semester)) return
        refreshPlan()
        refreshOverview()
      }),
    [schoolId, context.year, grade, semester, refreshPlan, refreshOverview],
  )

  const setParams = (entries: Record<string, string | null>) => {
    const next = new URLSearchParams(search)
    for (const [key, value] of Object.entries(entries)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    replaceSearch(next.toString())
  }

  const recent = overview.state.status === 'success' ? (overview.state.data.recentActivity ?? []) : null

  return (
    <div className={dash.page} data-testid="overview-dashboard">
      {/* [04] A27-UX: 탭 행과 필터 행을 분리한다(제목 + 여백). 필터는 KPI·Calendar·학생 현황에 함께 적용된다. */}
      <header className={dash.head}>
        <h2 className={dash.title}>전체 현황</h2>
      </header>
      <div className={dash.filters}>
        <SchoolYearFilters
          context={context}
          onChange={setParams}
          extra={
            <>
              <select className={review.select} aria-label="학년" value={grade} onChange={(event) => setParams({ grade: event.target.value })} data-testid="overview-grade">
                {[1, 2, 3].map((value) => (
                  <option key={value} value={value}>
                    고{value}
                  </option>
                ))}
              </select>
              <select className={review.select} aria-label="학기" value={semester} onChange={(event) => setParams({ semester: event.target.value })} data-testid="overview-semester">
                <option value={1}>1학기</option>
                <option value={2}>2학기</option>
              </select>
            </>
          }
        />
      </div>

      <RemoteView state={overview.state} label="Assessment 현황" onRetry={overview.reload}>
        {(data) => {
          const analysis = data.evaluationPlans.analysis
          return (
            <div className={dash.kpis} data-testid="overview-kpis">
              <button type="button" className={dash.kpi} onClick={() => navigate(paths.plans)}>
                <span className={dash.kpiText}>
                  <span className={dash.kpiLabel}>평가계획서</span>
                  <span className={dash.kpiValue}>
                    {data.evaluationPlans.documents}
                    <small>개 문서</small>
                  </span>
                  <span className={dash.kpiMeta}>{data.evaluationPlans.schools}개 학교 등록</span>
                </span>
                <span className={dash.kpiIcon} data-tone="blue" aria-hidden="true">
                  <FileIcon size={20} />
                </span>
              </button>
              <button type="button" className={dash.kpi} onClick={() => navigate(paths.analysis())} data-testid="overview-plan-analysis">
                <span className={dash.kpiText}>
                  <span className={dash.kpiLabel}>분석 · 검토</span>
                  <span className={dash.kpiValue}>
                    {data.evaluationPlans.reviewPending ?? (analysis ? analysis.reviewRequired + analysis.partial : 0)}
                    <small>건 검토 대기</small>
                  </span>
                  <span className={dash.kpiMeta}>{analysis ? `분석 전 ${analysis.notRequested} · 확정 ${data.evaluationPlans.evaluationConfirmed ?? 0} · 실패 ${analysis.failed}` : '분석 현황을 받지 못했어요'}</span>
                </span>
                <span className={dash.kpiIcon} data-tone="violet" aria-hidden="true">
                  <SparkleIcon size={20} />
                </span>
              </button>
              <button type="button" className={dash.kpi} onClick={() => navigate(paths.students)}>
                <span className={dash.kpiText}>
                  <span className={dash.kpiLabel}>학생 수행평가</span>
                  <span className={dash.kpiValue}>
                    {data.kpi.schoolAssessments}
                    <small>개</small>
                  </span>
                  <span className={dash.kpiMeta}>
                    담당 학생 {data.kpi.registeredStudents}명 · 심화 탐구 {data.kpi.enrichmentTasks}개
                  </span>
                </span>
                <span className={dash.kpiIcon} data-tone="teal" aria-hidden="true">
                  <ClipboardIcon size={20} />
                </span>
              </button>
              <button type="button" className={dash.kpi} onClick={() => navigate(`${paths.feedback}?status=PENDING`)}>
                <span className={dash.kpiText}>
                  <span className={dash.kpiLabel}>피드백 요청</span>
                  <span className={dash.kpiValue}>
                    {data.kpi.feedbackPending}
                    <small>건 답변 대기</small>
                  </span>
                  <span className={dash.kpiMeta}>{data.oldestPendingRequestedAt ? `가장 오래된 요청 ${dateTimeLabel(data.oldestPendingRequestedAt)}` : `전달 완료 ${data.kpi.feedbackDelivered}건`}</span>
                </span>
                <span className={dash.kpiIcon} data-tone="orange" aria-hidden="true">
                  <ChatIcon size={20} />
                </span>
              </button>
            </div>
          )
        }}
      </RemoteView>

      <div className={dash.main}>
        <section className={dash.card} aria-label="월별 운영계획" data-testid="overview-calendar">
          <div className={dash.cardHead}>
            <h2>
              {context.schoolName || '학교'} · 고{grade} {semester}학기 운영계획
            </h2>
            <button type="button" className={dash.linkButton} onClick={() => navigate(paths.monthly({ school: schoolId, year: context.year, grade, semester }))} data-testid="overview-open-monthly">
              크게 보기
            </button>
          </div>
          {!schoolId || !context.year ? (
            <p className={dash.muted}>{context.loading ? '학교를 불러오는 중이에요.' : '평가계획서가 등록된 학교·학년도가 없어요.'}</p>
          ) : plan.state.status === 'loading' ? (
            <p className={dash.muted} aria-busy="true">
              운영계획을 불러오는 중이에요.
            </p>
          ) : plan.state.status === 'error' ? (
            <div role="alert" className={dash.muted}>
              운영계획을 불러오지 못했어요.{' '}
              <button type="button" className={dash.linkButton} onClick={plan.reload}>
                다시 시도
              </button>
            </div>
          ) : (
            <>
            {plan.state.data.confirmed > 0 && <PendingList data={plan.state.data} />}
            <MonthlyPlanner
              key={`${schoolId}-${context.year}-${grade}-${semester}`}
              academicYear={context.year}
              semester={semester}
              entries={plan.state.data.entries}
              mode="student"
              adminBands
              emptyState={<TeachingPlanEmpty data={plan.state.data} grade={grade} semester={semester} testId="overview-calendar-empty" />}
            />
            </>
          )}
        </section>

        <aside className={dash.side} aria-label="보조 정보">
          <section className={dash.card} aria-label="바로가기">
            <div className={dash.cardHead}>
              <h2>바로가기</h2>
            </div>
            <ul className={dash.shortcuts}>
              <li>
                <button type="button" onClick={() => navigate(paths.plans)}>
                  <span className={dash.shortcutIcon} data-tone="blue" aria-hidden="true">
                    <UploadIcon size={15} />
                  </span>
                  평가계획서 등록·원본 관리
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate(paths.analysis())}>
                  <span className={dash.shortcutIcon} data-tone="violet" aria-hidden="true">
                    <SparkleIcon size={15} />
                  </span>
                  분석·검토 이어하기
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate(`${paths.feedback}?status=PENDING`)}>
                  <span className={dash.shortcutIcon} data-tone="orange" aria-hidden="true">
                    <ChatIcon size={15} />
                  </span>
                  답변 대기 피드백
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate(paths.references)}>
                  <span className={dash.shortcutIcon} data-tone="teal" aria-hidden="true">
                    <BooksIcon size={15} />
                  </span>
                  관리자 참고자료실
                </button>
              </li>
            </ul>
          </section>
          <section className={dash.card} aria-label="최근 Assessment 활동" data-testid="overview-recent">
            <div className={dash.cardHead}>
              <h2>최근 Assessment 활동</h2>
              {/* A28-43: 점 색은 활동 종류 묶음(확정 = 평가정보·운영계획 공통). 색만으로 전달하지 않도록 범례 글자를 함께 둔다(행의 활동명도 그대로) */}
              <ul className={dash.activityLegend} aria-label="점 색 의미" data-testid="overview-activity-legend">
                {activityLegend.map(([tone, label]) => (
                  <li key={tone}>
                    <span className={dash.activityDot} data-tone={tone} aria-hidden="true" />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
            {recent === null ? (
              <p className={dash.muted}>{overview.state.status === 'error' ? '활동을 불러오지 못했어요.' : '활동을 불러오는 중이에요.'}</p>
            ) : recent.length === 0 ? (
              <p className={dash.muted}>아직 기록된 활동이 없어요.</p>
            ) : (
              <ul className={dash.activity}>
                {recent.map((activity, index) => {
                  const target = activityTarget(activity)
                  const body = (
                    <>
                      <span className={dash.activityDot} data-tone={activityTone(activity.type)} aria-hidden="true" />
                      <span className={dash.activityText}>
                        <span className={dash.activityTitle}>
                          {activityLabel[activity.type] ?? '기타 활동'}
                          {activity.title ? ` · ${activity.title}` : ''}
                        </span>
                        <span className={dash.activityMeta}>
                          {dateTimeLabel(activity.at)}
                          {activity.detail ? ` · ${activityDetail(activity.type, activity.detail)}` : ''}
                        </span>
                      </span>
                    </>
                  )
                  return (
                    <li key={`${activity.type}-${activity.at}-${index}`} data-testid="overview-activity">
                      {target ? (
                        <button type="button" className={dash.activityRow} onClick={() => navigate(target)}>
                          {body}
                        </button>
                      ) : (
                        <div className={dash.activityRow}>{body}</div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <section className={dash.card} aria-label="담당 학생 현황">
        <div className={dash.cardHead}>
          <h2>담당 학생 현황</h2>
          <button type="button" className={dash.linkButton} onClick={() => navigate(paths.students)}>
            전체 보기
          </button>
        </div>
        <RemoteView state={students.state} label="담당 학생" onRetry={students.reload}>
          {(data) =>
            data.items.length === 0 ? (
              <ListEmpty filtered title={`${context.schoolName || '이 학교'} 고${grade} 담당 학생이 없어요`} onReset={() => setParams({ grade: null })} />
            ) : (
              <StudentSummaryTable items={data.items} />
            )
          }
        </RemoteView>
      </section>
    </div>
  )
}

/** 활동 종류별 점 색 (정보용 포인트: 평가계획서 파랑, 분석 보라, 확정 초록, 피드백 주황) */
/** A28-43 범례: activityTone 과 같은 묶음. 확정(청록)은 평가정보 확정·운영계획 확정 공통이다 */
const activityLegend: [string, string][] = [
  ['blue', '등록'],
  ['violet', '분석'],
  ['teal', '확정(평가정보·운영계획)'],
  ['orange', '피드백'],
]

function activityTone(type: string): string {
  if (type.startsWith('FEEDBACK')) return 'orange'
  if (type === 'PLAN_ANALYZED') return 'violet'
  if (type.endsWith('CONFIRMED')) return 'teal'
  return 'blue'
}

/** 활동 → 이동할 화면. 평가계획서 활동은 결과 조회·분석 목록으로, 피드백은 피드백 관리로 */
function activityTarget(activity: { type: string; planId: string | null; revisionId: string | null }): string | null {
  if (activity.type.startsWith('FEEDBACK')) return paths.feedback
  if (!activity.planId || !activity.revisionId) return null
  if (activity.type === 'PLAN_UPLOADED') return paths.analysis({ plan: activity.planId })
  return paths.planResult(activity.planId, activity.revisionId)
}

export function StudentSummaryTable({ items }: { items: AdminStudentSummary[] }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">학생</th>
            <th scope="col">학교 수행평가</th>
            <th scope="col">다가오는 마감</th>
            <th scope="col">심화 탐구</th>
            <th scope="col">피드백 요청</th>
            <th scope="col">최근 기록</th>
          </tr>
        </thead>
        <tbody>
          {items.map(({ student, activity, nextDeadline, lastActivityAt }) => {
            const school = activity.schoolAssessment
            const task = activity.enrichmentTask
            const total = school.beforeStart + school.inProgress + school.completed
            const taskTotal = task.beforeStart + task.inProgress + task.completed
            const feedbackTotal = activity.feedback.pending + activity.feedback.delivered
            return (
              <tr key={student.studentId} data-clickable="true" onClick={() => navigate(paths.student(student.studentId))}>
                <td>
                  <button
                    type="button"
                    className={styles.rowButton}
                    onClick={(event) => {
                      event.stopPropagation()
                      navigate(paths.student(student.studentId))
                    }}
                  >
                    <span className={styles.cellTitle}>{student.displayName}</span>
                    <span className={styles.cellSub}>
                      {student.school.name} {student.grade}학년
                    </span>
                  </button>
                </td>
                <td>{total ? `${total}개 · 진행 ${school.inProgress} · 완료 ${school.completed}` : '—'}</td>
                <td>
                  {nextDeadline ? (
                    <span className={`${styles.cellClamp} ${daysUntil(nextDeadline.deadlineDate, mockAsOfDate) <= 7 ? styles.danger : ''}`}>
                      {dDayLabel(nextDeadline.deadlineDate, mockAsOfDate)} · {nextDeadline.title}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{taskTotal ? `진행 ${task.inProgress} · 완료 ${task.completed}` : '—'}</td>
                <td>{feedbackTotal ? `대기 ${activity.feedback.pending} · 완료 ${activity.feedback.delivered}` : '—'}</td>
                <td>{dateTimeLabel(lastActivityAt)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const activityLabel: Record<string, string> = {
  PLAN_UPLOADED: '평가계획서 등록',
  PLAN_ANALYZED: '분석 결과 저장',
  PLAN_CONFIRMED: '평가정보 확정',
  TEACHING_PLAN_CONFIRMED: '운영계획 확정',
  FEEDBACK_REQUESTED: '피드백 요청',
  FEEDBACK_DELIVERED: '피드백 전달',
}

const analysisDetail: Record<string, string> = { REVIEW_REQUIRED: '검토 필요', PARTIAL: '일부 분석', COMPLETED: '분석 완료', FAILED: '분석 실패' }

function activityDetail(type: string, detail: string): string {
  if (type === 'PLAN_ANALYZED') return analysisDetail[detail] ?? detail
  if (type.startsWith('FEEDBACK')) return detail === 'SCHOOL_ASSESSMENT' ? '학교 수행평가' : detail
  return detail
}
