import { useEffect, useRef, useState } from 'react'
import { useBlocker } from 'react-router'
import { InterviewIneligibleNotice, InterviewRelatedCard } from './components/InterviewParts.tsx'
import { SchoolLayout } from './components/SchoolLayout.tsx'
import { TaskLeaveDialog } from './components/TaskLeaveDialog.tsx'
import type { SchoolInterviewDetailLoader, SchoolInterviewService } from './fixtures/schoolInterview.fixture.ts'
import { restoreFocus } from './model/focus.ts'
import { practiceStatusLabel, type InterviewPracticeStatus, type InterviewQuestionDetail } from './model/interview.ts'
import { useSchoolInterviewDetail } from './model/useSchoolInterview.ts'
import styles from './SchoolInterviewPage.module.css'

interface SchoolInterviewQuestionPageProps {
  questionId: string
  eligible: boolean
  loadDetail: SchoolInterviewDetailLoader
  service: SchoolInterviewService
  onChanged: () => void
  onBack: () => void
  onOpenActivity: (activityId: string) => void
  onGoTasks: () => void
}

// Interview Question Detail: 질문 · 관련 활동(원본 활동 기록으로 이동) · 연습 상태 · 내 답변.
// 답변은 학생이 직접 쓰고 "답변 저장"을 눌러야 저장된다. (자동 저장 / 자동 답변 없음) 답변과 연습 상태는 서로 바꾸지 않는다.
export function SchoolInterviewQuestionPage({
  questionId,
  eligible,
  loadDetail,
  service,
  onChanged,
  onBack,
  onOpenActivity,
  onGoTasks,
}: SchoolInterviewQuestionPageProps) {
  return (
    <SchoolLayout level="detail">
      <div className={styles.page}>
        <button type="button" className={styles.back} onClick={onBack}>
          <span aria-hidden="true">‹</span> 면접 질문<span className="lh-visually-hidden"> 목록으로 돌아가기</span>
        </button>
        {eligible ? (
          <QuestionLoader
            questionId={questionId}
            loadDetail={loadDetail}
            service={service}
            onChanged={onChanged}
            onBack={onBack}
            onOpenActivity={onOpenActivity}
          />
        ) : (
          <InterviewIneligibleNotice onGoTasks={onGoTasks} />
        )}
      </div>
    </SchoolLayout>
  )
}

function QuestionLoader({
  questionId,
  loadDetail,
  service,
  onChanged,
  onBack,
  onOpenActivity,
}: Pick<SchoolInterviewQuestionPageProps, 'questionId' | 'loadDetail' | 'service' | 'onChanged' | 'onBack' | 'onOpenActivity'>) {
  const { state, reload } = useSchoolInterviewDetail(questionId, loadDetail)
  if (state.status === 'loading') {
    return (
      <>
        <p className="lh-visually-hidden" role="status">
          면접 질문을 불러오는 중이에요.
        </p>
        <div className={styles.skeleton} aria-hidden="true">
          <span />
          <span />
        </div>
      </>
    )
  }
  if (state.status === 'error') {
    return (
      <div className={styles.notice} role="alert">
        <h1 className={styles.noticeTitle}>면접 질문을 불러오지 못했어요.</h1>
        <p>잠시 후 다시 시도해 주세요.</p>
        <button type="button" className={styles.noticeButton} onClick={reload}>
          다시 시도
        </button>
      </div>
    )
  }
  if (state.status === 'notFound') {
    return (
      <div className={styles.notice}>
        <h1 className={styles.noticeTitle}>면접 질문을 찾을 수 없어요.</h1>
        <p>주소가 잘못되었거나 아직 공개되지 않은 질문이에요.</p>
        <button type="button" className={styles.noticeButton} onClick={onBack}>
          면접 질문 목록으로
        </button>
      </div>
    )
  }
  return <QuestionDetail key={state.data.question.questionId} data={state.data} service={service} onChanged={onChanged} onOpenActivity={onOpenActivity} />
}

function QuestionDetail({
  data,
  service,
  onChanged,
  onOpenActivity,
}: {
  data: InterviewQuestionDetail
  service: SchoolInterviewService
  onChanged: () => void
  onOpenActivity: (activityId: string) => void
}) {
  const { question, related } = data
  const [draft, setDraft] = useState(question.answer)
  const [savedAnswer, setSavedAnswer] = useState(question.answer)
  const [answerSave, setAnswerSave] = useState({ pending: false, failed: false })
  const [practice, setPractice] = useState<InterviewPracticeStatus>(question.practiceStatus)
  const [practiceSave, setPracticeSave] = useState({ pending: false, failed: false })
  const [announcement, setAnnouncement] = useState('')
  const answerBusyRef = useRef(false)
  const practiceBusyRef = useRef(false)
  const practiceButtonRef = useRef<HTMLButtonElement>(null)

  // 답변 작성 중 다른 화면 / 다른 질문 / Back으로 가면 나가기 확인 (Task Create와 같은 확인 Dialog)
  const dirty = draft !== savedAnswer
  const dirtyRef = useRef(dirty)
  useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirtyRef.current && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (!dirty) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [dirty])

  const saveAnswer = () => {
    if (answerBusyRef.current || !dirty) return
    answerBusyRef.current = true
    const value = draft
    setAnswerSave({ pending: true, failed: false })
    setAnnouncement('')
    service.saveAnswer(question.questionId, value).then(
      () => {
        answerBusyRef.current = false
        setSavedAnswer(value)
        setAnswerSave({ pending: false, failed: false })
        setAnnouncement('답변을 저장했어요.')
        onChanged()
        restoreFocus(null, 'interview-answer')
      },
      () => {
        // 실패: 입력 그대로, 다시 저장할 수 있다.
        answerBusyRef.current = false
        setAnswerSave({ pending: false, failed: true })
      },
    )
  }

  const changePractice = () => {
    if (practiceBusyRef.current) return
    practiceBusyRef.current = true
    const next: InterviewPracticeStatus = practice === 'NOT_STARTED' ? 'PRACTICING' : 'NOT_STARTED'
    setPracticeSave({ pending: true, failed: false })
    setAnnouncement('')
    service.setPracticeStatus(question.questionId, next).then(
      () => {
        practiceBusyRef.current = false
        setPractice(next)
        setPracticeSave({ pending: false, failed: false })
        setAnnouncement(`연습 상태를 "${practiceStatusLabel[next]}"(으)로 바꿨어요.`)
        onChanged()
        restoreFocus(practiceButtonRef.current)
      },
      () => {
        // 실패: 이전 상태 그대로
        practiceBusyRef.current = false
        setPracticeSave({ pending: false, failed: true })
      },
    )
  }

  return (
    <article className={styles.detail} aria-labelledby="interview-question-title">
      <header>
        <p className={styles.eyebrow}>면접 질문</p>
        <h1 id="interview-question-title" className={styles.question} tabIndex={-1}>
          {question.question}
        </h1>
      </header>

      <section className={styles.block} aria-labelledby="interview-related-heading">
        <h2 id="interview-related-heading" className={styles.blockTitle}>
          관련 활동
        </h2>
        <p className={styles.hint}>이 질문의 바탕이 된 내 Archive 활동이에요. 기록을 다시 보고 답변에 활용해요.</p>
        <ul className={styles.relatedList}>
          {related.map((item) => (
            <InterviewRelatedCard key={item.activityId} item={item} onOpen={onOpenActivity} />
          ))}
        </ul>
      </section>

      <section className={styles.block} aria-labelledby="interview-practice-heading">
        <h2 id="interview-practice-heading" className={styles.blockTitle}>
          연습 상태
        </h2>
        <div className={styles.practiceRow}>
          <p id="interview-practice-status">
            현재 상태: <strong>{practiceStatusLabel[practice]}</strong>
          </p>
          <button
            ref={practiceButtonRef}
            type="button"
            className={styles.secondaryAction}
            disabled={practiceSave.pending}
            aria-describedby="interview-practice-status"
            onClick={changePractice}
          >
            {practiceSave.pending ? '변경 중…' : practice === 'NOT_STARTED' ? '연습 시작' : '연습 전으로 되돌리기'}
          </button>
        </div>
        {practiceSave.failed && (
          <p className={styles.error} role="alert">
            연습 상태를 바꾸지 못했어요. 상태는 그대로예요. 다시 시도해주세요.
          </p>
        )}
      </section>

      <section className={styles.block} aria-labelledby="interview-answer-heading">
        <h2 id="interview-answer-heading" className={styles.blockTitle}>
          내 답변
        </h2>
        <form
          className={styles.page}
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            saveAnswer()
          }}
        >
          <label htmlFor="interview-answer" className={styles.label}>
            답변
          </label>
          <p id="interview-answer-hint" className={styles.hint}>
            직접 쓴 내용이 그대로 저장돼요. 자동 저장은 없으니 다 쓴 뒤 저장해주세요.
          </p>
          <textarea
            id="interview-answer"
            className={styles.textarea}
            rows={8}
            value={draft}
            placeholder="이 활동에서 내가 한 행동과 배운 점을 중심으로 적어보세요."
            aria-describedby={answerSave.failed ? 'interview-answer-hint interview-answer-error' : 'interview-answer-hint'}
            onChange={(event) => setDraft(event.target.value)}
          />
          {answerSave.failed && (
            <p id="interview-answer-error" className={styles.error} role="alert">
              답변을 저장하지 못했어요. 입력한 내용은 그대로 있어요. 다시 저장해주세요.
            </p>
          )}
          <div className={styles.answerActions}>
            <button type="submit" className={styles.primaryAction} disabled={answerSave.pending || !dirty}>
              {answerSave.pending ? '저장 중…' : '답변 저장'}
            </button>
          </div>
        </form>
      </section>

      {announcement && (
        <p className="lh-visually-hidden" role="status">
          {announcement}
        </p>
      )}
      {blocker.state === 'blocked' && <TaskLeaveDialog onStay={() => blocker.reset()} onLeave={() => blocker.proceed()} />}
    </article>
  )
}
