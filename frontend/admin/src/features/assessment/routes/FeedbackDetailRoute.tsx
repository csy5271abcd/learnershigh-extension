import { useRef, useState } from 'react'
import { navigate } from '../../../app/adminLocation.ts'
import { deliverReply, downloadArtifactVersion, getFeedbackRequest, listScraps, previewArtifactVersion, saveReplyDraft } from '../api/assessmentAdminApi.ts'
import { openBlob, saveBlob } from '../model/blobActions.ts'
import { AttachmentPreviewModal } from '../components/AttachmentPreviewModal.tsx'
import type { AdminFeedbackDetail, FeedbackRecommendation, FeedbackReplyDraft, NoteBlock } from '../api/types.ts'
import { DetailHead, ReadOnlyMark, RemoteView } from '../components/AdminParts.tsx'
import { AlertIcon, CloseIcon, Modal, SendIcon, Toast, type ToastMessage } from '../components/canonicalUi.ts'
import { NoteReadView } from '../components/NoteReadView.tsx'
import { dateTimeLabel, feedbackStatusLabels, fileSizeLabel, nextToastId, sourceTypeLabels } from '../model/adminFormat.ts'
import { useCommand, useRemote } from '../model/useRemote.ts'
import styles from '../styles/assessmentAdmin.module.css'
import { paths } from './paths.ts'

type DraftComment = FeedbackReplyDraft['comments'][number] & { label: string }

// AD-15 피드백 작성 (AM-06) · AD-16 후속 추천.
// 가운데: 요청 당시 Snapshot(NoteRevision·선택한 파일 버전)만 읽기 전용으로 보인다. 최신 노트로 갈아끼우지 않는다.
// 오른쪽: 전체 의견·위치별 의견·후속 추천 작성 → 임시 저장(요청은 계속 PENDING) → 전달(DELIVERED). 승인·반려·필수 재제출 없음.
export function FeedbackDetailRoute({ requestId }: { requestId: string }) {
  const detail = useRemote(() => getFeedbackRequest(requestId), [requestId])
  // 전달 뒤 상세를 다시 읽어도 결과 안내가 사라지지 않게 Toast는 이 단계에 둔다
  const [toast, setToast] = useState<ToastMessage | null>(null)
  return (
    <div className={styles.detail}>
      <RemoteView state={detail.state} label="피드백 요청" onRetry={detail.reload}>
        {(data) => <FeedbackWorkspace key={`${data.requestId}:${data.status}`} detail={data} onDelivered={detail.reload} onToast={setToast} />}
      </RemoteView>
      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}

function FeedbackWorkspace({ detail, onDelivered, onToast: setToast }: { detail: AdminFeedbackDetail; onDelivered: () => void; onToast: (toast: ToastMessage) => void }) {
  const delivered = detail.status === 'DELIVERED'
  const [overall, setOverall] = useState(detail.draft?.overallComment ?? '')
  const [comments, setComments] = useState<DraftComment[]>(() =>
    (detail.draft?.comments ?? []).map((comment) => ({ ...comment, label: comment.location?.type === 'NOTE_BLOCK' ? '노트 블록' : comment.location?.type === 'PDF_PAGE' ? `PDF ${comment.location.pageNumber}쪽` : '파일 전체' })),
  )
  const [recommendations, setRecommendations] = useState<FeedbackRecommendation[]>(detail.draft?.recommendations ?? [])
  const [savedAt, setSavedAt] = useState(detail.draft?.savedAt ?? null)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sideTab, setSideTab] = useState<'write' | 'delivered'>(delivered ? 'delivered' : 'write')
  const overallRef = useRef<HTMLTextAreaElement>(null)
  const { run, pending } = useCommand()

  const touch = () => setDirty(true)
  const draftBody = (): FeedbackReplyDraft => ({ overallComment: overall, comments: comments.map(({ label: _label, ...comment }) => comment), recommendations })
  const commentedBlockIds = new Set(comments.flatMap((comment) => (comment.location?.blockId ? [comment.location.blockId] : [])))

  const addBlockComment = (block: NoteBlock) => {
    if (delivered || !detail.snapshotRevision) return
    setComments((list) => [...list, { targetType: 'NOTE', noteRevisionId: detail.snapshotRevision?.revisionId, location: { type: 'NOTE_BLOCK', blockId: block.blockId }, text: '', label: `노트 · ${block.text.slice(0, 24)}` }])
    touch()
  }

  const addFileComment = (versionId: string, title: string, isPdf: boolean, page: number | null) => {
    setComments((list) => [
      ...list,
      {
        targetType: isPdf ? 'PDF' : 'FILE',
        artifactVersionId: versionId,
        // 위치를 보장하는 뷰어가 없는 형식은 파일 전체 의견만 허용한다 (§45 location=null)
        location: isPdf && page ? { type: 'PDF_PAGE', pageNumber: page } : null,
        text: '',
        label: isPdf && page ? `${title} · ${page}쪽` : `${title} · 파일 전체`,
      },
    ])
    touch()
  }

  const save = async () => {
    setError(null)
    const outcome = await run(() => saveReplyDraft(detail.requestId, draftBody()))
    if (!outcome) return
    if (outcome.ok) {
      setSavedAt(outcome.value.savedAt)
      setDirty(false)
      setToast({ id: nextToastId(), tone: 'success', text: '임시 저장했어요. 학생에게는 아직 보이지 않아요.' })
    } else setError(`${outcome.error.message} (${outcome.error.code})`)
  }

  const deliver = async () => {
    setError(null)
    const body = draftBody()
    // 내용 없는 위치별 의견은 학생에게 보내지 않는다
    const outcome = await run(() => deliverReply(detail.requestId, { ...body, comments: body.comments.filter((comment) => comment.text.trim()) }))
    if (!outcome) return
    setConfirmOpen(false)
    if (outcome.ok) {
      setToast({ id: nextToastId(), tone: 'success', text: '학생에게 피드백을 전달했어요.' })
      onDelivered()
    } else setError(`${outcome.error.message} (${outcome.error.code})`)
  }

  const sameAsLatest = detail.snapshotRevision && detail.latestRevisionNumber === detail.snapshotRevision.revisionNumber

  return (
    <>
      <DetailHead trail={`Assessment 관리 / 피드백 관리 / ${detail.student.displayName}`} title={detail.sourceTitle} backTo={paths.feedback}>
        <span className={styles.muted}>{sourceTypeLabels[detail.sourceType]}</span>
        <span className={styles.badge} data-tone={delivered ? 'success' : 'primary'}>
          {feedbackStatusLabels[detail.status]}
        </span>
      </DetailHead>
      <div className={`${styles.split} ${styles.splitWide}`}>
        <div className={styles.pane}>
          <div className={styles.paneInner}>
            <div className={styles.studentLine}>
              <span>
                {detail.student.displayName} · {detail.student.school.name} {detail.student.grade}학년 · {detail.subjectName ?? '과목 없음'}
              </span>
              <ReadOnlyMark />
            </div>
            <div className={styles.boxSubtle} role="note">
              {detail.snapshotRevision ? (
                <>
                  요청 당시 노트(v{detail.snapshotRevision.revisionNumber}){sameAsLatest ? '와 최신 노트가 같아요.' : `를 보여줘요. 학생이 이후 v${detail.latestRevisionNumber}까지 고쳤지만 이 피드백은 요청 당시 내용에 답해요.`}{' '}
                  <button type="button" className={styles.linkButton} onClick={() => navigate(paths.record(detail.student.studentId, detail.sourceType === 'SCHOOL_ASSESSMENT' ? 'school' : 'enrichment', detail.sourceId))}>
                    학생 기록 전체 보기
                  </button>
                </>
              ) : (
                '요청 당시 노트를 찾을 수 없어요.'
              )}
            </div>

            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>탐구 노트 (요청 당시)</h3>
              {!delivered && <span className={styles.hint}>블록별 &lsquo;의견&rsquo;으로 위치별 의견</span>}
            </div>
            {detail.snapshotRevision && <NoteReadView blocks={detail.snapshotRevision.blocks} onCommentBlock={delivered ? undefined : addBlockComment} commentedBlockIds={commentedBlockIds} />}

            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>요청에 포함한 파일</h3>
            </div>
            {detail.snapshotVersions.length === 0 ? (
              <p className={styles.muted}>파일 없이 노트만 보냈어요.</p>
            ) : (
              <ul className={styles.listPlain}>
                {detail.snapshotVersions.map((version) => (
                  <SnapshotFile key={version.versionId} version={version} disabled={delivered} onComment={addFileComment} />
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className={styles.side} aria-label="피드백 작성">
          <div className={styles.sideTabs} role="tablist">
            {!delivered && (
              <button type="button" role="tab" aria-selected={sideTab === 'write'} aria-current={sideTab === 'write' ? 'page' : undefined} className={styles.subTab} onClick={() => setSideTab('write')}>
                피드백 작성
              </button>
            )}
            <button type="button" role="tab" aria-selected={sideTab === 'delivered'} aria-current={sideTab === 'delivered' ? 'page' : undefined} className={styles.subTab} onClick={() => setSideTab('delivered')}>
              {delivered ? '전달한 피드백' : '이전 피드백 0'}
            </button>
          </div>
          <div className={styles.sideBody}>
            <div className={styles.boxSubtle} style={{ marginBottom: 14 }}>
              <strong>
                {detail.student.displayName} · {dateTimeLabel(detail.requestedAt)} 요청 · 노트 v{detail.snapshotRevision?.revisionNumber ?? '?'} · 파일 {detail.snapshotVersions.length}개
              </strong>
              <p className={styles.muted} style={{ marginTop: 4 }}>
                질문 없음 · 자료 전체 피드백 요청
              </p>
            </div>
            {sideTab === 'delivered' || delivered ? (
              detail.reply ? (
                <DeliveredReply detail={detail} />
              ) : (
                <p className={styles.muted}>아직 전달한 피드백이 없어요.</p>
              )
            ) : (
              <div className={styles.form}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="overall-comment">
                    선생님 의견
                  </label>
                  <textarea
                    id="overall-comment"
                    ref={overallRef}
                    className={styles.textarea}
                    style={{ minHeight: 120 }}
                    value={overall}
                    maxLength={4000}
                    placeholder="학생에게 전달할 의견을 자유롭게 적어 주세요"
                    onChange={(event) => {
                      setOverall(event.target.value)
                      touch()
                    }}
                  />
                  <div className={styles.chips} aria-label="항목 추가 (선택)">
                    {['잘한 점', '보완할 점', '다음 학습 방향'].map((label) => (
                      <button
                        key={label}
                        type="button"
                        className={styles.chip}
                        onClick={() => {
                          setOverall((value) => `${value}${value && !value.endsWith('\n') ? '\n' : ''}[${label}] `)
                          touch()
                          overallRef.current?.focus()
                        }}
                      >
                        + {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.field}>
                  <span className={styles.label}>위치별 의견 {comments.length > 0 && `${comments.length}개`}</span>
                  {comments.length === 0 && <p className={styles.hint}>노트 블록 &lsquo;의견&rsquo; · 파일 &lsquo;파일 의견&rsquo;으로 추가</p>}
                  {comments.map((comment, index) => (
                    <div key={index} className={styles.box} style={{ padding: 10 }}>
                      <div className={styles.studentLine} style={{ marginBottom: 6 }}>
                        <span className={styles.badge}>{comment.label}</span>
                        <button
                          type="button"
                          className={styles.ghostButton}
                          style={{ height: 24, padding: '0 6px' }}
                          aria-label={`${comment.label} 의견 삭제`}
                          onClick={() => {
                            setComments((list) => list.filter((_, position) => position !== index))
                            touch()
                          }}
                        >
                          <CloseIcon size={14} />
                        </button>
                      </div>
                      <textarea
                        className={styles.textarea}
                        style={{ minHeight: 60 }}
                        aria-label={`${comment.label} 의견`}
                        value={comment.text}
                        onChange={(event) => {
                          const text = event.target.value
                          setComments((list) => list.map((item, position) => (position === index ? { ...item, text } : item)))
                          touch()
                        }}
                      />
                    </div>
                  ))}
                </div>

                <Recommendations value={recommendations} onChange={(next) => { setRecommendations(next); touch() }} />
                {error && (
                  <p className={styles.formError} role="alert">
                    <AlertIcon size={15} /> {error}
                  </p>
                )}
              </div>
            )}
          </div>
          {!delivered && sideTab === 'write' && (
            <div className={styles.sideFooter}>
              <span className={styles.hint} style={{ marginRight: 'auto' }} aria-live="polite">
                {dirty ? '저장하지 않은 변경이 있어요' : savedAt ? `${dateTimeLabel(savedAt)} 임시 저장됨` : ''}
              </span>
              <button type="button" className={styles.secondaryButton} onClick={save} disabled={pending || (!dirty && Boolean(savedAt))}>
                {pending ? '저장 중…' : '임시 저장'}
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => setConfirmOpen(true)}
                disabled={pending || (!overall.trim() && !comments.some((comment) => comment.text.trim()))}
                title={!overall.trim() && !comments.some((comment) => comment.text.trim()) ? '의견을 하나 이상 적어 주세요' : undefined}
              >
                <SendIcon size={15} /> 보내기
              </button>
            </div>
          )}
        </aside>
      </div>
      {confirmOpen && (
        <Modal
          title="학생에게 피드백을 보낼까요?"
          compact
          onRequestClose={() => !pending && setConfirmOpen(false)}
          footer={
            <>
              <button type="button" className={styles.secondaryButton} onClick={() => setConfirmOpen(false)} disabled={pending}>
                취소
              </button>
              <button type="button" className={styles.primaryButton} onClick={deliver} disabled={pending} aria-busy={pending}>
                {pending ? '보내는 중…' : '보내기'}
              </button>
            </>
          }
        >
          <p className={styles.notePara}>전달 즉시 학생 공개 · 전달 뒤 수정 불가(재답변 정책 미정, API-OD-A06) · 학생 노트·파일 변경 없음</p>
          {error && (
            <p className={styles.formError} role="alert" style={{ marginTop: 10 }}>
              <AlertIcon size={15} /> {error}
            </p>
          )}
        </Modal>
      )}
    </>
  )
}

function SnapshotFile({
  version,
  disabled,
  onComment,
}: {
  version: AdminFeedbackDetail['snapshotVersions'][number]
  disabled: boolean
  onComment: (versionId: string, title: string, isPdf: boolean, page: number | null) => void
}) {
  const isPdf = version.file.contentType === 'application/pdf'
  const [page, setPage] = useState(1)
  // A28-41: 요청 당시 버전 파일은 서버 Storage 에 있다(§26) — 읽기 전용으로 열고 내려받는다
  const [fileError, setFileError] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const fileAction = (action: () => Promise<void>) => {
    setFileError(null)
    action().catch((cause: unknown) => setFileError(cause instanceof Error ? cause.message : '파일을 열지 못했어요.'))
  }
  return (
    <li className={styles.listRow}>
      <span>
        <span className={styles.badge}>v{version.versionNumber}</span> {version.artifactTitle} · {version.file.fileName}
        <span className={styles.cellSub}>
          {fileSizeLabel(version.file.sizeBytes)} · {dateTimeLabel(version.uploadedAt)} · {version.previewSupported ? '앱 안 미리보기 가능' : '미리보기 미지원 형식 · 내려받아 확인'}
        </span>
        <span className={styles.actions} style={{ marginTop: 4 }}>
          {/* A28-44: 같은 화면에서 바로 미리보기(이미지·PDF). 그 밖 형식은 창에서 '미리보기 미지원 · 내려받기' */}
          <button type="button" className={styles.linkButton} onClick={() => setPreviewing(true)} data-testid="feedback-snapshot-file-preview">
            미리보기
          </button>
          {version.previewSupported && (
            <button type="button" className={styles.linkButton} onClick={() => fileAction(async () => openBlob(await previewArtifactVersion(version.artifactId, version.versionId)))} data-testid="feedback-snapshot-file-open">
              새 탭 ↗
            </button>
          )}
          <button type="button" className={styles.linkButton} onClick={() => fileAction(async () => saveBlob(await downloadArtifactVersion(version.artifactId, version.versionId), version.file.fileName))} data-testid="feedback-snapshot-file-download">
            내려받기
          </button>
        </span>
        {fileError && (
          <span className={styles.formError} role="alert">
            {fileError}
          </span>
        )}
        {previewing && (
          <AttachmentPreviewModal
            fileName={version.file.fileName}
            contentType={version.file.contentType}
            load={() => previewArtifactVersion(version.artifactId, version.versionId)}
            download={() => downloadArtifactVersion(version.artifactId, version.versionId)}
            onClose={() => setPreviewing(false)}
          />
        )}
      </span>
      {!disabled && (
        <span className={styles.actions}>
          {isPdf && (
            <input type="number" min={1} className={styles.input} style={{ width: 72, height: 30 }} value={page} onChange={(event) => setPage(Math.max(1, Number(event.target.value) || 1))} aria-label={`${version.file.fileName} 의견을 달 쪽`} />
          )}
          <button type="button" className={`${styles.secondaryButton} ${styles.smallButton}`} onClick={() => onComment(version.versionId, version.artifactTitle, isPdf, isPdf ? page : null)}>
            {isPdf ? '쪽 의견' : '파일 의견'}
          </button>
        </span>
      )}
    </li>
  )
}

/** AD-16 후속 추천 (§46 recommendations[]). 학생이 하지 않아도 되는 선택 사항이다 */
function Recommendations({ value, onChange }: { value: FeedbackRecommendation[]; onChange: (next: FeedbackRecommendation[]) => void }) {
  const scraps = useRemote(() => listScraps(), [])
  const legacy = value.filter((item) => item.type === 'ENRICHMENT_TASK' || item.type === 'MOCK_EXAM_MATERIAL')
  const has = (predicate: (item: FeedbackRecommendation) => boolean) => value.some(predicate)
  const toggle = (item: FeedbackRecommendation, predicate: (entry: FeedbackRecommendation) => boolean) => onChange(has(predicate) ? value.filter((entry) => !predicate(entry)) : [...value, item])

  return (
    <div className={styles.form} style={{ gap: 12 }}>
      <div className={styles.field}>
        <span className={styles.label}>내 스크랩에서 참고자료 추천</span>
        <span className={styles.hint}>학생에게는 스크랩 제목·주소만 공개 · 관리자 메모 비공개</span>
        {/* §43-1: 학생에게 전달할 주소가 있는(링크) 스크랩만 추천한다. 파일만 있는 스크랩은 관리자 전용 */}
        {scraps.state.status === 'success' &&
          (scraps.state.data.items.filter((scrap) => scrap.sourceUrl).length === 0 ? (
            <span className={styles.hint}>저장한 스크랩이 없어요.</span>
          ) : (
            <div className={styles.chips}>
              {scraps.state.data.items.flatMap((scrap) => (scrap.sourceUrl ? [{ ...scrap, sourceUrl: scrap.sourceUrl }] : [])).map((scrap) => {
                const match = (entry: FeedbackRecommendation) => entry.type === 'RESOURCE' && entry.note.includes(scrap.sourceUrl)
                return (
                  <button key={scrap.scrapId} type="button" className={styles.chip} aria-pressed={has(match)} onClick={() => toggle({ type: 'RESOURCE', note: `${scrap.title} — ${scrap.sourceUrl}` }, match)}>
                    + {scrap.title}
                  </button>
                )
              })}
            </div>
          ))}
      </div>
      {/* [07] A27-UX: 이 화면에서 '심화 탐구 Task 추천'·'모의고사 탐구 소재 추천' 입력을 제거했다(기능 자체·다른 화면은 그대로).
          이전 초안에 이미 들어 있던 추천은 숨긴 채 보내지 않도록 목록으로 보여 주고 뺄 수 있게 한다. */}
      {legacy.length > 0 && (
        <div className={styles.field} data-testid="feedback-legacy-recommendations">
          <span className={styles.label}>이전에 고른 추천</span>
          <span className={styles.hint}>이 초안에 저장돼 있던 추천이에요. 보내지 않으려면 빼 주세요.</span>
          <div className={styles.chips}>
            {legacy.map((entry) => (
              <button key={`${entry.type}-${entry.resourceId ?? entry.note}`} type="button" className={styles.chip} aria-pressed="true" onClick={() => onChange(value.filter((item) => item !== entry))}>
                {entry.note} ✕
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DeliveredReply({ detail }: { detail: AdminFeedbackDetail }) {
  const reply = detail.reply
  if (!reply) return null
  return (
    <div className={styles.stack}>
      <p className={styles.muted}>{detail.deliveredAt ? `${dateTimeLabel(detail.deliveredAt)} 전달` : '전달 완료'} · 전달한 피드백은 고칠 수 없어요.</p>
      {reply.overallComment && <p className={styles.notePara}>{reply.overallComment}</p>}
      {reply.comments.length > 0 && (
        <ul className={styles.listPlain}>
          {reply.comments.map((comment) => (
            <li key={comment.commentId} className={styles.listRow}>
              <span>
                <span className={styles.badge}>{comment.location?.type === 'NOTE_BLOCK' ? '노트 블록' : comment.location?.type === 'PDF_PAGE' ? `${comment.location.pageNumber}쪽` : `${comment.targetType} 전체`}</span> {comment.text}
              </span>
            </li>
          ))}
        </ul>
      )}
      {reply.recommendations.length > 0 && (
        <div className={styles.boxSubtle}>
          <strong>후속 추천</strong>
          {reply.recommendations.map((recommendation, index) => (
            <p key={index} className={styles.notePara}>
              · {recommendation.note}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
