import type { MentorContentSummary, MentorHubHome } from '../model/types.ts'
import styles from '../MentorHubHomePage.module.css'
import { AdminRecommendedCasePanel } from './AdminRecommendedCasePanel.tsx'
import { HomeSection } from './HomeSection.tsx'
import { MentorContentCard } from './MentorContentCard.tsx'
import { OtherMentorRow } from './OtherMentorRow.tsx'
import { RecommendedMentorCard } from './RecommendedMentorCard.tsx'

interface MentorHubRecommendViewProps {
  home: MentorHubHome
  onMentorSelect?: (mentorId: string) => void
  onCaseSelect?: (caseId: string) => void
  onContentSelect?: (content: MentorContentSummary) => void
}

// 추천 Tab 본문. Section 순서: 추천 Mentor → 다른 Mentor → Admin 추천 Case → Mixed Recommendation (Mockup 기준)
export function MentorHubRecommendView({
  home,
  onMentorSelect,
  onCaseSelect,
  onContentSelect,
}: MentorHubRecommendViewProps) {
  const { studentContext, recommendedMentors, otherMentors, adminRecommendedCases, mixedContent } = home

  return (
    <>
      <HomeSection
        id="recommended-mentors"
        title={`${studentContext.displayName}님과 잘 맞는 Mentor`}
        description="관심 진로, 지금 하는 활동, 고교 경험이 비슷한 선배예요."
      >
        {recommendedMentors.length > 0 ? (
          <ul className={styles.grid}>
            {recommendedMentors.map((recommendation) => (
              <li key={recommendation.mentor.mentorId}>
                <RecommendedMentorCard
                  recommendation={recommendation}
                  onMentorSelect={onMentorSelect}
                  onContentSelect={onContentSelect}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyNotice}>아직 추천할 Mentor가 없어요.</p>
        )}
      </HomeSection>

      <HomeSection
        id="other-mentors"
        title={otherMentors.length > 0 ? `다른 Mentor ${otherMentors.length}명` : '다른 Mentor'}
      >
        {otherMentors.length > 0 ? (
          <ul className={styles.grid}>
            {otherMentors.map((mentor) => (
              <li key={mentor.mentorId}>
                <OtherMentorRow mentor={mentor} onMentorSelect={onMentorSelect} />
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyNotice}>함께 볼 다른 Mentor가 아직 없어요.</p>
        )}
      </HomeSection>

      <HomeSection
        id="admin-recommended-cases"
        title="Admin 추천 Case"
        description="지금 하는 활동과 연결해서 학원에서 골라준 Case예요."
      >
        {adminRecommendedCases.length > 0 ? (
          <ul className={styles.stack}>
            {adminRecommendedCases.map((recommendedCase) => (
              <li key={recommendedCase.caseId}>
                <AdminRecommendedCasePanel
                  recommendedCase={recommendedCase}
                  studentDisplayName={studentContext.displayName}
                  onCaseSelect={onCaseSelect}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyNotice}>아직 Admin이 추천한 Case가 없어요.</p>
        )}
      </HomeSection>

      <HomeSection
        id="mixed-content"
        title="함께 보면 좋은 콘텐츠"
        description="관심 키워드와 이어지는 Plan, Routine, Story, Q&A, Record, Case예요."
      >
        {mixedContent.length > 0 ? (
          <ul className={styles.grid}>
            {mixedContent.map((item) => (
              <li key={item.contentId}>
                <MentorContentCard item={item} onContentSelect={onContentSelect} />
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyNotice}>아직 함께 볼 콘텐츠가 없어요.</p>
        )}
      </HomeSection>
    </>
  )
}
