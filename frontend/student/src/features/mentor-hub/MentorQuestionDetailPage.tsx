import { useState } from 'react'
import { MentorAvatar } from './components/MentorAvatar.tsx'
import skeletonStyles from './components/MentorHubHomeSkeleton.module.css'
import { QuestionCategoryBadge, QuestionStatusBadge } from './components/QuestionParts.tsx'
import { RelatedContentList } from './components/RelatedContentList.tsx'
import homeStyles from './MentorHubHomePage.module.css'
import profileStyles from './MentorProfilePage.module.css'
import styles from './MentorQuestionPages.module.css'
import { mentorAffiliation } from './model/format.ts'
import { formatRelativeTime, studentContextText } from './model/questions.ts'
import type { MentorContentSummary, MentorQuestion, MentorSummary } from './model/types.ts'
import { useContentDetail } from './model/useContentDetail.ts'
import { useQuestionHelpful } from './model/useQuestionHelpful.ts'

interface MentorQuestionDetailPageProps {
  questionId: string
  /** Data Source Boundary. 현재는 Fixture Loader, API 연결 시 GET /api/student/mentor-questions/{questionId}. */
  loadQuestion: (questionId: string) => Promise<MentorQuestion | null>
  requestHelpful: (questionId: string, helpful: boolean) => Promise<unknown>
  /** 재배정 요청 Action. 다음 Mentor는 Student가 고르지 않는다. 상태 값은 바꾸지 않는다. (Contract에 Endpoint 없음) */
  requestReassign: (questionId: string) => Promise<unknown>
  onBack: () => void
  onGoToQuestionList: () => void
  onMentorSelect: (mentorId: string) => void
  /** Detail 화면이 있는 관련 콘텐츠면 이동 함수를 돌려준다. */
  resolveContentLink: (content: MentorContentSummary) => (() => void) | undefined
}

// Q&A Detail (StudentQ&A-01 Mockup) + 답변 대기 / 답변 지연(72시간) / 재배정
export function MentorQuestionDetailPage({
  questionId,
  loadQuestion,
  requestHelpful,
  requestReassign,
  onBack,
  onGoToQuestionList,
  onMentorSelect,
  resolveContentLink,
}: MentorQuestionDetailPageProps) {
  const { state, reload } = useContentDetail(questionId, loadQuestion)

  return (
    <main className={`${homeStyles.page} ${profileStyles.page}`} aria-busy={state.status === 'loading'}>
      <button type="button" className={profileStyles.back} onClick={onBack}>
        <span aria-hidden="true">‹</span> Mentor
        <span className="lh-visually-hidden">로 돌아가기</span>
      </button>

      {state.status === 'loading' && (
        <>
          <p className="lh-visually-hidden" role="status">
            질문을 불러오는 중이에요.
          </p>
          <div className={styles.detailSkeleton} aria-hidden="true">
            <span className={`${skeletonStyles.block} ${styles.skeletonTitle}`} />
            <span className={`${skeletonStyles.block} ${styles.skeletonAnswer}`} />
          </div>
        </>
      )}

      {state.status === 'error' && (
        <div className={homeStyles.errorNotice} role="alert">
          <h1 className={homeStyles.errorTitle}>질문을 불러오지 못했어요.</h1>
          <p className={homeStyles.errorDescription}>잠시 후 다시 시도해 주세요.</p>
          <button type="button" className={homeStyles.retryButton} onClick={reload}>
            다시 시도
          </button>
        </div>
      )}

      {state.status === 'notFound' && (
        <div className={homeStyles.errorNotice}>
          <h1 className={homeStyles.errorTitle}>질문을 찾을 수 없어요.</h1>
          <p className={homeStyles.errorDescription}>주소가 잘못되었거나 공개되지 않은 질문이에요.</p>
          <button type="button" className={homeStyles.retryButton} onClick={onGoToQuestionList}>
            Q&A로 이동
          </button>
        </div>
      )}

      {state.status === 'success' && (
        <article className={styles.detail}>
          <QuestionHeader question={state.data} requestHelpful={requestHelpful} />
          {state.data.answer ? (
            <AnswerCard
              question={state.data}
              onMentorSelect={onMentorSelect}
              resolveContentLink={resolveContentLink}
            />
          ) : (
            <WaitingCard
              key={state.data.mentor.mentorId}
              question={state.data}
              onMentorSelect={onMentorSelect}
              requestReassign={() => requestReassign(state.data.questionId).then(reload)}
            />
          )}
        </article>
      )}
    </main>
  )
}

function QuestionHeader({
  question,
  requestHelpful,
}: {
  question: MentorQuestion
  requestHelpful: (questionId: string, helpful: boolean) => Promise<unknown>
}) {
  const { helpful, helpfulCount, toggle } = useQuestionHelpful(question, requestHelpful)

  return (
    <header className={styles.detailHeader}>
      <p className={styles.badges}>
        <QuestionStatusBadge status={question.status} />
        <QuestionCategoryBadge question={question} />
      </p>
      <h1 className={styles.detailTitle}>{question.question}</h1>
      {question.detail && <p className={styles.detailBody}>{question.detail}</p>}
      <p className={styles.detailMeta}>
        {studentContextText(question)} · {formatRelativeTime(question.submittedAt)} 질문
      </p>
      <div className={styles.helpfulRow}>
        {question.answer && (
          <button type="button" className={styles.helpfulButton} aria-pressed={helpful} onClick={toggle}>
            {helpful ? '도움됐어요' : '도움돼요'} {helpfulCount}
          </button>
        )}
        <p className={styles.privacyNote}>질문한 학생의 이름과 학교는 보이지 않아요.</p>
      </div>
    </header>
  )
}

function MentorLine({ mentor, onMentorSelect, suffix }: { mentor: MentorSummary; onMentorSelect: (id: string) => void; suffix: string }) {
  return (
    <button type="button" className={styles.mentorLine} onClick={() => onMentorSelect(mentor.mentorId)}>
      <MentorAvatar name={mentor.name} imageUrl={mentor.profileImageUrl} size="md" />
      <span className={styles.mentorName}>
        {mentor.name}
        {suffix}
        <span className="lh-visually-hidden">, {mentorAffiliation(mentor)} Profile 보기</span>
      </span>
    </button>
  )
}

function AnswerCard({
  question,
  onMentorSelect,
  resolveContentLink,
}: {
  question: MentorQuestion
  onMentorSelect: (mentorId: string) => void
  resolveContentLink: (content: MentorContentSummary) => (() => void) | undefined
}) {
  const answer = question.answer!
  return (
    <section className={styles.answerCard} aria-label={`${question.mentor.name}님의 답변`}>
      <div className={styles.answerHead}>
        <MentorLine mentor={question.mentor} onMentorSelect={onMentorSelect} suffix="님의 답변" />
        <span className={styles.answerTime}>{formatRelativeTime(answer.answeredAt)}</span>
      </div>
      <p className={styles.answerBody}>{answer.text}</p>
      <RelatedContentList items={question.relatedContent} resolveLink={resolveContentLink} />
    </section>
  )
}

interface WaitingCardProps {
  question: MentorQuestion
  onMentorSelect: (mentorId: string) => void
  requestReassign: () => Promise<unknown>
}

// 답변 대기 / 답변 지연. 답변 지연(72시간)인 내 질문만 재배정 요청 Action을 보여준다.
function WaitingCard({ question, onMentorSelect, requestReassign }: WaitingCardProps) {
  const [reassign, setReassign] = useState<'idle' | 'submitting' | 'error'>('idle')
  const canReassign = question.status === 'overdue' && question.mine

  const submitReassign = () => {
    if (reassign === 'submitting') return
    setReassign('submitting')
    requestReassign().catch(() => setReassign('error'))
  }

  return (
    <section className={styles.waitingCard} data-tone={question.status} aria-labelledby="question-waiting-title">
      <div className={styles.answerHead}>
        <MentorLine mentor={question.mentor} onMentorSelect={onMentorSelect} suffix="님에게 보낸 질문" />
      </div>
      <p id="question-waiting-title" className={styles.waitingTitle}>
        {question.status === 'overdue'
          ? '72시간이 지나도록 답변이 오지 않았어요.'
          : `${question.mentor.name}님의 답변을 기다리고 있어요.`}
      </p>
      {question.reassignedFrom && (
        <p className={styles.reassignedNote} role="status">
          {question.reassignedFrom.name}님에서 {question.mentor.name}님으로 재배정됐어요. 재배정 이후 상태 정책은 아직 정해지지
          않아 지금 상태를 그대로 보여줘요.
        </p>
      )}
      {canReassign && (
        <div className={styles.reassignForm}>
          <p className={styles.privacyNote}>다른 Mentor에게 이 질문을 다시 보낼 수 있어요.</p>
          <button
            type="button"
            className={styles.secondaryAction}
            disabled={reassign === 'submitting'}
            onClick={submitReassign}
          >
            {reassign === 'submitting' ? '요청하는 중…' : '다른 Mentor에게 재배정 요청'}
          </button>
          {reassign === 'error' && (
            <p className={styles.formError} role="alert">
              재배정을 요청하지 못했어요. 다시 시도해 주세요.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
