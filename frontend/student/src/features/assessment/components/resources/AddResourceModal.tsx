import { useId, useRef, useState, type FormEvent } from 'react'
import { isAssessmentReadOnlyView } from '../../api/viewMode.ts'
import { ReadOnlyBlockedModal } from '../ReadOnlyBlockedModal.tsx'
import { toApiError, type ApiError } from '../../api/apiError.ts'
import { attachResourceFile, createResource } from '../../api/resourcesApi.ts'
import type { StudentResource } from '../../api/types.ts'
import { acceptFor, fileResourceTypes, fileSizeText, isValidUrlFormat, localFileProblem, publishedDatePattern, resourceTypes } from '../../model/resourceLibraryView.ts'
import formStyles from '../AddSchoolAssessmentModal.module.css'
import { AlertIcon } from '../AssessmentIcons.tsx'
import enrichmentStyles from '../enrichment/enrichment.module.css'
import { Modal } from '../Modal.tsx'
import styles from './resources.module.css'

export interface AddResourcePrefill {
  sourceName?: string
}

interface AddResourceModalProps {
  prefill?: AddResourcePrefill
  onClose: () => void
  onCreated: (resource: StudentResource) => void
}

type Field = 'title' | 'type' | 'sourceUrl' | 'publishedDate'
type FieldErrors = Partial<Record<Field | 'form', string>>

const reasonMessages: Record<Field, Record<string, string>> = {
  title: { required: '자료명을 입력해 주세요.' },
  type: { unknown: '자료 유형을 골라 주세요.' },
  sourceUrl: { format: 'http:// 또는 https://로 시작하는 주소를 입력해 주세요.' },
  publishedDate: { format: '2025-03 또는 2025-03-14 형식으로 입력해 주세요.' },
}

// 자료 추가 (Mockup RL-ADD-01, inquiry §7-2, api-contract.md §22 POST).
// 계약 예시에서 값이 있는 type·title만 필수로 본다. 나머지는 선택이다.
// 링크는 형식만 확인하고 실제로 열리는지는 확인하지 않는다.
// A27-UX: PDF·이미지·파일 유형은 파일을 첨부한다(§22-1 DRAFT). 자료를 먼저 만든 뒤 파일을 올리고, 파일만 실패하면 자료는 남기고 다시 올릴 수 있게 한다.
// 메모·태그는 Mockup 등록 화면에 없어 자료 상세에서 고친다.
function AddResourceModalForm({ prefill, onClose, onCreated }: AddResourceModalProps) {
  const ids = { title: useId(), author: useId(), source: useId(), date: useId(), url: useId() }
  const titleRef = useRef<HTMLInputElement>(null)
  const submittingRef = useRef(false)
  const initialSource = prefill?.sourceName ?? ''
  const [type, setType] = useState('LINK')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [sourceName, setSourceName] = useState(initialSource)
  const [publishedDate, setPublishedDate] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [confirmingClose, setConfirmingClose] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'failed'>('idle')
  /** 자료는 만들었지만 파일 업로드만 실패한 경우 — 다시 시도는 파일만 올린다 */
  const [createdId, setCreatedId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const wantsFile = fileResourceTypes.has(type)
  const pickFile = (picked: File | undefined) => {
    if (!picked) return
    const problem = localFileProblem(picked, type)
    setFileError(problem)
    setFile(problem ? null : picked)
    if (!problem && title.trim() === '') setTitle(picked.name.replace(/\.[^.]+$/, ''))
  }

  const isDirty = type !== 'LINK' || title !== '' || author !== '' || sourceName !== initialSource || publishedDate !== '' || sourceUrl !== '' || file !== null
  const canSubmit = title.trim() !== '' && !submitting && (!wantsFile || file !== null)

  const requestClose = () => {
    if (submitting) return
    if (isDirty && !confirmingClose) {
      setConfirmingClose(true)
      return
    }
    onClose()
  }

  const applyServerError = (error: ApiError) => {
    if (error.code === 'VALIDATION_ERROR') {
      const next: FieldErrors = {}
      for (const [field, reason] of Object.entries(error.fieldReasons())) {
        if (field in reasonMessages) next[field as Field] = reasonMessages[field as Field][reason] ?? `입력값을 확인해 주세요. (${reason})`
        else next.form = `${error.message} (${field})`
      }
      setErrors(next)
      return
    }
    setErrors({ form: `${error.message} 입력한 내용은 그대로 있어요. 다시 저장해 주세요. (${error.code})` })
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submittingRef.current) return
    const next: FieldErrors = {}
    if (title.trim() === '') next.title = reasonMessages.title.required
    if (wantsFile && !file) next.form = '올릴 파일을 골라 주세요.'
    if (sourceUrl.trim() && !isValidUrlFormat(sourceUrl)) next.sourceUrl = reasonMessages.sourceUrl.format
    if (publishedDate.trim() && !publishedDatePattern.test(publishedDate.trim())) next.publishedDate = reasonMessages.publishedDate.format
    if (Object.keys(next).length > 0) {
      setErrors(next)
      if (next.title) titleRef.current?.focus()
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    setErrors({})
    setConfirmingClose(false)
    try {
      if (createdId && file) {
        // 파일만 다시 올린다(자료는 이미 저장됨)
        setUploadState('uploading')
        onCreated(await attachResourceFile(createdId, file))
        return
      }
      const created = await createResource({
        type,
        title: title.trim(),
        sourceName: sourceName.trim() || null,
        sourceUrl: sourceUrl.trim() || null,
        author: author.trim() || null,
        publishedDate: publishedDate.trim() || null,
        memo: null,
        tags: [],
        fileRef: null,
      })
      if (wantsFile && file) {
        setCreatedId(created.resourceId)
        setUploadState('uploading')
        try {
          onCreated(await attachResourceFile(created.resourceId, file))
        } catch (uploadError) {
          const apiError = toApiError(uploadError)
          setUploadState('failed')
          setErrors({ form: `자료는 저장했지만 파일을 올리지 못했어요. ${apiError.message}` })
          submittingRef.current = false
          setSubmitting(false)
        }
        return
      }
      onCreated(created)
    } catch (error) {
      applyServerError(toApiError(error))
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const fieldError = (field: Field, id: string) =>
    errors[field] ? (
      <p id={`${id}-error`} className={formStyles.fieldError}>
        {errors[field]}
      </p>
    ) : null

  return (
    <Modal
      title="자료 추가"
      description="조사한 자료의 출처를 내 자료함에 남겨요."
      compact
      onRequestClose={requestClose}
      initialFocusRef={titleRef}
      footer={
        confirmingClose ? (
          <div className={formStyles.confirm} role="alert">
            <span>작성 중인 내용이 사라져요. 닫을까요?</span>
            <button type="button" className={formStyles.ghostButton} onClick={() => setConfirmingClose(false)}>
              계속 작성
            </button>
            <button type="button" className={formStyles.dangerButton} onClick={onClose}>
              닫기
            </button>
          </div>
        ) : (
          <>
            <button type="button" className={formStyles.ghostButton} onClick={requestClose} disabled={submitting}>
              취소
            </button>
            <button type="submit" form="add-resource-form" className={formStyles.primaryButton} disabled={!canSubmit} aria-busy={submitting} data-testid="resource-save">
              {submitting ? (uploadState === 'uploading' ? '파일 올리는 중…' : '저장 중…') : uploadState === 'failed' ? '파일 다시 올리기' : '저장'}
            </button>
          </>
        )
      }
    >
      <form id="add-resource-form" className={formStyles.form} noValidate onSubmit={onSubmit}>
        {errors.form && (
          <p className={formStyles.formError} role="alert">
            <AlertIcon size={16} />
            {errors.form}
          </p>
        )}
        <fieldset className={formStyles.field}>
          <legend className="lh-visually-hidden">자료 유형</legend>
          <div className={`${formStyles.chips} ${enrichmentStyles.inkChips} ${styles.typeChips}`}>
            {resourceTypes.map((option) => (
              <label key={option.type} className={formStyles.chip}>
                <input
                  type="radio"
                  name="resourceType"
                  value={option.type}
                  checked={type === option.type}
                  disabled={submitting}
                  onChange={() => setType(option.type)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          {fieldError('type', 'resource-type')}
        </fieldset>

        <div className={formStyles.field}>
          <label htmlFor={ids.title} className={formStyles.label}>
            자료명 <span className="lh-visually-hidden">(필수)</span>
          </label>
          <input
            ref={titleRef}
            id={ids.title}
            className={formStyles.input}
            value={title}
            placeholder="예: 산성비가 토양에 미치는 영향"
            autoComplete="off"
            required
            disabled={submitting}
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={errors.title ? `${ids.title}-error` : undefined}
            onChange={(event) => {
              setTitle(event.target.value)
              if (errors.title) setErrors((previous) => ({ ...previous, title: undefined }))
            }}
          />
          {fieldError('title', ids.title)}
        </div>

        <div className={formStyles.field}>
          <label htmlFor={ids.author} className={formStyles.label}>
            저자
          </label>
          <input id={ids.author} className={formStyles.input} value={author} placeholder="이름 또는 기관" disabled={submitting} onChange={(event) => setAuthor(event.target.value)} />
        </div>

        <div className={formStyles.field}>
          <label htmlFor={ids.source} className={formStyles.label}>
            발행기관
          </label>
          <input id={ids.source} className={formStyles.input} value={sourceName} disabled={submitting} onChange={(event) => setSourceName(event.target.value)} />
        </div>

        <div className={formStyles.field}>
          <label htmlFor={ids.date} className={formStyles.label}>
            발행일
          </label>
          <input
            id={ids.date}
            className={formStyles.input}
            value={publishedDate}
            placeholder="예: 2025-03"
            disabled={submitting}
            aria-invalid={errors.publishedDate ? true : undefined}
            aria-describedby={errors.publishedDate ? `${ids.date}-error` : undefined}
            onChange={(event) => {
              setPublishedDate(event.target.value)
              if (errors.publishedDate) setErrors((previous) => ({ ...previous, publishedDate: undefined }))
            }}
          />
          {fieldError('publishedDate', ids.date)}
        </div>

        {wantsFile && (
          <div className={formStyles.field}>
            <span className={formStyles.label}>파일</span>
            <div
              className={styles.dropZone}
              data-dragging={dragging || undefined}
              data-testid="resource-file-drop"
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault()
                setDragging(false)
                if (!submitting) pickFile(event.dataTransfer.files[0])
              }}
            >
              {file ? (
                <div className={styles.fileRow} data-testid="resource-file-selected">
                  <span className={styles.fileName} title={file.name}>
                    {file.name}
                  </span>
                  <span className={styles.fileMeta}>
                    {file.name.split('.').pop()?.toUpperCase()} · {fileSizeText(file.size)}
                    {uploadState === 'uploading' ? ' · 올리는 중…' : uploadState === 'failed' ? ' · 올리지 못함' : ''}
                  </span>
                  <button
                    type="button"
                    className={formStyles.ghostButton}
                    disabled={submitting || createdId !== null}
                    onClick={() => {
                      setFile(null)
                      setUploadState('idle')
                    }}
                  >
                    빼기
                  </button>
                </div>
              ) : (
                <>
                  <p className={styles.dropText}>파일을 여기로 끌어 놓거나</p>
                  <button type="button" className={formStyles.ghostButton} onClick={() => fileInputRef.current?.click()} disabled={submitting} data-testid="resource-file-pick">
                    파일 고르기
                  </button>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept={acceptFor(type)}
                data-testid="resource-file-input"
                onChange={(event) => {
                  pickFile(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
            </div>
            <p className={fileError ? formStyles.fieldError : formStyles.hint}>
              {fileError ?? (type === 'IMAGE' ? 'JPG·PNG·GIF·WEBP · 100MB 이하. GIF는 움직이는 그대로 보관해요.' : type === 'PDF' ? 'PDF · 100MB 이하' : '문서(PDF·HWP·HWPX·Word·Excel·PowerPoint)와 이미지 · 100MB 이하. PDF·이미지만 앱에서 바로 볼 수 있어요.')}
            </p>
          </div>
        )}

        <div className={formStyles.field}>
          <label htmlFor={ids.url} className={formStyles.label}>
            링크
          </label>
          <input
            id={ids.url}
            type="url"
            className={formStyles.input}
            value={sourceUrl}
            placeholder="https://"
            disabled={submitting}
            aria-invalid={errors.sourceUrl ? true : undefined}
            aria-describedby={errors.sourceUrl ? `${ids.url}-error` : `${ids.url}-hint`}
            onChange={(event) => {
              setSourceUrl(event.target.value)
              if (errors.sourceUrl) setErrors((previous) => ({ ...previous, sourceUrl: undefined }))
            }}
          />
          {errors.sourceUrl ? (
            fieldError('sourceUrl', ids.url)
          ) : (
            <p id={`${ids.url}-hint`} className={formStyles.hint}>
              주소 형식만 확인해요.
            </p>
          )}
        </div>

        <p className={styles.modalHint}>작성자와 발행일을 모두 채우면 &ldquo;출처 정보 입력됨&rdquo;으로 표시돼요.</p>
      </form>
    </Modal>
  )
}

/** 관리자 읽기 전용 보기(P-28)에서는 입력 폼 대신 안내만 연다 */
export function AddResourceModal(props: Parameters<typeof AddResourceModalForm>[0]) {
  return isAssessmentReadOnlyView() ? <ReadOnlyBlockedModal onClose={props.onClose} /> : <AddResourceModalForm {...props} />
}
