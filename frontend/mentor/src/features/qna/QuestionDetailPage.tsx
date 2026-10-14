import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { mentorApi } from '../../api/mentorApi.ts'
import type { MentorQuestion } from '../../api/types.ts'
import { answerPath, contentPath, questionListPath } from '../../app/paths.ts'
import { Badge } from '../../components/Badge.tsx'
import { ErrorState, LoadingState, NotFoundState } from '../../components/PageState.tsx'
import { PageTitle } from '../../components/PageTitle.tsx'
import ui from '../../components/ui.module.css'
import { formatDate, formatRelativeTime } from '../../lib/format.ts'
import { useResource } from '../../lib/useResource.ts'
import { contentTypeLabel } from '../../model/contentMeta.ts'
import { QuestionCard } from './components/QuestionCard.tsx'
import { anonymousContextText, questionCategoryLabel, questionStatusView } from '../../model/questionMeta.ts'
import styles from './QuestionDetailPage.module.css'

export function QuestionDetailPage() {
  const { questionId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { state, reload } = useResource(`questions:detail:${questionId}`, () => mentorApi.getQuestion(questionId))

  const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate(questionListPath))

  return (
    <div className={ui.page}>
      <button type="button" className={ui.backLink} onClick={goBack}>
        ‹ Q&A
      </button>
      {state.status === 'loading' && <LoadingState label="질문을 불러오는 중이에요." rows={2} />}
      {state.status === 'error' && <ErrorState title="질문을 불러오지 못했어요." error={state.error} onRetry={reload} />}
      {state.status === 'notFound' && (
        <NotFoundState title="질문을 찾을 수 없어요." description="다른 멘토에게 넘어갔거나 없는 질문이에요.">
          <Link to={questionListPath} className={`${ui.button} ${ui.neutral}`}>
            Q&A로 가기
          </Link>
        </NotFoundState>
      )}
      {state.status === 'success' && <QuestionDetail question={state.data} />}
    </div>
  )
}

function QuestionDetail({ question }: { question: MentorQuestion }) {
  const waiting = question.status !== 'answered'

  return (
    <div className={ui.split}>
      <div className={ui.form}>
        <QuestionCard question={question} heading={<PageTitle>{question.question}</PageTitle>} />

        {question.answer ? (
          <section className={styles.answer} aria-labelledby="answer-title">
            <h2 id="answer-title" className={ui.panelTitle}>
              내 답변 <span className={ui.meta}>{formatRelativeTime(question.answer.answeredAt)}</span>
            </h2>
            <p className={styles.answerText}>{question.answer.text}</p>
            {question.relatedContent.length > 0 && (
              <ul className={styles.related} aria-label="연결한 콘텐츠">
                {question.relatedContent.map((content) => (
                  <li key={content.contentId}>
                    <Link to={contentPath(content.contentId)} className={styles.relatedLink}>
                      <Badge>{contentTypeLabel(content.type)}</Badge>
                      <span>{content.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <p className={`${ui.alert} ${question.status === 'overdue' ? ui.alertWarning : ui.alertInfo}`}>
            {question.status === 'overdue'
              ? '답변 기한이 지났어요. 가능한 빨리 답변해 주세요.'
              : '아직 답변하지 않은 질문이에요.'}
          </p>
        )}
      </div>

      <aside className={ui.aside} aria-label="질문 정보">
        <section className={ui.panel} aria-labelledby="question-info-title">
          <h2 id="question-info-title" className={ui.panelTitle}>
            질문 정보
          </h2>
          <dl className={ui.facts}>
            <dt>상태</dt>
            <dd>{questionStatusView(question.status).label}</dd>
            <dt>분류</dt>
            <dd>{questionCategoryLabel(question.category)}</dd>
            <dt>질문자</dt>
            <dd>{anonymousContextText(question.anonymousStudentContext)}</dd>
            <dt>받은 날</dt>
            <dd>{formatDate(question.submittedAt)}</dd>
          </dl>
          <p className={`${ui.help} ${styles.privacy}`}>질문한 학생의 이름 · 학교 · 학원은 멘토에게 보이지 않아요.</p>
        </section>
        {waiting && (
          <Link to={answerPath(question.questionId)} className={`${ui.button} ${ui.primary}`}>
            답변 작성하기
          </Link>
        )}
      </aside>
    </div>
  )
}
