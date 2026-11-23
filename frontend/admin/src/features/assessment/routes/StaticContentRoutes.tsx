import { useEffect, useState, type ReactNode } from 'react'
import { navigate, replaceSearch } from '../../../app/adminLocation.ts'
import { getUniversityFileStates, universityExamFileUrl, type UniversityFileState } from '../api/assessmentAdminApi.ts'
import {
  areaLabel,
  areasOfSource,
  catalogSubjectLabels,
  examCategoryLabels,
  examLine,
  getCatalogContent,
  getMockExamContent,
  getReferenceCatalogContent,
  getUniversityExamContent,
  listCatalogContent,
  listMockExamContent,
  listUniversityExamContent,
  mockExamPassageCount,
  mockExamSubjectName,
  mockExamSubjects,
  pageRangeLabel,
  questionAtPage,
  questionDisplayLabel,
  sourcesForArea,
  universityLine,
} from '../api/canonicalSource.ts'
import type { ReferenceAreaKey, ReferenceSourceCategory, UniversityExamDocument } from '../api/canonicalSource.ts'
import { DetailHead, ListEmpty, SearchBox } from '../components/AdminParts.tsx'
import { EmptyState, ExamQuestionNavigator, InfoIcon, MockExamPassage, PdfViewer } from '../components/canonicalUi.ts'
import { fileSizeLabel } from '../model/adminFormat.ts'
import { officialSourceOf, universityOfficialSources } from '../model/universityOfficialSources.ts'
import styles from '../styles/assessmentAdmin.module.css'
import { paths } from './paths.ts'

// Admin 심화 탐구 콘텐츠 (AD-06·09·10 "읽기 전용 열람", assessment-enrichment-content.md §2·§4, 2026-11-12).
// - Student 심화 탐구와 같은 정적 원천(student/.../content/enrichmentContent.ts)을 canonicalSource.ts로 읽는다. Admin 전용 배열을 두지 않는다.
// - Backend·MySQL을 쓰지 않는다(dataSource와 무관). http 모드에서 503을 내지 않는다. Loading·Error가 없다(동기 조회).
// - 등록·수정·공개/비공개·Task 생성·Task 연결·관리자 원문 입력·AI 분석 진입은 제공하지 않는다(명세 §4).
// - 관리자 참고자료실(AD-07·08, 실제 Resource API·MySQL)은 별도 화면이며 이 파일과 무관하다.
// 필터·검색·선택은 URL Query에 둔다(새로고침·공유해도 같은 화면).

const staticNotice = '읽기 전용 참고자료예요. 학생 기록을 만들지 않아요.'

function useUpdate(search: URLSearchParams) {
  return (changes: Record<string, string>) => {
    const next = new URLSearchParams(search)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    replaceSearch(next.toString())
  }
}

/** 검색어 입력칸: Enter로 적용한다. 뒤로 가기 등으로 URL이 바뀌면 입력칸도 맞춘다. */
function SearchForm({ applied, placeholder, label, onApply }: { applied: string; placeholder: string; label: string; onApply: (value: string) => void }) {
  const [query, setQuery] = useState(applied)
  const [synced, setSynced] = useState(applied)
  if (synced !== applied) {
    setSynced(applied)
    setQuery(applied)
  }
  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        onApply(query.trim())
      }}
    >
      <SearchBox value={query} onChange={setQuery} placeholder={placeholder} label={label} />
    </form>
  )
}

function StaticBar() {
  return (
    <p className={styles.infoBar} data-testid="static-content-notice">
      <InfoIcon size={14} />
      {staticNotice}
    </p>
  )
}

// ---------------- 탐구 라이브러리 (AD-09) ----------------

export function StaticLibraryView({ search }: { search: URLSearchParams }) {
  const update = useUpdate(search)
  const applied = search.get('q') ?? ''
  const subjects = catalogSubjectLabels()
  const subjectParam = search.get('subject') ?? ''
  const subject = subjects.includes(subjectParam) ? subjectParam : ''
  const all = listCatalogContent({})
  const items = listCatalogContent({ subjectLabel: subject || undefined, query: applied })
  return (
    <div className={styles.body} data-testid="static-library">
      <StaticBar />
      <div className={styles.toolbar}>
        <SearchForm applied={applied} placeholder="주제·목표·방법 검색" label="탐구 라이브러리 검색" onApply={(value) => update({ q: value })} />
        <div className={styles.chips} role="group" aria-label="교과">
          <button type="button" className={styles.chip} aria-pressed={!subject} onClick={() => update({ subject: '' })}>
            전체 교과 {all.length}
          </button>
          {subjects.map((label) => (
            <button key={label} type="button" className={styles.chip} aria-pressed={subject === label} onClick={() => update({ subject: label })}>
              {label} {all.filter((item) => item.subjectLabel === label).length}
            </button>
          ))}
        </div>
        <p className={`${styles.muted} ${styles.toolbarEnd}`} data-testid="result-count">
          {items.length}개 표시
        </p>
      </div>
      {items.length === 0 ? (
        <ListEmpty filtered={all.length > 0} title="탐구 참고자료가 없어요" onReset={() => replaceSearch('')} />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">탐구 주제</th>
                <th scope="col">교과</th>
                <th scope="col">탐구 방법 수</th>
                <th scope="col">출처</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.catalogTaskId} data-clickable="true" data-content-id={item.catalogTaskId} onClick={() => navigate(paths.task(item.catalogTaskId))}>
                  <td>
                    <button
                      type="button"
                      className={styles.rowButton}
                      onClick={(event) => {
                        event.stopPropagation()
                        navigate(paths.task(item.catalogTaskId))
                      }}
                    >
                      <span className={styles.cellTitle} style={{ fontWeight: 500 }}>
                        {item.title}
                      </span>
                      <span className={`${styles.cellSub} ${styles.cellClamp}`} style={{ maxWidth: 560 }}>
                        {item.goal}
                      </span>
                    </button>
                  </td>
                  <td>{item.subjectLabel}</td>
                  <td>{item.methods.length}단계</td>
                  <td>
                    <span className={styles.cellSub} style={{ marginTop: 0 }}>
                      LearnersHigh 학습용 예시
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function StaticLibraryDetail({ catalogTaskId }: { catalogTaskId: string }) {
  const item = getCatalogContent(catalogTaskId)
  if (!item) return <NotFound title="탐구 참고자료를 찾을 수 없어요" backTo={paths.tasks} backLabel="탐구 라이브러리로" />
  return (
    <div className={styles.detail} data-testid="static-library-detail" data-content-id={item.catalogTaskId}>
      <DetailHead trail="심화 탐구 콘텐츠 / 탐구 라이브러리" title={item.title} backTo={paths.tasks}>
        <span className={styles.badge}>읽기 전용</span>
      </DetailHead>
      <div className={styles.pane}>
        <div className={styles.paneInner}>
          <dl className={styles.metaBox}>
            <Meta label="교과" value={item.subjectLabel} />
            <Meta label="구분" value="심화 탐구 참고자료 (학교 수행평가 아님)" />
          </dl>
          <Section title="탐구 목표">
            <p className={styles.notePara}>{item.goal}</p>
          </Section>
          {item.methods.length > 0 && (
            <Section title="탐구 방법 예시">
              <ol style={{ margin: 0, paddingLeft: 20 }}>
                {item.methods.map((method) => (
                  <li key={method} className={styles.notePara}>
                    {method}
                  </li>
                ))}
              </ol>
            </Section>
          )}
          <Section title="출처">
            <p className={styles.muted}>LearnersHigh가 작성한 학습용 예시예요. 확인된 외부 출처는 아직 연결되지 않았어요 (출처 확인 필요).</p>
          </Section>
        </div>
      </div>
    </div>
  )
}

// ---------------- 모의고사 지문 (AD-06) ----------------

const examSubjects = mockExamSubjects.filter((subject) => subject.subjectId === 'mock_kor' || subject.subjectId === 'mock_eng')

export function StaticMockExamListView({ search }: { search: URLSearchParams }) {
  const update = useUpdate(search)
  const applied = search.get('q') ?? ''
  const subjectParam = search.get('subject') ?? ''
  const subjectId = examSubjects.some((subject) => subject.subjectId === subjectParam) ? subjectParam : ''
  const year = search.get('year') ?? ''
  const grade = search.get('grade') ?? ''
  const all = listMockExamContent({})
  const years = [...new Set(all.map((item) => item.source.academicYear).filter((value): value is number => value !== null))].sort((a, b) => b - a)
  const items = listMockExamContent({ subjectId: subjectId || undefined, query: applied })
    .filter((item) => !year || String(item.source.academicYear) === year)
    .filter((item) => !grade || (grade === 'none' ? item.source.grade === null : String(item.source.grade) === grade))
  const passages = mockExamPassageCount()
  return (
    <div className={styles.body} data-testid="static-mock-exams">
      <StaticBar />
      <div className={styles.toolbar}>
        <SearchForm applied={applied} placeholder="주제명, 개념, 소재 검색" label="모의고사 지문 검색" onApply={(value) => update({ q: value })} />
        <div className={styles.chips} role="group" aria-label="과목">
          <button type="button" className={styles.chip} aria-pressed={!subjectId} onClick={() => update({ subject: '' })}>
            전체 과목 {all.length}
          </button>
          {examSubjects.map((subject) => (
            <button key={subject.subjectId} type="button" className={styles.chip} aria-pressed={subjectId === subject.subjectId} onClick={() => update({ subject: subject.subjectId })}>
              {subject.name} {all.filter((item) => item.subjectId === subject.subjectId).length}
            </button>
          ))}
        </div>
        <div className={`${styles.actions} ${styles.toolbarEnd}`}>
          <select className={styles.select} aria-label="학년도" value={year} onChange={(event) => update({ year: event.target.value })}>
            <option value="">전체 학년도</option>
            {years.map((value) => (
              <option key={value} value={String(value)}>
                {value}학년도
              </option>
            ))}
          </select>
          <select className={styles.select} aria-label="학년" value={grade} onChange={(event) => update({ grade: event.target.value })}>
            <option value="">전체 학년</option>
            {[1, 2, 3].map((value) => (
              <option key={value} value={value}>
                고{value}
              </option>
            ))}
            <option value="none">학년 표기 없음 (평가원)</option>
          </select>
        </div>
      </div>
      <p className={styles.infoLine} data-testid="result-count">
        모의고사 지문 → 교과 개념 → 탐구 주제 → 탐구 방법 → 심화 방향 · 원문 포함 {passages}/{all.length} · {items.length}개 표시
      </p>
      {items.length === 0 ? (
        <ListEmpty filtered={all.length > 0} title="모의고사 지문 자료가 없어요" onReset={() => replaceSearch('')} />
      ) : (
        <ul className={`${styles.listPlain} ${styles.materialGrid}`} aria-label="모의고사 지문">
          {items.map((material) => (
            <li key={material.materialId} className={styles.materialCard} data-material-id={material.materialId}>
              <div className={styles.materialTop}>
                <span className={styles.badge} data-tone={material.research?.passage ? 'success' : undefined}>
                  {material.research?.passage ? '원문 포함' : '원문 미포함'}
                </span>
                <span>
                  {mockExamSubjectName(material.subjectId)} · {material.idea.relatedFields.join(' · ')}
                </span>
              </div>
              <p className={styles.materialMeta}>{examLine(material)}</p>
              <h3 className={styles.materialTitle}>
                <button type="button" className={styles.rowButton} onClick={() => navigate(paths.mockExam(material.materialId))}>
                  {material.idea.topicTitle}
                </button>
              </h3>
              <p className={styles.materialDesc}>{material.idea.topicReason || material.idea.goal}</p>
              <p className={styles.materialConcept}>핵심 소재 · {material.idea.coreMaterial}</p>
              <div className={styles.materialActions}>
                <button type="button" className={`${styles.secondaryButton} ${styles.smallButton}`} onClick={() => navigate(paths.mockExam(material.materialId))}>
                  상세 보기
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function StaticMockExamDetail({ materialId }: { materialId: string }) {
  const material = getMockExamContent(materialId)
  if (!material) return <NotFound title="모의고사 지문 자료를 찾을 수 없어요" backTo={paths.mockExams} backLabel="모의고사 지문 목록으로" />
  const research = material.research
  return (
    <div className={styles.detail} data-testid="static-mock-exam-detail" data-material-id={material.materialId}>
      <DetailHead trail="심화 탐구 콘텐츠 / 모의고사 지문" title={material.idea.topicTitle} backTo={paths.mockExams}>
        <span className={styles.badge}>읽기 전용</span>
      </DetailHead>
      <div className={styles.pane}>
        <div className={styles.paneInner}>
          <dl className={styles.metaBox}>
            <Meta label="과목" value={mockExamSubjectName(material.subjectId)} />
            <Meta label="시험" value={examLine(material)} />
            <Meta label="학년도·월" value={`${material.source.academicYear ?? '—'}학년도 ${material.source.examMonth ? `${material.source.examMonth}월` : ''}`} />
            <Meta label="학년" value={material.source.grade ? `고${material.source.grade}` : '표기 없음'} />
            <Meta label="문항" value={research?.questionLabel ?? '—'} />
            <Meta label="원본 쪽" value={research ? `${research.originalFileName} · ${research.pdfPage}` : '—'} />
          </dl>
          <Section title="원문 지문 (시험 자료 원문)">
            {/* A26: 원문 지문은 텍스트 데이터(PDF 아님) — 학생과 같은 컴포넌트 */}
            <MockExamPassage passage={research?.passage} examTitle={research?.examTitle ?? ''} questionLabel={research?.questionLabel ?? ''} collapsible={false} />
          </Section>
          <p className={styles.hint} style={{ marginTop: 14 }}>
            아래는 LearnersHigh 학습용 제안이며 출제기관 공식 해설이 아니에요.
          </p>
          <Section title="핵심 소재 · 관련 분야">
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
          {material.idea.methods.length > 0 && (
            <Section title="탐구 방법 예시">
              {material.idea.methods.map((method) => (
                <p key={method.label} className={styles.notePara}>
                  <strong>{method.label}</strong> {method.text}
                </p>
              ))}
            </Section>
          )}
          {material.idea.extensionQuestions.length > 0 && (
            <Section title="심화 탐구 질문">
              {material.idea.extensionQuestions.map((question) => (
                <p key={question} className={styles.notePara}>
                  · {question}
                </p>
              ))}
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------- 대학별 자료 (AD-10) ----------------

const fileStateLabels: Record<UniversityFileState, string> = { AVAILABLE: '원문 있음', MISSING: '로컬 파일 없음', CHANGED: '파일 변경됨' }

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
  const keyword = query.trim().toLocaleLowerCase('ko')
  if (!keyword) return true
  return [document.title, document.university, document.universityName, document.examType, String(document.academicYear), ...document.subjectAreas, ...document.questions.flatMap((question) => [question.label, question.field, question.topic, ...question.concepts])]
    .filter(Boolean)
    .some((value) => String(value).toLocaleLowerCase('ko').includes(keyword))
}

export function StaticUniversityListView({ search }: { search: URLSearchParams }) {
  const update = useUpdate(search)
  const fileStates = useFileStates()
  const applied = search.get('q') ?? ''
  const university = search.get('university') ?? ''
  const year = search.get('year') ?? ''
  const area = search.get('area') ?? ''
  const category = search.get('category') ?? ''
  const all = listUniversityExamContent()
  const universities = [...new Set(all.map((document) => document.university))]
  const years = [...new Set(all.map((document) => document.academicYear))].sort((a, b) => b - a)
  const areas = [...new Set(all.flatMap((document) => document.subjectAreas))].sort()
  const items = all
    .filter((document) => !university || document.university === university)
    .filter((document) => !year || String(document.academicYear) === year)
    .filter((document) => !area || document.subjectAreas.includes(area))
    .filter((document) => !category || document.category === category)
    .filter((document) => matchesDocument(document, applied))
    .sort((a, b) => b.academicYear - a.academicYear || a.title.localeCompare(b.title, 'ko'))
  const questionCount = all.reduce((sum, document) => sum + document.questions.length, 0)
  return (
    <div className={styles.body} data-testid="static-universities">
      <StaticBar />
      <div className={styles.officialLinks} aria-label="대학 공식 자료">
        <span className={styles.officialLabel}>공식 자료</span>
        {universityOfficialSources.map((source) => (
          <a key={source.university} className={styles.officialLink} href={source.url} target="_blank" rel="noopener noreferrer" title={source.label}>
            {source.university === 'KAIST' ? 'KAIST 입학처 열기' : `${source.university} 입학본부 열기`}
            <span className="lh-visually-hidden"> ({source.label}, 새 창)</span>
          </a>
        ))}
      </div>
      <div className={styles.toolbar}>
        <div className={styles.chips} role="group" aria-label="대학">
          <button type="button" className={styles.chip} aria-pressed={!university} onClick={() => update({ university: '' })}>
            전체 {all.length}
          </button>
          {universities.map((value) => (
            <button key={value} type="button" className={styles.chip} aria-pressed={university === value} onClick={() => update({ university: value })}>
              {value} {all.filter((document) => document.university === value).length}
            </button>
          ))}
        </div>
        <div className={`${styles.actions} ${styles.toolbarEnd}`}>
          <select className={styles.select} aria-label="학년도" value={year} onChange={(event) => update({ year: event.target.value })}>
            <option value="">전체 학년도</option>
            {years.map((value) => (
              <option key={value} value={value}>
                {value}학년도
              </option>
            ))}
          </select>
          <select className={styles.select} aria-label="과목·영역" value={area} onChange={(event) => update({ area: event.target.value })}>
            <option value="">전체 분야</option>
            {areas.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select className={styles.select} aria-label="자료 유형" value={category} onChange={(event) => update({ category: event.target.value })}>
            <option value="">전체 유형</option>
            {Object.entries(examCategoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={styles.toolbar}>
        <SearchForm applied={applied} placeholder="자료명·문항·개념 검색" label="대학별 자료 검색" onApply={(value) => update({ q: value })} />
        <p className={styles.muted} data-testid="result-count">
          문서 {all.length}개 · 문항 {questionCount}개 · {items.length}개 표시
          {fileStates === null ? ' · 지금은 원문 PDF에 연결되지 않았어요' : ''}
        </p>
      </div>
      {items.length === 0 ? (
        <ListEmpty filtered={all.length > 0} title="대학별 자료가 없어요" onReset={() => replaceSearch('')} />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table} style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th scope="col">자료</th>
                <th scope="col">유형</th>
                <th scope="col">분야</th>
                <th scope="col">분량</th>
                <th scope="col" aria-label="작업" />
              </tr>
            </thead>
            <tbody>
              {items.map((document) => {
                const state = fileStates?.[document.documentId]
                const open = () => navigate(paths.university(document.documentId))
                return (
                  <tr key={document.documentId} data-document-id={document.documentId}>
                    <td>
                      <button type="button" className={styles.rowButton} onClick={open}>
                        <span className={styles.cellTitle} style={{ fontWeight: 500 }}>
                          {document.title}
                        </span>
                        <span className={styles.cellSub}>
                          {document.university} {document.academicYear}학년도 · {document.examType}
                          {state && state !== 'AVAILABLE' ? ` · ${fileStateLabels[state]}` : ''}
                        </span>
                      </button>
                    </td>
                    <td>
                      <span className={styles.badge} data-tone={document.category === 'PAST_EXAM' ? 'primary' : document.category === 'SAMPLE_QUESTION' ? 'success' : undefined}>
                        {document.category === 'SAMPLE_QUESTION' ? '예시 문항 · 실제 기출 아님' : examCategoryLabels[document.category]}
                      </span>
                    </td>
                    <td>
                      <span className={styles.cellClamp} style={{ maxWidth: 220 }}>
                        {document.subjectAreas.join(' · ') || '—'}
                      </span>
                    </td>
                    <td>
                      {document.pageCount}쪽 · 문항 {document.questions.length}
                      <span className={styles.cellSub}>{fileSizeLabel(document.sizeBytes)}</span>
                    </td>
                    <td>
                      <button type="button" className={`${styles.secondaryButton} ${styles.smallButton}`} onClick={open}>
                        원문 보기
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function StaticUniversityDetail({ documentId, search }: { documentId: string; search: URLSearchParams }) {
  const document = getUniversityExamContent(documentId)
  const [panel, setPanel] = useState<'toc' | 'info'>('toc')
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null)
  if (!document) return <NotFound title="대학별 자료를 찾을 수 없어요" backTo={paths.universities} backLabel="대학별 자료 목록으로" />
  const page = Math.min(Math.max(1, Number(search.get('page') ?? '1') || 1), document.pageCount)
  const atPage = questionAtPage(document, page)
  const official = officialSourceOf(document.university)
  const goTo = (target: number, questionId?: string) => {
    if (questionId) setCurrentQuestionId(questionId)
    const next = new URLSearchParams(search)
    next.set('page', String(target))
    replaceSearch(next.toString())
  }
  return (
    <div className={styles.detail} data-testid="static-university-detail" data-document-id={document.documentId}>
      <DetailHead trail={`심화 탐구 콘텐츠 / 대학별 자료 / ${universityLine(document)}`} title={document.title} backTo={paths.universities}>
        {document.category === 'SAMPLE_QUESTION' && (
          <span className={styles.badge} data-tone="warning">
            예시 문항 · 실제 기출 아님
          </span>
        )}
        <span className={styles.badge}>읽기 전용</span>
        {official && (
          <a className={styles.officialLink} href={official.url} target="_blank" rel="noopener noreferrer" title={official.label}>
            공식 자료실 열기
          </a>
        )}
      </DetailHead>
      <div className={`${styles.split} ${styles.splitWide}`}>
        <div className={styles.pdfPane}>
          <PdfViewer url={universityExamFileUrl(document.documentId)} title={document.title} expectedPageCount={document.pageCount} page={page} onPageChange={(next) => goTo(next)} />
          <p className={styles.hint} style={{ marginTop: 8 }}>
            원문 PDF는 배포 권한 확인 전이라 이 환경에서만 열려요.
          </p>
        </div>
        <aside className={styles.side} aria-label="문항 목차와 자료 정보">
          <div className={styles.sideTabs} role="tablist">
            <button type="button" role="tab" aria-selected={panel === 'toc'} className={styles.subTab} onClick={() => setPanel('toc')}>
              문항 목차 {document.questions.length}
            </button>
            <button type="button" role="tab" aria-selected={panel === 'info'} className={styles.subTab} onClick={() => setPanel('info')}>
              자료 정보
            </button>
          </div>
          <div className={styles.sideBody}>
            <div className={styles.boxSubtle} style={{ marginBottom: 12 }} aria-live="polite">
              지금 보는 쪽 {page}쪽 · {atPage ? `${questionDisplayLabel(atPage)} (${pageRangeLabel(atPage.pageStart, atPage.pageEnd)})` : '문항 범위 밖'}
            </div>
            {panel === 'toc' ? (
              <ExamQuestionNavigator document={document} currentQuestionId={currentQuestionId ?? atPage?.questionId ?? null} currentPage={page} onGoTo={(target, questionId) => goTo(target, questionId)} />
            ) : (
              <dl className={styles.stack} style={{ margin: 0 }}>
                <Info label="대학" value={`${document.university} (${document.universityName})`} />
                <Info label="학년도 · 유형" value={`${document.academicYear}학년도 · ${examCategoryLabels[document.category]} · ${document.examType}`} />
                <Info label="대학 공식 자료실" value={official?.label ?? '등록된 자료실 없음'} />
                <Info label="분량" value={`${document.pageCount}쪽 · ${fileSizeLabel(document.sizeBytes)} · 문항 ${document.questions.length}개`} />
                <Info label="과목·영역" value={document.subjectAreas.join(' · ') || '—'} />
                <Info label="원본 확인값" value={`SHA-256 ${document.sha256.slice(0, 12)}…`} />
              </dl>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

// ---------------- 참고자료원 카탈로그 (P-24 정적) ----------------

const categories: ReferenceSourceCategory[] = ['공식 기관', '논문·학술', '뉴스·시사', '통계·데이터', '영상·다큐', '교육 도구·포털']

export function StaticSourcesView({ search }: { search: URLSearchParams }) {
  const update = useUpdate(search)
  const catalog = getReferenceCatalogContent()
  const applied = search.get('q') ?? ''
  const areaParam = search.get('area') ?? ''
  const areaKey = catalog.areas.some((item) => item.areaKey === areaParam) ? (areaParam as ReferenceAreaKey) : null
  const categoryParam = search.get('category') ?? ''
  const category = categories.find((value) => value === categoryParam) ?? null
  const needle = applied.trim().toLocaleLowerCase('ko')
  const scoped = areaKey ? sourcesForArea(catalog, areaKey) : catalog.sources.map((source) => ({ source, usage: source.primaryUsage }))
  const items = scoped
    .filter(({ source }) => !category || source.category === category)
    .filter(({ source, usage }) => !needle || [source.name, source.category, source.nature, source.primaryUsage, usage].some((text) => text.toLocaleLowerCase('ko').includes(needle)))
  return (
    <div className={styles.body} data-testid="static-sources">
      <StaticBar />
      <div className={styles.toolbar}>
        <SearchForm applied={applied} placeholder="자료원·활용 검색" label="참고자료원 검색" onApply={(value) => update({ q: value })} />
        <div className={styles.chips} role="group" aria-label="과목 영역">
          <button type="button" className={styles.chip} aria-pressed={!areaKey} onClick={() => update({ area: '' })}>
            전체 {catalog.sources.length}
          </button>
          {catalog.areas.map((area) => (
            <button key={area.areaKey} type="button" className={styles.chip} aria-pressed={areaKey === area.areaKey} onClick={() => update({ area: area.areaKey })}>
              {area.label} {area.sources.length}
            </button>
          ))}
        </div>
        <select className={`${styles.select} ${styles.toolbarEnd}`} aria-label="자료 유형" value={category ?? ''} onChange={(event) => update({ category: event.target.value })}>
          <option value="">전체 유형</option>
          {categories.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <p className={styles.infoLine} data-testid="result-count">
        자료원 = 대표 홈페이지·채널 주소예요(개별 기사·논문 아님). 기준 문서 {catalog.basis.document} · 확인 {catalog.basis.checkedOn} · {items.length}개 표시
      </p>
      {items.length === 0 ? (
        <ListEmpty filtered={catalog.sources.length > 0} title="참고자료원이 없어요" onReset={() => replaceSearch('')} />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">자료원</th>
                <th scope="col">유형</th>
                <th scope="col">{areaKey ? `${areaLabel(catalog, areaKey)}에서 활용` : '주요 활용'}</th>
                <th scope="col">과목 영역</th>
                <th scope="col" aria-label="링크" />
              </tr>
            </thead>
            <tbody>
              {items.map(({ source, usage }) => (
                <tr key={source.sourceId} data-source-id={source.sourceId}>
                  <td>
                    <span className={styles.cellTitle} style={{ fontWeight: 500 }}>
                      {source.name}
                    </span>
                    <span className={styles.cellSub}>{source.nature}</span>
                  </td>
                  <td>
                    <span className={styles.badge}>{source.category}</span>
                  </td>
                  <td>
                    <span className={styles.cellClamp} style={{ maxWidth: 380 }}>
                      {usage}
                    </span>
                    {source.accessNotes && <span className={styles.cellSub}>{source.accessNotes}</span>}
                  </td>
                  <td>
                    <span className={styles.cellSub} style={{ marginTop: 0 }}>
                      {areasOfSource(catalog, source.sourceId)
                        .map((area) => area.label)
                        .join(' · ') || '—'}
                    </span>
                  </td>
                  <td>
                    <a className={styles.linkButton} href={source.url} target="_blank" rel="noreferrer noopener">
                      열기 ↗<span className="lh-visually-hidden"> ({source.name}, 새 창)</span>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------------- 없어진 기능·없는 ID ----------------

/** 이전 등록·수정·AI 분석 주소: 읽기 전용 전환(명세 §4) 안내. 목록으로 자동 이동하지 않고 이유를 보여준다. */
export function RetiredContentAction({ backTo, backLabel }: { backTo: string; backLabel: string }) {
  return (
    <div className={styles.body} data-testid="retired-content-action">
      <EmptyState
        title="심화 탐구 콘텐츠는 읽기 전용이에요"
        description="콘텐츠 등록·수정·공개 전환·Task 만들기는 더 이상 제공하지 않아요."
        action={
          <button type="button" className={styles.secondaryButton} onClick={() => navigate(backTo)}>
            {backLabel}
          </button>
        }
      />
    </div>
  )
}

function NotFound({ title, backTo, backLabel }: { title: string; backTo: string; backLabel: string }) {
  return (
    <div className={styles.body} data-testid="static-not-found">
      <EmptyState
        title={title}
        action={
          <button type="button" className={styles.secondaryButton} onClick={() => navigate(backTo)}>
            {backLabel}
          </button>
        }
      />
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
