import { useCallback, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { toApiError } from '../api/apiError.ts'
import { getResource, updateResource } from '../api/resourcesApi.ts'
import type { StudentResource, UpdateResourceRequest } from '../api/types.ts'
import formStyles from '../components/AddSchoolAssessmentModal.module.css'
import { AlertIcon, CheckIcon, ChevronDownIcon, ChevronLeftIcon, InfoIcon, LinkIcon, NoteIcon, PencilIcon, SparkleIcon } from '../components/AssessmentIcons.tsx'
import enrichmentStyles from '../components/enrichment/enrichment.module.css'
import { MockDataNotice } from '../components/MockDataNotice.tsx'
import styles from '../components/resources/resources.module.css'
import { ResourceTypeIcon } from '../components/resources/ResourceTypeIcon.tsx'
import { EmptyState, ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { Toast, type ToastMessage } from '../components/Toast.tsx'
import { formatDateTime } from '../model/assessmentDetailView.ts'
import { useAssessmentWorkspace } from '../model/assessmentWorkspace.ts'
import {
  formatPublishedDate,
  hasSourceInfo,
  isValidUrlFormat,
  parseTags,
  publishedDatePattern,
  resourceTypeLabel,
  resourceTypes,
} from '../model/resourceLibraryView.ts'
import { useApiQuery } from '../model/useApiQuery.ts'
import { resourcesPath } from './paths.ts'

// 자료 상세·수정 (screen-map S21, api-contract.md §22 GET·PATCH). 상세 Mockup이 없어 기존 Assessment 패턴으로 최소 구성한다.
// 사용자가 입력한 링크는 "직접 입력한 링크"로 구분하고 열리는지 확인하지 않는다.
// 노트에 추가(§23·§20)는 Editor 결정(OD-A05) 뒤 Stage 4에서 이 resourceId로 연결한다. 삭제는 §22에 없어 제공하지 않는다.
export function ResourceDetailRoute() {
  const { resourceId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { notifyDataChanged } = useAssessmentWorkspace()
  const [version, setVersion] = useState(0)
  const detail = useApiQuery(`rl-detail|${resourceId}|${version}`, () => getResource(resourceId))
  const resource = detail.data?.resourceId === resourceId ? detail.data : undefined
  const [editing, setEditing] = useState(false)
  const [toast, setToast] = useState<ToastMessage | null>(() =>
    (location.state as { created?: boolean } | null)?.created ? { id: 1, tone: 'success', text: '자료를 내 자료함에 저장했어요.' } : null,
  )
  const dismissToast = useCallback(() => setToast(null), [])
  const notify = (tone: ToastMessage['tone'], text: string) => setToast((previous) => ({ id: (previous?.id ?? 0) + 1, tone, text }))

  const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate(resourcesPath))

  const frame = (content: ReactNode) => (
    <main className={enrichmentStyles.page}>
      <div className={enrichmentStyles.mainArea}>
        <div className={`${enrichmentStyles.content} ${styles.detail}`}>
          <button type="button" className={`${enrichmentStyles.backLink} ${styles.backButton}`} onClick={goBack}>
            <ChevronLeftIcon size={15} />
            자료함
          </button>
          {content}
          <div className={enrichmentStyles.notices}>
            <MockDataNotice />
          </div>
        </div>
      </div>
      <Toast message={toast} onDismiss={dismissToast} />
    </main>
  )

  if (detail.status === 'error' && detail.error) {
    return frame(
      detail.error.code === 'RESOURCE_NOT_FOUND' ? (
        <EmptyState title="자료를 찾을 수 없어요" description="없는 자료이거나 내 자료가 아니에요." action={<Link to={resourcesPath}>자료함으로 가기</Link>} />
      ) : (
        <ErrorState title="자료를 불러오지 못했어요" error={detail.error} onRetry={detail.retry} />
      ),
    )
  }
  if (!resource) return frame(<LoadingRows rows={4} label="자료를 불러오는 중" />)

  const filled = hasSourceInfo(resource)

  return frame(
    <article aria-labelledby="resource-title">
      <h1 id="resource-title" className={styles.detailTitle}>
        {resource.title}
      </h1>
      <div className={styles.detailBadges}>
        <span className={enrichmentStyles.badge} data-tone="neutral">
          {resourceTypeLabel(resource.type)}
        </span>
        <span className={styles.sourceBadge} data-state={filled ? 'filled' : 'missing'}>
          {filled ? <CheckIcon size={12} /> : <InfoIcon size={12} />}
          {filled ? '출처 정보 입력됨' : '출처 확인 필요'}
        </span>
      </div>

      {editing ? (
        <EditResourceForm
          resource={resource}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            setVersion((value) => value + 1)
            notifyDataChanged()
            notify('success', '자료를 수정했어요.')
          }}
        />
      ) : (
        <>
          <div className={styles.detailActions}>
            <button type="button" className={enrichmentStyles.outlineButton} onClick={() => setEditing(true)}>
              <PencilIcon size={14} />
              수정
            </button>
            <button
              type="button"
              className={enrichmentStyles.outlineButton}
              aria-disabled="true"
              onClick={() => notify('info', '노트에 자료를 넣는 기능은 탐구 노트 편집기와 함께 제공돼요.')}
            >
              <NoteIcon size={14} />
              노트에 추가
            </button>
            <button
              type="button"
              className={enrichmentStyles.outlineButton}
              aria-disabled="true"
              onClick={() => notify('info', 'AI 요약은 AI 기능이 연결되는 단계(Stage 3)에서 제공돼요.')}
            >
              <SparkleIcon size={14} />
              AI 요약
            </button>
          </div>

          <dl className={styles.props}>
            <PropRow label="유형">
              <span className={styles.inlineType}>
                <ResourceTypeIcon type={resource.type} size={14} />
                {resourceTypeLabel(resource.type)}
              </span>
            </PropRow>
            <PropRow label="발행기관">{resource.sourceName ?? <span className={styles.muted}>입력하지 않았어요</span>}</PropRow>
            <PropRow label="저자">{resource.author ?? <span className={styles.muted}>입력하지 않았어요</span>}</PropRow>
            <PropRow label="발행일">
              {resource.publishedDate ? formatPublishedDate(resource.publishedDate) : <span className={styles.muted}>입력하지 않았어요</span>}
            </PropRow>
            <PropRow label="링크">
              {resource.sourceUrl ? (
                <>
                  <a href={resource.sourceUrl} target="_blank" rel="noreferrer noopener" className={enrichmentStyles.textLink}>
                    <LinkIcon size={13} /> {resource.sourceUrl}
                  </a>
                  <br />
                  <span className={styles.muted}>직접 입력한 링크예요. 열리는지·원문이 맞는지는 확인하지 않았어요.</span>
                </>
              ) : (
                <span className={styles.muted}>링크 없음</span>
              )}
            </PropRow>
            {resource.fileRef && (
              <PropRow label="첨부 파일">
                <span className={styles.muted}>파일 저장소가 연결되기 전이라 열 수 없어요. (시연 데이터)</span>
              </PropRow>
            )}
            <PropRow label="메모">{resource.memo ?? <span className={styles.muted}>메모 없음</span>}</PropRow>
            <PropRow label="태그">
              {resource.tags.length > 0 ? (
                <ul className={styles.tagList}>
                  {resource.tags.map((tag) => (
                    <li key={tag} className={styles.tag}>
                      #{tag}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className={styles.muted}>태그 없음</span>
              )}
            </PropRow>
            <PropRow label="등록">
              {formatDateTime(resource.createdAt)}
              {resource.updatedAt !== resource.createdAt ? ` · 수정 ${formatDateTime(resource.updatedAt)}` : ''}
            </PropRow>
          </dl>
        </>
      )}
    </article>,
  )
}

function PropRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.propRow}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

type EditErrors = Partial<Record<'title' | 'sourceUrl' | 'publishedDate' | 'form', string>>

// §22 PATCH. 바뀐 항목만 보낸다. 실패하면 입력을 그대로 두고 다시 저장할 수 있다.
function EditResourceForm({ resource, onCancel, onSaved }: { resource: StudentResource; onCancel: () => void; onSaved: () => void }) {
  const ids = { type: useId(), title: useId(), source: useId(), author: useId(), date: useId(), url: useId(), memo: useId(), tags: useId() }
  const savingRef = useRef(false)
  const [type, setType] = useState(resource.type)
  const [title, setTitle] = useState(resource.title)
  const [sourceName, setSourceName] = useState(resource.sourceName ?? '')
  const [author, setAuthor] = useState(resource.author ?? '')
  const [publishedDate, setPublishedDate] = useState(resource.publishedDate ?? '')
  const [sourceUrl, setSourceUrl] = useState(resource.sourceUrl ?? '')
  const [memo, setMemo] = useState(resource.memo ?? '')
  const [tags, setTags] = useState(resource.tags.join(', '))
  const [errors, setErrors] = useState<EditErrors>({})
  const [saving, setSaving] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (savingRef.current) return
    const next: EditErrors = {}
    if (title.trim() === '') next.title = '자료명을 입력해 주세요.'
    if (sourceUrl.trim() && !isValidUrlFormat(sourceUrl)) next.sourceUrl = 'http:// 또는 https://로 시작하는 주소를 입력해 주세요.'
    if (publishedDate.trim() && !publishedDatePattern.test(publishedDate.trim())) next.publishedDate = '2025-03 또는 2025-03-14 형식으로 입력해 주세요.'
    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }
    const change: UpdateResourceRequest = {}
    const nullable = (value: string) => value.trim() || null
    if (type !== resource.type) change.type = type
    if (title.trim() !== resource.title) change.title = title.trim()
    if (nullable(sourceName) !== resource.sourceName) change.sourceName = nullable(sourceName)
    if (nullable(author) !== resource.author) change.author = nullable(author)
    if (nullable(publishedDate) !== resource.publishedDate) change.publishedDate = nullable(publishedDate)
    if (nullable(sourceUrl) !== resource.sourceUrl) change.sourceUrl = nullable(sourceUrl)
    if (nullable(memo) !== resource.memo) change.memo = nullable(memo)
    const nextTags = parseTags(tags)
    if (nextTags.join('\u0000') !== resource.tags.join('\u0000')) change.tags = nextTags
    if (Object.keys(change).length === 0) {
      onCancel()
      return
    }
    savingRef.current = true
    setSaving(true)
    setErrors({})
    try {
      await updateResource(resource.resourceId, change)
      onSaved()
    } catch (error) {
      const apiError = toApiError(error)
      setErrors({ form: `${apiError.message} 입력한 내용은 그대로 있어요. 다시 저장해 주세요. (${apiError.code})` })
      savingRef.current = false
      setSaving(false)
    }
  }

  const input = (id: string, label: string, value: string, onChange: (value: string) => void, extra?: { placeholder?: string; error?: string; type?: string }) => (
    <div className={formStyles.field}>
      <label htmlFor={id} className={formStyles.label}>
        {label}
      </label>
      <input
        id={id}
        type={extra?.type ?? 'text'}
        className={formStyles.input}
        value={value}
        placeholder={extra?.placeholder}
        disabled={saving}
        aria-invalid={extra?.error ? true : undefined}
        aria-describedby={extra?.error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {extra?.error && (
        <p id={`${id}-error`} className={formStyles.fieldError}>
          {extra.error}
        </p>
      )}
    </div>
  )

  return (
    <form className={`${formStyles.form} ${styles.editForm}`} noValidate onSubmit={onSubmit} aria-label="자료 수정">
      {errors.form && (
        <p className={formStyles.formError} role="alert">
          <AlertIcon size={16} />
          {errors.form}
        </p>
      )}
      <div className={formStyles.field}>
        <label htmlFor={ids.type} className={formStyles.label}>
          유형
        </label>
        <span className={enrichmentStyles.selectWrap}>
          <select id={ids.type} className={enrichmentStyles.select} value={type} disabled={saving} onChange={(event) => setType(event.target.value)}>
            {resourceTypes.map((option) => (
              <option key={option.type} value={option.type}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon size={16} className={enrichmentStyles.selectChevron} />
        </span>
      </div>
      {input(ids.title, '자료명', title, setTitle, { error: errors.title })}
      {input(ids.source, '발행기관', sourceName, setSourceName)}
      {input(ids.author, '저자', author, setAuthor, { placeholder: '이름 또는 기관' })}
      {input(ids.date, '발행일', publishedDate, setPublishedDate, { placeholder: '예: 2025-03', error: errors.publishedDate })}
      {input(ids.url, '링크', sourceUrl, setSourceUrl, { placeholder: 'https://', error: errors.sourceUrl, type: 'url' })}
      <div className={formStyles.field}>
        <label htmlFor={ids.memo} className={formStyles.label}>
          메모
        </label>
        <textarea id={ids.memo} className={formStyles.textarea} rows={3} value={memo} disabled={saving} onChange={(event) => setMemo(event.target.value)} />
      </div>
      {input(ids.tags, '태그 (쉼표로 구분)', tags, setTags, { placeholder: '예: 환경, 실험' })}
      <div className={styles.editActions}>
        <button type="button" className={formStyles.ghostButton} onClick={onCancel} disabled={saving}>
          취소
        </button>
        <button type="submit" className={formStyles.primaryButton} disabled={saving} aria-busy={saving}>
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </form>
  )
}
