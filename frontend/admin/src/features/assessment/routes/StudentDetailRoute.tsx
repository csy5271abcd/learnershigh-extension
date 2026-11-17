import type { ReactNode } from 'react'
import { navigate, replaceSearch } from '../../../app/adminLocation.ts'
import {
  getStudent,
  listFeedbackRequests,
  listStudentEnrichmentTasks,
  listStudentGrowthRecords,
  listStudentSchoolAssessments,
  mockAsOfDate,
  subjectNameOf,
} from '../api/assessmentAdminApi.ts'
import type { AcademicContext } from '../api/types.ts'
import { ListEmpty, ReadOnlyMark, RemoteView } from '../components/AdminParts.tsx'
import { dateLabel, dateTimeLabel, dDayLabel, feedbackStatusLabels, initialsOf, sourceTypeLabels, statusLabels } from '../model/adminFormat.ts'
import { useRemote, type Remote } from '../model/useRemote.ts'
import styles from '../styles/assessmentAdmin.module.css'
import { paths } from './paths.ts'

type StudentTab = 'school' | 'enrichment' | 'growth' | 'feedback'

const termKey = (context: Pick<AcademicContext, 'academicYear' | 'semester'>) => `${context.academicYear}-${context.semester}`

// AD-02 선택한 학생의 Assessment 기록 (목업 AM-02 오른쪽): 학생 정보·수강 과목 + 학교 수행평가 / 심화 탐구 / 성장 기록 / 피드백 이력.
export function StudentDetailPane({ studentId, search }: { studentId: string; search: URLSearchParams }) {
  // 2026-11-11: §34 학생 상세·성장 기록·피드백이 http로 연결돼 Mock과 같은 전체 화면을 쓴다(같은 계약 Shape, 같은 DB).
  return <MockStudentDetailPane studentId={studentId} search={search} />
}

/** 개발용 현재 학기(VITE_ASSESSMENT_DEV_CURRENT_TERM, 예: 2026-2). 날짜로 추측하지 않는다. */
function devCurrentTerm(): string | null {
  const raw: unknown = import.meta.env.DEV ? import.meta.env.VITE_ASSESSMENT_DEV_CURRENT_TERM : undefined
  return typeof raw === 'string' && /^\d{4}-[12]$/.test(raw.trim()) ? raw.trim() : null
}

function MockStudentDetailPane({ studentId, search }: { studentId: string; search: URLSearchParams }) {
  const detail = useRemote(() => getStudent(studentId), [studentId])
  return (
    <RemoteView state={detail.state} label="학생 정보" onRetry={detail.reload}>
      {(data) => {
        const contexts = [...data.academicContexts].sort((a, b) => b.academicYear - a.academicYear || b.semester - a.semester)
        const term =
          contexts.find((context) => termKey(context) === search.get('term')) ??
          contexts.find((context) => termKey(context) === devCurrentTerm()) ??
          contexts[0]
        return <StudentRecords studentId={studentId} student={data.student} contexts={contexts} term={term} search={search} />
      }}
    </RemoteView>
  )
}

function StudentRecords({
  studentId,
  student,
  contexts,
  term,
  search,
}: {
  studentId: string
  student: { displayName: string; school: { name: string }; grade: number }
  contexts: AcademicContext[]
  term: AcademicContext | undefined
  search: URLSearchParams
}) {
  const tab = (search.get('tab') as StudentTab | null) ?? 'school'
  // 과목명은 이 학생의 서버 학업 Context(§9-1 subjects·catalogSubjects)에서 먼저 찾는다. 없을 때만 기존 조회(subjectNameOf)를 쓴다.
  const contextSubjectNames = new Map(
    contexts.flatMap((context) => [...(context.catalogSubjects ?? []), ...context.subjects].map((subject) => [subject.subjectId, subject.name] as const)),
  )
  const subjectName = (subjectId: string | null) => (subjectId ? (contextSubjectNames.get(subjectId) ?? subjectNameOf(subjectId)) : null)
  const academicYear = term?.academicYear ?? 0
  const semester = term?.semester ?? 0
  const school = useRemote(() => (term ? listStudentSchoolAssessments(studentId, { academicYear, semester }) : Promise.resolve({ items: [] })), [studentId, academicYear, semester])
  const enrichment = useRemote(() => listStudentEnrichmentTasks(studentId), [studentId])
  const growth = useRemote(() => listStudentGrowthRecords(studentId), [studentId])
  const feedback = useRemote(() => listFeedbackRequests({ studentId }), [studentId])

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(search)
    next.set(key, value)
    replaceSearch(next.toString())
  }
  const count = <T,>(state: Remote<{ items: T[] }>) => (state.status === 'success' ? state.data.items.length : '')

  return (
    <>
      <div className={styles.profile}>
        <span className={`${styles.initials} ${styles.initialsLarge}`} aria-hidden="true">
          {initialsOf(student.displayName)}
        </span>
        <div className={styles.profileText}>
          <h2 className={styles.profileName}>{student.displayName}</h2>
          <p className={styles.profileMeta}>
            {student.school.name} · {term ? `${term.grade}학년 ${term.semester}학기` : `${student.grade}학년`}
            {/* 학교 반·번호 (§9-1 DRAFT). 학원 반과 다르다. 값이 없으면 표시하지 않는다. */}
            {term?.schoolClassNumber != null && term.schoolStudentNumber != null && ` · ${term.schoolClassNumber}반 ${term.schoolStudentNumber}번`}
          </p>
          {term ? (
            <div className={styles.chips} aria-label="이 학기 수강 과목">
              {term.subjects.map((subject) => (
                <span key={subject.subjectId} className={styles.subjectChip} data-custom={subject.addedByStudent ? 'true' : undefined} title={subject.addedByStudent ? '학생이 직접 추가한 과목 (학교 개설 과목 아님)' : undefined}>
                  {subject.name}
                  {subject.addedByStudent && ' · 학생 추가'}
                </span>
              ))}
            </div>
          ) : (
            <p className={styles.muted}>등록된 학업 정보가 없어요.</p>
          )}
        </div>
        <div className={styles.stack} style={{ alignItems: 'flex-end', gap: 8 }}>
          <span className={styles.readOnly}>
            <ReadOnlyMark /> · 학생 원본은 수정할 수 없어요
          </span>
          {/* 학생이 보는 Assessment 화면을 그대로 읽기 전용으로 연다 (요청 ⑧) */}
          <button type="button" className={styles.secondaryButton} data-testid="open-student-view" onClick={() => navigate(paths.studentView(studentId))}>
            학생 화면 보기
          </button>
          {contexts.length > 1 && term && (
            <select className={styles.select} style={{ height: 32, fontSize: 12 }} aria-label="학기" value={termKey(term)} onChange={(event) => setParam('term', event.target.value)}>
              {contexts.map((context) => (
                <option key={termKey(context)} value={termKey(context)}>
                  {context.academicYear}학년도 {context.grade}학년 {context.semester}학기
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className={styles.lineTabs} role="tablist" aria-label="기록 종류">
        {(
          [
            ['school', '학교 수행평가', count(school.state)],
            ['enrichment', '심화 탐구', count(enrichment.state)],
            ['growth', '성장 기록', count(growth.state)],
            ['feedback', '피드백 이력', count(feedback.state)],
          ] as const
        ).map(([id, label, value]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} aria-current={tab === id ? 'page' : undefined} className={styles.subTab} onClick={() => setParam('tab', id)}>
            {label}
            <span>{value}</span>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 4 }}>
        {tab === 'school' && (
          <RemoteView state={school.state} label="학교 수행평가" onRetry={school.reload}>
            {(data) =>
              data.items.length === 0 ? (
                <ListEmpty filtered={false} title={term ? '이 학기 학교 수행평가가 없어요' : '학교 수행평가가 없어요'} />
              ) : (
                <Rows>
                  {data.items.map((item) => (
                    <PlainRow
                      key={item.assessmentId}
                      onOpen={() => navigate(paths.record(studentId, 'school', item.assessmentId))}
                      title={item.title}
                      sub={`${subjectName(item.subjectId) ?? '과목 없음'} · ${item.evaluationItemRef ? '공식 평가 항목 연결' : '학생 직접 등록'}`}
                      date={item.deadlineDate ? `${dateLabel(item.deadlineDate)} (${dDayLabel(item.deadlineDate, mockAsOfDate)})` : '날짜 미정'}
                      extra=""
                      status={item.status}
                    />
                  ))}
                </Rows>
              )
            }
          </RemoteView>
        )}
        {tab === 'enrichment' && (
          <RemoteView state={enrichment.state} label="심화 탐구" onRetry={enrichment.reload}>
            {(data) =>
              data.items.length === 0 ? (
                <ListEmpty filtered={false} title="진행한 심화 탐구가 없어요" />
              ) : (
                <Rows>
                  {data.items.map((task) => (
                    <PlainRow
                      key={task.taskId}
                      onOpen={() => navigate(paths.record(studentId, 'enrichment', task.taskId))}
                      title={task.title}
                      sub={`${subjectName(task.subjectId) ?? '과목 없음'} · ${task.catalogTaskId ? '공통 Task에서 시작' : task.sourceReference ? '자료에서 시작' : '학생 직접 시작'}`}
                      date={`수정 ${dateTimeLabel(task.updatedAt)}`}
                      extra=""
                      status={task.status}
                    />
                  ))}
                </Rows>
              )
            }
          </RemoteView>
        )}
        {tab === 'growth' && (
          <RemoteView state={growth.state} label="성장 기록" onRetry={growth.reload}>
            {(data) =>
              data.items.length === 0 ? (
                <ListEmpty filtered={false} title="작성한 성장 기록이 없어요" />
              ) : (
                <Rows>
                  {data.items.map((record) => (
                    <PlainRow
                      key={record.recordId}
                      onOpen={
                        record.relatedSourceType && record.relatedSourceId
                          ? () => navigate(paths.record(studentId, record.relatedSourceType === 'SCHOOL_ASSESSMENT' ? 'school' : 'enrichment', record.relatedSourceId as string))
                          : undefined
                      }
                      title={record.title}
                      sub={[subjectName(record.subjectId) ?? '과목 없음', record.outcome ?? record.reflection].filter(Boolean).join(' · ')}
                      date={dateLabel(record.activityStartDate)}
                      extra={record.relatedSourceType ? '관련 활동 있음' : ''}
                      status={null}
                    />
                  ))}
                </Rows>
              )
            }
          </RemoteView>
        )}
        {tab === 'feedback' && (
          <RemoteView state={feedback.state} label="피드백 이력" onRetry={feedback.reload}>
            {(data) =>
              data.items.length === 0 ? (
                <ListEmpty filtered={false} title="피드백 요청 이력이 없어요" />
              ) : (
                <Rows>
                  {data.items.map((request) => (
                    <PlainRow
                      key={request.requestId}
                      onOpen={() => navigate(paths.feedbackDetail(request.requestId))}
                      title={request.sourceTitle}
                      sub={`${sourceTypeLabels[request.sourceType]} · ${request.subjectName ?? '과목 없음'}`}
                      date={`${dateTimeLabel(request.requestedAt)} 요청`}
                      extra={`노트 1 · 파일 ${request.snapshot.artifactVersionIds.length}`}
                      status={null}
                      statusText={feedbackStatusLabels[request.status]}
                    />
                  ))}
                </Rows>
              )
            }
          </RemoteView>
        )}
      </div>
    </>
  )
}

function Rows({ children }: { children: ReactNode }) {
  return <ul className={styles.plainRows}>{children}</ul>
}

function PlainRow({ title, sub, date, extra, status, statusText, onOpen }: { title: string; sub: string; date: string; extra: string; status: string | null; statusText?: string; onOpen?: () => void }) {
  return (
    <li>
      <button type="button" className={styles.plainRow} onClick={onOpen} disabled={!onOpen} style={onOpen ? undefined : { cursor: 'default' }}>
        <span style={{ minWidth: 0 }}>
          <span className={styles.plainRowTitle}>{title}</span>
          <span className={styles.cellSub} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sub}
          </span>
        </span>
        <span>{date}</span>
        <span className={styles.cellSub}>{extra}</span>
        <span className={styles.statusDot}>
          {status && <span className={styles.dot} data-status={status} aria-hidden="true" />}
          {status ? statusLabels[status] : statusText ?? ''}
        </span>
      </button>
    </li>
  )
}
