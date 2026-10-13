import { MentorHubLayout } from './components/MentorHubLayout.tsx'
import skeletonStyles from './components/MentorHubHomeSkeleton.module.css'
// Category Chip은 Mentor List 전형 / Story 주제와 같은 모양을 쓴다.
import chipStyles from './components/MentorListControls.module.css'
import { QuestionRow } from './components/QuestionParts.tsx'
import { MENTOR_CONTENT_LIST_PAGE_SIZE } from './MentorContentListPage.tsx'
import styles from './MentorHubHomePage.module.css'
import qnaStyles from './MentorQuestionPages.module.css'
import { questionCategories } from './model/questions.ts'
import type { MentorHubTabId } from './model/tabs.ts'
import type { MentorQuestionListResult, QuestionCategory, QuestionView } from './model/types.ts'
import { useMentorContentList } from './model/useMentorContentList.ts'

interface MentorQuestionListPageProps {
  /** Data Source Boundary. 현재는 Fixture Loader, API 연결 시 GET /api/student/mentor-questions. 보기 / Category마다 다른 함수. */
  loadList: (page: number, size: number) => Promise<MentorQuestionListResult>
  /** 보기 / Category는 호출 측(Route, URL)이 소유해 Detail 왕복 / 새로고침 후에도 유지한다. */
  view: QuestionView
  category?: QuestionCategory
  onViewChange: (view: QuestionView) => void
  onCategoryChange: (category: QuestionCategory | undefined) => void
  onTabSelect: (id: MentorHubTabId) => void
  focusTabOnMount?: boolean
  onQuestionSelect: (questionId: string) => void
  onAsk: () => void
  requestHelpful: (questionId: string, helpful: boolean) => Promise<unknown>
}

const views: { id: QuestionView; label: string }[] = [
  { id: 'public', label: '모든 질문' },
  { id: 'mine', label: '내 질문' },
]

// Mentor Hub Main "Q&A" Tab (StudentQ&A-00 Mockup)
export function MentorQuestionListPage({
  loadList,
  view,
  category,
  onViewChange,
  onCategoryChange,
  onTabSelect,
  focusTabOnMount,
  onQuestionSelect,
  onAsk,
  requestHelpful,
}: MentorQuestionListPageProps) {
  const { state, reload } = useMentorContentList(loadList, 0, MENTOR_CONTENT_LIST_PAGE_SIZE)
  const countLabel = view === 'mine' ? '내 질문' : '답변된 질문'

  const emptyText =
    category !== undefined
      ? '이 Category의 질문이 아직 없어요.'
      : view === 'mine'
        ? '아직 작성한 질문이 없어요.'
        : '아직 공개된 Q&A가 없어요.'

  return (
    <MentorHubLayout
      selectedTab="qna"
      onTabSelect={onTabSelect}
      focusTabOnMount={focusTabOnMount}
      busy={state.status === 'loading'}
    >
      <section className={qnaStyles.listSection} aria-labelledby="mentor-qna-heading">
        <div className={qnaStyles.listHeader}>
          <div>
            <h2 id="mentor-qna-heading" className={styles.sectionTitle}>
              Q&A
            </h2>
            <p className={qnaStyles.lead}>
              성적, 공부법, 내신과 수능 선택처럼 입시 고민에 Mentor가 답한 질문을 볼 수 있어요. 질문한 학생은 학년과 관심 분야만
              보여요.
            </p>
          </div>
          <button type="button" className={qnaStyles.askButton} onClick={onAsk}>
            질문하기
          </button>
        </div>

        <div className={qnaStyles.controls}>
          <div role="group" aria-label="질문 보기" className={qnaStyles.segmented}>
            {views.map((item) => (
              <button
                key={item.id}
                type="button"
                className={qnaStyles.segment}
                aria-pressed={view === item.id}
                onClick={() => onViewChange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div role="group" aria-label="Category" className={`${chipStyles.chips} ${qnaStyles.chips}`}>
            <button
              type="button"
              className={chipStyles.chip}
              aria-pressed={!category}
              onClick={() => onCategoryChange(undefined)}
            >
              전체
            </button>
            {questionCategories.map((item) => (
              <button
                key={item.id}
                type="button"
                className={chipStyles.chip}
                aria-pressed={category === item.id}
                onClick={() => onCategoryChange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className={qnaStyles.count} aria-live="polite">
            {state.status === 'success' ? `${countLabel} ${state.data.page.totalElements}개` : ''}
          </p>
        </div>

        {state.status === 'loading' && (
          <>
            <p className="lh-visually-hidden" role="status">
              Q&A를 불러오는 중이에요.
            </p>
            <div className={qnaStyles.skeletonList} aria-hidden="true">
              {[0, 1, 2].map((key) => (
                <span key={key} className={`${skeletonStyles.block} ${qnaStyles.rowSkeleton}`} />
              ))}
            </div>
          </>
        )}

        {state.status === 'error' && (
          <div className={styles.errorNotice} role="alert">
            <p className={styles.errorTitle}>Q&A를 불러오지 못했어요.</p>
            <p className={styles.errorDescription}>잠시 후 다시 시도해 주세요.</p>
            <button type="button" className={styles.retryButton} onClick={reload}>
              다시 시도
            </button>
          </div>
        )}

        {state.status === 'success' &&
          (state.data.items.length > 0 ? (
            <ul className={qnaStyles.rows}>
              {state.data.items.map((question) => (
                <li key={question.questionId}>
                  <QuestionRow
                    question={question}
                    showStatus={view === 'mine'}
                    onSelect={onQuestionSelect}
                    requestHelpful={requestHelpful}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyNotice} role="status">
              {emptyText}
            </p>
          ))}
      </section>
    </MentorHubLayout>
  )
}
