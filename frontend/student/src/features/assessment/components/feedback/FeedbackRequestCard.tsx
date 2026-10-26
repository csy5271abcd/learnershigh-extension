import { Link } from 'react-router'
import type { FeedbackComment } from '../../api/types.ts'
import { formatDateTime } from '../../model/assessmentDetailView.ts'
import {
  commentLocationLabel,
  recommendationLabel,
  snapshotFileLabel,
  type FeedbackListEntry,
} from '../../model/feedbackListView.ts'
import { schoolAssessmentFeedbackPath } from '../../routes/paths.ts'
import { ChevronRightIcon, ClipboardIcon, ClockIcon, NoteIcon, UserIcon } from '../AssessmentIcons.tsx'
import styles from './feedback.module.css'

interface FeedbackRequestCardProps {
  entry: FeedbackListEntry
  onOpenSnapshot: () => void
  onUnavailable: (message: string) => void
}

// 요청 1건 (Mockup TF-LIST-01~03). 위: 과제 이름 → 과제 상세(피드백 탭), 카드: 상태·요청 시각·보낸 자료·답변.
// Mockup의 선생님 이름, 시연 버튼, "잘한 점/보완하면 좋을 점/복습할 개념/다음 학습 활동" 항목은 계약(§32)에 없어
// 표시하지 않는다 (MM-10·23·24). 답변은 §32의 전체 의견·위치별 의견·후속 추천만 보여준다.
export function FeedbackRequestCard({ entry, onOpenSnapshot, onUnavailable }: FeedbackRequestCardProps) {
  const { request, reply, assessment, noteRevision, files } = entry
  const delivered = request.status === 'DELIVERED' && reply?.reply

  return (
    <article className={styles.entry} aria-labelledby={`fb-${request.requestId}-title`}>
      <h2 id={`fb-${request.requestId}-title`} className={styles.entryTitle}>
        <ClipboardIcon size={14} />
        {assessment ? (
          <Link to={schoolAssessmentFeedbackPath(assessment.assessmentId)} className={styles.entryLink}>
            {assessment.title}
            <ChevronRightIcon size={14} className={styles.entryChevron} />
          </Link>
        ) : (
          <span className={styles.entryUnknown}>연결된 과제를 확인할 수 없어요</span>
        )}
      </h2>

      <div className={styles.card}>
        <p className={styles.cardHead}>
          <span className={styles.statusBadge} data-tone={request.status === 'PENDING' ? 'blue' : 'green'}>
            {request.status === 'PENDING' ? '답변 대기' : '답변 완료'}
          </span>
          <span className={styles.meta}>{formatDateTime(request.requestedAt)} 요청</span>
        </p>

        <p className={styles.sentLabel} id={`fb-${request.requestId}-sent`}>
          보낸 자료
        </p>
        <ul className={styles.chips} aria-labelledby={`fb-${request.requestId}-sent`}>
          <li>
            <button type="button" className={styles.chip} onClick={onOpenSnapshot} aria-haspopup="dialog">
              <NoteIcon size={11} />
              {noteRevision
                ? `탐구 노트 v${noteRevision.revisionNumber} · ${noteRevision.blocks.length}블록`
                : '탐구 노트 · 버전 정보를 찾을 수 없어요'}
            </button>
          </li>
          {files.map((file) => (
            <li key={file.versionId}>
              <button type="button" className={styles.chip} onClick={onOpenSnapshot} aria-haspopup="dialog">
                <NoteIcon size={11} />
                {snapshotFileLabel(file)}
              </button>
            </li>
          ))}
        </ul>

        <hr className={styles.divider} />

        {delivered ? (
          <ReplyView entry={entry} onUnavailable={onUnavailable} />
        ) : (
          <p className={styles.waiting}>
            <ClockIcon size={14} />
            선생님의 답변을 기다리고 있어요
          </p>
        )}
      </div>
    </article>
  )
}

function ReplyView({ entry, onUnavailable }: { entry: FeedbackListEntry; onUnavailable: (message: string) => void }) {
  const reply = entry.reply?.reply
  if (!reply) return null
  const targetLabel = (comment: FeedbackComment) => {
    if (comment.noteRevisionId) {
      return `탐구 노트 v${entry.noteRevision?.revisionId === comment.noteRevisionId ? entry.noteRevision.revisionNumber : '?'}`
    }
    const file = entry.files.find((item) => item.versionId === comment.artifactVersionId)
    return file?.artifact && file.version ? `${file.artifact.title} v${file.version.versionNumber}` : '결과 파일'
  }

  return (
    <div className={styles.reply}>
      <p className={styles.replyAuthor}>
        <span className={styles.avatar} aria-hidden="true">
          <UserIcon size={14} />
        </span>
        <span className={styles.replyName}>선생님 답변</span>
        {entry.reply?.deliveredAt && <span className={styles.meta}>{formatDateTime(entry.reply.deliveredAt)}</span>}
      </p>
      <p className={styles.replyText}>{reply.overallComment}</p>

      {reply.comments.length > 0 && (
        <dl className={styles.comments} aria-label="부분별 의견">
          {reply.comments.map((comment) => (
            <div key={comment.commentId} className={styles.commentRow}>
              <dt>
                {targetLabel(comment)} · {commentLocationLabel(comment.location)}
              </dt>
              <dd>{comment.text}</dd>
            </div>
          ))}
        </dl>
      )}

      {reply.recommendations.map((recommendation, index) => (
        <section key={index} className={styles.recommendation} aria-label={recommendationLabel(recommendation.type)}>
          <p className={styles.recommendationLabel}>{recommendationLabel(recommendation.type)} · 선택 사항이에요</p>
          <p className={styles.recommendationText}>{recommendation.note}</p>
          <div className={styles.recommendationActions}>
            <button
              type="button"
              className={styles.smallButton}
              aria-disabled="true"
              onClick={() => onUnavailable('추천을 확인했다는 기록은 아직 저장할 수 없어요. (계약 미정)')}
            >
              참고만 하기
            </button>
            <button
              type="button"
              className={styles.smallButton}
              aria-disabled="true"
              onClick={() => onUnavailable('탐구 노트 편집 기능이 준비되면 메모를 추가할 수 있어요.')}
            >
              노트에 메모 추가
            </button>
            {recommendation.type === 'ENRICHMENT_TASK' && (
              <button
                type="button"
                className={styles.smallPrimaryButton}
                aria-disabled="true"
                onClick={() => onUnavailable('심화 탐구 화면이 준비되면 여기서 바로 시작할 수 있어요.')}
              >
                심화 탐구로 시작
              </button>
            )}
          </div>
        </section>
      ))}
    </div>
  )
}
