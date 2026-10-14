import { useState } from 'react'
import { activityStatusLabel, activityTypeLabel } from '../fixtures/adminActivities.fixture.ts'
import type { ActivityReflection, AdminActivity } from '../fixtures/types.ts'
import { formatDateTime, formatMonthDay } from '../read-model/time.ts'
import { FileList, FilePreviewDialog } from './AdminFilePreview.tsx'
import { Badge } from './AdminUi.tsx'
import ui from './AdminUi.module.css'
import type { PreviewFile } from './filePreview.ts'
import styles from './Inspector.module.css'

/*
 * Growth Activity 상세 보기 (Activity Feedback Review LEFT · Admin Activity Inspector 공통, 읽기 전용)
 * 기본 정보 · 활동 과정 · 과정 자료 · 결과 · Reflection 7문항 · 전달된 피드백. 학생 원문 그대로 보여주고 빈 항목은 "미작성"이다.
 * Activity 과정 자료는 Task Evidence와 다른 저장소다. (섞지 않는다)
 */

const reflectionQuestions: { key: keyof ActivityReflection; question: string }[] = [
  { key: 'participationReason', question: '왜 참여했나요?' },
  { key: 'role', question: '내가 맡은 역할은 무엇이었나요?' },
  { key: 'whatIDid', question: '실제로 무엇을 했나요?' },
  { key: 'difficulty', question: '가장 어려웠던 점은 무엇이었나요?' },
  { key: 'learning', question: '무엇을 배우거나 새롭게 알게 되었나요?' },
  { key: 'nextChange', question: '다음번에는 무엇을 바꾸고 싶나요?' },
  { key: 'followUpActivity', question: '후속 활동이 있다면 무엇인가요?' },
]

const feedbackFields = [
  { key: 'strength', label: '잘 드러난 점' },
  { key: 'needsDetail', label: '조금 더 구체화할 점' },
  { key: 'question', label: '생각해볼 질문' },
  { key: 'nextSuggestion', label: '다음 활동 제안' },
] as const

function Answer({ value }: { value: string }) {
  return value.trim() ? <dd>{value}</dd> : <dd className={styles.empty}>미작성</dd>
}

export function ActivityInspector({ activity, showFeedback = true }: { activity: AdminActivity; showFeedback?: boolean }) {
  const [preview, setPreview] = useState<PreviewFile | null>(null)
  const createdAt = `${activity.endDate || activity.startDate}`
  const files: PreviewFile[] = activity.files.map((name) => ({ name, subtitle: `성장활동 자료 · ${formatMonthDay(createdAt)}`, backing: activity.fileBackings?.[name] }))
  return (
    <div className={styles.inspector}>
      <section className={styles.section} aria-labelledby={`activity-basic-${activity.activityId}`}>
        <h3 id={`activity-basic-${activity.activityId}`} className={styles.subHead}>
          기본 정보
        </h3>
        <dl className={styles.facts}>
          <div>
            <dt>유형</dt>
            <dd>{activityTypeLabel[activity.type]}</dd>
          </div>
          <div>
            <dt>활동명</dt>
            <dd>{activity.title}</dd>
          </div>
          <div>
            <dt>주최 · 소속</dt>
            <dd>{activity.organizer || '미작성'}</dd>
          </div>
          <div>
            <dt>기간</dt>
            <dd>{activity.endDate ? `${formatMonthDay(activity.startDate)} ~ ${formatMonthDay(activity.endDate)}` : formatMonthDay(activity.startDate)}</dd>
          </div>
          <div>
            <dt>맡은 역할</dt>
            <dd>{activity.role || '미작성'}</dd>
          </div>
          <div>
            <dt>상태</dt>
            <dd>
              <Badge tone={activity.status === 'archived' ? 'accent' : activity.status === 'feedback-waiting' ? 'warning' : undefined}>{activityStatusLabel[activity.status]}</Badge>
            </dd>
          </div>
          <div>
            <dt>Tag</dt>
            <dd>{activity.tags && activity.tags.length > 0 ? activity.tags.map((tag) => `#${tag}`).join(' ') : '없음'}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.section} aria-labelledby={`activity-process-${activity.activityId}`}>
        <h3 id={`activity-process-${activity.activityId}`} className={styles.subHead}>
          활동 과정 (학생 기록 원문)
        </h3>
        <dl className={styles.qa}>
          <dt>참여 이유</dt>
          <Answer value={activity.participationReason} />
          <dt>진행 과정</dt>
          <Answer value={activity.process} />
          <dt>나의 기여</dt>
          <Answer value={activity.contribution} />
          <dt>결과</dt>
          <Answer value={activity.result} />
          <dt>후속 계획</dt>
          <Answer value={activity.followUp} />
        </dl>
      </section>

      <section className={styles.section} aria-labelledby={`activity-files-${activity.activityId}`}>
        <h3 id={`activity-files-${activity.activityId}`} className={styles.subHead}>
          과정 자료 {activity.files.length}개
        </h3>
        <FileList label="성장활동 과정 자료" files={files} onOpen={setPreview} emptyText="올린 자료가 없어요." />
      </section>

      <section className={styles.section} aria-labelledby={`activity-reflection-${activity.activityId}`}>
        <h3 id={`activity-reflection-${activity.activityId}`} className={styles.subHead}>
          Reflection {activity.reflection ? `(${reflectionQuestions.filter((item) => activity.reflection![item.key].trim()).length}/7 작성)` : ''}
        </h3>
        {activity.reflection ? (
          <dl className={styles.qa}>
            {reflectionQuestions.map((item) => (
              <div key={item.key}>
                <dt>{item.question}</dt>
                <Answer value={activity.reflection![item.key]} />
              </div>
            ))}
          </dl>
        ) : (
          <p className={ui.muted}>아직 Reflection을 쓰지 않았어요. (7문항 모두 미작성 · 학생이 직접 작성해요)</p>
        )}
      </section>

      {showFeedback && (
        <section className={styles.section} aria-labelledby={`activity-feedback-${activity.activityId}`}>
          <h3 id={`activity-feedback-${activity.activityId}`} className={styles.subHead}>
            전달된 선생님 피드백
          </h3>
          {activity.feedback ? (
            <>
              <p className={ui.cellSub}>
                {activity.feedback.author} · {formatDateTime(activity.feedback.deliveredAt)} 전달{activity.feedback.parentReportCandidate ? ' · Parent Report 공개 후보' : ''}
              </p>
              <dl className={styles.qa}>
                {feedbackFields.map((field) => (
                  <div key={field.key}>
                    <dt>{field.label}</dt>
                    <Answer value={activity.feedback![field.key]} />
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className={ui.muted}>{activity.status === 'feedback-waiting' ? '학생이 피드백을 요청했고 아직 전달 전이에요.' : '전달된 피드백이 없어요.'}</p>
          )}
        </section>
      )}
      <FilePreviewDialog file={preview} onClose={() => setPreview(null)} />
    </div>
  )
}
