import { useEffect, useRef, useState } from 'react'
import { replaceSearch } from '../../../app/adminLocation.ts'
import { adminRecordsHttpConnected, catalogSubjectOptions, deleteScrap, getReferenceCatalog, listScrapTrash, listScraps, restoreScrap, saveScrap, setScrapPublished, subjectNameOf, uploadScrap } from '../api/assessmentAdminApi.ts'
import { areasOfSource, type ReferenceCatalog, type ReferenceSource } from '../api/canonicalSource.ts'
import type { ReferenceScrap, ScrapRequest, ScrapType } from '../api/types.ts'
import { FieldError, ListEmpty, RemoteView, SearchBox } from '../components/AdminParts.tsx'
import { AlertIcon, LinkIcon, LockIcon, Modal, ReferenceCategoryIcon, Toast, UploadIcon, type ToastMessage } from '../components/canonicalUi.ts'
import { ScrapFileView } from '../components/ScrapFileView.tsx'
import { fileSizeText, isVideoFileName, SCRAP_FILE_ACCEPT, scrapFileKind, scrapFileKindLabel, scrapFileProblem, titleFromFileName } from '../model/scrapFiles.ts'
import { dateTimeLabel, nextToastId, splitList } from '../model/adminFormat.ts'
import { useCommand, useRemote } from '../model/useRemote.ts'
import styles from '../styles/assessmentAdmin.module.css'
import modalStyles from './scrapModal.module.css'
import { TextField } from './CatalogTaskRoutes.tsx'

const scrapTypeLabels: Record<ScrapType, string> = { SITE: '사이트', ARTICLE: '기사', PAPER: '논문', VIDEO: '영상', STATISTICS: '통계', OTHER: '기타' }
const categoryOrder = ['뉴스·시사', '논문·학술', '통계·데이터', '공식 기관', '영상·다큐', '교육 도구·포털'] as const

// AD-07·08 관리자 참고자료실 (AM-19·20). 추천 사이트 = Student 참고자료와 같은 과목별 공식 자료원 24곳 (같은 ID·이름·주소).
// 스크랩·메모는 관리자 내부 자료이며 기본 비공개다. 피드백 추천·공개 Task에서 고른 자료만 학생에게 보인다 (§43·46).
export function ReferenceLibraryRoute({ search }: { search: URLSearchParams }) {
  const tab = search.get('tab') === 'scraps' ? 'scraps' : 'sources'
  const catalog = useRemote(() => getReferenceCatalog(), [])
  const scraps = useRemote(() => listScraps(), [])
  const [editor, setEditor] = useState<{ scrap?: ReferenceScrap; initial: ScrapRequest; upload?: boolean } | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)

  const setTab = (value: string) => {
    const next = new URLSearchParams(search)
    next.set('tab', value)
    replaceSearch(next.toString())
  }

  const blank: ScrapRequest = { title: '', sourceUrl: '', sourceName: null, referenceSourceId: null, type: 'ARTICLE', memo: null, tags: [], subjectIds: [], authorOrOrg: null, publishedDate: null, relatedCatalogTaskIds: [], relatedMaterialIds: [] }
  const savedItems = scraps.state.status === 'success' ? scraps.state.data.items : []

  return (
    <>
      <nav className={styles.subTabs} aria-label="참고자료실">
        <button type="button" className={styles.subTab} aria-current={tab === 'sources' ? 'page' : undefined} onClick={() => setTab('sources')}>
          추천 사이트
        </button>
        <button type="button" className={styles.subTab} aria-current={tab === 'scraps' ? 'page' : undefined} onClick={() => setTab('scraps')}>
          내 스크랩 {scraps.state.status === 'success' ? scraps.state.data.items.length : ''}
        </button>
        {/* [17] A27-UX §43-1: 영상·사진·문서를 직접 올려 스크랩한다(서버 저장·관리자 전용). 링크 저장은 그대로 */}
        <span className={modalStyles.navActions}>
          <button type="button" className={`${styles.secondaryButton} ${styles.smallButton}`} onClick={() => setEditor({ initial: { ...blank, type: 'OTHER' }, upload: true })} data-testid="scrap-upload-open">
            <UploadIcon size={14} /> 자료 업로드
          </button>
          <button type="button" className={`${styles.secondaryButton} ${styles.smallButton}`} onClick={() => setEditor({ initial: blank })}>
            <LinkIcon size={14} /> 링크 직접 저장
          </button>
        </span>
      </nav>
      {tab === 'sources' ? (
        <RemoteView state={catalog.state} label="추천 사이트" onRetry={catalog.reload}>
          {(data) => (
            <SourcesView
              catalog={data}
              search={search}
              savedCountBySource={countBySource(savedItems)}
              onSave={(source) =>
                setEditor({ initial: { ...blank, title: '', sourceUrl: source.url, sourceName: source.name, referenceSourceId: source.sourceId, type: 'ARTICLE' } })
              }
              onShowSaved={(sourceId) => {
                const next = new URLSearchParams(search)
                next.set('tab', 'scraps')
                next.set('source', sourceId)
                replaceSearch(next.toString())
              }}
            />
          )}
        </RemoteView>
      ) : (
        <ScrapsView
          state={scraps.state}
          catalog={catalog.state.status === 'success' ? catalog.state.data : null}
          search={search}
          reload={scraps.reload}
          onEdit={(scrap) => setEditor({ scrap, initial: { ...scrap, sourceUrl: scrap.sourceUrl ?? '' } })}
          onAddToSource={(source) => setEditor({ initial: { ...blank, sourceUrl: source.url, sourceName: source.name, referenceSourceId: source.sourceId } })}
          onToast={setToast}
        />
      )}
      {editor && (
        <ScrapModal
          scrap={editor.scrap}
          initial={editor.initial}
          upload={editor.upload}
          onClose={() => setEditor(null)}
          onSaved={(saved, created) => {
            setEditor(null)
            scraps.reload()
            setToast({ id: nextToastId(), tone: 'success', text: created ? `'${saved.title}'을(를) 내 스크랩에 저장했어요. 학생에게는 보이지 않아요.` : '스크랩을 고쳤어요.' })
          }}
        />
      )}
      <Toast message={toast} onDismiss={() => setToast(null)} />
    </>
  )
}

/** 자료원별 저장한 개별 참고자료 수 (Key = 자료원 ID, 값은 개별 자료 수) */
const countBySource = (items: ReferenceScrap[]) => {
  const counts = new Map<string, number>()
  for (const item of items) if (item.referenceSourceId) counts.set(item.referenceSourceId, (counts.get(item.referenceSourceId) ?? 0) + 1)
  return counts
}

function SourcesView({
  catalog,
  search,
  savedCountBySource,
  onSave,
  onShowSaved,
}: {
  catalog: ReferenceCatalog
  search: URLSearchParams
  savedCountBySource: Map<string, number>
  onSave: (source: ReferenceSource) => void
  onShowSaved: (sourceId: string) => void
}) {
  const area = search.get('area') ?? ''
  const category = search.get('category') ?? ''
  const [query, setQuery] = useState('')

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(search)
    if (value) next.set(key, value)
    else next.delete(key)
    replaceSearch(next.toString())
  }

  const areaSources = area ? new Set(catalog.areas.find((item) => item.areaKey === area)?.sources.map((source) => source.sourceId)) : null
  const keyword = query.trim().toLowerCase()
  const filtered = catalog.sources
    .filter((source) => !areaSources || areaSources.has(source.sourceId))
    .filter((source) => !category || source.category === category)
    .filter((source) => !keyword || [source.name, source.primaryUsage, source.nature, source.url].some((value) => value.toLowerCase().includes(keyword)))

  return (
    <div className={styles.body}>
      <div className={styles.toolbar}>
        <SearchBox value={query} onChange={setQuery} placeholder="사이트 이름·활용 검색" label="추천 사이트 검색" />
        <div className={styles.chips} role="group" aria-label="과목 영역">
          <button type="button" className={styles.chip} aria-pressed={!area} onClick={() => update('area', '')}>
            전체
          </button>
          {catalog.areas.map((item) => (
            <button key={item.areaKey} type="button" className={styles.chip} aria-pressed={area === item.areaKey} onClick={() => update('area', item.areaKey)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.chips} role="group" aria-label="자료 성격" style={{ marginBottom: 14 }}>
        <button type="button" className={styles.chipQuiet} aria-pressed={!category} onClick={() => update('category', '')}>
          전체
        </button>
        {categoryOrder.map((value) => (
          <button key={value} type="button" className={styles.chipQuiet} aria-pressed={category === value} onClick={() => update('category', value)}>
            {value}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <ListEmpty
          filtered
          title=""
          onReset={() => {
            setQuery('')
            replaceSearch('tab=sources')
          }}
        />
      ) : (
        categoryOrder
          .filter((value) => filtered.some((source) => source.category === value))
          .map((value) => (
            <section key={value} style={{ marginBottom: 18 }}>
              <h3 className={styles.sectionTitle} style={{ fontSize: 13, marginBottom: 8 }}>
                {value}
              </h3>
              <div className={styles.grid}>
                {filtered
                  .filter((source) => source.category === value)
                  .map((source) => {
                    const areas = areasOfSource(catalog, source.sourceId).map((item) => item.label)
                    const savedCount = savedCountBySource.get(source.sourceId) ?? 0
                    return (
                      <div key={source.sourceId} className={styles.sourceCard}>
                        <span className={styles.sourceIcon}>
                          <ReferenceCategoryIcon category={source.category} size={18} />
                        </span>
                        <span className={styles.sourceText}>
                          <span className={styles.sourceName} title={source.name}>
                            {source.name}
                          </span>
                          <span className={styles.sourceMeta} title={`${source.nature} · ${areas.join(' · ')}`}>
                            {source.nature} · {areas.join(' · ') || '공통'}
                          </span>
                          {source.accessNotes && <span className={styles.sourceMeta}>{source.accessNotes}</span>}
                          {savedCount > 0 && (
                            <button type="button" className={styles.savedCount} onClick={() => onShowSaved(source.sourceId)} aria-label={`${source.name}에서 저장한 자료 ${savedCount}개 보기`}>
                              저장한 자료 {savedCount}개
                            </button>
                          )}
                        </span>
                        <a className={`${styles.secondaryButton} ${styles.smallButton}`} href={source.url} target="_blank" rel="noreferrer noopener" aria-label={`${source.name} 공식 홈페이지 열기`}>
                          열기
                        </a>
                        {/* 같은 자료원에서 여러 자료를 저장할 수 있다 (요청 ⑤). 버튼은 '열기'와 같은 밝은 테두리 스타일 */}
                        <button type="button" className={`${styles.secondaryButton} ${styles.smallButton}`} onClick={() => onSave(source)} aria-label={`${source.name}에서 찾은 자료 저장`}>
                          자료 저장
                        </button>
                      </div>
                    )
                  })}
              </div>
            </section>
          ))
      )}
      <p className={styles.hint}>
        자료원 {catalog.sources.length}곳 · {catalog.basis.document} ({catalog.basis.checkedOn} 확인) · 주소 연결은 확인하지 않아요.
      </p>
    </div>
  )
}

function ScrapsView({
  state,
  catalog,
  search,
  reload,
  onEdit,
  onAddToSource,
  onToast,
}: {
  state: ReturnType<typeof useRemote<{ items: ReferenceScrap[] }>>['state']
  catalog: ReferenceCatalog | null
  search: URLSearchParams
  reload: () => void
  onEdit: (scrap: ReferenceScrap) => void
  onAddToSource: (source: ReferenceSource) => void
  onToast: (toast: ToastMessage) => void
}) {
  const [query, setQuery] = useState('')
  const sourceFilter = search.get('source') ?? ''
  const subjectFilter = search.get('subject') ?? ''
  const subjects = catalogSubjectOptions()
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(search)
    if (value) next.set(key, value)
    else next.delete(key)
    replaceSearch(next.toString())
  }
  const filterSource = catalog?.sources.find((source) => source.sourceId === sourceFilter)
  const [deleting, setDeleting] = useState<ReferenceScrap | null>(null)
  const { run, pending } = useCommand()
  const [trashVersion, setTrashVersion] = useState(0)

  const remove = async () => {
    if (!deleting) return
    const outcome = await run(() => deleteScrap(deleting.scrapId))
    if (!outcome) return
    setDeleting(null)
    if (outcome.ok) {
      reload()
      onToast({
        id: nextToastId(),
        tone: 'success',
        text: adminRecordsHttpConnected
          ? '휴지통으로 옮겼어요. 아래 "휴지통"에서 복원할 수 있어요. 공개 중이던 자료는 학생 화면에서 빠져요.'
          : '스크랩을 삭제했어요. 이미 전달한 피드백의 추천 링크는 그대로 남아요.',
      })
      setTrashVersion((value) => value + 1)
    } else onToast({ id: nextToastId(), tone: 'error', text: `${outcome.error.message} (${outcome.error.code})` })
  }

  return (
    <div className={styles.body}>
      <p className={styles.mockNotice}>
        <LockIcon size={14} /> 스크랩과 메모는 관리자만 봐요. 피드백 작성의 &lsquo;참고자료 추천&rsquo;으로 고른 자료만 제목·주소가 학생에게 전달돼요.
      </p>
      <div className={styles.toolbar}>
        <SearchBox value={query} onChange={setQuery} placeholder="제목·출처·메모·태그 검색" label="스크랩 검색" />
        <select className={styles.select} aria-label="자료원" value={sourceFilter} onChange={(event) => setFilter('source', event.target.value)}>
          <option value="">전체 자료원</option>
          {catalog?.sources.map((source) => (
            <option key={source.sourceId} value={source.sourceId}>
              {source.name}
            </option>
          ))}
        </select>
        <select className={styles.select} aria-label="과목" value={subjectFilter} onChange={(event) => setFilter('subject', event.target.value)}>
          <option value="">전체 과목</option>
          {subjects.map((subject) => (
            <option key={subject.subjectId} value={subject.subjectId}>
              {subject.name}
            </option>
          ))}
        </select>
        {filterSource && (
          <button type="button" className={`${styles.secondaryButton} ${styles.smallButton} ${styles.toolbarEnd}`} onClick={() => onAddToSource(filterSource)}>
            {filterSource.name}에 자료 추가
          </button>
        )}
      </div>
      {adminRecordsHttpConnected && <ScrapTrash version={trashVersion} onRestored={() => { reload(); setTrashVersion((value) => value + 1) }} onToast={onToast} />}
      <RemoteView state={state} label="스크랩" onRetry={reload}>
        {(data) => {
          const keyword = query.trim().toLowerCase()
          const items = data.items
            .filter((scrap) => !keyword || [scrap.title, scrap.sourceName, scrap.memo, scrap.authorOrOrg, ...scrap.tags].some((value) => value?.toLowerCase().includes(keyword)))
            .filter((scrap) => !sourceFilter || scrap.referenceSourceId === sourceFilter)
            .filter((scrap) => !subjectFilter || scrap.subjectIds.includes(subjectFilter))
          if (items.length === 0)
            return (
              <ListEmpty
                filtered={data.items.length > 0}
                title="저장한 스크랩이 없어요"
                onReset={() => {
                  setQuery('')
                  const next = new URLSearchParams(search)
                  next.delete('source')
                  next.delete('subject')
                  replaceSearch(next.toString())
                }}
              />
            )
          return (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">자료</th>
                    <th scope="col">종류</th>
                    <th scope="col">관리자 메모 (비공개)</th>
                    <th scope="col">태그·과목</th>
                    <th scope="col">수정</th>
                    <th scope="col">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((scrap) => (
                    <tr key={scrap.scrapId}>
                      <td>
                        <span className={styles.cellTitle}>{scrap.title}</span>
                        {(scrap.authorOrOrg || scrap.publishedDate) && (
                          <span className={styles.cellSub}>{[scrap.authorOrOrg, scrap.publishedDate].filter(Boolean).join(' · ')}</span>
                        )}
                        {scrap.sourceUrl && (
                          <a className={styles.linkButton} href={scrap.sourceUrl} target="_blank" rel="noreferrer noopener">
                            {scrap.sourceName ?? scrap.sourceUrl} ↗
                          </a>
                        )}
                        {scrap.file && <ScrapFileView scrap={scrap} onChanged={reload} onToast={onToast} />}
                      </td>
                      <td>{scrapTypeLabels[scrap.type]}</td>
                      <td>
                        <span className={styles.cellClamp}>{scrap.memo ?? '—'}</span>
                      </td>
                      <td>
                        <div className={styles.chips}>
                          {scrap.tags.map((tag) => (
                            <span key={tag} className={styles.badge}>
                              #{tag}
                            </span>
                          ))}
                          {scrap.subjectIds.map((id) => (
                            <span key={id} className={styles.badge}>
                              {subjectNameOf(id) ?? id}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{dateTimeLabel(scrap.updatedAt)}</td>
                      <td>
                        <div className={styles.actions}>
                          <button type="button" className={`${styles.secondaryButton} ${styles.smallButton}`} onClick={() => onEdit(scrap)}>
                            수정
                          </button>
                          {/* §43-1: 링크 없는 업로드 스크랩은 학생에게 공개하지 않는다(학생은 관리자 파일을 내려받을 수 없다) */}
                          {adminRecordsHttpConnected &&
                            (scrap.sourceUrl || (scrap as { published?: boolean }).published ? (
                              <PublishButton scrap={scrap} onDone={reload} onToast={onToast} />
                            ) : (
                              <span className={styles.hint} title="학생은 관리자 파일을 내려받을 수 없어요. 링크를 추가하면 공개할 수 있어요." data-testid="scrap-publish-unavailable">
                                관리자 전용
                              </span>
                            ))}
                          <button type="button" className={`${styles.dangerButton} ${styles.smallButton}`} onClick={() => setDeleting(scrap)}>
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }}
      </RemoteView>
      {deleting && (
        <Modal
          title="스크랩을 삭제할까요?"
          compact
          onRequestClose={() => !pending && setDeleting(null)}
          footer={
            <>
              <button type="button" className={styles.secondaryButton} onClick={() => setDeleting(null)} disabled={pending}>
                취소
              </button>
              <button type="button" className={styles.dangerButton} onClick={remove} disabled={pending}>
                {pending ? '삭제 중…' : '삭제'}
              </button>
            </>
          }
        >
          <p className={styles.notePara}>&lsquo;{deleting.title}&rsquo;과 관리자 메모가 지워져요. 이미 학생에게 전달한 피드백의 추천 링크는 남아요.</p>
        </Modal>
      )}
    </div>
  )
}

function ScrapModal({ scrap, initial, upload = false, onClose, onSaved }: { scrap?: ReferenceScrap; initial: ScrapRequest; upload?: boolean; onClose: () => void; onSaved: (scrap: ReferenceScrap, created: boolean) => void }) {
  const [input, setInput] = useState<ScrapRequest>(initial)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  // §43-1: 업로드 스크랩(새로 올리거나 이미 파일이 있는 스크랩)은 링크가 선택이다
  const urlOptional = upload || Boolean(scrap?.file)
  const pickFile = (next: File | undefined) => {
    if (!next) return
    const problem = scrapFileProblem(next)
    setFileError(problem)
    if (problem) return
    setFile(next)
    setInput((previous) => ({
      ...previous,
      title: previous.title.trim() ? previous.title : titleFromFileName(next.name),
      type: isVideoFileName(next.name) ? 'VIDEO' : previous.type,
    }))
  }
  const [tags, setTags] = useState(initial.tags.join(', '))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const { run, pending } = useCommand()
  const subjects = catalogSubjectOptions()
  const fromSource = Boolean(initial.referenceSourceId)

  const submit = async () => {
    setFormError(null)
    if (upload && !scrap && !file) {
      setFileError('올릴 파일을 골라 주세요.')
      return
    }
    const request: ScrapRequest = { ...input, tags: splitList(tags), sourceUrl: urlOptional && !input.sourceUrl?.trim() ? null : input.sourceUrl }
    const outcome = await run(() => (upload && !scrap && file ? uploadScrap(request, file) : saveScrap(scrap?.scrapId ?? null, request)))
    if (!outcome) return
    if (outcome.ok) onSaved(outcome.value, !scrap)
    else if (outcome.error.code === 'VALIDATION_ERROR') setErrors(outcome.error.fieldReasons())
    else setFormError(outcome.error.message)
  }

  return (
    <Modal
      title={scrap ? '스크랩 수정' : upload ? '자료 업로드' : fromSource ? '자료 저장' : '링크 직접 저장'}
      onRequestClose={() => !pending && onClose()}
      footer={
        <>
          <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={pending}>
            취소
          </button>
          <button type="button" className={styles.primaryButton} onClick={submit} disabled={pending} aria-busy={pending}>
            {pending ? (upload && !scrap ? '올리는 중…' : '저장 중…') : scrap ? '저장' : upload ? '올리고 스크랩에 저장' : '내 스크랩에 저장'}
          </button>
        </>
      }
    >
      <div className={`${styles.form} ${modalStyles.form}`} data-testid="scrap-modal-form">
        {formError && (
          <p className={styles.formError} role="alert">
            <AlertIcon size={15} /> {formError}
          </p>
        )}
        {upload && !scrap && (
          <fieldset className={modalStyles.group}>
            <legend className={modalStyles.groupTitle}>파일</legend>
            <div
              className={modalStyles.dropZone}
              data-dragging={dragging || undefined}
              data-has-file={file ? 'true' : undefined}
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault()
                setDragging(false)
                pickFile(event.dataTransfer.files?.[0])
              }}
              data-testid="scrap-upload-drop"
            >
              <UploadIcon size={20} />
              {file ? (
                <span className={modalStyles.dropText}>
                  <strong>{file.name}</strong>
                  <span>
                    {scrapFileKindLabel[scrapFileKind(file.type || (isVideoFileName(file.name) ? 'video/' : ''))]} · {fileSizeText(file.size)}
                  </span>
                </span>
              ) : (
                <span className={modalStyles.dropText}>
                  <strong>파일을 여기로 끌어 놓거나 골라 주세요</strong>
                  <span>영상(MP4·MOV·WEBM)·사진(JPG·PNG·GIF·WEBP)·문서(PDF·HWP·HWPX·오피스) · 50MB 이하</span>
                </span>
              )}
              <button type="button" className={`${styles.secondaryButton} ${styles.smallButton}`} onClick={() => fileInput.current?.click()}>
                {file ? '다른 파일' : '파일 선택'}
              </button>
              <input ref={fileInput} type="file" accept={SCRAP_FILE_ACCEPT} hidden onChange={(event) => pickFile(event.target.files?.[0])} aria-label="올릴 파일" data-testid="scrap-upload-input" />
            </div>
            {fileError && (
              <p className={styles.formError} role="alert" data-testid="scrap-upload-error">
                <AlertIcon size={15} /> {fileError}
              </p>
            )}
            <p className={styles.hint}>파일은 관리자만 열 수 있어요. 학생에게 공개해도 파일은 전달되지 않아요.</p>
          </fieldset>
        )}
        <fieldset className={modalStyles.group}>
        <legend className={modalStyles.groupTitle}>자료 정보</legend>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="scrap-url">
            {urlOptional ? '관련 링크 (선택)' : 'URL'}
            {!urlOptional && <span className={styles.required}>*</span>}
          </label>
          <input
            id="scrap-url"
            className={styles.input}
            type="url"
            value={input.sourceUrl ?? ''}

            aria-invalid={errors.sourceUrl ? true : undefined}
            placeholder="https://"
            onChange={(event) => setInput((previous) => ({ ...previous, sourceUrl: event.target.value }))}
          />
          <FieldError id="scrap-url-error" message={errors.sourceUrl} />
          {fromSource && (
            <p className={styles.hint}>
              {input.sourceName ?? '이 자료원'}에서 찾은 개별 자료(논문·기사·통계표)의 주소로 바꿔 주세요.
            </p>
          )}
        </div>
        <TextField id="scrap-title" label="자료 제목" required value={input.title} error={errors.title} onChange={(value) => setInput((previous) => ({ ...previous, title: value }))} />
        <div className={modalStyles.grid}>
          <TextField id="scrap-source" label="출처 이름" value={input.sourceName ?? ''} onChange={(value) => setInput((previous) => ({ ...previous, sourceName: value || null }))} />
          <label className={styles.field}>
            <span className={styles.label}>종류</span>
            <select className={styles.select} value={input.type} onChange={(event) => setInput((previous) => ({ ...previous, type: event.target.value as ScrapType }))}>
              {Object.entries(scrapTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className={modalStyles.grid}>
          <TextField id="scrap-author" label="작성자·기관" value={input.authorOrOrg ?? ''} onChange={(value) => setInput((previous) => ({ ...previous, authorOrOrg: value || null }))} />
          <TextField id="scrap-date" label="발행일 (YYYY-MM-DD)" value={input.publishedDate ?? ''} error={errors.publishedDate} placeholder="2026-05-01" onChange={(value) => setInput((previous) => ({ ...previous, publishedDate: value.trim() || null }))} />
        </div>
        </fieldset>
        <fieldset className={modalStyles.group}>
        <legend className={modalStyles.groupTitle}>분류</legend>
        <div className={styles.field}>
          <span className={styles.label}>관련 과목</span>
          <div className={styles.chips}>
            {subjects.map((subject) => (
              <button
                key={subject.subjectId}
                type="button"
                className={styles.chip}
                aria-pressed={input.subjectIds.includes(subject.subjectId)}
                onClick={() =>
                  setInput((previous) => ({
                    ...previous,
                    subjectIds: previous.subjectIds.includes(subject.subjectId) ? previous.subjectIds.filter((id) => id !== subject.subjectId) : [...previous.subjectIds, subject.subjectId],
                  }))
                }
              >
                {subject.name}
              </button>
            ))}
          </div>
        </div>
        {/* A27-UX: '관련 심화 Task' 입력 제거(이미지 14). 기존 자료의 연결 값은 요청에 그대로 보존한다(선택 필드, 서버 계약 변경 없음) */}
        <TextField id="scrap-tags" label="태그 · 쉼표로 구분" value={tags} onChange={setTags} />
        </fieldset>
        <fieldset className={modalStyles.group}>
        <legend className={modalStyles.groupTitle}>관리자 메모</legend>
        <TextField id="scrap-memo" label="관리자 메모 (학생 비공개)" multiline value={input.memo ?? ''} onChange={(value) => setInput((previous) => ({ ...previous, memo: value || null }))} />
        <p className={styles.hint}>실제로 확인한 자료만 저장해 주세요. 존재하지 않는 논문·기사 주소를 만들지 않아요.</p></fieldset>
      </div>
    </Modal>
  )
}

/**
 * 학생 공개/비공개 (2026-11-11, http 전용). 관리자 자료는 기본 비공개이고, 공개한 자료만 학생 자료함의
 * "선생님이 공개한 자료"에 보인다. 관리자 메모는 공개 설명으로 함께 보이므로 공개 전에 확인하게 안내한다.
 */
function PublishButton({ scrap, onDone, onToast }: { scrap: ReferenceScrap; onDone: () => void; onToast: (toast: ToastMessage) => void }) {
  const published = Boolean((scrap as ReferenceScrap & { published?: boolean }).published)
  const [pending, setPending] = useState(false)
  const toggle = () => {
    if (pending) return
    if (!published && !window.confirm('학생에게 공개할까요? 제목·주소·출처·메모가 학생 자료함에 보여요.')) return
    setPending(true)
    setScrapPublished(scrap.scrapId, !published)
      .then(() => {
        onToast({ id: Date.now(), tone: 'success', text: published ? '학생 공개를 멈췄어요.' : '학생에게 공개했어요.' })
        onDone()
      })
      .catch((error: Error) => onToast({ id: Date.now(), tone: 'error', text: `공개 상태를 바꾸지 못했어요. ${error.message}` }))
      .finally(() => setPending(false))
  }
  return (
    <button type="button" className={`${styles.secondaryButton} ${styles.smallButton}`} onClick={toggle} disabled={pending} aria-pressed={published} data-testid="scrap-publish">
      {pending ? '바꾸는 중…' : published ? '공개 중 · 비공개로' : '학생에게 공개'}
    </button>
  )
}

/** 관리자 참고자료 휴지통 (http). 본인이 만든 자료만, 복원하면 같은 ID·내용·공개 상태로 돌아온다. 영구 삭제는 없다. */
function ScrapTrash({ version, onRestored, onToast }: { version: number; onRestored: () => void; onToast: (toast: ToastMessage) => void }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<{ scrap: ReferenceScrap; deletedAt: string }[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [restoring, setRestoring] = useState<string | null>(null)
  useEffect(() => {
    if (!open) return
    let active = true
    listScrapTrash().then(
      (data) => active && setItems(data.items),
      (cause: Error) => active && setError(cause.message),
    )
    return () => {
      active = false
    }
  }, [open, version])
  return (
    <details className={styles.box} style={{ margin: '8px 0' }} open={open} onToggle={(event) => setOpen((event.target as HTMLDetailsElement).open)} data-testid="scrap-trash">
      <summary className={styles.label}>휴지통{items ? ` (${items.length})` : ''}</summary>
      {error && <p className={styles.formError} role="alert">휴지통을 불러오지 못했어요: {error}</p>}
      {items && items.length === 0 && <p className={styles.muted}>휴지통이 비어 있어요.</p>}
      {items && items.length > 0 && (
        <ul className={styles.listPlain}>
          {items.map(({ scrap, deletedAt }) => (
            <li key={scrap.scrapId} className={styles.listRow} data-testid="scrap-trash-item">
              <span>
                {scrap.title}
                <span className={styles.cellSub}> · {new Date(deletedAt).toLocaleString('ko-KR')} 삭제</span>
              </span>
              <button
                type="button"
                className={`${styles.secondaryButton} ${styles.smallButton}`}
                disabled={restoring === scrap.scrapId}
                data-testid="scrap-restore"
                onClick={() => {
                  setRestoring(scrap.scrapId)
                  restoreScrap(scrap.scrapId)
                    .then(() => {
                      onToast({ id: Date.now(), tone: 'success', text: `'${scrap.title}'을(를) 복원했어요.` })
                      onRestored()
                    })
                    .catch((cause: Error) => onToast({ id: Date.now(), tone: 'error', text: `복원하지 못했어요. ${cause.message}` }))
                    .finally(() => setRestoring(null))
                }}
              >
                복원
              </button>
            </li>
          ))}
        </ul>
      )}
    </details>
  )
}
