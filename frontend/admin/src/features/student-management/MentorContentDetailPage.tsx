import { useEffect, useRef, useState } from 'react'
import { AdminIcon } from '../../components/AdminIcons.tsx'
import ui from '../../components/AdminUi.module.css'
import type { MentorPlanDay } from '../../fixtures/types.ts'
import type { AdminState } from '../../store/adminStore.ts'
import { findMentorProfile, mentorContentTypeLabel, planSubjects, type MentorContentItem } from '../../read-model/mentorContent.ts'
import { formatDateTime } from '../../read-model/time.ts'
import { MentorCue } from './MentorContentCards.tsx'
import { CONTENT_RECOMMENDATION_BOUNDARY, RecommendContentDialog } from './RecommendContentDialog.tsx'
import styles from './MentorContent.module.css'
import sm from './StudentManagement.module.css'

/*
 * Mentor Plan · Routine · Story · Record 상세 (/mentor-content/:contentId) — 추천 전에 Admin이 내용을 읽는다.
 * - 내용은 Student Mentor Hub Canonical 값 그대로다. Admin이 고치지 않는다.
 * - Record: 개인정보 제거 · 검수 완료 문장만 보여준다. 원본 파일은 없고 내려받을 수 없다. (Activity Case 공개 자료와 다르다)
 * - 추천: Admin 추천 API가 없어 Admin 임시 기록만 남긴다. (Gap: MENTOR-CONTENT-RECOMMENDATION-API) 학생 Mentor Hub에 반영하지 않는다.
 * - Admin Content 상세 API Shape은 Contract에 없다. (Gap) Fixture에서 contentId로 찾는다.
 */

const days: MentorPlanDay[] = ['월', '화', '수', '목', '금', '토', '일']

interface MentorContentDetailPageProps {
  state: AdminState
  item: Exclude<MentorContentItem, { type: 'case' }>
  studentId: string | null
  target: string | null
  onBack: () => void
  backLabel: string
  onOpenMentor: (mentorId: string) => void
  onOpenCase: (caseId: string) => void
  onOpenStudent: (studentId: string) => void
}

export function MentorContentDetailPage({ state, item, studentId, target, onBack, backLabel, onOpenMentor, onOpenCase, onOpenStudent }: MentorContentDetailPageProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [item.contentId])
  const [recommending, setRecommending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const profile = findMentorProfile(item.mentorId)
  const drafts = state.contentRecommendationDrafts.filter((entry) => entry.contentId === item.contentId)
  const students = new Map(state.students.map((entry) => [entry.studentId, entry]))

  return (
    <div className={ui.page}>
      <button type="button" className={ui.back} onClick={onBack}>
        <span aria-hidden="true">‹</span> {backLabel}
        <span className="lh-visually-hidden">로 돌아가기</span>
      </button>
      <header className={ui.headerText}>
        <p className={ui.muted}>Mentor {mentorContentTypeLabel[item.type]}</p>
        <h1 ref={headingRef} tabIndex={-1} className={ui.title}>
          {item.title}
        </h1>
        <MentorCue mentorId={item.mentorId} onOpenMentor={onOpenMentor} />
      </header>
      {message && (
        <p className={ui.success} role="status">
          {message}
        </p>
      )}
      <div className={styles.detailLayout}>
        <article className={styles.detailMain} aria-label={`${mentorContentTypeLabel[item.type]} 내용`}>
          {item.type === 'plan' && <PlanBody item={item} />}
          {item.type === 'routine' && <RoutineBody item={item} />}
          {item.type === 'story' && <StoryBody item={item} representative={profile?.representativeExperience ?? null} />}
          {item.type === 'record' && <RecordBody item={item} onOpenCase={onOpenCase} />}
        </article>

        <aside className={`${ui.panel} ${styles.aside}`} data-tone="surface" aria-labelledby="content-recommend-title">
          <h2 id="content-recommend-title" className={ui.subTitle}>
            추천 (Admin 내부)
          </h2>
          <p className={sm.boundaryNote}>
            <AdminIcon name="alert" size={14} />
            {CONTENT_RECOMMENDATION_BOUNDARY}
          </p>
          <button type="button" className={ui.primaryButton} onClick={() => setRecommending(true)}>
            추천 기록 남기기
          </button>
          <h3 className={ui.subTitle}>추천 기록 {drafts.length}</h3>
          {drafts.length === 0 ? (
            <p className={ui.muted}>이 콘텐츠에 남긴 Admin 추천 기록이 없어요.</p>
          ) : (
            <ul className={styles.historyList} aria-label="Admin 추천 기록">
              {drafts.map((entry) => {
                const student = students.get(entry.studentId)
                const task = entry.taskId ? state.tasks.find((t) => t.taskId === entry.taskId) : null
                const activity = entry.activityId ? state.activities.find((a) => a.activityId === entry.activityId) : null
                return (
                  <li key={entry.draftId}>
                    <span className={styles.historyHead}>
                      <button type="button" className={ui.linkButton} onClick={() => onOpenStudent(entry.studentId)}>
                        {student?.displayName}
                        <span className="lh-visually-hidden"> Student 360 보기</span>
                      </button>
                      <span className={styles.draftBadge}>Admin 기록 · 학생 미반영</span>
                    </span>
                    <span className={ui.cellSub}>
                      {student?.grade} · {task ? `${task.subject} · ${task.title}` : activity ? activity.title : '연결 대상 없음'} · {formatDateTime(entry.createdAt)}
                    </span>
                    <span className={styles.historyReason}>{entry.reason}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>
      </div>
      <RecommendContentDialog
        state={state}
        item={recommending ? item : null}
        initialStudentId={studentId}
        initialTarget={target}
        onClose={() => setRecommending(false)}
        onDone={(text) => {
          setMessage(text)
          setRecommending(false)
        }}
      />
    </div>
  )
}

function PlanBody({ item }: { item: Extract<MentorContentItem, { type: 'plan' }> }) {
  const plan = item.detail
  return (
    <>
      <section className={styles.detailSection} aria-labelledby="plan-goal">
        <h2 id="plan-goal" className={ui.sectionTitle}>
          목표
        </h2>
        <p className={styles.highlightBox}>{plan.summary}</p>
        <dl className={styles.factStrip}>
          <div>
            <dt>기간</dt>
            <dd>{plan.durationWeeks}주</dd>
          </div>
          <div>
            <dt>주간 학습일</dt>
            <dd>주 {plan.daysPerWeek}일</dd>
          </div>
          <div>
            <dt>과목</dt>
            <dd>{planSubjects(plan).join(' · ')}</dd>
          </div>
          <div>
            <dt>학습 Item</dt>
            <dd>{plan.weeks.reduce((sum, week) => sum + week.items.length, 0)}개</dd>
          </div>
        </dl>
      </section>
      <section className={styles.detailSection} aria-labelledby="plan-intent">
        <h2 id="plan-intent" className={ui.sectionTitle}>
          Mentor 의도
        </h2>
        <p>{plan.description}</p>
      </section>
      <section className={styles.detailSection} aria-labelledby="plan-weeks">
        <h2 id="plan-weeks" className={ui.sectionTitle}>
          주간 구성
        </h2>
        <div className={ui.tableScroll}>
          <table className={styles.weekTable}>
            <caption className="lh-visually-hidden">주차별 학습 Item</caption>
            <thead>
              <tr>
                <th scope="col">주차</th>
                <th scope="col">요일</th>
                <th scope="col">학습 Item</th>
                <th scope="col">과목</th>
                <th scope="col">메모</th>
              </tr>
            </thead>
            <tbody>
              {plan.weeks.flatMap((week) =>
                [...week.items]
                  .sort((a, b) => days.indexOf(a.day) - days.indexOf(b.day))
                  .map((entry, index) => (
                    <tr key={entry.itemId}>
                      {index === 0 ? (
                        <th scope="row" rowSpan={week.items.length}>
                          {week.week}주차
                        </th>
                      ) : null}
                      <td>{entry.day}</td>
                      <td>{entry.task}</td>
                      <td>{entry.subject}</td>
                      <td>
                        <span className={ui.cellSub}>{entry.memo ?? ''}</span>
                      </td>
                    </tr>
                  )),
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

function RoutineBody({ item }: { item: Extract<MentorContentItem, { type: 'routine' }> }) {
  const routine = item.detail
  return (
    <>
      <section className={styles.detailSection} aria-labelledby="routine-desc">
        <h2 id="routine-desc" className={ui.sectionTitle}>
          설명
        </h2>
        <p className={styles.highlightBox}>{routine.description}</p>
        <dl className={styles.factStrip}>
          <div>
            <dt>반복</dt>
            <dd>{routine.applyDays.length === 7 ? '매일' : routine.applyDays.join(' · ')}</dd>
          </div>
          <div>
            <dt>Timeline</dt>
            <dd>{routine.timeline.length}개 블록</dd>
          </div>
          <div>
            <dt>습관</dt>
            <dd>{routine.habits.length}개</dd>
          </div>
        </dl>
      </section>
      <section className={styles.detailSection} aria-labelledby="routine-timeline">
        <h2 id="routine-timeline" className={ui.sectionTitle}>
          {routine.timelineTitle}
        </h2>
        <ol className={styles.timeline}>
          {routine.timeline.map((block) => (
            <li key={block.blockId}>
              <span className={styles.timeText}>
                {block.slot.start}–{block.slot.end}
              </span>
              <span>
                <span className={ui.cellMain}>{block.title}</span>
                <span className={ui.cellSub}>{block.description}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
      <section className={styles.detailSection} aria-labelledby="routine-habits">
        <h2 id="routine-habits" className={ui.sectionTitle}>
          Habit
        </h2>
        <ul className={styles.experienceList}>
          {routine.habits.map((habit) => (
            <li key={habit.habitId}>
              <span className={ui.cellMain}>{habit.title}</span>
              <span className={ui.cellSub}>
                {habit.frequency} · {habit.slot.start}–{habit.slot.end} · {habit.description}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

function StoryBody({ item, representative }: { item: Extract<MentorContentItem, { type: 'story' }>; representative: string | null }) {
  const story = item.detail
  return (
    <>
      <section className={styles.detailSection} aria-labelledby="story-theme">
        <h2 id="story-theme" className={ui.sectionTitle}>
          Theme
        </h2>
        <ul className={styles.tagList} aria-label="Story 주제">
          {story.topics.map((topic) => (
            <li key={topic}>{topic}</li>
          ))}
        </ul>
        <p className={ui.muted}>
          {story.readMinutes}분 읽기 · {story.publishedDate.replaceAll('-', '.')} 공개
        </p>
        <p className={styles.highlightBox}>{story.summary}</p>
      </section>
      <section className={styles.detailSection} aria-labelledby="story-body">
        <h2 id="story-body" className={ui.sectionTitle}>
          본문
        </h2>
        <div className={styles.storyBody}>
          {story.body.map((block, index) =>
            block.type === 'heading' ? (
              <h3 key={index}>{block.text}</h3>
            ) : block.type === 'quote' ? (
              <blockquote key={index}>{block.text}</blockquote>
            ) : block.type === 'photoMemo' ? (
              <p key={index} className={styles.photoMemo}>
                사진 메모 · {block.caption}
              </p>
            ) : (
              <p key={index}>{block.text}</p>
            ),
          )}
        </div>
      </section>
      <section className={styles.detailSection} aria-labelledby="story-experience">
        <h2 id="story-experience" className={ui.sectionTitle}>
          Mentor 대표 경험
        </h2>
        <p>{representative ?? 'Mentor 정보 없음'}</p>
      </section>
    </>
  )
}

function RecordBody({ item, onOpenCase }: { item: Extract<MentorContentItem, { type: 'record' }>; onOpenCase: (caseId: string) => void }) {
  const record = item.detail
  return (
    <>
      <section className={styles.detailSection} aria-labelledby="record-text">
        <h2 id="record-text" className={ui.sectionTitle}>
          기록 문장
        </h2>
        <p className={styles.reviewedBanner}>
          개인정보 제거 · 검수 완료 · 고{record.grade}
          {record.semester ? ` ${record.semester}학기` : ''} · {record.areaLabel} · {record.subjectOrActivity}
        </p>
        <blockquote className={styles.recordText}>{record.recordText}</blockquote>
        <p className={ui.cellSub}>Record 원본 파일은 공개하지 않아요. 읽기 전용 문장만 있고 내려받을 수 없어요.</p>
      </section>
      <section className={styles.detailSection} aria-labelledby="record-activity">
        <h2 id="record-activity" className={ui.sectionTitle}>
          연결된 활동
        </h2>
        <div className={styles.highlightBox}>
          <p className={ui.cellMain}>{record.linkedActivity.title}</p>
          <p className={ui.cellSub}>{record.linkedActivity.description}</p>
          {record.linkedActivity.caseId && (
            <button type="button" className={`${ui.secondaryButton} ${ui.smallButton}`} onClick={() => onOpenCase(record.linkedActivity.caseId!)}>
              Activity Case 보기
            </button>
          )}
        </div>
      </section>
      <section className={styles.detailSection} aria-labelledby="record-note">
        <h2 id="record-note" className={ui.sectionTitle}>
          Mentor 메모
        </h2>
        <p>{record.mentorNote}</p>
      </section>
    </>
  )
}
