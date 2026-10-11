import { MentorAvatar } from './components/MentorAvatar.tsx'
import skeletonStyles from './components/MentorHubHomeSkeleton.module.css'
import { RecordReviewedBadge } from './components/RecordParts.tsx'
import { RelatedContentList } from './components/RelatedContentList.tsx'
import homeStyles from './MentorHubHomePage.module.css'
// Badge / 제목 / Mentor 표시는 Plan Detail과 같은 모양을 쓴다.
import detailStyles from './MentorPlanDetailPage.module.css'
import profileStyles from './MentorProfilePage.module.css'
import styles from './MentorRecordPages.module.css'
import { mentorAffiliation } from './model/format.ts'
import { recordAreaLabel, recordPeriodText } from './model/records.ts'
import type { MentorContentSummary, MentorRecord } from './model/types.ts'
import { useContentDetail } from './model/useContentDetail.ts'

interface MentorRecordDetailPageProps {
  contentId: string
  /** Data Source Boundary. 현재는 Fixture Loader, API 연결 시 GET /api/student/mentor-content/{contentId}. */
  loadRecord: (contentId: string) => Promise<MentorRecord | null>
  onBack: () => void
  onGoToRecordList: () => void
  onMentorSelect: (mentorId: string) => void
  /** Detail 화면이 있는 관련 콘텐츠면 이동 함수를 돌려준다. (Case Detail은 아직 없다) */
  resolveContentLink: (content: MentorContentSummary) => (() => void) | undefined
}

// Record Detail (전용 Mockup 없음). 읽기 전용이며 복사 / 내 기록 만들기 / 원본 보기 Action을 두지 않는다.
// 순서: Mentor → 검수 표시 → 학년·학기 → 영역 → 과목·활동 → 기록 문장 → 연결 활동 → 관련 콘텐츠 → Mentor Context
export function MentorRecordDetailPage({
  contentId,
  loadRecord,
  onBack,
  onGoToRecordList,
  onMentorSelect,
  resolveContentLink,
}: MentorRecordDetailPageProps) {
  const { state, reload } = useContentDetail(contentId, loadRecord)

  return (
    <main className={`${homeStyles.page} ${profileStyles.page}`} aria-busy={state.status === 'loading'}>
      <button type="button" className={profileStyles.back} onClick={onBack}>
        <span aria-hidden="true">‹</span> Mentor
        <span className="lh-visually-hidden">로 돌아가기</span>
      </button>

      {state.status === 'loading' && (
        <>
          <p className="lh-visually-hidden" role="status">
            Record를 불러오는 중이에요.
          </p>
          <div className={styles.detailSkeleton} aria-hidden="true">
            <span className={`${skeletonStyles.block} ${styles.skeletonTitle}`} />
            <span className={`${skeletonStyles.block} ${styles.skeletonMeta}`} />
            <span className={`${skeletonStyles.block} ${styles.skeletonText}`} />
          </div>
        </>
      )}

      {state.status === 'error' && (
        <div className={homeStyles.errorNotice} role="alert">
          <h1 className={homeStyles.errorTitle}>Record를 불러오지 못했어요.</h1>
          <p className={homeStyles.errorDescription}>잠시 후 다시 시도해 주세요.</p>
          <button type="button" className={homeStyles.retryButton} onClick={reload}>
            다시 시도
          </button>
        </div>
      )}

      {state.status === 'notFound' && (
        <div className={homeStyles.errorNotice}>
          <h1 className={homeStyles.errorTitle}>Record를 찾을 수 없어요.</h1>
          <p className={homeStyles.errorDescription}>주소가 잘못되었거나 공개되지 않은 Record예요.</p>
          <button type="button" className={homeStyles.retryButton} onClick={onGoToRecordList}>
            Record 목록으로 이동
          </button>
        </div>
      )}

      {state.status === 'success' && (
        <RecordDetail record={state.data} onMentorSelect={onMentorSelect} resolveContentLink={resolveContentLink} />
      )}
    </main>
  )
}

interface RecordDetailProps {
  record: MentorRecord
  onMentorSelect: (mentorId: string) => void
  resolveContentLink: (content: MentorContentSummary) => (() => void) | undefined
}

function RecordDetail({ record, onMentorSelect, resolveContentLink }: RecordDetailProps) {
  const { mentor, linkedActivity } = record
  const linkedCase = record.relatedContent.find((item) => item.contentId === linkedActivity.caseId)

  return (
    <article className={styles.detail}>
      <header className={styles.detailHeader}>
        <p className={detailStyles.badge}>Record</p>
        <h1 className={detailStyles.title}>{record.title}</h1>
        {/* 1. Mentor / 대학·학과 / 전형 */}
        <button type="button" className={detailStyles.mentor} onClick={() => onMentorSelect(mentor.mentorId)}>
          <MentorAvatar name={mentor.name} imageUrl={mentor.profileImageUrl} size="md" />
          <span className={detailStyles.mentorText}>
            {mentor.name} · {mentorAffiliation(mentor)} · {mentor.admissionType}
            <span className="lh-visually-hidden"> Profile 보기</span>
          </span>
        </button>
        {/* 2. 개인정보 제거 · 검수 상태 */}
        <p className={styles.reviewedRow}>
          <RecordReviewedBadge />
          <span>원본 생활기록부가 아니라 학교명 · 교사 · 학번 같은 개인정보를 지우고 검수한 공개 범위만 보여요.</span>
        </p>
        {/* 3~5. 학년·학기 / 영역 / 과목·활동 */}
        <dl className={styles.facts}>
          <div>
            <dt>학년 · 학기</dt>
            <dd>{recordPeriodText(record)}</dd>
          </div>
          <div>
            <dt>학교생활기록부 영역</dt>
            <dd>{recordAreaLabel(record.area)}</dd>
          </div>
          <div>
            <dt>과목 · 활동</dt>
            <dd>{record.subjectOrActivity}</dd>
          </div>
        </dl>
      </header>

      {/* 6. 비식별 기록 문장 (읽기 전용) */}
      <section className={styles.section} aria-labelledby="record-text-heading">
        <h2 id="record-text-heading" className={styles.sectionTitle}>
          기록 내용
        </h2>
        <p className={styles.recordText}>{record.recordText}</p>
      </section>

      {/* 7. 이 기록과 연결된 실제 활동 */}
      <section className={`${styles.section} ${styles.activity}`} aria-labelledby="record-activity-heading">
        <h2 id="record-activity-heading" className={styles.sectionTitle}>
          이 기록과 연결된 실제 활동
        </h2>
        <p className={styles.activityTitle}>{linkedActivity.title}</p>
        <p className={styles.activityDescription}>{linkedActivity.description}</p>
        {linkedCase && (
          <p className={styles.activityCase}>이 활동의 과정은 Activity Case "{linkedCase.title}"에서 이어서 볼 수 있어요.</p>
        )}
      </section>

      {/* 8. 관련 Case / Story / Plan */}
      <section className={styles.section} aria-labelledby="record-related-heading">
        <h2 id="record-related-heading" className={styles.sectionTitle}>
          관련 콘텐츠
        </h2>
        {record.relatedContent.length > 0 ? (
          <RelatedContentList items={record.relatedContent} resolveLink={resolveContentLink} />
        ) : (
          <p className={styles.empty}>함께 볼 관련 콘텐츠가 아직 없어요.</p>
        )}
      </section>

      {/* 9. Mentor의 짧은 Context */}
      <section className={styles.section} aria-labelledby="record-mentor-heading">
        <h2 id="record-mentor-heading" className={styles.sectionTitle}>
          {mentor.name}님의 한마디
        </h2>
        <p className={styles.mentorNote}>{record.mentorNote}</p>
        <button type="button" className={styles.profileButton} onClick={() => onMentorSelect(mentor.mentorId)}>
          {mentor.name}님 Profile 보기
        </button>
      </section>
    </article>
  )
}
