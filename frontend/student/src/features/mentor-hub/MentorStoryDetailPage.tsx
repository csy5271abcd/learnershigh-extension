import { useState } from 'react'
import { MentorAvatar } from './components/MentorAvatar.tsx'
import skeletonStyles from './components/MentorHubHomeSkeleton.module.css'
import { formatMonthDay, mentorAffiliation } from './model/format.ts'
import { formatSaveCount, storyTopicLabel } from './model/storyTopics.ts'
import type { MentorStory, RelatedQuestionContext, StoryBlock } from './model/types.ts'
import { useContentDetail } from './model/useContentDetail.ts'
import { useSavedContent } from './model/useSavedContent.ts'
import homeStyles from './MentorHubHomePage.module.css'
// Badge / 제목 / Mentor 표시는 Plan Detail과 같은 모양을 쓴다.
import detailStyles from './MentorPlanDetailPage.module.css'
import profileStyles from './MentorProfilePage.module.css'
import styles from './MentorStoryDetailPage.module.css'

interface MentorStoryDetailPageProps {
  contentId: string
  /** Data Source Boundary. 현재는 Fixture Loader, API 연결 시 GET /api/student/mentor-content/{contentId}. */
  loadStory: (contentId: string) => Promise<MentorStory | null>
  /** 저장 / 저장 취소 (현재는 Fixture, API 연결 시 PUT .../{contentId}/saved) */
  requestSave: (contentId: string, saved: boolean) => Promise<unknown>
  onBack: () => void
  onGoToStoryFeed: () => void
  onMentorSelect: (mentorId: string) => void
  /** 관련 질문 Boundary. Student Q&A 화면이 연결되면 이 Context로 질문 작성 화면을 연다. */
  onAskRelatedQuestion?: (context: RelatedQuestionContext) => void
}

// Story Detail (Story-01 / 02 Mockup): 제목 · Mentor · 읽기 정보 · 저장 / 관련 질문 / Mentor Profile → 본문
export function MentorStoryDetailPage({
  contentId,
  loadStory,
  requestSave,
  onBack,
  onGoToStoryFeed,
  onMentorSelect,
  onAskRelatedQuestion,
}: MentorStoryDetailPageProps) {
  const { state, reload } = useContentDetail(contentId, loadStory)

  return (
    <main className={`${homeStyles.page} ${profileStyles.page}`} aria-busy={state.status === 'loading'}>
      <button type="button" className={profileStyles.back} onClick={onBack}>
        <span aria-hidden="true">‹</span> Mentor
        <span className="lh-visually-hidden">로 돌아가기</span>
      </button>

      {state.status === 'loading' && (
        <>
          <p className="lh-visually-hidden" role="status">
            Story를 불러오는 중이에요.
          </p>
          <StoryDetailSkeleton />
        </>
      )}

      {state.status === 'error' && (
        <div className={homeStyles.errorNotice} role="alert">
          <h1 className={homeStyles.errorTitle}>Story를 불러오지 못했어요.</h1>
          <p className={homeStyles.errorDescription}>잠시 후 다시 시도해 주세요.</p>
          <button type="button" className={homeStyles.retryButton} onClick={reload}>
            다시 시도
          </button>
        </div>
      )}

      {state.status === 'notFound' && (
        <div className={homeStyles.errorNotice}>
          <h1 className={homeStyles.errorTitle}>Story를 찾을 수 없어요.</h1>
          <p className={homeStyles.errorDescription}>주소가 잘못되었거나 공개되지 않은 Story예요.</p>
          <button type="button" className={homeStyles.retryButton} onClick={onGoToStoryFeed}>
            Story 목록으로 이동
          </button>
        </div>
      )}

      {state.status === 'success' && (
        <article className={styles.article}>
          <StoryHeader
            story={state.data}
            requestSave={requestSave}
            onMentorSelect={onMentorSelect}
            onAskRelatedQuestion={onAskRelatedQuestion}
          />
          <div className={styles.body}>
            {state.data.body.map((block, index) => (
              <StoryBlockView key={index} block={block} />
            ))}
          </div>
        </article>
      )}
    </main>
  )
}

interface StoryHeaderProps {
  story: MentorStory
  requestSave: (contentId: string, saved: boolean) => Promise<unknown>
  onMentorSelect: (mentorId: string) => void
  onAskRelatedQuestion?: (context: RelatedQuestionContext) => void
}

function StoryHeader({ story, requestSave, onMentorSelect, onAskRelatedQuestion }: StoryHeaderProps) {
  const { mentor } = story
  const { saved, saveCount, toggle } = useSavedContent(story.contentId, story, requestSave)
  const [askNotice, setAskNotice] = useState(false)

  const askRelatedQuestion = () => {
    const context: RelatedQuestionContext = {
      mentorId: mentor.mentorId,
      sourceContentId: story.contentId,
      sourceTitle: story.title,
      contextType: 'story',
    }
    if (onAskRelatedQuestion) onAskRelatedQuestion(context)
    else setAskNotice(true)
  }

  return (
    <header className={styles.header}>
      <p className={detailStyles.badge}>
        Story · {story.topics.map(storyTopicLabel).join(' · ')}
      </p>
      <h1 className={`${detailStyles.title} ${styles.title}`}>{story.title}</h1>
      <button type="button" className={detailStyles.mentor} onClick={() => onMentorSelect(mentor.mentorId)}>
        <MentorAvatar name={mentor.name} imageUrl={mentor.profileImageUrl} size="md" />
        <span className={detailStyles.mentorText}>
          {mentor.name} · {mentorAffiliation(mentor)} · {mentor.admissionType}
          <span className="lh-visually-hidden"> Profile 보기</span>
        </span>
      </button>

      <div className={styles.metaRow}>
        <p className={styles.meta}>
          {story.readMinutes}분 읽기 · {formatMonthDay(story.publishedDate)} · 저장 {formatSaveCount(saveCount)}
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.saveButton} aria-pressed={saved} onClick={toggle}>
            {saved ? '저장됨' : '저장'}
          </button>
          <button type="button" className={styles.actionButton} onClick={askRelatedQuestion}>
            관련 질문
          </button>
          <button type="button" className={styles.actionButton} onClick={() => onMentorSelect(mentor.mentorId)}>
            Mentor Profile
          </button>
        </div>
      </div>
      <p className={styles.askNotice} role="status">
        {askNotice ? '관련 질문은 Q&A 화면이 연결되면 이 Story를 출처로 남길 수 있어요. 아직 연결되지 않았어요.' : ''}
      </p>
    </header>
  )
}

function StoryBlockView({ block }: { block: StoryBlock }) {
  switch (block.type) {
    case 'paragraph':
      return <p className={styles.paragraph}>{block.text}</p>
    case 'heading':
      return <h2 className={styles.heading}>{block.text}</h2>
    case 'quote':
      return <blockquote className={styles.quote}>“{block.text}”</blockquote>
    case 'photoMemo':
      // Mockup의 사진 자리는 디자인 Placeholder다. 사진 Asset이 없어 Mentor가 남긴 사진 메모(Caption)만 보여준다.
      return (
        <figure className={styles.photoMemo}>
          <figcaption>
            <span className={styles.photoMemoLabel}>사진 메모</span>
            {block.caption}
          </figcaption>
        </figure>
      )
  }
}

function StoryDetailSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <span className={`${skeletonStyles.block} ${styles.skeletonTitle}`} />
      <span className={`${skeletonStyles.block} ${styles.skeletonLine}`} />
      <span className={`${skeletonStyles.block} ${styles.skeletonText}`} />
      <span className={`${skeletonStyles.block} ${styles.skeletonText}`} />
    </div>
  )
}
