import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { mentorApi } from '../../api/mentorApi.ts'
import type { MentorContentDetail } from '../../api/types.ts'
import { contentListPath, contentPath } from '../../app/paths.ts'
import { Badge } from '../../components/Badge.tsx'
import { ConfirmDialog } from '../../components/ConfirmDialog.tsx'
import { TextField } from '../../components/FormFields.tsx'
import { ErrorState, LoadingState, NotFoundState } from '../../components/PageState.tsx'
import { PageTitle } from '../../components/PageTitle.tsx'
import { TagInput } from '../../components/TagInput.tsx'
import { useToast } from '../../components/toastContext.ts'
import ui from '../../components/ui.module.css'
import { errorMessage } from '../../lib/format.ts'
import { useSessionDraft } from '../../lib/useSessionDraft.ts'
import { invalidateResources, primeResource, useResource } from '../../lib/useResource.ts'
import { contentStatusView, contentTypeLabel } from '../../model/contentMeta.ts'
import { ContentBodyEditor } from './body/ContentBodyEditor.tsx'
import type { TypedBody } from './body/ContentBodyView.tsx'
import { ContentPreview } from './components/ContentPreview.tsx'
import { FormErrorSummary } from './components/FormErrorSummary.tsx'
import styles from './ContentEditPage.module.css'
import { bodyOf, formFromContent, hasErrors, toUpdateRequest, validateForm, type ContentFormValue } from './model/contentForm.ts'
import { editBlockedReason } from './model/editability.ts'

export function ContentEditPage() {
  const { contentId = '' } = useParams()
  const { state, reload } = useResource(`content:detail:${contentId}`, () => mentorApi.getContent(contentId))

  return (
    <div className={ui.page}>
      {state.status === 'loading' && <LoadingState label="콘텐츠를 불러오는 중이에요." rows={3} />}
      {state.status === 'error' && <ErrorState title="콘텐츠를 불러오지 못했어요." error={state.error} onRetry={reload} />}
      {state.status === 'notFound' && (
        <NotFoundState title="콘텐츠를 찾을 수 없어요." description="삭제되었거나 내 콘텐츠가 아니에요.">
          <Link to={contentListPath} className={`${ui.button} ${ui.neutral}`}>
            내 콘텐츠로 가기
          </Link>
        </NotFoundState>
      )}
      {state.status === 'success' && <ContentEditor key={contentId} content={state.data} />}
    </div>
  )
}

/**
 * 수정 중인 내용은 Content별 sessionStorage Draft로 보존한다. (Back / Preview ↔ 편집 / 다른 메뉴 이동)
 * 공개된 Plan · Routine · Story 수정 후 재검토 여부는 Spec에 없어 상태를 바꾸지 않는다.
 */
function ContentEditor({ content }: { content: MentorContentDetail }) {
  const navigate = useNavigate()
  const toast = useToast()
  const draftKey = `edit:${content.contentId}`
  const draft = useSessionDraft<ContentFormValue>(draftKey, () => formFromContent(content))
  const form = draft.value
  const { state: profile } = useResource('profile', () => mentorApi.getProfile())

  const [view, setView] = useState<'edit' | 'preview'>('edit')
  const [showRestored, setShowRestored] = useState(draft.restored)
  const [errorTick, setErrorTick] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<unknown>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const errorRef = useRef<HTMLDivElement>(null)
  const inFlight = useRef(false)

  const blockedReason = editBlockedReason(content)
  const statusView = contentStatusView(content)
  const validation = validateForm(form)
  const errors = errorTick > 0 ? [...(validation.title ? [validation.title] : []), ...validation.body] : []
  const typed = { type: content.type, body: bodyOf(form, content.type) } as TypedBody

  useEffect(() => {
    if (errorTick > 0) errorRef.current?.focus()
  }, [errorTick])

  const leave = () => navigate(contentPath(content.contentId), { replace: true })

  const save = async () => {
    if (inFlight.current || blockedReason) return
    if (hasErrors(validation)) {
      setView('edit')
      setErrorTick((tick) => tick + 1)
      return
    }
    inFlight.current = true
    setSaving(true)
    setSaveError(null)
    try {
      const saved = await mentorApi.updateContent(content.contentId, toUpdateRequest(form))
      draft.discard()
      primeResource(`content:detail:${saved.contentId}`, saved)
      invalidateResources('content:list')
      toast('수정 내용을 저장했어요.')
      leave()
    } catch (error) {
      // 입력한 내용은 그대로 두고 다시 저장할 수 있게 한다.
      setSaveError(error)
    } finally {
      inFlight.current = false
      setSaving(false)
    }
  }

  return (
    <>
      <button type="button" className={ui.backLink} onClick={() => navigate(contentPath(content.contentId))}>
        ‹ 콘텐츠로 돌아가기
      </button>
      <header className={ui.pageHeader}>
        <div>
          <div className={ui.actions}>
            <Badge>{contentTypeLabel(content.type)}</Badge>
            <Badge tone={statusView.tone}>{statusView.label}</Badge>
          </div>
          <div className={styles.title}>
            <PageTitle>콘텐츠 수정</PageTitle>
          </div>
        </div>
        <div className={styles.viewToggle} role="group" aria-label="보기">
          <button type="button" className={styles.toggle} aria-pressed={view === 'edit'} onClick={() => setView('edit')}>
            편집
          </button>
          <button type="button" className={styles.toggle} aria-pressed={view === 'preview'} onClick={() => setView('preview')}>
            미리보기
          </button>
        </div>
      </header>

      <div className={styles.body}>
        {blockedReason && <p className={`${ui.alert} ${ui.alertWarning}`}>{blockedReason}</p>}
        {showRestored && !blockedReason && (
          <div className={`${ui.alert} ${ui.alertInfo}`}>
            <span>저장하지 않은 수정 내용을 불러왔어요.</span>
            <button
              type="button"
              className={`${ui.button} ${ui.ghost} ${ui.small}`}
              onClick={() => {
                draft.discard()
                setShowRestored(false)
              }}
            >
              저장된 내용으로 되돌리기
            </button>
          </div>
        )}
        <FormErrorSummary ref={errorRef} errors={errors} />

        {view === 'edit' ? (
          <fieldset disabled={Boolean(blockedReason)} className={ui.form}>
            <legend className="visually-hidden">{contentTypeLabel(content.type)} 내용</legend>
            <TextField
              label="제목"
              value={form.title}
              maxLength={80}
              onChange={(event) => draft.update((value) => ({ ...value, title: event.target.value }))}
              error={errorTick > 0 ? validation.title : undefined}
            />
            <TagInput
              tags={form.tags}
              onChange={(tags) => draft.update((value) => ({ ...value, tags }))}
              suggestions={profile.status === 'success' ? profile.data.tags : []}
            />
            <ContentBodyEditor
              content={typed}
              onChange={(body) => draft.update((value) => ({ ...value, bodies: { ...value.bodies, [content.type]: body } }))}
            />
          </fieldset>
        ) : (
          <ContentPreview content={{ ...typed, title: form.title, tags: form.tags }} />
        )}

        {saveError !== null && (
          <div className={`${ui.alert} ${ui.alertError}`} role="alert">
            <span>{errorMessage(saveError, '저장하지 못했어요.')} 수정한 내용은 그대로 있어요.</span>
          </div>
        )}

        <div className={ui.actionBar}>
          <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={() => setConfirmCancel(true)}>
            수정 취소
          </button>
          <button
            type="button"
            className={`${ui.button} ${ui.primary}`}
            onClick={save}
            disabled={saving || Boolean(blockedReason)}
            aria-busy={saving}
          >
            {saving ? '저장 중…' : saveError !== null ? '다시 저장' : '저장'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="수정을 취소할까요?"
        confirmLabel="수정 취소"
        cancelLabel="계속 수정"
        tone="danger"
        onConfirm={() => {
          setConfirmCancel(false)
          draft.discard()
          leave()
        }}
        onCancel={() => setConfirmCancel(false)}
      >
        저장하지 않은 수정 내용이 지워지고 저장된 내용으로 돌아가요.
      </ConfirmDialog>
    </>
  )
}
