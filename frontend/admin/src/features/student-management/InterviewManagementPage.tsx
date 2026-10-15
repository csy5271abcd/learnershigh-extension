import { useEffect, useRef, useState } from 'react'
import type { ScreenLoadState } from '../../app/useScreenLoad.ts'
import { ChipGroup, ConfirmDialog, ErrorState, LoadingState, ModalDialog, NoticeState, SearchBox } from '../../components/AdminUi.tsx'
import ui from '../../components/AdminUi.module.css'
import { InlineStats, ToneButton, ToneTag } from '../../components/AdminVisual.tsx'
import { activityTypeLabel } from '../../fixtures/adminActivities.fixture.ts'
import type { AdminInterviewQuestion } from '../../fixtures/types.ts'
import { createInterviewQuestion, deleteInterviewQuestion, errorMessageOf, publishInterviewQuestion, updateInterviewQuestion } from '../../store/adminCommands.ts'
import type { AdminState } from '../../store/adminStore.ts'
import { interviewVisibility } from '../../read-model/studentProjection.ts'
import { connectionStateLabel } from './model/connection.ts'
import cs from './Connection.module.css'
import styles from './StudentManagement.module.css'

/*
 * Interview Management (api-contract §38: 목록 · 추가 · 편집 · 삭제 · Publish). 고3 학생 대상.
 * - 새 질문은 항상 비공개 초안으로 만든다. Publish한 질문만 Student Interview Bridge에 보인다. (자동 공개 없음)
 * - 관련 활동은 그 학생의 Archive 저장 Canonical Activity만 고를 수 있다. 수행평가 Task는 넣지 않는다.
 * - 공개 후 편집 · 삭제 규칙은 Source에 없고, 학생이 쓴 답변 · 연습 상태가 붙으므로 이 화면에서는 초안만 편집 · 삭제한다. (Gap)
 * - 학생 답변 · 연습 상태는 학생 원문이라 읽기만 한다. 상담 기록은 질문 근거로 쓰지 않는다.
 * - 구성: 공개 대기(초안) 요약 → 검색 · Filter → 질문 목록 | 질문 상세(근거 활동 · Connection · 학생 화면 미리보기). 선택은 ?selected=
 * - Interview 질문 상세 GET API Shape은 Contract에 없다. (Gap) 목록 Canonical 값에서 찾는다.
 */

export interface InterviewFilter {
  studentId: string
  status: 'all' | 'draft' | 'published'
  grade: 'all' | '고1' | '고2' | '고3'
  query: string
  /** 오른쪽 Detail Workspace에 연 질문 */
  selected: string | null
}

export interface InterviewEditorRequest {
  mode: 'create' | 'edit'
  studentId?: string
  connectionId?: string
  questionId?: string
}

interface InterviewManagementPageProps {
  state: AdminState
  load: ScreenLoadState
  onRetry: () => void
  filter: InterviewFilter
  onFilterChange: (filter: InterviewFilter) => void
  editor: InterviewEditorRequest | null
  onEditorChange: (editor: InterviewEditorRequest | null) => void
  onOpenStudent: (studentId: string) => void
  onOpenActivity: (activityId: string) => void
  onOpenConnection: (connectionId: string) => void
}

const sourceLabel = (question: AdminInterviewQuestion) => (question.connectionId ? '확정 Connection' : question.source === 'ai-draft' ? 'AI 초안' : 'Admin 작성')
const practiceLabel = { NOT_STARTED: '연습 전', PRACTICING: '연습 중' } as const

export function InterviewManagementPage({ state, load, onRetry, filter, onFilterChange, editor, onEditorChange, onOpenStudent, onOpenActivity, onOpenConnection }: InterviewManagementPageProps) {
  const [draft, setDraft] = useState(filter.query)
  const [synced, setSynced] = useState(filter.query)
  if (synced !== filter.query) {
    setSynced(filter.query)
    setDraft(filter.query)
  }
  const [confirm, setConfirm] = useState<{ question: AdminInterviewQuestion; kind: 'publish' | 'delete' } | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const students = new Map(state.students.map((item) => [item.studentId, item]))
  const activities = new Map(state.activities.map((item) => [item.activityId, item]))
  const all = load.status === 'ready' && load.empty ? [] : state.interview
  const query = filter.query.trim().toLowerCase()
  const rows = all.filter((question) => {
    const student = students.get(question.studentId)
    if (filter.studentId && question.studentId !== filter.studentId) return false
    if (filter.grade !== 'all' && student?.grade !== filter.grade) return false
    if (filter.status === 'draft' && question.published) return false
    if (filter.status === 'published' && !question.published) return false
    if (query) {
      const text = [question.question, student?.displayName ?? '', ...question.relatedActivityIds.map((id) => activities.get(id)?.title ?? '')].join(' ').toLowerCase()
      if (!text.includes(query)) return false
    }
    return true
  })
  const studentOptions = state.students.filter((item) => item.grade === '고3' || all.some((question) => question.studentId === item.studentId))
  const seniors = state.students.filter((item) => item.grade === '고3')
  const withPublished = new Set(all.filter((item) => item.published).map((item) => item.studentId))
  const draftOnly = seniors.filter((item) => all.some((question) => question.studentId === item.studentId) && !withPublished.has(item.studentId))
  const selected = filter.selected ? (all.find((item) => item.questionId === filter.selected) ?? null) : null
  const filterActive = Boolean(filter.studentId || filter.status !== 'all' || filter.grade !== 'all' || query)

  const runConfirm = async () => {
    if (!confirm || pending) return
    setPending(true)
    setError(null)
    try {
      if (confirm.kind === 'publish') await publishInterviewQuestion(confirm.question.questionId)
      else await deleteInterviewQuestion(confirm.question.questionId)
      setMessage(confirm.kind === 'publish' ? '질문을 공개했어요. 학생 Interview 화면에 보여요.' : '초안을 삭제했어요.')
      if (confirm.kind === 'delete') onFilterChange({ ...filter, selected: null })
      setConfirm(null)
    } catch (caught) {
      setError(errorMessageOf(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={ui.page} aria-busy={load.status === 'loading'}>
      <header className={ui.header}>
        <div className={ui.headerText}>
          <h1 className={ui.title}>Interview 관리</h1>
          <p className={ui.lead}>고3 학생의 Archive 활동으로 면접 질문을 준비해요. 초안을 다듬어 공개한 질문만 학생 Interview 화면에 보여요.</p>
        </div>
        {load.status === 'ready' && (
          <button type="button" className={ui.primaryButton} onClick={() => onEditorChange({ mode: 'create', studentId: filter.studentId || undefined })}>
            질문 추가
          </button>
        )}
      </header>
      {load.status === 'loading' && <LoadingState label="Interview 질문을 불러오는 중이에요." />}
      {load.status === 'error' && <ErrorState title="Interview 질문을 불러오지 못했어요." onRetry={onRetry} />}
      {load.status === 'ready' && (
        <>
          {/* 업무 흐름: 공개 대기(초안) → 공개 */}
          <dl className={cs.summary}>
            <div className={cs.summaryPrimary} data-tone="feedback">
              <dt>공개 대기 질문 (비공개 초안)</dt>
              <dd>{all.filter((item) => !item.published).length}</dd>
            </div>
            <div className={cs.summaryStats}>
              <dt className="lh-visually-hidden">공개 현황</dt>
              <dd>
                <InlineStats
                  label="공개 현황"
                  items={[
                    { label: '공개', value: all.filter((item) => item.published).length },
                    { label: '초안만 있는 고3', value: draftOnly.length, tone: draftOnly.length > 0 ? 'revision' : undefined },
                  ]}
                />
                <span className={ui.cellSub}>{draftOnly.length > 0 ? `공개한 질문이 없는 고3: ${draftOnly.map((item) => item.displayName).join(' · ')}` : '모든 고3에게 공개 질문이 있어요.'}</span>
              </dd>
            </div>
          </dl>
          {message && (
            <p className={ui.success} role="status">
              {message}
            </p>
          )}
          <section className={ui.section} aria-labelledby="interview-list">
            <div className={ui.sectionHead}>
              <h2 id="interview-list" className={ui.sectionTitle}>
                질문
              </h2>
              <p className={ui.muted} role="status">
                {filterActive ? `${rows.length}개 표시 · 전체 ${all.length}개` : `${all.length}개`}
              </p>
            </div>
            <div className={ui.toolbar}>
              <SearchBox
                label="질문, 학생, 활동 검색"
                value={draft}
                onChange={(value) => {
                  setDraft(value)
                  onFilterChange({ ...filter, query: value })
                }}
              />
              <label className={ui.filterGroup}>
                <span className={ui.filterLabel}>학생</span>
                <select className={ui.select} value={filter.studentId} onChange={(event) => onFilterChange({ ...filter, studentId: event.target.value })}>
                  <option value="">전체</option>
                  {studentOptions.map((item) => (
                    <option key={item.studentId} value={item.studentId}>
                      {item.displayName} · {item.grade}
                    </option>
                  ))}
                </select>
              </label>
              <ChipGroup
                label="학년"
                value={filter.grade}
                options={[{ value: 'all', label: '전체' }, ...(['고1', '고2', '고3'] as const).map((grade) => ({ value: grade, label: grade }))]}
                onChange={(value) => onFilterChange({ ...filter, grade: value as InterviewFilter['grade'] })}
              />
              <ChipGroup
                label="상태"
                value={filter.status}
                options={[
                  { value: 'all', label: '전체' },
                  { value: 'draft', label: '초안' },
                  { value: 'published', label: '공개' },
                ]}
                onChange={(value) => onFilterChange({ ...filter, status: value as InterviewFilter['status'] })}
              />
            </div>
            {all.length === 0 ? (
              <NoticeState title="Interview 질문이 없어요.">
                <p>질문 추가로 고3 학생의 첫 질문 초안을 만들 수 있어요.</p>
              </NoticeState>
            ) : rows.length === 0 ? (
              <NoticeState title={query ? '검색 결과가 없어요.' : filter.studentId && !all.some((item) => item.studentId === filter.studentId) ? '이 학생의 질문이 아직 없어요.' : '조건에 맞는 질문이 없어요.'}>
                <button
                  type="button"
                  className={ui.secondaryButton}
                  onClick={() => {
                    setDraft('')
                    onFilterChange({ studentId: '', status: 'all', grade: 'all', query: '', selected: filter.selected })
                  }}
                >
                  전체 보기
                </button>
              </NoticeState>
            ) : (
              <div className={cs.interviewWorkspace}>
                <ul className={cs.questionList} aria-label={`Interview 질문 ${rows.length}개`}>
                  {rows.map((question) => {
                    const student = students.get(question.studentId)
                    const related = question.relatedActivityIds.map((id) => activities.get(id)?.title ?? '찾을 수 없는 활동')
                    return (
                      <li key={question.questionId}>
                        <button type="button" className={cs.questionRow} aria-current={selected?.questionId === question.questionId ? 'true' : undefined} onClick={() => onFilterChange({ ...filter, selected: question.questionId })}>
                          <span className={cs.questionWho}>
                            <span className={ui.cellMain}>{student?.displayName}</span>
                            <span className={ui.cellSub}>{student?.grade}</span>
                          </span>
                          <span className={cs.questionText}>
                            <span className={cs.questionMain}>{question.question}</span>
                            <span className={ui.cellSub}>
                              관련 활동 · {related.join(' · ')} · {sourceLabel(question)}
                            </span>
                          </span>
                          <span className={cs.questionState}>
                            {question.published ? (
                              <span className={cs.publishedText}>공개</span>
                            ) : (
                              <ToneTag tone="neutral">초안</ToneTag>
                            )}
                            {question.published && <span className={ui.cellSub}>{practiceLabel[question.practiceStatus]}</span>}
                          </span>
                          <span className="lh-visually-hidden"> 질문 상세 열기</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                {selected ? (
                  <QuestionDetail
                    key={selected.questionId}
                    state={state}
                    question={selected}
                    onClose={() => onFilterChange({ ...filter, selected: null })}
                    onEdit={() => onEditorChange({ mode: 'edit', questionId: selected.questionId })}
                    onPublish={() => setConfirm({ question: selected, kind: 'publish' })}
                    onDelete={() => setConfirm({ question: selected, kind: 'delete' })}
                    onOpenStudent={onOpenStudent}
                    onOpenActivity={onOpenActivity}
                    onOpenConnection={onOpenConnection}
                  />
                ) : (
                  <aside className={cs.questionDetail} aria-label="질문 상세">
                    <p className={ui.muted}>왼쪽에서 질문을 고르면 근거 활동 · Connection · 학생 화면 미리보기를 함께 볼 수 있어요.</p>
                  </aside>
                )}
              </div>
            )}
          </section>
          <ConfirmDialog
            open={confirm !== null}
            title={confirm?.kind === 'publish' ? '질문을 공개할까요?' : '초안을 삭제할까요?'}
            confirmLabel={confirm?.kind === 'publish' ? '공개' : '삭제'}
            danger={confirm?.kind === 'delete'}
            pending={pending}
            error={error}
            onConfirm={() => void runConfirm()}
            onClose={() => {
              setConfirm(null)
              setError(null)
            }}
          >
            {confirm && (
              <>
                <p className={ui.note}>{confirm.question.question}</p>
                <p className={ui.muted}>{confirm.kind === 'publish' ? '공개하면 학생 Interview 화면에 바로 보이고, 이 화면에서는 더 편집할 수 없어요.' : '삭제한 초안은 되돌릴 수 없어요.'}</p>
              </>
            )}
          </ConfirmDialog>
          {editor && (
            <InterviewEditor
              state={state}
              request={editor}
              onClose={() => onEditorChange(null)}
              onSaved={(text) => {
                setMessage(text)
                onEditorChange(null)
              }}
            />
          )}
        </>
      )}
    </div>
  )
}

/** 오른쪽 Detail Workspace: 질문 · 상태 · Action / 근거 Context / 학생 화면 미리보기 */
function QuestionDetail({
  state,
  question,
  onClose,
  onEdit,
  onPublish,
  onDelete,
  onOpenStudent,
  onOpenActivity,
  onOpenConnection,
}: {
  state: AdminState
  question: AdminInterviewQuestion
  onClose: () => void
  onEdit: () => void
  onPublish: () => void
  onDelete: () => void
  onOpenStudent: (studentId: string) => void
  onOpenActivity: (activityId: string) => void
  onOpenConnection: (connectionId: string) => void
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [])
  const student = state.students.find((item) => item.studentId === question.studentId)
  const connection = question.connectionId ? state.connections.find((item) => item.connectionId === question.connectionId) : null
  const visibility = interviewVisibility(state, question.questionId)
  const eligible = student?.grade === '고3'
  const related = question.relatedActivityIds.map((id) => ({ id, activity: state.activities.find((item) => item.activityId === id) ?? null }))
  const studentQuestions = state.interview.filter((item) => item.studentId === question.studentId && item.published)
  const previewIndex = question.published ? studentQuestions.findIndex((item) => item.questionId === question.questionId) + 1 : studentQuestions.length + 1
  const lockedReason = question.published ? '공개한 질문은 학생 답변 · 연습 기록이 붙어 이 화면에서 편집 · 삭제할 수 없어요. (공개 후 편집 규칙 확정 전)' : !eligible ? 'Interview 대상(고3)이 아닌 학생의 질문이라 편집 · 공개할 수 없어요.' : null

  return (
    <aside className={cs.questionDetail} aria-labelledby="question-detail-title">
      <div className={cs.detailHead}>
        <h2 id="question-detail-title" ref={headingRef} tabIndex={-1} className={ui.subTitle}>
          질문 상세
        </h2>
        <button type="button" className={ui.back} onClick={onClose}>
          닫기
        </button>
      </div>
      <div className={cs.block}>
        <span className={ui.cellSub}>
          {question.published ? '공개' : '비공개 초안'} · {visibility.reason} · {sourceLabel(question)}
        </span>
        <p className={cs.questionBody}>{question.question}</p>
        <div className={cs.actions}>
          {question.published ? (
            <span className={cs.publishedText}>공개됨 · 읽기 전용</span>
          ) : (
            <>
              <ToneButton variant="primary" disabled={!eligible} aria-describedby={lockedReason ? 'question-lock-reason' : undefined} onClick={onPublish}>
                공개
              </ToneButton>
              <ToneButton variant="soft" tone="neutral" disabled={!eligible} aria-describedby={lockedReason ? 'question-lock-reason' : undefined} onClick={onEdit}>
                편집
              </ToneButton>
              <ToneButton variant="text" tone="risk" disabled={!eligible} aria-describedby={lockedReason ? 'question-lock-reason' : undefined} onClick={onDelete}>
                삭제
              </ToneButton>
            </>
          )}
          {question.published && (
            <>
              <ToneButton variant="soft" tone="neutral" disabled aria-describedby="question-lock-reason">
                편집
              </ToneButton>
              <ToneButton variant="text" tone="neutral" disabled aria-describedby="question-lock-reason">
                삭제
              </ToneButton>
            </>
          )}
        </div>
        {lockedReason && (
          <p id="question-lock-reason" className={ui.cellSub}>
            {lockedReason}
          </p>
        )}
        {question.published && (
          <p className={ui.cellSub}>
            학생 연습: {practiceLabel[question.practiceStatus]}
            {question.answer ? ' · 답변 작성함 (학생 원문은 읽기 전용)' : ' · 답변 아직 없음'}
          </p>
        )}
      </div>

      <section className={cs.block} aria-labelledby="question-source-title">
        <h3 id="question-source-title" className={ui.subTitle}>
          근거 Context
        </h3>
        <p className={ui.cellSub}>
          학생 ·{' '}
          <button type="button" className={ui.linkButton} onClick={() => onOpenStudent(question.studentId)}>
            {student?.displayName}
            <span className="lh-visually-hidden"> Student 360 보기</span>
          </button>{' '}
          · {student?.grade}
          {student?.interestField ? ` · ${student.interestField} 관심` : ''}
        </p>
        <ul className={ui.list} aria-label="관련 활동">
          {related.map(({ id, activity }) => (
            <li key={id}>
              {activity ? (
                <>
                  <button type="button" className={ui.linkButton} onClick={() => onOpenActivity(id)}>
                    {activity.title}
                    <span className="lh-visually-hidden"> 활동 상세 보기</span>
                  </button>
                  <span className={ui.cellSub}>
                    {activityTypeLabel[activity.type]} · 결과 {activity.result ? '작성' : '미작성'} · 자료 {activity.files.length}개
                  </span>
                </>
              ) : (
                <span className={ui.cellSub}>찾을 수 없는 활동</span>
              )}
            </li>
          ))}
        </ul>
        {connection ? (
          <div className={cs.aiBox}>
            <span className={cs.reasonLabel}>확정 Connection · {connectionStateLabel[connection.reviewState]}</span>
            <p>{connection.reason}</p>
            <button type="button" className={`${ui.secondaryButton} ${ui.smallButton}`} onClick={() => onOpenConnection(connection.connectionId)}>
              Connection 보기
            </button>
          </div>
        ) : (
          <p className={ui.cellSub}>Connection 근거 없이 {question.source === 'ai-draft' ? 'AI 초안' : 'Admin'}으로 만든 질문이에요.</p>
        )}
      </section>

      <section className={cs.block} aria-labelledby="question-preview-title">
        <h3 id="question-preview-title" className={ui.subTitle}>
          학생 화면 미리보기
        </h3>
        <p className={ui.cellSub}>{visibility.visible ? '학생 Interview 화면에 아래처럼 보여요.' : `지금은 학생에게 보이지 않아요 (${visibility.reason}). 공개하면 아래처럼 보여요.`}</p>
        <article className={cs.studentPreview} aria-label="학생 Interview 질문 Card 미리보기">
          <p className={cs.previewIndex}>질문 {previewIndex}</p>
          <p className={ui.cellMain}>{question.question}</p>
          <p className={ui.cellSub}>
            관련 활동 · {related.filter((item) => item.activity).map((item) => item.activity!.title).join(' · ') || '관련 활동 정보를 찾을 수 없어요.'}
          </p>
          <p className={cs.previewTags}>
            <span>{practiceLabel[question.practiceStatus]}</span>
            <span>{question.answer ? '답변 작성함' : '답변 아직 없음'}</span>
          </p>
        </article>
      </section>
    </aside>
  )
}

function InterviewEditor({ state, request, onClose, onSaved }: { state: AdminState; request: InterviewEditorRequest; onClose: () => void; onSaved: (message: string) => void }) {
  const existing = request.mode === 'edit' ? state.interview.find((item) => item.questionId === request.questionId) ?? null : null
  const connection = request.connectionId ? state.connections.find((item) => item.connectionId === request.connectionId && item.reviewState === 'confirmed') ?? null : null
  const seniors = state.students.filter((item) => item.grade === '고3')
  const [studentId, setStudentId] = useState(existing?.studentId ?? connection?.studentId ?? (seniors.some((item) => item.studentId === request.studentId) ? request.studentId! : ''))
  const [question, setQuestion] = useState(existing?.question ?? '')
  const [related, setRelated] = useState<string[]>(existing?.relatedActivityIds ?? connection?.sourceRefs.filter((ref) => ref.source === 'growth').map((ref) => ref.sourceId) ?? [])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const archived = state.activities.filter((item) => item.studentId === studentId && item.status === 'archived')
  const notFound = request.mode === 'edit' && !existing
  const invalid = !studentId || !question.trim() || related.length === 0

  const save = async () => {
    if (pending || invalid) return
    setPending(true)
    setError(null)
    try {
      if (existing) {
        await updateInterviewQuestion(existing.questionId, { question, relatedActivityIds: related })
        onSaved('초안을 저장했어요. 아직 학생에게 보이지 않아요.')
      } else {
        await createInterviewQuestion({ studentId, question, relatedActivityIds: related, ...(connection ? { connectionId: connection.connectionId } : {}) })
        onSaved('비공개 초안을 만들었어요. 공개하기 전까지 학생에게 보이지 않아요.')
      }
    } catch (caught) {
      setError(errorMessageOf(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <ModalDialog open title={existing ? '질문 초안 편집' : '질문 추가'} onClose={onClose} pending={pending}>
      {notFound ? (
        <>
          <p>편집할 질문을 찾을 수 없어요. (이미 공개 · 삭제됐을 수 있어요)</p>
          <div className={ui.dialogActions}>
            <button type="button" className={ui.secondaryButton} onClick={onClose}>
              닫기
            </button>
          </div>
        </>
      ) : (
        <form
          className={ui.list}
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
        >
          {connection && <p className={ui.note}>확정 Connection 근거: {connection.reason}</p>}
          <label className={ui.field}>
            <span className={ui.fieldLabel}>학생 (고3)</span>
            <select
              className={ui.select}
              value={studentId}
              disabled={Boolean(existing || connection)}
              onChange={(event) => {
                setStudentId(event.target.value)
                setRelated([])
              }}
            >
              <option value="">학생 선택</option>
              {seniors.map((item) => (
                <option key={item.studentId} value={item.studentId}>
                  {item.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className={ui.field}>
            <span className={ui.fieldLabel}>질문</span>
            <textarea className={ui.textarea} rows={4} maxLength={300} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="활동 경험을 묻는 질문을 입력하세요." />
            <span className={ui.counter}>{question.length}/300</span>
          </label>
          <fieldset className={styles.checkList}>
            <legend className={ui.fieldLabel}>관련 활동 (Archive 저장 활동)</legend>
            {!studentId ? (
              <p className={ui.muted}>학생을 먼저 고르세요.</p>
            ) : archived.length === 0 ? (
              <p className={ui.muted}>이 학생은 Archive에 저장한 활동이 없어요.</p>
            ) : (
              archived.map((activity) => (
                <label key={activity.activityId} className={ui.check}>
                  <input
                    type="checkbox"
                    checked={related.includes(activity.activityId)}
                    onChange={(event) => setRelated((current) => (event.target.checked ? [...current, activity.activityId] : current.filter((id) => id !== activity.activityId)))}
                  />
                  <span>
                    {activity.title}
                    <span className={ui.cellSub}>{activityTypeLabel[activity.type]}</span>
                  </span>
                </label>
              ))
            )}
          </fieldset>
          {invalid && <p className={ui.cellSub}>학생 · 질문 · 관련 활동 1개 이상이 필요해요.</p>}
          {error && (
            <p className={ui.errorText} role="alert">
              {error}
            </p>
          )}
          <p className={ui.muted}>저장하면 비공개 초안이 돼요. 학생에게 보이려면 목록에서 공개해야 해요.</p>
          <div className={ui.dialogActions}>
            <button type="button" className={ui.secondaryButton} onClick={onClose} disabled={pending}>
              취소
            </button>
            <button type="submit" className={ui.primaryButton} disabled={invalid || pending} aria-busy={pending}>
              {pending ? '저장하는 중…' : '초안 저장'}
            </button>
          </div>
        </form>
      )}
    </ModalDialog>
  )
}
