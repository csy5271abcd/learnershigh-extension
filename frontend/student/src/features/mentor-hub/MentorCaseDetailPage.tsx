import { useEffect, useRef, useState } from 'react'
import {
  CaseAdminBadge,
  CaseMaterialCards,
  CaseStageNav,
  CaseStagePanel,
  CaseTaskLinkDialog,
} from './components/CaseParts.tsx'
import { CaseDocumentPreviewDialog } from './components/CaseDocumentPreviewDialog.tsx'
import { MentorAvatar } from './components/MentorAvatar.tsx'
import { MentorContentCard } from './components/MentorContentCard.tsx'
import skeletonStyles from './components/MentorHubHomeSkeleton.module.css'
import { RecordReviewedBadge } from './components/RecordParts.tsx'
import styles from './MentorCasePages.module.css'
import homeStyles from './MentorHubHomePage.module.css'
// 제목 · Mentor · 오른쪽 CTA 배치는 Plan Detail과 같은 모양을 쓴다.
import detailStyles from './MentorPlanDetailPage.module.css'
import profileStyles from './MentorProfilePage.module.css'
import { formatMonthDay, mentorAffiliation } from './model/format.ts'
import { caseMaterialRoleLabel } from './model/caseMaterials.ts'
import type { CaseMaterial, LinkedTask, MentorCaseView, MentorContentSummary } from './model/types.ts'
import { useContentDetail } from './model/useContentDetail.ts'

interface MentorCaseDetailPageProps {
  contentId: string
  /** Data Source Boundary. 현재는 Fixture Loader, API 연결 시 GET /api/student/mentor-content/{contentId}. */
  loadCase: (contentId: string) => Promise<MentorCaseView | null>
  /** 선택 단계(0부터)는 호출 측(Route, URL ?stage=)이 소유해 다른 화면 왕복 후에도 유지한다. */
  stageIndex: number
  onStageChange: (index: number) => void
  /** 내 Task에 참고 연결 후보 (현재 Student의 진행 중 Task) */
  taskCandidates: LinkedTask[]
  onBack: () => void
  onGoToCaseList: () => void
  onMentorSelect: (mentorId: string) => void
  onContentSelect: (content: MentorContentSummary) => void
}

// Activity Case Detail (ActivityCase-01 ~ 11 Mockup)
// 순서: 기본정보(Mentor / 당시 학년 / 과목 / 활동 유형) → 과정 자료 → 단계(안내 · 주제 · 조사 · 중간 과정 · 최종 결과 · Reflection · 후속 활동)
//      → 관련 Mentor Content → 내 Task 참고 연결 (Header 버튼)
export function MentorCaseDetailPage({
  contentId,
  loadCase,
  stageIndex,
  onStageChange,
  taskCandidates,
  onBack,
  onGoToCaseList,
  onMentorSelect,
  onContentSelect,
}: MentorCaseDetailPageProps) {
  const { state, reload } = useContentDetail(contentId, loadCase)

  return (
    <main className={`${homeStyles.page} ${profileStyles.page}`} aria-busy={state.status === 'loading'}>
      <button type="button" className={profileStyles.back} onClick={onBack}>
        <span aria-hidden="true">‹</span> Mentor
        <span className="lh-visually-hidden">로 돌아가기</span>
      </button>

      {state.status === 'loading' && (
        <>
          <p className="lh-visually-hidden" role="status">
            Case를 불러오는 중이에요.
          </p>
          <div className={styles.skeleton} aria-hidden="true">
            <span className={`${skeletonStyles.block} ${detailStyles.skeletonTitle}`} />
            <span className={`${skeletonStyles.block} ${detailStyles.skeletonLine}`} />
            <span className={`${skeletonStyles.block} ${styles.skeletonMaterials}`} />
            <span className={`${skeletonStyles.block} ${styles.skeletonStage}`} />
          </div>
        </>
      )}

      {state.status === 'error' && (
        <div className={homeStyles.errorNotice} role="alert">
          <h1 className={homeStyles.errorTitle}>Case를 불러오지 못했어요.</h1>
          <p className={homeStyles.errorDescription}>잠시 후 다시 시도해 주세요.</p>
          <button type="button" className={homeStyles.retryButton} onClick={reload}>
            다시 시도
          </button>
        </div>
      )}

      {state.status === 'notFound' && (
        <div className={homeStyles.errorNotice}>
          <h1 className={homeStyles.errorTitle}>Case를 찾을 수 없어요.</h1>
          <p className={homeStyles.errorDescription}>주소가 잘못되었거나 공개되지 않은 Case예요.</p>
          <button type="button" className={homeStyles.retryButton} onClick={onGoToCaseList}>
            Case 목록으로 이동
          </button>
        </div>
      )}

      {state.status === 'success' && (
        <CaseDetail
          view={state.data}
          stageIndex={stageIndex}
          onStageChange={onStageChange}
          taskCandidates={taskCandidates}
          onMentorSelect={onMentorSelect}
          onContentSelect={onContentSelect}
        />
      )}
    </main>
  )
}

interface CaseDetailProps {
  view: MentorCaseView
  stageIndex: number
  onStageChange: (index: number) => void
  taskCandidates: LinkedTask[]
  onMentorSelect: (mentorId: string) => void
  onContentSelect: (content: MentorContentSummary) => void
}

function CaseDetail({ view, stageIndex, onStageChange, taskCandidates, onMentorSelect, onContentSelect }: CaseDetailProps) {
  const { activityCase, adminRecommendation } = view
  const { mentor, stages } = activityCase
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  // 문서 미리보기는 Deep Link 대상이 아니라 Local UI State다. (닫아도 단계 / Scroll은 그대로)
  const [previewMaterial, setPreviewMaterial] = useState<CaseMaterial>()
  const relatedHeadingRef = useRef<HTMLHeadingElement>(null)
  const stageHeadingRef = useRef<HTMLHeadingElement>(null)
  const pendingStageFocus = useRef(false)

  // 주소의 단계가 범위를 벗어나면 첫 단계로 본다.
  const currentIndex = stageIndex >= 0 && stageIndex < stages.length ? stageIndex : 0
  const currentStage = stages[currentIndex]

  // 단계 목록 / 과정 자료로 단계를 바꾸면 단계 제목으로 Focus를 옮겨 바뀐 내용을 바로 읽게 한다.
  useEffect(() => {
    if (!pendingStageFocus.current) return
    pendingStageFocus.current = false
    stageHeadingRef.current?.focus()
  }, [currentIndex])

  const selectStage = (index: number, focusPanel: boolean) => {
    if (index < 0 || index >= stages.length || index === currentIndex) return
    pendingStageFocus.current = focusPanel
    onStageChange(index)
  }

  // 미리보기 Header의 자료 종류 · 단계 (예: 초안 · 4단계 초안 V1 제출)
  const materialContextLabel = (material: CaseMaterial) => {
    const index = stages.findIndex((stage) => stage.stageId === material.stageId)
    const role = caseMaterialRoleLabel[material.role]
    return index >= 0 ? `${role} · ${index + 1}단계 ${stages[index].title}` : role
  }

  const showRelated = () => {
    relatedHeadingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    relatedHeadingRef.current?.focus({ preventScroll: true })
  }

  return (
    <article className={styles.detail}>
      {/* 1. 활동 기본정보 */}
      <header className={styles.header}>
        <div className={detailStyles.summary}>
          <div className={detailStyles.summaryText}>
            <p className={styles.badges}>
              <span className={detailStyles.badge}>Activity Case</span>
              {adminRecommendation && <CaseAdminBadge />}
              <RecordReviewedBadge />
            </p>
            <h1 className={detailStyles.title}>{activityCase.title}</h1>
            <button type="button" className={detailStyles.mentor} onClick={() => onMentorSelect(mentor.mentorId)}>
              <MentorAvatar name={mentor.name} imageUrl={mentor.profileImageUrl} size="md" />
              <span className={detailStyles.mentorText}>
                {mentor.name} · {mentorAffiliation(mentor)} · {mentor.admissionType}
                <span className="lh-visually-hidden"> Profile 보기</span>
              </span>
            </button>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} onClick={showRelated}>
              관련 콘텐츠
            </button>
            <button
              type="button"
              className={detailStyles.applyButton}
              aria-haspopup="dialog"
              onClick={() => setTaskDialogOpen(true)}
            >
              내 Task에 참고 연결
            </button>
          </div>
        </div>

        <dl className={styles.facts}>
          <div>
            <dt>당시 학년</dt>
            <dd>고{activityCase.grade}</dd>
          </div>
          <div>
            <dt>과목 · 영역</dt>
            <dd>{activityCase.subject}</dd>
          </div>
          <div>
            <dt>활동 유형</dt>
            <dd>{activityCase.activityType}</dd>
          </div>
          <div>
            <dt>주요 활동 · 결과물</dt>
            <dd>{activityCase.activities.join(' · ')}</dd>
          </div>
        </dl>

        {adminRecommendation && (
          <p className={styles.recommendation}>
            <span className={styles.recommendationLabel}>
              Admin 추천 · <time dateTime={adminRecommendation.recommendedDate}>{formatMonthDay(adminRecommendation.recommendedDate)}</time>
            </span>
            "{adminRecommendation.linkedTask.title}" Task와 연결해 추천했어요. {adminRecommendation.relationReason}
          </p>
        )}
      </header>

      {/* 과정 자료 (Evidence / 제출물) */}
      {activityCase.materials.length > 0 && (
        <section className={styles.section} aria-labelledby="case-materials-heading">
          <h2 id="case-materials-heading" className={styles.sectionLabel}>
            과정 자료
          </h2>
          <CaseMaterialCards
            materials={activityCase.materials}
            stages={stages}
            currentStageId={currentStage.stageId}
            onStageSelect={(index) => selectStage(index, true)}
            onPreview={setPreviewMaterial}
          />
        </section>
      )}

      {/* 단계: 안내 → 주제 → 조사 → (실제 있었던) 중간 과정 → 최종 결과 · Reflection · 후속 활동 */}
      <div className={styles.stageLayout}>
        <CaseStageNav stages={stages} currentIndex={currentIndex} onStageSelect={(index) => selectStage(index, true)} />
        <CaseStagePanel
          stage={currentStage}
          index={currentIndex}
          total={stages.length}
          materials={activityCase.materials}
          reflection={activityCase.reflection}
          followUp={activityCase.followUp}
          headingRef={stageHeadingRef}
          // 이전 / 다음 버튼이 끝에서 비활성이 되면 Focus가 사라지지 않게 단계 제목으로 옮긴다.
          onStageSelect={(index) => selectStage(index, index === 0 || index === stages.length - 1)}
          onPreview={setPreviewMaterial}
        />
      </div>

      {/* 관련 Mentor Content */}
      <section className={styles.section} aria-labelledby="case-related-heading">
        <h2 id="case-related-heading" ref={relatedHeadingRef} tabIndex={-1} className={styles.sectionTitle}>
          관련 콘텐츠
        </h2>
        {activityCase.relatedContent.length > 0 ? (
          <ul className={homeStyles.grid}>
            {activityCase.relatedContent.map((item) => (
              <li key={item.contentId}>
                <MentorContentCard item={item} onContentSelect={onContentSelect} />
              </li>
            ))}
          </ul>
        ) : (
          <p className={homeStyles.emptyNotice}>함께 볼 관련 콘텐츠가 아직 없어요.</p>
        )}
      </section>

      {previewMaterial?.preview && (
        <CaseDocumentPreviewDialog
          key={previewMaterial.materialId}
          material={{ ...previewMaterial, preview: previewMaterial.preview }}
          contextLabel={materialContextLabel(previewMaterial)}
          onClose={() => setPreviewMaterial(undefined)}
        />
      )}

      {taskDialogOpen && (
        <CaseTaskLinkDialog
          caseTitle={activityCase.title}
          tasks={taskCandidates}
          adminRecommendation={adminRecommendation}
          onClose={() => setTaskDialogOpen(false)}
        />
      )}
    </article>
  )
}
