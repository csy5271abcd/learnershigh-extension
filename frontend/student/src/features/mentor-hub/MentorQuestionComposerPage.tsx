import { useRef, useState } from 'react'
import { MentorAvatar } from './components/MentorAvatar.tsx'
import skeletonStyles from './components/MentorHubHomeSkeleton.module.css'
import homeStyles from './MentorHubHomePage.module.css'
import profileStyles from './MentorProfilePage.module.css'
import styles from './MentorQuestionPages.module.css'
import { mentorAffiliation } from './model/format.ts'
import { questionCategories } from './model/questions.ts'
import type {
  MentorQuestionSubmitRequest,
  MentorQuestionSubmitResult,
  QuestionCategory,
  QuestionComposerContext,
} from './model/types.ts'
import { useContentDetail } from './model/useContentDetail.ts'

interface MentorQuestionComposerPageProps {
  /** 받는 Mentor. 없으면 Mentor를 먼저 고르도록 안내한다. (Mockup에 Mentor 선택 UI가 없다) */
  mentorId?: string
  /** Story에서 왔다면 관련 Story (화면 표시용 Context, Submit Request에는 넣지 않는다) */
  sourceContentId?: string
  /** Data Source Boundary. 받는 Mentor / 관련 Story를 확인한다. */
  loadContext: (key: string) => Promise<QuestionComposerContext | null>
  /** Data Source Boundary. 현재는 Fixture Service, API 연결 시 POST /api/student/mentor-questions. */
  submit: (request: MentorQuestionSubmitRequest) => Promise<MentorQuestionSubmitResult>
  onSubmitted: (result: MentorQuestionSubmitResult) => void
  onBack: () => void
  onFindMentor: () => void
}

// 질문 작성 (Mockup 없음: Feature Spec Flow "질문 작성 → Category 선택 → Submit → pending")
export function MentorQuestionComposerPage({
  mentorId,
  sourceContentId,
  loadContext,
  submit,
  onSubmitted,
  onBack,
  onFindMentor,
}: MentorQuestionComposerPageProps) {
  // Context Key = mentorId + sourceContentId (useContentDetail 캐시 Key)
  const contextKey = `${mentorId ?? ''}|${sourceContentId ?? ''}`
  const { state, reload } = useContentDetail(contextKey, loadContext)

  return (
    <main className={`${homeStyles.page} ${profileStyles.page}`} aria-busy={state.status === 'loading'}>
      <button type="button" className={profileStyles.back} onClick={onBack}>
        <span aria-hidden="true">‹</span> 돌아가기
      </button>

      {!mentorId ? (
        <div className={homeStyles.errorNotice}>
          <h1 className={homeStyles.errorTitle}>질문할 Mentor를 먼저 골라주세요.</h1>
          <p className={homeStyles.errorDescription}>Mentor Profile의 질문하기에서 그 Mentor에게 바로 질문할 수 있어요.</p>
          <button type="button" className={homeStyles.retryButton} onClick={onFindMentor}>
            Mentor 찾기
          </button>
        </div>
      ) : state.status === 'loading' ? (
        <>
          <p className="lh-visually-hidden" role="status">
            질문 작성 화면을 준비하는 중이에요.
          </p>
          <span className={`${skeletonStyles.block} ${styles.skeletonAnswer}`} aria-hidden="true" />
        </>
      ) : state.status === 'error' ? (
        <div className={homeStyles.errorNotice} role="alert">
          <h1 className={homeStyles.errorTitle}>질문 작성 화면을 열지 못했어요.</h1>
          <button type="button" className={homeStyles.retryButton} onClick={reload}>
            다시 시도
          </button>
        </div>
      ) : state.status === 'notFound' ? (
        <div className={homeStyles.errorNotice}>
          <h1 className={homeStyles.errorTitle}>Mentor를 찾을 수 없어요.</h1>
          <p className={homeStyles.errorDescription}>질문할 Mentor를 다시 골라주세요.</p>
          <button type="button" className={homeStyles.retryButton} onClick={onFindMentor}>
            Mentor 찾기
          </button>
        </div>
      ) : (
        <ComposerForm context={state.data} submit={submit} onSubmitted={onSubmitted} />
      )}
    </main>
  )
}

interface ComposerFormProps {
  context: QuestionComposerContext
  submit: (request: MentorQuestionSubmitRequest) => Promise<MentorQuestionSubmitResult>
  onSubmitted: (result: MentorQuestionSubmitResult) => void
}

function ComposerForm({ context, submit, onSubmitted }: ComposerFormProps) {
  const { mentor, relatedStory } = context
  const [category, setCategory] = useState<QuestionCategory>()
  const [question, setQuestion] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [showErrors, setShowErrors] = useState(false)
  // 같은 순간의 중복 제출도 막는다.
  const submittingRef = useRef(false)

  const categoryMissing = !category
  const questionMissing = question.trim() === ''

  const handleSubmit = () => {
    if (categoryMissing || questionMissing) {
      setShowErrors(true)
      return
    }
    if (submittingRef.current) return
    submittingRef.current = true
    setStatus('submitting')
    submit({ mentorId: mentor.mentorId, category, question: question.trim() })
      .then(onSubmitted, () => setStatus('error'))
      .finally(() => {
        submittingRef.current = false
      })
  }

  return (
    <section className={styles.composer} aria-labelledby="question-composer-title">
      <h1 id="question-composer-title" className={styles.detailTitle}>
        질문하기
      </h1>

      <div className={styles.recipient}>
        <MentorAvatar name={mentor.name} imageUrl={mentor.profileImageUrl} size="md" />
        <p>
          <span className={styles.fieldLabel}>받는 Mentor</span>
          <span className={styles.recipientName}>
            {mentor.name} · {mentorAffiliation(mentor)} · {mentor.admissionType}
          </span>
        </p>
      </div>

      {relatedStory && (
        <p className={styles.storyContext}>
          <span className={styles.storyContextLabel}>이 Story와 관련해 질문해요</span>
          {relatedStory.title}
        </p>
      )}

      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          handleSubmit()
        }}
      >
        <fieldset className={styles.fieldset} aria-describedby={showErrors && categoryMissing ? 'question-category-error' : undefined}>
          <legend className={styles.fieldLabel}>Category</legend>
          <div className={styles.categoryOptions}>
            {questionCategories.map((item) => (
              <label key={item.id} className={styles.categoryOption}>
                <input
                  type="radio"
                  name="question-category"
                  value={item.id}
                  checked={category === item.id}
                  onChange={() => setCategory(item.id)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
          {showErrors && categoryMissing && (
            <p id="question-category-error" className={styles.formError}>
              Category를 골라주세요.
            </p>
          )}
        </fieldset>

        <div className={styles.field}>
          <label htmlFor="question-text" className={styles.fieldLabel}>
            질문
          </label>
          <textarea
            id="question-text"
            className={styles.textarea}
            rows={6}
            value={question}
            aria-invalid={showErrors && questionMissing}
            aria-describedby={`question-privacy${showErrors && questionMissing ? ' question-text-error' : ''}`}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <p id="question-privacy" className={styles.privacyNote}>
            Mentor에게는 학년과 관심 분야만 보여요. 이름과 학교는 보이지 않아요.
          </p>
          {showErrors && questionMissing && (
            <p id="question-text-error" className={styles.formError}>
              질문을 입력해 주세요.
            </p>
          )}
        </div>

        {status === 'error' && (
          <p className={styles.submitError} role="alert">
            질문을 보내지 못했어요. 쓴 내용은 그대로 있어요. 다시 시도해 주세요.
          </p>
        )}

        <button type="submit" className={styles.submitButton} disabled={status === 'submitting'}>
          {status === 'submitting' ? '보내는 중…' : status === 'error' ? '다시 보내기' : '질문 보내기'}
        </button>
      </form>
    </section>
  )
}
