import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { mentorApi } from '../../api/mentorApi.ts'
import type { MentorContentType } from '../../api/types.ts'
import { contentPath, contentReviewPendingPath } from '../../app/paths.ts'
import { ConfirmDialog } from '../../components/ConfirmDialog.tsx'
import { IconTile, TypeGlyph } from '../../components/icons.tsx'
import { PageTitle } from '../../components/PageTitle.tsx'
import { TagInput } from '../../components/TagInput.tsx'
import { useToast } from '../../components/toastContext.ts'
import ui from '../../components/ui.module.css'
import type { TypedBody } from '../../content-body/ContentBodyView.tsx'
import { recordPrivacyItems } from '../../content-body/labels.ts'
import { errorMessage } from '../../lib/format.ts'
import { useSessionDraft } from '../../lib/useSessionDraft.ts'
import { invalidateResources, primeResource, useResource } from '../../lib/useResource.ts'
import { contentTypeLabel, contentTypes, isReviewRequired } from '../../model/contentMeta.ts'
import { ContentBodyEditor } from './body/ContentBodyEditor.tsx'
import { ContentPreview } from './components/ContentPreview.tsx'
import { FormErrorSummary } from './components/FormErrorSummary.tsx'
import styles from './CreatePostPage.module.css'
import { bodyOf, createEmptyForm, hasErrors, toCreateRequest, validateForm, type ContentFormValue } from './model/contentForm.ts'

/** Draft는 Tab Session 동안 보존한다. (Back / 다른 메뉴 이동 / Preview ↔ 편집 / 새로고침) */
const CREATE_DRAFT_KEY = 'create'

const parseType = (value: string | null) => contentTypes.find((item) => item.id === value)?.id

// Create Post (mentor-hub.md §5: Type → Tag → Body → Visibility → Preview → Submit)
// - 유형: Rail "작성" Launcher(?type=) 또는 이 화면의 유형 선택
// - 작성: 왼쪽 작성 영역(제목 · 태그 · 본문) + 오른쪽 작성 정보(유형 · 공개 범위 · 개인정보 안내 · 진행)
// - 미리보기(?mode=preview): Published Layout으로 확인한 뒤에만 Submit한다.
export function CreatePostPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const draft = useSessionDraft<ContentFormValue>(CREATE_DRAFT_KEY, createEmptyForm)
  const { update: updateDraft } = draft
  const form = draft.value
  const { state: profile } = useResource('profile', () => mentorApi.getProfile())

  const launchedType = parseType(searchParams.get('type'))
  const preview = searchParams.get('mode') === 'preview' && form.type !== null

  const [errorTick, setErrorTick] = useState(0)
  const [showRestored, setShowRestored] = useState(draft.restored)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [submitting, setSubmitting] = useState<'draft' | 'publish' | null>(null)
  const [submitError, setSubmitError] = useState<unknown>(null)
  const errorRef = useRef<HTMLDivElement>(null)
  const regionRef = useRef<HTMLHeadingElement>(null)
  const inFlight = useRef(false)

  // Launcher에서 고른 유형을 Draft에 넣고 주소에서는 지운다. (유형별 본문은 그대로 보관)
  useEffect(() => {
    if (!launchedType) return
    updateDraft((value) => ({ ...value, type: launchedType }))
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params)
        next.delete('type')
        return next
      },
      { replace: true },
    )
  }, [launchedType, updateDraft, setSearchParams])

  useEffect(() => {
    if (errorTick > 0) errorRef.current?.focus()
  }, [errorTick])

  // 작성 ↔ 미리보기가 바뀌면 영역 제목으로 Focus를 옮긴다.
  const previousMode = useRef(preview)
  useEffect(() => {
    if (previousMode.current === preview) return
    previousMode.current = preview
    regionRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0 })
  }, [preview])

  const validation = validateForm(form)
  const errors = errorTick > 0 ? [...(validation.title ? [validation.title] : []), ...validation.body] : []

  const setMode = (mode: 'edit' | 'preview') =>
    setSearchParams((params) => {
      const next = new URLSearchParams(params)
      if (mode === 'preview') next.set('mode', 'preview')
      else next.delete('mode')
      return next
    })

  const openPreview = () => {
    if (hasErrors(validation)) {
      setErrorTick((tick) => tick + 1)
      return
    }
    setErrorTick(0)
    setMode('preview')
  }

  const update = (patch: Partial<ContentFormValue>) => draft.update((value) => ({ ...value, ...patch }))

  const submit = async (mode: 'draft' | 'publish') => {
    if (inFlight.current || !form.type) return
    inFlight.current = true
    setSubmitting(mode)
    setSubmitError(null)
    try {
      let saved = await mentorApi.createContent(toCreateRequest(form))
      invalidateResources('content:list')

      if (mode === 'publish') {
        try {
          saved = await mentorApi.publishContent(saved.contentId)
        } catch {
          // 초안은 저장됐다. 작성 중 Draft를 지우고 Detail에서 공개를 다시 시도하게 한다.
          draft.discard()
          primeResource(`content:detail:${saved.contentId}`, saved)
          toast('초안은 저장했어요. 공개 요청은 다시 시도해 주세요.')
          navigate(contentPath(saved.contentId), { replace: true })
          return
        }
      }

      draft.discard()
      primeResource(`content:detail:${saved.contentId}`, saved)
      if (mode === 'draft') {
        toast('초안으로 저장했어요.')
        navigate(contentPath(saved.contentId), { replace: true })
      } else if (isReviewRequired(saved.type)) {
        navigate(contentReviewPendingPath(saved.contentId), { replace: true })
      } else {
        toast('공개했어요. 이제 Student와 다른 멘토에게 보여요.')
        navigate(contentPath(saved.contentId), { replace: true })
      }
    } catch (error) {
      setSubmitError(error)
    } finally {
      inFlight.current = false
      setSubmitting(null)
    }
  }

  const reviewRequired = form.type ? isReviewRequired(form.type) : false
  const typed = form.type ? ({ type: form.type, body: bodyOf(form, form.type) } as TypedBody) : null
  const bodyReady = form.type !== null && !hasErrors(validation)

  return (
    <div className={ui.page}>
      <header className={styles.header}>
        <PageTitle>{form.type ? `새 ${contentTypeLabel(form.type)}` : '새 콘텐츠'}</PageTitle>
        <p className={ui.pageLead}>쓰는 중인 내용은 이 탭을 닫기 전까지 자동으로 보관돼요.</p>
      </header>

      {showRestored && (
        <div className={`${ui.alert} ${ui.alertInfo} ${styles.notice}`}>
          <span>작성 중이던 글을 불러왔어요.</span>
          <button type="button" className={`${ui.button} ${ui.ghost} ${ui.small}`} onClick={() => setConfirmDiscard(true)}>
            새로 쓰기
          </button>
        </div>
      )}

      {!typed ? (
        <section aria-labelledby="type-picker-title">
          <h2 id="type-picker-title" ref={regionRef} tabIndex={-1} className={styles.regionTitle}>
            어떤 콘텐츠를 쓸까요?
          </h2>
          <fieldset>
            <legend className="visually-hidden">콘텐츠 유형</legend>
            <div className={styles.typeGrid}>
              {contentTypes.map((type) => (
                <label key={type.id} className={styles.typeOption}>
                  <input
                    type="radio"
                    name="content-type"
                    value={type.id}
                    checked={form.type === type.id}
                    onChange={() => update({ type: type.id as MentorContentType })}
                  />
                  <IconTile size={52}>
                    <TypeGlyph type={type.id} size={34} />
                  </IconTile>
                  <span className={styles.typeName}>{type.label}</span>
                  <span className={styles.typeDescription}>{type.description}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>
      ) : (
        <div className={ui.split}>
          <section className={styles.workArea} aria-labelledby="work-area-title">
            <h2 id="work-area-title" ref={regionRef} tabIndex={-1} className={styles.regionTitle}>
              {preview ? '미리보기' : '작성'}
            </h2>
            <FormErrorSummary ref={errorRef} errors={errors} />
            {preview ? (
              <ContentPreview content={{ ...typed, title: form.title, tags: form.tags }} />
            ) : (
              <div className={ui.form}>
                <div className={ui.field}>
                  <label htmlFor="composer-title" className="visually-hidden">
                    제목
                  </label>
                  <input
                    id="composer-title"
                    className={styles.titleInput}
                    placeholder="제목을 입력해 주세요"
                    value={form.title}
                    maxLength={80}
                    aria-invalid={errorTick > 0 && Boolean(validation.title)}
                    onChange={(event) => update({ title: event.target.value })}
                  />
                  {errorTick > 0 && validation.title && <p className={ui.fieldError}>{validation.title}</p>}
                </div>
                <TagInput
                  tags={form.tags}
                  onChange={(tags) => update({ tags })}
                  suggestions={profile.status === 'success' ? profile.data.tags : []}
                />
                <ContentBodyEditor
                  content={typed}
                  onChange={(body) => draft.update((value) => ({ ...value, bodies: { ...value.bodies, [typed.type]: body } }))}
                />
              </div>
            )}
          </section>

          <aside className={`${ui.aside} ${styles.info}`} aria-label="작성 정보">
            <section className={ui.panel} aria-labelledby="composer-type-title">
              <h2 id="composer-type-title" className={ui.panelTitle}>
                유형
              </h2>
              <div className={styles.typeSwitch} role="radiogroup" aria-label="유형 바꾸기">
                {contentTypes.map((type) => (
                  <label key={type.id} className={styles.typeChip}>
                    <input
                      type="radio"
                      name="composer-type"
                      value={type.id}
                      checked={form.type === type.id}
                      disabled={preview || submitting !== null}
                      onChange={() => update({ type: type.id })}
                    />
                    <span>{type.label}</span>
                  </label>
                ))}
              </div>
              <p className={ui.help}>유형을 바꿔도 앞서 쓴 본문은 유형별로 보관돼요.</p>
            </section>

            <section className={ui.panel} aria-labelledby="composer-visibility-title">
              <h2 id="composer-visibility-title" className={ui.panelTitle}>
                공개 범위
              </h2>
              <label className={styles.visibility}>
                <input type="radio" name="visibility" value="PUBLIC" checked={form.visibility === 'PUBLIC'} readOnly />
                <span>Student · 다른 멘토에게 공개</span>
              </label>
              <p className={ui.help}>
                {reviewRequired ? '개인정보 확인과 운영팀 검수를 마친 뒤에 공개돼요.' : '공개하면 바로 보여요.'} 다른 공개 범위는 아직
                제공하지 않아요.
              </p>
            </section>

            {reviewRequired && (
              <section className={ui.panel} aria-labelledby="composer-privacy-title">
                <h2 id="composer-privacy-title" className={ui.panelTitle}>
                  개인정보 안내
                </h2>
                <p className={ui.help}>아래 정보는 지운 뒤 적어 주세요. 다른 멘토에게도 같은 기준이 적용돼요.</p>
                <p className={styles.privacyItems}>{recordPrivacyItems.join(' · ')}</p>
              </section>
            )}

            <section className={ui.panel} aria-labelledby="composer-progress-title">
              <h2 id="composer-progress-title" className={ui.panelTitle}>
                진행
              </h2>
              <ol className={styles.progress}>
                <ProgressItem done label="유형" detail={contentTypeLabel(typed.type)} />
                <ProgressItem done={form.tags.length > 0} label="태그" detail={form.tags.length > 0 ? `${form.tags.length}개` : '선택'} />
                <ProgressItem done={bodyReady} label="본문" detail={bodyReady ? '입력 완료' : '입력 필요'} />
                <ProgressItem done label="공개 범위" detail="전체 공개" />
                <ProgressItem done={preview} current={preview} label="미리보기" detail={preview ? '확인 중' : '제출 전 확인'} />
              </ol>
            </section>

            {submitError !== null && (
              <div className={`${ui.alert} ${ui.alertError}`} role="alert">
                <span>{errorMessage(submitError, '저장하지 못했어요.')} 작성한 내용은 그대로 있어요.</span>
              </div>
            )}

            <div className={styles.actions}>
              {preview ? (
                <>
                  <button
                    type="button"
                    className={`${ui.button} ${ui.primary}`}
                    onClick={() => submit('publish')}
                    disabled={submitting !== null}
                    aria-busy={submitting === 'publish'}
                  >
                    {submitting === 'publish' ? '요청 중…' : reviewRequired ? '검수 요청하기' : '공개하기'}
                  </button>
                  <button
                    type="button"
                    className={`${ui.button} ${ui.neutral}`}
                    onClick={() => submit('draft')}
                    disabled={submitting !== null}
                    aria-busy={submitting === 'draft'}
                  >
                    {submitting === 'draft' ? '저장 중…' : '초안으로 저장'}
                  </button>
                  <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={() => setMode('edit')} disabled={submitting !== null}>
                    편집으로 돌아가기
                  </button>
                </>
              ) : (
                <button type="button" className={`${ui.button} ${ui.primary}`} onClick={openPreview}>
                  미리보기
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      <ConfirmDialog
        open={confirmDiscard}
        title="작성 중인 글을 지울까요?"
        confirmLabel="지우고 새로 쓰기"
        tone="danger"
        onConfirm={() => {
          setConfirmDiscard(false)
          setShowRestored(false)
          draft.discard()
          setMode('edit')
        }}
        onCancel={() => setConfirmDiscard(false)}
      >
        지금까지 쓴 유형 · 태그 · 본문이 모두 지워져요.
      </ConfirmDialog>
    </div>
  )
}

function ProgressItem({ done, current, label, detail }: { done: boolean; current?: boolean; label: string; detail: string }) {
  return (
    <li className={`${styles.progressItem} ${done ? styles.progressDone : ''}`} aria-current={current ? 'step' : undefined}>
      <span className={styles.progressMark} aria-hidden="true">
        {done ? '✓' : ''}
      </span>
      <span className={styles.progressLabel}>{label}</span>
      <span className={styles.progressDetail}>
        {detail}
        <span className="visually-hidden">{done ? ' (완료)' : ''}</span>
      </span>
    </li>
  )
}
