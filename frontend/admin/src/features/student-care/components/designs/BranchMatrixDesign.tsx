import { useState } from 'react'
import { studentCareApi } from '../../api/studentCareApi.ts'
import { attendanceLabel, buildCareSnapshot, submissionLabel, type DailyCareRecord } from '../../model/careSnapshot.ts'
import { followUpLabel, hoursMinutes, shortDate } from '../../model/format.ts'
import { loadFailure, useRemote } from '../../model/useRemote.ts'
import './BranchMatrixDesign.css'

interface Props {
  branchId: string
  version: number
  onOpenStudent: (id: string) => void
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const weekday = (date: string) => WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()]
const attendanceMark: Record<DailyCareRecord['attendance'], string> = { present: '●', absent: '—', unknown: '?', excluded: '·' }
const submissionMark: Record<DailyCareRecord['submission'], string> = { submitted: '✓', missing: '!', unknown: '?', excluded: '·' }

/** 학습관 날짜 보기: 한 지점의 모든 학생을 같은 날짜 축에서 읽는 FE 예시 매트릭스. */
export function BranchMatrixDesign({ branchId, version, onOpenStudent }: Props) {
  const [period, setPeriod] = useState<7 | 14>(7)
  const [search, setSearch] = useState('')
  const [attentionOnly, setAttentionOnly] = useState(false)
  const remote = useRemote(`branch-matrix/${branchId}`, async () => {
    const board = await studentCareApi.board(branchId)
    const details = await Promise.all(board.students.map(student => studentCareApi.detail(branchId, student.studentId)))
    return { board, details }
  }, version)

  if (loadFailure(remote)) return <div className="sc-design-branch sc-design-branch__state" role="alert">
    <p>학생 기록을 불러오지 못했습니다.</p>
    <button type="button" onClick={remote.reload}>다시 시도</button>
  </div>
  if (!remote.data) return <p className="sc-design-branch sc-design-branch__state" role="status">학생 기록을 불러오는 중</p>

  const { board, details } = remote.data
  const managing = new Map(board.inAdjustment.map(item => [item.studentId, item]))
  const rows = details.map(detail => {
    const snapshot = buildCareSnapshot(detail, 14)
    const active = managing.get(detail.student.studentId)
    const attention = snapshot.metrics.some(metric => metric.attention) && !snapshot.deferred
    return { student: detail.student, snapshot, attention,
      rank: active?.recheckDue ? 0 : attention ? 1 : active ? 2 : snapshot.deferred ? 3 : 4,
      status: active?.recheckDue ? followUpLabel(active.recheckDate,board.asOf) : attention ? '확인 필요' : active ? '관리 중' : snapshot.deferred ? '학습 기록 부족' : '—' }
  }).sort((a, b) => a.rank - b.rank || a.student.studentName.localeCompare(b.student.studentName, 'ko'))
  const query = search.trim().toLocaleLowerCase()
  const filtered = rows.filter(row => (!attentionOnly || row.attention || row.rank === 0) &&
    (!query || `${row.student.studentName} ${row.student.className ?? ''}`.toLocaleLowerCase().includes(query)))
  const dates = rows[0]?.snapshot.days.slice(-period).map(day => day.date) ?? []

  return <section className="sc-design-branch" aria-label="학습관 전체 학생 날짜별 기록" aria-busy={remote.status === 'loading'}>
    <div className="sc-design-branch__toolbar">
      <label className="sc-design-branch__search">학생 찾기
        <input type="search" placeholder="이름 또는 반" value={search} onChange={event => setSearch(event.target.value)} />
      </label>
      <label className="sc-design-branch__filter"><input type="checkbox" checked={attentionOnly} onChange={event => setAttentionOnly(event.target.checked)} />확인할 학생만</label>
      <div className="sc-design-branch__period" role="group" aria-label="날짜표 기간">
        {([7, 14] as const).map(days => <button type="button" key={days} aria-pressed={period === days} onClick={() => setPeriod(days)}>{days}일</button>)}
      </div>
    </div>
    <p className="sc-design-branch__result" role="status">{filtered.length} / {rows.length}명 · 최근 7일 요약</p>
    {rows.length === 0 ? <p className="sc-design-branch__state">이 학습관에 등록된 학생이 없습니다.</p>
      : filtered.length === 0 ? <div className="sc-design-branch__state"><p>조건에 맞는 학생이 없습니다.</p>
        <button type="button" onClick={() => { setSearch(''); setAttentionOnly(false) }}>검색·필터 초기화</button></div>
      : <div className="sc-design-branch__scroll" role="region" aria-label="학생별 날짜 기록표. 가로로 이동해 모든 날짜를 볼 수 있습니다." tabIndex={0}>
        <table className="sc-design-branch__table">
          <caption className="sc-visually-hidden">{board.branch.name}, {dates[0]}부터 {dates.at(-1)}까지. 각 날짜는 입실 기록과 계획 제출을 두 줄로 표시합니다. 요약 수치는 최근 7일 기준입니다.</caption>
          <thead><tr>
            <th scope="col" className="sc-design-branch__name-col">학생</th><th scope="col">케어 상태</th>
            <th scope="col" className="sc-design-branch__number">학습 시간<small>최근 7일</small></th>
            <th scope="col" className="sc-design-branch__number">미입실<small>최근 7일</small></th>
            <th scope="col" className="sc-design-branch__number">계획 미제출<small>최근 7일</small></th>
            {dates.map(date => <th scope="col" key={date} className="sc-design-branch__date"><span>{shortDate(date)}</span><small>{weekday(date)}</small></th>)}
          </tr></thead>
          <tbody>{filtered.map(({ student, snapshot, status, rank }) => {
            const recent = snapshot.days.slice(-7)
            const hasMinutes = recent.some(day => day.minutes !== null)
            const hasAttendance = recent.some(day => day.attendance === 'present' || day.attendance === 'absent')
            const hasSubmission = recent.some(day => day.submission === 'submitted' || day.submission === 'missing')
            return <tr key={student.studentId}>
              <th scope="row" className="sc-design-branch__name-col"><button type="button" className="sc-design-branch__student" onClick={() => onOpenStudent(student.studentId)}>
                <span>{student.studentName}<span aria-hidden="true"> ↗</span></span><small>{student.className || '반 미지정'}</small>
              </button><div className="sc-design-branch__compact">
                <small className={rank <= 1 ? 'sc-design-branch__missing' : ''}>{status}</small>
                <small>학습 {hasMinutes && snapshot.recent.minutes !== null ? hoursMinutes(snapshot.recent.minutes) : '기록 없음'}</small>
                <small>미입실 {hasAttendance ? `${snapshot.recent.notEntered}일` : '기록 없음'}</small>
                <small>미제출 {hasSubmission ? `${snapshot.recent.missingPlans}일` : '기록 없음'}</small>
              </div></th>
              <td><span className={`sc-design-branch__status${rank <= 1 ? ' sc-design-branch__status--attention' : ''}`}>{status}</span>
                {snapshot.deferred && <small>학습 기록 부족</small>}</td>
              <td className="sc-design-branch__number">{hasMinutes && snapshot.recent.minutes !== null ? hoursMinutes(snapshot.recent.minutes) : '기록 없음'}</td>
              <td className="sc-design-branch__number">{hasAttendance ? `${snapshot.recent.notEntered}일` : '기록 없음'}</td>
              <td className="sc-design-branch__number">{hasSubmission ? `${snapshot.recent.missingPlans}일` : '기록 없음'}</td>
              {snapshot.days.slice(-period).map(day => <td key={day.date} className="sc-design-branch__day">
                <span className={`sc-design-branch__attendance sc-design-branch__attendance--${day.attendance}`}><i aria-hidden="true">{attendanceMark[day.attendance]}</i>{attendanceLabel(day.attendance)}</span>
                <span className={`sc-design-branch__submission sc-design-branch__submission--${day.submission}`}><i aria-hidden="true">{submissionMark[day.submission]}</i>{submissionLabel(day.submission)}</span>
              </td>)}
            </tr>
          })}</tbody>
        </table>
      </div>}
  </section>
}
