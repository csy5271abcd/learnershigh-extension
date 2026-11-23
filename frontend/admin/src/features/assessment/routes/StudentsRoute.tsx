import { useState } from 'react'
import { navigate, replaceSearch } from '../../../app/adminLocation.ts'
import { getStudentFilterOptions, listStudents } from '../api/assessmentAdminApi.ts'
import { ListEmpty, RemoteView, SearchBox } from '../components/AdminParts.tsx'
import { EmptyState } from '../components/canonicalUi.ts'
import { dateTimeLabel, initialsOf } from '../model/adminFormat.ts'
import { useRemote } from '../model/useRemote.ts'
import styles from '../styles/assessmentAdmin.module.css'
import { paths } from './paths.ts'
import { StudentDetailPane } from './StudentDetailRoute.tsx'

// AD-02 학생 Assessment (목업 AM-02): 왼쪽 담당 학생 목록 + 오른쪽 선택한 학생의 기록.
// 담당 범위 안의 학생만 보인다 (범위 검사는 Stage 2 서버). 피드백 요청이 없어도 기록을 볼 수 있고, 열람만으로 요청이 생기지 않는다.
export function StudentsRoute({ studentId, search }: { studentId: string | null; search: URLSearchParams }) {
  const applied = search.get('q') ?? ''
  const grade = Number(search.get('grade') ?? '') || undefined
  const schoolId = search.get('school') ?? ''
  // 학년도·학기(`period=2026-1`)·과목·수행평가 상태 필터 (P-29 PROPOSED). 학기를 고르지 않으면 현재 학기 기준
  const period = search.get('period') ?? ''
  const [periodYear, periodSemester] = period.split('-').map(Number)
  const term = periodYear && periodSemester ? { academicYear: periodYear, semester: periodSemester } : undefined
  const subjectName = search.get('subject') ?? ''
  const status = (search.get('status') ?? '') as '' | 'BEFORE_START' | 'IN_PROGRESS' | 'COMPLETED'
  const [query, setQuery] = useState(applied)
  const students = useRemote(
    () => listStudents({ query: applied || undefined, grade, schoolId: schoolId || undefined, term, subjectName: subjectName || undefined, status: status || undefined }),
    [applied, grade, schoolId, period, subjectName, status],
  )
  const options = useRemote(() => getStudentFilterOptions({ schoolId: schoolId || undefined, grade, term }), [schoolId, grade, period])
  const schools = options.state.status === 'success' ? options.state.data.schools : []
  const terms = options.state.status === 'success' ? options.state.data.terms : []
  const subjectNames = options.state.status === 'success' ? options.state.data.subjectNames : []

  // 상위 조건(학교 → 학년 → 학기 → 과목)을 바꾸면 하위 조건과 선택한 학생을 비운다. 이전 학교 학생이 오른쪽에 남지 않게 한다
  const dependents: Record<string, string[]> = { school: ['subject'], grade: ['subject'], period: ['subject'], subject: [], status: [], q: [] }
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(search)
    if (value) next.set(key, value)
    else next.delete(key)
    for (const child of dependents[key] ?? []) next.delete(child)
    next.delete('tab')
    next.delete('term')
    navigate(`${paths.students}${next.toString() ? `?${next}` : ''}`)
  }

  // 목록 조건은 유지한 채 학생만 바꾼다 (학기·탭은 새 학생 기준으로 다시 고른다)
  const select = (id: string) => {
    const next = new URLSearchParams(search)
    next.delete('tab')
    next.delete('term')
    navigate(`${paths.student(id)}${next.toString() ? `?${next}` : ''}`)
  }

  // 주소의 학생이 지금 조건의 목록에 없을 때:
  // - 검색·필터를 건 상태(다른 학교로 바꾼 직후 등)면 목록의 첫 학생을 보여준다(기존 동작).
  // - 조건이 없는데도 없으면 담당 지점 밖이거나 없는 학생이다 → 다른 학생으로 바꿔 보여주지 않고 안내한다(서버도 404).
  const listedIds = students.state.status === 'success' ? students.state.data.items.map((item) => item.student.studentId) : null
  const filtered = Boolean(applied || grade || schoolId || period || subjectName || status)
  const outOfScope = Boolean(studentId && listedIds && !listedIds.includes(studentId) && !filtered)
  const selectedId = outOfScope ? undefined : studentId && (!listedIds || listedIds.includes(studentId)) ? studentId : listedIds?.[0]

  return (
    <div className={styles.masterDetail}>
      <aside className={styles.masterPane} aria-label="담당 학생">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault()
            update('q', query.trim())
          }}
        >
          <SearchBox value={query} onChange={setQuery} placeholder="학생명 검색" label="학생 검색" />
        </form>
        <div className={styles.masterFilters}>
          <select className={styles.select} aria-label="학교" value={schoolId} onChange={(event) => update('school', event.target.value)}>
            <option value="">전체 학교</option>
            {schools.map((school) => (
              <option key={school.schoolId} value={school.schoolId}>
                {school.name}
              </option>
            ))}
          </select>
          <select className={styles.select} aria-label="학년" value={grade ?? ''} onChange={(event) => update('grade', event.target.value)}>
            <option value="">전체 학년</option>
            {[1, 2, 3].map((value) => (
              <option key={value} value={value}>
                {value}학년
              </option>
            ))}
          </select>
          <select className={styles.select} aria-label="학년도·학기" value={period} onChange={(event) => update('period', event.target.value)}>
            <option value="">현재 학기</option>
            {terms.map((item) => (
              <option key={`${item.academicYear}-${item.semester}`} value={`${item.academicYear}-${item.semester}`}>
                {item.academicYear}학년도 {item.semester}학기
              </option>
            ))}
          </select>
          <select className={styles.select} aria-label="과목" value={subjectName} onChange={(event) => update('subject', event.target.value)}>
            <option value="">전체 과목</option>
            {subjectNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select className={styles.select} aria-label="수행평가 상태" value={status} onChange={(event) => update('status', event.target.value)}>
            <option value="">전체 상태</option>
            <option value="BEFORE_START">시작 전 있음</option>
            <option value="IN_PROGRESS">진행 중 있음</option>
            <option value="COMPLETED">완료 있음</option>
          </select>
        </div>
        {students.state.status === 'success' && (
          <p className={styles.cellSub} aria-live="polite" data-testid="student-count">
            학생 {students.state.data.items.length}명
          </p>
        )}
        <RemoteView state={students.state} label="학생 목록" onRetry={students.reload}>
          {(data) =>
            data.items.length === 0 ? (
              <ListEmpty
                filtered={Boolean(applied || grade || schoolId || period || subjectName || status)}
                title="담당 학생이 없어요"
                onReset={() => {
                  setQuery('')
                  replaceSearch('')
                }}
              />
            ) : (
              <ul className={styles.listPlain}>
                {data.items.map(({ student, lastActivityAt }) => (
                  <li key={student.studentId}>
                    <button type="button" className={styles.studentItem} aria-current={student.studentId === selectedId ? 'true' : undefined} onClick={() => select(student.studentId)}>
                      <span className={styles.initials} aria-hidden="true">
                        {initialsOf(student.displayName)}
                      </span>
                      <span className={styles.studentItemText}>
                        <span className={styles.cellTitle} style={{ fontSize: 13 }}>
                          {student.displayName}
                        </span>
                        <span className={styles.cellSub}>
                          {student.school.name} {student.grade}학년
                        </span>
                      </span>
                      <span className={styles.cellSub}>{lastActivityAt ? dateTimeLabel(lastActivityAt) : '—'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          }
        </RemoteView>
      </aside>
      <section className={styles.detailPane} aria-label="학생 Assessment 기록">
        {outOfScope ? (
          <div data-testid="student-out-of-scope">
            <EmptyState
              title="이 학생의 기록을 볼 수 없어요"
              description={`담당 지점 밖 학생이거나 없는 학생이에요 (${studentId}).`}
            />
          </div>
        ) : selectedId ? (
          <StudentDetailPane key={selectedId} studentId={selectedId} search={search} />
        ) : (
          students.state.status === 'success' && <EmptyState title="학생을 골라 주세요" />
        )}
      </section>
    </div>
  )
}
