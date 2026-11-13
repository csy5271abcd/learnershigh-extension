import { useRef, useState } from 'react'
import { navigate } from '../../../app/adminLocation.ts'
import { deliverReply, getFeedbackRequest, listCatalog, listMockExamMaterials, listScraps, saveReplyDraft } from '../api/assessmentAdminApi.ts'
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
                '요청 당시 노트를 찾을 수 없어요. 파일만 확인할 수 있어요.'
              )}
            </div>

            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>탐구 노트 (요청 당시)</h3>
              {!delivered && <span className={styles.hint}>블록에 마우스를 올려 &lsquo;의견&rsquo;으로 위치별 의견을 달 수 있어요.</span>}
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
                학생이 질문 없이 자료 전체를 보냈어요. 의견 한두 문장만 써도 충분해요.
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
                  {comments.length === 0 && <p className={styles.hint}>노트 블록의 &lsquo;의견&rsquo;이나 파일의 &lsquo;파일 의견&rsquo;으로 추가해요.</p>}
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
          <p className={styles.notePara}>전달하면 학생이 바로 볼 수 있고, 전달한 내용은 고칠 수 없어요 (재답변 정책 미정, API-OD-A06). 학생 노트·파일은 바뀌지 않아요.</p>
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
  return (
    <li className={styles.listRow}>
      <span>
        <span className={styles.badge}>v{version.versionNumber}</span> {version.artifactTitle} · {version.file.fileName}
        <span className={styles.cellSub}>
          {fileSizeLabel(version.file.sizeBytes)} · {dateTimeLabel(version.uploadedAt)} · {version.previewSupported ? '미리보기 지원 형식 (Storage 연동 전)' : '미리보기 미지원 형식 — 파일 전체 의견만 가능'}
        </span>
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
  const catalog = useRemote(() => listCatalog({ status: 'PUBLISHED' }), [])
  const scraps = useRemote(() => listScraps(), [])
  const materials = useRemote(() => listMockExamMaterials(), [])
  const [taskMode, setTaskMode] = useState<'none' | 'library'>(value.some((item) => item.type === 'ENRICHMENT_TASK') ? 'library' : 'none')
  const has = (predicate: (item: FeedbackRecommendation) => boolean) => value.some(predicate)
  const toggle = (item: FeedbackRecommendation, predicate: (entry: FeedbackRecommendation) => boolean) => onChange(has(predicate) ? value.filter((entry) => !predicate(entry)) : [...value, item])

  return (
    <div className={styles.form} style={{ gap: 12 }}>
      <div className={styles.field}>
        <span className={styles.label}>내 스크랩에서 참고자료 추천</span>
        <span className={styles.hint}>스크랩의 공개 가능한 제목·주소만 학생에게 보여요. 관리자 메모는 전달되지 않아요.</span>
        {scraps.state.status === 'success' &&
          (scraps.state.data.items.length === 0 ? (
            <span className={styles.hint}>저장한 스크랩이 없어요. 관리자 참고자료실에서 저장할 수 있어요.</span>
          ) : (
            <div className={styles.chips}>
              {scraps.state.data.items.map((scrap) => {
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
      <div className={styles.field}>
        <span className={styles.label}>
          심화 탐구 Task 추천 <span className={styles.hint}>선택 · 학생이 하지 않아도 돼요</span>
        </span>
        <div className={styles.chips} role="group" aria-label="심화 탐구 Task 추천 방식">
          <button
            type="button"
            className={styles.chip}
            aria-pressed={taskMode === 'none'}
            onClick={() => {
              setTaskMode('none')
              onChange(value.filter((entry) => entry.type !== 'ENRICHMENT_TASK'))
            }}
          >
            추천 안 함
          </button>
          <button type="button" className={styles.chip} aria-pressed={taskMode === 'library'} onClick={() => setTaskMode('library')}>
            라이브러리에서 선택
          </button>
        </div>
        {taskMode === 'library' && catalog.state.status === 'success' && (
          <select
            className={styles.select}
            aria-label="추천할 공개 심화 Task"
            value={value.find((entry) => entry.type === 'ENRICHMENT_TASK')?.catalogTaskId ?? ''}
            onChange={(event) => {
              const rest = value.filter((entry) => entry.type !== 'ENRICHMENT_TASK')
              const task = catalog.state.status === 'success' ? catalog.state.data.items.find((item) => item.catalogTaskId === event.target.value) : undefined
              onChange(task ? [...rest, { type: 'ENRICHMENT_TASK', catalogTaskId: task.catalogTaskId, note: `${task.title}로 이어서 탐구해 볼 수 있어요.` }] : rest)
            }}
          >
            <option value="">공개 Task 고르기</option>
            {catalog.state.data.items.map((task) => (
              <option key={task.catalogTaskId} value={task.catalogTaskId}>
                {task.title}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="recommend-material">
          모의고사 탐구 소재 추천 <span className={styles.hint}>선택</span>
        </label>
        {materials.state.status === 'success' && (
          <select
            id="recommend-material"
            className={styles.select}
            value={value.find((entry) => entry.type === 'MOCK_EXAM_MATERIAL')?.resourceId ?? ''}
            onChange={(event) => {
              const rest = value.filter((entry) => entry.type !== 'MOCK_EXAM_MATERIAL')
              const item = materials.state.status === 'success' ? materials.state.data.items.find((entry) => entry.material.materialId === event.target.value) : undefined
              onChange(item ? [...rest, { type: 'MOCK_EXAM_MATERIAL', resourceId: item.material.materialId, note: `모의고사 소재 '${item.material.idea.topicTitle}'를 참고해 보세요.` }] : rest)
            }}
          >
            <option value="">추천 안 함</option>
            {materials.state.data.items
              .filter((item) => item.publishState === 'PUBLISHED')
              .map((item) => (
                <option key={item.material.materialId} value={item.material.materialId}>
                  [{item.material.materialId}] {item.material.idea.topicTitle}
                </option>
              ))}
          </select>
        )}
      </div>
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
