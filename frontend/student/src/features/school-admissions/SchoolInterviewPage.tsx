import { InterviewIneligibleNotice, InterviewRelatedSummary } from './components/InterviewParts.tsx'
import { SchoolLayout } from './components/SchoolLayout.tsx'
import type { SchoolInterviewListLoader } from './fixtures/schoolInterview.fixture.ts'
import { hasInterviewAnswer, practiceStatusLabel } from './model/interview.ts'
import { useSchoolInterviewList } from './model/useSchoolInterview.ts'
import styles from './SchoolInterviewPage.module.css'

interface SchoolInterviewPageProps {
  eligible: boolean
  loadList: SchoolInterviewListLoader
  /** 같은 시나리오 / 학년의 목록 Cache key (Back 시 바로 그려 Scroll 복원) */
  cacheKey: string
  onOpen: (questionId: string) => void
  onGoTasks: () => void
  /** 진입점(Archive "면접 준비")으로 돌아간다. */
  onBack: () => void
}

// Interview Bridge 목록 (전용 Mockup 없음): School 1차 Navigation 없이 Archive "면접 준비"에서 들어온다. 고3에게 Admin이 공개한 질문만. 질문 · 관련 활동 · 연습 상태 · 답변 여부.
// 질문 추가 / 편집 / 공개 / Connection 확정은 Admin 일이라 여기에는 버튼이 없다.
export function SchoolInterviewPage({ eligible, loadList, cacheKey, onOpen, onGoTasks, onBack }: SchoolInterviewPageProps) {
  return (
    <SchoolLayout level="detail">
      <div className={styles.page}>
        <button type="button" className={styles.back} onClick={onBack}>
          <span aria-hidden="true">‹</span> Archive<span className="lh-visually-hidden">로 돌아가기</span>
        </button>
        {eligible ? <InterviewList loadList={loadList} cacheKey={cacheKey} onOpen={onOpen} /> : <InterviewIneligibleNotice onGoTasks={onGoTasks} />}
      </div>
    </SchoolLayout>
  )
}

function InterviewList({ loadList, cacheKey, onOpen }: Pick<SchoolInterviewPageProps, 'loadList' | 'cacheKey' | 'onOpen'>) {
  const { state, reload } = useSchoolInterviewList(loadList, cacheKey)
  return (
    <section className={styles.page} aria-labelledby="school-interview-heading" aria-busy={state.status === 'loading'}>
      <div>
        <h1 id="school-interview-heading" className={styles.title}>
          면접 질문
        </h1>
        <p className={styles.lead}>선생님이 내 Archive 활동을 바탕으로 공개한 질문이에요. 답변은 직접 쓰고, 연습 상태를 표시해요.</p>
      </div>

      {state.status === 'loading' && (
        <>
          <p className="lh-visually-hidden" role="status">
            면접 질문을 불러오는 중이에요.
          </p>
          <div className={styles.skeleton} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </>
      )}
      {state.status === 'error' && (
        <div className={styles.notice} role="alert">
          <h2 className={styles.noticeTitle}>면접 질문을 불러오지 못했어요.</h2>
          <p>잠시 후 다시 시도해 주세요.</p>
          <button type="button" className={styles.noticeButton} onClick={reload}>
            다시 시도
          </button>
        </div>
      )}
      {state.status === 'success' && state.data.length === 0 && (
        <div className={styles.notice}>
          <h2 className={styles.noticeTitle}>아직 공개된 면접 질문이 없어요.</h2>
          <p>선생님이 질문을 공개하면 여기에서 답변을 연습할 수 있어요.</p>
        </div>
      )}
      {state.status === 'success' && state.data.length > 0 && (
        <>
          <dl className={styles.summary}>
            <div className={styles.summaryItem}>
              <dt>공개 질문</dt>
              <dd>{state.data.length}</dd>
            </div>
            <div className={styles.summaryItem}>
              <dt>연습 중</dt>
              <dd>{state.data.filter(({ question }) => question.practiceStatus === 'PRACTICING').length}</dd>
            </div>
            <div className={styles.summaryItem}>
              <dt>답변 작성</dt>
              <dd>{state.data.filter(({ question }) => hasInterviewAnswer(question)).length}</dd>
            </div>
          </dl>
          <ul className={styles.list} aria-label="면접 질문 목록">
            {state.data.map(({ question, related }, index) => (
              <li key={question.questionId}>
                <article className={styles.card}>
                  <p className={styles.cardIndex}>질문 {index + 1}</p>
                  <h2 className={styles.cardTitle}>
                    <button type="button" className={styles.open} onClick={() => onOpen(question.questionId)}>
                      {question.question}
                    </button>
                  </h2>
                  <InterviewRelatedSummary related={related} />
                  <p className={styles.state}>
                    <span className={styles.stateTag}>{practiceStatusLabel[question.practiceStatus]}</span>
                    <span className={styles.stateTag}>{hasInterviewAnswer(question) ? '답변 작성함' : '답변 아직 없음'}</span>
                  </p>
                </article>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
