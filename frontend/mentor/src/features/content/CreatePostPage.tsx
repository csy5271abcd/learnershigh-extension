import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { mentorApi } from '../../api/mentorApi.ts'
import type { MentorContentType } from '../../api/types.ts'
import { contentPath, contentReviewPendingPath } from '../../app/paths.ts'
import { ConfirmDialog } from '../../components/ConfirmDialog.tsx'
import { TextField } from '../../components/FormFields.tsx'
import { PageTitle } from '../../components/PageTitle.tsx'
import { TagInput } from '../../components/TagInput.tsx'
import { useToast } from '../../components/toastContext.ts'
import ui from '../../components/ui.module.css'
import { errorMessage } from '../../lib/format.ts'
import { useSessionDraft } from '../../lib/useSessionDraft.ts'
import { invalidateResources, primeResource, useResource } from '../../lib/useResource.ts'
import { contentTypes, isReviewRequired } from '../../model/contentMeta.ts'
import { ContentBodyEditor } from './body/ContentBodyEditor.tsx'
import type { TypedBody } from './body/ContentBodyView.tsx'
import { ContentPreview } from './components/ContentPreview.tsx'
import { CreateStepper, type StepItem } from './components/CreateStepper.tsx'
import { FormErrorSummary } from './components/FormErrorSummary.tsx'
import styles from './CreatePostPage.module.css'
import { bodyOf, createEmptyForm, toCreateRequest, validateForm, type ContentFormValue } from './model/contentForm.ts'

type StepId = 'type' | 'tag' | 'body' | 'visibility' | 'preview'

// mentor-hub.md §5 Create Post: Type → Tag → Body → Visibility → Preview → Submit
const steps: StepItem<StepId>[] = [
  { id: 'type', label: '유형' },
  { id: 'tag', label: '태그' },
  { id: 'body', label: '본문' },
  { id: 'visibility', label: '공개 범위' },
  { id: 'preview', label: '미리보기' },
]

/** Draft는 Tab Session 동안 보존한다. (Back / 다른 메뉴 이동 / Preview ↔ 본문 / 새로고침) */
const CREATE_DRAFT_KEY = 'create'

function stepErrors(step: StepId, form: ContentFormValue): string[] {
  if (step === 'type') return form.type ? [] : ['유형을 골라 주세요.']
  if (step === 'body') {
    const errors = validateForm(form)
    return [...(errors.title ? [errors.title] : []), ...errors.body]
  }
  return []
}

/** 앞 단계가 모두 끝난 곳까지 갈 수 있다. */
function reachableIndex(form: ContentFormValue) {
  const blocked = steps.findIndex((step) => stepErrors(step.id, form).length > 0)
  return blocked === -1 ? steps.length - 1 : blocked
}

export function CreatePostPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const draft = useSessionDraft<ContentFormValue>(CREATE_DRAFT_KEY, createEmptyForm)
  const form = draft.value
  const { state: profile } = useResource('profile', () => mentorApi.getProfile())

  const requested = steps.find((step) => step.id === searchParams.get('step'))?.id ?? 'type'
  const maxIndex = reachableIndex(form)
  // 주소로 앞 단계를 건너뛰어 들어오면 아직 끝나지 않은 단계를 보여 준다.
  const current = steps.findIndex((step) => step.id === requested) > maxIndex ? steps[maxIndex].id : requested
  const currentIndex = steps.findIndex((step) => step.id === current)

  // 0이면 오류를 숨긴다. "다음"을 눌러 막힐 때마다 올려 오류 목록으로 Focus를 다시 옮긴다.
  const [errorTick, setErrorTick] = useState(0)
  const showErrors = errorTick > 0
  const [showRestored, setShowRestored] = useState(draft.restored)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [submitting, setSubmitting] = useState<'draft' | 'publish' | null>(null)
  const [submitError, setSubmitError] = useState<unknown>(null)
  const errorRef = useRef<HTMLDivElement>(null)
  const inFlight = useRef(false)

  const errors = showErrors ? stepErrors(current, form) : []

  useEffect(() => {
    if (errorTick > 0) errorRef.current?.focus()
  }, [errorTick])

  // 단계가 바뀌면 새 단계 제목으로 Focus를 옮긴다. (처음 화면은 PageTitle 규칙을 따른다)
  const stepTitleRef = useRef<HTMLHeadingElement>(null)
  const previousStep = useRef(current)
  useEffect(() => {
    if (previousStep.current === current) return
    previousStep.current = current
    stepTitleRef.current?.focus({ preventScroll: true })
    stepTitleRef.current?.scrollIntoView({ block: 'nearest' })
  }, [current])

  const goTo = (step: StepId) => {
    setErrorTick(0)
    setSearchParams((params) => {
      const next = new URLSearchParams(params)
      next.set('step', step)
      return next
    })
  }

  const next = () => {
    if (stepErrors(current, form).length > 0) {
      setErrorTick((tick) => tick + 1)
      return
    }
    goTo(steps[currentIndex + 1].id)
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
        toast('공개했어요. 이제 Student에게 보여요.')
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

  return (
    <div className={ui.page}>
      <header className={ui.pageHeader}>
        <div>
          <PageTitle>새 글 쓰기</PageTitle>
          <p className={ui.pageLead}>쓰는 중인 내용은 이 탭을 닫기 전까지 자동으로 보관돼요.</p>
        </div>
      </header>

      {showRestored && (
        <div className={`${ui.alert} ${ui.alertInfo} ${styles.restored}`}>
          <span>작성 중이던 글을 불러왔어요.</span>
          <button type="button" className={`${ui.button} ${ui.ghost} ${ui.small}`} onClick={() => setConfirmDiscard(true)}>
            새로 쓰기
          </button>
        </div>
      )}

      <CreateStepper steps={steps} current={current} reachableIndex={maxIndex} onSelect={goTo} />

      <section className={current === 'preview' ? styles.wide : styles.narrow} aria-labelledby="step-title">
        <h2 id="step-title" ref={stepTitleRef} tabIndex={-1} className={`${ui.sectionTitle} ${styles.stepTitle}`}>
          {currentIndex + 1}. {steps[currentIndex].label}
        </h2>
        <FormErrorSummary ref={errorRef} errors={errors} />

        {current === 'type' && (
          <fieldset className={ui.field}>
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
                  <span className={styles.typeName}>{type.label}</span>
                  <span className={ui.help}>{type.description}</span>
                </label>
              ))}
            </div>
            <p className={ui.help}>유형을 바꿔도 앞서 쓴 본문은 유형별로 보관돼요.</p>
          </fieldset>
        )}

        {current === 'tag' && (
          <TagInput
            tags={form.tags}
            onChange={(tags) => update({ tags })}
            suggestions={profile.status === 'success' ? profile.data.tags : []}
          />
        )}

        {current === 'body' && typed && (
          <div className={ui.form}>
            <TextField
              label="제목"
              value={form.title}
              maxLength={80}
              onChange={(event) => update({ title: event.target.value })}
              error={showErrors && !form.title.trim() ? '제목을 입력해 주세요.' : undefined}
            />
            <ContentBodyEditor
              content={typed}
              onChange={(body) => draft.update((value) => ({ ...value, bodies: { ...value.bodies, [typed.type]: body } }))}
            />
          </div>
        )}

        {current === 'visibility' && (
          <fieldset className={ui.field}>
            <legend className={ui.label}>누구에게 보일까요?</legend>
            <label className={styles.typeOption}>
              <input type="radio" name="visibility" value="PUBLIC" checked={form.visibility === 'PUBLIC'} readOnly />
              <span className={styles.typeName}>전체 Student 공개</span>
              <span className={ui.help}>
                {reviewRequired
                  ? 'Record / Case는 개인정보 확인과 운영팀 검수를 마친 뒤에 공개돼요.'
                  : '공개하면 Mentor Hub에서 Student가 볼 수 있어요.'}
              </span>
            </label>
            <p className={ui.help}>다른 공개 범위는 아직 제공하지 않아요.</p>
          </fieldset>
        )}

        {current === 'preview' && typed && <ContentPreview content={{ ...typed, title: form.title, tags: form.tags }} />}

        {submitError !== null && (
          <div className={`${ui.alert} ${ui.alertError} ${styles.submitError}`} role="alert">
            <span>{errorMessage(submitError, '저장하지 못했어요.')} 작성한 내용은 그대로 있어요.</span>
          </div>
        )}

        <div className={ui.actionBar}>
          <div className={ui.actions}>
            {currentIndex > 0 && (
              <button type="button" className={`${ui.button} ${ui.neutral}`} onClick={() => goTo(steps[currentIndex - 1].id)}>
                이전
              </button>
            )}
          </div>
          {current === 'preview' ? (
            <div className={ui.actions}>
              <button
                type="button"
                className={`${ui.button} ${ui.neutral}`}
                onClick={() => submit('draft')}
                disabled={submitting !== null}
                aria-busy={submitting === 'draft'}
              >
                {submitting === 'draft' ? '저장 중…' : '초안으로 저장'}
              </button>
              <button
                type="button"
                className={`${ui.button} ${ui.primary}`}
                onClick={() => submit('publish')}
                disabled={submitting !== null}
                aria-busy={submitting === 'publish'}
              >
                {submitting === 'publish' ? '요청 중…' : reviewRequired ? '검수 요청하기' : '공개하기'}
              </button>
            </div>
          ) : (
            <button type="button" className={`${ui.button} ${ui.primary}`} onClick={next}>
              다음
            </button>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={confirmDiscard}
        title="작성 중인 글을 지울까요?"
        confirmLabel="지우고 새로 쓰기"
        tone="danger"
        onConfirm={() => {
          setConfirmDiscard(false)
          setShowRestored(false)
          draft.discard()
          goTo('type')
        }}
        onCancel={() => setConfirmDiscard(false)}
      >
        지금까지 쓴 유형 · 태그 · 본문이 모두 지워져요.
      </ConfirmDialog>
    </div>
  )
}
