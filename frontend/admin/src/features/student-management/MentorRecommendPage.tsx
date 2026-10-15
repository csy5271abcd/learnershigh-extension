import { useState } from 'react'
import type { ScreenLoadState } from '../../app/useScreenLoad.ts'
import { Badge, ChipGroup, ErrorState, LoadingState, NoticeState, SearchBox } from '../../components/AdminUi.tsx'
import ui from '../../components/AdminUi.module.css'
import type { MentorCaseRef, MentorContentType } from '../../fixtures/types.ts'
import { allMentorContent, mentorContentSearchText, mentorContentTypeLabel, mentorContentTypes, type MentorContentItem } from '../../read-model/mentorContent.ts'
import { MentorContentGrid, MentorCue } from './MentorContentCards.tsx'
import type { AdminState } from '../../store/adminStore.ts'
import { isActiveTask } from '../../read-model/studentInsights.ts'
import { studentMentorHubRecommendations } from '../../read-model/studentProjection.ts'
import { RecommendCaseDialog } from './RecommendCaseDialog.tsx'

/*
 * Mentor 추천 Home (/mentor-content · Case 탭은 /mentor-cases 주소도 같은 화면)
 * - 유형 탭: 전체 · Case · Plan · Routine · Story · Record. Content는 Student Mentor Hub Canonical 값 그대로다. (read-model/mentorContent.ts)
 * - Case 탭: Mentor Case Recommendation (GET /api/admin/mentor-cases ?query · subject · activityType, POST …/mentor-case-recommendations)
 * - Plan · Routine · Story · Record 추천 Admin API는 Contract에 없다. (Gap: MENTOR-CONTENT-RECOMMENDATION-API) 상세 화면에서 Admin 임시 기록만 남긴다.
 * - Case는 Student Mentor Hub Canonical Activity Case 24개를 그대로 쓴다. (새 Case / 가짜 추천 결과를 만들지 않는다)
 * - 추천하면 같은 State에서 Task.relatedMentorCaseIds와 학생 Mentor Hub "선생님 추천 Case"가 함께 바뀐다.
 * - 추천 이유는 학생 Mentor Hub에 그대로 보이는 문장이라 비워 두고 추천할 수 없다. (UI 규칙 · Contract에 필수 여부 없음 → Gap)
 * - 과목 / 활동 유형 Filter는 보기 조건이다. 과목 기준 자동 추천 · 배정은 없다.
 */

export interface MentorCaseContext {
  studentId: string | null
  /** 't:<taskId>' | 'a:<activityId>' */
  target: string | null
}

export interface MentorCaseFilter {
  query: string
  subject: string
  activityType: string
}

export type MentorContentTab = MentorContentType | 'all'

interface MentorRecommendPageProps {
  state: AdminState
  load: ScreenLoadState
  onRetry: () => void
  context: MentorCaseContext
  onContextChange: (context: MentorCaseContext) => void
  filter: MentorCaseFilter
  onFilterChange: (filter: MentorCaseFilter) => void
  onOpenStudent: (studentId: string) => void
  onOpenCase: (caseId: string) => void
  tab: MentorContentTab
  onTabChange: (tab: MentorContentTab) => void
  onOpenContent: (item: MentorContentItem) => void
  onOpenMentor: (mentorId: string) => void
}

export function MentorRecommendPage({ state, load, onRetry, context, onContextChange, filter, onFilterChange, onOpenStudent, onOpenCase, tab, onTabChange, onOpenContent, onOpenMentor }: MentorRecommendPageProps) {
  const [draft, setDraft] = useState(filter.query)
  const [synced, setSynced] = useState(filter.query)
  if (synced !== filter.query) {
    setSynced(filter.query)
    setDraft(filter.query)
  }
  const [selected, setSelected] = useState<MentorCaseRef | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const student = context.studentId ? state.students.find((item) => item.studentId === context.studentId) ?? null : null
  const tasks = student ? state.tasks.filter((item) => item.studentId === student.studentId && isActiveTask(item)) : []
  const activities = student ? state.activities.filter((item) => item.studentId === student.studentId) : []
  const taskId = context.target?.startsWith('t:') ? context.target.slice(2) : null
  const activityId = context.target?.startsWith('a:') ? context.target.slice(2) : null
  const targetTask = taskId ? tasks.find((item) => item.taskId === taskId) ?? state.tasks.find((item) => item.taskId === taskId && item.studentId === student?.studentId) : null
  const targetActivity = activityId ? activities.find((item) => item.activityId === activityId) : null
  const targetLabel = targetTask?.title ?? targetActivity?.title ?? null
  const hubRecommendations = student ? studentMentorHubRecommendations(state, student.studentId) : []

  const subjects = [...new Set(state.mentorCases.map((item) => item.subject))]
  const types = [...new Set(state.mentorCases.map((item) => item.activityType))]
  const query = filter.query.trim().toLowerCase()
  const cases = state.mentorCases.filter((item) => {
    if (filter.subject && item.subject !== filter.subject) return false
    if (filter.activityType && item.activityType !== filter.activityType) return false
    if (query && !`${item.title} ${item.mentorName} ${item.mentorAffiliation} ${item.subject} ${item.activityType}`.toLowerCase().includes(query)) return false
    return true
  })
  const filterActive = Boolean(query || filter.subject || filter.activityType)
  const contents = allMentorContent(state)
  const typed = tab === 'all' ? contents : contents.filter((item) => item.type === tab)
  const shown = query ? typed.filter((item) => mentorContentSearchText(item).includes(query)) : typed

  const alreadyFor = (caseId: string) =>
    state.recommendations.some((item) => item.studentId === student?.studentId && item.caseId === caseId && item.taskId === (taskId ?? null) && item.activityId === (activityId ?? null))
  const linkedToTask = (caseId: string) => Boolean(targetTask?.relatedMentorCaseIds.includes(caseId))

  return (
    <div className={ui.page} aria-busy={load.status === 'loading'}>
      <header className={ui.headerText}>
        <h1 className={ui.title}>Mentor 추천</h1>
        <p className={ui.lead}>추천할 Mentor 콘텐츠를 찾아요. 학생의 수행평가 · 활동에 맞는 Case · Plan · Routine · Story · Record를 비교하고, Case 추천은 학생 Mentor Hub에 바로 보여요.</p>
      </header>
      {load.status === 'loading' && <LoadingState label="Mentor Case를 불러오는 중이에요." />}
      {load.status === 'error' && <ErrorState title="Mentor Case를 불러오지 못했어요." onRetry={onRetry} />}
      {load.status === 'ready' && (
        <>
          <section className={ui.panel} data-tone="surface" aria-labelledby="case-context">
            <h2 id="case-context" className={ui.subTitle}>
              추천 대상
            </h2>
            <div className={ui.toolbar}>
              <label className={ui.field}>
                <span className={ui.fieldLabel}>학생</span>
                <select className={ui.select} value={student?.studentId ?? ''} onChange={(event) => onContextChange({ studentId: event.target.value || null, target: null })}>
                  <option value="">학생 선택</option>
                  {state.students.map((item) => (
                    <option key={item.studentId} value={item.studentId}>
                      {item.displayName} · {item.grade}
                    </option>
                  ))}
                </select>
              </label>
              <label className={ui.field}>
                <span className={ui.fieldLabel}>연결할 수행평가 · 활동</span>
                <select className={ui.select} value={context.target ?? ''} disabled={!student} onChange={(event) => onContextChange({ studentId: context.studentId, target: event.target.value || null })}>
                  <option value="">대상 선택</option>
                  {tasks.length > 0 && (
                    <optgroup label="진행 중 수행평가">
                      {tasks.map((item) => (
                        <option key={item.taskId} value={`t:${item.taskId}`}>
                          {item.subject} · {item.title}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {activities.length > 0 && (
                    <optgroup label="성장활동">
                      {activities.map((item) => (
                        <option key={item.activityId} value={`a:${item.activityId}`}>
                          {item.title}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </label>
              {student && (
                <button type="button" className={`${ui.secondaryButton} ${ui.smallButton}`} onClick={() => onOpenStudent(student.studentId)}>
                  Student 360
                </button>
              )}
            </div>
            {student && (
              <p className={ui.muted}>
                학생 Mentor Hub 선생님 추천 Case {hubRecommendations.length}개
                {targetTask && ` · 이 Task 연결 Case ${targetTask.relatedMentorCaseIds.length}개`}
              </p>
            )}
            {!student && <p className={ui.muted}>학생과 대상을 고르면 Case를 추천할 수 있어요. 고르지 않아도 Case는 검색할 수 있어요.</p>}
          </section>

          {message && (
            <p className={ui.success} role="status">
              {message}
            </p>
          )}

          <ChipGroup
            label="콘텐츠 유형"
            value={tab}
            options={[{ value: 'all', label: `전체 ${contents.length}` }, ...mentorContentTypes.map((type) => ({ value: type, label: `${mentorContentTypeLabel[type]} ${contents.filter((item) => item.type === type).length}` }))]}
            onChange={(value) => onTabChange(value as MentorContentTab)}
          />

          {tab !== 'case' ? (
            <section className={ui.section} aria-labelledby="content-list">
              <div className={ui.sectionHead}>
                <h2 id="content-list" className={ui.sectionTitle}>
                  {tab === 'all' ? '전체 Mentor 콘텐츠' : `Mentor ${mentorContentTypeLabel[tab]}`}
                </h2>
                <p className={ui.muted} role="status">
                  {query ? `${shown.length}개 표시 · 전체 ${typed.length}개` : `${typed.length}개`}
                </p>
              </div>
              <div className={ui.toolbar}>
                <SearchBox
                  label="콘텐츠 제목, Mentor, 과목 검색"
                  value={draft}
                  onChange={(value) => {
                    setDraft(value)
                    onFilterChange({ ...filter, query: value })
                  }}
                />
              </div>
              {tab !== 'all' && (
                <p className={ui.cellSub}>
                  {mentorContentTypeLabel[tab]} 추천은 Admin 추천 API가 아직 없어 상세 화면에서 Admin 임시 기록만 남길 수 있어요. 학생 Mentor Hub에는 반영되지 않아요.
                </p>
              )}
              {shown.length === 0 ? (
                <NoticeState title="검색 결과가 없어요." />
              ) : (
                <MentorContentGrid items={shown} label={`Mentor 콘텐츠 ${shown.length}개`} onOpen={onOpenContent} onOpenMentor={onOpenMentor} />
              )}
            </section>
          ) : (
            <section className={ui.section} aria-labelledby="case-list">
              <div className={ui.sectionHead}>
                <h2 id="case-list" className={ui.sectionTitle}>
                  Activity Case
                </h2>
                <p className={ui.muted} role="status">
                  {filterActive ? `${cases.length}개 표시 · 전체 ${state.mentorCases.length}개` : `${state.mentorCases.length}개`}
                </p>
              </div>
              <div className={ui.toolbar}>
                <SearchBox
                  label="Case 제목, Mentor 검색"
                  value={draft}
                  onChange={(value) => {
                    setDraft(value)
                    onFilterChange({ ...filter, query: value })
                  }}
                />
                <label className={ui.filterGroup}>
                  <span className={ui.filterLabel}>과목</span>
                  <select className={ui.select} value={filter.subject} onChange={(event) => onFilterChange({ ...filter, subject: event.target.value })}>
                    <option value="">전체</option>
                    {subjects.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className={ui.filterGroup}>
                  <span className={ui.filterLabel}>활동 유형</span>
                  <select className={ui.select} value={filter.activityType} onChange={(event) => onFilterChange({ ...filter, activityType: event.target.value })}>
                    <option value="">전체</option>
                    {types.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                {filterActive && (
                  <button
                    type="button"
                    className={`${ui.secondaryButton} ${ui.smallButton}`}
                    onClick={() => {
                      setDraft('')
                      onFilterChange({ query: '', subject: '', activityType: '' })
                    }}
                  >
                    조건 초기화
                  </button>
                )}
              </div>
              {cases.length === 0 ? (
                <NoticeState title={query ? '검색 결과가 없어요.' : '조건에 맞는 Case가 없어요.'} />
              ) : (
                <div className={ui.tableScroll}>
                  <table className={ui.table}>
                    <caption className="lh-visually-hidden">Mentor Activity Case {cases.length}개</caption>
                    <thead>
                      <tr>
                        <th scope="col">Case</th>
                        <th scope="col">Mentor</th>
                        <th scope="col">활동 당시</th>
                        <th scope="col">과목</th>
                        <th scope="col">활동 유형</th>
                        <th scope="col">
                          <span className="lh-visually-hidden">Action</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {cases.map((item) => {
                        const already = student && targetLabel ? alreadyFor(item.contentId) : false
                        const linked = linkedToTask(item.contentId)
                        return (
                          <tr key={item.contentId}>
                            <th scope="row" className={ui.rowHeader}>
                              <button type="button" className={ui.linkButton} onClick={() => onOpenCase(item.contentId)}>
                                {item.title}
                                <span className="lh-visually-hidden"> Case 상세 보기</span>
                              </button>
                            </th>
                            <td>
                              <MentorCue mentorId={item.mentorId} onOpenMentor={onOpenMentor} />
                            </td>
                            <td>{item.gradeLabel}</td>
                            <td>{item.subject}</td>
                            <td>{item.activityType}</td>
                            <td>
                              <div className={ui.actions}>
                                {already ? (
                                  <Badge tone="accent">이 대상에 추천함</Badge>
                                ) : (
                                  <>
                                    {linked && <Badge>Task 연결됨</Badge>}
                                    <button type="button" className={`${ui.secondaryButton} ${ui.smallButton}`} onClick={() => onOpenCase(item.contentId)}>
                                      상세<span className="lh-visually-hidden">: {item.title}</span>
                                    </button>
                                    <button
                                      type="button"
                                      className={`${ui.ghostButton} ${ui.smallButton}`}
                                      disabled={!student || !targetLabel}
                                      title={!student || !targetLabel ? '학생과 추천 대상을 먼저 골라주세요.' : undefined}
                                      onClick={() => {
                                        setSelected(item)
                                        setMessage(null)
                                      }}
                                    >
                                      추천<span className="lh-visually-hidden">: {item.title}</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          <RecommendCaseDialog
            caseRef={selected}
            student={student}
            target={targetLabel ? { taskId: targetTask?.taskId ?? null, activityId: targetActivity?.activityId ?? null, label: targetLabel } : null}
            onClose={() => setSelected(null)}
            onDone={(text) => {
              setMessage(text)
              setSelected(null)
            }}
          />
        </>
      )}
    </div>
  )
}
