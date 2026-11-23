import { useEffect, useId, useState, type ReactNode } from 'react'
import { navigate, replaceSearch } from '../../../app/adminLocation.ts'
import {
  getMockExamMaterial,
  getReferenceCatalog,
  linkToCatalogTask,
  listCatalog,
  listMockExamMaterials,
  mockExamPassageMaxLength,
  saveMockExamMaterial,
  setMockExamPublish,
  type MockExamInput,
} from '../api/assessmentAdminApi.ts'
import { MockExamAiPanel } from '../ai/MockExamAiPanel.tsx'
import { examLine, mockExamSubjectName, mockExamSubjects } from '../api/canonicalSource.ts'
import type { AdminMockExamMaterial, PublishState } from '../api/types.ts'
import { DetailHead, ListEmpty, PublishBadge, RemoteView, SearchBox } from '../components/AdminParts.tsx'
import { AlertIcon, InfoIcon, MockExamPassage, PlusIcon, Toast, type ToastMessage } from '../components/canonicalUi.ts'
import { dateTimeLabel, nextToastId, splitList } from '../model/adminFormat.ts'
import { useCommand, useRemote } from '../model/useRemote.ts'
import styles from '../styles/assessmentAdmin.module.css'
import { TextField } from './CatalogTaskRoutes.tsx'
import { paths } from './paths.ts'

type SortKey = 'id' | 'recent'

const examSubjects = mockExamSubjects.filter((subject) => subject.subjectId === 'mock_kor' || subject.subjectId === 'mock_eng')

const matchesMaterial = (item: AdminMockExamMaterial, query: string) => {
  const keyword = query.trim().toLowerCase()
  if (!keyword) return true
  const { material } = item
  return [material.materialId, material.idea.topicTitle, material.idea.coreMaterial, material.idea.goal, ...material.idea.relatedFields, material.research?.examTitle, material.research?.questionLabel]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(keyword))
}

// AD-06 모의고사 탐구 소재 목록 (목업 AM-12: 검색 + 공개 상태 Chip + 카드 Grid). Student 모의고사 60선과 같은 원본·같은 ID (canonicalSource).
export function MockExamListView({ search }: { search: URLSearchParams }) {
  const list = useRemote(() => listMockExamMaterials(), [])
  const subjectId = search.get('subject') ?? ''
  const year = search.get('year') ?? ''
  const grade = search.get('grade') ?? ''
  const state = search.get('state') ?? ''
  const sort = (search.get('sort') as SortKey | null) ?? 'id'
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

  const togglePublish = async (item: AdminMockExamMaterial) => {
    const outcome = await run(() => setMockExamPublish(item.material.materialId, item.publishState === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'))
    if (!outcome) return
    if (outcome.ok) {
      list.reload()
      setToast({ id: nextToastId(), tone: 'success', text: outcome.value.publishState === 'PUBLISHED' ? '학생 모의고사 60선에 공개했어요.' : '공개를 중단했어요. 이미 시작한 학생 탐구는 그대로예요.' })
    } else setToast({ id: nextToastId(), tone: 'error', text: `${outcome.error.message} (${outcome.error.code})` })
  }

  return (
    <div className={styles.body}>
      <RemoteView state={list.state} label="모의고사 탐구 소재" onRetry={list.reload}>
        {(data) => {
          const years = [...new Set(data.items.map((item) => item.material.source.academicYear).filter((value) => value !== null))].sort((a, b) => (b ?? 0) - (a ?? 0))
          const scoped = data.items
            .filter((item) => !subjectId || item.material.subjectId === subjectId)
            .filter((item) => !year || String(item.material.source.academicYear) === year)
            .filter((item) => !grade || (grade === 'none' ? item.material.source.grade === null : String(item.material.source.grade) === grade))
            .filter((item) => matchesMaterial(item, applied))
          const filtered = scoped
            .filter((item) => !state || item.publishState === state)
            .sort((a, b) => (sort === 'recent' ? Date.parse(b.updatedAt ?? '1970') - Date.parse(a.updatedAt ?? '1970') : a.material.materialId.localeCompare(b.material.materialId)))
          const stateCounts = { '': scoped.length, PUBLISHED: scoped.filter((item) => item.publishState === 'PUBLISHED').length, DRAFT: scoped.filter((item) => item.publishState === 'DRAFT').length }
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
                  <SearchBox value={query} onChange={setQuery} placeholder="주제명, 개념, 소재 검색" label="모의고사 소재 검색" />
                </form>
                <div className={styles.chips} role="group" aria-label="공개 상태">
                  {(
                    [
                      ['', '전체'],
                      ['PUBLISHED', '공개'],
                      ['DRAFT', '비공개'],
                    ] as const
                  ).map(([value, label]) => (
                    <button key={value} type="button" className={styles.chip} aria-pressed={state === value} onClick={() => update('state', value)}>
                      {label} {stateCounts[value]}
                    </button>
                  ))}
                </div>
                <button type="button" className={`${styles.primaryButton} ${styles.toolbarEnd}`} onClick={() => navigate(paths.mockExamNew)}>
                  <PlusIcon size={15} /> 새 탐구 소재 등록
                </button>
              </div>
              <div className={styles.toolbar}>
                <div className={styles.chips} role="group" aria-label="과목">
                  <button type="button" className={styles.chipQuiet} aria-pressed={!subjectId} onClick={() => update('subject', '')}>
                    전체 과목 {data.items.length}
                  </button>
                  {examSubjects.map((subject) => (
                    <button key={subject.subjectId} type="button" className={styles.chipQuiet} aria-pressed={subjectId === subject.subjectId} onClick={() => update('subject', subject.subjectId)}>
                      {subject.name} {data.items.filter((item) => item.material.subjectId === subject.subjectId).length}
                    </button>
                  ))}
                </div>
                <select className={styles.select} aria-label="학년도" value={year} onChange={(event) => update('year', event.target.value)}>
                  <option value="">전체 학년도</option>
                  {years.map((value) => (
                    <option key={value} value={String(value)}>
                      {value}학년도
                    </option>
                  ))}
                </select>
                <select className={styles.select} aria-label="학년" value={grade} onChange={(event) => update('grade', event.target.value)}>
                  <option value="">전체 학년</option>
                  {[1, 2, 3].map((value) => (
                    <option key={value} value={value}>
                      고{value}
                    </option>
                  ))}
                  <option value="none">학년 표기 없음 (평가원)</option>
                </select>
                <select className={`${styles.select} ${styles.toolbarEnd}`} aria-label="정렬" value={sort} onChange={(event) => update('sort', event.target.value)}>
                  <option value="id">소재 ID 순</option>
                  <option value="recent">최근 수정 순</option>
                </select>
              </div>
              <p className={styles.infoLine}>
                모의고사 지문 → 교과 개념 → 탐구 주제 → 탐구 방법 → 심화 방향을 정리해요. 지문 원문·도표·해설은 싣지 않아요 · {filtered.length}개 표시
              </p>
              {filtered.length === 0 ? (
                <ListEmpty
                  filtered={data.items.length > 0}
                  title="등록된 모의고사 탐구 소재가 없어요"
                  onReset={() => {
                    setQuery('')
                    replaceSearch('')
                  }}
                />
              ) : (
                <ul className={`${styles.listPlain} ${styles.materialGrid}`} aria-label="모의고사 탐구 소재">
                  {filtered.map((item) => {
                    const { material } = item
                    return (
                      <li key={material.materialId} className={styles.materialCard} data-material-id={material.materialId}>
                        <div className={styles.materialTop}>
                          <span className={styles.badge} data-tone={item.publishState === 'PUBLISHED' ? 'success' : undefined}>
                            {item.publishState === 'PUBLISHED' ? '공개' : '비공개'}
                          </span>
                          <span>
                            {mockExamSubjectName(material.subjectId)} · {material.idea.relatedFields.join(' · ')}
                          </span>
                        </div>
                        {/* 내부 소재 ID(EN-06 등)는 화면에 보이지 않는다 (요청 ⑥). 검색·수정·연결에는 그대로 쓴다 */}
                        <p className={styles.materialMeta}>
                          {examLine(material)}
                          {item.origin === 'ADMIN_CREATED' ? ' · 관리자 등록' : ''}
                        </p>
                        <h3 className={styles.materialTitle}>
                          <button type="button" className={styles.rowButton} onClick={() => navigate(paths.mockExam(material.materialId))}>
                            {material.idea.topicTitle}
                          </button>
                        </h3>
                        <p className={styles.materialDesc}>{material.idea.topicReason || material.idea.goal}</p>
                        <p className={styles.materialConcept}>핵심 소재 · {material.idea.coreMaterial}</p>
                        <div className={styles.materialActions}>
                          <button type="button" className={`${styles.secondaryButton} ${styles.smallButton}`} onClick={() => navigate(paths.mockExamEdit(material.materialId))}>
                            상세 보기·편집
                          </button>
                          <button type="button" className={`${styles.secondaryButton} ${styles.smallButton}`} onClick={() => togglePublish(item)} disabled={pending}>
                            {item.publishState === 'PUBLISHED' ? '공개 중단' : '학생용 공개'}
                          </button>
                          <span className={styles.hint}>{item.updatedAt ? `수정 ${dateTimeLabel(item.updatedAt)}` : '원본 60선'}</span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )
        }}
      </RemoteView>
      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}

// AD-06 소재 상세: 가운데 소재 내용, 오른쪽 관리(공개·내부 메모·Task 연결·학생 화면 미리보기)
export function MockExamDetailRoute({ materialId }: { materialId: string }) {
  const detail = useRemote(() => getMockExamMaterial(materialId), [materialId])
  const references = useRemote(() => getReferenceCatalog(), [])
  const catalog = useRemote(() => listCatalog(), [])
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [linkTaskId, setLinkTaskId] = useState('')
  const { run, pending } = useCommand()

  const togglePublish = async (item: AdminMockExamMaterial) => {
    const outcome = await run(() => setMockExamPublish(item.material.materialId, item.publishState === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'))
    if (!outcome) return
    if (outcome.ok) {
      detail.setData(outcome.value)
      setToast({ id: nextToastId(), tone: 'success', text: outcome.value.publishState === 'PUBLISHED' ? '학생 모의고사 60선에 공개했어요.' : '비공개로 바꿨어요. 이미 시작한 학생 탐구는 그대로예요.' })
    } else setToast({ id: nextToastId(), tone: 'error', text: `${outcome.error.message} (${outcome.error.code})` })
  }

  const link = async () => {
    if (!linkTaskId) return
    const outcome = await run(() => linkToCatalogTask(linkTaskId, { materialId }))
    if (!outcome) return
    if (outcome.ok) {
      setLinkTaskId('')
      detail.reload()
      setToast({ id: nextToastId(), tone: 'success', text: `'${outcome.value.title}' Task에 연결했어요.` })
    } else setToast({ id: nextToastId(), tone: 'error', text: `${outcome.error.message} (${outcome.error.code})` })
  }

  return (
    <div className={styles.detail}>
      <RemoteView state={detail.state} label="모의고사 탐구 소재" onRetry={detail.reload}>
        {(item) => {
          const { material } = item
          const research = material.research
          const sources = references.state.status === 'success' ? references.state.data.sources.filter((source) => item.referenceSourceIds.includes(source.sourceId)) : []
          const linked = catalog.state.status === 'success' ? catalog.state.data.items.filter((task) => item.relatedCatalogTaskIds.includes(task.catalogTaskId) || task.relatedMaterialIds.includes(material.materialId)) : []
          return (
            <>
              <DetailHead trail="심화 탐구 콘텐츠 / 모의고사 탐구 소재" title={material.idea.topicTitle} backTo={paths.mockExams}>
                <PublishBadge state={item.publishState} />
                <button type="button" className={styles.secondaryButton} onClick={() => navigate(paths.mockExamEdit(material.materialId))}>
                  수정
                </button>
                <button type="button" className={styles.primaryButton} onClick={() => togglePublish(item)} disabled={pending}>
                  {item.publishState === 'PUBLISHED' ? '비공개로 전환' : '공개하기'}
                </button>
              </DetailHead>
              <div className={styles.split}>
                <div className={styles.pane}>
                  <div className={styles.paneInner}>
                    <dl className={styles.metaBox}>
                      <Meta label="과목" value={mockExamSubjectName(material.subjectId)} />
                      <Meta label="시험" value={examLine(material)} />
                      <Meta label="학년도·월" value={`${material.source.academicYear ?? '—'}학년도 ${material.source.examMonth ? `${material.source.examMonth}월` : ''}`} />
                      <Meta label="학년" value={material.source.grade ? `고${material.source.grade}` : '표기 없음'} />
                      <Meta label="원본 쪽" value={research?.pdfPage ?? '—'} />
                      <Meta label="원본 파일" value={research?.originalFileName ?? '—'} />
                    </dl>
                    <Section title="소재명 · 관련 분야">
                      <p className={styles.notePara}>{material.idea.coreMaterial}</p>
                      <div className={styles.chips} style={{ marginTop: 6 }}>
                        {material.idea.relatedFields.map((field) => (
                          <span key={field} className={styles.badge}>
                            {field}
                          </span>
                        ))}
                      </div>
                    </Section>
                    <Section title="추천 탐구 주제">
                      <p className={styles.notePara}>{material.idea.topicTitle}</p>
                      <p className={styles.muted} style={{ marginTop: 4 }}>
                        {material.idea.topicReason}
                      </p>
                    </Section>
                    <Section title="탐구 방법 예시">
                      {material.idea.methods.map((method) => (
                        <p key={method.label} className={styles.notePara}>
                          <strong>{method.label}</strong> {method.text}
                        </p>
                      ))}
                    </Section>
                    <Section title="심화 탐구 질문">
                      {material.idea.extensionQuestions.map((question) => (
                        <p key={question} className={styles.notePara}>
                          · {question}
                        </p>
                      ))}
                    </Section>
                    <Section title="모의고사 지문 원문 (관리자 전용)">
                      {item.adminPassage.text ? (
                        <>
                          <MockExamPassage passage={item.adminPassage.text} examTitle={material.research?.examTitle ?? ''} questionLabel={material.research?.questionLabel ?? ''} collapsible={false} />
                          <p className={styles.hint}>
                            {item.adminPassage.text.length.toLocaleString()}자 · {item.adminPassage.origin === 'ADMIN_INPUT' ? '관리자 입력' : '로컬 파일'}
                            {item.adminPassage.updatedAt ? ` · ${dateTimeLabel(item.adminPassage.updatedAt)} 저장` : ''} · 학생에게 자동 공개하지 않아요 ·{' '}
                            {item.adminPassage.aiTransferAllowed ? '외부 AI 전송 조건 확인됨' : '외부 AI 전송 조건 미확인'}
                          </p>
                        </>
                      ) : (
                        <p className={styles.mockNotice} data-testid="passage-empty">
                          <InfoIcon size={14} /> 아직 원문을 입력하지 않았어요.
                        </p>
                      )}
                    </Section>
                    <Section title="관련 참고자료">
                      {sources.length === 0 ? (
                        <p className={styles.muted}>연결한 참고자료원이 없어요.</p>
                      ) : (
                        sources.map((source) => (
                          <div key={source.sourceId} className={styles.noteCard} style={{ marginBottom: 6 }}>
                            <span>
                              <span className={styles.badge}>{source.category}</span> {source.name}
                            </span>
                            <a className={styles.linkButton} href={source.url} target="_blank" rel="noreferrer noopener">
                              열기 ↗
                            </a>
                          </div>
                        ))
                      )}
                    </Section>
                  </div>
                </div>
                <aside className={styles.side} aria-label="소재 관리">
                  <div className={styles.sideBody}>
                    <div className={styles.stack}>
                      <div>
                        <span className={styles.label}>내부 메모 (학생 비공개)</span>
                        <p className={styles.notePara} style={{ fontSize: 13 }}>
                          {item.internalMemo ?? '—'}
                        </p>
                      </div>
                      <div>
                        <span className={styles.label}>원문 이용 조건</span>
                        <p className={styles.muted}>{item.sourceLicenseNote ?? '—'}</p>
                      </div>
                      <div>
                        <span className={styles.label}>연결한 심화 Task</span>
                        {linked.length === 0 ? (
                          <p className={styles.muted}>없음</p>
                        ) : (
                          linked.map((task) => (
                            <button key={task.catalogTaskId} type="button" className={styles.linkButton} style={{ display: 'block', marginTop: 4 }} onClick={() => navigate(paths.task(task.catalogTaskId))}>
                              {task.title}
                            </button>
                          ))
                        )}
                        {catalog.state.status === 'success' && (
                          <div className={styles.toolbar} style={{ marginTop: 8 }}>
                            <select className={styles.select} value={linkTaskId} onChange={(event) => setLinkTaskId(event.target.value)} aria-label="연결할 심화 Task">
                              <option value="">Task 고르기</option>
                              {catalog.state.data.items
                                .filter((task) => !linked.includes(task))
                                .map((task) => (
                                  <option key={task.catalogTaskId} value={task.catalogTaskId}>
                                    {task.title}
                                  </option>
                                ))}
                            </select>
                            <button type="button" className={`${styles.secondaryButton} ${styles.smallButton}`} onClick={link} disabled={!linkTaskId || pending}>
                              연결
                            </button>
                          </div>
                        )}
                      </div>
                      <div>
                        <span className={styles.label}>학생 화면 미리보기</span>
                        <div className={styles.box} style={{ marginTop: 6 }}>
                          <div className={styles.chips}>
                            <span className={styles.badge}>{mockExamSubjectName(material.subjectId)}</span>
                            <span className={styles.badge}>{examLine(material)}</span>
                          </div>
                          <p className={styles.cellTitle} style={{ marginTop: 8 }}>
                            {material.idea.topicTitle}
                          </p>
                          <p className={styles.muted}>{material.idea.coreMaterial}</p>
                        </div>
                        <p className={styles.hint} style={{ marginTop: 6 }}>
                          {item.publishState === 'PUBLISHED' ? '학생 모의고사 60선에 보여요.' : '비공개라 학생에게 보이지 않아요.'} 내부 메모는 학생에게 보이지 않아요. 이 화면의 변경은 Student 앱에 실시간으로 반영되지 않아요 (Stage 2).
                        </p>
                      </div>
                      {item.updatedAt && <p className={styles.hint}>최근 수정 {dateTimeLabel(item.updatedAt)}</p>}
                    </div>
                  </div>
                </aside>
              </div>
            </>
          )
        }}
      </RemoteView>
      <Toast message={toast} onDismiss={() => setToast(null)} />
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 18 }}>
      <h3 className={styles.sectionTitle} style={{ marginBottom: 6 }}>
        {title}
      </h3>
      {children}
    </section>
  )
}

const blankInput = (): MockExamInput => ({
  subjectId: 'mock_kor',
  source: { academicYear: null, examMonth: null, grade: null, questionNumber: null, sourceUrl: null },
  idea: { topicTitle: '', coreMaterial: '', relatedFields: [], topicReason: '', goal: '', methods: [], extensionQuestions: [] },
  internalMemo: null,
  sourceLicenseNote: null,
  referenceSourceIds: [],
  passageText: '',
  passageAiTransferAllowed: false,
})

const toNumber = (value: string) => (value.trim() === '' ? null : Number(value) || null)

// AD-06 소재 등록·수정 (AM-13~16). 원문 지문은 관리자 전용으로 입력·수정한다 (요청 ③, P-30). 학생 공개·Git Fixture 추가는 하지 않는다 (API-OD-A11).
export function MockExamEditRoute({ materialId }: { materialId: string | null }) {
  const existing = useRemote(() => (materialId ? getMockExamMaterial(materialId) : Promise.resolve(null)), [materialId])
  return (
    <div className={styles.detail}>
      <RemoteView state={existing.state} label="모의고사 탐구 소재" onRetry={existing.reload}>
        {(item) => <MockExamForm item={item} />}
      </RemoteView>
    </div>
  )
}

function MockExamForm({ item }: { item: AdminMockExamMaterial | null }) {
  const [input, setInput] = useState<MockExamInput>(() =>
    item
      ? {
          subjectId: item.material.subjectId,
          source: structuredClone(item.material.source),
          idea: structuredClone(item.material.idea),
          internalMemo: item.internalMemo,
          sourceLicenseNote: item.sourceLicenseNote,
          referenceSourceIds: [...item.referenceSourceIds],
          passageText: item.adminPassage.text,
          passageAiTransferAllowed: item.adminPassage.aiTransferAllowed,
        }
      : blankInput(),
  )
  // 저장하지 않은 변경 확인: 처음 연 값과 비교한다 (취소·창 닫기 전에 묻는다)
  const [initialJson] = useState(() => JSON.stringify(input))
  const dirty = JSON.stringify(input) !== initialJson
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  const cancel = () => {
    if (dirty && !window.confirm('저장하지 않은 변경이 있어요. 변경을 버리고 나갈까요?')) return
    navigate(item ? paths.mockExam(item.material.materialId) : paths.mockExams)
  }
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [linkTaskId, setLinkTaskId] = useState('')
  const references = useRemote(() => getReferenceCatalog(), [])
  const catalog = useRemote(() => listCatalog(), [])
  const { run, pending } = useCommand()
  const state: PublishState = item?.publishState ?? 'DRAFT'
  const research = item?.material.research
  const setIdea = <K extends keyof MockExamInput['idea']>(key: K, value: MockExamInput['idea'][K]) => {
    setInput((previous) => ({ ...previous, idea: { ...previous.idea, [key]: value } }))
    setErrors((previous) => ({ ...previous, [key]: '' }))
  }
  const setSource = <K extends keyof MockExamInput['source']>(key: K, value: MockExamInput['source'][K]) => setInput((previous) => ({ ...previous, source: { ...previous.source, [key]: value } }))

  /** 저장 후 공개 상태를 바꿀 때만 next를 준다. 연결 Task는 저장한 소재 ID로 연결한다 */
  const submit = async (next?: PublishState) => {
    setFormError(null)
    const outcome = await run(async () => {
      const saved = await saveMockExamMaterial(item?.material.materialId ?? null, input)
      if (linkTaskId) await linkToCatalogTask(linkTaskId, { materialId: saved.material.materialId })
      return next && next !== saved.publishState ? setMockExamPublish(saved.material.materialId, next) : saved
    })
    if (!outcome) return
    if (outcome.ok) navigate(paths.mockExam(outcome.value.material.materialId))
    else if (outcome.error.code === 'VALIDATION_ERROR') setErrors(outcome.error.fieldReasons())
    else setFormError(`${outcome.error.message} (${outcome.error.code})`)
  }

  const linkedTasks = catalog.state.status === 'success' && item ? catalog.state.data.items.filter((task) => task.relatedMaterialIds.includes(item.material.materialId)) : []

  return (
    <>
      <DetailHead trail="심화 탐구 콘텐츠 / 모의고사 탐구 소재" title={item ? item.material.idea.topicTitle : '새 탐구 소재'} backTo={item ? paths.mockExam(item.material.materialId) : paths.mockExams}>
        <span className={styles.hint} data-testid="form-dirty">
          {dirty ? '저장하지 않은 변경 있음 · ' : ''}
          {state === 'PUBLISHED' ? '공개' : item ? '비공개' : '임시 저장'}
        </span>
        <button type="button" className={styles.secondaryButton} onClick={cancel} disabled={pending}>
          취소
        </button>
        <button type="button" className={styles.secondaryButton} onClick={() => submit()} disabled={pending}>
          {state === 'PUBLISHED' ? '변경 저장' : '임시 저장'}
        </button>
        <button type="button" className={styles.primaryButton} onClick={() => submit(state === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED')} disabled={pending} aria-busy={pending}>
          {pending ? '저장 중…' : state === 'PUBLISHED' ? '공개 중단' : '저장하고 학생용 공개'}
        </button>
      </DetailHead>
      <div className={styles.split}>
        <div className={styles.pane}>
          <div className={styles.paneInnerWide}>
            <div className={styles.form}>
              {formError && (
                <p className={styles.formError} role="alert">
                  <AlertIcon size={15} /> {formError}
                </p>
              )}
              <h3 className={styles.formSectionTitle}>모의고사 기본정보</h3>
              <div className={styles.formGrid3}>
                <TextField id="me-year" label="학년도" value={input.source.academicYear?.toString() ?? ''} placeholder="2026" onChange={(value) => setSource('academicYear', toNumber(value))} />
                <TextField id="me-month" label="시행 월" value={input.source.examMonth?.toString() ?? ''} placeholder="3" onChange={(value) => setSource('examMonth', toNumber(value))} />
                <TextField id="me-grade" label="대상 학년 (평가원은 비워 두기)" value={input.source.grade?.toString() ?? ''} placeholder="2" onChange={(value) => setSource('grade', toNumber(value))} />
                <TextField id="me-question" label="문항 번호" value={input.source.questionNumber ?? ''} placeholder="22번" onChange={(value) => setSource('questionNumber', value || null)} />
                <label className={styles.field}>
                  <span className={styles.label}>과목</span>
                  <select className={styles.select} style={{ height: 38 }} value={input.subjectId} onChange={(event) => setInput((previous) => ({ ...previous, subjectId: event.target.value }))}>
                    {examSubjects.map((subject) => (
                      <option key={subject.subjectId} value={subject.subjectId}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className={styles.field}>
                  <span className={styles.label}>원본 시험</span>
                  <p className={styles.muted} style={{ padding: '10px 0' }}>
                    {research ? `${research.examTitle} · ${research.questionLabel} · ${research.pdfPage}` : '관리자 등록 소재'}
                  </p>
                </div>
              </div>
              <TextField id="me-url" label="원본 PDF 또는 공식 URL" value={input.source.sourceUrl ?? ''} placeholder="https://" onChange={(value) => setSource('sourceUrl', value || null)} />

              <h3 className={styles.formSectionTitle}>모의고사 지문 원문</h3>
              <PassageField
                value={input.passageText}
                aiTransferAllowed={input.passageAiTransferAllowed}
                error={errors.passageText}
                onChange={(value) => {
                  setInput((previous) => ({ ...previous, passageText: value, passageAiTransferAllowed: value.trim() === '' ? false : previous.passageAiTransferAllowed }))
                  setErrors((previous) => ({ ...previous, passageText: '' }))
                }}
                onAiTransferChange={(value) => setInput((previous) => ({ ...previous, passageAiTransferAllowed: value }))}
              />
              <MockExamAiPanel
                materialId={item?.material.materialId ?? null}
                passageText={input.passageText}
                aiTransferAllowed={input.passageAiTransferAllowed}
                context={{ subjectName: mockExamSubjectName(input.subjectId), academicYear: input.source.academicYear, examMonth: input.source.examMonth, grade: input.source.grade, questionNumber: input.source.questionNumber }}
                onApply={(idea) => setInput((previous) => ({ ...previous, idea: { ...previous.idea, ...idea } }))}
              />

              <h3 className={styles.formSectionTitle}>탐구 소재</h3>
              <TextField id="me-topic" label="추천 수행평가 주제명 (카드 제목)" required value={input.idea.topicTitle} error={errors.topicTitle} onChange={(value) => setIdea('topicTitle', value)} />
              <TextField id="me-core" label="핵심 소재" required value={input.idea.coreMaterial} error={errors.coreMaterial} onChange={(value) => setIdea('coreMaterial', value)} />
              <TextField id="me-fields" label="관련 학문 분야 (· 또는 쉼표로 구분)" value={input.idea.relatedFields.join(' · ')} onChange={(value) => setIdea('relatedFields', splitList(value.replace(/·/g, ',')))} />
              <TextField id="me-reason" label="추천 이유·탐구 아이디어" multiline value={input.idea.topicReason} onChange={(value) => setIdea('topicReason', value)} />
              <TextField id="me-goal" label="탐구 목표" multiline value={input.idea.goal} onChange={(value) => setIdea('goal', value)} />
              <TextField
                id="me-methods"
                label="탐구 방법 (한 줄에 하나)"
                multiline
                value={input.idea.methods.map((method) => method.text).join('\n')}
                onChange={(value) => setIdea('methods', splitList(value).map((text, index) => ({ label: `방법 ${index + 1}`, text })))}
              />
              <TextField id="me-questions" label="심화 탐구 질문 (한 줄에 하나)" multiline value={input.idea.extensionQuestions.join('\n')} onChange={(value) => setIdea('extensionQuestions', splitList(value))} />
              <TextField id="me-memo" label="관리자 메모 (학생에게 보이지 않아요)" multiline value={input.internalMemo ?? ''} onChange={(value) => setInput((previous) => ({ ...previous, internalMemo: value || null }))} />
              <TextField id="me-license" label="원문 이용 조건 메모" multiline value={input.sourceLicenseNote ?? ''} onChange={(value) => setInput((previous) => ({ ...previous, sourceLicenseNote: value || null }))} />

              <h3 className={styles.formSectionTitle}>연결</h3>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="me-task">
                  관련 심화 Task
                </label>
                <div className={styles.toolbar} style={{ marginBottom: 0 }}>
                  <select id="me-task" className={styles.select} style={{ flex: 1, minWidth: 0 }} value={linkTaskId} onChange={(event) => setLinkTaskId(event.target.value)}>
                    <option value="">{linkedTasks.length ? `연결됨: ${linkedTasks.map((task) => task.title).join(', ')}` : '연결 안 함'}</option>
                    {catalog.state.status === 'success' &&
                      catalog.state.data.items
                        .filter((task) => !linkedTasks.includes(task))
                        .map((task) => (
                          <option key={task.catalogTaskId} value={task.catalogTaskId}>
                            {task.title}
                          </option>
                        ))}
                  </select>
                  <button type="button" className={styles.secondaryButton} onClick={() => navigate(paths.taskNew)}>
                    <PlusIcon size={14} /> 새 Task 초안 만들기
                  </button>
                </div>
              </div>
              <div className={styles.field}>
                <span className={styles.label}>참고자료원 연결</span>
                {references.state.status === 'success' && (
                  <div className={styles.chips}>
                    {references.state.data.sources.map((source) => (
                      <button
                        key={source.sourceId}
                        type="button"
                        className={styles.chip}
                        aria-pressed={input.referenceSourceIds.includes(source.sourceId)}
                        onClick={() =>
                          setInput((previous) => ({
                            ...previous,
                            referenceSourceIds: previous.referenceSourceIds.includes(source.sourceId) ? previous.referenceSourceIds.filter((id) => id !== source.sourceId) : [...previous.referenceSourceIds, source.sourceId],
                          }))
                        }
                      >
                        + {source.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <aside className={`${styles.side} ${styles.sideSubtle}`} aria-label="학생 카드 미리보기">
          <div className={styles.sideBody}>
            <p className={styles.previewLabel}>학생 카드 미리보기</p>
            <div className={styles.materialCard}>
              <p className={styles.materialMeta} style={{ marginTop: 0 }}>
                {mockExamSubjectName(input.subjectId)} · {input.source.academicYear ?? '—'}학년도 {input.source.examMonth ? `${input.source.examMonth}월` : ''} {input.source.questionNumber ?? ''}
              </p>
              <h3 className={styles.materialTitle}>{input.idea.topicTitle || '주제명'}</h3>
              <p className={styles.materialDesc}>{input.idea.topicReason || '—'}</p>
              <p className={styles.materialConcept}>{input.idea.coreMaterial || '—'}</p>
              <p className={styles.materialConcept}>{input.idea.relatedFields.join(' · ') || '—'}</p>
            </div>
            <p className={styles.hint} style={{ marginTop: 10 }}>
              전체 학생 공개는 &lsquo;학생용 공개&rsquo;로, 특정 학생 추천은 피드백 작성 화면에서 따로 해요. 관리자 메모는 학생에게 보이지 않아요.
            </p>
          </div>
        </aside>
      </div>
    </>
  )
}

/**
 * 모의고사 지문 원문 입력 (요청 ③, P-30). 여러 줄 붙여넣기·긴 지문 스크롤·글자 수를 지원한다.
 * 원문은 관리자 전용이며 학생 카드에 자동으로 붙지 않는다. 외부 AI 전송 여부는 관리자가 이용 조건을 확인한 뒤에만 켤 수 있다.
 */
function PassageField({
  value,
  aiTransferAllowed,
  error,
  onChange,
  onAiTransferChange,
}: {
  value: string
  aiTransferAllowed: boolean
  error?: string
  onChange: (value: string) => void
  onAiTransferChange: (value: boolean) => void
}) {
  const id = useId()
  const over = value.length > mockExamPassageMaxLength
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={`${id}-text`}>
        원문 텍스트
      </label>
      <textarea
        id={`${id}-text`}
        className={styles.passageInput}
        value={value}
        placeholder="여기에 모의고사 지문을 직접 입력하거나 붙여 넣으세요."
        aria-describedby={`${id}-count ${id}-policy`}
        aria-invalid={Boolean(error) || over}
        spellCheck={false}
        data-testid="passage-input"
        onChange={(event) => onChange(event.target.value)}
      />
      <div className={styles.passageMeta}>
        <span id={`${id}-count`} data-over={over} data-testid="passage-count">
          {value.length === 0 ? '원문 미입력' : `${value.length.toLocaleString()}자`} / {mockExamPassageMaxLength.toLocaleString()}자
        </span>
        {error && (
          <span className={styles.passageError} role="alert">
            {error}
          </span>
        )}
      </div>
      <p id={`${id}-policy`} className={styles.hint}>
        관리자 전용 원문이에요. 학생에게 자동 공개하지 않고 Git Fixture에도 넣지 않아요. 지금은 시연용 메모리에만 저장되어 새로고침하면 사라져요 (서버 저장소 연결 전).
      </p>
      <label className={styles.checkLine}>
        <input type="checkbox" checked={aiTransferAllowed} disabled={value.trim() === ''} onChange={(event) => onAiTransferChange(event.target.checked)} />
        원문 이용 조건을 확인했고, AI 분석을 위해 외부 AI Provider로 보내도 돼요
      </label>
    </div>
  )
}
