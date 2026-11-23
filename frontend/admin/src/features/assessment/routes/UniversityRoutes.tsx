import { useEffect, useState } from 'react'
import { officialSourceOf, universityOfficialSources } from '../model/universityOfficialSources.ts'
import { navigate, replaceSearch } from '../../../app/adminLocation.ts'
import {
  getUniversityFileStates,
  getUniversityResource,
  linkToCatalogTask,
  listCatalog,
  listUniversityResources,
  setUniversityPublish,
  universityExamFileUrl,
  updateUniversityResource,
  type UniversityFileState,
  type UniversityMetaInput,
} from '../api/assessmentAdminApi.ts'
import { examCategoryLabels, pageRangeLabel, questionAtPage, questionDisplayLabel, universityLine } from '../api/canonicalSource.ts'
import type { AdminUniversityResource, UniversityExamDocument } from '../api/types.ts'
import { DetailHead, ListEmpty, PublishBadge, RemoteView, SearchBox } from '../components/AdminParts.tsx'
import { AlertIcon, ExamQuestionNavigator, InfoIcon, Modal, PdfViewer, PlusIcon, Toast, type ToastMessage } from '../components/canonicalUi.ts'
import { dateLabel, dateTimeLabel, fileSizeLabel, nextToastId } from '../model/adminFormat.ts'
import { useCommand, useRemote } from '../model/useRemote.ts'
import styles from '../styles/assessmentAdmin.module.css'
import { TextField } from './CatalogTaskRoutes.tsx'
import { paths } from './paths.ts'

const fileStateLabels: Record<UniversityFileState, { label: string; tone?: string }> = {
  AVAILABLE: { label: '원문 있음', tone: 'success' },
  MISSING: { label: '로컬 파일 없음', tone: 'warning' },
  CHANGED: { label: '파일 변경됨', tone: 'danger' },
}

function useFileStates() {
  const [states, setStates] = useState<Record<string, UniversityFileState> | null | undefined>(undefined)
  useEffect(() => {
    let cancelled = false
    void getUniversityFileStates().then((value) => !cancelled && setStates(value))
    return () => {
      cancelled = true
    }
  }, [])
  return states
}

const matchesDocument = (document: UniversityExamDocument, query: string) => {
  const keyword = query.trim().toLowerCase()
  if (!keyword) return true
  return [document.title, document.university, document.universityName, document.examType, String(document.academicYear), ...document.subjectAreas, ...document.questions.flatMap((question) => [question.label, question.field, question.topic, ...question.concepts])]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(keyword))
}

// AD-10 대학별 자료 목록 (목업 AM-17: 대학 Chip + 학년도·유형 Select + 표, 공개 토글). Student와 같은 Manifest 원본(서울대 9 · KAIST 18, 문항 123).
// 원본 PDF는 Git에 없고 개발 환경 로컬 파일로만 열린다. 파일이 없어도 문서 정보·문항 목차는 볼 수 있다.
export function UniversityListView({ search }: { search: URLSearchParams }) {
  const list = useRemote(() => listUniversityResources(), [])
  const catalog = useRemote(() => listCatalog(), [])
  const fileStates = useFileStates()
  const university = search.get('university') ?? ''
  const year = search.get('year') ?? ''
  const area = search.get('area') ?? ''
  const category = search.get('category') ?? ''
  const applied = search.get('q') ?? ''
  const [query, setQuery] = useState(applied)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const { run, pending } = useCommand()

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(search)
    if (value) next.set(key, value)
    else next.delete(key)
    replaceSearch(next.toString())
  }

  const togglePublish = async (item: AdminUniversityResource) => {
    const outcome = await run(() => setUniversityPublish(item.document.documentId, item.publishState === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'))
    if (!outcome) return
    if (outcome.ok) {
      list.reload()
      setToast({ id: nextToastId(), tone: 'success', text: outcome.value.publishState === 'PUBLISHED' ? '학생 대학별 자료에 공개했어요.' : '비공개로 바꿨어요.' })
    } else setToast({ id: nextToastId(), tone: 'error', text: `${outcome.error.message} (${outcome.error.code})` })
  }

  return (
    <div className={styles.body}>
      <p className={styles.infoBar}>
        <InfoIcon size={14} />
        학생 자율 심화 탐구용 참고자료예요. 면접 연습 기능은 없어요. 공식 게시 주소·확인일·이용 조건을 확인한 자료만 공개할 수 있어요. 원본 PDF는 배포 권한 확인 전이라 이 환경에서만 열려요
        {fileStates === null ? ' (지금은 원문 PDF 서버에 연결되지 않았어요)' : ''}.
      </p>
      <RemoteView state={list.state} label="대학별 자료" onRetry={list.reload}>
        {(data) => {
          const universities = [...new Set(data.items.map((item) => item.document.university))]
          const years = [...new Set(data.items.map((item) => item.document.academicYear))].sort((a, b) => b - a)
          const areas = [...new Set(data.items.flatMap((item) => item.document.subjectAreas))].sort()
          const filtered = data.items
            .filter((item) => !university || item.document.university === university)
            .filter((item) => !year || String(item.document.academicYear) === year)
            .filter((item) => !area || item.document.subjectAreas.includes(area))
            .filter((item) => !category || item.document.category === category)
            .filter((item) => matchesDocument(item.document, applied))
            .sort((a, b) => b.document.academicYear - a.document.academicYear || a.document.title.localeCompare(b.document.title, 'ko'))
          const questionCount = data.items.reduce((sum, item) => sum + item.document.questions.length, 0)
          const tasksFor = (item: AdminUniversityResource) =>
            catalog.state.status === 'success'
              ? catalog.state.data.items.filter((task) => item.relatedCatalogTaskIds.includes(task.catalogTaskId) || task.relatedExamQuestionIds.some((id) => item.document.questions.some((question) => question.questionId === id)))
              : []
          return (
            <>
              {/* 대학 공식 자료실 (요청 ④). 개별 PDF 원본 URL·로컬 PDF와 다른 목록 페이지다 */}
              <div className={styles.officialLinks} aria-label="대학 공식 자료">
                <span className={styles.officialLabel}>공식 자료</span>
                {universityOfficialSources.map((source) => (
                  <a key={source.university} className={styles.officialLink} href={source.url} target="_blank" rel="noopener noreferrer" title={source.label}>
                    {source.university === 'KAIST' ? 'KAIST 입학처 열기' : `${source.university} 입학본부 열기`}
                    <span className="lh-visually-hidden"> ({source.label}, 새 창)</span>
                  </a>
                ))}
                <button type="button" className={`${styles.officialLink} ${styles.toolbarEnd}`} onClick={() => navigate(paths.universityAi)} data-testid="open-university-ai">
                  새 PDF AI 문항 분석
                </button>
              </div>
              <div className={styles.toolbar}>
                <div className={styles.chips} role="group" aria-label="대학">
                  <button type="button" className={styles.chip} aria-pressed={!university} onClick={() => update('university', '')}>
                    전체 {data.items.length}
                  </button>
                  {universities.map((value) => (
                    <button key={value} type="button" className={styles.chip} aria-pressed={university === value} onClick={() => update('university', value)}>
                      {value} {data.items.filter((item) => item.document.university === value).length}
                    </button>
                  ))}
                </div>
                <div className={`${styles.actions} ${styles.toolbarEnd}`}>
                  <select className={styles.select} aria-label="학년도" value={year} onChange={(event) => update('year', event.target.value)}>
                    <option value="">전체 학년도</option>
                    {years.map((value) => (
                      <option key={value} value={value}>
                        {value}학년도
                      </option>
                    ))}
                  </select>
                  <select className={styles.select} aria-label="과목·영역" value={area} onChange={(event) => update('area', event.target.value)}>
                    <option value="">전체 분야</option>
                    {areas.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <select className={styles.select} aria-label="자료 유형" value={category} onChange={(event) => update('category', event.target.value)}>
                    <option value="">전체 유형</option>
                    {Object.entries(examCategoryLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button type="button" className={styles.primaryButton} disabled title="원본 PDF는 Manifest 도구(npm run exam-manifest)로만 추가해요 — 배포 권한 확인 전 (P-25)">
                    <PlusIcon size={15} /> 자료 등록
                  </button>
                </div>
              </div>
              <div className={styles.toolbar}>
                <form
                  role="search"
                  onSubmit={(event) => {
                    event.preventDefault()
                    update('q', query.trim())
                  }}
                >
                  <SearchBox value={query} onChange={setQuery} placeholder="자료명·문항·개념 검색" label="대학별 자료 검색" />
                </form>
                <p className={styles.muted}>
                  문서 {data.items.length}개 · 문항 {questionCount}개 · {filtered.length}개 표시
                </p>
              </div>
              {filtered.length === 0 ? (
                <ListEmpty
                  filtered={data.items.length > 0}
                  title="등록된 대학별 자료가 없어요"
                  onReset={() => {
                    setQuery('')
                    replaceSearch('')
                  }}
                />
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table} style={{ minWidth: 1040 }}>
                    <thead>
                      <tr>
                        <th scope="col">자료</th>
                        <th scope="col">유형</th>
                        <th scope="col">분야</th>
                        <th scope="col">분량</th>
                        <th scope="col">이용 조건</th>
                        <th scope="col">관련 Task</th>
                        <th scope="col">공개</th>
                        <th scope="col" aria-label="작업" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((item) => (
                        <UniversityRow key={item.document.documentId} item={item} fileState={fileStates?.[item.document.documentId]} tasks={tasksFor(item).map((task) => task.title)} pending={pending} onToggle={() => togglePublish(item)} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )
        }}
      </RemoteView>
      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}

function UniversityRow({ item, fileState, tasks, pending, onToggle }: { item: AdminUniversityResource; fileState: UniversityFileState | undefined; tasks: string[]; pending: boolean; onToggle: () => void }) {
  const { document } = item
  const open = () => navigate(paths.university(document.documentId))
  const published = item.publishState === 'PUBLISHED'
  return (
    <tr>
      <td>
        <button type="button" className={styles.rowButton} onClick={open}>
          <span className={styles.cellTitle} style={{ fontWeight: 500 }}>
            {document.title}
          </span>
          <span className={styles.cellSub}>
            {document.university} {document.academicYear}학년도 · 확인 {item.checkedDate ? dateLabel(item.checkedDate) : '미확인'} · 링크 {item.sourceUrl ? '확인' : '미확인'}
            {fileState && fileState !== 'AVAILABLE' ? ` · ${fileStateLabels[fileState].label}` : ''}
          </span>
        </button>
      </td>
      <td>
        <span className={styles.badge} data-tone={document.category === 'PAST_EXAM' ? 'primary' : document.category === 'SAMPLE_QUESTION' ? 'success' : undefined}>
          {document.category === 'SAMPLE_QUESTION' ? '예시 문항 · 실제 기출 아님' : examCategoryLabels[document.category]}
        </span>
      </td>
      <td>
        <span className={styles.cellClamp} style={{ maxWidth: 200 }}>
          {document.subjectAreas.join(' · ') || '—'}
        </span>
      </td>
      <td>
        {document.pageCount}쪽 · 문항 {document.questions.length}
        <span className={styles.cellSub}>{fileSizeLabel(document.sizeBytes)}</span>
      </td>
      <td>
        <span className={styles.cellSub} style={{ marginTop: 0 }}>
          {item.licenseNote?.startsWith('원본 PDF 공개 배포 권한 확인 전') ? '확인 필요' : item.licenseNote ?? '확인 필요'}
        </span>
      </td>
      <td>
        <span className={`${styles.cellSub} ${styles.cellClamp}`} style={{ maxWidth: 220, marginTop: 0 }}>
          {tasks.length ? tasks.join(', ') : '—'}
        </span>
      </td>
      <td>
        <button
          type="button"
          role="switch"
          className={styles.switch}
          aria-checked={published}
          aria-label={`${document.title} 학생 공개`}
          title={!published && (!item.sourceUrl || !item.checkedDate) ? '공식 게시 주소와 확인일을 먼저 적어야 공개할 수 있어요' : undefined}
          onClick={onToggle}
          disabled={pending}
        />
      </td>
      <td>
        <div className={styles.actions} style={{ flexWrap: 'nowrap' }}>
          <button type="button" className={`${styles.secondaryButton} ${styles.smallButton}`} onClick={open}>
            원문 보기
          </button>
          <button type="button" className={`${styles.ghostButton} ${styles.smallButton}`} onClick={() => navigate(`${paths.university(document.documentId)}?edit=1`)}>
            수정
          </button>
        </div>
      </td>
    </tr>
  )
}

// AD-10 대학별 자료 상세: 왼쪽 원문 PDF(독립 스크롤) + 오른쪽 문항 목차·자료 정보. Student 원문 보기와 같은 Viewer·목차.
// 학생용 '탐구 시작' 대신 '심화 Task에 연결'을 쓴다.
export function UniversityDetailRoute({ documentId, search }: { documentId: string; search: URLSearchParams }) {
  const detail = useRemote(() => getUniversityResource(documentId), [documentId])
  const catalog = useRemote(() => listCatalog(), [])
  const page = Math.max(1, Number(search.get('page') ?? '1') || 1)
  const [panel, setPanel] = useState<'toc' | 'info'>('toc')
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null)
  const [linkQuestion, setLinkQuestion] = useState<{ questionId: string; label: string } | null>(null)
  const [editing, setEditing] = useState(search.get('edit') === '1')
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const { run, pending } = useCommand()

  const goTo = (target: number, questionId?: string) => {
    if (questionId) setCurrentQuestionId(questionId)
    const next = new URLSearchParams(search)
    next.set('page', String(target))
    replaceSearch(next.toString())
  }

  const togglePublish = async (item: AdminUniversityResource) => {
    const outcome = await run(() => setUniversityPublish(item.document.documentId, item.publishState === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'))
    if (!outcome) return
    if (outcome.ok) {
      detail.setData(outcome.value)
      setToast({ id: nextToastId(), tone: 'success', text: outcome.value.publishState === 'PUBLISHED' ? '학생 대학별 자료에 공개했어요.' : '비공개로 바꿨어요.' })
    } else setToast({ id: nextToastId(), tone: 'error', text: `${outcome.error.message} (${outcome.error.code})` })
  }

  return (
    <div className={styles.detail}>
      <RemoteView state={detail.state} label="대학별 자료" onRetry={detail.reload}>
        {(item) => {
          const { document } = item
          const atPage = questionAtPage(document, page)
          const linkedTasks = catalog.state.status === 'success' ? catalog.state.data.items.filter((task) => task.relatedExamQuestionIds.some((id) => document.questions.some((question) => question.questionId === id))) : []
          return (
            <>
              <DetailHead trail={`심화 탐구 콘텐츠 / 대학별 자료 / ${universityLine(document)}`} title={document.title} backTo={paths.universities}>
                {document.category === 'SAMPLE_QUESTION' && (
                  <span className={styles.badge} data-tone="warning">
                    예시 문항 · 실제 기출 아님
                  </span>
                )}
                <PublishBadge state={item.publishState} />
                {officialSourceOf(document.university) && (
                  <a className={styles.officialLink} href={officialSourceOf(document.university)?.url} target="_blank" rel="noopener noreferrer" title={officialSourceOf(document.university)?.label}>
                    공식 자료실 열기
                  </a>
                )}
                <button type="button" className={styles.secondaryButton} onClick={() => setEditing(true)}>
                  정보 수정
                </button>
                <button type="button" className={styles.primaryButton} onClick={() => togglePublish(item)} disabled={pending}>
                  {item.publishState === 'PUBLISHED' ? '비공개로 전환' : '공개하기'}
                </button>
              </DetailHead>
              <div className={`${styles.split} ${styles.splitWide}`}>
                <div className={styles.pdfPane}>
                  <PdfViewer url={universityExamFileUrl(document.documentId)} title={document.title} expectedPageCount={document.pageCount} page={Math.min(page, document.pageCount)} onPageChange={(next) => goTo(next)} />
                  <p className={styles.hint} style={{ marginTop: 8 }}>
                    원문 PDF는 배포 권한 확인 전이라 이 환경에서만 열려요.
                  </p>
                </div>
                <aside className={styles.side} aria-label="문항 목차와 자료 정보">
                  <div className={styles.sideTabs} role="tablist">
                    <button type="button" role="tab" aria-selected={panel === 'toc'} aria-current={panel === 'toc' ? 'page' : undefined} className={styles.subTab} onClick={() => setPanel('toc')}>
                      문항 목차 {document.questions.length}
                    </button>
                    <button type="button" role="tab" aria-selected={panel === 'info'} aria-current={panel === 'info' ? 'page' : undefined} className={styles.subTab} onClick={() => setPanel('info')}>
                      자료 정보
                    </button>
                  </div>
                  <div className={styles.sideBody}>
                    <div className={styles.boxSubtle} style={{ marginBottom: 12 }} aria-live="polite">
                      지금 보는 쪽 {page}쪽 · {atPage ? `${questionDisplayLabel(atPage)} (${pageRangeLabel(atPage.pageStart, atPage.pageEnd)})` : '문항 범위 밖'}
                    </div>
                    {panel === 'toc' ? (
                      <ExamQuestionNavigator
                        document={document}
                        currentQuestionId={currentQuestionId ?? atPage?.questionId ?? null}
                        currentPage={page}
                        onGoTo={(target, questionId) => goTo(target, questionId)}
                        onStartTask={(question) => setLinkQuestion({ questionId: question.questionId, label: questionDisplayLabel(question) })}
                        actionLabel="심화 Task에 연결"
                      />
                    ) : (
                      <dl className={styles.stack} style={{ margin: 0 }}>
                        <Info label="대학" value={`${document.university} (${document.universityName})`} />
                        <Info label="학년도 · 유형" value={`${document.academicYear}학년도 · ${examCategoryLabels[document.category]} · ${document.examType}`} />
                        <Info label="발행 기관" value={item.publisher} />
                        <Info label="대학 공식 자료실" value={officialSourceOf(document.university)?.label ?? '등록된 자료실 없음'} />
                        <Info label="이 자료의 공식 원본 URL" value={item.sourceUrl ?? '미확인 — 개별 PDF 주소를 확인하기 전이에요 (자료실 주소와 다름)'} />
                        <Info label="확인일" value={item.checkedDate ? dateLabel(item.checkedDate) : '—'} />
                        <Info label="이용 조건" value={item.licenseNote ?? '—'} />
                        <Info label="분량" value={`${document.pageCount}쪽 · ${fileSizeLabel(document.sizeBytes)} · 문항 ${document.questions.length}개`} />
                        <Info label="과목·영역" value={document.subjectAreas.join(' · ') || '—'} />
                        <Info label="원본 확인값" value={`SHA-256 ${document.sha256.slice(0, 12)}…`} />
                        <div>
                          <dt className={styles.label}>연결한 심화 Task</dt>
                          <dd style={{ margin: 0 }}>
                            {linkedTasks.length === 0 ? (
                              <span className={styles.muted}>없음 · 문항 목차에서 연결해요</span>
                            ) : (
                              linkedTasks.map((task) => (
                                <button key={task.catalogTaskId} type="button" className={styles.linkButton} style={{ display: 'block' }} onClick={() => navigate(paths.task(task.catalogTaskId))}>
                                  {task.title}
                                </button>
                              ))
                            )}
                          </dd>
                        </div>
                        {item.updatedAt && <p className={styles.hint}>최근 수정 {dateTimeLabel(item.updatedAt)}</p>}
                      </dl>
                    )}
                  </div>
                </aside>
              </div>
              {editing && (
                <MetaModal
                  item={item}
                  onClose={() => setEditing(false)}
                  onSaved={(saved) => {
                    setEditing(false)
                    detail.setData(saved)
                    setToast({ id: nextToastId(), tone: 'success', text: '자료 정보를 저장했어요. 문항 위치·쪽 수는 원본 그대로예요.' })
                  }}
                />
              )}
              {linkQuestion && catalog.state.status === 'success' && (
                <LinkTaskModal
                  label={linkQuestion.label}
                  tasks={catalog.state.data.items.map((task) => ({ id: task.catalogTaskId, title: task.title, linked: task.relatedExamQuestionIds.includes(linkQuestion.questionId) }))}
                  onClose={() => setLinkQuestion(null)}
                  onLink={async (taskId) => {
                    const outcome = await run(() => linkToCatalogTask(taskId, { examQuestionId: linkQuestion.questionId, documentId: document.documentId }))
                    if (!outcome) return
                    if (outcome.ok) {
                      setLinkQuestion(null)
                      catalog.reload()
                      setToast({ id: nextToastId(), tone: 'success', text: `'${outcome.value.title}' Task에 ${linkQuestion.label}을(를) 연결했어요.` })
                    } else setToast({ id: nextToastId(), tone: 'error', text: `${outcome.error.message} (${outcome.error.code})` })
                  }}
                  pending={pending}
                />
              )}
            </>
          )
        }}
      </RemoteView>
      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className={styles.label}>{label}</dt>
      <dd className={styles.notePara} style={{ fontSize: 13, margin: 0 }}>
        {value}
      </dd>
    </div>
  )
}

const licenseOptions = ['확인 필요', '공식 사이트 이동만', '내부 미리보기 허용']

function MetaModal({ item, onClose, onSaved }: { item: AdminUniversityResource; onClose: () => void; onSaved: (item: AdminUniversityResource) => void }) {
  const [input, setInput] = useState<UniversityMetaInput>({
    title: item.document.title,
    examType: item.document.examType,
    publisher: item.publisher,
    sourceUrl: item.sourceUrl,
    checkedDate: item.checkedDate,
    licenseNote: item.licenseNote,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const { run, pending } = useCommand()

  const submit = async () => {
    setFormError(null)
    const outcome = await run(() => updateUniversityResource(item.document.documentId, input))
    if (!outcome) return
    if (outcome.ok) onSaved(outcome.value)
    else if (outcome.error.code === 'VALIDATION_ERROR') setErrors(outcome.error.fieldReasons())
    else setFormError(`${outcome.error.message} (${outcome.error.code})`)
  }

  return (
    <Modal
      title="공개 자료 정보 수정"
      onRequestClose={() => !pending && onClose()}
      footer={
        <>
          <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={pending}>
            취소
          </button>
          <button type="button" className={styles.primaryButton} onClick={submit} disabled={pending} aria-busy={pending}>
            {pending ? '저장 중…' : '저장'}
          </button>
        </>
      }
    >
      <div className={styles.form}>
        {formError && (
          <p className={styles.formError} role="alert">
            <AlertIcon size={15} /> {formError}
          </p>
        )}
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span className={styles.label}>대학</span>
            <input className={styles.input} value={item.document.university} readOnly />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>학년도</span>
            <input className={styles.input} value={`${item.document.academicYear}학년도`} readOnly />
          </label>
        </div>
        <TextField id="uni-title" label="자료명 (공식 사이트 표기 그대로)" required value={input.title} error={errors.title} onChange={(value) => setInput((previous) => ({ ...previous, title: value }))} />
        <div className={styles.formGrid}>
          <TextField id="uni-type" label="원문 유형 표기" value={input.examType} onChange={(value) => setInput((previous) => ({ ...previous, examType: value }))} />
          <TextField id="uni-publisher" label="발행 기관" value={input.publisher} onChange={(value) => setInput((previous) => ({ ...previous, publisher: value }))} />
        </div>
        <TextField id="uni-url" label="공식 PDF 또는 자료 페이지 URL" value={input.sourceUrl ?? ''} error={errors.sourceUrl} placeholder="대학 입학처 공식 게시 주소" onChange={(value) => setInput((previous) => ({ ...previous, sourceUrl: value.trim() || null }))} />
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span className={styles.label}>확인일</span>
            <input className={styles.input} type="date" value={input.checkedDate ?? ''} onChange={(event) => setInput((previous) => ({ ...previous, checkedDate: event.target.value || null }))} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>이용 조건</span>
            <select className={styles.select} style={{ height: 38 }} value={licenseOptions.includes(input.licenseNote ?? '') ? input.licenseNote ?? '' : 'custom'} onChange={(event) => setInput((previous) => ({ ...previous, licenseNote: event.target.value === 'custom' ? previous.licenseNote : event.target.value }))}>
              {licenseOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              <option value="custom">{licenseOptions.includes(input.licenseNote ?? '') ? '직접 적기' : `직접 적은 내용: ${input.licenseNote ?? ''}`.slice(0, 40)}</option>
            </select>
          </label>
        </div>
        <p className={styles.mockNotice}>
          <InfoIcon size={14} /> 문항 위치·쪽 수·파일 확인값은 원본 Manifest 값이라 여기서 바꾸지 않아요. 공개하려면 공식 게시 주소와 확인일이 필요해요.
        </p>
      </div>
    </Modal>
  )
}

function LinkTaskModal({ label, tasks, onClose, onLink, pending }: { label: string; tasks: { id: string; title: string; linked: boolean }[]; onClose: () => void; onLink: (taskId: string) => void; pending: boolean }) {
  const [taskId, setTaskId] = useState('')
  return (
    <Modal
      title="심화 Task에 문항 연결"
      compact
      onRequestClose={() => !pending && onClose()}
      footer={
        <>
          <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={pending}>
            취소
          </button>
          <button type="button" className={styles.primaryButton} onClick={() => onLink(taskId)} disabled={!taskId || pending}>
            연결
          </button>
        </>
      }
    >
      <div className={styles.form}>
        <p className={styles.notePara}>{label}을(를) 공통 심화 Task의 참고 문항으로 연결해요. 학생 개인 탐구 기록은 바뀌지 않아요.</p>
        <label className={styles.field}>
          <span className={styles.label}>심화 Task</span>
          <select className={styles.select} value={taskId} onChange={(event) => setTaskId(event.target.value)}>
            <option value="">고르기</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id} disabled={task.linked}>
                {task.title}
                {task.linked ? ' (이미 연결됨)' : ''}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className={styles.linkButton} onClick={() => navigate(paths.taskNew)}>
          새 Task 만들기
        </button>
      </div>
    </Modal>
  )
}
