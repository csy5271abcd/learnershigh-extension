import { navigate, replaceSearch } from '../../../app/adminLocation.ts'
import { getOverview, listStudents, mockAsOfDate } from '../api/assessmentAdminApi.ts'
import type { AdminStudentSummary } from '../api/types.ts'
import { ListEmpty, RemoteView } from '../components/AdminParts.tsx'
import { dateTimeLabel, dDayLabel, daysUntil } from '../model/adminFormat.ts'
import { useRemote } from '../model/useRemote.ts'
import styles from '../styles/assessmentAdmin.module.css'
import { paths } from './paths.ts'

// AD-01·17 전체 현황 (AM-01). Student Care 지표와 섞지 않는다 — 여기 숫자는 Assessment Entity에서만 계산한다.
export function OverviewRoute({ search }: { search: URLSearchParams }) {
  const schoolId = search.get('school') ?? ''
  const grade = Number(search.get('grade') ?? '') || undefined
  const overview = useRemote(() => getOverview({ schoolId: schoolId || undefined, grade }), [schoolId, grade])
  const students = useRemote(() => listStudents({ schoolId: schoolId || undefined, grade }), [schoolId, grade])
  const allStudents = useRemote(() => listStudents(), [])
  const schoolOptions = allStudents.state.status === 'success' ? [...new Map(allStudents.state.data.items.map((item) => [item.student.school.schoolId, item.student.school.name]))] : []

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(search)
    if (value) next.set(key, value)
    else next.delete(key)
    replaceSearch(next.toString())
  }

  return (
    <div className={styles.body}>
      <RemoteView state={overview.state} label="Assessment 현황" onRetry={overview.reload}>
        {(data) => (
          <div className={styles.kpis}>
            <button type="button" className={styles.kpi} onClick={() => navigate(paths.plans)}>
              <span className={styles.kpiLabel}>등록 학교 · 평가계획서</span>
              <span className={styles.kpiValue}>
                {data.evaluationPlans.schools}개 학교 · PDF {data.evaluationPlans.documents}개
              </span>
              <span className={styles.kpiMeta}>이번 학년도 등록 기준 · 학년·학기별 현황은 학교별 평가계획서에서 확인</span>
            </button>
            <button type="button" className={styles.kpi} onClick={() => navigate(`${paths.feedback}?status=PENDING`)}>
              <span className={styles.kpiLabel}>피드백 요청</span>
              <span className={styles.kpiValue}>답변 대기 {data.kpi.feedbackPending}건</span>
              <span className={styles.kpiMeta}>
                {data.oldestPendingRequestedAt ? `가장 오래된 요청 · ${dateTimeLabel(data.oldestPendingRequestedAt)}` : '기다리는 요청이 없어요'} · 전달 완료 {data.kpi.feedbackDelivered}건
              </span>
            </button>
            <button type="button" className={styles.kpi} onClick={() => navigate(paths.mockExams)}>
              <span className={styles.kpiLabel}>심화 탐구 콘텐츠</span>
              <span className={styles.kpiValue}>
                모의고사 소재 {data.contentCounts.mockExamMaterials} · 스크랩 {data.contentCounts.scraps}
              </span>
              <span className={styles.kpiMeta}>공개 중인 모의고사 탐구 소재 · 관리자 참고자료 스크랩(학생 비공개)</span>
            </button>
          </div>
        )}
      </RemoteView>

      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>담당 학생 현황</h2>
      </div>
      <div className={styles.toolbar}>
        <select className={styles.select} aria-label="학교" value={schoolId} onChange={(event) => setFilter('school', event.target.value)}>
          <option value="">전체 학교</option>
          {schoolOptions.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <select className={styles.select} aria-label="학년" value={grade ?? ''} onChange={(event) => setFilter('grade', event.target.value)}>
          <option value="">전체 학년</option>
          {[1, 2, 3].map((value) => (
            <option key={value} value={value}>
              {value}학년
            </option>
          ))}
        </select>
        <p className={styles.muted}>수행평가 · 심화 탐구 · 피드백 상태는 서로 따로 관리돼요. 이번 학기({mockAsOfDate} 기준) 수행평가만 셉니다.</p>
      </div>
      <RemoteView state={students.state} label="담당 학생" onRetry={students.reload}>
        {(data) =>
          data.items.length === 0 ? (
            <ListEmpty filtered={Boolean(schoolId || grade)} title="담당 학생이 없어요" onReset={() => replaceSearch('')} />
          ) : (
            <StudentSummaryTable items={data.items} />
          )
        }
      </RemoteView>
    </div>
  )
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
