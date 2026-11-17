import { useState, type ReactNode } from 'react'
import { navigate } from '../../../app/adminLocation.ts'
import { getStudent, getStudentSource, listFeedbackRequests, listStudentArtifacts, listStudentGrowthRecords, listStudentNotes, mockAsOfDate, subjectNameOf } from '../api/assessmentAdminApi.ts'
import { candidateStatusLabel, sourceLabel, sourcePageLabel, statusLabels } from '../api/canonicalSource.ts'
import type { CriteriaLookup } from '../api/mock/assessmentAdminMock.ts'
import type { AdminNote, AssessmentSourceType } from '../api/types.ts'
import { DetailHead, ReadOnlyMark, RemoteView, StatusBadge } from '../components/AdminParts.tsx'
import { ArtifactVersionsView } from '../components/ArtifactVersionsView.tsx'
import { FileIcon, LoadingRows, NoteBlocksView, NoteIcon, SproutIcon } from '../components/canonicalUi.ts'
import { dateLabel, dateTimeLabel, dDayLabel, feedbackStatusLabels } from '../model/adminFormat.ts'
import { useRemote } from '../model/useRemote.ts'
import { StudentDesktopPreview } from '../preview/StudentDesktopPreview.tsx'
import { useStudentViewSnapshot } from '../preview/useStudentViewSnapshot.ts'
import styles from '../styles/assessmentAdmin.module.css'
import { paths, type RecordKind } from './paths.ts'
import { StudentViewError } from './StudentViewRoute.tsx'

// 학생 기록 상세 (AM-03·04): 가운데 학생 원본(과제 정보·노트·결과물, 읽기 전용) + 오른쪽 피드백 요청·이전 피드백.
// AD-11 노트 Revision, AD-12 결과물 버전, AD-13 두 버전 비교. 열람만으로 피드백 요청이 생기지 않는다.
export function StudentRecordRoute({ studentId, kind, sourceId }: { studentId: string; kind: RecordKind; sourceId: string }) {
  const sourceType: AssessmentSourceType = kind === 'school' ? 'SCHOOL_ASSESSMENT' : 'ENRICHMENT_TASK'
  const source = useRemote(() => getStudentSource(studentId, sourceType, sourceId), [studentId, sourceType, sourceId])
  const notes = useRemote(() => listStudentNotes(studentId, sourceType, sourceId), [studentId, sourceType, sourceId])
  const artifacts = useRemote(() => listStudentArtifacts(studentId, sourceType, sourceId), [studentId, sourceType, sourceId])
  const requests = useRemote(() => listFeedbackRequests({ studentId, sourceId }), [studentId, sourceId])
  const growth = useRemote(() => listStudentGrowthRecords(studentId), [studentId])
  // 과목명은 이 학생의 서버 학업 Context(§9-1 subjects·catalogSubjects)에서 먼저 찾는다. 없을 때만 기존 조회(subjectNameOf).
  const studentDetail = useRemote(() => getStudent(studentId), [studentId])
  const contextNames = new Map(
    studentDetail.state.status === 'success'
      ? studentDetail.state.data.academicContexts.flatMap((context) => [...(context.catalogSubjects ?? []), ...context.subjects].map((subject) => [subject.subjectId, subject.name] as const))
      : [],
  )
  const subjectName = (subjectId: string | null | undefined) => (subjectId ? (contextNames.get(subjectId) ?? subjectNameOf(subjectId)) : null)
  const [sideTab, setSideTab] = useState<'requests' | 'delivered'>('requests')
  // 기본 = 학생 화면(Student 원본 상세를 Desktop 그대로 축소, 경로 A와 같은 컴포넌트). 관리자 기록 도구 = 버전 비교·Revision·피드백 이력 (AD-11~13)
  const [view, setView] = useState<'student' | 'tools'>('student')
  const studentView = useStudentViewSnapshot(studentId)
  const studentPath = kind === 'school' ? `/assessment/school-assessments/${encodeURIComponent(sourceId)}` : `/assessment/enrichment/tasks/${encodeURIComponent(sourceId)}`

  return (
    <div className={styles.detail}>
      <RemoteView state={source.state} label="학생 기록" onRetry={source.reload}>
        {(data) => {
          const title = data.kind === 'school' ? data.assessment.title : data.task.title
          const status = data.kind === 'school' ? data.assessment.status : data.task.status
          return (
            <>
              <DetailHead trail={`Assessment 관리 / 학생 Assessment / ${data.student.displayName}`} title={title} backTo={`${paths.student(studentId)}?tab=${kind}`}>
                <span className={styles.muted}>{kind === 'school' ? '학교 수행평가' : '심화 탐구'}</span>
                <StatusBadge status={status} />
                <button
                  type="button"
                  className={styles.secondaryButton}
                  data-testid="open-student-view"
                  onClick={() => navigate(paths.studentView(studentId, kind === 'school' ? `/assessment/school-assessments/${encodeURIComponent(sourceId)}` : `/assessment/enrichment/tasks/${encodeURIComponent(sourceId)}`))}
                >
                  학생 화면으로 보기
                </button>
              </DetailHead>
              <div className={styles.recordTabs} role="tablist" aria-label="보기 방식">
                <button type="button" role="tab" className={styles.subTab} aria-selected={view === 'student'} aria-current={view === 'student' ? 'page' : undefined} onClick={() => setView('student')} data-testid="record-tab-student">
                  학생 화면
                </button>
                <button type="button" role="tab" className={styles.subTab} aria-selected={view === 'tools'} aria-current={view === 'tools' ? 'page' : undefined} onClick={() => setView('tools')} data-testid="record-tab-tools">
                  관리자 기록 도구
                </button>
                <span className={styles.readOnly}>
                  <ReadOnlyMark /> · 학생 원본은 수정할 수 없어요
                </span>
              </div>
              {view === 'student' ? (
                studentView.state.kind === 'loading' ? (
                  <div className={styles.body}>
                    <LoadingRows rows={4} label="학생 화면을 불러오는 중" />
                  </div>
                ) : studentView.state.kind === 'error' ? (
                  <StudentViewError error={studentView.state.error} onRetry={studentView.retry} />
                ) : (
                  <StudentDesktopPreview
                    key={`${studentId}:${sourceId}`}
                    snapshot={studentView.state.snapshot}
                    httpStudentId={studentView.state.httpStudentId}
                    initialPath={studentPath}
                    title={`${data.student.displayName} 학생의 ${title} 화면 (읽기 전용)`}
                  />
                )
              ) : (
              <div className={styles.split}>
                <div className={styles.pane}>
                  <div className={styles.paneInner}>
                    <div className={styles.studentLine}>
                      <span>
                        {data.student.displayName} · {data.student.school.name} {data.student.grade}학년
                      </span>
                      <ReadOnlyMark />
                    </div>
                    {data.kind === 'school' ? (
                      <SchoolAssessmentMeta data={data} studentId={studentId} subjectName={subjectName} />
                    ) : (
                    <dl className={styles.metaBox}>
                      {(

                        <>
                          <Meta label="과목" value={subjectName(data.task.subjectId) ?? '—'} />
                          <Meta label="탐구 목표" value={data.task.goal ?? '—'} />
                          <Meta label="시작 출처" value={data.catalogTitle ? `공통 Task · ${data.catalogTitle}` : data.task.sourceReference ? `${data.task.sourceReference.type} · ${data.task.sourceReference.sourceId}` : '학생 직접 시작'} />
                          <Meta label="연결 수행평가" value={data.task.relatedAssessmentId ?? '없음'} />
                        </>
                      )}
                    </dl>
                    )}

                    <div className={styles.sectionHead}>
                      <h3 className={styles.sectionIconTitle}>
                        <NoteIcon size={16} /> 탐구 노트
                      </h3>
                    </div>
                    <RemoteView state={notes.state} label="탐구 노트" onRetry={notes.reload}>
                      {(list) => (list.items.length === 0 ? <p className={styles.muted}>아직 작성한 탐구 노트가 없어요.</p> : list.items.map((note) => <NoteWithRevisions key={note.noteId} note={note} />))}
                    </RemoteView>

                    <div className={styles.sectionHead}>
                      <h3 className={styles.sectionIconTitle}>
                        <FileIcon size={16} /> {kind === 'school' ? '수행평가 결과 파일' : '탐구 결과 파일'}{' '}
                        <span className={styles.hint}>{artifacts.state.status === 'success' ? artifacts.state.data.items.length : ''}</span>
                      </h3>
                    </div>
                    <RemoteView state={artifacts.state} label="결과 파일" onRetry={artifacts.reload}>
                      {(list) => <ArtifactVersionsView artifacts={list.items} />}
                    </RemoteView>

                    <div className={styles.sectionHead}>
                      <h3 className={styles.sectionIconTitle}>
                        <SproutIcon size={16} /> 성장·성찰 기록
                      </h3>
                    </div>
                    <RemoteView state={growth.state} label="성장 기록" onRetry={growth.reload}>
                      {(list) => {
                        const related = list.items.filter((record) => record.relatedSourceId === sourceId)
                        return related.length === 0 ? (
                          <p className={styles.muted}>이 {kind === 'school' ? '수행평가' : '심화 탐구'}와 연결된 성장 기록이 아직 없어요.</p>
                        ) : (
                          <ul className={styles.listPlain}>
                            {related.map((record) => (
                              <li key={record.recordId} className={styles.listRow}>
                                <span>
                                  <span className={styles.cellTitle} style={{ fontWeight: 500 }}>
                                    {record.title}
                                  </span>
                                  <span className={styles.cellSub}>{[record.outcome, record.reflection].filter(Boolean).join(' · ') || '내용 없음'}</span>
                                </span>
                                <span className={styles.hint}>수정 {dateTimeLabel(record.updatedAt)}</span>
                              </li>
                            ))}
                          </ul>
                        )
                      }}
                    </RemoteView>
                  </div>
                </div>
                <aside className={styles.side} aria-label="피드백">
                  <div className={styles.sideTabs} role="tablist">
                    <button type="button" role="tab" aria-selected={sideTab === 'requests'} aria-current={sideTab === 'requests' ? 'page' : undefined} className={styles.subTab} onClick={() => setSideTab('requests')}>
                      피드백 요청
                    </button>
                    <button type="button" role="tab" aria-selected={sideTab === 'delivered'} aria-current={sideTab === 'delivered' ? 'page' : undefined} className={styles.subTab} onClick={() => setSideTab('delivered')}>
                      이전 피드백 {requests.state.status === 'success' ? requests.state.data.items.filter((item) => item.status === 'DELIVERED').length : ''}
                    </button>
                  </div>
                  <div className={styles.sideBody}>
                    <RemoteView state={requests.state} label="피드백 요청" onRetry={requests.reload}>
                      {(list) => {
                        const items = list.items.filter((item) => (sideTab === 'requests' ? item.status === 'PENDING' : item.status === 'DELIVERED'))
                        if (items.length === 0) return <p className={styles.muted}>{sideTab === 'requests' ? '답변을 기다리는 요청이 없어요. 요청이 없어도 기록은 볼 수 있어요.' : '이전 피드백이 없어요.'}</p>
                        return (
                          <ul className={styles.listPlain}>
                            {items.map((item) => (
                              <li key={item.requestId} className={styles.listRow}>
                                <span>
                                  {dateTimeLabel(item.requestedAt)} 요청
                                  <span className={styles.cellSub}>
                                    {feedbackStatusLabels[item.status]}
                                    {item.deliveredAt ? ` · ${dateTimeLabel(item.deliveredAt)} 전달` : ''}
                                    {item.draftSaved ? ' · 임시 저장됨' : ''}
                                  </span>
                                </span>
                                <button type="button" className={`${styles.secondaryButton} ${styles.smallButton}`} onClick={() => navigate(paths.feedbackDetail(item.requestId))}>
                                  {item.status === 'PENDING' ? '피드백 작성' : '전달 내용 보기'}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )
                      }}
                    </RemoteView>
                  </div>
                </aside>
              </div>
              )}
            </>
          )
        }}
      </RemoteView>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metaRow}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

/** 최신 Revision을 기본으로, 이전 Revision도 고를 수 있다 (과거 Revision은 바뀌지 않는다, §21) */
function NoteWithRevisions({ note }: { note: AdminNote }) {
  const sorted = [...note.revisions].sort((a, b) => b.revisionNumber - a.revisionNumber)
  const [revisionId, setRevisionId] = useState(sorted[0]?.revisionId)
  const revision = sorted.find((item) => item.revisionId === revisionId) ?? sorted[0]
  if (!revision) return null
  return (
    <section aria-label={`${revision.title} v${revision.revisionNumber}`} style={{ marginBottom: 16 }}>
      <div className={styles.toolbar}>
        <select className={styles.select} value={revision.revisionId} onChange={(event) => setRevisionId(event.target.value)} aria-label="노트 Revision">
          {sorted.map((item, index) => (
            <option key={item.revisionId} value={item.revisionId}>
              v{item.revisionNumber} · {dateTimeLabel(item.savedAt)}
              {index === 0 ? ' (최신)' : ''}
            </option>
          ))}
        </select>
        <span className={styles.muted}>{revision.revisionId === sorted[0].revisionId ? '최신 저장본' : '이전 저장본 — 지금 노트와 다를 수 있어요'}</span>
      </div>
      {/* Student 노트와 같은 블록 렌더러 (학생 화면과 같은 표현) */}
      <article className={styles.studentNoteBody} data-testid="admin-note-body">
        <NoteBlocksView blocks={revision.blocks} />
      </article>
    </section>
  )
}

type SchoolSource = Extract<Awaited<ReturnType<typeof getStudentSource>>, { kind: 'school' }>

/** 후보 값 표시: Student 상세(CandidateValue)와 같은 규칙 — 값이 있으면 "평가계획서 후보 · 확인 필요", 없으면 미등록 */
function CandidateText({ criteria, value, emptyHint }: { criteria: CriteriaLookup; value: (found: Extract<CriteriaLookup, { kind: 'found' }>) => string | null; emptyHint?: string }) {
  const text = criteria.kind === 'found' ? value(criteria) : null
  if (text === null)
    return (
      <>
        <span className={styles.muted}>미등록</span>
        {emptyHint && <span className={styles.hint}> · {emptyHint}</span>}
      </>
    )
  return (
    <>
      {text} <span className={styles.candidateTag}>평가계획서 후보 · 확인 필요</span>
    </>
  )
}

function MetaItem({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={styles.metaRow} data-wide={wide || undefined}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

/**
 * 학교 수행평가 정보 (시연 피드백 ③). Student 수행평가 상세와 같은 항목·같은 값·같은 후보 표시 규칙을 쓴다.
 * 값의 출처: SchoolAssessment(§12) · 학업 정보(§9) · 연결된 평가계획서 분석 후보(§11) · 연결된 심화 탐구(§18).
 * 계약에 없는 항목(평가 유형·담당 선생님·최종 수정일)은 Student와 같이 "미등록"으로 두고 값을 만들지 않는다.
 */
function SchoolAssessmentMeta({ data, studentId, subjectName }: { data: SchoolSource; studentId: string; subjectName: (subjectId: string | null | undefined) => string | null }) {
  const { assessment, criteria, term } = data
  const found = criteria.kind === 'found' ? criteria : null
  return (
    <>
      <dl className={styles.metaBox} data-testid="assessment-meta">
        <MetaItem label="학생">
          {data.student.displayName} · {data.student.school.name}
        </MetaItem>
        <MetaItem label="학년도·학기">
          {term.academicYear}학년도 {term.grade ? `${term.grade}학년 ` : ''}
          {term.semester}학기
        </MetaItem>
        <MetaItem label="진행 상태">{statusLabels[assessment.status]}</MetaItem>
        <MetaItem label="과목">{subjectName(assessment.subjectId) ?? '—'}</MetaItem>
        <MetaItem label="평가 유형">
          <span className={styles.muted}>미등록</span>
        </MetaItem>
        <MetaItem label="평가일">
          <CandidateText criteria={criteria} value={(item) => item.timing} emptyHint="학교 공지로 확인해 주세요" />
        </MetaItem>
        <MetaItem label="제출 마감">{assessment.deadlineDate ? `${dateLabel(assessment.deadlineDate)} (${dDayLabel(assessment.deadlineDate, mockAsOfDate)})` : <span className={styles.muted}>날짜 미정</span>}</MetaItem>
        <MetaItem label="반영비율">
          <CandidateText criteria={criteria} value={(item) => (item.weightPercent === null ? null : `${item.weightPercent}%`)} />
        </MetaItem>
        <MetaItem label="배점">
          <CandidateText criteria={criteria} value={(item) => (item.maxScore === null ? null : `${item.maxScore}점`)} />
        </MetaItem>
        <MetaItem label="담당 선생님">
          <span className={styles.muted}>미등록 · 확인 필요</span>
        </MetaItem>
        <MetaItem label="정보 출처" wide>
          {sourceLabel(assessment)}
          {/* Student 상세와 같은 꼬리표: 분석이 완료(COMPLETED)가 아니면 "PDF 분석 후보 · 확인 필요" */}
          {found && found.analysisStatus !== 'COMPLETED' && <span className={styles.candidateTag}>PDF 분석 후보 · 확인 필요</span>}
          {found && found.analysisStatus === 'COMPLETED' && <span className={styles.candidateTag}>{candidateStatusLabel(found.analysisStatus)}</span>}
          {found?.source && <span className={styles.hint}> · 근거 {sourcePageLabel(found.source)}</span>}
          {criteria.kind === 'subjectMissing' && <span className={styles.hint}> · 분석 결과에 이 과목이 없어요</span>}
          {criteria.kind === 'itemMissing' && <span className={styles.hint}> · 분석 결과에 이 항목이 없어요</span>}
          {criteria.kind === 'analysisUnavailable' && <span className={styles.hint}> · 평가계획서 분석 결과 없음</span>}
        </MetaItem>
        <MetaItem label="연결된 심화 탐구" wide>
          {data.linkedTasks.length === 0 ? (
            <span className={styles.muted}>없음</span>
          ) : (
            data.linkedTasks.map((task) => (
              <button key={task.taskId} type="button" className={styles.linkButton} onClick={() => navigate(paths.record(studentId, 'enrichment', task.taskId))}>
                {task.title} ({statusLabels[task.status]})
              </button>
            ))
          )}
        </MetaItem>
        <MetaItem label="수행평가 설명" wide>
          {assessment.description ?? <span className={styles.muted}>없음</span>}
        </MetaItem>
        <MetaItem label="등록일">{dateLabel(assessment.createdAt)}</MetaItem>
        <MetaItem label="최종 수정일">
          <span className={styles.muted}>기록 없음 (§12 계약 필드 없음)</span>
        </MetaItem>
      </dl>

      {found && found.rubric.length > 0 && (
        <div className={styles.metaSection}>
          <h3 className={styles.sectionIconTitle}>평가 기준 (평가계획서 후보)</h3>
          <ul className={styles.metaList}>
            {found.rubric.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.metaSection} data-testid="assessment-attachments">
        <h3 className={styles.sectionIconTitle}>
          <FileIcon size={16} /> 안내문·첨부
        </h3>
        {assessment.evaluationItemRef && data.planFileName ? (
          <div className={styles.attachRow}>
            <span>
              <span className={styles.cellTitle}>{data.planFileName}</span>
              <span className={styles.cellSub}>
                학교 평가계획서 PDF · 연결된 항목 {assessment.evaluationItemRef.itemKey}
                {found?.source ? ` · ${sourcePageLabel(found.source)}` : ''}
              </span>
            </span>
            {data.planId && (
              <button type="button" className={`${styles.secondaryButton} ${styles.smallButton}`} onClick={() => navigate(paths.planReview(data.planId as string, assessment.evaluationItemRef!.documentRevisionId))}>
                평가계획서 원본 검토
              </button>
            )}
          </div>
        ) : (
          <p className={styles.muted}>연결된 평가계획서 PDF 없음 (학생 직접 등록)</p>
        )}
        <p className={styles.hint}>
          학생이 올린 안내문 사진·PDF는 아직 학생 브라우저에서만 임시로 보여요 (파일 저장소 연결 전). 서버에 저장되지 않아 관리자 화면에는 &lsquo;첨부 없음&rsquo;으로 보여요.
        </p>
      </div>
    </>
  )
}
