import { replaceSearch } from '../../../app/adminLocation.ts'
import { isAdminMockDataSource } from '../api/assessmentAdminApi.ts'
import { MonthlyPlanner } from '../components/canonicalUi.ts'
import { useConfirmedTeachingPlan } from '../model/confirmedTeachingPlan.ts'
import { SchoolYearFilters } from '../components/SchoolYearFilters.tsx'
import { usePlanSchoolContext } from '../model/planSchoolContext.ts'
import { useRefreshOnReturn } from '../model/useRemote.ts'
import { onPlanConfirmed, signalMatches } from '../model/planEvents.ts'
import { PendingList, TeachingPlanEmpty } from '../components/TeachingPlanEmpty.tsx'
import { useEffect } from 'react'
import review from '../review/review.module.css'

// A27-UX 월별 운영계획 독립 탭. 학교·학년도·학년·학기를 골라, 서버에 '확정'된 운영계획 행만 달력에 놓는다.
// 원천: §39-6 teaching-plan-review(최신 확정 버전, 제외 행 빼기) + §39 subjects(과목 이름). 새 API·화면용 Counter 없음.
// 확정 전 후보는 여기 보이지 않는다 — 후보 검토는 분석 탭의 검토 단계에서 한다.
export function MonthlyPlanTabRoute({ search }: { search: URLSearchParams }) {
  const context = usePlanSchoolContext(search)
  const { schoolId, year } = context
  const grade = Number(search.get('grade') ?? '1') || 1
  const semester = Number(search.get('semester') ?? '1') === 2 ? 2 : 1
  const setParams = (entries: Record<string, string | null>) => {
    const next = new URLSearchParams(search)
    for (const [key, value] of Object.entries(entries)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    replaceSearch(next.toString())
  }

  const entries = useConfirmedTeachingPlan(schoolId, year, grade, semester)
  useRefreshOnReturn(entries.refresh)
  // A28-22: 확정 신호(같은 탭·다른 관리자 탭)면 바로 다시 조회
  const refreshEntries = entries.refresh
  useEffect(() => onPlanConfirmed((signal) => signalMatches(signal, schoolId, year, grade, semester) && refreshEntries()), [schoolId, year, grade, semester, refreshEntries])

  return (
    <div className={review.listPage} data-testid="monthly-plan-tab">
      <div className={review.listHead}>
        <h2>월별 운영계획</h2>
      </div>
      <SchoolYearFilters
        context={context}
        onChange={setParams}
        extra={
          <>
            <select className={review.select} aria-label="학년" value={grade} onChange={(event) => setParams({ grade: event.target.value })} data-testid="monthly-grade">
              {[1, 2, 3].map((value) => (
                <option key={value} value={value}>
                  고{value}
                </option>
              ))}
            </select>
            <select className={review.select} aria-label="학기" value={semester} onChange={(event) => setParams({ semester: event.target.value })} data-testid="monthly-semester">
              <option value={1}>1학기</option>
              <option value={2}>2학기</option>
            </select>
          </>
        }
      />
      <p className={review.sourceNote}>확정된 운영계획만 · 주차만 있는 계획은 &lsquo;잠정&rsquo;(날짜 아님)</p>
      {isAdminMockDataSource ? (
        <div className={review.empty}>
          <strong>시연 데이터에는 확정된 운영계획이 없어요</strong>
        </div>
      ) : !year ? (
        <div className={review.empty}>
          <strong>평가계획서가 등록된 학년도가 없어요</strong>
        </div>
      ) : entries.state.status === 'loading' ? (
        <div className={review.empty} aria-busy="true">
          <strong>운영계획을 불러오는 중이에요</strong>
        </div>
      ) : entries.state.status === 'error' ? (
        <div className={review.empty} role="alert">
          <strong>운영계획을 불러오지 못했어요</strong>
          <span className={review.muted}>{entries.state.error.message}</span>
          <button type="button" className={review.button} onClick={entries.reload}>
            다시 시도
          </button>
        </div>
      ) : (
        <>
        {entries.state.data.confirmed > 0 && <PendingList data={entries.state.data} />}
        <MonthlyPlanner
          key={`${schoolId}-${year}-${grade}-${semester}`}
          academicYear={year ?? 0}
          semester={semester}
          entries={entries.state.data.entries}
          mode="student"
          adminBands
          emptyState={<TeachingPlanEmpty data={entries.state.data} grade={grade} semester={semester} testId="monthly-empty" />}
        />
        </>
      )}
    </div>
  )
}
