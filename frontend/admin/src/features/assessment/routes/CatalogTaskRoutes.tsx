import { useState } from 'react'
import { navigate, replaceSearch } from '../../../app/adminLocation.ts'
import {
  catalogSubjectOptions,
  getCatalogTask,
  getReferenceCatalog,
  listCatalog,
  listMockExamMaterials,
  listUniversityResources,
  saveCatalogTask,
  subjectNameOf,
  type CatalogTaskInput,
} from '../api/assessmentAdminApi.ts'
import type { AdminCatalogTask, PublishState } from '../api/types.ts'
import { DetailHead, FieldError, ListEmpty, PublishBadge, RemoteView, SearchBox } from '../components/AdminParts.tsx'
import { AlertIcon, InfoIcon, PlusIcon, Toast, type ToastMessage } from '../components/canonicalUi.ts'
import { dateTimeLabel, nextToastId, splitList } from '../model/adminFormat.ts'
import { useCommand, useRemote } from '../model/useRemote.ts'
import styles from '../styles/assessmentAdmin.module.css'
import { paths } from './paths.ts'

const inquiryTypes = ['자료 분석', '비판적 사고', '실험 설계', '문제 해결', '과제 수행']
const difficulties = ['쉬움', '보통', '어려움']

// AD-09 공통 심화 Task 목록 (목업 AM-09): 검색·과목·공개 상태 Chip(건수) + 표(Task·과목·유형·난이도·출처·시작 학생·상태)
// 행을 누르면 수정 화면(AM-11). 공개·비공개 전환은 수정 화면에서 한다 (목업과 같은 위치).
export function CatalogTasksView({ search }: { search: URLSearchParams }) {
  const applied = search.get('q') ?? ''
  const status = (search.get('status') as PublishState | null) ?? undefined
  const subjectId = search.get('subject') ?? ''
  const [query, setQuery] = useState(applied)
  const list = useRemote(() => listCatalog({ query: applied || undefined }), [applied])
  const subjects = catalogSubjectOptions()

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(search)
    if (value) next.set(key, value)
    else next.delete(key)
    replaceSearch(next.toString())
  }

  return (
    <div className={styles.body}>
      <RemoteView state={list.state} label="심화 Task" onRetry={list.reload}>
        {(data) => {
          const scoped = data.items.filter((task) => !subjectId || task.subjectId === subjectId)
          const items = scoped.filter((task) => !status || task.publishState === status)
          const counts = { '': scoped.length, PUBLISHED: scoped.filter((task) => task.publishState === 'PUBLISHED').length, DRAFT: scoped.filter((task) => task.publishState === 'DRAFT').length }
          return (
            <>
              <div className={styles.toolbar}>
                <form
                  role="search"
                  onSubmit={(event) => {
                    event.preventDefault()
                    update('q', query.trim())
                  }}
                >
                  <SearchBox value={query} onChange={setQuery} placeholder="Task 검색" label="심화 Task 검색" />
                </form>
                <select className={styles.select} aria-label="과목" value={subjectId} onChange={(event) => update('subject', event.target.value)}>
                  <option value="">전체 과목</option>
                  {subjects.map((subject) => (
                    <option key={subject.subjectId} value={subject.subjectId}>
                      {subject.name}
                    </option>
                  ))}
                </select>
                <div className={styles.chips} role="group" aria-label="공개 상태">
                  {(
                    [
                      ['', '전체'],
                      ['PUBLISHED', '공개'],
                      ['DRAFT', '비공개·임시 저장'],
                    ] as const
                  ).map(([value, label]) => (
                    <button key={value} type="button" className={styles.chip} aria-pressed={(status ?? '') === value} onClick={() => update('status', value)}>
                      {label} {counts[value]}
                    </button>
                  ))}
                </div>
                <button type="button" className={`${styles.primaryButton} ${styles.toolbarEnd}`} onClick={() => navigate(paths.taskNew)}>
                  <PlusIcon size={15} /> 새 Task
                </button>
              </div>
              {items.length === 0 ? (
                <ListEmpty
                  filtered={Boolean(applied || status || subjectId)}
                  title="등록한 공통 심화 Task가 없어요"
                  onReset={() => {
                    setQuery('')
                    replaceSearch('')
                  }}
                />
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th scope="col">Task</th>
                        <th scope="col">과목</th>
                        <th scope="col">유형</th>
                        <th scope="col">난이도</th>
                        <th scope="col">출처</th>
                        <th scope="col">시작 학생</th>
                        <th scope="col">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((task) => (
                        <tr key={task.catalogTaskId} data-clickable="true" onClick={() => navigate(paths.task(task.catalogTaskId))}>
                          <td>
                            <button
                              type="button"
                              className={styles.rowButton}
                              onClick={(event) => {
                                event.stopPropagation()
                                navigate(paths.task(task.catalogTaskId))
                              }}
                            >
                              <span className={styles.cellTitle} style={{ fontWeight: 500 }}>
                                {task.title}
                              </span>
                              <span className={styles.cellSub}>
                                {task.curriculumConcept ? `${task.curriculumConcept} · ` : ''}수정 {dateTimeLabel(task.updatedAt)}
                              </span>
                            </button>
                          </td>
                          <td>{subjectNameOf(task.subjectId) ?? task.subjectId}</td>
                          <td>{task.inquiryType ?? '—'}</td>
                          <td>{task.difficulty ?? '—'}</td>
                          <td>
                            <span className={styles.cellSub} style={{ marginTop: 0 }}>
                              {task.relatedExamQuestionIds.length > 0 ? '대학 공개 자료 참고' : 'LearnersHigh 자체 제작'}
                            </span>
                          </td>
                          <td>{task.startedStudentCount ?? 0}명</td>
                          <td>
                            <PublishBadge state={task.publishState} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )
        }}
      </RemoteView>
    </div>
  )
}

const emptyInput = (): CatalogTaskInput => ({
  title: '',
  subjectId: '',
  curriculumConcept: null,
  inquiryType: null,
  difficulty: '보통',
  problem: null,
  goal: '',
  methods: [],
  resources: [],
  expectedArtifacts: [],
  selfCheckItems: [],
  relatedMaterialIds: [],
  relatedExamQuestionIds: [],
  referenceSourceIds: [],
})

// AD-09 Task 등록·수정 (AM-10·11). 오른쪽은 학생 라이브러리 미리보기 — 학생에게는 공개 필드만 보인다.
export function CatalogTaskEditRoute({ catalogTaskId }: { catalogTaskId: string | null }) {
  const existing = useRemote(() => (catalogTaskId ? getCatalogTask(catalogTaskId) : Promise.resolve(null)), [catalogTaskId])
  return (
    <div className={styles.detail}>
      <RemoteView state={existing.state} label="심화 Task" onRetry={existing.reload}>
        {(task) => <CatalogTaskForm task={task} />}
      </RemoteView>
    </div>
  )
}

function CatalogTaskForm({ task }: { task: AdminCatalogTask | null }) {
  const [input, setInput] = useState<CatalogTaskInput>(() => (task ? (({ catalogTaskId: _id, publishState: _state, updatedAt: _at, ...rest }) => structuredClone(rest))(task) : emptyInput()))
  const [publishState, setPublishState] = useState<PublishState | null>(task?.publishState ?? null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState(task?.updatedAt ?? null)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const { run, pending } = useCommand()
  const subjects = catalogSubjectOptions()
  const materials = useRemote(() => listMockExamMaterials(), [])
  const universities = useRemote(() => listUniversityResources(), [])
  const references = useRemote(() => getReferenceCatalog(), [])

  const set = <K extends keyof CatalogTaskInput>(key: K, value: CatalogTaskInput[K]) => {
    setInput((previous) => ({ ...previous, [key]: value }))
    setErrors((previous) => ({ ...previous, [key]: '' }))
  }

  const submit = async (state: PublishState) => {
    setFormError(null)
    const outcome = await run(() => saveCatalogTask(task?.catalogTaskId ?? null, input, state))
    if (!outcome) return
    if (outcome.ok) {
      setPublishState(outcome.value.publishState)
      setSavedAt(outcome.value.updatedAt)
      setToast({ id: nextToastId(), tone: 'success', text: state === 'PUBLISHED' ? '학생 라이브러리에 공개했어요.' : '임시 저장했어요. 학생에게는 보이지 않아요.' })
      if (!task) navigate(paths.task(outcome.value.catalogTaskId))
    } else if (outcome.error.code === 'VALIDATION_ERROR') setErrors(outcome.error.fieldReasons())
    else setFormError(`${outcome.error.message} (${outcome.error.code})`)
  }

  const toggleId = (key: 'relatedMaterialIds' | 'referenceSourceIds' | 'relatedExamQuestionIds', id: string) =>
    set(key, input[key].includes(id) ? input[key].filter((value) => value !== id) : [...input[key], id])

  const questionTitle = (questionId: string) => {
    if (universities.state.status !== 'success') return questionId
    for (const resource of universities.state.data.items) {
      const question = resource.document.questions.find((item) => item.questionId === questionId)
      if (question) return `${resource.document.university} ${resource.document.academicYear} · ${question.label}`
    }
    return questionId
  }

  return (
    <>
      <DetailHead trail="심화 Task 관리" title={task ? task.title || '제목 없는 Task' : '새 Task'} backTo={paths.tasks}>
        {publishState && <PublishBadge state={publishState} />}
        {savedAt && <span className={styles.hint}>{dateTimeLabel(savedAt)} 저장</span>}
        {publishState === 'PUBLISHED' ? (
          <>
            <button type="button" className={styles.secondaryButton} onClick={() => submit('PUBLISHED')} disabled={pending}>
              변경 저장
            </button>
            <button type="button" className={styles.primaryButton} onClick={() => submit('DRAFT')} disabled={pending} aria-busy={pending}>
              {pending ? '저장 중…' : '공개 중단'}
            </button>
          </>
        ) : (
          <>
            <button type="button" className={styles.secondaryButton} onClick={() => submit('DRAFT')} disabled={pending}>
              임시 저장
            </button>
            <button type="button" className={styles.primaryButton} onClick={() => submit('PUBLISHED')} disabled={pending} aria-busy={pending}>
              {pending ? '저장 중…' : '공개하기'}
            </button>
          </>
        )}
      </DetailHead>
      <div className={styles.split}>
        <div className={styles.pane}>
          <div className={styles.paneInnerWide}>
            {task?.startedStudentCount ? (
              <p className={styles.infoBar}>
                <InfoIcon size={14} /> 이미 {task.startedStudentCount}명이 이 Task를 시작했어요. 내용을 고치거나 공개를 중단해도 학생이 시작한 탐구와 노트는 그대로 남아요.
              </p>
            ) : null}
            <div className={styles.form}>
              {formError && (
                <p className={styles.formError} role="alert">
                  <AlertIcon size={15} /> {formError}
                </p>
              )}
              <TextField id="task-title" label="Task 제목" required value={input.title} error={errors.title} placeholder="예: 산성 토양을 중화하는 방법과 환경에 미치는 영향" onChange={(value) => set('title', value)} />
              <div className={styles.field}>
                <span className={styles.label}>
                  관련 과목<span className={styles.required}>*</span>
                </span>
                <div className={styles.chips} role="radiogroup" aria-label="관련 과목">
                  {subjects.map((subject) => (
                    <button key={subject.subjectId} type="button" role="radio" aria-checked={input.subjectId === subject.subjectId} aria-pressed={input.subjectId === subject.subjectId} className={styles.chip} onClick={() => set('subjectId', subject.subjectId)}>
                      {subject.name}
                    </button>
                  ))}
                </div>
                <FieldError id="task-subject-error" message={errors.subjectId} />
                <p className={styles.hint}>학교 개설 과목만 고를 수 있어요. 학생이 직접 추가한 과목은 그 학생 전용이라 공통 콘텐츠 과목으로 쓰지 않아요.</p>
              </div>
              <div className={styles.formGrid}>
                <ChipField label="탐구 유형" options={inquiryTypes} value={input.inquiryType} onChange={(value) => set('inquiryType', value)} />
                <ChipField label="난이도" options={difficulties} value={input.difficulty} onChange={(value) => set('difficulty', value)} />
                <TextField id="task-concept" label="교과 개념·주제" value={input.curriculumConcept ?? ''} placeholder="예: 산과 염기" onChange={(value) => set('curriculumConcept', value || null)} />
                <TextField id="task-artifacts" label="예상 결과물" value={input.expectedArtifacts.join(', ')} placeholder="예: 탐구 보고서, 자료 분석표" onChange={(value) => set('expectedArtifacts', splitList(value))} />
              </div>
              <TextField id="task-goal" label="탐구 목표" required multiline value={input.goal} error={errors.goal} onChange={(value) => set('goal', value)} />
              <TextField id="task-problem" label="문제 상황" multiline value={input.problem ?? ''} onChange={(value) => set('problem', value || null)} />
              <TextField id="task-methods" label="수행 안내 (한 줄에 하나)" multiline value={input.methods.join('\n')} placeholder="순서는 참고용이에요." onChange={(value) => set('methods', splitList(value))} />
              <TextField id="task-resources" label="참고자료 (한 줄에 하나, 확인된 자료원·공식 링크만)" multiline value={input.resources.join('\n')} onChange={(value) => set('resources', splitList(value))} />
              <TextField id="task-check" label="자기 점검 기준 (한 줄에 하나)" multiline value={input.selfCheckItems.join('\n')} onChange={(value) => set('selfCheckItems', splitList(value))} />

              <div className={styles.field}>
                <span className={styles.label}>참고자료원 연결 (과목별 공식 자료원 24곳)</span>
                {references.state.status === 'success' && (
                  <div className={styles.chips}>
                    {references.state.data.sources.map((source) => (
                      <button key={source.sourceId} type="button" className={styles.chip} aria-pressed={input.referenceSourceIds.includes(source.sourceId)} onClick={() => toggleId('referenceSourceIds', source.sourceId)}>
                        {source.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="task-material">
                  모의고사 탐구 소재 연결
                </label>
                {materials.state.status === 'success' && (
                  <select
                    id="task-material"
                    className={styles.select}
                    value=""
                    onChange={(event) => {
                      if (event.target.value) toggleId('relatedMaterialIds', event.target.value)
                    }}
                  >
                    <option value="">소재 추가…</option>
                    {materials.state.data.items
                      .filter((item) => !input.relatedMaterialIds.includes(item.material.materialId))
                      .map((item) => (
                        <option key={item.material.materialId} value={item.material.materialId}>
                          [{item.material.materialId}] {item.material.idea.topicTitle}
                        </option>
                      ))}
                  </select>
                )}
                <LinkedChips ids={input.relatedMaterialIds} label={(id) => id} onRemove={(id) => toggleId('relatedMaterialIds', id)} />
              </div>
              <div className={styles.field}>
                <span className={styles.label}>대학별 기출 문항 연결</span>
                <p className={styles.hint}>대학별 자료 원문 화면의 문항 목차에서 &lsquo;심화 Task에 연결&rsquo;로 추가해요.</p>
                <LinkedChips ids={input.relatedExamQuestionIds} label={questionTitle} onRemove={(id) => toggleId('relatedExamQuestionIds', id)} />
              </div>
            </div>
          </div>
        </div>
        <aside className={styles.side} aria-label="학생 라이브러리 미리보기">
          <div className={styles.sideBody}>
            <p className={styles.hint} style={{ marginBottom: 8 }}>
              학생 라이브러리 미리보기
            </p>
            <div className={styles.box}>
              <div className={styles.chips}>
                <span className={styles.badge}>{input.inquiryType ?? '유형 미정'}</span>
                <span className={styles.badge}>난이도 {input.difficulty ?? '미정'}</span>
              </div>
              <h3 className={styles.noteHeading} style={{ fontSize: 18 }}>
                {input.title || 'Task 제목'}
              </h3>
              <p className={styles.muted}>{subjectNameOf(input.subjectId) ?? '과목 미정'} · 자율 심화 탐구 (학교 수행평가 아님)</p>
              <PreviewBlock label="탐구 목표" value={input.goal} />
              <PreviewBlock label="문제 상황" value={input.problem} />
              <PreviewBlock label="수행 안내" value={input.methods.join(' → ')} />
              <PreviewBlock label="예상 결과물" value={input.expectedArtifacts.join(', ')} />
            </div>
            <p className={styles.hint} style={{ marginTop: 8 }}>
              학생 화면은 계약의 공개 필드(제목·과목·목표·방법)만 받아요 (§16). 유형·난이도·문제 상황은 공개 DTO에 아직 없어요 (P-27).
            </p>
          </div>
        </aside>
      </div>
      <Toast message={toast} onDismiss={() => setToast(null)} />
    </>
  )
}

function PreviewBlock({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{ marginTop: 12 }}>
      <p className={styles.hint}>{label}</p>
      <p className={styles.notePara} style={{ fontSize: 13 }}>
        {value || '—'}
      </p>
    </div>
  )
}

function LinkedChips({ ids, label, onRemove }: { ids: string[]; label: (id: string) => string; onRemove: (id: string) => void }) {
  if (ids.length === 0) return <p className={styles.hint}>연결한 항목이 없어요.</p>
  return (
    <div className={styles.chips}>
      {ids.map((id) => (
        <button key={id} type="button" className={styles.chip} aria-pressed="true" onClick={() => onRemove(id)} aria-label={`${label(id)} 연결 해제`}>
          {label(id)} ✕
        </button>
      ))}
    </div>
  )
}

export function TextField({
  id,
  label,
  value,
  onChange,
  required,
  multiline,
  placeholder,
  error,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  multiline?: boolean
  placeholder?: string
  error?: string
}) {
  const describedBy = error ? `${id}-error` : undefined
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      {multiline ? (
        <textarea id={id} className={styles.textarea} value={value} placeholder={placeholder} aria-invalid={error ? true : undefined} aria-describedby={describedBy} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input id={id} className={styles.input} value={value} placeholder={placeholder} aria-invalid={error ? true : undefined} aria-describedby={describedBy} onChange={(event) => onChange(event.target.value)} />
      )}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  )
}

function ChipField({ label, options, value, onChange }: { label: string; options: string[]; value: string | null; onChange: (value: string | null) => void }) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      <div className={styles.chips} role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button key={option} type="button" role="radio" aria-checked={value === option} aria-pressed={value === option} className={styles.chip} onClick={() => onChange(value === option ? null : option)}>
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}
