import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useBlocker, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { toApiError } from '../api/apiError.ts'
import { listArtifacts } from '../api/assessmentDetailApi.ts'
import { getEnrichmentTask, listEnrichmentTasks } from '../api/enrichmentApi.ts'
import { createGrowthRecord, getGrowthRecord, updateGrowthRecord } from '../api/growthArchiveApi.ts'
import { getSchoolAssessment } from '../api/schoolAssessmentApi.ts'
import type { AssessmentSourceType, CreateGrowthRecordRequest, GrowthRecord, UpdateGrowthRecordRequest } from '../api/types.ts'
import formStyles from '../components/AddSchoolAssessmentModal.module.css'
import { AlertIcon, ChevronDownIcon, ChevronLeftIcon, FileIcon, LinkIcon, LockIcon, PencilIcon } from '../components/AssessmentIcons.tsx'
import enrichmentStyles from '../components/enrichment/enrichment.module.css'
import styles from '../components/growth/growthArchive.module.css'
import { MockDataNotice } from '../components/MockDataNotice.tsx'
import { Modal } from '../components/Modal.tsx'
import { EmptyState, ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { Toast, type ToastMessage } from '../components/Toast.tsx'
import { formatDateTime } from '../model/assessmentDetailView.ts'
import { useAssessmentWorkspace } from '../model/assessmentWorkspace.ts'
import { growthTextFields, relatedSourceLabels, subjectNameIn, type GrowthTextField } from '../model/growthArchiveView.ts'
import { useApiQuery } from '../model/useApiQuery.ts'
import { growthPath, growthRecordDetailPath, relatedSourcePath } from './paths.ts'

// 성장 기록 작성·상세·수정 (screen-map S22, api-contract.md §29 POST·GET·PATCH). 상세·작성 Mockup이 없어 기존 Assessment 상세 패턴으로 최소 구성한다.
// 문장은 학생이 직접 쓴다. AI 생성·자동 채우기는 하지 않는다. 결과물은 Artifact 단위로만 연결한다 (특정 Version 고정 여부 미정, MM-38).

const sourceTypes: AssessmentSourceType[] = ['SCHOOL_ASSESSMENT', 'ENRICHMENT_TASK']
const relatedOptionsPageSize = 100

function parseSourceType(value: string | null): AssessmentSourceType | null {
  return sourceTypes.find((type) => type === value) ?? null
}

const emptyRecord: CreateGrowthRecordRequest = {
  title: '',
  subjectId: null,
  activityStartDate: null,
  role: null,
  motivation: null,
  process: null,
  contribution: null,
  difficulty: null,
  solution: null,
  outcome: null,
  reflection: null,
  followUp: null,
  relatedSourceType: null,
  relatedSourceId: null,
  artifactIds: [],
}

function Frame({ children, toast, onDismissToast }: { children: ReactNode; toast: ToastMessage | null; onDismissToast: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <main className={enrichmentStyles.page}>
      <div className={enrichmentStyles.mainArea}>
        <div className={`${enrichmentStyles.content} ${styles.detailArea}`}>
          <button
            type="button"
            className={`${enrichmentStyles.backLink} ${styles.backButton}`}
            onClick={() => (location.key !== 'default' ? navigate(-1) : navigate(growthPath))}
          >
            <ChevronLeftIcon size={15} />
            성장 기록
          </button>
          {children}
          <div className={enrichmentStyles.notices}>
            <MockDataNotice />
          </div>
        </div>
      </div>
      <Toast message={toast} onDismiss={onDismissToast} />
    </main>
  )
}

/** /assessment/growth/new?sourceType=&sourceId= (상세 더보기 "성장 기록에 남기기"에서 관련 활동을 채워 연다) */
export function GrowthRecordNewRoute() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { notifyDataChanged } = useAssessmentWorkspace()
  const sourceType = parseSourceType(searchParams.get('sourceType'))
  const sourceId = sourceType ? searchParams.get('sourceId') : null
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const dismissToast = useCallback(() => setToast(null), [])

  // 관련 활동의 과목을 기본값으로 쓰기 위해 원본을 먼저 조회한다 (없으면 연결하지 않고 빈 양식).
  const source = useApiQuery(`gr-new-source|${sourceType ?? ''}|${sourceId ?? ''}`, () => loadRelated(sourceType, sourceId))
  if (sourceType && sourceId && source.status === 'loading') {
    return (
      <Frame toast={toast} onDismissToast={dismissToast}>
        <LoadingRows rows={3} label="관련 활동을 불러오는 중" />
      </Frame>
    )
  }
  const related = source.data
  const initial: CreateGrowthRecordRequest = related
    ? { ...emptyRecord, relatedSourceType: sourceType, relatedSourceId: sourceId, subjectId: related.subjectId }
    : emptyRecord

  return (
    <Frame toast={toast} onDismissToast={dismissToast}>
      <h1 className={styles.detailTitle}>성장 기록 쓰기</h1>
      <PrivacyNote />
      {sourceType && sourceId && source.status === 'error' && (
        <p className={formStyles.formError} role="alert">
          <AlertIcon size={16} />
          관련 활동을 불러오지 못해 연결하지 않았어요. 아래에서 다시 고를 수 있어요. ({source.error?.code})
        </p>
      )}
      <GrowthRecordForm
        key={`${sourceType ?? ''}|${sourceId ?? ''}|${related ? 'linked' : 'none'}`}
        initial={initial}
        submitLabel="저장"
        onCancel={() => navigate(growthPath)}
        onSubmit={async (values) => {
          const created = await createGrowthRecord(values)
          notifyDataChanged()
          navigate(growthRecordDetailPath(created.recordId), { replace: true, state: { created: true } })
        }}
      />
    </Frame>
  )
}

/** /assessment/growth/:recordId 상세. "수정"을 누르면 같은 자리에서 양식으로 바꾼다 (§29 PATCH, 바뀐 항목만 보낸다). */
export function GrowthRecordDetailRoute() {
  const { recordId = '' } = useParams()
  const location = useLocation()
  const { terms, notifyDataChanged } = useAssessmentWorkspace()
  const [version, setVersion] = useState(0)
  const detail = useApiQuery(`gr-detail|${recordId}|${version}`, () => getGrowthRecord(recordId))
  const record = detail.data?.recordId === recordId ? detail.data : undefined
  const [editing, setEditing] = useState(false)
  const [toast, setToast] = useState<ToastMessage | null>(() =>
    (location.state as { created?: boolean } | null)?.created ? { id: 1, tone: 'success', text: '성장 기록을 저장했어요.' } : null,
  )
  const dismissToast = useCallback(() => setToast(null), [])
  const contexts = terms.data?.contexts ?? []

  if (detail.status === 'error' && detail.error) {
    return (
      <Frame toast={toast} onDismissToast={dismissToast}>
        {detail.error.code === 'GROWTH_RECORD_NOT_FOUND' ? (
          <EmptyState title="성장 기록을 찾을 수 없어요" description="없는 기록이거나 내 기록이 아니에요." action={<Link to={growthPath}>성장 기록으로 가기</Link>} />
        ) : (
          <ErrorState title="성장 기록을 불러오지 못했어요" error={detail.error} onRetry={detail.retry} />
        )}
      </Frame>
    )
  }
  if (!record) {
    return (
      <Frame toast={toast} onDismissToast={dismissToast}>
        <LoadingRows rows={4} label="성장 기록을 불러오는 중" />
      </Frame>
    )
  }

  const related = relatedSourcePath(record)
  const subjectName = subjectNameIn(contexts, record.subjectId)
  const filled = growthTextFields.filter((item) => record[item.field])

  return (
    <Frame toast={toast} onDismissToast={dismissToast}>
      <article aria-labelledby="growth-title">
        <h1 id="growth-title" className={styles.detailTitle}>
          {record.title}
        </h1>
        <div className={styles.detailMeta}>
          <span className={styles.sourceBadge}>{record.relatedSourceType ? relatedSourceLabels[record.relatedSourceType] : '개인 활동'}</span>
          {subjectName && <span>{subjectName}</span>}
          {record.activityStartDate && <span>활동 시작 {record.activityStartDate}</span>}
          <span>
            {record.updatedAt !== record.createdAt ? `수정 ${formatDateTime(record.updatedAt)}` : `작성 ${formatDateTime(record.createdAt)}`}
          </span>
        </div>

        {editing ? (
          <GrowthRecordForm
            initial={record}
            submitLabel="저장"
            onCancel={() => setEditing(false)}
            onSubmit={async (values) => {
              const change = changedFields(record, values)
              if (Object.keys(change).length > 0) {
                await updateGrowthRecord(record.recordId, change)
                notifyDataChanged()
                setVersion((value) => value + 1)
                setToast((previous) => ({ id: (previous?.id ?? 0) + 1, tone: 'success', text: '성장 기록을 수정했어요.' }))
              }
              setEditing(false)
            }}
          />
        ) : (
          <>
            <div className={styles.detailActions}>
              <button type="button" className={enrichmentStyles.outlineButton} onClick={() => setEditing(true)}>
                <PencilIcon size={14} />
                수정
              </button>
              {related && (
                <Link to={related} className={enrichmentStyles.outlineButton}>
                  <LinkIcon size={14} />
                  관련 활동 보기
                </Link>
              )}
            </div>
            <PrivacyNote />
            <section className={styles.detailSection} aria-labelledby="growth-fields">
              <h2 id="growth-fields" className={styles.sectionTitle}>
                기록
              </h2>
              {filled.length === 0 ? (
                <p className={styles.emptyField}>아직 적은 내용이 없어요. "수정"에서 역할이나 배운 점을 적어 보세요.</p>
              ) : (
                <dl className={styles.fieldList}>
                  {filled.map((item) => (
                    <div key={item.field} className={styles.fieldRow}>
                      <dt>{item.label}</dt>
                      <dd>{record[item.field]}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
            {record.artifactIds.length > 0 && <LinkedArtifacts record={record} />}
          </>
        )}
      </article>
    </Frame>
  )
}

function PrivacyNote() {
  return (
    <p className={styles.privacyBox}>
      <LockIcon size={15} />
      <span>나만 보는 개인 기록이에요. 학교생활기록부(세특) 문장이 아니고, 자동으로 만들어지지 않아요.</span>
    </p>
  )
}

function LinkedArtifacts({ record }: { record: GrowthRecord }) {
  const artifacts = useApiQuery(`gr-artifacts|${record.relatedSourceType ?? ''}|${record.relatedSourceId ?? ''}`, () =>
    record.relatedSourceType && record.relatedSourceId ? listArtifacts(record.relatedSourceType, record.relatedSourceId) : Promise.resolve({ items: [] }),
  )
  const linked = artifacts.data?.items.filter((artifact) => record.artifactIds.includes(artifact.artifactId)) ?? []
  return (
    <section className={styles.detailSection} aria-labelledby="growth-artifacts">
      <h2 id="growth-artifacts" className={styles.sectionTitle}>
        연결한 결과물
      </h2>
      {artifacts.status === 'error' && artifacts.error ? (
        <ErrorState title="결과물을 불러오지 못했어요" error={artifacts.error} onRetry={artifacts.retry} />
      ) : !artifacts.data ? (
        <LoadingRows rows={1} label="결과물을 불러오는 중" />
      ) : (
        <>
          <ul className={styles.artifactList}>
            {linked.map((artifact) => (
              <li key={artifact.artifactId} className={styles.artifactItem}>
                <FileIcon size={15} />
                {artifact.title}
              </li>
            ))}
            {linked.length < record.artifactIds.length && (
              <li className={styles.emptyField}>찾을 수 없는 결과물 {record.artifactIds.length - linked.length}개</li>
            )}
          </ul>
          <p className={styles.fieldHint}>결과물 단위로 연결돼요. 어느 파일 버전인지는 아직 고정하지 않아요.</p>
        </>
      )}
    </section>
  )
}

/** PATCH에는 바뀐 항목만 담는다 */
function changedFields(record: GrowthRecord, values: CreateGrowthRecordRequest): UpdateGrowthRecordRequest {
  const change: UpdateGrowthRecordRequest = {}
  if (values.title !== record.title) change.title = values.title
  if (values.subjectId !== record.subjectId) change.subjectId = values.subjectId
  if (values.activityStartDate !== record.activityStartDate) change.activityStartDate = values.activityStartDate
  for (const { field } of growthTextFields) if (values[field] !== record[field]) change[field] = values[field]
  if (values.relatedSourceType !== record.relatedSourceType || values.relatedSourceId !== record.relatedSourceId) {
    change.relatedSourceType = values.relatedSourceType
    change.relatedSourceId = values.relatedSourceId
  }
  if (values.artifactIds.join('\u0000') !== record.artifactIds.join('\u0000')) change.artifactIds = values.artifactIds
  return change
}

interface RelatedSummary {
  title: string
  subjectId: string | null
}

function loadRelated(sourceType: AssessmentSourceType | null, sourceId: string | null): Promise<RelatedSummary | undefined> {
  if (!sourceType || !sourceId) return Promise.resolve(undefined)
  return sourceType === 'SCHOOL_ASSESSMENT'
    ? getSchoolAssessment(sourceId).then((item) => ({ title: item.title, subjectId: item.subjectId }))
    : getEnrichmentTask(sourceId).then((task) => ({ title: task.title, subjectId: task.subjectId }))
}

const relatedKey = (type: AssessmentSourceType | null, id: string | null) => (type && id ? `${type}:${id}` : '')

interface GrowthRecordFormProps {
  initial: CreateGrowthRecordRequest
  submitLabel: string
  onCancel: () => void
  /** 실패하면 throw한다. 입력은 그대로 남는다. */
  onSubmit: (values: CreateGrowthRecordRequest) => Promise<void>
}

type FormValues = Omit<CreateGrowthRecordRequest, GrowthTextField | 'subjectId' | 'activityStartDate'> & {
  subjectId: string
  activityStartDate: string
  texts: Record<GrowthTextField, string>
}

function toFormValues(record: CreateGrowthRecordRequest): FormValues {
  return {
    title: record.title,
    subjectId: record.subjectId ?? '',
    activityStartDate: record.activityStartDate ?? '',
    relatedSourceType: record.relatedSourceType,
    relatedSourceId: record.relatedSourceId,
    artifactIds: [...record.artifactIds],
    texts: Object.fromEntries(growthTextFields.map(({ field }) => [field, record[field] ?? ''])) as Record<GrowthTextField, string>,
  }
}

function fromFormValues(values: FormValues): CreateGrowthRecordRequest {
  const nullable = (value: string) => value.trim() || null
  return {
    title: values.title.trim(),
    subjectId: values.subjectId || null,
    activityStartDate: values.activityStartDate || null,
    relatedSourceType: values.relatedSourceType,
    relatedSourceId: values.relatedSourceId,
    artifactIds: values.artifactIds,
    ...(Object.fromEntries(growthTextFields.map(({ field }) => [field, nullable(values.texts[field])])) as Record<GrowthTextField, string | null>),
  }
}

function GrowthRecordForm({ initial, submitLabel, onCancel, onSubmit }: GrowthRecordFormProps) {
  const { terms, termAssessments } = useAssessmentWorkspace()
  const baseId = useId()
  const [values, setValues] = useState(() => toFormValues(initial))
  const [initialValues] = useState(() => JSON.stringify(toFormValues(initial)))
  const [titleError, setTitleError] = useState<string>()
  const [formError, setFormError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const leavingRef = useRef(false)
  const dirty = JSON.stringify(values) !== initialValues

  // 저장하지 않은 입력이 있으면 앱 안 이동 전에 묻는다. 저장 성공 뒤 이동은 막지 않는다.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => dirty && !leavingRef.current && currentLocation.pathname !== nextLocation.pathname,
  )
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const contexts = terms.data?.contexts ?? []
  const tasks = useApiQuery('gr-form-tasks', () => listEnrichmentTasks({ page: 0, size: relatedOptionsPageSize }))
  const currentKey = relatedKey(values.relatedSourceType, values.relatedSourceId)
  const options = [
    ...(termAssessments.data?.items ?? []).map((item) => ({
      key: relatedKey('SCHOOL_ASSESSMENT', item.assessmentId),
      label: item.title,
      group: '학교 수행평가 (선택한 학기)',
      subjectId: item.subjectId,
    })),
    ...(tasks.data?.items ?? []).map((task) => ({
      key: relatedKey('ENRICHMENT_TASK', task.taskId),
      label: task.title,
      group: '심화 탐구',
      subjectId: task.subjectId,
    })),
  ]
  // 지금 연결된 활동이 목록(선택 학기)에 없으면 원본 이름을 따로 조회해 선택지에 남긴다.
  const missing = currentKey !== '' && !options.some((option) => option.key === currentKey)
  const missingLabel = useApiQuery(`gr-form-related|${missing ? currentKey : ''}`, () =>
    missing ? loadRelated(values.relatedSourceType, values.relatedSourceId) : Promise.resolve(undefined),
  )
  const artifacts = useApiQuery(`gr-form-artifacts|${currentKey}`, () =>
    values.relatedSourceType && values.relatedSourceId ? listArtifacts(values.relatedSourceType, values.relatedSourceId) : Promise.resolve({ items: [] }),
  )

  const setText = (field: GrowthTextField, text: string) => setValues((previous) => ({ ...previous, texts: { ...previous.texts, [field]: text } }))

  const selectRelated = (key: string) => {
    const [type, ...rest] = key.split(':')
    const id = rest.join(':')
    const option = options.find((item) => item.key === key)
    setValues((previous) => ({
      ...previous,
      relatedSourceType: key ? parseSourceType(type) : null,
      relatedSourceId: key ? id : null,
      // 다른 활동의 결과물은 연결할 수 없어 비운다.
      artifactIds: [],
      subjectId: previous.subjectId || option?.subjectId || '',
    }))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (savingRef.current) return
    if (!values.title.trim()) {
      setTitleError('제목을 입력해 주세요.')
      return
    }
    setTitleError(undefined)
    setFormError(undefined)
    savingRef.current = true
    setSaving(true)
    leavingRef.current = true
    try {
      await onSubmit(fromFormValues(values))
    } catch (caught) {
      leavingRef.current = false
      const apiError = toApiError(caught)
      setFormError(`${apiError.message} 입력한 내용은 그대로 있어요. 다시 저장해 주세요. (${apiError.code})`)
      savingRef.current = false
      setSaving(false)
    }
  }

  const id = (name: string) => `${baseId}-${name}`

  return (
    <form className={styles.form} noValidate onSubmit={submit} aria-label="성장 기록">
      {formError && (
        <p className={formStyles.formError} role="alert">
          <AlertIcon size={16} />
          {formError}
        </p>
      )}
      <div className={formStyles.field}>
        <label htmlFor={id('title')} className={formStyles.label}>
          제목 <span className={formStyles.required}>필수</span>
        </label>
        <input
          id={id('title')}
          className={formStyles.input}
          value={values.title}
          disabled={saving}
          aria-invalid={titleError ? true : undefined}
          aria-describedby={titleError ? `${id('title')}-error` : undefined}
          onChange={(event) => setValues((previous) => ({ ...previous, title: event.target.value }))}
        />
        {titleError && (
          <p id={`${id('title')}-error`} className={formStyles.fieldError}>
            {titleError}
          </p>
        )}
      </div>

      <div className={formStyles.field}>
        <label htmlFor={id('related')} className={formStyles.label}>
          관련 활동
        </label>
        <span className={enrichmentStyles.selectWrap}>
          <select id={id('related')} className={enrichmentStyles.select} value={currentKey} disabled={saving} onChange={(event) => selectRelated(event.target.value)}>
            <option value="">연결하지 않음 (개인 활동)</option>
            {missing && <option value={currentKey}>{missingLabel.data?.title ?? '연결된 활동'}</option>}
            {['학교 수행평가 (선택한 학기)', '심화 탐구'].map((group) => (
              <optgroup key={group} label={group}>
                {options
                  .filter((option) => option.group === group)
                  .map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <ChevronDownIcon size={16} className={enrichmentStyles.selectChevron} />
        </span>
        {tasks.status === 'error' && <p className={formStyles.fieldError}>심화 탐구 목록을 불러오지 못했어요. ({tasks.error?.code})</p>}
      </div>

      <div className={styles.formRow}>
        <div className={formStyles.field}>
          <label htmlFor={id('subject')} className={formStyles.label}>
            과목
          </label>
          <span className={enrichmentStyles.selectWrap}>
            <select
              id={id('subject')}
              className={enrichmentStyles.select}
              value={values.subjectId}
              disabled={saving}
              onChange={(event) => setValues((previous) => ({ ...previous, subjectId: event.target.value }))}
            >
              <option value="">선택 안 함</option>
              {values.subjectId && !subjectNameIn(contexts, values.subjectId) && <option value={values.subjectId}>알 수 없는 과목</option>}
              {contexts.map((context) => (
                <optgroup key={`${context.academicYear}-${context.semester}`} label={`${context.academicYear}학년도 ${context.semester}학기`}>
                  {context.subjects.map((subject) => (
                    <option key={subject.subjectId} value={subject.subjectId}>
                      {subject.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDownIcon size={16} className={enrichmentStyles.selectChevron} />
          </span>
        </div>
        <div className={formStyles.field}>
          <label htmlFor={id('date')} className={formStyles.label}>
            활동 시작일
          </label>
          <input
            id={id('date')}
            type="date"
            className={formStyles.input}
            value={values.activityStartDate}
            disabled={saving}
            onChange={(event) => setValues((previous) => ({ ...previous, activityStartDate: event.target.value }))}
          />
        </div>
      </div>

      {growthTextFields.map(({ field, label }) => (
        <div key={field} className={formStyles.field}>
          <label htmlFor={id(field)} className={formStyles.label}>
            {label}
          </label>
          <textarea
            id={id(field)}
            className={formStyles.textarea}
            rows={2}
            value={values.texts[field]}
            disabled={saving}
            onChange={(event) => setText(field, event.target.value)}
          />
        </div>
      ))}

      {currentKey && (
        <fieldset className={formStyles.field}>
          <legend className={formStyles.label}>연결할 결과물</legend>
          {artifacts.status === 'error' && artifacts.error ? (
            <ErrorState title="결과물을 불러오지 못했어요" error={artifacts.error} onRetry={artifacts.retry} />
          ) : !artifacts.data ? (
            <LoadingRows rows={1} label="결과물을 불러오는 중" />
          ) : artifacts.data.items.length === 0 ? (
            <p className={styles.fieldHint}>이 활동에 올린 결과물이 없어요.</p>
          ) : (
            <ul className={styles.checkList}>
              {artifacts.data.items.map((artifact) => (
                <li key={artifact.artifactId}>
                  <label className={styles.checkItem}>
                    <input
                      type="checkbox"
                      checked={values.artifactIds.includes(artifact.artifactId)}
                      disabled={saving}
                      onChange={(event) =>
                        setValues((previous) => ({
                          ...previous,
                          artifactIds: event.target.checked
                            ? [...previous.artifactIds, artifact.artifactId]
                            : previous.artifactIds.filter((value) => value !== artifact.artifactId),
                        }))
                      }
                    />
                    {artifact.title}
                  </label>
                </li>
              ))}
            </ul>
          )}
          <p className={styles.fieldHint}>결과물 단위로 연결돼요. 어느 파일 버전인지는 아직 고정하지 않아요.</p>
        </fieldset>
      )}

      <div className={styles.formActions}>
        <button type="button" className={formStyles.ghostButton} onClick={onCancel} disabled={saving}>
          취소
        </button>
        <button type="submit" className={formStyles.primaryButton} disabled={saving} aria-busy={saving}>
          {saving ? '저장 중…' : submitLabel}
        </button>
      </div>

      {blocker.state === 'blocked' && (
        <Modal
          title="저장하지 않은 내용이 있어요"
          description="이 화면을 나가면 입력한 성장 기록이 사라져요."
          compact
          onRequestClose={() => blocker.reset()}
          footer={
            <>
              <button type="button" className={formStyles.ghostButton} onClick={() => blocker.proceed()}>
                저장하지 않고 나가기
              </button>
              <button type="button" className={formStyles.primaryButton} onClick={() => blocker.reset()}>
                머무르기
              </button>
            </>
          }
        >
          <p className={styles.fieldHint}>이 화면을 나가면 입력한 성장 기록이 사라져요.</p>
        </Modal>
      )}
    </form>
  )
}
