import { useRef, useState } from 'react'
import { createFeedbackRequest } from '../../api/assessmentDetailApi.ts'
import { toApiError } from '../../api/apiError.ts'
import type { Artifact, ArtifactVersion, AssessmentNote, FeedbackReplyResponse, FeedbackRequest } from '../../api/types.ts'
import { formatDateTime, isSameSnapshot } from '../../model/assessmentDetailView.ts'
import type { QueryResult, QueryStatus } from '../../model/useApiQuery.ts'
import { AlertIcon, ClipboardIcon, ClockIcon, FileIcon, HistoryIcon, NoteIcon, SendIcon } from '../AssessmentIcons.tsx'
import { ErrorState, LoadingRows } from '../StateViews.tsx'
import styles from './detail.module.css'

export interface FeedbackHistoryItem {
  request: FeedbackRequest
  reply: FeedbackReplyResponse | null
}

export interface FeedbackHistory {
  items: FeedbackHistoryItem[]
  /** revisionId → revisionNumber (Snapshot 표시용) */
  revisionNumbers: Record<string, number>
}

export interface SelectedArtifactVersion {
  artifact: Artifact
  version: ArtifactVersion
}

interface FeedbackTabProps {
  assessmentId: string
  note: AssessmentNote | undefined
  selections: SelectedArtifactVersion[]
  /** 결과 파일 목록 조회 상태. 확인되기 전에는 요청하지 않는다 (불러오는 중에 보내면 파일이 Snapshot에서 빠진다). */
  artifactsStatus: QueryStatus
  /** versionId → 결과물·버전 (요청 기록 표시용) */
  versionsById: Record<string, SelectedArtifactVersion>
  history: QueryResult<FeedbackHistory>
  onSent: (request: FeedbackRequest) => void
}

// 선생님께 피드백 요청 (Mockup SA-DETAIL-10·13, assessment-feedback.md §4·§8, api-contract.md §31·32).
// 질문 입력 없이 요청한다. 요청 시점의 노트 Revision과 선택한 파일 버전이 Snapshot으로 고정된다.
// Mockup의 "받는 분 OOO 선생님"·학생 정보·첨부·참고자료 줄은 계약에 없어 표시하지 않는다 (MM-04·10).
export function FeedbackTab({ assessmentId, note, selections, artifactsStatus, versionsById, history, onSent }: FeedbackTabProps) {
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string>()
  const sendingRef = useRef(false)

  const snapshot = note
    ? { noteRevisionId: note.revisionId, artifactVersionIds: selections.map((selection) => selection.version.versionId) }
    : undefined
  // 같은 범위로 보낸 요청이 답변 대기 중이면 중복 생성하지 않는다 (feedback §4). 다른 범위 재요청 정책은 미정(API-OD-A06).
  const duplicatePending =
    snapshot && history.data?.items.some((item) => item.request.status === 'PENDING' && isSameSnapshot(item.request.snapshot, snapshot))

  const disabledReason = !note
    ? '저장된 탐구 노트가 있어야 요청할 수 있어요.'
    : artifactsStatus === 'loading'
      ? '결과 파일 목록을 불러오는 중이에요.'
      : artifactsStatus === 'error'
        ? '결과 파일 목록을 불러오지 못했어요. 결과물 영역에서 다시 시도한 뒤 요청할 수 있어요.'
        : duplicatePending
      ? '같은 노트·파일 버전으로 보낸 요청이 답변을 기다리고 있어요.'
      : undefined

  const send = async () => {
    if (!snapshot || disabledReason || sendingRef.current) return
    sendingRef.current = true
    setSending(true)
    setError(undefined)
    try {
      const request = await createFeedbackRequest({ sourceType: 'SCHOOL_ASSESSMENT', sourceId: assessmentId, ...snapshot })
      onSent(request)
    } catch (caught) {
      const apiError = toApiError(caught)
      setError(`${apiError.message} 다시 시도해 주세요. (${apiError.code})`)
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }

  return (
    <div className={styles.panelStack}>
      <p className={styles.panelIntro}>
        버튼 하나로 지금까지 작성한 수행평가 자료를 선생님께 보내요. 요청은 선택 사항이고, 요청과 상관없이 과제를 자유롭게
        진행하고 완료할 수 있어요.
      </p>

      <div className={styles.feedbackCard}>
        <span className={styles.statusPill} data-tone="neutral">
          요청 전
        </span>
        <p className={styles.cardHeading}>함께 전달되는 자료</p>
        <ul className={styles.materialList}>
          <li>
            <ClipboardIcon size={14} />
            수행평가 정보
          </li>
          <li>
            <NoteIcon size={14} />
            {note ? `탐구 노트 v${note.revisionNumber} · 블록 ${note.blocks.length}개` : '탐구 노트 없음'}
          </li>
          <li>
            <FileIcon size={14} />
            {selections.length === 0
              ? '결과 파일 없음 (노트만 보내도 돼요)'
              : `결과 파일 ${selections.length}개 · ${selections.map(({ artifact, version }) => `${artifact.title} v${version.versionNumber}`).join(', ')}`}
          </li>
          <li>
            <HistoryIcon size={14} />
            요청 시점의 노트·파일 버전과 시각
          </li>
        </ul>
        {error && (
          <p className={styles.inlineError} role="alert">
            <AlertIcon size={14} />
            {error}
          </p>
        )}
        <button
          type="button"
          className={styles.primaryWideButton}
          disabled={sending || disabledReason !== undefined}
          aria-busy={sending}
          aria-describedby={disabledReason ? 'feedback-disabled-reason' : undefined}
          onClick={send}
        >
          <SendIcon size={16} />
          {sending ? '보내는 중…' : duplicatePending ? '답변을 기다리는 중이에요' : '선생님께 피드백 요청'}
        </button>
        {disabledReason && (
          <p id="feedback-disabled-reason" className={styles.cardHint}>
            {disabledReason}
          </p>
        )}
        {selections.length > 0 && !disabledReason && (
          <p className={styles.cardHint}>보낼 파일 버전은 결과물의 ‘버전 기록’에서 바꿀 수 있어요.</p>
        )}
      </div>

      <section aria-labelledby="feedback-history-heading" className={styles.historySection}>
        <h3 id="feedback-history-heading" className={styles.cardHeading}>
          요청 기록
        </h3>
        {history.status === 'loading' && <LoadingRows rows={2} label="요청 기록을 불러오는 중" />}
        {history.status === 'error' && history.error && (
          <ErrorState title="요청 기록을 불러오지 못했어요" error={history.error} onRetry={history.retry} />
        )}
        {history.data && history.data.items.length === 0 && <p className={styles.historyEmpty}>아직 보낸 요청이 없어요</p>}
        {history.data && history.data.items.length > 0 && (
          <ul className={styles.historyList}>
            {history.data.items.map(({ request, reply }) => (
              <li key={request.requestId} className={styles.feedbackCard}>
                <p className={styles.historyHeader}>
                  <span className={styles.statusPill} data-tone={request.status === 'PENDING' ? 'blue' : 'green'}>
                    {request.status === 'PENDING' ? '답변 대기' : '답변 완료'}
                  </span>
                  <span className={styles.cardHint}>{formatDateTime(request.requestedAt)} 요청</span>
                </p>
                <p className={styles.historyLabel}>보낸 자료</p>
                <ul className={styles.snapshotList}>
                  <li>
                    <NoteIcon size={12} />
                    탐구 노트 v{history.data?.revisionNumbers[request.snapshot.noteRevisionId] ?? '?'}
                  </li>
                  {request.snapshot.artifactVersionIds.map((versionId) => {
                    const entry = versionsById[versionId]
                    return (
                      <li key={versionId}>
                        <FileIcon size={12} />
                        {entry
                          ? `결과 파일 · ${entry.artifact.title} v${entry.version.versionNumber} (${entry.version.file.fileName})`
                          : '결과 파일 · 버전 정보를 찾을 수 없어요'}
                      </li>
                    )
                  })}
                </ul>
                {request.status === 'PENDING' || !reply?.reply ? (
                  <p className={styles.waitingLine}>
                    <ClockIcon size={14} />
                    선생님의 답변을 기다리고 있어요
                  </p>
                ) : (
                  <div className={styles.replyBox}>
                    <p className={styles.replyMeta}>
                      선생님 답변{reply.deliveredAt ? ` · ${formatDateTime(reply.deliveredAt)}` : ''}
                    </p>
                    <p className={styles.replyText}>{reply.reply.overallComment}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
