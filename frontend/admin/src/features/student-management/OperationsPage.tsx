import type { ScreenLoadState } from '../../app/useScreenLoad.ts'
import { ErrorState, Kpi, LoadingState, NoticeState } from '../../components/AdminUi.tsx'
import ui from '../../components/AdminUi.module.css'
import type { AdminState } from '../../store/adminStore.ts'
import { PARENT_REPORT_PERIOD } from '../../fixtures/adminRecords.fixture.ts'
import { DEADLINE_SOON_DAYS, LONG_WAIT_HOURS } from '../../read-model/feedbackQueue.ts'
import { isActiveTask } from '../../read-model/studentInsights.ts'
import { computeOperationsAlerts, computeOperationsKpi } from '../../read-model/operations.ts'
import { daysUntil, formatDday, formatSnapshotLabel } from '../../read-model/time.ts'
import { student360Path, taskInspectorPath } from './routes/paths.ts'

/*
 * Operations Dashboard (api-contract §39). 9개 KPI · Alert 모두 같은 Admin State에서 계산한다. (수동 Counter 없음)
 * Mockup이 없어 Feedback Dashboard / Today Board와 같은 KPI · 목록 구조를 쓴다. 상담 관련 KPI / Alert는 두지 않는다.
 */

export function OperationsPage({ state, load, onRetry, onNavigate }: { state: AdminState; load: ScreenLoadState; onRetry: () => void; onNavigate: (href: string) => void }) {
  return (
    <div className={ui.page} aria-busy={load.status === 'loading'}>
      <header className={ui.headerText}>
        <h1 className={ui.title}>Operations</h1>
        <p className={ui.lead}>{formatSnapshotLabel()} 기준 · 학생 · 수행평가 · 검토 Queue · Report 상태에서 계산한 운영 지표예요.</p>
      </header>
      {load.status === 'loading' && <LoadingState label="운영 지표를 불러오는 중이에요." />}
      {load.status === 'error' && <ErrorState title="운영 지표를 불러오지 못했어요." onRetry={onRetry} />}
      {load.status === 'ready' && render(load.empty)}
    </div>
  )

  function render(empty: boolean) {
    if (empty) return <NoticeState title="집계할 데이터가 없어요." />
    const kpi = computeOperationsKpi(state)
    const alerts = computeOperationsAlerts(state)
    const students = new Map(state.students.map((item) => [item.studentId, item]))
    // Deadline Risk KPI와 같은 조건 (진행 중 Task 중 D-3 이내)
    const riskTasks = state.tasks
      .filter((task) => isActiveTask(task) && daysUntil(task.deadlineDate) >= 0 && daysUntil(task.deadlineDate) <= DEADLINE_SOON_DAYS)
      .sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate))
    const unsent = state.parentReports.filter((item) => item.period === PARENT_REPORT_PERIOD && item.status !== 'Sent')
    const drill: { label: string; href: string }[] = [
      { label: `Task Feedback Pending ${kpi.taskFeedbackPending}건 → Queue (수행평가)`, href: '/feedback?type=task' },
      { label: `Activity Feedback Pending ${kpi.activityFeedbackPending}건 → Queue (성장활동)`, href: '/feedback?type=activity' },
      { label: `${LONG_WAIT_HOURS}h 초과 ${kpi.queueOver48Hours}건 → Queue (${LONG_WAIT_HOURS}시간 초과)`, href: '/feedback?waiting=over48' },
      { label: `오늘 학습 기록 ${kpi.studentsWithStudyRecordToday}명 → Today Board (오늘 순공 적은 순)`, href: '/today?sort=study' },
      { label: '관리 필요 학생 → Today Board (관리 필요)', href: '/today?scope=attention' },
    ]
    return (
      <>
        <section aria-labelledby="ops-students">
          <h2 id="ops-students" className={`${ui.subTitle} ${ui.muted}`}>
            학생 · 학습
          </h2>
          <dl className={ui.kpis} data-columns="3">
            <Kpi label="등록 학생" value={kpi.registeredStudents} note="Extension 대상 기관 학생" />
            <Kpi label="오늘 학습 기록 발생" value={kpi.studentsWithStudyRecordToday} note="기존 Study Timer 오늘 순공 기록이 있는 학생" />
            <Kpi label="Parent Report 미발송" value={kpi.parentReportUnsent} note="9월 Report 중 발송 전" tone={kpi.parentReportUnsent > 0 ? 'warning' : undefined} />
          </dl>
        </section>
        <section aria-labelledby="ops-tasks">
          <h2 id="ops-tasks" className={`${ui.subTitle} ${ui.muted}`}>
            수행평가 · 검토
          </h2>
          <dl className={ui.kpis} data-columns="3">
            <Kpi label="진행 중 Task" value={kpi.activeTasks} note="최종 제출 전 · 보류 제외" />
            <Kpi label="Deadline Risk" value={kpi.deadlineRisk} note={`진행 중 Task 중 D-${DEADLINE_SOON_DAYS} 이내`} tone={kpi.deadlineRisk > 0 ? 'negative' : undefined} />
            <Kpi label="Task Feedback Pending" value={kpi.taskFeedbackPending} note="수행평가 검토 + 주제 검토" />
            <Kpi label="Activity Feedback Pending" value={kpi.activityFeedbackPending} note="학생이 요청한 활동 피드백" />
            <Kpi label="Queue 평균 첫 검토시간" value={kpi.averageFirstReviewHours === null ? '기록 없음' : `${kpi.averageFirstReviewHours}시간`} note="전달된 검토의 Queue 진입 → 전달" />
            <Kpi label={`${LONG_WAIT_HOURS}h 초과 Queue`} value={kpi.queueOver48Hours} note="지금 Queue에서 오래 기다린 항목" tone={kpi.queueOver48Hours > 0 ? 'negative' : undefined} />
          </dl>
        </section>
        <section className={ui.section} aria-labelledby="ops-drill">
          <h2 id="ops-drill" className={ui.subTitle}>
            원인 확인
          </h2>
          <ul className={ui.badgeList}>
            {drill.map((item) => (
              <li key={item.href}>
                <button type="button" className={`${ui.secondaryButton} ${ui.smallButton}`} onClick={() => onNavigate(item.href)}>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </section>
        <div className={ui.grid2}>
          <section className={ui.section} aria-labelledby="ops-risk">
            <h2 id="ops-risk" className={ui.subTitle}>
              Deadline Risk Task {riskTasks.length}
            </h2>
            {riskTasks.length === 0 ? (
              <p className={ui.muted}>D-{DEADLINE_SOON_DAYS} 이내 진행 중 Task가 없어요.</p>
            ) : (
              <div className={ui.tableScroll}>
                <table className={ui.table} data-compact="true">
                  <caption className="lh-visually-hidden">Deadline Risk Task {riskTasks.length}개 (마감 가까운 순)</caption>
                  <thead>
                    <tr>
                      <th scope="col">Task</th>
                      <th scope="col">학생</th>
                      <th scope="col">마감</th>
                      <th scope="col">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riskTasks.map((task) => (
                      <tr key={task.taskId}>
                        <th scope="row">
                          <button type="button" className={ui.linkButton} onClick={() => onNavigate(taskInspectorPath(task.taskId))}>
                            {task.title}
                            <span className="lh-visually-hidden"> Task 상세 보기</span>
                          </button>
                        </th>
                        <td className={ui.nowrap}>{students.get(task.studentId)?.displayName}</td>
                        <td className={ui.nowrap}>{formatDday(daysUntil(task.deadlineDate))}</td>
                        <td>{task.stageStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className={ui.section} aria-labelledby="ops-unsent">
            <h2 id="ops-unsent" className={ui.subTitle}>
              Parent Report 미발송 {unsent.length}
            </h2>
            <p className={ui.cellSub}>Report 편집 · 발송은 Parent Progress 범위예요. 여기서는 학생 상태만 확인해요.</p>
            {unsent.length === 0 ? (
              <p className={ui.muted}>미발송 Report가 없어요.</p>
            ) : (
              <ul className={ui.list}>
                {unsent.map((report) => (
                  <li key={report.parentReportId} className={ui.listItem}>
                    <button type="button" className={ui.linkButton} onClick={() => onNavigate(student360Path(report.studentId, 'reports'))}>
                      {students.get(report.studentId)?.displayName}
                      <span className="lh-visually-hidden"> Student 360 Reports 보기</span>
                    </button>
                    <span className={ui.cellSub}>9월 Report · {report.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <section className={ui.section} aria-labelledby="ops-alerts">
          <h2 id="ops-alerts" className={ui.sectionTitle}>
            Alert {alerts.length}
          </h2>
          {alerts.length === 0 ? (
            <NoticeState title="지금 확인할 Alert가 없어요." />
          ) : (
            <ul className={ui.list}>
              {alerts.map((alert) => (
                <li key={alert.kind} className={ui.listItem}>
                  <span className={ui.cellMain}>{alert.title}</span>
                  <span>{alert.detail}</span>
                  <button type="button" className={`${ui.secondaryButton} ${ui.smallButton}`} style={{ alignSelf: 'flex-start' }} onClick={() => onNavigate(alert.href)}>
                    확인하러 가기<span className="lh-visually-hidden">: {alert.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </>
    )
  }
}
