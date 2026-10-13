import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Badge, ChipGroup, ConfirmDialog, Meter, ModalDialog } from '../../components/AdminUi.tsx'
import ui from '../../components/AdminUi.module.css'
import { activityStatusLabel, activityTypeLabel } from '../../fixtures/adminActivities.fixture.ts'
import type { AdminSchoolRecord, AdminTask, AdminTestResult, ParentShareStatus } from '../../fixtures/types.ts'
import { errorMessageOf, updateSchoolRecordStatus } from '../../store/adminCommands.ts'
import type { AdminState } from '../../store/adminStore.ts'
import { queueKindLabel } from '../../read-model/feedbackQueue.ts'
import type { Student360 } from '../../read-model/student360.ts'
import { managementPointKindLabel, testChange, testTypeLabel } from '../../read-model/studentInsights.ts'
import { daysUntil, formatDateTime, formatDday, formatMonthDay, formatPercent, formatStudyTimeLong, formatWaiting } from '../../read-model/time.ts'
import { student360Tabs, type Student360Tab } from './routes/paths.ts'
import styles from './StudentManagement.module.css'

/*
 * Student 360 (api-contract §34, Today Board Mockup TodayBoard-01의 학생 상세 구성)
 * Tab: Overview · Study · School · Activities · Mentor · Reports. (Mockup의 Counseling Tab은 Wangyu 영역이라 두지 않는다)
 * - Mockup은 Today Board 위 Right Drawer지만, Feedback Review · Connection · Queue에서도 들어오고 Tab · 학생을 주소로 남기려고 전체 화면으로 둔다.
 * - 기존 LearnersHigh 순공 · Plan은 Integration 대상이다. 여기서 다시 만들지 않고 읽어 온 값만 보여준다.
 * - TestResult는 시험 유형별로 나눠 보여주고, 입력되지 않은 값은 만들지 않는다. (입력 / 수정 Form 없음)
 * - SchoolRecord candidate는 확정 기록처럼 보이지 않게 따로 표시한다.
 */

interface Student360PageProps {
  state: AdminState
  data: Student360
  tab: Student360Tab
  onTabChange: (tab: Student360Tab) => void
  onSwitchStudent: (studentId: string) => void
  onBack: () => void
  backLabel: string
  onOpenReview: (feedbackId: string) => void
  onRecommendCase: (taskId: string | null) => void
  onOpenInterview: () => void
  onOpenTask: (taskId: string) => void
  onOpenActivity: (activityId: string) => void
  onNavigate: (href: string) => void
  /** Activities Tab 상태 Filter (주소 Query astatus) */
  activityFilter: string
  onActivityFilterChange: (value: string) => void
}

const stageName = ['', '안내문 등록', '주제 선정', '자료 조사', '초안 V1 제출', 'AI 사전 점검', '선생님 피드백', 'Revision', '최종 제출'] as const
const shareLabel: Record<ParentShareStatus, string> = { not_shared: '공유 안 함', consented: '학생 동의 (첨부 후보)', attached: 'Report 첨부됨', shared: '학부모에게 공유됨' }

export function Student360Page({ state, data, tab, onTabChange, onSwitchStudent, onBack, backLabel, onOpenReview, onRecommendCase, onOpenInterview, onOpenTask, onOpenActivity, onNavigate, activityFilter, onActivityFilterChange }: Student360PageProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const { insight } = data
  const { student } = insight
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [student.studentId])

  return (
    <div className={ui.page}>
      <button type="button" className={ui.back} onClick={onBack}>
        <span aria-hidden="true">‹</span> {backLabel}
        <span className="lh-visually-hidden">로 돌아가기</span>
      </button>
      <header className={ui.header}>
        <div className={ui.headerText}>
          <h1 ref={headingRef} tabIndex={-1} className={ui.title}>
            {student.displayName}
          </h1>
          <p className={ui.lead}>
            {[student.grade, student.interestField && `${student.interestField} 관심`, student.desiredMajor && `희망 ${student.desiredMajor}`].filter(Boolean).join(' · ')}
          </p>
          <div className={ui.badgeList} aria-label="관리 포인트">
            {insight.points.length === 0 ? <Badge>특이사항 없음</Badge> : insight.points.map((point) => <Badge key={point.label} tone="negative">{managementPointKindLabel[point.kind]}</Badge>)}
          </div>
        </div>
        <label className={ui.field}>
          <span className={ui.fieldLabel}>다른 학생 보기</span>
          <select className={ui.select} value={student.studentId} onChange={(event) => onSwitchStudent(event.target.value)}>
            {state.students.map((item) => (
              <option key={item.studentId} value={item.studentId}>
                {item.displayName} · {item.grade}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div role="tablist" aria-label="Student 360" className={ui.tabs}>
        {student360Tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls="student360-panel"
            tabIndex={tab === item.id ? 0 : -1}
            className={ui.tab}
            onClick={() => onTabChange(item.id)}
            onKeyDown={(event) => {
              const index = student360Tabs.findIndex((entry) => entry.id === tab)
              const move = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
              if (!move) return
              const next = student360Tabs[(index + move + student360Tabs.length) % student360Tabs.length]
              onTabChange(next.id)
              document.getElementById(`tab-${next.id}`)?.focus()
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section id="student360-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className={ui.section}>
        {tab === 'overview' && <Overview state={state} data={data} onOpenReview={onOpenReview} onTabChange={onTabChange} onOpenTask={onOpenTask} onNavigate={onNavigate} />}
        {tab === 'study' && <Study data={data} />}
        {tab === 'school' && <School data={data} onOpenTask={onOpenTask} />}
        {tab === 'activities' && <Activities data={data} onOpenReview={onOpenReview} onOpenActivity={onOpenActivity} filter={activityFilter} onFilterChange={onActivityFilterChange} />}
        {tab === 'mentor' && <Mentor data={data} onRecommendCase={onRecommendCase} />}
        {tab === 'reports' && <Reports data={data} />}
        {tab === 'school' && student.grade === '고3' && (
          <p className={ui.note}>
            Interview 질문은{' '}
            <button type="button" className={ui.linkButton} onClick={onOpenInterview}>
              Interview 관리
            </button>
            에서 볼 수 있어요.
          </p>
        )}
      </section>
    </div>
  )
}

// ---------- Overview ----------

function Overview({ state, data, onOpenReview, onTabChange, onOpenTask, onNavigate }: { state: AdminState; data: Student360; onOpenReview: (id: string) => void; onTabChange: (tab: Student360Tab) => void; onOpenTask: (taskId: string) => void; onNavigate: (href: string) => void }) {
  const { insight } = data
  const study = insight.study
  const statusCounts = data.activities.reduce<Record<string, number>>((map, item) => ({ ...map, [item.status]: (map[item.status] ?? 0) + 1 }), {})
  const importantTest = insight.tests.find((item) => {
    const change = testChange(item).direction
    return change === 'down' || change === 'up'
  })
  // 다음 Action: 실제로 처리할 Admin 화면으로 이어 간다. (상담 Action 없음)
  const student = insight.student
  const candidateConnections = state.connections.filter((item) => item.studentId === student.studentId && item.reviewState === 'candidate').length
  const studentQuestions = state.interview.filter((item) => item.studentId === student.studentId)
  const draftOnly = student.grade === '고3' && studentQuestions.length > 0 && studentQuestions.every((item) => !item.published)
  const actions: { text: string; label: string; run: () => void }[] = [
    ...[...insight.queueItems]
      .sort((a, b) => b.waitingHours - a.waitingHours)
      .map((item) => ({ text: `${queueKindLabel[item.kind]} · ${item.title} (${formatWaiting(item.waitingHours)} 대기)`, label: '검토 열기', run: () => onOpenReview(item.feedbackId) })),
    ...(candidateConnections > 0
      ? [{ text: `AI Connection 후보 ${candidateConnections}건 확인`, label: 'Connection 검토', run: () => onNavigate(`/connections?state=candidate&q=${encodeURIComponent(student.displayName)}`) }]
      : []),
    ...(draftOnly ? [{ text: `Interview 질문 초안 ${studentQuestions.length}개 · 공개 전`, label: 'Interview 관리', run: () => onNavigate(`/interview?studentId=${encodeURIComponent(student.studentId)}`) }] : []),
    ...(insight.primaryTask && insight.queueItems.length === 0
      ? [{ text: `학생 차례 확인 · ${insight.primaryTask.title} — ${insight.primaryTask.nextAction}`, label: 'Task 상세', run: () => onOpenTask(insight.primaryTask!.taskId) }]
      : []),
  ]
  return (
    <div className={ui.grid2}>
      <Card title="최근 학습" onMore={() => onTabChange('study')}>
        {study ? (
          <>
            <p className={styles.big}>오늘 {formatStudyTimeLong(study.todayStudyMinutes)}</p>
            <p className={ui.muted}>최근 7일 {formatStudyTimeLong(study.subjectMinutes7d.reduce((sum, item) => sum + item.minutes, 0))}</p>
            <p>
              Plan 직전 7일 {formatPercent(study.previous7DayPlanRate)} → 최근 7일 {formatPercent(study.recent7DayPlanRate)}
            </p>
          </>
        ) : (
          <p className={ui.muted}>기존 학습 기록이 없어요.</p>
        )}
      </Card>
      <Card title="관리 포인트">
        {insight.points.length === 0 ? (
          <p className={ui.muted}>특이사항 없음</p>
        ) : (
          <ul className={ui.list}>
            {insight.points.map((point) => (
              <li key={point.label}>
                <Badge tone="negative">{managementPointKindLabel[point.kind]}</Badge> {point.label}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title={`수행평가 ${insight.activeTasks.length}개 진행`} onMore={() => onTabChange('school')}>
        {insight.activeTasks.length === 0 ? (
          <p className={ui.muted}>진행 중 수행평가가 없어요.</p>
        ) : (
          <ul className={ui.list}>
            {insight.activeTasks.slice(0, 4).map((task) => (
              <li key={task.taskId}>
                <button type="button" className={ui.linkButton} onClick={() => onOpenTask(task.taskId)}>
                  {task.title}
                  <span className="lh-visually-hidden"> Task 상세 보기</span>
                </button>
                <span className={ui.cellSub} data-tone={daysUntil(task.deadlineDate) <= 3 ? 'negative' : undefined}>
                  {formatDday(daysUntil(task.deadlineDate))} · {task.currentStage}/8 {task.stageStatus}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="중요한 시험 변화" onMore={() => onTabChange('study')}>
        {importantTest ? (
          <>
            <p className={styles.big}>{testChange(importantTest).label}</p>
            <p className={ui.muted}>
              {testTypeLabel[importantTest.type]} · {importantTest.name} · {formatMonthDay(importantTest.date)}
            </p>
          </>
        ) : (
          <p className={ui.muted}>{insight.tests.length === 0 ? '시험 기록이 없어요.' : '최근 시험에 큰 변화가 없어요.'}</p>
        )}
      </Card>
      <Card title="Feedback · Activity" onMore={() => onTabChange('activities')}>
        <p>
          검토 대기 {insight.queueItems.length}건
          {data.lastDelivered && ` · 최근 전달 ${formatDateTime(data.lastDelivered.deliveredAt)}`}
        </p>
        <p className={ui.muted}>
          성장활동 {data.activities.length}개
          {Object.entries(statusCounts)
            .map(([status, count]) => ` · ${activityStatusLabel[status as keyof typeof activityStatusLabel]} ${count}`)
            .join('')}
        </p>
      </Card>
      <Card title="다음 Action">
        {actions.length === 0 ? (
          <p className={ui.muted}>지금 처리할 일이 없어요.</p>
        ) : (
          <ul className={ui.list}>
            {actions.slice(0, 4).map((action) => (
              <li key={action.text} className={styles.spread}>
                <span>{action.text}</span>
                <button type="button" className={`${ui.ghostButton} ${ui.smallButton}`} onClick={action.run}>
                  {action.label}
                  <span className="lh-visually-hidden">: {action.text}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Mentor 적용" onMore={() => onTabChange('mentor')}>
        {data.applications.length === 0 ? <p className={ui.muted}>적용 중인 Mentor Plan / Routine이 없어요.</p> : <p>{data.applications.length}개 적용 중</p>}
      </Card>
      <Card title="Parent Report" onMore={() => onTabChange('reports')}>
        {data.parentReport ? (
          <p>
            9월 Report · <Badge tone={data.parentReport.status === 'Sent' ? 'accent' : 'warning'}>{data.parentReport.status}</Badge>
          </p>
        ) : (
          <p className={ui.muted}>9월 Report가 없어요.</p>
        )}
      </Card>
    </div>
  )
}

function Card({ title, children, onMore }: { title: string; children: ReactNode; onMore?: () => void }) {
  return (
    <article className={ui.panel} data-tone="surface">
      <div className={styles.cardHead}>
        <h2 className={ui.subTitle}>{title}</h2>
        {onMore && (
          <button type="button" className={`${ui.secondaryButton} ${ui.smallButton}`} onClick={onMore}>
            자세히<span className="lh-visually-hidden">: {title}</span>
          </button>
        )}
      </div>
      {children}
    </article>
  )
}

// ---------- Study ----------

function Study({ data }: { data: Student360 }) {
  const study = data.insight.study
  const tests = data.insight.tests
  const byType = (type: AdminTestResult['type']) => tests.filter((item) => item.type === type)
  return (
    <>
      <p className={ui.note}>순공 · Plan 실행은 기존 LearnersHigh Study Timer / Plan 기록이에요. (Integration 연결 전 Fixture, 이 화면에서 바꾸지 않아요)</p>
      {study ? (
        <div className={ui.grid3}>
          <article className={ui.panel} data-tone="surface">
            <h2 className={ui.subTitle}>순공</h2>
            <p className={styles.big}>오늘 {formatStudyTimeLong(study.todayStudyMinutes)}</p>
            <p className={ui.muted}>최근 7일 {formatStudyTimeLong(study.subjectMinutes7d.reduce((sum, item) => sum + item.minutes, 0))}</p>
          </article>
          <article className={ui.panel} data-tone="surface">
            <h2 className={ui.subTitle}>Plan 실행률 (최근 7일)</h2>
            <Meter rate={study.recent7DayPlanRate} low={data.insight.points.some((point) => point.kind === 'plan-drop' || point.kind === 'plan-low')} />
            <p className={ui.muted}>직전 7일 {formatPercent(study.previous7DayPlanRate)}</p>
          </article>
          <article className={ui.panel} data-tone="surface">
            <h2 className={ui.subTitle}>과목별 순공 (최근 7일)</h2>
            <ul className={ui.list}>
              {study.subjectMinutes7d.map((item) => (
                <li key={item.subject} className={styles.spread}>
                  <span>{item.subject}</span>
                  <span className={ui.cellMain}>{formatStudyTimeLong(item.minutes)}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      ) : (
        <p className={ui.muted}>기존 학습 기록이 없어요.</p>
      )}
      <TestTable title="학교 시험" items={byType('school_exam')} columns={['score', 'rank']} />
      <TestTable title="모의고사" items={byType('mock_exam')} columns={['grade', 'percentile']} />
      <TestTable title="학원 Test" items={byType('academy_test')} columns={['score']} />
    </>
  )
}

const columnLabel = { score: '점수', rank: '석차', grade: '등급', percentile: '백분위' } as const

function TestTable({ title, items, columns }: { title: string; items: AdminTestResult[]; columns: (keyof typeof columnLabel)[] }) {
  const [open, setOpen] = useState<AdminTestResult | null>(null)
  const value = (item: AdminTestResult, key: keyof typeof columnLabel) => {
    const raw = item[key]
    if (raw === undefined) return <span className={ui.cellSub}>기록 없음</span>
    return key === 'grade' ? `${raw}등급` : key === 'rank' ? `${raw}등` : String(raw)
  }
  return (
    <div className={ui.section}>
      <h2 className={ui.subTitle}>{title}</h2>
      {items.length === 0 ? (
        <p className={ui.muted}>{title} 기록이 없어요.</p>
      ) : (
        <div className={ui.tableScroll}>
          <table className={ui.table} data-compact="true">
            <caption className="lh-visually-hidden">
              {title} {items.length}건
            </caption>
            <thead>
              <tr>
                <th scope="col">시험</th>
                <th scope="col">과목</th>
                <th scope="col">날짜</th>
                {columns.map((key) => (
                  <th key={key} scope="col">
                    {columnLabel[key]}
                  </th>
                ))}
                <th scope="col">직전 결과 → 변화</th>
                <th scope="col">
                  <span className="lh-visually-hidden">상세</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const change = testChange(item)
                return (
                  <tr key={item.testResultId}>
                    <th scope="row" className={ui.rowHeader}>
                      {item.name}
                    </th>
                    <td>{item.subject}</td>
                    <td>{formatMonthDay(item.date)}</td>
                    {columns.map((key) => (
                      <td key={key}>{value(item, key)}</td>
                    ))}
                    <td>
                      {item.previousResult === undefined ? (
                        <span className={ui.cellSub}>첫 기록 (직전 결과 없음)</span>
                      ) : (
                        <span className={ui.text} data-tone={change.direction === 'down' ? 'negative' : change.direction === 'up' ? 'positive' : undefined}>
                          {change.label}
                          {item.change !== undefined && ` (${item.change > 0 ? '+' : ''}${item.change})`}
                          {change.direction === 'same' && ' · 유지'}
                        </span>
                      )}
                    </td>
                    <td>
                      <button type="button" className={`${ui.secondaryButton} ${ui.smallButton}`} onClick={() => setOpen(item)}>
                        상세<span className="lh-visually-hidden">: {item.name} {item.subject}</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <ModalDialog open={open !== null} title={open ? `${open.name} · ${open.subject}` : ''} onClose={() => setOpen(null)}>
        {open && (
          <>
            <dl className={ui.facts}>
              <dt>시험 유형</dt>
              <dd>
                {testTypeLabel[open.type]} ({open.type})
              </dd>
              <dt>날짜</dt>
              <dd>{formatMonthDay(open.date)}</dd>
              {(['score', 'grade', 'percentile', 'rank', 'previousResult', 'change'] as const).map((key) => (
                <div key={key} className={styles.factRow}>
                  <dt>{{ score: '점수', grade: '등급', percentile: '백분위', rank: '석차', previousResult: '직전 결과', change: '변화' }[key]}</dt>
                  <dd>{open[key] === undefined ? <span className={ui.cellSub}>기록 없음</span> : String(open[key])}</dd>
                </div>
              ))}
            </dl>
            <p className={ui.cellSub}>입력된 값만 보여줘요. 다른 시험 유형과 평균을 내지 않고, 이 화면에서 점수를 고치지 않아요. (입력 Flow 미확정)</p>
            <div className={ui.dialogActions}>
              <button type="button" className={ui.secondaryButton} onClick={() => setOpen(null)}>
                닫기
              </button>
            </div>
          </>
        )}
      </ModalDialog>
    </div>
  )
}

// ---------- School ----------

function versionText(task: AdminTask) {
  if (task.versions === null) return '정보 없음'
  if (task.versions.length === 0) return '제출 없음'
  const latest = task.versions.at(-1)!
  const ai = { processing: 'AI 분석 중', success: 'AI 점검 완료', failed: latest.retryAllowed ? 'AI 실패 · 다시 시도 필요' : 'AI 실패' }[latest.aiStatus]
  return `V${latest.number} · ${ai}`
}

function School({ data, onOpenTask }: { data: Student360; onOpenTask: (taskId: string) => void }) {
  const [confirming, setConfirming] = useState<AdminSchoolRecord | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const confirmed = data.schoolRecords.filter((item) => item.status === 'confirmed')
  const candidates = data.schoolRecords.filter((item) => item.status === 'candidate')

  const confirm = async () => {
    if (!confirming || pending) return
    setPending(true)
    setError(null)
    try {
      await updateSchoolRecordStatus(confirming.schoolRecordSnapshotId, 'confirmed')
      setMessage(`"${confirming.category}" 기록을 confirmed로 표시했어요.`)
      setConfirming(null)
    } catch (caught) {
      setError(errorMessageOf(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <div className={ui.section}>
        <h2 className={ui.subTitle}>수행평가 {data.tasks.length}개</h2>
        {data.tasks.length === 0 ? (
          <p className={ui.muted}>등록된 수행평가가 없어요.</p>
        ) : (
          <div className={ui.tableScroll}>
            <table className={ui.table}>
              <caption className="lh-visually-hidden">수행평가 {data.tasks.length}개 (단계 순)</caption>
              <thead>
                <tr>
                  <th scope="col">Task</th>
                  <th scope="col">현재 단계</th>
                  <th scope="col">Deadline</th>
                  <th scope="col">과정 자료</th>
                  <th scope="col">Version</th>
                  <th scope="col">최종 결과</th>
                </tr>
              </thead>
              <tbody>
                {data.tasks.map((task) => {
                  const days = daysUntil(task.deadlineDate)
                  return (
                    <tr key={task.taskId}>
                      <th scope="row" className={styles.taskCell}>
                        <button type="button" className={ui.linkButton} onClick={() => onOpenTask(task.taskId)}>
                          {task.title}
                          <span className="lh-visually-hidden"> Task 상세 보기</span>
                        </button>
                        <span className={ui.cellSub}>
                          {task.subject} · {task.deliverableSummary}
                        </span>
                      </th>
                      <td>
                        <span className={ui.cellMain}>
                          {task.currentStage}/8 · {stageName[task.currentStage]}
                        </span>
                        <span className={ui.cellSub}>{task.onHold ? '보류' : task.stageStatus}</span>
                      </td>
                      <td className={ui.nowrap}>
                        <span className={ui.cellMain}>{formatMonthDay(task.deadlineDate)}</span>
                        <span className={ui.cellSub} data-tone={task.currentStage !== 8 && days <= 3 ? 'negative' : undefined}>
                          {task.currentStage === 8 ? '완료' : formatDday(days)}
                        </span>
                      </td>
                      <td>{task.evidence === null ? <span className={ui.cellSub}>정보 없음</span> : `${task.evidence.length}개`}</td>
                      <td className={ui.nowrap}>{versionText(task)}</td>
                      <td>
                        {task.currentStage !== 8 ? (
                          <span className={ui.cellSub}>진행 중</span>
                        ) : task.finalArtifact ? (
                          <>
                            <span className={ui.cellMain}>{task.finalArtifact.fileName}</span>
                            <span className={ui.cellSub}>{shareLabel[task.finalArtifact.parentShareStatus]}</span>
                          </>
                        ) : (
                          <span className={ui.cellSub}>최종 제출 완료 · 결과물 없음</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={ui.section}>
        <h2 className={ui.subTitle}>SchoolRecordSnapshot</h2>
        <p className={ui.note}>
          confirmed = 학교생활기록부에 반영 확인된 기록 · candidate = 학원이 정리한 반영 후보(아직 확정 기록이 아님). candidate → confirmed 전환 기준은 아직 정해지지 않았어요.
        </p>
        {message && (
          <p className={ui.success} role="status">
            {message}
          </p>
        )}
        {data.schoolRecords.length === 0 ? (
          <p className={ui.muted}>학교 기록 Snapshot이 없어요.</p>
        ) : (
          <div className={ui.grid2}>
            <RecordList title={`confirmed ${confirmed.length}`} items={confirmed} />
            <RecordList title={`candidate ${candidates.length}`} items={candidates} onConfirm={(record) => setConfirming(record)} />
          </div>
        )}
      </div>

      {data.connections.length > 0 && (
        <div className={ui.section}>
          <h2 className={ui.subTitle}>확정 Connection</h2>
          {data.connections.filter((item) => item.reviewState === 'confirmed').length === 0 ? (
            <p className={ui.muted}>확정된 Connection이 없어요.</p>
          ) : (
            <ul className={ui.list}>
              {data.connections
                .filter((item) => item.reviewState === 'confirmed')
                .map((item) => (
                  <li key={item.connectionId} className={ui.listItem}>
                    {item.reason}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirming !== null}
        title="confirmed로 표시할까요?"
        confirmLabel="confirmed로 표시"
        pending={pending}
        error={error}
        onConfirm={() => void confirm()}
        onClose={() => {
          setConfirming(null)
          setError(null)
        }}
      >
        <p>학교생활기록부에 실제로 반영된 것을 확인한 기록만 confirmed로 바꿔주세요.</p>
        <p className={ui.muted}>이 동작은 학원 기록의 표시만 바꿔요. 학교 시스템에 반영하지 않아요.</p>
        {confirming && <p className={ui.note}>{confirming.summary}</p>}
      </ConfirmDialog>
    </>
  )
}

function RecordList({ title, items, onConfirm }: { title: string; items: AdminSchoolRecord[]; onConfirm?: (record: AdminSchoolRecord) => void }) {
  return (
    <article className={ui.panel}>
      <h3 className={ui.subTitle}>{title}</h3>
      {items.length === 0 ? (
        <p className={ui.muted}>없음</p>
      ) : (
        <ul className={ui.list}>
          {items.map((record) => (
            <li key={record.schoolRecordSnapshotId} className={ui.listItem} data-status={record.status}>
              <span className={styles.spread}>
                <span className={ui.cellMain}>
                  {record.category}
                  {record.subject && ` · ${record.subject}`}
                </span>
                <Badge tone={record.status === 'confirmed' ? 'accent' : 'warning'}>{record.status === 'confirmed' ? 'confirmed · 반영 확인' : 'candidate · 반영 후보'}</Badge>
              </span>
              <span>{record.summary}</span>
              <span className={ui.cellSub}>Snapshot {formatMonthDay(record.snapshotDate)}</span>
              {onConfirm && (
                <button type="button" className={`${ui.secondaryButton} ${ui.smallButton}`} onClick={() => onConfirm(record)}>
                  반영 확인 후 confirmed 표시
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

// ---------- Activities ----------

const activityFilters = [
  { value: 'all', label: '전체' },
  { value: 'in-progress', label: '작성 · 제출' },
  { value: 'feedback', label: '피드백 대기 · 도착' },
  { value: 'reflected', label: '보완 완료' },
  { value: 'archived', label: 'Archive' },
]

const matchesActivityFilter = (status: string, filter: string) =>
  filter === 'all' ||
  (filter === 'in-progress' && (status === 'draft' || status === 'submitted')) ||
  (filter === 'feedback' && (status === 'feedback-waiting' || status === 'feedback-delivered')) ||
  (filter === 'reflected' && status === 'reflected') ||
  (filter === 'archived' && status === 'archived')

function Activities({ data, onOpenReview, onOpenActivity, filter, onFilterChange }: { data: Student360; onOpenReview: (id: string) => void; onOpenActivity: (activityId: string) => void; filter: string; onFilterChange: (value: string) => void }) {
  const archived = data.activities.filter((item) => item.status === 'archived').length
  const rows = data.activities.filter((item) => matchesActivityFilter(item.status, filter))
  return (
    <div className={ui.section}>
      <h2 className={ui.subTitle}>
        성장활동 {data.activities.length}개 · Archive {archived}개
      </h2>
      {data.activities.length > 0 && <ChipGroup label="활동 상태" value={filter} options={activityFilters} onChange={onFilterChange} />}
      {data.activities.length === 0 ? (
        <p className={ui.muted}>기록한 성장활동이 없어요.</p>
      ) : rows.length === 0 ? (
        <p className={ui.muted}>이 상태의 성장활동이 없어요.</p>
      ) : (
        <div className={ui.tableScroll}>
          <table className={ui.table}>
            <caption className="lh-visually-hidden">성장활동 {rows.length}개 (최근 시작 순)</caption>
            <thead>
              <tr>
                <th scope="col">활동</th>
                <th scope="col">유형</th>
                <th scope="col">기간</th>
                <th scope="col">상태</th>
                <th scope="col">Reflection</th>
                <th scope="col">피드백</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((activity) => (
                <tr key={activity.activityId}>
                  <th scope="row" className={styles.taskCell}>
                    <button type="button" className={ui.linkButton} onClick={() => onOpenActivity(activity.activityId)}>
                      {activity.title}
                      <span className="lh-visually-hidden"> 활동 상세 보기</span>
                    </button>
                    <span className={ui.cellSub}>{activity.organizer}</span>
                  </th>
                  <td>{activityTypeLabel[activity.type]}</td>
                  <td className={ui.nowrap}>{activity.endDate ? `${formatMonthDay(activity.startDate)} ~ ${formatMonthDay(activity.endDate)}` : formatMonthDay(activity.startDate)}</td>
                  <td>
                    <Badge tone={activity.status === 'feedback-waiting' ? 'warning' : activity.status === 'archived' ? 'accent' : undefined}>{activityStatusLabel[activity.status]}</Badge>
                  </td>
                  <td>{activity.reflection ? '작성함' : <span className={ui.cellSub}>작성 전</span>}</td>
                  <td>
                    {activity.status === 'feedback-waiting' ? (
                      <button type="button" className={`${ui.ghostButton} ${ui.smallButton}`} onClick={() => onOpenReview(`activity-feedback-${activity.activityId}`)}>
                        피드백 쓰기
                      </button>
                    ) : activity.feedback ? (
                      <span className={ui.cellSub}>{formatMonthDay(activity.feedback.deliveredAt)} 전달</span>
                    ) : (
                      <span className={ui.cellSub}>요청 없음</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------- Mentor ----------

function Mentor({ data, onRecommendCase }: { data: Student360; onRecommendCase: (taskId: string | null) => void }) {
  return (
    <>
      <div className={styles.cardHead}>
        <p className={ui.muted}>Mentor Hub와 같은 Mentor / Case Identity를 써요. 학생 실명 · 학교는 Mentor에게 보이지 않아요.</p>
        <button type="button" className={ui.primaryButton} onClick={() => onRecommendCase(data.insight.primaryTask?.taskId ?? null)}>
          Mentor Case 추천하기
        </button>
      </div>
      <div className={ui.grid2}>
        <article className={ui.panel} data-tone="surface">
          <h2 className={ui.subTitle}>선생님 추천 Case (Mentor Hub에 보임)</h2>
          {data.recommendations.length === 0 ? (
            <p className={ui.muted}>추천한 Case가 없어요.</p>
          ) : (
            <ul className={ui.list}>
              {data.recommendations.map((item) => (
                <li key={`${item.caseId}-${item.linkedTask?.taskId}`}>
                  <span className={ui.cellMain}>{item.title}</span>
                  <span className={ui.cellSub}>
                    {item.mentorName} · {item.linkedTask ? item.linkedTask.title : '활동 연결'} · {item.recommendedDate ? formatMonthDay(item.recommendedDate) : '추천일 기록 없음'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
        <article className={ui.panel} data-tone="surface">
          <h2 className={ui.subTitle}>Task 연결 Case</h2>
          {data.taskCases.length === 0 ? (
            <p className={ui.muted}>Case가 연결된 수행평가가 없어요.</p>
          ) : (
            <ul className={ui.list}>
              {data.taskCases.map(({ task, cases }) => (
                <li key={task.taskId}>
                  <span className={ui.cellMain}>{task.title}</span>
                  <span className={ui.cellSub}>{cases.map((item) => item.title).join(' · ')}</span>
                </li>
              ))}
            </ul>
          )}
        </article>
        <article className={ui.panel} data-tone="surface">
          <h2 className={ui.subTitle}>추천 Mentor</h2>
          {data.hubMentors.length === 0 ? (
            <p className={ui.muted}>Mentor Hub 추천 결과 정보가 없어요.</p>
          ) : (
            <ul className={ui.list}>
              {data.hubMentors.map((item) => (
                <li key={item.mentorId}>
                  <span className={ui.cellMain}>
                    {item.mentorName} · {item.mentorAffiliation}
                  </span>
                  <span className={ui.cellSub}>{item.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </article>
        <article className={ui.panel} data-tone="surface">
          <h2 className={ui.subTitle}>적용 중 Plan / Routine</h2>
          {data.applications.length === 0 ? (
            <p className={ui.muted}>적용 중인 Mentor Plan / Routine이 없어요.</p>
          ) : (
            <ul className={ui.list}>
              {data.applications.map((item) => (
                <li key={item.applicationId}>
                  <span className={ui.cellMain}>
                    {item.kind === 'plan' ? 'Plan' : 'Routine'} · {item.title}
                  </span>
                  <span className={ui.cellSub}>
                    {item.mentorName} · {formatMonthDay(item.appliedDate)} 적용 · 기존 Plan 실행 {item.progress.done}/{item.progress.total}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
        <article className={ui.panel} data-tone="surface">
          <h2 className={ui.subTitle}>저장 Content 관심 Tag</h2>
          {data.savedTags.length === 0 ? (
            <p className={ui.muted}>저장한 Content 정보가 없어요.</p>
          ) : (
            <div className={ui.badgeList}>
              {data.savedTags.map((tag) => (
                <Badge key={tag}>#{tag}</Badge>
              ))}
            </div>
          )}
        </article>
      </div>
    </>
  )
}

// ---------- Reports ----------

function Reports({ data }: { data: Student360 }) {
  return (
    <>
      <p className={ui.note}>Parent Report 편집 · 생성 · 발송은 Parent Progress 범위라 여기서는 상태만 확인해요. (Report Status 값은 아직 확정 전)</p>
      <div className={ui.grid2}>
        <article className={ui.panel} data-tone="surface">
          <h2 className={ui.subTitle}>Parent Report</h2>
          {data.parentReport ? (
            <dl className={ui.facts}>
              <dt>기간</dt>
              <dd>2026년 9월</dd>
              <dt>상태</dt>
              <dd>
                <Badge tone={data.parentReport.status === 'Sent' ? 'accent' : 'warning'}>{data.parentReport.status}</Badge>
              </dd>
              <dt>발송</dt>
              <dd>{data.parentReport.sentAt ? formatDateTime(data.parentReport.sentAt) : '발송 전'}</dd>
            </dl>
          ) : (
            <p className={ui.muted}>9월 Parent Report가 없어요.</p>
          )}
        </article>
        <article className={ui.panel} data-tone="surface">
          <h2 className={ui.subTitle}>Parent 공유 동의 Artifact</h2>
          {data.consentedArtifacts.length === 0 ? (
            <p className={ui.muted}>학생이 학부모 공유에 동의한 최종 결과물이 없어요.</p>
          ) : (
            <ul className={ui.list}>
              {data.consentedArtifacts.map(({ task, status }) => (
                <li key={task.taskId}>
                  <span className={ui.cellMain}>{task.finalArtifact!.fileName}</span>
                  <span className={ui.cellSub}>
                    {task.title} · {shareLabel[status as ParentShareStatus]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </>
  )
}
