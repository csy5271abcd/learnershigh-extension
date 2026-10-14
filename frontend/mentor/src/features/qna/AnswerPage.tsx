import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { mentorApi } from '../../api/mentorApi.ts'
import type { MentorQuestion } from '../../api/types.ts'
import { questionListPath, questionPath } from '../../app/paths.ts'
import { TextAreaField } from '../../components/FormFields.tsx'
import { ErrorState, LoadingState, NotFoundState } from '../../components/PageState.tsx'
import { PageTitle } from '../../components/PageTitle.tsx'
import { useToast } from '../../components/toastContext.ts'
import ui from '../../components/ui.module.css'
import { errorMessage } from '../../lib/format.ts'
import { useSessionDraft } from '../../lib/useSessionDraft.ts'
import { invalidateResources, primeResource, useResource } from '../../lib/useResource.ts'
import styles from './AnswerPage.module.css'
import { QuestionCard } from './components/QuestionCard.tsx'
import { RelatedContentPicker } from './components/RelatedContentPicker.tsx'

export function AnswerPage() {
  const { questionId = '' } = useParams()
  const { state, reload } = useResource(`questions:detail:${questionId}`, () => mentorApi.getQuestion(questionId))

  return (
    <div className={ui.page}>
      <Link to={questionPath(questionId)} className={ui.backLink}>
        ‹ 질문으로 돌아가기
      </Link>
      {state.status === 'loading' && <LoadingState label="질문을 불러오는 중이에요." rows={2} />}
      {state.status === 'error' && <ErrorState title="질문을 불러오지 못했어요." error={state.error} onRetry={reload} />}
      {state.status === 'notFound' && (
        <NotFoundState title="질문을 찾을 수 없어요.">
          <Link to={questionListPath} className={`${ui.button} ${ui.neutral}`}>
            Q&A로 가기
          </Link>
        </NotFoundState>
      )}
      {state.status === 'success' && <AnswerForm key={questionId} question={state.data} />}
    </div>
  )
}

interface AnswerDraft {
  answer: string
  relatedContentIds: string[]
}

/** 답변 작성. 쓰는 중인 답변 / 연결은 질문별 sessionStorage Draft로 보존하고, 실패하면 그대로 두고 다시 보낼 수 있다. */
function AnswerForm({ question }: { question: MentorQuestion }) {
  const navigate = useNavigate()
  const toast = useToast()
  const draft = useSessionDraft<AnswerDraft>(`answer:${question.questionId}`, () => ({ answer: '', relatedContentIds: [] }))
  const contents = useResource('content:list:all:PUBLISHED', () => mentorApi.listContent({ status: 'PUBLISHED', size: 100 }))
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<unknown>(null)
  const [answerError, setAnswerError] = useState<string>()
  const inFlight = useRef(false)

  if (question.status === 'answered') {
    return (
      <>
        <QuestionCard question={question} heading={<PageTitle>{question.question}</PageTitle>} />
        <p className={`${ui.alert} ${ui.alertInfo} ${styles.answered}`}>
          이미 답변한 질문이에요.
          <Link to={questionPath(question.questionId)} className={`${ui.button} ${ui.neutral} ${ui.small}`}>
            답변 보기
          </Link>
        </p>
      </>
    )
  }

  const submit = async () => {
    // 중복 클릭으로 답변이 두 번 가지 않게 한다. (Fixture / Server는 이미 답변한 질문을 409로 거절한다)
    if (inFlight.current) return
    if (!draft.value.answer.trim()) {
      setAnswerError('답변을 입력해 주세요.')
      return
    }
    inFlight.current = true
    setSubmitting(true)
    setSubmitError(null)
    setAnswerError(undefined)
    try {
      const answered = await mentorApi.answerQuestion(question.questionId, {
        answer: draft.value.answer,
        relatedContentIds: draft.value.relatedContentIds,
      })
      draft.discard()
      invalidateResources('questions:list')
      primeResource(`questions:detail:${answered.questionId}`, answered)
      toast('답변을 보냈어요. Student Q&A에 바로 보여요.')
      navigate(questionPath(answered.questionId), { replace: true })
    } catch (error) {
      setSubmitError(error)
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  return (
    <div className={ui.split}>
      <form
        className={ui.form}
        aria-labelledby="answer-page-title"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <div id="answer-page-title">
          <PageTitle>답변 작성</PageTitle>
        </div>
        <TextAreaField
          label="답변"
          rows={10}
          value={draft.value.answer}
          onChange={(event) => {
            setAnswerError(undefined)
            draft.update((value) => ({ ...value, answer: event.target.value }))
          }}
          error={answerError}
          disabled={submitting}
          help="내 경험을 바탕으로 적어 주세요. 학생을 특정할 수 있는 내용은 적지 않아요."
        />
        <RelatedContentPicker
          contents={contents.state}
          onRetry={contents.reload}
          selectedIds={draft.value.relatedContentIds}
          onChange={(relatedContentIds) => draft.update((value) => ({ ...value, relatedContentIds }))}
          disabled={submitting}
        />
        {submitError !== null && (
          <div className={`${ui.alert} ${ui.alertError}`} role="alert">
            <span>{errorMessage(submitError, '답변을 보내지 못했어요.')} 쓴 답변은 그대로 있어요.</span>
          </div>
        )}
        <div className={ui.actionBar}>
          <span className={ui.actionBarHint}>쓰는 중인 답변은 자동으로 보관돼요.</span>
          <button type="submit" className={`${ui.button} ${ui.primary}`} disabled={submitting} aria-busy={submitting}>
            {submitting ? '보내는 중…' : submitError !== null ? '다시 보내기' : '답변 보내기'}
          </button>
        </div>
      </form>

      <aside className={`${ui.aside} ${styles.questionAside}`} aria-label="받은 질문">
        <div className={ui.panel}>
          <QuestionCard question={question} heading={<h2 className={ui.sectionTitle}>{question.question}</h2>} />
        </div>
      </aside>
    </div>
  )
}
