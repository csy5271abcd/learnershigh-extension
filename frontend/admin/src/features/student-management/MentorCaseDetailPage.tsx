import { useEffect, useRef, useState } from 'react'
import { AvailabilityBadge, DownloadAction, FilePreviewDialog } from '../../components/AdminFilePreview.tsx'
import { Badge } from '../../components/AdminUi.tsx'
import ui from '../../components/AdminUi.module.css'
import { ToneTag } from '../../components/AdminVisual.tsx'
import { formatLabelOf, type PreviewFile } from '../../components/filePreview.ts'
import { activityTypeLabel } from '../../fixtures/adminActivities.fixture.ts'
import { caseMaterialRole, caseMaterialStep } from '../../read-model/materialRole.ts'
import type { AdminActivity, AdminStudent, AdminTask, CaseMaterial, MentorCaseDetail, MentorCaseRef } from '../../fixtures/types.ts'
import type { AdminState } from '../../store/adminStore.ts'
import { MentorCue } from './MentorContentCards.tsx'
import { RecommendCaseDialog } from './RecommendCaseDialog.tsx'
import mc from './MentorContent.module.css'
import styles from './StudentManagement.module.css'

/*
 * Admin Mentor Case Detail (/mentor-cases/:caseId) — 추천 전에 Case 내용을 Student Activity Case 수준으로 읽는다.
 * - 내용은 Student Mentor Hub Canonical Case(같은 contentId)의 단계 · 자료 · Reflection · 후속 활동 · 관련 Content 그대로다. Admin이 고치지 않는다.
 * - Activity Case 공개 자료: 원본이 있으면 미리보기 + 원본 다운로드. (Mentor Record와 다르다: Record 원본은 공개 · 다운로드하지 않는다)
 * - 오른쪽 추천 Context(학생 · 대상 Task / 활동)는 Admin 내부 정보다. Mentor에게 전달되지 않는다.
 * - Admin Case Detail 전용 API Shape은 Contract에 없다. (GET /api/admin/mentor-cases 목록만 · Gap) Fixture에서 contentId로 찾는다.
 * - 추천 이력: 이 Case를 추천한 학생 · 대상 (Admin 내부 정보, Mentor에게 보이지 않는다)
 * - AI 사전 점검 · 선생님 피드백: Case에 공개된 값만 보여준다. 없는 분석 문장 · 작성자 · 시각을 만들지 않는다.
 */

/** 자료 Card 발췌 (Case 표시용 내용의 첫 문장) */
function materialExcerpt(material: CaseMaterial): string | null {
  const preview = material.preview
  if (!preview) return null
  if (preview.kind === 'table') return `${preview.title} · ${preview.columns.join(' / ')}`
  const page = preview.pages[0]
  return page ? (page.paragraphs?.[0] ?? page.lead ?? page.body ?? page.bullets?.[0] ?? page.title) : null
}

const kindLabel: Record<string, string> = { plan: 'Plan', routine: 'Routine', story: 'Story', record: 'Record', case: 'Case', qna: 'Q&A' }

/** Case 자료 → 미리보기 파일. 역할 · 단계는 read-model/materialRole.ts (Case 공개 값에서만 파생) */
const materialFile = (material: CaseMaterial, detail: MentorCaseDetail): PreviewFile => ({
  name: material.fileName ?? material.title,
  format: material.format,
  role: caseMaterialRole(material, detail),
  subtitle: `${caseMaterialStep(material, detail)} · ${material.description}`,
  backing: material.original ? { url: material.original.url, mimeType: material.original.mimeType, sizeBytes: material.original.fileSizeBytes } : undefined,
  viewModel: material.preview,
})

interface MentorCaseDetailPageProps {
  state: AdminState
  caseRef: MentorCaseRef
  detail: MentorCaseDetail
  student: AdminStudent | null
  targetTask: AdminTask | null
  targetActivity: AdminActivity | null
  onBack: () => void
  backLabel: string
  onChooseContext: () => void
  onOpenMentor: (mentorId: string) => void
  onOpenStudent: (studentId: string) => void
  onOpenTask: (taskId: string) => void
  onOpenActivity: (activityId: string) => void
  onOpenContent: (contentId: string) => void
}

export function MentorCaseDetailPage({ state, caseRef, detail, student, targetTask, targetActivity, onBack, backLabel, onChooseContext, onOpenMentor, onOpenStudent, onOpenTask, onOpenActivity, onOpenContent }: MentorCaseDetailPageProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [caseRef.contentId])
  const [preview, setPreview] = useState<PreviewFile | null>(null)
  const [recommending, setRecommending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const finals = detail.materials.filter((item) => item.role === 'final')
  const targetLabel = targetTask?.title ?? targetActivity?.title ?? null
  const already = student
    ? state.recommendations.some((item) => item.studentId === student.studentId && item.caseId === caseRef.contentId && item.taskId === (targetTask?.taskId ?? null) && item.activityId === (targetActivity?.activityId ?? null))
    : false
  const linkedTasks = state.tasks.filter((task) => task.relatedMentorCaseIds.includes(caseRef.contentId))
  const history = state.recommendations.filter((item) => item.caseId === caseRef.contentId)
  const students = new Map(state.students.map((item) => [item.studentId, item]))

  const sections = [
    { id: 'case-overview', label: '활동 기본정보' },
    ...detail.stages.map((stage, index) => ({ id: `case-stage-${stage.stageId}`, label: `${index + 1}. ${stage.title}` })),
    { id: 'case-materials', label: `과정 자료 ${detail.materials.length}` },
    { id: 'case-result', label: '결과물' },
    { id: 'case-reflection', label: 'Reflection' },
    { id: 'case-follow-up', label: '후속 활동' },
    { id: 'case-related', label: '관련 Mentor Content' },
  ]

  return (
    <div className={ui.page}>
      <button type="button" className={ui.back} onClick={onBack}>
        <span aria-hidden="true">‹</span> {backLabel}
        <span className="lh-visually-hidden">로 돌아가기</span>
      </button>
      <header className={ui.headerText}>
        <p className={ui.muted}>
          Mentor Activity Case · {caseRef.subject} · {caseRef.activityType}
        </p>
        <h1 ref={headingRef} tabIndex={-1} className={ui.title}>
          {caseRef.title}
        </h1>
        <MentorCue mentorId={caseRef.mentorId} onOpenMentor={onOpenMentor} />
      </header>
      {message && (
        <p className={ui.success} role="status">
          {message}
        </p>
      )}
      <div className={styles.caseLayout}>
        <nav className={styles.stickyNav} aria-label="Case 단계 이동">
          <ol className={styles.stepNav}>
            {sections.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    const target = document.getElementById(item.id)
                    target?.scrollIntoView({ block: 'start' })
                    target?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true })
                  }}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <article aria-labelledby="case-overview-title">
          <section id="case-overview" className={styles.caseSection} aria-labelledby="case-overview-title">
            <h2 id="case-overview-title" className={ui.sectionTitle} tabIndex={-1}>
              활동 기본정보
            </h2>
            <dl className={ui.facts}>
              <dt>Mentor</dt>
              <dd>
                {caseRef.mentorName} · {caseRef.mentorAffiliation}
              </dd>
              <dt>활동 당시</dt>
              <dd>{caseRef.gradeLabel}</dd>
              <dt>과목 · 영역</dt>
              <dd>{caseRef.subject}</dd>
              <dt>활동 유형</dt>
              <dd>{caseRef.activityType}</dd>
              <dt>요약</dt>
              <dd>{detail.summary}</dd>
              <dt>주요 활동 · 결과물</dt>
              <dd>{detail.activities.join(' · ')}</dd>
            </dl>
          </section>

          {detail.stages.map((stage, index) => {
            const materials = detail.materials.filter((item) => item.stageId === stage.stageId)
            return (
              <section key={stage.stageId} id={`case-stage-${stage.stageId}`} className={styles.caseSection} aria-labelledby={`case-stage-title-${stage.stageId}`}>
                <h2 id={`case-stage-title-${stage.stageId}`} className={ui.subTitle} tabIndex={-1}>
                  {index + 1}단계 · {stage.title} <span className={ui.muted}>{stage.summary}</span>
                </h2>
                {stage.stageId === 'ai-check' ? (
                  <div className={styles.caseAiBlock} aria-label="AI 사전 점검 (Case 공개 내용)">
                    <span className={styles.sourceLabel} data-source="ai">
                      AI 사전 점검 · 참고용
                    </span>
                    <p>{stage.description}</p>
                    <dl className={styles.caseAiFacts}>
                      <dt>평가 항목</dt>
                      <dd>
                        <ul className={styles.checkItems}>
                          {stage.checklist.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </dd>
                      <dt>분석 내용 · 제안</dt>
                      <dd className={ui.muted}>Case에 공개된 항목별 분석 문장 · 제안은 없어요. (Mentor가 공개한 점검 항목만 있어요)</dd>
                      <dt>관련 기준</dt>
                      <dd>{stage.summary}</dd>
                    </dl>
                  </div>
                ) : (
                  <p>{stage.description}</p>
                )}
                {stage.stageId !== 'ai-check' && stage.checklist.length > 0 && (
                  <ul className={ui.badgeList} aria-label={`${stage.title} 확인한 것`}>
                    {stage.checklist.map((item) => (
                      <li key={item}>
                        <Badge>{item}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
                {stage.planChange && (
                  <div className={styles.compare}>
                    <div className={ui.listItem}>
                      <span className={ui.cellSub}>처음 계획</span>
                      <span>{stage.planChange.before}</span>
                    </div>
                    <div className={ui.listItem}>
                      <span className={ui.cellSub}>바꾼 계획</span>
                      <span>{stage.planChange.after}</span>
                    </div>
                  </div>
                )}
                {stage.feedback && (
                  <figure className={styles.staffFeedback} aria-label="선생님 피드백 (Case 공개 내용)">
                    <figcaption className={styles.staffFeedbackHead}>
                      <span className={styles.sourceLabel} data-source="staff">
                        {stage.feedback.source}
                      </span>
                      <span className={ui.cellSub}>작성자 · 전달 시각: Case 공개 정보에 없어요</span>
                    </figcaption>
                    <blockquote className={styles.staffFeedbackBody}>{stage.feedback.text}</blockquote>
                    <dl className={styles.caseAiFacts}>
                      <dt>Next Action · 관련 Version</dt>
                      <dd>{stage.feedback.note}</dd>
                    </dl>
                  </figure>
                )}
                {materials.length > 0 && <MaterialCards materials={materials} detail={detail} onOpen={setPreview} label={`${stage.title} 자료`} />}
              </section>
            )
          })}

          <section id="case-materials" className={styles.caseSection} aria-labelledby="case-materials-title">
            <h2 id="case-materials-title" className={ui.subTitle} tabIndex={-1}>
              과정 자료 {detail.materials.length}개
            </h2>
            <p className={ui.cellSub}>공개된 Activity Case 자료예요. 원본이 있는 자료만 미리보기 · 다운로드할 수 있어요.</p>
            {detail.materials.length === 0 ? <p className={ui.muted}>자료가 없어요.</p> : <MaterialCards materials={detail.materials} detail={detail} onOpen={setPreview} label="Case 과정 자료" />}
          </section>

          <section id="case-result" className={styles.caseSection} aria-labelledby="case-result-title">
            <h2 id="case-result-title" className={ui.subTitle} tabIndex={-1}>
              결과물
            </h2>
            {finals.length === 0 ? (
              <p className={ui.muted}>최종본으로 표시된 자료가 없어요. 주요 결과물: {detail.activities.join(' · ')}</p>
            ) : (
              finals.map((item) => {
                const file = materialFile(item, detail)
                return (
                  <div key={item.materialId} className={ui.listItem}>
                    <span className={ui.cellMain}>{item.title}</span>
                    <span className={ui.cellSub}>
                      {item.format} · {item.description}
                    </span>
                    <div className={ui.actions} style={{ justifyContent: 'flex-start' }}>
                      <button type="button" className={`${ui.secondaryButton} ${ui.smallButton}`} onClick={() => setPreview(file)}>
                        결과물 열기<span className="lh-visually-hidden">: {item.title}</span>
                      </button>
                      <DownloadAction file={file} />
                    </div>
                  </div>
                )
              })
            )}
          </section>

          <section id="case-reflection" className={styles.caseSection} aria-labelledby="case-reflection-title">
            <h2 id="case-reflection-title" className={ui.subTitle} tabIndex={-1}>
              Reflection (Mentor 공개 원문)
            </h2>
            <p>{detail.reflection}</p>
          </section>

          <section id="case-follow-up" className={styles.caseSection} aria-labelledby="case-follow-up-title">
            <h2 id="case-follow-up-title" className={ui.subTitle} tabIndex={-1}>
              후속 활동
            </h2>
            <p>{detail.followUp ?? '후속 활동 기록이 없어요.'}</p>
          </section>

          <section id="case-related" className={styles.caseSection} aria-labelledby="case-related-title">
            <h2 id="case-related-title" className={ui.subTitle} tabIndex={-1}>
              관련 Mentor Content {detail.relatedContent.length}
            </h2>
            {detail.relatedContent.length === 0 ? (
              <p className={ui.muted}>연결된 Mentor Content가 없어요.</p>
            ) : (
              <ul className={ui.list}>
                {detail.relatedContent.map((item) => (
                  <li key={item.contentId} className={ui.listItem}>
                    <span className={ui.cellMain}>
                      <Badge>{kindLabel[item.kind] ?? item.kind}</Badge>{' '}
                      <button type="button" className={ui.linkButton} onClick={() => onOpenContent(item.contentId)}>
                        {item.title}
                        <span className="lh-visually-hidden"> 상세 보기</span>
                      </button>
                    </span>
                    <span className={ui.cellSub}>
                      {item.mentorName} · {item.summary}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </article>

        <aside className={`${ui.panel} ${styles.stickyNav}`} data-tone="surface" aria-labelledby="case-recommend-title">
          <h2 id="case-recommend-title" className={ui.subTitle}>
            추천 Context (Admin 내부)
          </h2>
          <p className={ui.cellSub}>추천 대상 학생 정보는 Mentor에게 전달되지 않아요.</p>
          {student && targetLabel ? (
            <dl className={ui.facts}>
              <dt>학생</dt>
              <dd>
                {student.displayName} · {student.grade}
              </dd>
              <dt>{targetTask ? '수행평가' : '성장활동'}</dt>
              <dd>{targetLabel}</dd>
              {targetTask && (
                <>
                  <dt>과목</dt>
                  <dd>{targetTask.subject}</dd>
                  <dt>주제</dt>
                  <dd>{targetTask.topic?.text || '주제 정보 없음'}</dd>
                  <dt>단계</dt>
                  <dd>
                    {targetTask.currentStage}/8 · {targetTask.stageStatus}
                  </dd>
                </>
              )}
            </dl>
          ) : (
            <p className={ui.muted}>추천할 학생과 수행평가 · 활동을 아직 고르지 않았어요.</p>
          )}
          {already ? (
            <Badge tone="accent">이 대상에 추천함</Badge>
          ) : student && targetLabel ? (
            <button type="button" className={ui.primaryButton} onClick={() => setRecommending(true)}>
              이 Case 추천하기
            </button>
          ) : (
            <button type="button" className={ui.secondaryButton} onClick={onChooseContext}>
              추천 대상 고르러 가기
            </button>
          )}
          <p className={ui.cellSub}>이 Case가 연결된 수행평가 {linkedTasks.length}개</p>

          <h3 id="case-history-title" className={ui.subTitle}>
            추천 이력 {history.length}
          </h3>
          {history.length === 0 ? (
            <p className={ui.muted}>아직 이 Case를 추천한 학생이 없어요.</p>
          ) : (
            <ul className={mc.historyList} aria-labelledby="case-history-title">
              {history.map((item) => {
                const target = students.get(item.studentId)
                const task = item.taskId ? state.tasks.find((entry) => entry.taskId === item.taskId) : null
                const activity = item.activityId ? state.activities.find((entry) => entry.activityId === item.activityId) : null
                return (
                  <li key={item.recommendationId}>
                    <span className={mc.historyHead}>
                      <button type="button" className={ui.linkButton} onClick={() => onOpenStudent(item.studentId)}>
                        {target?.displayName ?? '찾을 수 없는 학생'}
                        <span className="lh-visually-hidden"> Student 360 보기</span>
                      </button>
                      <span className={ui.cellSub}>
                        {target?.grade} · {item.recommendedDate ? item.recommendedDate.replaceAll('-', '.') : '추천일 기록 없음'}
                      </span>
                    </span>
                    {task ? (
                      <button type="button" className={styles.historyTarget} onClick={() => onOpenTask(task.taskId)}>
                        수행평가 · {task.subject} · {task.title}
                        <span className="lh-visually-hidden"> Task 상세 보기</span>
                      </button>
                    ) : activity ? (
                      <button type="button" className={styles.historyTarget} onClick={() => onOpenActivity(activity.activityId)}>
                        성장활동 · {activityTypeLabel[activity.type]} · {activity.title}
                        <span className="lh-visually-hidden"> 활동 상세 보기</span>
                      </button>
                    ) : (
                      <span className={ui.cellSub}>연결 대상 정보 없음 ({item.taskId ?? item.activityId})</span>
                    )}
                    <span className={mc.historyReason}>{item.reason}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>
      </div>
      <FilePreviewDialog file={preview} onClose={() => setPreview(null)} />
      <RecommendCaseDialog
        caseRef={recommending ? caseRef : null}
        student={student}
        target={targetLabel ? { taskId: targetTask?.taskId ?? null, activityId: targetActivity?.activityId ?? null, label: targetLabel } : null}
        onClose={() => setRecommending(false)}
        onDone={(text) => {
          setMessage(text)
          setRecommending(false)
        }}
      />
    </div>
  )
}

/** 과정 자료 Card: 형식 · 이름 · 단계 · 발췌 · 미리보기 상태 (파일 이름만 두지 않는다) */
function MaterialCards({ materials, detail, onOpen, label }: { materials: CaseMaterial[]; detail: MentorCaseDetail; onOpen: (file: PreviewFile) => void; label: string }) {
  return (
    <ul className={styles.materialGrid} aria-label={label}>
      {materials.map((material) => {
        const file = materialFile(material, detail)
        const excerpt = materialExcerpt(material)
        return (
          <li key={material.materialId}>
            <button type="button" className={styles.materialCard} onClick={() => onOpen(file)}>
              <span className={styles.materialTop}>
                <span className={styles.materialRole}>{file.role}</span>
                <span className={styles.materialFormat}>{formatLabelOf(file)}</span>
              </span>
              <span className={ui.cellSub}>{caseMaterialStep(material, detail)}</span>
              <span className={ui.cellMain}>{material.title}</span>
              {excerpt && <span className={styles.materialExcerpt}>{excerpt}</span>}
              <span className={styles.materialName}>{material.fileName ?? material.description}</span>
              <span className="lh-visually-hidden"> 미리보기 열기</span>
            </button>
            <span className={styles.materialState}>
              <AvailabilityBadge file={file} />
              {material.original && <ToneTag tone="neutral">원본 있음</ToneTag>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
