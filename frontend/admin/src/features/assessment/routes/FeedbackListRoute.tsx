import { useState } from 'react'
import { navigate, replaceSearch } from '../../../app/adminLocation.ts'
import { listFeedbackRequests } from '../api/assessmentAdminApi.ts'
import { ListEmpty, RemoteView, SearchBox } from '../components/AdminParts.tsx'
import { FileIcon, InfoIcon, NoteIcon } from '../components/canonicalUi.ts'
import { dateTimeLabel, feedbackStatusLabels, sourceTypeLabels } from '../model/adminFormat.ts'
import { useRemote } from '../model/useRemote.ts'
import styles from '../styles/assessmentAdmin.module.css'
import { paths } from './paths.ts'

type StatusFilter = 'ALL' | 'PENDING' | 'DELIVERED'

// AD-14 피드백 요청 목록 (목업 AM-05). 관리자 공용 요청함 — 담당자 자동 배정·과목별 Routing 없음 (ADR-0009).
// 건수는 실제 요청 상태에서 계산한다. Student Care 상담 Queue와 섞지 않는다. ('요청 취소'는 정책 미정 API-OD-A06이라 두지 않는다)
export function FeedbackListRoute({ search }: { search: URLSearchParams }) {
  const status = (search.get('status') as StatusFilter | null) ?? 'ALL'
  const subject = search.get('subject') ?? ''
  const sort = search.get('sort') === 'oldest' ? 'oldest' : 'newest'
  const applied = search.get('q') ?? ''
  const [query, setQuery] = useState(applied)
  const all = useRemote(() => listFeedbackRequests({ query: applied || undefined }), [applied])

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(search)
    if (value && value !== 'ALL') next.set(key, value)
    else next.delete(key)
    replaceSearch(next.toString())
  }

  return (
    <div className={styles.body}>
      <RemoteView state={all.state} label="피드백 요청" onRetry={all.reload}>
        {(data) => {
          const subjects = [...new Set(data.items.map((item) => item.subjectName).filter((value): value is string => Boolean(value)))]
          const scoped = data.items.filter((item) => !subject || item.subjectName === subject)
          const counts = { PENDING: scoped.filter((item) => item.status === 'PENDING').length, DELIVERED: scoped.filter((item) => item.status === 'DELIVERED').length, ALL: scoped.length }
          const items = (status === 'ALL' ? scoped : scoped.filter((item) => item.status === status)).sort((a, b) => (sort === 'oldest' ? 1 : -1) * (Date.parse(a.requestedAt) - Date.parse(b.requestedAt)))
          return (
            <>
              <div className={styles.toolbar}>
                <form
                  role="search"
                  onSubmit={(event) => {
                    event.preventDefault()
                    update('q', query.trim())
                  }}
                >
                  <SearchBox value={query} onChange={setQuery} placeholder="학생명 검색" label="피드백 요청 검색" />
                </form>
                <select className={styles.select} aria-label="과목" value={subject} onChange={(event) => update('subject', event.target.value)}>
                  <option value="">전체 과목</option>
                  {subjects.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <div className={styles.chips} role="group" aria-label="요청 상태">
                  {(['PENDING', 'DELIVERED', 'ALL'] as const).map((value) => (
                    <button key={value} type="button" className={styles.chip} aria-pressed={status === value} onClick={() => update('status', value)}>
                      {value === 'ALL' ? '전체' : value === 'PENDING' ? '답변 대기' : '답변 완료'} {counts[value]}
                    </button>
                  ))}
                </div>
                <select className={`${styles.select} ${styles.toolbarEnd}`} aria-label="정렬" value={sort} onChange={(event) => update('sort', event.target.value === 'newest' ? '' : event.target.value)}>
                  <option value="newest">최신 요청순</option>
                  <option value="oldest">오래된 요청순</option>
                </select>
              </div>
              <p className={styles.infoLine}>
                <InfoIcon size={14} />
                학생은 질문을 따로 쓰지 않고 버튼 하나로 수행평가 자료를 보내요. 요청 당시의 노트와 고른 파일 버전이 함께 저장돼요.
              </p>
              {items.length === 0 ? (
                <ListEmpty
                  filtered={Boolean(applied || subject) || (status !== 'ALL' && data.items.length > 0)}
                  title="아직 들어온 피드백 요청이 없어요"
                  onReset={() => {
                    setQuery('')
                    replaceSearch('')
                  }}
                />
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th scope="col">학생</th>
                        <th scope="col">수행평가</th>
                        <th scope="col">과목</th>
                        <th scope="col">요청 시각</th>
                        <th scope="col">전달된 자료</th>
                        <th scope="col">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.requestId} data-clickable="true" onClick={() => navigate(paths.feedbackDetail(item.requestId))}>
                          <td>
                            <span className={styles.cellTitle}>{item.student.displayName}</span>
                            <span className={styles.cellSub}>
                              {item.student.school.name} {item.student.grade}학년
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className={styles.rowButton}
                              onClick={(event) => {
                                event.stopPropagation()
                                navigate(paths.feedbackDetail(item.requestId))
                              }}
                            >
                              <span className={styles.cellTitle} style={{ fontWeight: 500 }}>
                                {item.sourceTitle}
                              </span>
                              <span className={styles.cellSub}>{sourceTypeLabels[item.sourceType]} · 받는 곳 관리자 공용 요청함</span>
                            </button>
                          </td>
                          <td>{item.subjectName ?? '—'}</td>
                          <td>{dateTimeLabel(item.requestedAt)}</td>
                          <td>
                            <span className={styles.cellSub} style={{ display: 'flex', gap: 10, marginTop: 0 }}>
                              <span>
                                <NoteIcon size={13} /> 노트 1
                              </span>
                              <span>
                                <FileIcon size={13} /> 결과 파일 {item.snapshot.artifactVersionIds.length}
                              </span>
                            </span>
                          </td>
                          <td>
                            <span className={styles.badge} data-tone={item.status === 'PENDING' ? 'primary' : 'success'}>
                              {feedbackStatusLabels[item.status]}
                            </span>
                            {item.draftSaved && (
                              <span className={styles.badge} data-tone="warning" style={{ marginLeft: 4 }}>
                                임시 저장
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )
        }}
      </RemoteView>
    </div>
  )
}
