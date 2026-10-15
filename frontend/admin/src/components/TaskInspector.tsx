import { useState } from 'react'
import type { AdminTaskVersion, RevisionDiffBlock } from '../fixtures/types.ts'
import { evidenceRoleLabel, evidenceStageName, FINAL_ARTIFACT_ROLE, GUIDE_ROLE, REFERENCE_ROLE, sortEvidenceByProcess, versionRole } from '../read-model/materialRole.ts'
import { fixtureDiff, isTextBacked, lineDiff, type TaskDetail, type VersionView } from '../read-model/taskDetail.ts'
import { formatDateTime, formatMonthDay } from '../read-model/time.ts'
import { AvailabilityBadge, DownloadAction, FileList, FilePreviewDialog, PreviewBody } from './AdminFilePreview.tsx'
import { Badge } from './AdminUi.tsx'
import ui from './AdminUi.module.css'
import { formatLabelOf, useFileText, type PreviewFile } from './filePreview.ts'
import styles from './Inspector.module.css'

/*
 * Task 상세 보기 (Feedback Review LEFT · Admin Task Inspector 공통). 모두 읽기 전용이다.
 * - 제출물: V1 · V2 · V3를 직접 골라 보고, 현재 검토 대상 Version을 글자로 표시한다. (고른 Version은 보기만 바꾸고 Task 상태를 바꾸지 않는다)
 * - 과정 자료: Evidence 하나하나를 열어 본다. (Version과 다른 Entity)
 * - 수정 기록: Version 짝을 골라 BEFORE / AFTER를 본다. 내용 비교는 Student Fixture의 비교 Block이 있거나 두 원본이 실제 Text일 때만 한다.
 * - 피드백 이력: Version마다 AI 사전 점검(시도 이력 포함)과 선생님 피드백을 나눠 보여준다. 지금 작성 중인 Staff Review와 섞지 않는다.
 * - 학생 원문을 요약하거나 고쳐 쓰지 않는다.
 */

export type TaskInspectorTab = 'submission' | 'evidence' | 'revision' | 'feedback' | 'criteria'

const tabs: { id: TaskInspectorTab; label: string }[] = [
  { id: 'submission', label: '제출물' },
  { id: 'evidence', label: '과정 자료' },
  { id: 'revision', label: '수정 기록' },
  { id: 'feedback', label: '피드백 이력' },
  { id: 'criteria', label: '평가 기준' },
]

// 자료 역할 · 관련 단계 이름은 read-model/materialRole.ts (Evidence · Version · FinalArtifact는 각자 Entity 그대로)

const aiStatusLabel = { processing: 'AI 분석 중', success: '분석 완료', failed: '분석 실패' } as const

const versionPreviewFile = (view: VersionView): PreviewFile => ({ name: view.version.fileName, role: versionRole(view.version.number), subtitle: `${view.label} · ${formatDateTime(view.version.submittedAt)} 제출`, backing: view.version.file })

function reviewState(view: VersionView): { text: string; tone?: 'accent' | 'warning' } {
  if (view.version.aiStatus === 'processing') return { text: 'AI 사전 점검 중 (검토 전)' }
  if (view.version.aiStatus === 'failed') return { text: view.version.retryAllowed ? 'AI 사전 점검 실패 · 학생 다시 시도 필요' : 'AI 사전 점검 실패' }
  if (!view.review) return { text: '검토 기록 없음' }
  if (!view.review.delivery) return { text: '선생님 검토 대기', tone: 'warning' }
  return { text: `${formatMonthDay(view.review.delivery.deliveredAt)} 피드백 전달`, tone: 'accent' }
}

interface TaskInspectorProps {
  detail: TaskDetail
  /** 현재 검토 대상 Version (Review 화면). Inspector에서는 기다리는 Version 또는 최신 Version */
  focusVersionId: string | null
  /** Review 화면이면 true: 현재 검토 대상 = Staff Review 전달 대상이라는 표시 */
  reviewMode?: boolean
}

export function TaskInspector({ detail, focusVersionId, reviewMode = false }: TaskInspectorProps) {
  const [tab, setTab] = useState<TaskInspectorTab>('submission')
  const [selected, setSelected] = useState<string | null>(focusVersionId ?? detail.versions.at(-1)?.version.versionId ?? null)
  const [pairKey, setPairKey] = useState<string | null>(() => {
    const last = detail.pairs.filter((pair) => pair.to.version.number === pair.from.version.number + 1).at(-1)
    return last ? `${last.from.version.versionId}>${last.to.version.versionId}` : null
  })
  const [preview, setPreview] = useState<PreviewFile | null>(null)
  const { task } = detail

  return (
    <div className={styles.inspector}>
      <div role="tablist" aria-label="Task 상세" className={styles.tabs}>
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`task-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls="task-tab-panel"
            tabIndex={tab === item.id ? 0 : -1}
            className={styles.tab}
            onClick={() => setTab(item.id)}
            onKeyDown={(event) => {
              const index = tabs.findIndex((entry) => entry.id === tab)
              const move = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
              if (!move) return
              const next = tabs[(index + move + tabs.length) % tabs.length]
              setTab(next.id)
              document.getElementById(`task-tab-${next.id}`)?.focus()
            }}
          >
            {item.label}
            {item.id === 'submission' && detail.versions.length > 0 && <span className={styles.count}> {detail.versions.length}</span>}
            {item.id === 'evidence' && task.evidence && <span className={styles.count}> {task.evidence.length}</span>}
          </button>
        ))}
      </div>
      <div id="task-tab-panel" role="tabpanel" aria-labelledby={`task-tab-${tab}`} className={styles.panel}>
        {tab === 'submission' && <Submission detail={detail} focusVersionId={focusVersionId} selected={selected} onSelect={setSelected} reviewMode={reviewMode} onPreview={setPreview} />}
        {tab === 'evidence' && <Evidence detail={detail} onPreview={setPreview} />}
        {tab === 'revision' && <Revision detail={detail} pairKey={pairKey} onPairChange={setPairKey} onPreview={setPreview} />}
        {tab === 'feedback' && <FeedbackHistory detail={detail} focusVersionId={focusVersionId} reviewMode={reviewMode} />}
        {tab === 'criteria' && <Criteria detail={detail} />}
      </div>
      <FilePreviewDialog file={preview} onClose={() => setPreview(null)} />
    </div>
  )
}

// ---------- 제출물 ----------

function Submission({
  detail,
  focusVersionId,
  selected,
  onSelect,
  reviewMode,
  onPreview,
}: {
  detail: TaskDetail
  focusVersionId: string | null
  selected: string | null
  onSelect: (id: string) => void
  reviewMode: boolean
  onPreview: (file: PreviewFile) => void
}) {
  if (detail.task.versions === null) return <p className={ui.note}>제출 Version 정보가 없어요. (학생 화면 기록에도 Version 정보가 없는 Task예요)</p>
  if (detail.versions.length === 0) return <p className={ui.note}>아직 제출한 Version이 없어요. ({detail.task.stageStatus})</p>
  const view = detail.versions.find((item) => item.version.versionId === selected) ?? detail.versions.at(-1)!
  const isFocus = view.version.versionId === focusVersionId
  const file = { ...versionPreviewFile(view), roleAccent: isFocus }
  const state = reviewState(view)
  return (
    <div className={ui.list}>
      <div className={styles.versionBar} role="group" aria-label="볼 Version 선택">
        {detail.versions.map((item) => {
          const focus = item.version.versionId === focusVersionId
          return (
            <button key={item.version.versionId} type="button" className={styles.versionButton} aria-pressed={item.version.versionId === view.version.versionId} onClick={() => onSelect(item.version.versionId)}>
              <span className={ui.cellMain}>{versionRole(item.version.number)}</span>
              <span className={ui.cellSub}>{focus ? (reviewMode ? '현재 검토 중' : '최신 / 검토 대상') : item.version.number < (detail.versions.at(-1)?.version.number ?? 0) ? '이전 제출본' : '최신 제출본'}</span>
            </button>
          )
        })}
      </div>
      {!isFocus && focusVersionId && (
        <div className={styles.previousNotice} role="status">
          <span>
            <strong>이전 제출본 {view.label}</strong>을 보고 있어요. 보기만 바뀌고{reviewMode ? ' Staff Review는 현재 검토본에 전달돼요.' : ' Task 상태는 그대로예요.'}
          </span>
          <button type="button" className={`${ui.secondaryButton} ${ui.smallButton}`} onClick={() => onSelect(focusVersionId)}>
            현재 검토본으로 돌아가기
          </button>
        </div>
      )}
      <dl className={styles.facts}>
        <div>
          <dt>Version</dt>
          <dd>
            {view.label} · {isFocus ? (reviewMode ? <Badge tone="solid">현재 검토 중</Badge> : <Badge tone="accent">검토 대상</Badge>) : <Badge>이전 제출본</Badge>}
          </dd>
        </div>
        <div>
          <dt>자료 역할</dt>
          <dd>{versionRole(view.version.number)}</dd>
        </div>
        <div>
          <dt>제출 시각</dt>
          <dd>{formatDateTime(view.version.submittedAt)}</dd>
        </div>
        <div>
          <dt>파일</dt>
          <dd className={styles.wrap}>{view.version.fileName}</dd>
        </div>
        <div>
          <dt>형식 · 미리보기</dt>
          <dd>
            {formatLabelOf(file)} · <AvailabilityBadge file={file} />
          </dd>
        </div>
        <div>
          <dt>AI 사전 점검</dt>
          <dd>{aiStatusLabel[view.version.aiStatus]}{view.version.aiAttempts && view.version.aiAttempts.length > 1 ? ` (시도 ${view.version.aiAttempts.length}회)` : ''}</dd>
        </div>
        <div>
          <dt>선생님 검토</dt>
          <dd>{state.tone ? <Badge tone={state.tone}>{state.text}</Badge> : state.text}</dd>
        </div>
      </dl>
      <div className={styles.previewBox} aria-label={`${view.label} 미리보기`}>
        <PreviewBody file={file} />
      </div>
      <div className={styles.row}>
        <button type="button" className={`${ui.secondaryButton} ${ui.smallButton}`} onClick={() => onPreview(file)}>
          크게 보기<span className="lh-visually-hidden">: {file.name}</span>
        </button>
        <DownloadAction file={file} />
      </div>
      {detail.task.finalArtifact && (
        <div className={styles.sub}>
          <h3 className={styles.subHead}>최종 결과물</h3>
          <FileList label="최종 결과물" files={[{ name: detail.task.finalArtifact.fileName, role: FINAL_ARTIFACT_ROLE, subtitle: '8단계 최종 제출 · Version과 다른 결과물' }]} onOpen={onPreview} emptyText="" />
        </div>
      )}
    </div>
  )
}

// ---------- 과정 자료 ----------

function Evidence({ detail, onPreview }: { detail: TaskDetail; onPreview: (file: PreviewFile) => void }) {
  const { task } = detail
  // 진행 순서(계획 → 조사 → 초안 → 최종 → 발표) · 같은 단계 안에서는 등록 순
  const files: PreviewFile[] = sortEvidenceByProcess(task.evidence ?? []).map((item) => ({
    name: item.fileName,
    role: evidenceRoleLabel[item.stageTag],
    subtitle: `등록 ${formatMonthDay(item.createdAt)} · 관련 단계: ${evidenceStageName[item.stageTag]}`,
    backing: item.file,
  }))
  return (
    <div className={ui.list}>
      {task.guideFile && (
        <div className={styles.sub}>
          <h3 className={styles.subHead}>수행평가 안내문</h3>
          <FileList label="안내문" files={[{ name: task.guideFile.fileName, role: GUIDE_ROLE, subtitle: `등록 ${formatMonthDay(task.guideFile.registeredDate)} · 관련 단계: 1단계 안내문` }]} onOpen={onPreview} emptyText="" />
        </div>
      )}
      <div className={styles.sub}>
        <h3 className={styles.subHead}>학생이 올린 과정 자료 {task.evidence ? `${task.evidence.length}개` : ''}</h3>
        {task.evidence === null ? (
          <p className={ui.note}>과정 자료 정보가 없어요. (학생 화면 기록에도 자료 정보가 없는 Task예요 · 0개와 다름)</p>
        ) : (
          <FileList label="과정 자료" files={files} onOpen={onPreview} emptyText="아직 올린 과정 자료가 없어요." />
        )}
      </div>
      {task.references && task.references.length > 0 && (
        <div className={styles.sub}>
          <h3 className={styles.subHead}>참고 자료 (학생 정리)</h3>
          <ul className={ui.list}>
            {task.references.map((item) => (
              <li key={item.referenceId} className={ui.listItem}>
                <span className={styles.roleChip}>{REFERENCE_ROLE}</span>
                <span className={ui.cellMain}>{item.title}</span>
                <span className={ui.cellSub}>
                  {item.source} · {item.usage}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ---------- 수정 기록 ----------

function DiffBlocks({ blocks }: { blocks: RevisionDiffBlock[] }) {
  return (
    <ol className={styles.diff} aria-label="바뀐 내용">
      {blocks.map((block, index) => (
        <li key={index} className={styles.diffBlock} data-kind={block.kind}>
          <span className={styles.diffKind}>{{ same: '그대로', changed: '변경', removed: '삭제', added: '추가' }[block.kind]}</span>
          {block.kind === 'same' && <p>{block.text}</p>}
          {(block.kind === 'changed' || block.kind === 'removed') && (
            <p className={styles.before}>
              <span className="lh-visually-hidden">BEFORE: </span>
              {block.before}
            </p>
          )}
          {(block.kind === 'changed' || block.kind === 'added') && (
            <p className={styles.after}>
              <span className="lh-visually-hidden">AFTER: </span>
              {block.after}
            </p>
          )}
        </li>
      ))}
    </ol>
  )
}

function TextDiff({ from, to }: { from: AdminTaskVersion; to: AdminTaskVersion }) {
  const before = useFileText(from.file)
  const after = useFileText(to.file)
  if (before.state.status === 'loading' || after.state.status === 'loading') return <p className={ui.muted}>두 Version 원본을 불러오는 중이에요.</p>
  if (before.state.status === 'error' || after.state.status === 'error')
    return (
      <div className={ui.note} role="alert">
        원본을 불러오지 못해 비교하지 못했어요.{' '}
        <button
          type="button"
          className={`${ui.secondaryButton} ${ui.smallButton}`}
          onClick={() => {
            before.retry()
            after.retry()
          }}
        >
          다시 시도
        </button>
      </div>
    )
  return (
    <>
      <p className={ui.cellSub}>두 Text 원본을 줄 단위로 비교했어요.</p>
      <DiffBlocks blocks={lineDiff(before.state.text, after.state.text)} />
    </>
  )
}

function Revision({ detail, pairKey, onPairChange, onPreview }: { detail: TaskDetail; pairKey: string | null; onPairChange: (key: string) => void; onPreview: (file: PreviewFile) => void }) {
  if (detail.pairs.length === 0) return <p className={ui.note}>비교할 이전 Version이 없어요. (Version {detail.versions.length}개)</p>
  const pair = detail.pairs.find((item) => `${item.from.version.versionId}>${item.to.version.versionId}` === pairKey) ?? detail.pairs.at(-1)!
  const semantic = fixtureDiff(detail.task, pair.from.version.versionId, pair.to.version.versionId)
  const textual = !semantic && isTextBacked(pair.from.version) && isTextBacked(pair.to.version)
  // 이 수정이 반영해야 했던 선생님 피드백: 앞 Version에 전달된 피드백 (수정 사이의 모든 전달 피드백)
  const between = detail.versions.filter((item) => item.version.number >= pair.from.version.number && item.version.number < pair.to.version.number && item.review?.delivery)
  return (
    <div className={ui.list}>
      <div className={styles.versionBar} role="group" aria-label="비교할 Version 짝">
        {detail.pairs.map((item) => {
          const key = `${item.from.version.versionId}>${item.to.version.versionId}`
          return (
            <button key={key} type="button" className={styles.versionButton} aria-pressed={item === pair} onClick={() => onPairChange(key)}>
              <span className={ui.cellMain}>
                {item.from.label} → {item.to.label}
              </span>
            </button>
          )
        })}
      </div>
      <div className={styles.compareHead}>
        <section aria-labelledby="before-head" className={styles.compareSide}>
          <h3 id="before-head" className={styles.subHead}>
            BEFORE · {pair.from.label}
          </h3>
          <p className={ui.cellSub}>
            {pair.from.version.fileName} · {formatDateTime(pair.from.version.submittedAt)}
          </p>
          <button type="button" className={`${ui.secondaryButton} ${ui.smallButton}`} onClick={() => onPreview(versionPreviewFile(pair.from))}>
            {pair.from.label} 열기
          </button>
        </section>
        <section aria-labelledby="after-head" className={styles.compareSide}>
          <h3 id="after-head" className={styles.subHead}>
            AFTER · {pair.to.label}
          </h3>
          <p className={ui.cellSub}>
            {pair.to.version.fileName} · {formatDateTime(pair.to.version.submittedAt)}
          </p>
          <button type="button" className={`${ui.secondaryButton} ${ui.smallButton}`} onClick={() => onPreview(versionPreviewFile(pair.to))}>
            {pair.to.label} 열기
          </button>
        </section>
      </div>
      <div className={styles.sub}>
        <h3 className={styles.subHead}>이 수정에서 반영할 선생님 피드백</h3>
        {between.length === 0 ? (
          <p className={ui.muted}>두 Version 사이에 전달된 선생님 피드백이 없어요.</p>
        ) : (
          <ul className={ui.list}>
            {between.map((item) => (
              <li key={item.version.versionId} className={ui.listItem}>
                <span className={ui.cellMain}>
                  {item.label} 피드백 · {formatDateTime(item.review!.delivery!.deliveredAt)} · {item.review!.delivery!.nextAction}
                </span>
                <span>{item.review!.delivery!.studentComment}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={styles.sub}>
        <h3 className={styles.subHead}>바뀐 내용</h3>
        {semantic ? (
          <>
            <p className={ui.cellSub}>학생 수정 기록(Revision History)과 같은 비교예요.</p>
            <DiffBlocks blocks={semantic.blocks} />
          </>
        ) : textual ? (
          <TextDiff from={pair.from.version} to={pair.to.version} />
        ) : (
          <p className={ui.note}>
            이 형식은 내용 비교를 지원하지 않아요. ({formatLabelOf({ name: pair.from.version.fileName })} → {formatLabelOf({ name: pair.to.version.fileName })}) 위의 "열기"로 두 Version을 각각 확인해주세요.
          </p>
        )}
      </div>
    </div>
  )
}

// ---------- 피드백 이력 ----------

function FeedbackHistory({ detail, focusVersionId, reviewMode }: { detail: TaskDetail; focusVersionId: string | null; reviewMode: boolean }) {
  if (detail.versions.length === 0) return <p className={ui.note}>Version이 없어 피드백 이력이 없어요.</p>
  return (
    <ol className={ui.list} aria-label="Version별 피드백 이력">
      {[...detail.versions].reverse().map((view) => {
        const delivery = view.review?.delivery
        const isFocus = view.version.versionId === focusVersionId
        return (
          <li key={view.version.versionId} className={styles.historyItem}>
            <h3 className={styles.subHead}>
              {view.label} · {formatDateTime(view.version.submittedAt)} 제출 {isFocus && reviewMode && <Badge tone="solid">현재 검토 중</Badge>}
            </h3>
            <div className={styles.sub}>
              <h4 className={styles.miniHead}>AI 사전 점검</h4>
              {view.version.aiAttempts && view.version.aiAttempts.length > 0 ? (
                <ol className={styles.attempts} aria-label={`${view.label} AI 사전 점검 시도`}>
                  {view.version.aiAttempts.map((attempt, index) => (
                    <li key={index}>
                      {index === 0 ? '처음 분석' : '다시 시도'} · {formatDateTime(attempt.at)} · {aiStatusLabel[attempt.status]}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={ui.cellSub}>
                  {aiStatusLabel[view.version.aiStatus]}
                  {view.version.aiAnalyzedAt ? ` · ${formatDateTime(view.version.aiAnalyzedAt)}` : ''}
                </p>
              )}
              {view.review && view.review.aiItems.length > 0 ? (
                <ul className={ui.list}>
                  {view.review.aiItems.map((item) => (
                    <li key={item.itemId} className={styles.aiLine}>
                      <Badge>AI</Badge> {item.criterionName ? `${item.criterionName} · ` : ''}
                      {item.summary}
                    </li>
                  ))}
                </ul>
              ) : (
                view.version.aiStatus === 'success' && <p className={ui.cellSub}>이 Version의 AI 점검 항목 기록이 없어요.</p>
              )}
            </div>
            <div className={styles.sub}>
              <h4 className={styles.miniHead}>선생님 피드백</h4>
              {!view.review ? (
                <p className={ui.cellSub}>{view.version.aiStatus === 'success' ? '검토 기록이 없어요.' : 'AI 사전 점검을 마치지 않아 검토 전이에요.'}</p>
              ) : !delivery ? (
                <p>
                  <Badge tone="warning">검토 중</Badge> {isFocus && reviewMode ? '오른쪽 Staff Review에서 작성하는 피드백이 이 Version에 전달돼요.' : '아직 학생에게 전달되지 않았어요.'}
                </p>
              ) : (
                <div className={styles.delivered}>
                  <p className={ui.cellSub}>
                    <Badge tone="accent">전달됨</Badge> {delivery.reviewedBy} · {formatDateTime(delivery.deliveredAt)} · Next Action {delivery.nextAction} · {delivery.needsAnotherRevision ? '수정본 필요' : '최종 제출 준비'}
                  </p>
                  {delivery.studentComment && <p className={styles.quote}>{delivery.studentComment}</p>}
                  {delivery.deliveredAiItems.length > 0 && (
                    <ul className={ui.list}>
                      {delivery.deliveredAiItems.map((item) => (
                        <li key={item.itemId} className={styles.aiLine}>
                          <Badge>{item.decision === 'EDIT_AND_DELIVER' ? 'AI 수정 후 전달' : 'AI 동의'}</Badge> {item.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// ---------- 평가 기준 ----------

function Criteria({ detail }: { detail: TaskDetail }) {
  const { task } = detail
  return (
    <div className={ui.list}>
      <dl className={styles.facts}>
        <div>
          <dt>제출물</dt>
          <dd>{task.deliverableSummary}</dd>
        </div>
        {task.topic && task.topic.text && (
          <div>
            <dt>주제</dt>
            <dd>{task.topic.text}</dd>
          </div>
        )}
      </dl>
      {task.criteria ? (
        <ul className={ui.list} aria-label="평가 기준">
          {task.criteria.map((criterion) => (
            <li key={criterion.criterionId} className={ui.listItem}>
              <span className={ui.cellMain}>
                {criterion.name}
                {criterion.points !== null && <span className={ui.muted}> · {criterion.points}점</span>}
              </span>
              {criterion.aiCheck && <span className={ui.cellSub}>AI 점검(최신 Version): {criterion.aiCheck}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className={ui.note}>안내문의 평가 기준 정보가 없어요.</p>
      )}
    </div>
  )
}
