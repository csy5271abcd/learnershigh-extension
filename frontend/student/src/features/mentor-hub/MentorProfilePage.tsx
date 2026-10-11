import { HomeSection } from './components/HomeSection.tsx'
import { MentorExperienceList } from './components/MentorExperienceList.tsx'
import { MentorProfileContents } from './components/MentorProfileContents.tsx'
import { MentorProfileFacts } from './components/MentorProfileFacts.tsx'
import { MentorProfileHeader } from './components/MentorProfileHeader.tsx'
import { MentorProfileSkeleton } from './components/MentorProfileSkeleton.tsx'
import { MentorScoreSummary } from './components/MentorScoreSummary.tsx'
import { mentorProfileContentKinds } from './model/tabs.ts'
import type { MentorContentSummary, MentorProfile, MentorProfileContentKind } from './model/types.ts'
import { useMentorProfile } from './model/useMentorProfile.ts'
import homeStyles from './MentorHubHomePage.module.css'
import styles from './MentorProfilePage.module.css'

interface MentorProfilePageProps {
  mentorId: string
  /** Data Source Boundary. 현재는 Fixture Loader, API 연결 시 GET /api/student/mentors/{mentorId}. */
  loadProfile: (mentorId: string) => Promise<MentorProfile | null>
  /** 선택 Content Tab은 호출 측(Route)이 소유해 Detail 왕복 후에도 유지한다. */
  selectedContentKind?: MentorProfileContentKind
  onContentKindSelect: (kind: MentorProfileContentKind) => void
  onBack: () => void
  onGoToHub: () => void
  // Content는 Detail이 있는 유형(Plan / Routine / Story)만 호출 측에서 연결한다.
  onAskQuestion?: (mentorId: string) => void
  onContentSelect?: (content: MentorContentSummary) => void
}

function defaultContentKind(profile: MentorProfile): MentorProfileContentKind {
  return mentorProfileContentKinds.find((kind) => profile.contents.some((item) => item.kind === kind)) ?? 'plan'
}

export function MentorProfilePage({
  mentorId,
  loadProfile,
  selectedContentKind,
  onContentKindSelect,
  onBack,
  onGoToHub,
  onAskQuestion,
  onContentSelect,
}: MentorProfilePageProps) {
  const { state, reload } = useMentorProfile(mentorId, loadProfile)

  return (
    <main className={`${homeStyles.page} ${styles.page}`} aria-busy={state.status === 'loading'}>
      <button type="button" className={styles.back} onClick={onBack}>
        <span aria-hidden="true">‹</span> Mentor
        <span className="lh-visually-hidden">로 돌아가기</span>
      </button>

      {state.status === 'loading' && (
        <>
          <p className="lh-visually-hidden" role="status">
            Mentor Profile을 불러오는 중이에요.
          </p>
          <MentorProfileSkeleton />
        </>
      )}

      {state.status === 'error' && (
        <div className={homeStyles.errorNotice} role="alert">
          <h1 className={homeStyles.errorTitle}>Mentor Profile을 불러오지 못했어요.</h1>
          <p className={homeStyles.errorDescription}>잠시 후 다시 시도해 주세요.</p>
          <button type="button" className={homeStyles.retryButton} onClick={reload}>
            다시 시도
          </button>
        </div>
      )}

      {state.status === 'notFound' && (
        <div className={homeStyles.errorNotice}>
          <h1 className={homeStyles.errorTitle}>Mentor를 찾을 수 없어요.</h1>
          <p className={homeStyles.errorDescription}>주소가 잘못되었거나 공개되지 않은 Mentor예요.</p>
          <button type="button" className={homeStyles.retryButton} onClick={onGoToHub}>
            Mentor Hub로 이동
          </button>
        </div>
      )}

      {state.status === 'success' && (
        <>
          <MentorProfileHeader key={state.data.mentor.mentorId} profile={state.data} onAskQuestion={onAskQuestion} />
          <MentorProfileFacts mentor={state.data.mentor} />

          <HomeSection id="mentor-score" title="성적 요약" description={state.data.scoreSummary?.note}>
            <MentorScoreSummary summary={state.data.scoreSummary} />
          </HomeSection>

          <HomeSection id="mentor-experience" title="대표 경험" description={state.data.mentor.representativeExperience}>
            <MentorExperienceList experiences={state.data.experiences} />
          </HomeSection>

          <HomeSection id="mentor-contents" title="Content">
            <MentorProfileContents
              contents={state.data.contents}
              selectedKind={selectedContentKind ?? defaultContentKind(state.data)}
              onKindSelect={onContentKindSelect}
              onContentSelect={onContentSelect}
            />
          </HomeSection>
        </>
      )}
    </main>
  )
}
