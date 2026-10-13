import { useState } from 'react'
import type { ScreenLoadState } from '../../app/useScreenLoad.ts'
import { ChipGroup, ConfirmDialog, ErrorState, LoadingState, NoticeState, SearchBox } from '../../components/AdminUi.tsx'
import ui from '../../components/AdminUi.module.css'
import { InlineStats, ToneButton, ToneTag } from '../../components/AdminVisual.tsx'
import type { AdminConnection, ConnectionReviewState, ConnectionSourceRef } from '../../fixtures/types.ts'
import { confirmConnection, errorMessageOf, rejectConnection } from '../../store/adminCommands.ts'
import type { AdminState } from '../../store/adminStore.ts'
import { formatDateTime } from '../../read-model/time.ts'
import { connectionStateLabel, describeSource } from './model/connection.ts'
import styles from './Connection.module.css'

/*
 * Connection Review (GET /api/admin/connections ?studentId · status, POST …/confirm | reject)
 * - AI가 Archive 기록 두 개 사이의 연관 후보를 제안하고, Admin만 확정 / 제외한다. AI가 확정하지 않는다.
 * - 확정 Connection은 Interview 질문 초안의 근거로 쓸 수 있다. 확정해도 Student Interview에 자동으로 공개되지 않는다.
 * - 상태 값(candidate / confirmed / rejected)은 Fixture 의미 값이다. (API-OD-04) 화면 글자는 AI 후보 · 확정 · 제외.
 * - 관계 자체가 보이게: 기록 A ↕ 기록 B + 가운데 AI 제안 이유. 선택하면 오른쪽 상세(?selected=)에서 두 기록 요약과 Interview 연결을 본다.
 * - Connection 상세 GET API는 Contract에 없다. (Gap) 목록 Canonical 값에서 찾는다.
 */

export interface ConnectionFilter {
  state: ConnectionReviewState | 'all'
  query: string
  selected: string | null
}

interface ConnectionReviewPageProps {
  state: AdminState
  load: ScreenLoadState
  onRetry: () => void
  filter: ConnectionFilter
  onFilterChange: (filter: ConnectionFilter) => void
  onOpenSource: (ref: ConnectionSourceRef) => void
  onCreateQuestion: (studentId: string, connectionId: string) => void
  onOpenQuestion: (studentId: string, questionId: string) => void
  onOpenStudent: (studentId: string) => void
}

/** 상태는 글자가 기본. 옅은 Tone은 검토 대기만 (확정 · 제외는 중립) */
const stateTone = { candidate: 'topic', confirmed: 'neutral', rejected: 'neutral' } as const

export function ConnectionReviewPage({ state, load, onRetry, filter, onFilterChange, onOpenSource, onCreateQuestion, onOpenQuestion, onOpenStudent }: ConnectionReviewPageProps) {
  const [draft, setDraft] = useState(filter.query)
  const [synced, setSynced] = useState(filter.query)
  if (synced !== filter.query) {
    setSynced(filter.query)
    setDraft(filter.query)
  }
  const [action, setAction] = useState<{ connection: AdminConnection; decision: 'confirm' | 'reject' } | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const students = new Map(state.students.map((item) => [item.studentId, item]))
  const all = load.status === 'ready' && load.empty ? [] : state.connections
  const query = filter.query.trim().toLowerCase()
  const rows = all.filter((connection) => {
    if (filter.state !== 'all' && connection.reviewState !== filter.state) return false
    if (!query) return true
    const text = [students.get(connection.studentId)?.displayName ?? '', connection.reason, ...connection.sourceRefs.map((ref) => describeSource(state, ref).title)].join(' ').toLowerCase()
    return text.includes(query)
  })
  const count = (value: ConnectionReviewState) => all.filter((item) => item.reviewState === value).length
  const selected = filter.selected ? (all.find((item) => item.connectionId === filter.selected) ?? null) : null
  const questionsOf = (connectionId: string) => state.interview.filter((item) => item.connectionId === connectionId)

  const run = async () => {
    if (!action || pending) return
    setPending(true)
    setError(null)
    try {
      await (action.decision === 'confirm' ? confirmConnection : rejectConnection)(action.connection.connectionId)
      setMessage(action.decision === 'confirm' ? '연결을 확정했어요. Interview 질문 초안의 근거로 쓸 수 있어요. (학생에게 자동 공개되지 않아요)' : '연결을 제외했어요. Interview 근거로 쓰지 않아요.')
      setAction(null)
    } catch (caught) {
      setError(errorMessageOf(caught))
    } finally {
      setPending(false)
    }
  }

  const actionsFor = (connection: AdminConnection, compact: boolean) => {
    const student = students.get(connection.studentId)
    const linked = questionsOf(connection.connectionId)
    const hasGrowth = connection.sourceRefs.some((ref) => ref.source === 'growth')
    if (connection.reviewState === 'candidate')
      return (
        <div className={styles.actions}>
          <ToneButton variant="primary" onClick={() => setAction({ connection, decision: 'confirm' })}>
            확정<span className="lh-visually-hidden">: {student?.displayName}</span>
          </ToneButton>
          <ToneButton variant="text" tone="neutral" onClick={() => setAction({ connection, decision: 'reject' })}>
            제외<span className="lh-visually-hidden">: {student?.displayName}</span>
          </ToneButton>
        </div>
      )
    if (connection.reviewState === 'confirmed')
      return (
        <div className={styles.actions}>
          {linked.length > 0 ? (
            <ToneButton variant="soft" tone="feedback" onClick={() => onOpenQuestion(connection.studentId, linked[0].questionId)}>
              연결된 면접 질문 보기 ({linked.length})
            </ToneButton>
          ) : student?.grade === '고3' && hasGrowth ? (
            <ToneButton variant="soft" tone="feedback" onClick={() => onCreateQuestion(connection.studentId, connection.connectionId)}>
              Interview 질문 초안
            </ToneButton>
          ) : (
            !compact && <span className={ui.cellSub}>{student?.grade !== '고3' ? 'Interview 대상(고3) 아님' : '연결할 성장활동 없음'}</span>
          )}
        </div>
      )
    return null
  }

  return (
    <div className={ui.page} aria-busy={load.status === 'loading'}>
      <header className={ui.headerText}>
        <h1 className={ui.title}>Connection 검토</h1>
        <p className={ui.lead}>서로 다른 학교 활동 사이의 연결 후보를 확인하고, 면접 질문에 활용할 관계를 확정해요.</p>
      </header>
      {load.status === 'loading' && <LoadingState label="Connection을 불러오는 중이에요." />}
      {load.status === 'error' && <ErrorState title="Connection을 불러오지 못했어요." onRetry={onRetry} />}
      {load.status === 'ready' && (
        <>
          {/* 요약: 검토 대기가 가장 중요 → 확정 · 제외는 글자 통계 */}
          <dl className={styles.summary}>
            <div className={styles.summaryPrimary}>
              <dt>검토 대기 (AI 후보)</dt>
              <dd>{count('candidate')}</dd>
            </div>
            <div className={styles.summaryStats}>
              <dt className="lh-visually-hidden">검토 결과</dt>
              <dd>
                <InlineStats
                  label="검토 결과"
                  items={[
                    { label: '확정', value: count('confirmed'), tone: 'complete' },
                    { label: '제외', value: count('rejected') },
                  ]}
                />
                <span className={ui.cellSub}>확정한 연결만 Interview 질문의 근거가 돼요.</span>
              </dd>
            </div>
          </dl>
          {message && (
            <p className={ui.success} role="status">
              {message}
            </p>
          )}
          <section className={ui.section} aria-labelledby="connection-list">
            <div className={ui.sectionHead}>
              <h2 id="connection-list" className={ui.sectionTitle}>
                Connection
              </h2>
              <p className={ui.muted} role="status">
                {filter.state !== 'all' || query ? `${rows.length}건 표시 · 전체 ${all.length}건` : `${all.length}건`}
              </p>
            </div>
            {all.length > 0 && (
              <div className={ui.toolbar}>
                <SearchBox
                  label="학생, 활동, 이유 검색"
                  value={draft}
                  onChange={(value) => {
                    setDraft(value)
                    onFilterChange({ ...filter, query: value })
                  }}
                />
                <ChipGroup
                  label="상태"
                  value={filter.state}
                  options={[{ value: 'all', label: '전체' }, ...(['candidate', 'confirmed', 'rejected'] as const).map((value) => ({ value, label: connectionStateLabel[value] }))]}
                  onChange={(value) => onFilterChange({ ...filter, state: value as ConnectionFilter['state'] })}
                />
              </div>
            )}
            {all.length === 0 ? (
              <NoticeState title="검토할 Connection이 없어요." />
            ) : rows.length === 0 ? (
              <NoticeState title={query ? '검색 결과가 없어요.' : '조건에 맞는 Connection이 없어요.'}>
                <button
                  type="button"
                  className={ui.secondaryButton}
                  onClick={() => {
                    setDraft('')
                    onFilterChange({ state: 'all', query: '', selected: filter.selected })
                  }}
                >
                  전체 보기
                </button>
              </NoticeState>
            ) : (
              <div className={styles.workspace} data-selected={selected ? 'true' : undefined}>
                <ul className={styles.list} aria-label={`Connection ${rows.length}건`}>
                  {rows.map((connection) => {
                    const student = students.get(connection.studentId)
                    const [a, b] = connection.sourceRefs.map((ref) => ({ ref, source: describeSource(state, ref) }))
                    return (
                      <li key={connection.connectionId} className={styles.card} data-state={connection.reviewState} aria-current={selected?.connectionId === connection.connectionId ? 'true' : undefined}>
                        <div className={styles.cardHead}>
                          <span className={styles.studentLine}>
                            <button type="button" className={ui.linkButton} onClick={() => onOpenStudent(connection.studentId)}>
                              {student?.displayName}
                              <span className="lh-visually-hidden"> Student 360 보기</span>
                            </button>
                            <span className={ui.cellSub}>{student?.grade}</span>
                          </span>
                          <ToneTag tone={stateTone[connection.reviewState]}>
                            {connectionStateLabel[connection.reviewState]}
                          </ToneTag>
                        </div>
                        {/* 관계: 기록 A ↕ 기록 B (가운데 AI 제안 이유) */}
                        <div className={styles.pair}>
                          <SourceBox label="기록 A" title={a.source.title} sub={a.source.sub} onOpen={() => onOpenSource(a.ref)} />
                          <div className={styles.connector} aria-label="AI 제안 이유">
                            <span className={styles.connectorLine} aria-hidden="true" />
                            <p className={styles.reason}>
                              <span className={styles.reasonLabel}>AI 제안 이유</span>
                              {connection.reason}
                            </p>
                          </div>
                          <SourceBox label="기록 B" title={b.source.title} sub={b.source.sub} onOpen={() => onOpenSource(b.ref)} />
                        </div>
                        <div className={styles.cardFoot}>
                          {actionsFor(connection, true)}
                          <span className={styles.footRight}>
                            {connection.reviewedAt && <span className={ui.cellSub}>검토 {formatDateTime(connection.reviewedAt)}</span>}
                            <button type="button" className={styles.detailLink} aria-expanded={selected?.connectionId === connection.connectionId} onClick={() => onFilterChange({ ...filter, selected: selected?.connectionId === connection.connectionId ? null : connection.connectionId })}>
                              {selected?.connectionId === connection.connectionId ? '상세 닫기' : '상세 보기'}
                              <span className="lh-visually-hidden">: {student?.displayName} Connection</span>
                            </button>
                          </span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
                {selected && (
                  <aside className={styles.detail} aria-labelledby="connection-detail-title">
                    <div className={styles.detailHead}>
                      <h2 id="connection-detail-title" className={ui.subTitle}>
                        {students.get(selected.studentId)?.displayName} · Connection 상세
                      </h2>
                      <button type="button" className={ui.back} onClick={() => onFilterChange({ ...filter, selected: null })}>
                        닫기
                      </button>
                    </div>
                    <ToneTag tone={stateTone[selected.reviewState]}>
                      {connectionStateLabel[selected.reviewState]}
                    </ToneTag>
                    <div className={styles.aiBox}>
                      <span className={styles.reasonLabel}>AI 제안 이유 (참고용)</span>
                      <p>{selected.reason}</p>
                    </div>
                    {selected.sourceRefs.map((ref, index) => {
                      const source = describeSource(state, ref)
                      return (
                        <section key={ref.sourceId} className={styles.detailSource} aria-label={`기록 ${index === 0 ? 'A' : 'B'}`}>
                          <span className={ui.cellSub}>기록 {index === 0 ? 'A' : 'B'} · {source.sub}</span>
                          <button type="button" className={ui.linkButton} onClick={() => onOpenSource(ref)}>
                            {source.title}
                            <span className="lh-visually-hidden"> 상세 보기</span>
                          </button>
                          <dl className={styles.sourceFacts}>
                            <dt>결과</dt>
                            <dd>{source.result || '정보 없음'}</dd>
                            <dt>Reflection</dt>
                            <dd>{source.reflection}</dd>
                            <dt>자료</dt>
                            <dd>{source.evidence}</dd>
                          </dl>
                        </section>
                      )
                    })}
                    <section className={styles.detailSource} aria-labelledby="connection-interview-title">
                      <h3 id="connection-interview-title" className={ui.subTitle}>
                        Interview 연결
                      </h3>
                      {questionsOf(selected.connectionId).length === 0 ? (
                        <p className={ui.muted}>{selected.reviewState === 'confirmed' ? '이 연결로 만든 면접 질문이 아직 없어요.' : '확정한 연결만 면접 질문의 근거가 돼요.'}</p>
                      ) : (
                        <ul className={ui.list}>
                          {questionsOf(selected.connectionId).map((question) => (
                            <li key={question.questionId}>
                              <button type="button" className={ui.linkButton} onClick={() => onOpenQuestion(question.studentId, question.questionId)}>
                                {question.question}
                              </button>
                              <span className={ui.cellSub}>{question.published ? '공개' : '비공개 초안'}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                    {actionsFor(selected, false)}
                  </aside>
                )}
              </div>
            )}
          </section>
          <ConfirmDialog
            open={action !== null}
            title={action?.decision === 'confirm' ? '이 연결을 확정할까요?' : '이 연결을 제외할까요?'}
            confirmLabel={action?.decision === 'confirm' ? '확정' : '제외'}
            danger={action?.decision === 'reject'}
            pending={pending}
            error={error}
            onConfirm={() => void run()}
            onClose={() => {
              setAction(null)
              setError(null)
            }}
          >
            {action && (
              <>
                <p className={ui.note}>{action.connection.reason}</p>
                <p className={ui.muted}>{action.decision === 'confirm' ? '확정한 연결은 Interview 질문 초안의 근거로 쓸 수 있어요. 학생 화면에 자동으로 공개되지 않아요.' : '제외한 연결은 Interview 근거로 쓰지 않아요.'}</p>
              </>
            )}
          </ConfirmDialog>
        </>
      )}
    </div>
  )
}

function SourceBox({ label, title, sub, onOpen }: { label: string; title: string; sub: string; onOpen: () => void }) {
  return (
    <button type="button" className={styles.source} onClick={onOpen}>
      <span className={styles.sourceLabel}>{label}</span>
      <span className={styles.sourceTitle}>{title}</span>
      <span className={ui.cellSub}>{sub}</span>
      <span className="lh-visually-hidden"> 상세 보기</span>
    </button>
  )
}
